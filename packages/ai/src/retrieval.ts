import { createDb } from "@medi-connect/db";
import {
  clinicalDocument,
  documentChunk,
  extractedAllergy,
  extractedLab,
  extractedMedication,
  homeMonitoringReading,
  noteInsertion,
} from "@medi-connect/db/schema/clinical";
import { and, asc, cosineDistance, desc, eq, gte, sql } from "drizzle-orm";

import { checkAgainstAllergyList } from "./allergy-check";
import { embedQuery } from "./embedding";

export async function findRelevantChunks(patientId: string, query: string, limit = 8) {
  const db = createDb();
  const queryEmbedding = await embedQuery(query);
  const similarity = sql<number>`1 - (${cosineDistance(documentChunk.embedding, queryEmbedding)})`;

  const rows = await db
    .select({
      chunkId: documentChunk.id,
      documentId: documentChunk.documentId,
      page: documentChunk.page,
      charStart: documentChunk.charStart,
      charEnd: documentChunk.charEnd,
      section: documentChunk.section,
      content: documentChunk.content,
      similarity,
      originalFilename: clinicalDocument.originalFilename,
      specialty: clinicalDocument.specialty,
      encounterDate: clinicalDocument.encounterDate,
      providerName: clinicalDocument.providerName,
      type: clinicalDocument.type,
    })
    .from(documentChunk)
    .innerJoin(clinicalDocument, eq(documentChunk.documentId, clinicalDocument.id))
    .where(eq(documentChunk.patientId, patientId))
    .orderBy(sql`${cosineDistance(documentChunk.embedding, queryEmbedding)}`)
    .limit(limit);

  return rows.map((r, i) => ({
    citationIndex: i + 1,
    documentId: r.documentId,
    documentLabel: r.originalFilename,
    specialty: r.specialty,
    encounterDate: r.encounterDate,
    providerName: r.providerName,
    type: r.type,
    page: r.page,
    charStart: r.charStart,
    charEnd: r.charEnd,
    section: r.section,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

export async function queryExtractedLabs(
  patientId: string,
  testName: string,
  sinceDate?: string,
) {
  const db = createDb();
  const normalized = testName.trim().toLowerCase();
  const conditions = [
    eq(extractedLab.patientId, patientId),
    sql`lower(${extractedLab.testName}) like ${`%${normalized}%`}`,
  ];
  if (sinceDate) {
    conditions.push(gte(extractedLab.observedAt, new Date(sinceDate)));
  }

  const rows = await db
    .select({
      id: extractedLab.id,
      documentId: extractedLab.documentId,
      testName: extractedLab.testName,
      value: extractedLab.value,
      unit: extractedLab.unit,
      refRangeLow: extractedLab.refRangeLow,
      refRangeHigh: extractedLab.refRangeHigh,
      flag: extractedLab.flag,
      observedAt: extractedLab.observedAt,
      originalFilename: clinicalDocument.originalFilename,
    })
    .from(extractedLab)
    .innerJoin(clinicalDocument, eq(extractedLab.documentId, clinicalDocument.id))
    .where(and(...conditions))
    .orderBy(asc(extractedLab.observedAt));

  return rows.map((r, i) => ({
    citationIndex: i + 1,
    ...r,
  }));
}

export async function queryActiveMedications(patientId: string) {
  const db = createDb();
  return db
    .select({
      id: extractedMedication.id,
      documentId: extractedMedication.documentId,
      name: extractedMedication.name,
      dose: extractedMedication.dose,
      route: extractedMedication.route,
      frequency: extractedMedication.frequency,
      status: extractedMedication.status,
      startedAt: extractedMedication.startedAt,
      prescribingProvider: extractedMedication.prescribingProvider,
      originalFilename: clinicalDocument.originalFilename,
    })
    .from(extractedMedication)
    .innerJoin(clinicalDocument, eq(extractedMedication.documentId, clinicalDocument.id))
    .where(
      and(eq(extractedMedication.patientId, patientId), eq(extractedMedication.status, "active")),
    )
    .orderBy(desc(extractedMedication.startedAt));
}

/** Reconcile allergies across documents; surface conflicts as data-quality flags. */
export async function queryReconciledAllergies(patientId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(extractedAllergy)
    .where(eq(extractedAllergy.patientId, patientId));

  const bySubstance = new Map<
    string,
    {
      substance: string;
      reaction: string | null;
      severity: string | null;
      sourceDocumentIds: string[];
      dataQualityFlags: string[];
    }
  >();

  for (const row of rows) {
    const key = row.substance.trim().toLowerCase();
    const existing = bySubstance.get(key);
    if (!existing) {
      bySubstance.set(key, {
        substance: row.substance,
        reaction: row.reaction,
        severity: row.severity,
        sourceDocumentIds: [row.sourceDocumentId],
        dataQualityFlags: row.dataQualityFlag ? [row.dataQualityFlag] : [],
      });
      continue;
    }
    if (!existing.sourceDocumentIds.includes(row.sourceDocumentId)) {
      existing.sourceDocumentIds.push(row.sourceDocumentId);
    }
    if (row.reaction && existing.reaction && row.reaction !== existing.reaction) {
      existing.dataQualityFlags.push(
        `Reaction mismatch across documents: "${existing.reaction}" vs "${row.reaction}"`,
      );
    }
    if (row.reaction && !existing.reaction) existing.reaction = row.reaction;
  }

  return [...bySubstance.values()];
}

export async function runAllergyConflictCheck(patientId: string, medicationName: string) {
  const allergies = await queryReconciledAllergies(patientId);
  return checkAgainstAllergyList(
    medicationName,
    allergies.map((a) => ({
      substance: a.substance,
      reaction: a.reaction,
      severity: a.severity,
    })),
  );
}

export async function queryHomeGlucose(patientId: string) {
  const db = createDb();
  return db
    .select()
    .from(homeMonitoringReading)
    .where(
      and(
        eq(homeMonitoringReading.patientId, patientId),
        eq(homeMonitoringReading.metric, "glucose_mg_dl"),
      ),
    )
    .orderBy(asc(homeMonitoringReading.measuredAt));
}

export async function recordNoteInsertion(input: {
  messageId: string;
  patientId: string;
  clinicianId: string;
  proposedText: string;
  citationDocumentIds: string[];
  status: "accepted" | "flagged" | "pending";
  flagReason?: string;
}) {
  const db = createDb();
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(noteInsertion)
    .values({
      id,
      messageId: input.messageId,
      patientId: input.patientId,
      clinicianId: input.clinicianId,
      proposedText: input.proposedText,
      citationDocumentIds: input.citationDocumentIds,
      status: input.status,
      flagReason: input.flagReason ?? null,
      decidedAt: input.status === "pending" ? null : new Date(),
    })
    .returning();
  return row;
}

export async function listReadyDocuments(patientId: string) {
  const db = createDb();
  return db
    .select()
    .from(clinicalDocument)
    .where(eq(clinicalDocument.patientId, patientId))
    .orderBy(desc(clinicalDocument.encounterDate), desc(clinicalDocument.createdAt));
}

export async function getDocumentForViewer(documentId: string, patientId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(clinicalDocument)
    .where(
      and(eq(clinicalDocument.id, documentId), eq(clinicalDocument.patientId, patientId)),
    )
    .limit(1);
  return rows[0] ?? null;
}
