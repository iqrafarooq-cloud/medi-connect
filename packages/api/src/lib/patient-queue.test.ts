import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  complaintForQueue,
  esiFromRemedySeverity,
  clampEtaMinutes,
  etaMinutesFromKm,
  blockedQueueMessage,
  filterEnrolledClinics,
  joinQueueDecision,
  leaveQueueDecision,
} from "./health-remedy.ts";

const seaview = {
  id: "karachi",
  name: "Seaview Clinic",
  type: "clinic",
  address: "Clifton",
  city: "Karachi",
  phone: "0212222222",
  distanceKm: 1.2,
  latitude: 24.87,
  longitude: 67.03,
};

const shifa = {
  id: "lahore",
  name: "Shifa Hospital",
  type: "hospital",
  address: "Gulberg III",
  city: "Lahore",
  phone: "0421111111",
  distanceKm: 4.5,
  latitude: 31.52,
  longitude: 74.35,
};

describe("filterEnrolledClinics", () => {
  it("matches name, city, or address and ignores case", () => {
    const rows = filterEnrolledClinics([seaview, shifa], "gulberg");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "lahore");
  });

  it("returns all clinics for a blank query", () => {
    assert.equal(filterEnrolledClinics([seaview, shifa], "  ").length, 2);
  });

  it("returns none when nothing enrolled matches", () => {
    assert.equal(filterEnrolledClinics([seaview, shifa], "Islamabad").length, 0);
  });
});

describe("clampEtaMinutes", () => {
  it("keeps ETA between 1 and 200 minutes", () => {
    assert.equal(clampEtaMinutes(10), 10);
    assert.equal(clampEtaMinutes(0), 1);
    assert.equal(clampEtaMinutes(201), 200);
    assert.equal(clampEtaMinutes(Number.NaN), 10);
  });
});

describe("etaMinutesFromKm", () => {
  it("uses two minutes per kilometre with a ten-minute floor and a 200-minute cap", () => {
    assert.equal(etaMinutesFromKm(1.2), 10);
    assert.equal(etaMinutesFromKm(8), 16);
    assert.equal(etaMinutesFromKm(150), 200);
  });

  it("defaults to 10 minutes when distance is unknown", () => {
    assert.equal(etaMinutesFromKm(null), 10);
  });
});

describe("esiFromRemedySeverity", () => {
  it("maps severe to 2, watch to 3, and anything else to 4", () => {
    assert.equal(esiFromRemedySeverity("severe"), 2);
    assert.equal(esiFromRemedySeverity("watch"), 3);
    assert.equal(esiFromRemedySeverity("self_care"), 4);
    assert.equal(esiFromRemedySeverity(null), 4);
  });
});

describe("complaintForQueue", () => {
  it("uses the last check-in complaint label when present", () => {
    assert.equal(complaintForQueue({ complaint: "fever" }), "Fever");
  });

  it("falls back to On the way when there is no check-in", () => {
    assert.equal(complaintForQueue(null), "On the way");
    assert.equal(complaintForQueue({ complaint: null }), "On the way");
  });
});

describe("joinQueueDecision", () => {
  it("updates an existing active case at the same clinic", () => {
    assert.deepEqual(
      joinQueueDecision({
        targetClinicId: "karachi",
        active: { id: "case-1", clinicId: "karachi", clinicName: "Seaview Clinic" },
      }),
      { action: "update", caseId: "case-1" },
    );
  });

  it("inserts when the patient has no active case", () => {
    assert.deepEqual(joinQueueDecision({ targetClinicId: "karachi", active: null }), {
      action: "insert",
    });
  });

  it("blocks joining a second clinic while already queued", () => {
    assert.deepEqual(
      joinQueueDecision({
        targetClinicId: "lahore",
        active: { id: "case-1", clinicId: "karachi", clinicName: "Seaview Clinic" },
      }),
      { action: "blocked", clinicName: "Seaview Clinic" },
    );
    assert.equal(
      blockedQueueMessage("Seaview Clinic"),
      "You're already in the queue at Seaview Clinic. Leave that queue first.",
    );
  });
});

describe("leaveQueueDecision", () => {
  it("cancels the active case when the patient is queued", () => {
    assert.deepEqual(leaveQueueDecision({ id: "case-1" }), { action: "cancel", caseId: "case-1" });
  });

  it("does nothing when the patient is not in a queue", () => {
    assert.deepEqual(leaveQueueDecision(null), { action: "none" });
  });
});
