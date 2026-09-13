import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fitMapToClinics, formatClinicDistance, LAHORE_REGION } from "./clinic-map.ts";

describe("formatClinicDistance", () => {
  it("formats kilometres for the nearby sheet", () => {
    assert.equal(formatClinicDistance(1.2), "1.2 km away");
    assert.equal(formatClinicDistance(null), null);
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
