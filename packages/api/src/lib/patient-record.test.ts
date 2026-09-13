import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  encounterYear,
  groupLabsByTestName,
  uniqueFacilities,
  type LabPoint,
} from "./patient-record.ts";

function lab(partial: Partial<LabPoint> & Pick<LabPoint, "id" | "testName" | "value">): LabPoint {
  return {
    unit: "mg/dL",
    flag: null,
    observedAt: "2026-01-01T00:00:00.000Z",
    entrySource: "manual",
    documentId: null,
    ...partial,
  };
}

describe("groupLabsByTestName", () => {
  it("groups case-insensitively and builds oldest-to-newest sparkline", () => {
    const series = groupLabsByTestName([
      lab({ id: "1", testName: "LDL-C", value: 120, observedAt: "2024-01-01" }),
      lab({ id: "2", testName: "ldl-c", value: 98, observedAt: "2025-06-01" }),
      lab({ id: "3", testName: "HbA1c", value: 5.8, unit: "%", observedAt: "2025-06-01" }),
    ]);

    assert.equal(series.length, 2);
    const ldl = series.find((s) => s.testName.toLowerCase() === "ldl-c");
    assert.ok(ldl);
    assert.deepEqual(ldl.points, [120, 98]);
    assert.equal(ldl.latest.value, 98);
    assert.equal(ldl.history[0]?.id, "2");
  });

  it("skips blank test names", () => {
    assert.equal(groupLabsByTestName([lab({ id: "1", testName: "  ", value: 1 })]).length, 0);
  });
});

describe("uniqueFacilities", () => {
  it("dedupes case-insensitively and drops blanks", () => {
    assert.deepEqual(uniqueFacilities([" PIC ", "pic", "", "AKUH"]), ["PIC", "AKUH"]);
  });
});

describe("encounterYear", () => {
  it("reads calendar year from ISO date", () => {
    assert.equal(encounterYear("2025-03-03T10:00:00.000Z"), 2025);
  });
});
