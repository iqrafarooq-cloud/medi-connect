import { createDb } from "@medi-connect/db";
import {
  clinicalDocument,
  documentChunk,
  extractedLab,
  extractedMedication,
} from "@medi-connect/db/schema/clinical";
import { patientEncounter } from "@medi-connect/db/schema/patient";
import { and, eq } from "drizzle-orm";

import { chunkClinicalText } from "../chunking";
import { embedChunks } from "../embedding";
import { extractMedications } from "../extract";

const CHART_BUCKET = "chart";

export function chartEncounterDocumentId(encounterId: string) {
  return `chart-encounter-${encounterId}`;
}

export function chartLabDocumentId(labId: string) {
  return `chart-lab-${labId}`;
}

function encounterDocType(
  kind: string,
): (typeof clinicalDocument.$inferInsert)["type"] {
  if (kind === "cardio") return "specialist_consult";
  if (kind === "labs") return "lab_panel";
  if (kind === "emergency") return "progress_note";
  return "soap_note";
}

function formatEncounterText(enc: {
  kind: string;
  occurredAt: Date;
  title: string;
  facility: string;
  summary: string;
  badge: { label: string; tone: string } | null;
  metrics: Array<{ label: string; value: string; alert?: boolean }> | null;
  links: string[] | null;
  inbound: boolean;
}) {
  const lines = [
    "CLINICAL ENCOUNTER",
    `Kind: ${enc.kind}`,
    `Date: ${enc.occurredAt.toISOString()}`,
    `Title: ${enc.title}`,
    `Facility: ${enc.facility}`,
    enc.inbound ? "Direction: inbound transfer" : null,
    enc.badge ? `Status badge: ${enc.badge.label} (${enc.badge.tone})` : null,
    "",
    "ASSESSMENT & PLAN",
    enc.summary.trim() || "(No clinician notes recorded.)",
  ].filter((line): line is string => line != null);

  if (enc.metrics?.length) {
    lines.push("", "OBJECTIVE / VITAL SIGNS / METRICS");
    for (const m of enc.metrics) {
      lines.push(`- ${m.label}: ${m.value}${m.alert ? " (alert)" : ""}`);
    }
  }

  if (enc.links?.length) {
    lines.push("", "RELATED REFERENCES");
    for (const link of enc.links) lines.push(`- ${link}`);
  }

  return lines.join("\n");
}

