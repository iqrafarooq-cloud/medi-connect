import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

import { CLINIC_STATUS } from "./clinic-verification";

export async function findClinicByOwner(userId: string) {
  const db = createDb();
  const rows = await db.select().from(clinic).where(eq(clinic.ownerUserId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function requireActiveClinic(userId: string) {
  const row = await findClinicByOwner(userId);
  if (!row) {
    throw new ORPCError("FORBIDDEN", { message: "Complete clinic registration first" });
  }
  if (row.status !== CLINIC_STATUS.ACTIVE) {
    throw new ORPCError("FORBIDDEN", {
      message:
        row.status === CLINIC_STATUS.REJECTED
          ? "Clinic verification was rejected"
          : "Clinic verification is still pending",
    });
  }
  return row;
}
