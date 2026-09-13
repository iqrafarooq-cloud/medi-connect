import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addAllergyInput,
  addConditionInput,
  addMedicationInput,
  addSurgeryInput,
  assembleHealthSummary,
  documentCategoryFromType,
  guessDocumentType,
  ISO_DATE,
  resolveUploadMime,
  sourceLabel,
  uploadCategoryInput,
} from "./health-facts.ts";

const KEY = "11111111-1111-4111-8111-111111111111";

describe("addConditionInput", () => {
  it("accepts a current condition with date and idempotency key", () => {
    const parsed = addConditionInput.parse({
      name: "Type 2 diabetes",
      status: "current",
      diagnosedAt: "2024-03-12",
      idempotencyKey: KEY,
    });
    assert.equal(parsed.name, "Type 2 diabetes");
    assert.equal(parsed.notes, undefined);
  });

  it("rejects a blank name", () => {
    assert.throws(() =>
      addConditionInput.parse({
        name: "  ",
        status: "current",
        diagnosedAt: "2024-03-12",
        idempotencyKey: KEY,
      }),
    );
  });

  it("rejects a missing idempotency key", () => {
    assert.throws(() =>
      addConditionInput.parse({
        name: "Asthma",
        status: "previous",
        diagnosedAt: "2024-03-12",
      }),
    );
  });

  it("rejects a non-ISO date", () => {
    assert.throws(() =>
      addConditionInput.parse({
        name: "Asthma",
        status: "current",
        diagnosedAt: "12/03/2024",
        idempotencyKey: KEY,
      }),
    );
  });
});

describe("addAllergyInput", () => {
  it("accepts medication allergy with severity", () => {
    const parsed = addAllergyInput.parse({
      substance: "Penicillin",
      allergyType: "medication",
      severity: "high",
      reaction: "Anaphylaxis",
      idempotencyKey: KEY,
    });
    assert.equal(parsed.allergyType, "medication");
  });

  it("rejects unknown severity", () => {
    assert.throws(() =>
      addAllergyInput.parse({
        substance: "Peanuts",
        allergyType: "food",
        severity: "critical",
        idempotencyKey: KEY,
      }),
    );
  });
});

describe("addMedicationInput", () => {
  it("maps current to active status", () => {
    const parsed = addMedicationInput.parse({
      name: "Metformin",
      dose: "500 mg",
      frequency: "BID",
      status: "current",
      startedAt: "2025-01-01",
      idempotencyKey: KEY,
    });
    assert.equal(parsed.status, "current");
  });
});

describe("addSurgeryInput", () => {
  it("accepts optional facility", () => {
    const parsed = addSurgeryInput.parse({
      name: "Appendectomy",
      status: "previous",
      performedAt: "2019-06-02",
      facility: "AKUH",
      idempotencyKey: KEY,
    });
    assert.equal(parsed.facility, "AKUH");
  });
});

describe("uploadCategoryInput", () => {
  it("accepts clinic file categories", () => {
    for (const category of ["lab", "imaging", "prescription", "report", "other"] as const) {
      assert.equal(uploadCategoryInput.parse(category), category);
    }
  });

  it("rejects home_monitoring on the patient Health tab", () => {
    assert.throws(() => uploadCategoryInput.parse("home_monitoring"));
  });
});

describe("resolveUploadMime", () => {
  it("maps image/jpg onto image/jpeg", () => {
    assert.equal(resolveUploadMime("photo.jpg", "image/jpg"), "image/jpeg");
  });

  it("infers type from the filename when mime is missing", () => {
    assert.equal(resolveUploadMime("labs.pdf", ""), "application/pdf");
    assert.equal(resolveUploadMime("cxr.PNG", undefined), "image/png");
    assert.equal(resolveUploadMime("photo.jpeg", null), "image/jpeg");
  });

  it("keeps an allowed declared type", () => {
    assert.equal(resolveUploadMime("scan.bin", "application/pdf"), "application/pdf");
  });
});

describe("guessDocumentType", () => {
  it("maps lab and imaging categories", () => {
    assert.equal(guessDocumentType("panel.pdf", "lab", "application/pdf"), "lab_panel");
    assert.equal(guessDocumentType("cxr.jpg", "imaging", "image/jpeg"), "radiology_report");
  });
});

describe("documentCategoryFromType", () => {
  it("maps clinical types onto document chips", () => {
    assert.equal(documentCategoryFromType("lab_panel", "lab"), "lab");
    assert.equal(documentCategoryFromType("radiology_report", "imaging"), "imaging");
    assert.equal(documentCategoryFromType("other", "prescription"), "prescription");
  });
});

describe("sourceLabel", () => {
  it("uses patient-facing labels", () => {
    assert.equal(sourceLabel("patient"), "You added");
    assert.equal(sourceLabel("extracted"), "From upload");
    assert.equal(sourceLabel("clinic"), "Clinic");
  });
});

