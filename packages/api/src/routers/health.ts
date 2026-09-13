import { generateRemedySuggestions } from "@medi-connect/ai";
import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import {
  clinicalDocument,
  diagnosis,
  extractedAllergy,
  extractedLab,
  extractedMedication,
  patientHealthMutation,
  procedure,
} from "@medi-connect/db/schema/clinical";
import { patientEncounter, patientFile, patientRemedyCheck } from "@medi-connect/db/schema/patient";
import { triageCase } from "@medi-connect/db/schema/triage";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { logAccess } from "../lib/audit";
import { CLINIC_STATUS } from "../lib/clinic-verification";
import {
  addAllergyInput,
  addConditionInput,
  addMedicationInput,
  addSurgeryInput,
  assembleHealthSummary,
  documentCategoryFromType,
  medicationDbStatus,
  parseIsoDate,
  sourceLabel,
  type AllergyRow,
  type AllergyType,
  type DetailKind,
  type DiagnosisRow,
  type DocumentRow,
  type HealthSource,
  type LabRow,
  type MedicationRow,
  type ProcedureRow,
} from "../lib/health-facts";
import { assemblePatientActivity } from "../lib/patient-activity";
import { requireSessionPatient } from "../lib/require-patient";
import { createSignedUrl } from "../lib/supabase";
import {
  assembleRemedyHub,
  classifyRemedySeverity,
  defaultRemedySuggestions,
  rankNearbyClinics,
  REMEDY_DISCLAIMER,
  remedyCheckInput,
  resolveRemedySeverity,
  sanitizeRemedySuggestions,
  summaryForSeverity,
  type NearbyClinic,
  type RemedyLastCheck,
  type RemedySeverity,
  type RemedySuggestion,
} from "../lib/health-remedy";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

function asSource(value: string | null | undefined): HealthSource {
  if (value === "patient" || value === "clinic") return value;
  return "extracted";
}

function asAllergyType(value: string | null | undefined): AllergyType {
  if (value === "food" || value === "other") return value;
  return "medication";
}

function asMedStatus(value: string | null | undefined): MedicationRow["status"] {
  if (value === "discontinued" || value === "changed") return value;
  return "active";
}

function resolveSource(source: string, clinicId: string | null | undefined): HealthSource {
  if (source === "patient") return "patient";
  if (clinicId) return "clinic";
  return asSource(source);
}

function asUploadCategory(value: string | null | undefined, type: string): DocumentRow["category"] {
  return documentCategoryFromType(type, value);
}

