import { tool } from "ai";
import { z } from "zod";

import { toToolJson } from "../json";
import {
  findRelevantChunks,
  queryActiveMedications,
  queryExtractedLabs,
  queryHomeGlucose,
  queryPatientEncounters,
  queryReconciledAllergies,
  recordNoteInsertion,
  runAllergyConflictCheck,
} from "../retrieval";

export function searchPatientRecords(patientId: string) {
  return tool({
    description:
      "Semantic search over this patient's narrative clinical notes. Use for open-ended or contextual questions; NOT for exact numbers — use getLabTrend for those.",
    inputSchema: z.object({
      query: z.string().describe("natural-language question"),
    }),
    execute: async ({ query }) => toToolJson(await findRelevantChunks(patientId, query)),
  });
}

export function getLabTrend(patientId: string) {
  return tool({
    description:
      'Exact time series for a named lab test (e.g. "eGFR", "HbA1c", "Serum Creatinine") for this patient, from structured lab extractions including both PDF-ingested and manually entered values.',
    inputSchema: z.object({
      testName: z.string(),
      sinceDate: z.string().optional(),
    }),
    execute: async ({ testName, sinceDate }) =>
      toToolJson(await queryExtractedLabs(patientId, testName, sinceDate)),
  });
}

export function getActiveMedications(patientId: string) {
  return tool({
    description: "List active medications from structured extractions for this patient.",
    inputSchema: z.object({}),
    execute: async () => toToolJson(await queryActiveMedications(patientId)),
  });
}

export function getAllergies(patientId: string) {
  return tool({
    description:
      "Reconciled allergy list across all ingested documents for this patient (not just the latest note header).",
    inputSchema: z.object({}),
    execute: async () => toToolJson(await queryReconciledAllergies(patientId)),
  });
}

export function getHomeGlucoseReadings(patientId: string) {
  return tool({
    description:
      "Home fingerstick glucose log for this patient (fasting and post-prandial), with values in mg/dL.",
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await queryHomeGlucose(patientId);
      if (!rows.length) return { readings: [], min: null, max: null, unit: "mg/dL" };
      const values = rows.map((r) => Number(r.value));
      return toToolJson({
        unit: "mg/dL",
        min: Math.min(...values),
        max: Math.max(...values),
        readings: rows.map((r) => ({
          measuredAt: r.measuredAt,
          value: Number(r.value),
          context: r.context,
          sourceDocumentId: r.sourceDocumentId,
        })),
      });
    },
  });
}

export function getPatientEncounters(patientId: string) {
  return tool({
    description:
      "Structured clinical encounters for this patient (notes, facility visits, metrics, prescriptions recorded in encounter summaries). Prefer this over searchPatientRecords for visit history or what a clinician documented at a visit.",
    inputSchema: z.object({
      sinceDate: z.string().optional().describe("ISO date lower bound, optional"),
    }),
    execute: async ({ sinceDate }) =>
      toToolJson(await queryPatientEncounters(patientId, sinceDate)),
  });
}

export function checkAllergyConflict(patientId: string) {
  return tool({
    description:
      "Checks a proposed medication name against this patient's documented allergies. Decision-support only — simple class/substring match, not a licensed drug-interaction database.",
    inputSchema: z.object({
      medicationName: z.string(),
    }),
    execute: async ({ medicationName }) =>
      toToolJson(await runAllergyConflictCheck(patientId, medicationName)),
  });
}

export function insertIntoNote({
  patientId,
  clinicianId,
  messageId,
}: {
  patientId: string;
  clinicianId: string;
  messageId: string;
}) {
  return tool({
    description:
      "Insert AI-drafted, citation-backed text into the patient's chart note. Always requires explicit clinician approval before it is written anywhere permanent.",
    inputSchema: z.object({
      proposedText: z.string(),
      citationDocumentIds: z.array(z.string()),
    }),
    execute: async ({ proposedText, citationDocumentIds }) =>
      toToolJson(
        await recordNoteInsertion({
          messageId,
          patientId,
          clinicianId,
          proposedText,
          citationDocumentIds,
          status: "accepted",
        }),
      ),
  });
}
