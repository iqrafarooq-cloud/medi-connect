import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fitMapToClinics,
  formatClinicDistance,
  formatQueueStatus,
  clinicQueueButton,
  LAHORE_REGION,
  minutesUntilEta,
  originIsNearby,
} from "./clinic-map.ts";

describe("formatClinicDistance", () => {
  it("formats kilometres only when the patient is actually nearby", () => {
    assert.equal(formatClinicDistance(1.2), "1.2 km away");
    assert.equal(formatClinicDistance(null), null);
    assert.equal(formatClinicDistance(12961.2), null);
  });
});

describe("originIsNearby", () => {
  const karachi = { latitude: 24.86, longitude: 67.01 };

  it("treats a simulator GPS far from enrolled clinics as not nearby", () => {
    assert.equal(originIsNearby({ latitude: 37.33, longitude: -122.03 }, [karachi]), false);
    assert.equal(originIsNearby({ latitude: 24.87, longitude: 67.02 }, [karachi]), true);
    assert.equal(originIsNearby(null, [karachi]), false);
  });
});

describe("fitMapToClinics", () => {
  it("falls back to Lahore when there is no GPS and no clinics", () => {
    assert.deepEqual(fitMapToClinics([]), LAHORE_REGION);
  });

  it("centers on a single clinic", () => {
    const region = fitMapToClinics([{ latitude: 24.86, longitude: 67.01 }]);
    assert.equal(region.latitude, 24.86);
    assert.equal(region.longitude, 67.01);
    assert.ok(region.latitudeDelta >= 0.04);
  });
});

describe("formatQueueStatus", () => {
  it("names the hospital the patient joined", () => {
    assert.equal(formatQueueStatus("City General Hospital"), "You're in the queue at City General Hospital");
  });
});

describe("clinicQueueButton", () => {
  it("lets the patient join when they are not queued", () => {
    assert.equal(clinicQueueButton("a", null), "join");
  });

  it("marks the current clinic and blocks every other clinic", () => {
    assert.equal(clinicQueueButton("a", "a"), "here");
    assert.equal(clinicQueueButton("b", "a"), "blocked");
  });
});

describe("minutesUntilEta", () => {
  it("rounds remaining minutes down to zero after arrival", () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    assert.equal(minutesUntilEta(new Date("2026-09-13T12:12:00.000Z"), now), 12);
    assert.equal(minutesUntilEta(new Date("2026-09-13T11:50:00.000Z"), now), 0);
  });
});
