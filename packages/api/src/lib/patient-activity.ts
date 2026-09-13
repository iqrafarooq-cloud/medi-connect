export const ACTIVITY_KINDS = [
  "joined",
  "condition",
  "allergy",
  "medication",
  "surgery",
  "document",
  "remedy",
  "visit",
  "encounter",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export type ActivityDetailKind = "condition" | "allergy" | "medication" | "surgery" | "document";
export type ClinicVisitType = "clinic" | "hospital" | "facility";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string | null;
  at: string;
  clinicId: string | null;
  clinicName: string | null;
  detailKind: ActivityDetailKind | null;
  detailId: string | null;
};

export type ClinicVisit = {
  id: string;
  clinicId: string | null;
  name: string;
  type: ClinicVisitType;
  city: string | null;
  lastVisitAt: string;
  visitCount: number;
  lastReason: string | null;
};

export type PatientActivity = {
  events: ActivityEvent[];
  visits: ClinicVisit[];
  stats: {
    records: number;
    visits: number;
    checks: number;
  };
};

export type ActivityClinic = {
  id: string;
  name: string;
  type: string;
  city: string;
};

export type ActivityDiagnosis = {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
};

export type ActivityAllergy = {
  id: string;
  substance: string;
  source: string;
  createdAt: Date;
};

export type ActivityMedication = {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
};

export type ActivityProcedure = {
  id: string;
  name: string;
  facility: string | null;
  source: string;
  createdAt: Date;
};

export type ActivityDocument = {
  id: string;
  originalFilename: string;
  createdAt: Date;
  uploadedByClinicId: string | null;
};

export type ActivityRemedy = {
  id: string;
  severity: string;
  summary: string;
  createdAt: Date;
};

export type ActivityTriage = {
  id: string;
  clinicId: string;
  status: string;
  complaint: string;
  createdAt: Date;
};

export type ActivityEncounter = {
  id: string;
  clinicId: string | null;
  facility: string;
  title: string;
  occurredAt: Date;
};

export type AssemblePatientActivityInput = {
  registeredAt: Date;
  createdByClinic: ActivityClinic | null;
  diagnoses: ActivityDiagnosis[];
  allergies: ActivityAllergy[];
  medications: ActivityMedication[];
  procedures: ActivityProcedure[];
  documents: ActivityDocument[];
  remedyChecks: ActivityRemedy[];
  triageCases: ActivityTriage[];
  encounters: ActivityEncounter[];
  clinics: ActivityClinic[];
};

function iso(value: Date): string {
  return value.toISOString();
}

function clinicType(value: string | null | undefined): ClinicVisitType {
  if (value === "hospital") return "hospital";
  if (value === "clinic") return "clinic";
  return "facility";
}

function remedyLabel(severity: string): string {
  if (severity === "severe") return "Urgent";
  if (severity === "watch") return "Watch";
  return "Self-care";
}

function visitTitle(status: string, clinicName: string): string {
  if (status === "cancelled") return `Cancelled visit at ${clinicName}`;
  if (status === "inbound") return `On the way to ${clinicName}`;
  if (status === "acknowledged") return `Clinic preparing at ${clinicName}`;
  if (status === "in_care") return `In care at ${clinicName}`;
  return `Visited ${clinicName}`;
}

function sourceTitle(source: string, patientTitle: string, otherTitle: string): string {
  return source === "patient" ? patientTitle : otherTitle;
}

type VisitAcc = {
  id: string;
  clinicId: string | null;
  name: string;
  type: ClinicVisitType;
  city: string | null;
  lastVisitAt: Date;
  visitCount: number;
  lastReason: string | null;
};

function visitKey(clinicId: string | null, name: string): string {
  if (clinicId) return `clinic:${clinicId}`;
  return `facility:${name.trim().toLowerCase()}`;
}