async function loadSummary(patientId: string) {
  const db = createDb();
  const [diagnoses, allergies, medications, procedures, documents, files, labs] = await Promise.all([
    db.select().from(diagnosis).where(eq(diagnosis.patientId, patientId)).orderBy(desc(diagnosis.createdAt)),
    db
      .select()
      .from(extractedAllergy)
      .where(eq(extractedAllergy.patientId, patientId))
      .orderBy(desc(extractedAllergy.createdAt)),
    db
      .select()
      .from(extractedMedication)
      .where(eq(extractedMedication.patientId, patientId))
      .orderBy(desc(extractedMedication.createdAt)),
    db.select().from(procedure).where(eq(procedure.patientId, patientId)).orderBy(desc(procedure.createdAt)),
    db
      .select()
      .from(clinicalDocument)
      .where(eq(clinicalDocument.patientId, patientId))
      .orderBy(desc(clinicalDocument.createdAt)),
    db.select().from(patientFile).where(eq(patientFile.patientId, patientId)),
    db.select().from(extractedLab).where(eq(extractedLab.patientId, patientId)),
  ]);

  const fileById = new Map(files.map((file) => [file.id, file]));
  const fileByPath = new Map(files.map((file) => [`${file.bucket}:${file.storagePath}`, file]));

  function clinicIdForDocument(doc: (typeof documents)[number]) {
    const byId = doc.patientFileId ? fileById.get(doc.patientFileId) : undefined;
    if (byId) return byId.uploadedByClinicId;
    return fileByPath.get(`${doc.storageBucket}:${doc.storagePath}`)?.uploadedByClinicId ?? null;
  }

  const diagnosisRows: DiagnosisRow[] = diagnoses.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status === "previous" ? "previous" : "current",
    diagnosedAt: row.diagnosedAt,
    notes: row.notes,
    source: asSource(row.source),
    sourceDocumentId: row.sourceDocumentId,
    createdAt: row.createdAt,
  }));

  const allergyRows: AllergyRow[] = allergies.map((row) => {
    const doc = documents.find((item) => item.id === row.sourceDocumentId);
    return {
      id: row.id,
      substance: row.substance,
      allergyType: asAllergyType(row.allergyType),
      reaction: row.reaction,
      severity: row.severity,
      source: resolveSource(row.source, doc ? clinicIdForDocument(doc) : null),
      sourceDocumentId: row.sourceDocumentId,
      createdAt: row.createdAt,
    };
  });

  const medicationRows: MedicationRow[] = medications.map((row) => {
    const doc = documents.find((item) => item.id === row.documentId);
    return {
      id: row.id,
      name: row.name,
      dose: row.dose,
      frequency: row.frequency,
      status: asMedStatus(row.status),
      startedAt: row.startedAt,
      source: resolveSource(row.source, doc ? clinicIdForDocument(doc) : null),
      documentId: row.documentId,
      createdAt: row.createdAt,
    };
  });

  const procedureRows: ProcedureRow[] = procedures.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status === "current" ? "current" : "previous",
    performedAt: row.performedAt,
    facility: row.facility,
    notes: row.notes,
    source: asSource(row.source),
    sourceDocumentId: row.sourceDocumentId,
    createdAt: row.createdAt,
  }));

  const documentRows: DocumentRow[] = documents.map((row) => {
    const file = row.patientFileId ? fileById.get(row.patientFileId) : undefined;
    return {
      id: row.id,
      originalFilename: row.originalFilename,
      category: asUploadCategory(file?.category, row.type),
      type: row.type,
      ingestionStatus: row.ingestionStatus,
      encounterDate: row.encounterDate,
      createdAt: row.createdAt,
      uploadedByClinicId: file?.uploadedByClinicId ?? clinicIdForDocument(row),
    };
  });

  const labRows: LabRow[] = labs.map((row) => ({
    id: row.id,
    testName: row.testName,
    value: row.value,
    unit: row.unit,
    observedAt: row.observedAt,
    documentId: row.documentId,
  }));

  return assembleHealthSummary({
    diagnoses: diagnosisRows,
    allergies: allergyRows,
    medications: medicationRows,
    procedures: procedureRows,
    documents: documentRows,
    labs: labRows,
  });
}

