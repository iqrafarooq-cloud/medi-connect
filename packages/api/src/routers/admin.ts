import { createDb } from "@medi-connect/db";
import { user } from "@medi-connect/db/schema/auth";
import { clinic, clinicDocument } from "@medi-connect/db/schema/clinic";
import { count, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { adminProcedure } from "../index";
import { CLINIC_STATUS } from "../lib/clinic-verification";
import { createSignedUrl, removeObjects } from "../lib/supabase";

const statusFilter = z.enum([
  CLINIC_STATUS.PENDING,
  CLINIC_STATUS.ACTIVE,
  CLINIC_STATUS.REJECTED,
]);

export const adminRouter = {
  me: adminProcedure.handler(async ({ context }) => {
    return {
      email: context.session.user.email,
      name: context.session.user.name,
    };
  }),

  listClinics: adminProcedure
    .input(
      z
        .object({
          status: statusFilter.optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(10),
        })
        .optional(),
    )
    .handler(async ({ input }) => {
      const db = createDb();
      const status = input?.status;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const whereClause = status ? eq(clinic.status, status) : undefined;

      const countRows = await db
        .select({ value: count() })
        .from(clinic)
        .where(whereClause);
      const total = Number(countRows[0]?.value ?? 0);

      const items = await db
        .select({
          id: clinic.id,
          name: clinic.name,
          type: clinic.type,
          city: clinic.city,
          status: clinic.status,
          ownerName: clinic.ownerName,
          phone: clinic.phone,
          licenseNumber: clinic.licenseNumber,
          createdAt: clinic.createdAt,
          updatedAt: clinic.updatedAt,
          ownerEmail: user.email,
        })
        .from(clinic)
        .innerJoin(user, eq(clinic.ownerUserId, user.id))
        .where(whereClause)
        .orderBy(desc(clinic.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        items,
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      };
    }),

  getClinic: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input }) => {
      const db = createDb();
      const rows = await db
        .select({
          id: clinic.id,
          name: clinic.name,
          type: clinic.type,
          address: clinic.address,
          city: clinic.city,
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          status: clinic.status,
          ownerName: clinic.ownerName,
          phone: clinic.phone,
          licenseNumber: clinic.licenseNumber,
          createdAt: clinic.createdAt,
          updatedAt: clinic.updatedAt,
          ownerUserId: clinic.ownerUserId,
          ownerEmail: user.email,
        })
        .from(clinic)
        .innerJoin(user, eq(clinic.ownerUserId, user.id))
        .where(eq(clinic.id, input.id))
        .limit(1);

      const facility = rows[0];
      if (!facility) {
        throw new ORPCError("NOT_FOUND", { message: "Clinic not found" });
      }

      const docs = await db
        .select()
        .from(clinicDocument)
        .where(eq(clinicDocument.clinicId, facility.id))
        .orderBy(desc(clinicDocument.uploadedAt));

      const documents = await Promise.all(
        docs.map(async (doc) => {
          let signedUrl: string | null = null;
          try {
            signedUrl = await createSignedUrl(doc.bucket, doc.storagePath);
          } catch {
            signedUrl = null;
          }
          return { ...doc, signedUrl };
        }),
      );

      return { ...facility, documents };
    }),

  approveClinic: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input }) => {
      const db = createDb();
      const [updated] = await db
        .update(clinic)
        .set({ status: CLINIC_STATUS.ACTIVE })
        .where(eq(clinic.id, input.id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Clinic not found" });
      }
      return updated;
    }),

  rejectClinic: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input }) => {
      const db = createDb();
      const [updated] = await db
        .update(clinic)
        .set({ status: CLINIC_STATUS.REJECTED })
        .where(eq(clinic.id, input.id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Clinic not found" });
      }
      return updated;
    }),

  removeClinic: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input }) => {
      const db = createDb();
      const rows = await db.select().from(clinic).where(eq(clinic.id, input.id)).limit(1);
      const facility = rows[0];
      if (!facility) {
        throw new ORPCError("NOT_FOUND", { message: "Clinic not found" });
      }

      const docs = await db
        .select()
        .from(clinicDocument)
        .where(eq(clinicDocument.clinicId, facility.id));

      const byBucket = new Map<string, string[]>();
      for (const doc of docs) {
        const list = byBucket.get(doc.bucket) ?? [];
        list.push(doc.storagePath);
        byBucket.set(doc.bucket, list);
      }
      for (const [bucket, paths] of byBucket) {
        try {
          await removeObjects(bucket, paths);
        } catch {
          // Best-effort storage cleanup; DB row removal still proceeds.
        }
      }

      const ownerUserId = facility.ownerUserId;
      try {
        await db.delete(clinic).where(eq(clinic.id, facility.id));
        await db.delete(user).where(eq(user.id, ownerUserId));
      } catch {
        throw new ORPCError("CONFLICT", {
          message:
            "Cannot remove this clinic while related patient or clinical records still reference it.",
        });
      }

      return { ok: true as const };
    }),
};
