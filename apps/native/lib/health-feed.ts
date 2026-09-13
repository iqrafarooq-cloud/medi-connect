export const RECORD_FILTERS = [
  "all",
  "condition",
  "allergy",
  "medication",
  "surgery",
  "document",
] as const;

export type RecordFilter = (typeof RECORD_FILTERS)[number];
export type RecordType = Exclude<RecordFilter, "all">;

export type HealthFeedItem = {
  id: string;
  type: RecordType;
  title: string;
  at: string;
  status: "ready" | "processing" | "failed" | null;
  danger: boolean;
  extra: string | null;
  detailKind: RecordType;
  detailId: string;
};

export const RECORD_FILTER_OPTIONS: { value: RecordFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "condition", label: "Conditions" },
  { value: "allergy", label: "Allergies" },
  { value: "medication", label: "Meds" },
  { value: "surgery", label: "Surgeries" },
  { value: "document", label: "Documents" },
];

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  condition: "Condition",
  allergy: "Allergy",
  medication: "Medication",
  surgery: "Surgery",
  document: "Document",
};

function iso(value: string | Date | null | undefined, fallback?: string | Date): string {
  const raw = value ?? fallback ?? new Date(0);
  if (typeof raw === "string") return raw;
  return raw.toISOString();
}

export function parseRecordFilter(value: unknown): RecordFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === "string" && (RECORD_FILTERS as readonly string[]).includes(raw)) {
    return raw as RecordFilter;
  }
  return "all";
}

export function buildHealthFeed(input: {
  diagnoses: Array<{
    id: string;
    name: string;
    status: string;
    diagnosedAt: string | Date | null;
    createdAt: string | Date;
  }>;
  allergies: Array<{
    id: string;
    substance: string;
    allergyType: string;
    severity: string | null;
    createdAt: string | Date;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dose: string | null;
    frequency: string | null;
    status: string;
    startedAt: string | Date | null;
    createdAt: string | Date;
  }>;
  procedures: Array<{
    id: string;
    name: string;
    facility: string | null;
    performedAt: string | Date | null;
    createdAt: string | Date;
  }>;
  documents: Array<{
    id: string;
    originalFilename: string;
    ingestionStatus: string;
    encounterDate: string | Date | null;
    createdAt: string | Date;
  }>;
}): HealthFeedItem[] {
  const items: HealthFeedItem[] = [
    ...input.diagnoses.map((row) => ({
      id: `condition:${row.id}`,
      type: "condition" as const,
      title: row.name,
      at: iso(row.diagnosedAt, row.createdAt),
      status: null,
      danger: false,
      extra: row.status === "previous" ? "Previous" : "Current",
      detailKind: "condition" as const,
      detailId: row.id,
    })),
    ...input.allergies.map((row) => ({
      id: `allergy:${row.id}`,
      type: "allergy" as const,
      title: row.substance,
      at: iso(row.createdAt),
      status: null,
      danger: (row.severity ?? "").toLowerCase() === "high",
      extra: [row.allergyType, row.severity].filter(Boolean).join(" · ") || null,
      detailKind: "allergy" as const,
      detailId: row.id,
    })),
    ...input.medications.map((row) => ({
      id: `medication:${row.id}`,
      type: "medication" as const,
      title: row.dose ? `${row.name} ${row.dose}` : row.name,
      at: iso(row.startedAt, row.createdAt),
      status: null,
      danger: false,
      extra: [row.frequency, row.status === "active" ? "Active" : "Stopped"].filter(Boolean).join(" · "),
      detailKind: "medication" as const,
      detailId: row.id,
    })),
    ...input.procedures.map((row) => ({
      id: `surgery:${row.id}`,
      type: "surgery" as const,
      title: row.name,
      at: iso(row.performedAt, row.createdAt),
      status: null,
      danger: false,
      extra: row.facility,
      detailKind: "surgery" as const,
      detailId: row.id,
    })),
    ...input.documents.map((row) => ({
      id: `document:${row.id}`,
      type: "document" as const,
      title: row.originalFilename,
      at: iso(row.encounterDate, row.createdAt),
      status:
        row.ingestionStatus === "ready"
          ? ("ready" as const)
          : row.ingestionStatus === "failed"
            ? ("failed" as const)
            : ("processing" as const),
      danger: row.ingestionStatus === "failed",
      extra: null,
      detailKind: "document" as const,
      detailId: row.id,
    })),
  ];

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}

export function filterHealthFeed(items: HealthFeedItem[], filter: RecordFilter): HealthFeedItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.type === filter);
}
