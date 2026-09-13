import { createDb } from "@medi-connect/db";
import { user } from "@medi-connect/db/schema/auth";
import { accessAuditLog, extractedLab } from "@medi-connect/db/schema/clinical";
import {
  patient,
  patientClinicalFlag,
  patientConsent,
  patientEncounter,
  type EncounterBadge,
  type EncounterMetric,
} from "@medi-connect/db/schema/patient";
import { and, asc, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { logAccess } from "../lib/audit";
import { groupLabsByTestName, uniqueFacilities } from "../lib/patient-record";
import { requireActiveClinic } from "../lib/require-clinic";

const encounterKindSchema = z.enum(["emergency", "cardio", "ambulatory", "labs"]);
const flagToneSchema = z.enum(["critical", "warning", "info"]);
const badgeToneSchema = z.enum(["critical", "stable", "info"]);

const badgeSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    tone: badgeToneSchema,
  })
  .nullable()
  .optional();

const metricsSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(40),
      value: z.string().trim().min(1).max(80),
      alert: z.boolean().optional(),
    }),
  )
  .max(12)
  .nullable()
  .optional();

const linksSchema = z.array(z.string().trim().min(1).max(120)).max(12).nullable().optional();

const encounterInputSchema = z.object({
  kind: encounterKindSchema,
  occurredAt: z.string().min(8),
  title: z.string().trim().min(1).max(240),
  facility: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(4000).optional().default(""),
  badge: badgeSchema,
  metrics: metricsSchema,
  links: linksSchema,
  inbound: z.boolean().optional().default(false),
});

async function requirePatient(patientId: string) {
  const db = createDb();
  const rows = await db.select().from(patient).where(eq(patient.id, patientId)).limit(1);
  if (!rows[0]) {
    throw new ORPCError("NOT_FOUND", { message: "Patient not found" });
  }
  return rows[0];
}

function parseOccurredAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid occurredAt" });
  }
  return d;
}

function parseObservedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid observedAt" });
  }
  return d;
}

async function ensureConsent(patientId: string, updatedByUserId?: string) {
  const db = createDb();
  const existing = await db
    .select()
    .from(patientConsent)
    .where(eq(patientConsent.patientId, patientId))
    .limit(1);
  if (existing[0]) return existing[0];

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(patientConsent)
    .values({
      id,
      patientId,
      updatedByUserId: updatedByUserId ?? null,
    })
    .returning();
  return created!;
}

async function loadRecord(patientId: string) {
  const db = createDb();
  const [encounters, flags, consent, labs, audits] = await Promise.all([
    db
      .select()
      .from(patientEncounter)
      .where(eq(patientEncounter.patientId, patientId))
      .orderBy(desc(patientEncounter.occurredAt)),
    db
      .select()
      .from(patientClinicalFlag)
      .where(
        and(eq(patientClinicalFlag.patientId, patientId), eq(patientClinicalFlag.active, true)),
      )
      .orderBy(asc(patientClinicalFlag.sortOrder), asc(patientClinicalFlag.createdAt)),
    ensureConsent(patientId),
    db
      .select()
      .from(extractedLab)
      .where(eq(extractedLab.patientId, patientId))
      .orderBy(desc(extractedLab.observedAt)),
    db
      .select({
        id: accessAuditLog.id,
        actorUserId: accessAuditLog.actorUserId,
        actorName: user.name,
        action: accessAuditLog.action,
        resourceType: accessAuditLog.resourceType,
        resourceId: accessAuditLog.resourceId,
        outcome: accessAuditLog.outcome,
        detail: accessAuditLog.detail,
        createdAt: accessAuditLog.createdAt,
      })
      .from(accessAuditLog)
      .leftJoin(user, eq(accessAuditLog.actorUserId, user.id))
      .where(eq(accessAuditLog.patientId, patientId))
      .orderBy(desc(accessAuditLog.createdAt))
      .limit(12),
  ]);

  const labPoints = labs.map((row) => ({
    id: row.id,
    testName: row.testName,
    value: row.value,
    unit: row.unit,
    flag: row.flag,
    observedAt: row.observedAt,
    entrySource: (row.entrySource === "manual" ? "manual" : "document") as "manual" | "document",
    documentId: row.documentId,
    refRangeLow: row.refRangeLow,
    refRangeHigh: row.refRangeHigh,
  }));

  return {
    encounters,
    flags,
    consent,
    labs: labPoints,
    labSeries: groupLabsByTestName(labPoints),
    facilities: uniqueFacilities(encounters.map((e) => e.facility)),
    audit: audits,
  };
}

