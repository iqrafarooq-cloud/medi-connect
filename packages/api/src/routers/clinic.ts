import { createDb } from "@medi-connect/db";
import { user } from "@medi-connect/db/schema/auth";
import { clinic } from "@medi-connect/db/schema/clinic";
import { env } from "@medi-connect/env/server";
import { eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import { getAdminEmail, sessionIsAdmin } from "../lib/admin";
import { registerProfileInput } from "../lib/clinic-register";
import {
  CLINIC_STATUS,
  clinicLoginGate,
  isAdminEmail,
  registrationBlockedMessage,
} from "../lib/clinic-verification";
import { findClinicByOwner } from "../lib/require-clinic";
import { normalizePakistanPhone } from "../lib/pakistan";

export const clinicRouter = {
  me: protectedProcedure.handler(async ({ context }) => {
    return findClinicByOwner(context.session.user.id);
  }),

  loginGate: protectedProcedure.handler(async ({ context }) => {
    const email = context.session.user.email;
    const facility = await findClinicByOwner(context.session.user.id);
    return clinicLoginGate({
      email,
      adminEmail: getAdminEmail(),
      clinicStatus: facility?.status ?? null,
    });
  }),

  registrationStatus: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .handler(async ({ input }) => {
      if (isAdminEmail(input.email, env.ADMIN_EMAIL)) {
        return {
          status: null as string | null,
          blockedMessage: "This email is reserved for the system admin.",
        };
      }

      const db = createDb();
      const normalized = input.email.trim().toLowerCase();
      const rows = await db
        .select({ status: clinic.status })
        .from(clinic)
        .innerJoin(user, eq(clinic.ownerUserId, user.id))
        .where(sql`lower(${user.email}) = ${normalized}`)
        .limit(1);

      const status = rows[0]?.status ?? null;
      return {
        status,
        blockedMessage: registrationBlockedMessage(status),
      };
    }),

  registerProfile: protectedProcedure
    .input(registerProfileInput)
    .handler(async ({ context, input }) => {
      if (sessionIsAdmin(context.session.user.email)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Admin accounts cannot register a clinic",
        });
      }

      const db = createDb();
      const userId = context.session.user.id;

      const existing = await db
        .select()
        .from(clinic)
        .where(eq(clinic.ownerUserId, userId))
        .limit(1);
      if (existing[0]) {
        const blocked = registrationBlockedMessage(existing[0].status);
        throw new ORPCError("CONFLICT", {
          message:
            blocked ?? "Clinic profile already exists for this account",
        });
      }

      const phone = normalizePakistanPhone(input.phone);
      if (!phone) {
        throw new ORPCError("BAD_REQUEST", { message: "Invalid Pakistan phone number" });
      }

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(clinic)
        .values({
          id,
          ownerUserId: userId,
          name: input.name,
          type: input.type,
          address: input.address,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          ownerName: input.ownerName,
          phone,
          licenseNumber: input.licenseNumber,
          status: CLINIC_STATUS.PENDING,
        })
        .returning();

      return created;
    }),
};
