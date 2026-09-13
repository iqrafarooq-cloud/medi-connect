import { createDb } from "@medi-connect/db";
import { patient } from "@medi-connect/db/schema/patient";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export async function requireSessionPatient(userId: string) {
  const db = createDb();
  const rows = await db.select().from(patient).where(eq(patient.userId, userId)).limit(1);
  if (!rows[0]) {
    throw new ORPCError("FORBIDDEN", { message: "Patient profile not found" });
  }
  return rows[0];
}
