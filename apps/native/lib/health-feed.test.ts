import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHealthFeed, filterHealthFeed, parseRecordFilter } from "./health-feed.ts";

const sample = {
  diagnoses: [
    {
      id: "c1",
      name: "Asthma",
      status: "current",
      diagnosedAt: "2024-03-12T00:00:00.000Z",
      createdAt: "2024-03-12T00:00:00.000Z",
    },
  ],
  allergies: [
    {
      id: "a1",
      substance: "Penicillin",
      allergyType: "medication",
      severity: "high",
      createdAt: "2025-01-02T00:00:00.000Z",
    },
  ],
  medications: [
    {
      id: "m1",
      name: "Metformin",
      dose: "500 mg",
      frequency: "BID",
      status: "active",
      startedAt: "2025-06-01T00:00:00.000Z",
      createdAt: "2025-06-01T00:00:00.000Z",
    },
  ],
  procedures: [
    {
      id: "s1",
      name: "Appendectomy",
      facility: "City Hospital",
      performedAt: "2019-06-02T00:00:00.000Z",
      createdAt: "2019-06-02T00:00:00.000Z",
    },
  ],
  documents: [
    {
      id: "d1",
      originalFilename: "labs.pdf",
      ingestionStatus: "processing",
      encounterDate: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
};

describe("parseRecordFilter", () => {
  it("accepts a valid type", () => {
    assert.equal(parseRecordFilter("allergy"), "allergy");
  });

  it("falls back to all for unknown values", () => {
    assert.equal(parseRecordFilter("nope"), "all");
    assert.equal(parseRecordFilter(["medication"]), "medication");
  });
});

describe("buildHealthFeed", () => {
  it("merges every record type and sorts newest first", () => {
    const feed = buildHealthFeed(sample);
    assert.equal(feed.length, 5);
    assert.deepEqual(
      feed.map((item) => item.type),
      ["document", "medication", "allergy", "condition", "surgery"],
    );
    assert.equal(feed[2]?.danger, true);
    assert.equal(feed[0]?.status, "processing");
  });
});

describe("filterHealthFeed", () => {
  it("keeps only the selected type", () => {
    const feed = buildHealthFeed(sample);
    const allergies = filterHealthFeed(feed, "allergy");
    assert.equal(allergies.length, 1);
    assert.equal(allergies[0]?.title, "Penicillin");
  });

  it("returns the full feed for all", () => {
    const feed = buildHealthFeed(sample);
    assert.equal(filterHealthFeed(feed, "all").length, 5);
  });
});