describe("ISO_DATE", () => {
  it("matches YYYY-MM-DD", () => {
    assert.equal(ISO_DATE.test("2026-09-13"), true);
    assert.equal(ISO_DATE.test("13-09-2026"), false);
  });
});

describe("assembleHealthSummary", () => {
  it("returns empty glance rows when nothing is on file", () => {
    const summary = assembleHealthSummary({
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [],
      labs: [],
    });
    assert.equal(summary.conditions.count, 0);
    assert.equal(summary.conditions.preview, null);
    assert.equal(summary.allergies.preview, null);
    assert.equal(summary.recent.length, 0);
    assert.equal(summary.timeline.length, 0);
  });

  it("previews current condition, high-severity allergy, and active med", () => {
    const summary = assembleHealthSummary({
      diagnoses: [
        {
          id: "d1",
          name: "Childhood asthma",
          status: "previous",
          diagnosedAt: new Date("2010-01-01"),
          notes: null,
          source: "patient",
          sourceDocumentId: null,
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "d2",
          name: "Type 2 diabetes",
          status: "current",
          diagnosedAt: new Date("2024-03-12"),
          notes: null,
          source: "patient",
          sourceDocumentId: null,
          createdAt: new Date("2026-02-01"),
        },
      ],
      allergies: [
        {
          id: "a1",
          substance: "Dust",
          allergyType: "other",
          reaction: null,
          severity: "low",
          source: "patient",
          sourceDocumentId: null,
          createdAt: new Date("2026-01-02"),
        },
        {
          id: "a2",
          substance: "Penicillin",
          allergyType: "medication",
          reaction: "Rash",
          severity: "high",
          source: "extracted",
          sourceDocumentId: "doc1",
          createdAt: new Date("2026-01-03"),
        },
      ],
      medications: [
        {
          id: "m1",
          name: "Old statin",
          dose: "10 mg",
          frequency: "daily",
          status: "discontinued",
          startedAt: new Date("2020-01-01"),
          source: "extracted",
          documentId: "doc1",
          createdAt: new Date("2026-01-04"),
        },
        {
          id: "m2",
          name: "Metformin",
          dose: "500 mg",
          frequency: "BID",
          status: "active",
          startedAt: new Date("2025-01-01"),
          source: "patient",
          documentId: null,
          createdAt: new Date("2026-02-02"),
        },
      ],
      procedures: [
        {
          id: "p1",
          name: "Appendectomy",
          status: "previous",
          performedAt: new Date("2019-06-02"),
          facility: "AKUH",
          notes: null,
          source: "patient",
          sourceDocumentId: null,
          createdAt: new Date("2026-01-05"),
        },
      ],
      documents: [
        {
          id: "doc1",
          originalFilename: "labs.pdf",
          category: "lab",
          type: "lab_panel",
          ingestionStatus: "ready",
          encounterDate: new Date("2026-03-01"),
          createdAt: new Date("2026-03-01T10:00:00Z"),
          uploadedByClinicId: "clinic-1",
        },
      ],
      labs: [],
    });

    assert.equal(summary.conditions.count, 2);
    assert.equal(summary.conditions.preview, "Type 2 diabetes");
    assert.equal(summary.allergies.preview, "Penicillin");
    assert.equal(summary.medications.preview, "Metformin 500 mg");
    assert.equal(summary.surgeries.preview, "Appendectomy");
    assert.ok(summary.timeline.length >= 4);
  });

  it("surfaces processing uploads first in recent", () => {
    const summary = assembleHealthSummary({
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents: [
        {
          id: "old",
          originalFilename: "old.pdf",
          category: "report",
          type: "other",
          ingestionStatus: "ready",
          encounterDate: new Date("2026-01-01"),
          createdAt: new Date("2026-04-01T10:00:00Z"),
          uploadedByClinicId: null,
        },
        {
          id: "new",
          originalFilename: "cxr.jpg",
          category: "imaging",
          type: "radiology_report",
          ingestionStatus: "pending",
          encounterDate: new Date("2026-04-02"),
          createdAt: new Date("2026-04-02T10:00:00Z"),
          uploadedByClinicId: null,
        },
      ],
      labs: [],
    });
    assert.equal(summary.recent[0]?.id, "new");
    assert.equal(summary.recent[0]?.status, "processing");
    assert.equal(summary.recent.length, 2);
  });

  it("caps recent at three items", () => {
    const documents = [1, 2, 3, 4].map((n) => ({
      id: `d${n}`,
      originalFilename: `file-${n}.pdf`,
      category: "report" as const,
      type: "other",
      ingestionStatus: "ready",
      encounterDate: new Date(`2026-0${n}-01`),
      createdAt: new Date(`2026-0${n}-01T10:00:00Z`),
      uploadedByClinicId: null,
    }));
    const summary = assembleHealthSummary({
      diagnoses: [],
      allergies: [],
      medications: [],
      procedures: [],
      documents,
      labs: [],
    });
    assert.equal(summary.recent.length, 3);
  });
});
