import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { normalizePakistanPhone } from "../lib/pakistan";

const registerProfileInput = z.object({
  name: z.string().min(2),
  type: z.enum(["clinic", "hospital"]),
  address: z.string().min(3),
  city: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(10),
  licenseNumber: z.string().min(3),
});

export const clinicRouter = {
  me: protectedProcedure.handler(async ({ context }) => {
    const db = createDb();
    const userId = context.session.user.id;
    const rows = await db.select().from(clinic).where(eq(clinic.ownerUserId, userId)).limit(1);
    return rows[0] ?? null;
  }),

  registerProfile: protectedProcedure
    .input(registerProfileInput)
    .handler(async ({ context, input }) => {
      const db = createDb();
      const userId = context.session.user.id;

      const existing = await db
        .select()
        .from(clinic)
        .where(eq(clinic.ownerUserId, userId))
        .limit(1);
      if (existing[0]) {
        throw new ORPCError("CONFLICT", { message: "Clinic profile already exists for this account" });
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
          ownerName: input.ownerName,
          phone,
          licenseNumber: input.licenseNumber,
          status: "pending_verification",
        })
        .returning();

      return created;
    }),
};