function formatManualLabText(lab: {
  testName: string;
  value: number;
  unit: string | null;
  flag: string | null;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  observedAt: Date;
}) {
  const ref =
    lab.refRangeLow != null || lab.refRangeHigh != null
      ? `Reference range: ${lab.refRangeLow ?? "—"} – ${lab.refRangeHigh ?? "—"}`
      : null;
  return [
    "LABORATORY RESULTS (manual chart entry)",
    `Observed at: ${lab.observedAt.toISOString()}`,
    `${lab.testName}: ${lab.value}${lab.unit ? ` ${lab.unit}` : ""}${
      lab.flag ? ` (${lab.flag})` : ""
    }`,
    ref,
    "Entry source: clinician manual entry on patient record.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function upsertChartDocument(params: {
  documentId: string;
  patientId: string;
  type: (typeof clinicalDocument.$inferInsert)["type"];
  filename: string;
  text: string;
  encounterDate: Date | null;
  providerName: string | null;
  specialty: string | null;
  metadata: Record<string, unknown>;
  extractMeds?: boolean;
}) {
  const db = createDb();
  const existing = await db
    .select({ id: clinicalDocument.id })
    .from(clinicalDocument)
    .where(eq(clinicalDocument.id, params.documentId))
    .limit(1);

  if (existing[0]) {
    await db.delete(documentChunk).where(eq(documentChunk.documentId, params.documentId));
    await db
      .delete(extractedMedication)
      .where(eq(extractedMedication.documentId, params.documentId));
    await db
      .update(clinicalDocument)
      .set({
        type: params.type,
        originalFilename: params.filename,
        extractedText: params.text,
        encounterDate: params.encounterDate,
        providerName: params.providerName,
        specialty: params.specialty,
        metadata: params.metadata,
        ingestionStatus: "embedding",
        ingestionError: null,
        pageCount: 1,
      })
      .where(eq(clinicalDocument.id, params.documentId));
  } else {
    await db.insert(clinicalDocument).values({
      id: params.documentId,
      patientId: params.patientId,
      patientFileId: null,
      type: params.type,
      specialty: params.specialty,
      encounterDate: params.encounterDate,
      providerName: params.providerName,
      originalFilename: params.filename,
      storageBucket: CHART_BUCKET,
      storagePath: `manual/${params.documentId}`,
      mimeType: "text/plain",
      pageCount: 1,
      extractedText: params.text,
      ingestionStatus: "embedding",
      metadata: params.metadata,
    });
  }

  if (params.extractMeds && params.text.trim().length > 40) {
    try {
      const meds = await extractMedications(params.text);
      if (meds.length) {
        await db.insert(extractedMedication).values(
          meds.map((med) => ({
            id: crypto.randomUUID(),
            documentId: params.documentId,
            patientId: params.patientId,
            name: med.name,
            dose: med.dose,
            route: med.route,
            frequency: med.frequency,
            status: med.status,
            startedAt: med.startedAt ? new Date(med.startedAt) : params.encounterDate,
            prescribingProvider: med.prescribingProvider ?? params.providerName,
          })),
        );
      }
    } catch (error) {
      console.error("[chart-ingest] medication extract failed", params.documentId, error);
    }
  }

  const chunks = chunkClinicalText(params.text, 1);
  const toEmbed =
    chunks.length > 0
      ? chunks
      : [
          {
            page: 1,
            charStart: 0,
            charEnd: params.text.length,
            section: "CHART_ENTRY",
            content: params.text,
          },
        ];

  const embeddings = await embedChunks(
    toEmbed.map((c) => ({
      content: c.content,
      title: `${params.filename}${c.section ? ` · ${c.section}` : ""}`,
    })),
  );

  await db.insert(documentChunk).values(
    toEmbed.map((c, i) => ({
      id: crypto.randomUUID(),
      documentId: params.documentId,
      patientId: params.patientId,
      page: c.page,
      charStart: c.charStart,
      charEnd: c.charEnd,
      section: c.section,
      content: c.content,
      embedding: embeddings[i]!,
    })),
  );

  await db
    .update(clinicalDocument)
    .set({ ingestionStatus: "ready", ingestionError: null })
    .where(eq(clinicalDocument.id, params.documentId));

  return { documentId: params.documentId };
}

export async function ingestChartEncounter(encounterId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(patientEncounter)
    .where(eq(patientEncounter.id, encounterId))
    .limit(1);
  const enc = rows[0];
  if (!enc) throw new Error("Encounter not found");

  const text = formatEncounterText({
    kind: enc.kind,
    occurredAt: enc.occurredAt,
    title: enc.title,
    facility: enc.facility,
    summary: enc.summary,
    badge: enc.badge,
    metrics: enc.metrics,
    links: enc.links,
    inbound: enc.inbound,
  });

  return upsertChartDocument({
    documentId: chartEncounterDocumentId(enc.id),
    patientId: enc.patientId,
    type: encounterDocType(enc.kind),
    filename: `Encounter · ${enc.title}`,
    text,
    encounterDate: enc.occurredAt,
    providerName: enc.facility,
    specialty: enc.kind,
    metadata: {
      source: "manual_encounter",
      encounterId: enc.id,
      kind: enc.kind,
    },
    extractMeds: Boolean(enc.summary.trim()),
  });
}

export async function removeChartEncounter(encounterId: string) {
  const db = createDb();
  await db
    .delete(clinicalDocument)
    .where(eq(clinicalDocument.id, chartEncounterDocumentId(encounterId)));
}

export async function ingestChartManualLab(labId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(extractedLab)
    .where(and(eq(extractedLab.id, labId), eq(extractedLab.entrySource, "manual")))
    .limit(1);
  const lab = rows[0];
  if (!lab) throw new Error("Manual lab not found");

  const text = formatManualLabText(lab);

  return upsertChartDocument({
    documentId: chartLabDocumentId(lab.id),
    patientId: lab.patientId,
    type: "lab_panel",
    filename: `Manual lab · ${lab.testName}`,
    text,
    encounterDate: lab.observedAt,
    providerName: null,
    specialty: "laboratory",
    metadata: {
      source: "manual_lab",
      labId: lab.id,
      testName: lab.testName,
    },
    extractMeds: false,
  });
}

export async function removeChartManualLab(labId: string) {
  const db = createDb();
  await db
    .delete(clinicalDocument)
    .where(eq(clinicalDocument.id, chartLabDocumentId(labId)));
}
