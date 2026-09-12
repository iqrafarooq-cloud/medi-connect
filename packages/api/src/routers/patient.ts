import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { patient, patientFile } from "@medi-connect/db/schema/patient";
import { desc, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  normalizeCnic,
  normalizePakistanPhone,
} from "../lib/pakistan";
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

export const patientRouter = {
  searchByCnic: protectedProcedure
    .input(z.object({ cnic: z.string().min(5) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const cnic = normalizeCnic(input.cnic);
      if (!cnic) {
        throw new ORPCError("BAD_REQUEST", { message: "CNIC must be 13 digits" });
      }
      const db = createDb();
      const rows = await db.select().from(patient).where(eq(patient.cnic, cnic)).limit(1);
      return rows[0] ?? null;
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const db = createDb();
      const q = input.query.trim();
      const cnic = normalizeCnic(q);
      if (cnic) {
        return db.select().from(patient).where(eq(patient.cnic, cnic)).limit(20);
      }
      return db
        .select()
        .from(patient)
        .where(ilike(patient.fullName, `%${q}%`))
        .limit(20);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const db = createDb();
      const rows = await db.select().from(patient).where(eq(patient.id, input.id)).limit(1);
      if (!rows[0]) {
        throw new ORPCError("NOT_FOUND", { message: "Patient not found" });
      }
      return rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        cnic: z.string().min(5),
        fullName: z.string().min(2),
        dateOfBirth: z.string().min(8),
        gender: z.enum(["male", "female", "other"]),
        bloodType: z.string().optional(),
        phone: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      const cnic = normalizeCnic(input.cnic);
      if (!cnic) {
        throw new ORPCError("BAD_REQUEST", { message: "CNIC must be 13 digits" });
      }

      let phone: string | null = null;
      if (input.phone) {
        phone = normalizePakistanPhone(input.phone);
        if (!phone) {
          throw new ORPCError("BAD_REQUEST", { message: "Invalid Pakistan phone number" });
        }
      }

      let emergencyContactPhone: string | null = null;
      if (input.emergencyContactPhone) {
        emergencyContactPhone = normalizePakistanPhone(input.emergencyContactPhone);
        if (!emergencyContactPhone) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid emergency contact phone number",
          });
        }
      }

      const db = createDb();
      const existing = await db.select().from(patient).where(eq(patient.cnic, cnic)).limit(1);
      if (existing[0]) {
        return { patient: existing[0], created: false as const };
      }

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(patient)
        .values({
          id,
          cnic,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          bloodType: input.bloodType || null,
          phone,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone,
          notes: input.notes || null,
          createdByUserId: context.session.user.id,
          createdByClinicId: facility.id,
        })
        .returning();

      return { patient: created, created: true as const };
    }),

  listFiles: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireClinic(context.session.user.id);
      const db = createDb();
      const files = await db
        .select()
        .from(patientFile)
        .where(eq(patientFile.patientId, input.patientId))
        .orderBy(desc(patientFile.uploadedAt));

      const withUrls = await Promise.all(
        files.map(async (file) => ({
          ...file,
          signedUrl: await createSignedUrl(file.bucket, file.storagePath),
        })),
      );
      return withUrls;
    }),
};
