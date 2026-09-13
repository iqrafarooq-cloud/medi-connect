import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  complaintForQueue,
  esiFromRemedySeverity,
  etaMinutesFromKm,
  filterEnrolledClinics,
  joinQueueDecision,
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

describe("etaMinutesFromKm", () => {
  it("uses two minutes per kilometre with a five-minute floor", () => {
    assert.equal(etaMinutesFromKm(1.2), 5);
    assert.equal(etaMinutesFromKm(8), 16);
  });

  it("defaults to 15 minutes when distance is unknown", () => {
    assert.equal(etaMinutesFromKm(null), 15);
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
  it("updates an existing active case instead of inserting a duplicate", () => {
    assert.deepEqual(joinQueueDecision({ id: "case-1" }), { action: "update", caseId: "case-1" });
  });

  it("inserts when the patient has no active case at that clinic", () => {
    assert.deepEqual(joinQueueDecision(null), { action: "insert" });
  });
});
