import { generateObject } from "ai";
import { z } from "zod";

import { getChatModel } from "./vertex";

const labsSchema = z.object({
  labs: z.array(
    z.object({
      testName: z.string(),
      value: z.number(),
      unit: z.string().nullable(),
      refRangeLow: z.number().nullable(),
      refRangeHigh: z.number().nullable(),
      flag: z.enum(["High", "Low", "Normal"]).nullable(),
      observedAt: z.string().describe("ISO date of the lab draw if known"),
    }),
  ),
});

const medsSchema = z.object({
  medications: z.array(
    z.object({
      name: z.string(),
      dose: z.string().nullable(),
      route: z.string().nullable(),
      frequency: z.string().nullable(),
      status: z.enum(["active", "discontinued", "changed"]).default("active"),
      startedAt: z.string().nullable(),
      prescribingProvider: z.string().nullable(),
    }),
  ),
});

const allergiesSchema = z.object({
  allergies: z.array(
    z.object({
      substance: z.string(),
      reaction: z.string().nullable(),
      severity: z.string().nullable(),
    }),
  ),
});

const metaSchema = z.object({
  type: z.enum([
    "soap_note",
    "specialist_consult",
    "radiology_report",
    "lab_panel",
    "progress_note",
    "eye_exam",
    "home_monitoring_log",
    "other",
  ]),
  specialty: z.string().nullable(),
  encounterDate: z.string().nullable(),
  providerName: z.string().nullable(),
  pageCount: z.number().int().positive().nullable(),
});

export type ExtractedLabRow = z.infer<typeof labsSchema>["labs"][number];
export type ExtractedMedRow = z.infer<typeof medsSchema>["medications"][number];
export type ExtractedAllergyRow = z.infer<typeof allergiesSchema>["allergies"][number];
export type DocumentMeta = z.infer<typeof metaSchema>;

export async function extractDocumentMeta(text: string, filename: string): Promise<DocumentMeta> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: metaSchema,
    prompt: `Classify this clinical document and extract metadata.
Filename: ${filename}
Text (truncated):
${text.slice(0, 6000)}`,
  });
  return object;
}

export async function extractLabs(text: string): Promise<ExtractedLabRow[]> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: labsSchema,
    prompt: `Extract numeric laboratory results from this clinical text. Normalize test names (e.g. eGFR, HbA1c, Serum Creatinine, BUN, Fasting Glucose, UACR, LDL, Total Cholesterol).
If no labs are present, return an empty array.

${text.slice(0, 12000)}`,
  });
  return object.labs;
}

export async function extractMedications(text: string): Promise<ExtractedMedRow[]> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: medsSchema,
    prompt: `Extract medications (current, prescribed, or changed) from this clinical text.
If none, return an empty array.

${text.slice(0, 12000)}`,
  });
  return object.medications;
}

export async function extractAllergies(text: string): Promise<ExtractedAllergyRow[]> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: allergiesSchema,
    prompt: `Extract documented drug/substance allergies from this clinical text (headers and allergy alerts).
Ignore NKDA / "no known allergies". If none, return an empty array.

${text.slice(0, 8000)}`,
  });
  return object.allergies;
}
