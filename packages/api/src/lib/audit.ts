import { createDb } from "@medi-connect/db";
import { accessAuditLog } from "@medi-connect/db/schema/clinical";

export async function logAccess(params: {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  patientId?: string | null;
  outcome: "allowed" | "denied" | "error";
  detail?: Record<string, unknown>;
}) {
  try {
    const db = createDb();
    await db.insert(accessAuditLog).values({
      id: crypto.randomUUID(),
      actorUserId: params.actorUserId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      patientId: params.patientId ?? null,
      outcome: params.outcome,
      detail: params.detail ?? null,
    });
  } catch {
    // Never fail the request because of audit write issues
  }
}