export function assemblePatientActivity(input: AssemblePatientActivityInput): PatientActivity {
  const clinicById = new Map(input.clinics.map((clinic) => [clinic.id, clinic]));
  const events: ActivityEvent[] = [];
  const visits = new Map<string, VisitAcc>();

  function clinicName(id: string | null | undefined): string | null {
    if (!id) return null;
    return clinicById.get(id)?.name ?? null;
  }

  function addVisit(params: {
    clinicId: string | null;
    name: string;
    type?: ClinicVisitType;
    city?: string | null;
    at: Date;
    reason: string | null;
  }) {
    const name = params.name.trim();
    if (!name) return;
    const key = visitKey(params.clinicId, name);
    const existing = visits.get(key);
    const clinic = params.clinicId ? clinicById.get(params.clinicId) : undefined;
    const type = params.type ?? clinicType(clinic?.type);
    const city = params.city ?? clinic?.city ?? null;
    if (!existing) {
      visits.set(key, {
        id: key,
        clinicId: params.clinicId,
        name: clinic?.name ?? name,
        type,
        city,
        lastVisitAt: params.at,
        visitCount: 1,
        lastReason: params.reason,
      });
      return;
    }
    existing.visitCount += 1;
    if (params.at.getTime() >= existing.lastVisitAt.getTime()) {
      existing.lastVisitAt = params.at;
      existing.lastReason = params.reason;
    }
    if (clinic) {
      existing.name = clinic.name;
      existing.type = clinicType(clinic.type);
      existing.city = clinic.city;
      existing.clinicId = clinic.id;
    }
  }

  events.push({
    id: "joined",
    kind: "joined",
    title: "Created your MediConnect profile",
    detail: null,
    at: iso(input.registeredAt),
    clinicId: input.createdByClinic?.id ?? null,
    clinicName: input.createdByClinic?.name ?? null,
    detailKind: null,
    detailId: null,
  });

  if (input.createdByClinic) {
    addVisit({
      clinicId: input.createdByClinic.id,
      name: input.createdByClinic.name,
      type: clinicType(input.createdByClinic.type),
      city: input.createdByClinic.city,
      at: input.registeredAt,
      reason: "Registered here",
    });
  }

  for (const row of input.diagnoses) {
    events.push({
      id: `condition:${row.id}`,
      kind: "condition",
      title: sourceTitle(row.source, `Added ${row.name}`, `${row.name} added to your chart`),
      detail: null,
      at: iso(row.createdAt),
      clinicId: null,
      clinicName: null,
      detailKind: "condition",
      detailId: row.id,
    });
  }

  for (const row of input.allergies) {
    events.push({
      id: `allergy:${row.id}`,
      kind: "allergy",
      title: sourceTitle(
        row.source,
        `Logged allergy to ${row.substance}`,
        `Allergy to ${row.substance} added to your chart`,
      ),
      detail: null,
      at: iso(row.createdAt),
      clinicId: null,
      clinicName: null,
      detailKind: "allergy",
      detailId: row.id,
    });
  }

  for (const row of input.medications) {
    events.push({
      id: `medication:${row.id}`,
      kind: "medication",
      title: sourceTitle(row.source, `Added ${row.name}`, `${row.name} added to your chart`),
      detail: null,
      at: iso(row.createdAt),
      clinicId: null,
      clinicName: null,
      detailKind: "medication",
      detailId: row.id,
    });
  }

  for (const row of input.procedures) {
    events.push({
      id: `surgery:${row.id}`,
      kind: "surgery",
      title: sourceTitle(row.source, `Recorded ${row.name}`, `${row.name} added to your chart`),
      detail: row.facility,
      at: iso(row.createdAt),
      clinicId: null,
      clinicName: row.facility,
      detailKind: "surgery",
      detailId: row.id,
    });
    if (row.facility) {
      addVisit({
        clinicId: null,
        name: row.facility,
        at: row.createdAt,
        reason: row.name,
      });
    }
  }

  for (const row of input.documents) {
    const name = clinicName(row.uploadedByClinicId);
    events.push({
      id: `document:${row.id}`,
      kind: "document",
      title: row.uploadedByClinicId
        ? `${name ?? "Clinic"} added ${row.originalFilename}`
        : `Uploaded ${row.originalFilename}`,
      detail: null,
      at: iso(row.createdAt),
      clinicId: row.uploadedByClinicId,
      clinicName: name,
      detailKind: "document",
      detailId: row.id,
    });
    if (row.uploadedByClinicId) {
      addVisit({
        clinicId: row.uploadedByClinicId,
        name: name ?? "Clinic",
        at: row.createdAt,
        reason: row.originalFilename,
      });
    }
  }

  for (const row of input.remedyChecks) {
    events.push({
      id: `remedy:${row.id}`,
      kind: "remedy",
      title: `Symptom check · ${remedyLabel(row.severity)}`,
      detail: row.summary,
      at: iso(row.createdAt),
      clinicId: null,
      clinicName: null,
      detailKind: null,
      detailId: null,
    });
  }

  for (const row of input.triageCases) {
    const name = clinicName(row.clinicId) ?? "clinic";
    events.push({
      id: `visit:${row.id}`,
      kind: "visit",
      title: visitTitle(row.status, name),
      detail: row.complaint || null,
      at: iso(row.createdAt),
      clinicId: row.clinicId,
      clinicName: clinicName(row.clinicId),
      detailKind: null,
      detailId: null,
    });
    if (row.status !== "cancelled") {
      addVisit({
        clinicId: row.clinicId,
        name,
        at: row.createdAt,
        reason: row.complaint || null,
      });
    }
  }

  for (const row of input.encounters) {
    const name = clinicName(row.clinicId) ?? row.facility;
    events.push({
      id: `encounter:${row.id}`,
      kind: "encounter",
      title: `${row.title} at ${name}`,
      detail: row.facility,
      at: iso(row.occurredAt),
      clinicId: row.clinicId,
      clinicName: name,
      detailKind: null,
      detailId: null,
    });
    addVisit({
      clinicId: row.clinicId,
      name,
      at: row.occurredAt,
      reason: row.title,
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const visitList = [...visits.values()]
    .sort((a, b) => b.lastVisitAt.getTime() - a.lastVisitAt.getTime())
    .map((visit) => ({
      id: visit.id,
      clinicId: visit.clinicId,
      name: visit.name,
      type: visit.type,
      city: visit.city,
      lastVisitAt: iso(visit.lastVisitAt),
      visitCount: visit.visitCount,
      lastReason: visit.lastReason,
    }));

  return {
    events,
    visits: visitList,
    stats: {
      records:
        input.diagnoses.length +
        input.allergies.length +
        input.medications.length +
        input.procedures.length +
        input.documents.length,
      visits: visitList.length,
      checks: input.remedyChecks.length,
    },
  };
}
