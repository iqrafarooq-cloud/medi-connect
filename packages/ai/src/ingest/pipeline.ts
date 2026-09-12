import { createDb } from "@medi-connect/db";
import {
  clinicalDocument,
  documentChunk,
  extractedAllergy,
  extractedLab,
  extractedMedication,
  homeMonitoringReading,
} from "@medi-connect/db/schema/clinical";
import { and, eq, ne } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { extractText } from "unpdf";

import { chunkClinicalText } from "../chunking";
import { embedChunks } from "../embedding";
import {
  extractAllergies,
  extractDocumentMeta,
  extractLabs,
  extractMedications,
} from "../extract";

async function setStatus(
  documentId: string,
  status: string,
  extra?: Partial<{
    ingestionError: string | null;
    extractedText: string;
    pageCount: number;
    type: typeof clinicalDocument.$inferInsert.type;
    specialty: string | null;
    encounterDate: Date | null;
    providerName: string | null;
    metadata: Record<string, unknown>;
  }>,
) {
  const db = createDb();
  await db
    .update(clinicalDocument)
    .set({
      ingestionStatus: status,
      ...(extra?.ingestionError !== undefined
        ? { ingestionError: extra.ingestionError }
        : {}),
      ...(extra?.extractedText !== undefined ? { extractedText: extra.extractedText } : {}),
      ...(extra?.pageCount !== undefined ? { pageCount: extra.pageCount } : {}),
      ...(extra?.type !== undefined ? { type: extra.type } : {}),
      ...(extra?.specialty !== undefined ? { specialty: extra.specialty } : {}),
      ...(extra?.encounterDate !== undefined ? { encounterDate: extra.encounterDate } : {}),
      ...(extra?.providerName !== undefined ? { providerName: extra.providerName } : {}),
      ...(extra?.metadata !== undefined ? { metadata: extra.metadata } : {}),
    })
    .where(eq(clinicalDocument.id, documentId));
}

function parseMaybeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function clearDerived(documentId: string) {
  const db = createDb();
  await db.delete(documentChunk).where(eq(documentChunk.documentId, documentId));
  await db.delete(extractedLab).where(eq(extractedLab.documentId, documentId));
  await db.delete(extractedMedication).where(eq(extractedMedication.documentId, documentId));
  await db
    .delete(extractedAllergy)
    .where(eq(extractedAllergy.sourceDocumentId, documentId));
  await db
    .delete(homeMonitoringReading)
    .where(eq(homeMonitoringReading.sourceDocumentId, documentId));
}

async function reconcileAllergyFlags(patientId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(extractedAllergy)
    .where(eq(extractedAllergy.patientId, patientId));

  const byKey = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.substance.trim().toLowerCase();
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  // Documents that mention allergies at all (any allergy row) vs patient docs —
  // flag missing allergy on a doc that has other allergies from same patient if conflict.
  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    const reactions = new Set(
      group.map((g) => (g.reaction ?? "").trim().toLowerCase()).filter(Boolean),
    );
    if (reactions.size > 1) {
      for (const row of group) {
        await db
          .update(extractedAllergy)
          .set({
            dataQualityFlag: "Reaction text differs across source documents",
          })
          .where(eq(extractedAllergy.id, row.id));
      }
    }
  }
}

