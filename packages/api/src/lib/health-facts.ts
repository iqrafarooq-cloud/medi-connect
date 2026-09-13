import { z } from "zod";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const FACT_STATUS = ["current", "previous"] as const;
export const ALLERGY_TYPES = ["medication", "food", "other"] as const;
export const ALLERGY_SEVERITIES = ["low", "moderate", "high"] as const;
export const HEALTH_SOURCES = ["extracted", "patient", "clinic"] as const;
export const UPLOAD_CATEGORIES = ["lab", "imaging", "prescription", "report", "other"] as const;
export const DOCUMENT_TYPES = [
  "soap_note",
  "specialist_consult",
  "radiology_report",
  "lab_panel",
  "progress_note",
  "eye_exam",
  "home_monitoring_log",
  "other",
] as const;

export type FactStatus = (typeof FACT_STATUS)[number];
export type AllergyType = (typeof ALLERGY_TYPES)[number];
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];
export type HealthSource = (typeof HEALTH_SOURCES)[number];
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];
export type ClinicalDocumentType = (typeof DOCUMENT_TYPES)[number];

const isoDate = z.string().regex(ISO_DATE, "Use YYYY-MM-DD");
const idempotencyKey = z.string().uuid();

export const addConditionInput = z.object({
  name: z.string().trim().min(1).max(160),
  status: z.enum(FACT_STATUS),
  diagnosedAt: isoDate,
  notes: z.string().trim().max(280).optional(),
  idempotencyKey,
});

export const addAllergyInput = z.object({
  substance: z.string().trim().min(1).max(160),
  allergyType: z.enum(ALLERGY_TYPES),
  severity: z.enum(ALLERGY_SEVERITIES),
  reaction: z.string().trim().max(160).optional(),
  idempotencyKey,
});

export const addMedicationInput = z.object({
  name: z.string().trim().min(1).max(160),
  dose: z.string().trim().max(80).optional(),
  frequency: z.string().trim().max(80).optional(),
  status: z.enum(FACT_STATUS),
  startedAt: isoDate,
  idempotencyKey,
});

export const addSurgeryInput = z.object({
  name: z.string().trim().min(1).max(160),
  status: z.enum(FACT_STATUS),
  performedAt: isoDate,
  facility: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(280).optional(),
  idempotencyKey,
});

export const uploadCategoryInput = z.enum(UPLOAD_CATEGORIES);

export const uploadMetaInput = z.object({
  category: uploadCategoryInput,
  encounterDate: isoDate,
  notes: z.string().trim().max(280).optional(),
  idempotencyKey,
});

export function resolveUploadMime(fileName: string, mimeType?: string | null): string {
  const declared = (mimeType ?? "").trim().toLowerCase();
  if (declared === "image/jpg" || declared === "image/pjpeg") return "image/jpeg";
  if (declared === "application/pdf" || declared === "image/jpeg" || declared === "image/png") {
    return declared;
  }
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return declared;
}

export type DiagnosisRow = {
  id: string;
  name: string;
  status: FactStatus;
  diagnosedAt: Date | null;
  notes: string | null;
  source: HealthSource;
  sourceDocumentId: string | null;
  createdAt: Date;
};

export type AllergyRow = {
  id: string;
  substance: string;
  allergyType: AllergyType;
  reaction: string | null;
  severity: string | null;
  source: HealthSource;
  sourceDocumentId: string | null;
  createdAt: Date;
};

export type MedicationRow = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  status: "active" | "discontinued" | "changed";
  startedAt: Date | null;
  source: HealthSource;
  documentId: string | null;
  createdAt: Date;
};

export type ProcedureRow = {
  id: string;
  name: string;
  status: FactStatus;
  performedAt: Date | null;
  facility: string | null;
  notes: string | null;
  source: HealthSource;
  sourceDocumentId: string | null;
  createdAt: Date;
};

export type DocumentRow = {
  id: string;
  originalFilename: string;
  category: UploadCategory | "home_monitoring";
  type: string;
  ingestionStatus: string;
  encounterDate: Date | null;
  createdAt: Date;
  uploadedByClinicId: string | null;
};

export type LabRow = {
  id: string;
  testName: string;
  value: number;
  unit: string | null;
  observedAt: Date;
  documentId: string;
};

export type TimelineKind = "diagnosis" | "medication" | "lab" | "imaging" | "surgery" | "document";

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  title: string;
  subtitle: string | null;
  at: string;
  status: "ready" | "processing" | "failed" | null;
  detailKind: DetailKind;
  detailId: string;
};