async function loadActivity(patient: {
  id: string;
  createdAt: Date;
  createdByClinicId: string | null;
}) {
  const db = createDb();
  const [
    diagnoses,
    allergies,
    medications,
    procedures,
    documents,
    files,
    remedyChecks,
    triageCases,
    encounters,
    createdClinicRows,
  ] = await Promise.all([
    db
      .select({
        id: diagnosis.id,
        name: diagnosis.name,
        source: diagnosis.source,
        createdAt: diagnosis.createdAt,
      })
      .from(diagnosis)
      .where(eq(diagnosis.patientId, patient.id)),
    db
      .select({
        id: extractedAllergy.id,
        substance: extractedAllergy.substance,
        source: extractedAllergy.source,
        createdAt: extractedAllergy.createdAt,
      })
      .from(extractedAllergy)
      .where(eq(extractedAllergy.patientId, patient.id)),
    db
      .select({
        id: extractedMedication.id,
        name: extractedMedication.name,
        source: extractedMedication.source,
        createdAt: extractedMedication.createdAt,
      })
      .from(extractedMedication)
      .where(eq(extractedMedication.patientId, patient.id)),
    db
      .select({
        id: procedure.id,
        name: procedure.name,
        facility: procedure.facility,
        source: procedure.source,
        createdAt: procedure.createdAt,
      })
      .from(procedure)
      .where(eq(procedure.patientId, patient.id)),
    db
      .select({
        id: clinicalDocument.id,
        originalFilename: clinicalDocument.originalFilename,
        createdAt: clinicalDocument.createdAt,
        patientFileId: clinicalDocument.patientFileId,
        storageBucket: clinicalDocument.storageBucket,
        storagePath: clinicalDocument.storagePath,
      })
      .from(clinicalDocument)
      .where(eq(clinicalDocument.patientId, patient.id)),
    db
      .select({
        id: patientFile.id,
        uploadedByClinicId: patientFile.uploadedByClinicId,
        bucket: patientFile.bucket,
        storagePath: patientFile.storagePath,
      })
      .from(patientFile)
      .where(eq(patientFile.patientId, patient.id)),
    db
      .select({
        id: patientRemedyCheck.id,
        severity: patientRemedyCheck.severity,
        summary: patientRemedyCheck.summary,
        createdAt: patientRemedyCheck.createdAt,
      })
      .from(patientRemedyCheck)
      .where(eq(patientRemedyCheck.patientId, patient.id))
      .orderBy(desc(patientRemedyCheck.createdAt)),
    db
      .select({
        id: triageCase.id,
        clinicId: triageCase.clinicId,
        status: triageCase.status,
        complaint: triageCase.complaint,
        createdAt: triageCase.createdAt,
      })
      .from(triageCase)
      .where(eq(triageCase.patientId, patient.id)),
    db
      .select({
        id: patientEncounter.id,
        clinicId: patientEncounter.clinicId,
        facility: patientEncounter.facility,
        title: patientEncounter.title,
        occurredAt: patientEncounter.occurredAt,
      })
      .from(patientEncounter)
      .where(eq(patientEncounter.patientId, patient.id)),
    patient.createdByClinicId
      ? db
          .select({
            id: clinic.id,
            name: clinic.name,
            type: clinic.type,
            city: clinic.city,
          })
          .from(clinic)
          .where(eq(clinic.id, patient.createdByClinicId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const fileById = new Map(files.map((file) => [file.id, file]));
  const fileByPath = new Map(files.map((file) => [`${file.bucket}:${file.storagePath}`, file]));

  const mappedDocuments = documents.map((doc) => {
    const byId = doc.patientFileId ? fileById.get(doc.patientFileId) : undefined;
    const byPath = fileByPath.get(`${doc.storageBucket}:${doc.storagePath}`);
    return {
      id: doc.id,
      originalFilename: doc.originalFilename,
      createdAt: doc.createdAt,
      uploadedByClinicId: byId?.uploadedByClinicId ?? byPath?.uploadedByClinicId ?? null,
    };
  });

  const clinicIds = new Set<string>();
  if (patient.createdByClinicId) clinicIds.add(patient.createdByClinicId);
  for (const row of mappedDocuments) {
    if (row.uploadedByClinicId) clinicIds.add(row.uploadedByClinicId);
  }
  for (const row of triageCases) clinicIds.add(row.clinicId);
  for (const row of encounters) {
    if (row.clinicId) clinicIds.add(row.clinicId);
  }

  const extraIds = [...clinicIds].filter((id) => id !== createdClinicRows[0]?.id);
  const extraClinics =
    extraIds.length > 0
      ? await db
          .select({
            id: clinic.id,
            name: clinic.name,
            type: clinic.type,
            city: clinic.city,
          })
          .from(clinic)
          .where(inArray(clinic.id, extraIds))
      : [];

  const clinics = [...createdClinicRows, ...extraClinics];
  const createdByClinic = createdClinicRows[0] ?? null;

  return assemblePatientActivity({
    registeredAt: patient.createdAt,
    createdByClinic,
    diagnoses,
    allergies,
    medications,
    procedures,
    documents: mappedDocuments,
    remedyChecks,
    triageCases,
    encounters,
    clinics,
  });
}

async function findMutation(patientId: string, idempotencyKey: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(patientHealthMutation)
    .where(
      and(
        eq(patientHealthMutation.patientId, patientId),
        eq(patientHealthMutation.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function recordMutation(params: {
  patientId: string;
  idempotencyKey: string;
  kind: string;
  resourceId: string;
}) {
  const db = createDb();
  try {
    await db.insert(patientHealthMutation).values({
      id: crypto.randomUUID(),
      patientId: params.patientId,
      idempotencyKey: params.idempotencyKey,
      kind: params.kind,
      resourceId: params.resourceId,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

async function documentPayload(documentId: string, patientId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(clinicalDocument)
    .where(and(eq(clinicalDocument.id, documentId), eq(clinicalDocument.patientId, patientId)))
    .limit(1);
  const doc = rows[0];
  if (!doc) return null;
  const files = doc.patientFileId
    ? await db.select().from(patientFile).where(eq(patientFile.id, doc.patientFileId)).limit(1)
    : [];
  const file = files[0];
  const signedUrl = await createSignedUrl(doc.storageBucket, doc.storagePath);
  return {
    id: doc.id,
    title: doc.originalFilename,
    date: (doc.encounterDate ?? doc.createdAt).toISOString(),
    recordType: asUploadCategory(file?.category, doc.type),
    source: file?.uploadedByClinicId ? "clinic" : "extracted",
    sourceLabel: sourceLabel(file?.uploadedByClinicId ? "clinic" : "extracted"),
    notes:
      doc.metadata && typeof doc.metadata === "object" && "notes" in doc.metadata
        ? String((doc.metadata as { notes?: unknown }).notes ?? "")
        : null,
    relatedTitle: null as string | null,
    fileName: doc.originalFilename,
    mimeType: doc.mimeType,
    signedUrl,
    ingestionStatus: doc.ingestionStatus,
  };
}

const relatedDocumentId = z.string().uuid().optional();

function asRemedySeverity(value: string): RemedySeverity {
  if (value === "watch" || value === "severe") return value;
  return "self_care";
}

function asRemedySuggestions(value: unknown): RemedySuggestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { kind?: unknown; title?: unknown; detail?: unknown };
    if (row.kind !== "rest" && row.kind !== "movement" && row.kind !== "hydration" && row.kind !== "nutrition" && row.kind !== "sleep") {
      return [];
    }
    if (typeof row.title !== "string" || typeof row.detail !== "string") return [];
    return [{ kind: row.kind, title: row.title, detail: row.detail }];
  });
}

async function loadNearbyClinics(origin?: { latitude: number; longitude: number }): Promise<NearbyClinic[]> {
  const db = createDb();
  const rows = await db.select().from(clinic).where(eq(clinic.status, CLINIC_STATUS.ACTIVE));
  return rankNearbyClinics(rows, origin);
}

async function loadLatestRemedy(patientId: string): Promise<RemedyLastCheck | null> {
  const db = createDb();
  const rows = await db
    .select()
    .from(patientRemedyCheck)
    .where(eq(patientRemedyCheck.patientId, patientId))
    .orderBy(desc(patientRemedyCheck.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    severity: asRemedySeverity(row.severity),
    summary: row.summary,
    suggestions: asRemedySuggestions(row.suggestions),
    createdAt: row.createdAt.toISOString(),
  };
}

export const healthRouter = {
  summary: protectedProcedure.handler(async ({ context }) => {
    const profile = await requireSessionPatient(context.session.user.id);
    const summary = await loadSummary(profile.id);
    await logAccess({
      actorUserId: context.session.user.id,
      action: "health.summary",
      resourceType: "patient",
      resourceId: profile.id,
      patientId: profile.id,
      outcome: "allowed",
    });
    return summary;
  }),

  activity: protectedProcedure.handler(async ({ context }) => {
    const profile = await requireSessionPatient(context.session.user.id);
    const activity = await loadActivity({
      id: profile.id,
      createdAt: profile.createdAt,
      createdByClinicId: profile.createdByClinicId,
    });
    await logAccess({
      actorUserId: context.session.user.id,
      action: "health.activity",
      resourceType: "patient",
      resourceId: profile.id,
      patientId: profile.id,
      outcome: "allowed",
    });
    return activity;
  }),

  getDetail: protectedProcedure
    .input(
      z.object({
        kind: z.enum(["condition", "allergy", "medication", "surgery", "document"]),
        id: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const db = createDb();
      const kind = input.kind as DetailKind;

      if (kind === "document") {
        const payload = await documentPayload(input.id, profile.id);
        if (!payload) throw new ORPCError("NOT_FOUND", { message: "Record not found" });
        return payload;
      }

      if (kind === "condition") {
        const rows = await db
          .select()
          .from(diagnosis)
          .where(and(eq(diagnosis.id, input.id), eq(diagnosis.patientId, profile.id)))
          .limit(1);
        const row = rows[0];
        if (!row) throw new ORPCError("NOT_FOUND", { message: "Record not found" });
        const doc = row.sourceDocumentId ? await documentPayload(row.sourceDocumentId, profile.id) : null;
        return {
          id: row.id,
          title: row.name,
          date: (row.diagnosedAt ?? row.createdAt).toISOString(),
          recordType: "condition",
          source: asSource(row.source),
          sourceLabel: sourceLabel(asSource(row.source)),
          notes: row.notes,
          relatedTitle: null,
          fileName: doc?.fileName ?? null,
          mimeType: doc?.mimeType ?? null,
          signedUrl: doc?.signedUrl ?? null,
          ingestionStatus: doc?.ingestionStatus ?? null,
        };
      }

      if (kind === "allergy") {
        const rows = await db
          .select()
          .from(extractedAllergy)
          .where(and(eq(extractedAllergy.id, input.id), eq(extractedAllergy.patientId, profile.id)))
          .limit(1);
        const row = rows[0];
        if (!row) throw new ORPCError("NOT_FOUND", { message: "Record not found" });
        const doc = row.sourceDocumentId ? await documentPayload(row.sourceDocumentId, profile.id) : null;
        const source = resolveSource(row.source, doc?.source === "clinic" ? "clinic" : null);
        return {
          id: row.id,
          title: row.substance,
          date: row.createdAt.toISOString(),
          recordType: asAllergyType(row.allergyType),
          source,
          sourceLabel: sourceLabel(source),
          notes: [row.severity, row.reaction].filter(Boolean).join(" · ") || null,
          relatedTitle: doc?.title ?? null,
          fileName: doc?.fileName ?? null,
          mimeType: doc?.mimeType ?? null,
          signedUrl: doc?.signedUrl ?? null,
          ingestionStatus: doc?.ingestionStatus ?? null,
        };
      }

      if (kind === "medication") {
        const rows = await db
          .select()
          .from(extractedMedication)
          .where(and(eq(extractedMedication.id, input.id), eq(extractedMedication.patientId, profile.id)))
          .limit(1);
        const row = rows[0];
        if (!row) throw new ORPCError("NOT_FOUND", { message: "Record not found" });
        const doc = row.documentId ? await documentPayload(row.documentId, profile.id) : null;
        const source = resolveSource(row.source, doc?.source === "clinic" ? "clinic" : null);
        return {
          id: row.id,
          title: row.name,
          date: (row.startedAt ?? row.createdAt).toISOString(),
          recordType: "medication",
          source,
          sourceLabel: sourceLabel(source),
          notes: [row.dose, row.frequency].filter(Boolean).join(" · ") || null,
          relatedTitle: doc?.title ?? null,
          fileName: doc?.fileName ?? null,
          mimeType: doc?.mimeType ?? null,
          signedUrl: doc?.signedUrl ?? null,
          ingestionStatus: doc?.ingestionStatus ?? null,
        };
      }

      const rows = await db
        .select()
        .from(procedure)
        .where(and(eq(procedure.id, input.id), eq(procedure.patientId, profile.id)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Record not found" });
      const doc = row.sourceDocumentId ? await documentPayload(row.sourceDocumentId, profile.id) : null;
      return {
        id: row.id,
        title: row.name,
        date: (row.performedAt ?? row.createdAt).toISOString(),
        recordType: "surgery",
        source: asSource(row.source),
        sourceLabel: sourceLabel(asSource(row.source)),
        notes: [row.facility, row.notes].filter(Boolean).join(" · ") || null,
        relatedTitle: doc?.title ?? null,
        fileName: doc?.fileName ?? null,
        mimeType: doc?.mimeType ?? null,
        signedUrl: doc?.signedUrl ?? null,
        ingestionStatus: doc?.ingestionStatus ?? null,
      };
    }),

  addCondition: protectedProcedure
    .input(addConditionInput.extend({ sourceDocumentId: relatedDocumentId }))
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const existing = await findMutation(profile.id, input.idempotencyKey);
      if (existing) {
        return { id: existing.resourceId, replayed: true as const };
      }
      const db = createDb();
      const id = crypto.randomUUID();
      try {
        await db.insert(diagnosis).values({
          id,
          patientId: profile.id,
          name: input.name,
          status: input.status,
          diagnosedAt: parseIsoDate(input.diagnosedAt),
          notes: input.notes ?? null,
          source: "patient",
          sourceDocumentId: input.sourceDocumentId ?? null,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const replay = await findMutation(profile.id, input.idempotencyKey);
        if (replay) return { id: replay.resourceId, replayed: true as const };
        throw error;
      }
      await recordMutation({
        patientId: profile.id,
        idempotencyKey: input.idempotencyKey,
        kind: "condition",
        resourceId: id,
      });
      return { id, replayed: false as const };
    }),

  addAllergy: protectedProcedure
    .input(addAllergyInput.extend({ sourceDocumentId: relatedDocumentId }))
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const existing = await findMutation(profile.id, input.idempotencyKey);
      if (existing) {
        return { id: existing.resourceId, replayed: true as const };
      }
      const db = createDb();
      const id = crypto.randomUUID();
      try {
        await db.insert(extractedAllergy).values({
          id,
          patientId: profile.id,
          substance: input.substance,
          allergyType: input.allergyType,
          severity: input.severity,
          reaction: input.reaction ?? null,
          source: "patient",
          sourceDocumentId: input.sourceDocumentId ?? null,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const replay = await findMutation(profile.id, input.idempotencyKey);
        if (replay) return { id: replay.resourceId, replayed: true as const };
        throw error;
      }
      await recordMutation({
        patientId: profile.id,
        idempotencyKey: input.idempotencyKey,
        kind: "allergy",
        resourceId: id,
      });
      return { id, replayed: false as const };
    }),

  addMedication: protectedProcedure
    .input(addMedicationInput.extend({ sourceDocumentId: relatedDocumentId }))
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const existing = await findMutation(profile.id, input.idempotencyKey);
      if (existing) {
        return { id: existing.resourceId, replayed: true as const };
      }
      const db = createDb();
      const id = crypto.randomUUID();
      try {
        await db.insert(extractedMedication).values({
          id,
          patientId: profile.id,
          documentId: input.sourceDocumentId ?? null,
          name: input.name,
          dose: input.dose ?? null,
          frequency: input.frequency ?? null,
          status: medicationDbStatus(input.status),
          startedAt: parseIsoDate(input.startedAt),
          source: "patient",
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const replay = await findMutation(profile.id, input.idempotencyKey);
        if (replay) return { id: replay.resourceId, replayed: true as const };
        throw error;
      }
      await recordMutation({
        patientId: profile.id,
        idempotencyKey: input.idempotencyKey,
        kind: "medication",
        resourceId: id,
      });
      return { id, replayed: false as const };
    }),

  addSurgery: protectedProcedure
    .input(addSurgeryInput.extend({ sourceDocumentId: relatedDocumentId }))
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const existing = await findMutation(profile.id, input.idempotencyKey);
      if (existing) {
        return { id: existing.resourceId, replayed: true as const };
      }
      const db = createDb();
      const id = crypto.randomUUID();
      try {
        await db.insert(procedure).values({
          id,
          patientId: profile.id,
          name: input.name,
          status: input.status,
          performedAt: parseIsoDate(input.performedAt),
          facility: input.facility ?? null,
          notes: input.notes ?? null,
          source: "patient",
          sourceDocumentId: input.sourceDocumentId ?? null,
          idempotencyKey: input.idempotencyKey,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const replay = await findMutation(profile.id, input.idempotencyKey);
        if (replay) return { id: replay.resourceId, replayed: true as const };
        throw error;
      }
      await recordMutation({
        patientId: profile.id,
        idempotencyKey: input.idempotencyKey,
        kind: "surgery",
        resourceId: id,
      });
      return { id, replayed: false as const };
    }),

  latestRemedy: protectedProcedure.handler(async ({ context }) => {
    const profile = await requireSessionPatient(context.session.user.id);
    const last = await loadLatestRemedy(profile.id);
    const clinics = last?.severity === "severe" ? await loadNearbyClinics() : [];
    await logAccess({
      actorUserId: context.session.user.id,
      action: "health.latestRemedy",
      resourceType: "patient",
      resourceId: profile.id,
      patientId: profile.id,
      outcome: "allowed",
    });
    return assembleRemedyHub({ last, clinics });
  }),

  checkRemedy: protectedProcedure.input(remedyCheckInput).handler(async ({ context, input }) => {
    const profile = await requireSessionPatient(context.session.user.id);
    const { latitude, longitude, ...answers } = input;
    const localSeverity = classifyRemedySeverity(answers);
    const origin =
      latitude != null && longitude != null ? { latitude, longitude } : undefined;

    let aiSeverity: RemedySeverity | undefined;
    let aiSummary: string | undefined;
    let aiSuggestions: RemedySuggestion[] = [];

    if (localSeverity !== "severe") {
      try {
        const generated = await generateRemedySuggestions(answers);
        aiSeverity = generated.severity;
        aiSummary = generated.summary;
        aiSuggestions = generated.suggestions;
      } catch {
        aiSuggestions = defaultRemedySuggestions(localSeverity, answers);
      }
    }

    const severity = resolveRemedySeverity(localSeverity, aiSeverity);
    const suggestions = sanitizeRemedySuggestions(aiSuggestions, answers, severity);
    const summary =
      severity === "severe"
        ? summaryForSeverity("severe", answers)
        : aiSummary?.trim() || summaryForSeverity(severity, answers);
    const clinics = severity === "severe" ? await loadNearbyClinics(origin) : [];
    const id = crypto.randomUUID();
    const db = createDb();
    await db.insert(patientRemedyCheck).values({
      id,
      patientId: profile.id,
      severity,
      summary,
      answers,
      suggestions,
    });
    await logAccess({
      actorUserId: context.session.user.id,
      action: "health.checkRemedy",
      resourceType: "patient",
      resourceId: id,
      patientId: profile.id,
      outcome: "allowed",
      detail: { severity },
    });
    return {
      id,
      severity,
      summary,
      suggestions,
      clinics,
      disclaimer: REMEDY_DISCLAIMER,
    };
  }),
};
