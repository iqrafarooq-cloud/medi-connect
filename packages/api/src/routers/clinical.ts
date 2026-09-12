import { createDb } from "@medi-connect/db";
import { clinicalDocument, noteInsertion } from "@medi-connect/db/schema/clinical";
import { patient } from "@medi-connect/db/schema/patient";
import { clinic } from "@medi-connect/db/schema/clinic";
import { and, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { logAccess } from "../lib/audit";
import { createSignedUrl } from "../lib/supabase";

async function requireClinic(userId: string) {
  const db = createDb();
  const rows = await db.select().from(clinic).where(eq(clinic.ownerUserId, userId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new ORPCError("FORBIDDEN", { message: "Complete clinic registration first" });
  }
  return row;
}

async function requirePatient(patientId: string) {
  const db = createDb();
  const rows = await db.select().from(patient).where(eq(patient.id, patientId)).limit(1);
  if (!rows[0]) {
    throw new ORPCError("NOT_FOUND", { message: "Patient not found" });
  }
  return rows[0];
}

export const clinicalRouter = {
  patientSummary: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const p = await requirePatient(input.patientId);
      const db = createDb();

      const docs = await db
        .select()
        .from(clinicalDocument)
        .where(eq(clinicalDocument.patientId, input.patientId))
        .orderBy(desc(clinicalDocument.encounterDate), desc(clinicalDocument.createdAt));

      const readyCount = docs.filter((d) => d.ingestionStatus === "ready").length;
      const failedCount = docs.filter((d) => d.ingestionStatus === "failed").length;

      await logAccess({
        actorUserId: context.session.user.id,
        action: "clinical.patientSummary",
        resourceType: "patient",
        resourceId: input.patientId,
        patientId: input.patientId,
        outcome: "allowed",
      });

      return {
        patient: p,
        docsSynced: readyCount,
        docsFailed: failedCount,
        documents: docs,
      };
    }),

  listDocuments: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      return db
        .select()
        .from(clinicalDocument)
        .where(eq(clinicalDocument.patientId, input.patientId))
        .orderBy(desc(clinicalDocument.encounterDate), desc(clinicalDocument.createdAt));
    }),

  getDocument: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        documentId: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const db = createDb();
      const rows = await db
        .select()
        .from(clinicalDocument)
        .where(
          and(
            eq(clinicalDocument.id, input.documentId),
            eq(clinicalDocument.patientId, input.patientId),
          ),
        )
        .limit(1);
      const doc = rows[0];
      if (!doc) {
        await logAccess({
          actorUserId: context.session.user.id,
          action: "clinical.getDocument",
          resourceType: "clinical_document",
          resourceId: input.documentId,
          patientId: input.patientId,
          outcome: "denied",
          detail: { reason: "not_found_or_wrong_patient" },
        });
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      const signedUrl = await createSignedUrl(doc.storageBucket, doc.storagePath);
      await logAccess({
        actorUserId: context.session.user.id,
        action: "clinical.getDocument",
        resourceType: "clinical_document",
        resourceId: doc.id,
        patientId: input.patientId,
        outcome: "allowed",
      });

      return { ...doc, signedUrl };
    }),

  flagDiscrepancy: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        messageId: z.string().min(1),
        proposedText: z.string().min(1),
        citationDocumentIds: z.array(z.string()).default([]),
        reason: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      const [row] = await db
        .insert(noteInsertion)
        .values({
          id: crypto.randomUUID(),
          messageId: input.messageId,
          patientId: input.patientId,
          clinicianId: context.session.user.id,
          proposedText: input.proposedText,
          citationDocumentIds: input.citationDocumentIds,
          status: "flagged",
          flagReason: input.reason,
          decidedAt: new Date(),
        })
        .returning();

      await logAccess({
        actorUserId: context.session.user.id,
        action: "clinical.flagDiscrepancy",
        resourceType: "note_insertion",
        resourceId: row?.id,
        patientId: input.patientId,
        outcome: "allowed",
      });

      return row;
    }),

  ingestionStats: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const db = createDb();
      const rows = await db
        .select({
          status: clinicalDocument.ingestionStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(clinicalDocument)
        .where(eq(clinicalDocument.patientId, input.patientId))
        .groupBy(clinicalDocument.ingestionStatus);
      return rows;
    }),
};