async function ingestCsv(params: {
  documentId: string;
  patientId: string;
  buffer: Buffer;
  filename: string;
}) {
  const db = createDb();
  await setStatus(params.documentId, "parsing");
  const text = params.buffer.toString("utf8");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  await setStatus(params.documentId, "extracting", {
    extractedText: text,
    pageCount: 1,
    type: "home_monitoring_log",
    specialty: "Home Monitoring",
    encounterDate: parseMaybeDate(records[0]?.Date) ?? new Date("2026-08-15"),
    providerName: "Patient-reported",
    metadata: { rowCount: records.length, source: "csv" },
  });

  const readingRows = records
    .map((row) => {
      const date = row.Date ?? row.date;
      const tod = row.Time_of_Day ?? row.time_of_day ?? "";
      const value = Number(row.Glucose_mg_dL ?? row.glucose_mg_dl);
      if (!date || Number.isNaN(value)) return null;
      const context = /fasting/i.test(tod)
        ? "fasting"
        : /post/i.test(tod)
          ? "post_prandial"
          : tod || null;
      const measuredAt = new Date(`${date}T12:00:00Z`);
      return {
        id: crypto.randomUUID(),
        patientId: params.patientId,
        sourceDocumentId: params.documentId,
        metric: "glucose_mg_dl",
        value,
        context,
        measuredAt,
        medicationTaken: row.Medication_Taken ?? row.medication_taken ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (readingRows.length) {
    await db.insert(homeMonitoringReading).values(readingRows);
  }

  const values = readingRows.map((r) => r.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const summary = `Home glucose log ${params.filename}: ${readingRows.length} readings ranging ${min}–${max} mg/dL (fasting and post-prandial).`;

  await setStatus(params.documentId, "embedding");
  const chunks = chunkClinicalText(summary, 1);
  const embeddings = await embedChunks(
    chunks.map((c) => ({
      content: c.content,
      title: params.filename,
    })),
  );
  if (chunks.length) {
    await db.insert(documentChunk).values(
      chunks.map((c, i) => ({
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
  }

  await setStatus(params.documentId, "ready", { ingestionError: null });
}

async function ingestPdf(params: {
  documentId: string;
  patientId: string;
  buffer: Buffer;
  filename: string;
}) {
  const db = createDb();
  await setStatus(params.documentId, "parsing");

  const pdfData = new Uint8Array(params.buffer);
  const { text: pageTexts, totalPages } = await extractText(pdfData, { mergePages: false });
  const pages = Array.isArray(pageTexts) ? pageTexts : [String(pageTexts ?? "")];
  const fullText = pages.join("\n\n");

  if (!fullText.trim()) {
    throw new Error("No text layer found in PDF (OCR not enabled for MVP)");
  }

  await setStatus(params.documentId, "extracting", {
    extractedText: fullText,
    pageCount: totalPages ?? pages.length,
  });

  const meta = await extractDocumentMeta(fullText, params.filename);
  await setStatus(params.documentId, "extracting", {
    type: meta.type,
    specialty: meta.specialty,
    encounterDate: parseMaybeDate(meta.encounterDate),
    providerName: meta.providerName,
    pageCount: meta.pageCount ?? totalPages ?? pages.length,
    metadata: { extractedVia: "vertex-generateObject" },
  });

  const [labs, meds, allergies] = await Promise.all([
    extractLabs(fullText),
    extractMedications(fullText),
    extractAllergies(fullText),
  ]);

  const observedFallback =
    parseMaybeDate(meta.encounterDate) ?? new Date();

  if (labs.length) {
    await db.insert(extractedLab).values(
      labs.map((lab) => ({
        id: crypto.randomUUID(),
        documentId: params.documentId,
        patientId: params.patientId,
        testName: lab.testName,
        value: lab.value,
        unit: lab.unit,
        refRangeLow: lab.refRangeLow,
        refRangeHigh: lab.refRangeHigh,
        flag: lab.flag,
        observedAt: parseMaybeDate(lab.observedAt) ?? observedFallback,
      })),
    );
  }

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
        startedAt: parseMaybeDate(med.startedAt),
        prescribingProvider: med.prescribingProvider ?? meta.providerName,
      })),
    );
  }

  if (allergies.length) {
    await db.insert(extractedAllergy).values(
      allergies.map((a) => ({
        id: crypto.randomUUID(),
        patientId: params.patientId,
        substance: a.substance,
        reaction: a.reaction,
        severity: a.severity,
        sourceDocumentId: params.documentId,
      })),
    );
    await reconcileAllergyFlags(params.patientId);
  }

  await setStatus(params.documentId, "embedding");
  const chunks: ReturnType<typeof chunkClinicalText> = [];
  let runningOffset = 0;
  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i] ?? "";
    const pageChunks = chunkClinicalText(pageText, i + 1).map((c) => ({
      ...c,
      charStart: c.charStart + runningOffset,
      charEnd: c.charEnd + runningOffset,
    }));
    chunks.push(...pageChunks);
    runningOffset += pageText.length + 2;
  }

  // Fallback if section headers didn't match
  if (!chunks.length) {
    chunks.push(...chunkClinicalText(fullText, 1));
  }

  const embeddings = await embedChunks(
    chunks.map((c) => ({
      content: c.content,
      title: `${params.filename}${c.section ? ` · ${c.section}` : ""}`,
    })),
  );
  await db.insert(documentChunk).values(
    chunks.map((c, i) => ({
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

  await setStatus(params.documentId, "ready", { ingestionError: null });

  // Mark allergies present on other docs but missing here (if this doc had allergy header pattern)
  if (/allerg/i.test(fullText) && allergies.length === 0) {
    const other = await db
      .select()
      .from(extractedAllergy)
      .where(
        and(
          eq(extractedAllergy.patientId, params.patientId),
          ne(extractedAllergy.sourceDocumentId, params.documentId),
        ),
      );
    if (other.length) {
      // soft flag on existing rows
      for (const row of other) {
        await db
          .update(extractedAllergy)
          .set({
            dataQualityFlag:
              row.dataQualityFlag ??
              "Allergy listed on other documents but absent from at least one note header",
          })
          .where(eq(extractedAllergy.id, row.id));
      }
    }
  }
}

export async function ingestDocumentFromBuffer(params: {
  documentId: string;
  patientId: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
}) {
  try {
    await clearDerived(params.documentId);
    const isCsv =
      params.mimeType.includes("csv") ||
      params.filename.toLowerCase().endsWith(".csv");

    if (isCsv) {
      await ingestCsv(params);
    } else if (params.mimeType.includes("pdf") || params.filename.toLowerCase().endsWith(".pdf")) {
      await ingestPdf(params);
    } else {
      throw new Error(`Unsupported mime type for ingestion: ${params.mimeType}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    await setStatus(params.documentId, "failed", { ingestionError: message });
    throw error;
  }
}

export async function ingestDocumentById(
  documentId: string,
  fetchBytes: (bucket: string, path: string) => Promise<Buffer>,
) {
  const db = createDb();
  const rows = await db
    .select()
    .from(clinicalDocument)
    .where(eq(clinicalDocument.id, documentId))
    .limit(1);
  const doc = rows[0];
  if (!doc) throw new Error("Document not found");

  const buffer = await fetchBytes(doc.storageBucket, doc.storagePath);
  await ingestDocumentFromBuffer({
    documentId: doc.id,
    patientId: doc.patientId,
    buffer,
    mimeType: doc.mimeType,
    filename: doc.originalFilename,
  });
}
