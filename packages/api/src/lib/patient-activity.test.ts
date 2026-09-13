import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assemblePatientActivity } from "./patient-activity.ts";

const at = (iso: string) => new Date(iso);

describe("assemblePatientActivity", () => {
  it("returns empty lists and zero stats when the patient has no history", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [],
      remedyChecks: [],
      triageCases: [],
      encounters: [],
      clinics: [],
    });

    assert.deepEqual(result.visits, []);
    assert.equal(result.stats.records, 0);
    assert.equal(result.stats.visits, 0);
    assert.equal(result.stats.checks, 0);
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]?.kind, "joined");
  });

  it("sorts activity newest first and labels patient-added records", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [
        {
          id: "c1",
          name: "Asthma",
          source: "patient",
          createdAt: at("2026-03-01T10:00:00.000Z"),
        },
      ],
      allergies: [
        {
          id: "a1",
          substance: "Penicillin",
          source: "patient",
          createdAt: at("2026-04-01T10:00:00.000Z"),
        },
      ],
      medications: [],
      procedures: [],
      documents: [],
      remedyChecks: [],
      triageCases: [],
      encounters: [],
      clinics: [],
    });

    assert.equal(result.events[0]?.kind, "allergy");
    assert.equal(result.events[0]?.title, "Logged allergy to Penicillin");
    assert.equal(result.events[1]?.kind, "condition");
    assert.equal(result.events[1]?.title, "Added Asthma");
    assert.equal(result.stats.records, 2);
  });

  it("merges clinic visits by clinic id and keeps the latest date and reason", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [
        {
          id: "d1",
          originalFilename: "CBC.pdf",
          createdAt: at("2026-05-02T08:00:00.000Z"),
          uploadedByClinicId: "clinic-1",
        },
      ],
      remedyChecks: [],
      triageCases: [
        {
          id: "t1",
          clinicId: "clinic-1",
          status: "cleared",
          complaint: "Chest pain",
          createdAt: at("2026-05-01T08:00:00.000Z"),
        },
      ],
      encounters: [
        {
          id: "e1",
          clinicId: "clinic-1",
          facility: "City General",
          title: "Follow-up",
          occurredAt: at("2026-05-03T08:00:00.000Z"),
        },
      ],
      clinics: [{ id: "clinic-1", name: "City General Hospital", type: "hospital", city: "Lahore" }],
    });

    assert.equal(result.visits.length, 1);
    assert.equal(result.visits[0]?.name, "City General Hospital");
    assert.equal(result.visits[0]?.type, "hospital");
    assert.equal(result.visits[0]?.city, "Lahore");
    assert.equal(result.visits[0]?.visitCount, 3);
    assert.equal(result.visits[0]?.lastVisitAt, "2026-05-03T08:00:00.000Z");
    assert.equal(result.visits[0]?.lastReason, "Follow-up");
    assert.equal(result.stats.visits, 1);
  });

  it("treats a named facility without a clinic id as its own visit", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [
        {
          id: "s1",
          name: "Appendectomy",
          facility: "District Hospital",
          source: "patient",
          createdAt: at("2026-02-10T00:00:00.000Z"),
        },
      ],
      documents: [],
      remedyChecks: [],
      triageCases: [],
      encounters: [
        {
          id: "e1",
          clinicId: null,
          facility: "District Hospital",
          title: "Surgical consult",
          occurredAt: at("2026-02-11T00:00:00.000Z"),
        },
      ],
      clinics: [],
    });

    assert.equal(result.visits.length, 1);
    assert.equal(result.visits[0]?.name, "District Hospital");
    assert.equal(result.visits[0]?.type, "facility");
    assert.equal(result.visits[0]?.clinicId, null);
    assert.equal(result.visits[0]?.visitCount, 2);
  });

  it("labels clinic-uploaded documents separately from patient uploads", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [
        {
          id: "d1",
          originalFilename: "X-ray.png",
          createdAt: at("2026-03-01T00:00:00.000Z"),
          uploadedByClinicId: "clinic-1",
        },
        {
          id: "d2",
          originalFilename: "Prescription.pdf",
          createdAt: at("2026-03-02T00:00:00.000Z"),
          uploadedByClinicId: null,
        },
      ],
      remedyChecks: [],
      triageCases: [],
      encounters: [],
      clinics: [{ id: "clinic-1", name: "Shifa Clinic", type: "clinic", city: "Karachi" }],
    });

    const clinicDoc = result.events.find((event) => event.id === "document:d1");
    const ownDoc = result.events.find((event) => event.id === "document:d2");
    assert.equal(clinicDoc?.title, "Shifa Clinic added X-ray.png");
    assert.equal(ownDoc?.title, "Uploaded Prescription.pdf");
  });

  it("keeps cancelled triage in the timeline but does not count it as a visit", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [],
      remedyChecks: [],
      triageCases: [
        {
          id: "t1",
          clinicId: "clinic-1",
          status: "cancelled",
          complaint: "Fever",
          createdAt: at("2026-04-01T00:00:00.000Z"),
        },
      ],
      encounters: [],
      clinics: [{ id: "clinic-1", name: "Shifa Clinic", type: "clinic", city: "Karachi" }],
    });

    assert.equal(result.visits.length, 0);
    assert.equal(result.stats.visits, 0);
    const visitEvent = result.events.find((event) => event.kind === "visit");
    assert.equal(visitEvent?.title, "Cancelled visit at Shifa Clinic");
  });

  it("counts remedy checks and includes them in the timeline", () => {
    const result = assemblePatientActivity({
      registeredAt: at("2026-01-01T00:00:00.000Z"),
      createdByClinic: null,
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [],
      remedyChecks: [
        {
          id: "r1",
          severity: "severe",
          summary: "Seek care now",
          createdAt: at("2026-06-01T00:00:00.000Z"),
        },
      ],
      triageCases: [],
      encounters: [],
      clinics: [],
    });

    assert.equal(result.stats.checks, 1);
    assert.equal(result.events[0]?.kind, "remedy");
    assert.equal(result.events[0]?.title, "Symptom check · Urgent");
    assert.equal(result.events[0]?.detail, "Seek care now");
  });
});