export type DetailKind = "condition" | "allergy" | "medication" | "surgery" | "document";

export type GlanceSection = {
  count: number;
  preview: string | null;
};

export type RecentItem = {
  id: string;
  title: string;
  status: "ready" | "processing" | "failed" | null;
  at: string;
  detailKind: DetailKind;
  detailId: string;
};

export type HealthSummary = {
  conditions: GlanceSection;
  allergies: GlanceSection;
  medications: GlanceSection;
  surgeries: GlanceSection;
  recent: RecentItem[];
  timeline: TimelineItem[];
  documents: Array<DocumentRow & { category: UploadCategory | "home_monitoring" }>;
  diagnoses: DiagnosisRow[];
  allergyItems: AllergyRow[];
  medicationItems: MedicationRow[];
  procedureItems: ProcedureRow[];
};

export function guessDocumentType(
  filename: string,
  category: string,
  mimeType: string,
): ClinicalDocumentType {
  const lower = filename.toLowerCase();
  if (mimeType.includes("csv") || lower.endsWith(".csv")) return "home_monitoring_log";
  if (category === "lab") return "lab_panel";
  if (category === "imaging") return "radiology_report";
  if (lower.includes("ophthal") || lower.includes("retina") || lower.includes("eye")) return "eye_exam";
  if (lower.includes("pulm") || lower.includes("progress")) return "progress_note";
  if (lower.includes("nephro") || lower.includes("consult")) return "specialist_consult";
  if (lower.includes("soap") || lower.includes("primary")) return "soap_note";
  return "other";
}

export function documentCategoryFromType(
  type: string,
  fileCategory?: string | null,
): UploadCategory | "home_monitoring" {
  if (fileCategory && (UPLOAD_CATEGORIES as readonly string[]).includes(fileCategory)) {
    return fileCategory as UploadCategory;
  }
  if (fileCategory === "home_monitoring") return "home_monitoring";
  if (type === "lab_panel") return "lab";
  if (type === "radiology_report") return "imaging";
  if (type === "home_monitoring_log") return "home_monitoring";
  return "report";
}

export function sourceLabel(source: HealthSource): string {
  if (source === "patient") return "You added";
  if (source === "clinic") return "Clinic";
  return "From upload";
}

export function folderForCategory(category: string): string {
  if (category === "prescription") return "prescriptions";
  if (category === "lab") return "labs";
  if (category === "imaging") return "imaging";
  if (category === "home_monitoring") return "home-monitoring";
  if (category === "other") return "other";
  return "reports";
}

export function ingestionUiStatus(status: string): "ready" | "processing" | "failed" {
  if (status === "ready") return "ready";
  if (status === "failed") return "failed";
  return "processing";
}

function iso(value: Date | null | undefined, fallback?: Date): string {
  const date = value ?? fallback ?? new Date();
  return date.toISOString();
}

function medicationPreview(row: MedicationRow): string {
  return row.dose ? `${row.name} ${row.dose}` : row.name;
}

function isProcessing(status: string): boolean {
  return ingestionUiStatus(status) === "processing";
}

