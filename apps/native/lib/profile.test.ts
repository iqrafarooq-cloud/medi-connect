import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatActivityWhen, initialsFromName, profileStatsLine } from "./profile.ts";

describe("initialsFromName", () => {
  it("uses first and last letters of a two-part name", () => {
    assert.equal(initialsFromName("Ayesha Khan"), "AK");
  });

  it("uses the first two letters of a single name", () => {
    assert.equal(initialsFromName("Omar"), "OM");
  });

  it("returns a placeholder when the name is blank", () => {
    assert.equal(initialsFromName("   "), "?");
  });
});

describe("formatActivityWhen", () => {
  const now = new Date("2026-09-13T18:00:00+05:00");

  it("labels the current day as today with a time", () => {
    assert.match(formatActivityWhen("2026-09-13T08:15:00+05:00", now), /^Today,/);
  });

  it("labels the previous calendar day as yesterday", () => {
    assert.equal(formatActivityWhen("2026-09-12T22:00:00+05:00", now), "Yesterday");
  });

  it("keeps the year off for dates in the current year", () => {
    const label = formatActivityWhen("2026-03-02T00:00:00+05:00", now);
    assert.equal(label.includes("2026"), false);
    assert.match(label, /Mar/);
  });
});

describe("profileStatsLine", () => {
  it("pluralizes record, clinic, and check counts", () => {
    assert.equal(
      profileStatsLine({ records: 4, visits: 1, checks: 0 }),
      "4 records · 1 clinic · 0 checks",
    );
  });
});