export const patientRecordRouter = {
  get: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const row = await requirePatient(input.patientId);
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.record.view",
        resourceType: "patient",
        resourceId: row.id,
        patientId: row.id,
        outcome: "allowed",
      });
      const record = await loadRecord(row.id);
      return { patient: row, ...record };
    }),

  exportRecord: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const row = await requirePatient(input.patientId);
      const record = await loadRecord(row.id);
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.record.export",
        resourceType: "patient",
        resourceId: row.id,
        patientId: row.id,
        outcome: "allowed",
      });
      return {
        exportedAt: new Date().toISOString(),
        patient: row,
        ...record,
      };
    }),

  createEncounter: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }).merge(encounterInputSchema))
    .handler(async ({ context, input }) => {
      const facility = await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(patientEncounter)
        .values({
          id,
          patientId: input.patientId,
          clinicId: facility.id,
          createdByUserId: context.session.user.id,
          kind: input.kind,
          occurredAt: parseOccurredAt(input.occurredAt),
          title: input.title,
          facility: input.facility,
          summary: input.summary ?? "",
          badge: (input.badge ?? null) as EncounterBadge | null,
          metrics: (input.metrics ?? null) as EncounterMetric[] | null,
          links: input.links ?? null,
          inbound: input.inbound ?? false,
        })
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.encounter.create",
        resourceType: "patient_encounter",
        resourceId: id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return created!;
    }),

  updateEncounter: protectedProcedure
    .input(
      z
        .object({ id: z.string().min(1), patientId: z.string().min(1) })
        .merge(encounterInputSchema.partial()),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      const existing = await db
        .select()
        .from(patientEncounter)
        .where(
          and(eq(patientEncounter.id, input.id), eq(patientEncounter.patientId, input.patientId)),
        )
        .limit(1);
      if (!existing[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Encounter not found" });
      }

      const patch: Partial<typeof patientEncounter.$inferInsert> = {};
      if (input.kind !== undefined) patch.kind = input.kind;
      if (input.occurredAt !== undefined) patch.occurredAt = parseOccurredAt(input.occurredAt);
      if (input.title !== undefined) patch.title = input.title;
      if (input.facility !== undefined) patch.facility = input.facility;
      if (input.summary !== undefined) patch.summary = input.summary;
      if (input.badge !== undefined) patch.badge = input.badge as EncounterBadge | null;
      if (input.metrics !== undefined) patch.metrics = input.metrics as EncounterMetric[] | null;
      if (input.links !== undefined) patch.links = input.links;
      if (input.inbound !== undefined) patch.inbound = input.inbound;

      const [updated] = await db
        .update(patientEncounter)
        .set(patch)
        .where(eq(patientEncounter.id, input.id))
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.encounter.update",
        resourceType: "patient_encounter",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return updated!;
    }),

  deleteEncounter: protectedProcedure
    .input(z.object({ id: z.string().min(1), patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const deleted = await db
        .delete(patientEncounter)
        .where(
          and(eq(patientEncounter.id, input.id), eq(patientEncounter.patientId, input.patientId)),
        )
        .returning({ id: patientEncounter.id });
      if (!deleted[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Encounter not found" });
      }
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.encounter.delete",
        resourceType: "patient_encounter",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return { ok: true as const };
    }),

  createFlag: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        label: z.string().trim().min(1).max(120),
        tone: flagToneSchema.default("info"),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(patientClinicalFlag)
        .values({
          id,
          patientId: input.patientId,
          createdByUserId: context.session.user.id,
          label: input.label,
          tone: input.tone,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.flag.create",
        resourceType: "patient_clinical_flag",
        resourceId: id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return created!;
    }),

  updateFlag: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        patientId: z.string().min(1),
        label: z.string().trim().min(1).max(120).optional(),
        tone: flagToneSchema.optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        active: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const existing = await db
        .select()
        .from(patientClinicalFlag)
        .where(
          and(
            eq(patientClinicalFlag.id, input.id),
            eq(patientClinicalFlag.patientId, input.patientId),
          ),
        )
        .limit(1);
      if (!existing[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Clinical flag not found" });
      }
      const [updated] = await db
        .update(patientClinicalFlag)
        .set({
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.tone !== undefined ? { tone: input.tone } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        })
        .where(eq(patientClinicalFlag.id, input.id))
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.flag.update",
        resourceType: "patient_clinical_flag",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return updated!;
    }),

  deleteFlag: protectedProcedure
    .input(z.object({ id: z.string().min(1), patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const deleted = await db
        .delete(patientClinicalFlag)
        .where(
          and(
            eq(patientClinicalFlag.id, input.id),
            eq(patientClinicalFlag.patientId, input.patientId),
          ),
        )
        .returning({ id: patientClinicalFlag.id });
      if (!deleted[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Clinical flag not found" });
      }
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.flag.delete",
        resourceType: "patient_clinical_flag",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return { ok: true as const };
    }),

  updateConsent: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        emergencyOverride: z.boolean().optional(),
        telemetrySharing: z.boolean().optional(),
        researchOptIn: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const current = await ensureConsent(input.patientId, context.session.user.id);
      const db = createDb();
      const [updated] = await db
        .update(patientConsent)
        .set({
          ...(input.emergencyOverride !== undefined
            ? { emergencyOverride: input.emergencyOverride }
            : {}),
          ...(input.telemetrySharing !== undefined
            ? { telemetrySharing: input.telemetrySharing }
            : {}),
          ...(input.researchOptIn !== undefined ? { researchOptIn: input.researchOptIn } : {}),
          updatedByUserId: context.session.user.id,
        })
        .where(eq(patientConsent.id, current.id))
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.consent.update",
        resourceType: "patient_consent",
        resourceId: current.id,
        patientId: input.patientId,
        outcome: "allowed",
        detail: {
          emergencyOverride: updated?.emergencyOverride,
          telemetrySharing: updated?.telemetrySharing,
          researchOptIn: updated?.researchOptIn,
        },
      });
      return updated!;
    }),

  createLab: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        testName: z.string().trim().min(1).max(120),
        value: z.number().finite(),
        unit: z.string().trim().max(40).optional().nullable(),
        flag: z.string().trim().max(40).optional().nullable(),
        refRangeLow: z.number().finite().optional().nullable(),
        refRangeHigh: z.number().finite().optional().nullable(),
        observedAt: z.string().min(8),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(extractedLab)
        .values({
          id,
          documentId: null,
          patientId: input.patientId,
          testName: input.testName,
          value: input.value,
          unit: input.unit || null,
          flag: input.flag || null,
          refRangeLow: input.refRangeLow ?? null,
          refRangeHigh: input.refRangeHigh ?? null,
          observedAt: parseObservedAt(input.observedAt),
          entrySource: "manual",
        })
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.lab.create",
        resourceType: "extracted_lab",
        resourceId: id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return created!;
    }),

  updateLab: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        patientId: z.string().min(1),
        testName: z.string().trim().min(1).max(120).optional(),
        value: z.number().finite().optional(),
        unit: z.string().trim().max(40).optional().nullable(),
        flag: z.string().trim().max(40).optional().nullable(),
        refRangeLow: z.number().finite().optional().nullable(),
        refRangeHigh: z.number().finite().optional().nullable(),
        observedAt: z.string().min(8).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const existing = await db
        .select()
        .from(extractedLab)
        .where(and(eq(extractedLab.id, input.id), eq(extractedLab.patientId, input.patientId)))
        .limit(1);
      if (!existing[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Lab reading not found" });
      }
      if (existing[0].entrySource !== "manual") {
        throw new ORPCError("FORBIDDEN", {
          message: "Only manually entered labs can be edited here",
        });
      }
      const [updated] = await db
        .update(extractedLab)
        .set({
          ...(input.testName !== undefined ? { testName: input.testName } : {}),
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.unit !== undefined ? { unit: input.unit } : {}),
          ...(input.flag !== undefined ? { flag: input.flag } : {}),
          ...(input.refRangeLow !== undefined ? { refRangeLow: input.refRangeLow } : {}),
          ...(input.refRangeHigh !== undefined ? { refRangeHigh: input.refRangeHigh } : {}),
          ...(input.observedAt !== undefined
            ? { observedAt: parseObservedAt(input.observedAt) }
            : {}),
        })
        .where(eq(extractedLab.id, input.id))
        .returning();
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.lab.update",
        resourceType: "extracted_lab",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return updated!;
    }),

  deleteLab: protectedProcedure
    .input(z.object({ id: z.string().min(1), patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const existing = await db
        .select()
        .from(extractedLab)
        .where(and(eq(extractedLab.id, input.id), eq(extractedLab.patientId, input.patientId)))
        .limit(1);
      if (!existing[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Lab reading not found" });
      }
      if (existing[0].entrySource !== "manual") {
        throw new ORPCError("FORBIDDEN", {
          message: "Only manually entered labs can be deleted here",
        });
      }
      await db.delete(extractedLab).where(eq(extractedLab.id, input.id));
      await logAccess({
        actorUserId: context.session.user.id,
        action: "patient.lab.delete",
        resourceType: "extracted_lab",
        resourceId: input.id,
        patientId: input.patientId,
        outcome: "allowed",
      });
      return { ok: true as const };
    }),

  listAudit: protectedProcedure
    .input(z.object({ patientId: z.string().min(1), limit: z.number().int().min(1).max(50).optional() }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      await requirePatient(input.patientId);
      const db = createDb();
      return db
        .select({
          id: accessAuditLog.id,
          actorUserId: accessAuditLog.actorUserId,
          actorName: user.name,
          action: accessAuditLog.action,
          resourceType: accessAuditLog.resourceType,
          resourceId: accessAuditLog.resourceId,
          outcome: accessAuditLog.outcome,
          detail: accessAuditLog.detail,
          createdAt: accessAuditLog.createdAt,
        })
        .from(accessAuditLog)
        .leftJoin(user, eq(accessAuditLog.actorUserId, user.id))
        .where(eq(accessAuditLog.patientId, input.patientId))
        .orderBy(desc(accessAuditLog.createdAt))
        .limit(input.limit ?? 20);
    }),
};