export function assembleHealthSummary(input: {
  diagnoses: DiagnosisRow[];
  allergies: AllergyRow[];
  medications: MedicationRow[];
  procedures: ProcedureRow[];
  documents: DocumentRow[];
  labs: LabRow[];
}): HealthSummary {
  const currentConditions = input.diagnoses.filter((row) => row.status === "current");
  const activeMeds = input.medications.filter((row) => row.status === "active");
  const highAllergy =
    input.allergies.find((row) => (row.severity ?? "").toLowerCase() === "high") ?? input.allergies[0];
  const latestSurgery = [...input.procedures].sort((a, b) => {
    const aTime = (a.performedAt ?? a.createdAt).getTime();
    const bTime = (b.performedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  })[0];

  const timeline: TimelineItem[] = [];

  for (const row of input.diagnoses) {
    timeline.push({
      id: `diagnosis:${row.id}`,
      kind: "diagnosis",
      title: row.name,
      subtitle: null,
      at: iso(row.diagnosedAt, row.createdAt),
      status: null,
      detailKind: "condition",
      detailId: row.id,
    });
  }

  for (const row of input.medications) {
    timeline.push({
      id: `medication:${row.id}`,
      kind: "medication",
      title: medicationPreview(row),
      subtitle: row.frequency,
      at: iso(row.startedAt, row.createdAt),
      status: null,
      detailKind: "medication",
      detailId: row.id,
    });
  }

  for (const row of input.procedures) {
    timeline.push({
      id: `surgery:${row.id}`,
      kind: "surgery",
      title: row.name,
      subtitle: row.facility,
      at: iso(row.performedAt, row.createdAt),
      status: null,
      detailKind: "surgery",
      detailId: row.id,
    });
  }

  for (const row of input.labs) {
    timeline.push({
      id: `lab:${row.id}`,
      kind: "lab",
      title: row.testName,
      subtitle: row.unit ? `${row.value} ${row.unit}` : String(row.value),
      at: iso(row.observedAt),
      status: "ready",
      detailKind: "document",
      detailId: row.documentId,
    });
  }

  for (const row of input.documents) {
    const category = documentCategoryFromType(row.type, row.category);
    const kind: TimelineKind =
      category === "imaging" ? "imaging" : category === "lab" ? "lab" : "document";
    timeline.push({
      id: `document:${row.id}`,
      kind,
      title: row.originalFilename,
      subtitle: null,
      at: iso(row.encounterDate, row.createdAt),
      status: ingestionUiStatus(row.ingestionStatus),
      detailKind: "document",
      detailId: row.id,
    });
  }

  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const recentCandidates: Array<RecentItem & { createdAt: Date; processing: boolean }> = [
    ...input.documents.map((row) => ({
      id: row.id,
      title: row.originalFilename,
      status: ingestionUiStatus(row.ingestionStatus),
      at: iso(row.createdAt),
      detailKind: "document" as const,
      detailId: row.id,
      createdAt: row.createdAt,
      processing: isProcessing(row.ingestionStatus),
    })),
    ...input.diagnoses
      .filter((row) => row.source === "patient")
      .map((row) => ({
        id: row.id,
        title: row.name,
        status: null,
        at: iso(row.createdAt),
        detailKind: "condition" as const,
        detailId: row.id,
        createdAt: row.createdAt,
        processing: false,
      })),
    ...input.allergies
      .filter((row) => row.source === "patient")
      .map((row) => ({
        id: row.id,
        title: row.substance,
        status: null,
        at: iso(row.createdAt),
        detailKind: "allergy" as const,
        detailId: row.id,
        createdAt: row.createdAt,
        processing: false,
      })),
    ...input.medications
      .filter((row) => row.source === "patient")
      .map((row) => ({
        id: row.id,
        title: row.name,
        status: null,
        at: iso(row.createdAt),
        detailKind: "medication" as const,
        detailId: row.id,
        createdAt: row.createdAt,
        processing: false,
      })),
    ...input.procedures
      .filter((row) => row.source === "patient")
      .map((row) => ({
        id: row.id,
        title: row.name,
        status: null,
        at: iso(row.createdAt),
        detailKind: "surgery" as const,
        detailId: row.id,
        createdAt: row.createdAt,
        processing: false,
      })),
  ];

  recentCandidates.sort((a, b) => {
    if (a.processing !== b.processing) return a.processing ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const recent = recentCandidates.slice(0, 3).map(({ createdAt: _createdAt, processing: _processing, ...item }) => item);

  return {
    conditions: {
      count: input.diagnoses.length,
      preview: currentConditions[0]?.name ?? input.diagnoses[0]?.name ?? null,
    },
    allergies: {
      count: input.allergies.length,
      preview: highAllergy?.substance ?? null,
    },
    medications: {
      count: input.medications.length,
      preview: activeMeds[0] ? medicationPreview(activeMeds[0]) : input.medications[0]?.name ?? null,
    },
    surgeries: {
      count: input.procedures.length,
      preview: latestSurgery?.name ?? null,
    },
    recent,
    timeline,
    documents: input.documents,
    diagnoses: input.diagnoses,
    allergyItems: input.allergies,
    medicationItems: input.medications,
    procedureItems: input.procedures,
  };
}

export function medicationDbStatus(status: FactStatus): "active" | "discontinued" {
  return status === "current" ? "active" : "discontinued";
}

export function parseIsoDate(value: string): Date {
  const year = Number(value.slice(0, 4)) || 1970;
  const month = Number(value.slice(5, 7)) || 1;
  const day = Number(value.slice(8, 10)) || 1;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}
