import { auth } from "@medi-connect/auth";
import { createDb } from "@medi-connect/db";
import { user } from "@medi-connect/db/schema/auth";
import { patient, patientFile } from "@medi-connect/db/schema/patient";
import { count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
  CNIC_ALREADY_REGISTERED,
  normalizeCnic,
  normalizePakistanPhone,
  parseIsoDateOfBirth,
} from "../lib/pakistan";
import { requireActiveClinic } from "../lib/require-clinic";
import { createSignedUrl } from "../lib/supabase";

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not create account";
}

export const patientRouter = {
  selfRegister: publicProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(254),
        password: z.string().min(8).max(128),
        phone: z.string().min(10),
        cnic: z.string().min(5),
        dateOfBirth: z.string().min(8),
        gender: z.enum(["male", "female", "other"]),
      }),
    )
    .handler(async ({ input }) => {
      const cnic = normalizeCnic(input.cnic);
      if (!cnic) {
        throw new ORPCError("BAD_REQUEST", { message: "CNIC must be 13 digits" });
      }

      const phone = normalizePakistanPhone(input.phone);
      if (!phone) {
        throw new ORPCError("BAD_REQUEST", { message: "Enter a valid Pakistan mobile number" });
      }

      const dateOfBirth = parseIsoDateOfBirth(input.dateOfBirth);
      if (!dateOfBirth) {
        throw new ORPCError("BAD_REQUEST", { message: "Enter a valid date of birth" });
      }

      const db = createDb();
      const existing = await db.select({ id: patient.id }).from(patient).where(eq(patient.cnic, cnic)).limit(1);
      if (existing[0]) {
        throw new ORPCError("CONFLICT", { message: CNIC_ALREADY_REGISTERED });
      }

      let createdUserId: string | undefined;
      try {
        const result = await auth.api.signUpEmail({
          body: {
            name: input.fullName.trim(),
            email: input.email.trim().toLowerCase(),
            password: input.password,
          },
        });

        if (!result.user?.id) {
          throw new ORPCError("BAD_REQUEST", { message: "Could not create account" });
        }

        createdUserId = result.user.id;

        await db.update(user).set({ role: "patient" }).where(eq(user.id, createdUserId));

        await db.insert(patient).values({
          id: crypto.randomUUID(),
          cnic,
          fullName: input.fullName.trim(),
          dateOfBirth,
          gender: input.gender,
          phone,
          userId: createdUserId,
          createdByUserId: createdUserId,
          createdByClinicId: null,
        });

        return { ok: true as const };
      } catch (error) {
        if (createdUserId) {
          await db.delete(user).where(eq(user.id, createdUserId));
        }
        if (error instanceof ORPCError) {
          throw error;
        }
        if (createdUserId) {
          throw new ORPCError("CONFLICT", { message: CNIC_ALREADY_REGISTERED });
        }
        const message = getAuthErrorMessage(error);
        const isDuplicate = /already exists|unique|duplicate/i.test(message);
        throw new ORPCError(isDuplicate ? "CONFLICT" : "BAD_REQUEST", {
          message: isDuplicate
            ? "An account with this email already exists. Log in instead."
            : message,
        });
      }
    }),

  me: protectedProcedure.handler(async ({ context }) => {
    const db = createDb();
    const rows = await db
      .select()
      .from(patient)
      .where(eq(patient.userId, context.session.user.id))
      .limit(1);
    if (!rows[0]) {
      throw new ORPCError("NOT_FOUND", { message: "Patient profile not found" });
    }
    return {
      ...rows[0],
      email: context.session.user.email,
    };
  }),

  searchByCnic: protectedProcedure
    .input(z.object({ cnic: z.string().min(5) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
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
      await requireActiveClinic(context.session.user.id);
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

  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().max(100).optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(5).max(50).default(10),
        })
        .optional(),
    )
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
      const db = createDb();
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;
      const q = input?.query?.trim() ?? "";

      let whereClause: SQL | undefined;
      if (q) {
        const cnic = normalizeCnic(q);
        whereClause = cnic
          ? eq(patient.cnic, cnic)
          : or(ilike(patient.fullName, `%${q}%`), ilike(patient.cnic, `%${q.replace(/\D/g, "")}%`));
      }

      const countRows = await db.select({ value: count() }).from(patient).where(whereClause);
      const total = Number(countRows[0]?.value ?? 0);

      const items = await db
        .select({
          id: patient.id,
          cnic: patient.cnic,
          fullName: patient.fullName,
          phone: patient.phone,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          bloodType: patient.bloodType,
          createdAt: patient.createdAt,
        })
        .from(patient)
        .where(whereClause)
        .orderBy(desc(patient.createdAt))
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

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      await requireActiveClinic(context.session.user.id);
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
      const facility = await requireActiveClinic(context.session.user.id);
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
      await requireActiveClinic(context.session.user.id);
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
