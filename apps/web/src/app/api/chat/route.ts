import { auth } from "@medi-connect/auth";
import {
  checkAllergyConflict,
  getActiveMedications,
  getAllergies,
  getChatModel,
  getHomeGlucoseReadings,
  getLabTrend,
  getPatientEncounters,
  insertIntoNote,
  searchPatientRecords,
} from "@medi-connect/ai";
import { createDb } from "@medi-connect/db";
import { chatMessage, chatSession } from "@medi-connect/db/schema/clinical";
import { patient } from "@medi-connect/db/schema/patient";
import { logAccess } from "@medi-connect/api/lib/audit";
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    patientId?: string;
    sessionId?: string;
  };

  const patientId = body.patientId;
  if (!patientId) {
    return Response.json({ error: "patientId is required" }, { status: 400 });
  }

  const db = createDb();
  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    await logAccess({
      actorUserId: session.user.id,
      action: "chat",
      resourceType: "patient",
      patientId,
      outcome: "denied",
      detail: { reason: "no_active_clinic" },
    });
    return Response.json(
      { error: "Clinic must be approved before using the portal" },
      { status: 403 },
    );
  }

  const patientRows = await db.select().from(patient).where(eq(patient.id, patientId)).limit(1);
  if (!patientRows[0]) {
    await logAccess({
      actorUserId: session.user.id,
      action: "chat",
      resourceType: "patient",
      patientId,
      outcome: "denied",
      detail: { reason: "patient_not_found" },
    });
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  let sessionId = body.sessionId;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    await db.insert(chatSession).values({
      id: sessionId,
      patientId,
      clinicianId: session.user.id,
    });
  }

  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    await db.insert(chatMessage).values({
      id: lastUser.id || crypto.randomUUID(),
      sessionId,
      role: "user",
      parts: lastUser.parts,
    });
  }

  await logAccess({
    actorUserId: session.user.id,
    action: "chat",
    resourceType: "patient",
    resourceId: sessionId,
    patientId,
    outcome: "allowed",
  });

  const messageId = crypto.randomUUID();
  const clinicianId = session.user.id;

  const tools = {
    searchPatientRecords: searchPatientRecords(patientId),
    getLabTrend: getLabTrend(patientId),
    getActiveMedications: getActiveMedications(patientId),
    getAllergies: getAllergies(patientId),
    getHomeGlucoseReadings: getHomeGlucoseReadings(patientId),
    getPatientEncounters: getPatientEncounters(patientId),
    checkAllergyConflict: checkAllergyConflict(patientId),
    insertIntoNote: insertIntoNote({ patientId, clinicianId, messageId }),
  };

  const result = streamText({
    model: getChatModel(),
    instructions: `You are a clinical documentation assistant reading ONLY the records of patient ${patientId} (${patientRows[0].fullName}).
Rules:
- Every clinical claim (a diagnosis, a lab value, a medication, a dose, a date) MUST come from a tool result. Never state a number or date from memory.
- After each claim, cite it as [Doc #<n>] where n maps to the numbered sources (citationIndex) returned by your most recent tool call. Prefer including document filename when helpful.
- If no tool result supports an answer, say exactly: "I don't have documentation of that in this patient's record." Do not infer, extrapolate, or fill gaps.
- Prefer getLabTrend / getActiveMedications / getAllergies / getHomeGlucoseReadings / getPatientEncounters over searchPatientRecords when the question is about a specific value, trend, medication list, allergy, home glucose, or clinical visit/encounter notes — those tools read structured data and are more reliable than semantic search for numbers.
- Use getPatientEncounters for visit history, clinician notes, prescribed medications mentioned in encounters, and facility events.
- Before proposing any medication-related note text, call checkAllergyConflict.
- When the clinician asks you to draft text for the chart, call insertIntoNote with citationDocumentIds from your tool results. Never invent chart text without citations.
- checkAllergyConflict is decision-support only (simple class/substring match). Always mention that disclaimer when reporting allergy conflict results.`,
    messages: await convertToModelMessages(messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    stopWhen: stepCountIs(6),
    tools,
    toolApproval: {
      insertIntoNote: "user-approval",
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onFinish: async ({ responseMessage }) => {
        try {
          await db.insert(chatMessage).values({
            id: responseMessage.id || messageId,
            sessionId: sessionId!,
            role: "assistant",
            parts: responseMessage.parts,
          });
        } catch {
          // persistence best-effort
        }
      },
    }),
    headers: {
      "x-chat-session-id": sessionId,
    },
  });
}
