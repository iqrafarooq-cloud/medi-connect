import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countHealthRecords, firstNameFrom, homeGreeting, homeHero, homePageCards } from "./home.ts";

describe("firstNameFrom", () => {
  it("uses the first word of a full name and falls back when empty", () => {
    assert.equal(firstNameFrom("Ali Hassan"), "Ali");
    assert.equal(firstNameFrom("  Sara  "), "Sara");
    assert.equal(firstNameFrom(""), "there");
    assert.equal(firstNameFrom(null), "there");
  });
});

describe("countHealthRecords", () => {
  it("sums glance counts and documents", () => {
    assert.equal(countHealthRecords(null), 0);
    assert.equal(
      countHealthRecords({
        conditions: { count: 1 },
        allergies: { count: 2 },
        medications: { count: 0 },
        surgeries: { count: 1 },
        documents: [{ id: "d1" }, { id: "d2" }],
      }),
      6,
    );
  });
});

describe("homeGreeting", () => {
  it("keeps the hello line short unless inbound or clinic-needed", () => {
    assert.equal(
      homeGreeting({ firstName: "Ali", hasQueue: true, remedySeverity: "severe", recordCount: 0 }).body,
      "The clinic can already see you inbound.",
    );
    assert.equal(
      homeGreeting({ firstName: "Ali", hasQueue: false, remedySeverity: "severe", recordCount: 4 }).body,
      "Your last check pointed to clinic care.",
    );
    assert.equal(
      homeGreeting({ firstName: "Ali", hasQueue: false, remedySeverity: null, recordCount: 0 }).body,
      "",
    );
    assert.equal(
      homeGreeting({ firstName: "Ali", hasQueue: false, remedySeverity: "watch", recordCount: 3 }).title,
      "Hello, Ali",
    );
  });
});

describe("homeHero", () => {
  it("uses the inbound queue as the hero when the patient is on the way", () => {
    const hero = homeHero({
      queue: { clinicName: "City Care", minutesLeft: 10, complaint: "fever" },
      remedy: { severity: "self_care", summary: "Rest today." },
    });
    assert.equal(hero.kind, "queue");
    assert.equal(hero.href, "/(app)/clinic");
    assert.match(hero.body, /10 min ETA/);
  });

  it("sends a severe check to Clinic when the patient is not already inbound", () => {
    const hero = homeHero({
      queue: null,
      remedy: { severity: "severe", summary: "This needs clinic care." },
    });
    assert.equal(hero.kind, "severe");
    assert.equal(hero.href, "/(app)/clinic");
    assert.equal(hero.body, "This needs clinic care.");
    assert.equal(hero.cta, "Open Clinic");
  });

  it("defaults to a symptom check", () => {
    const hero = homeHero({ queue: null, remedy: null });
    assert.equal(hero.kind, "check");
    assert.equal(hero.href, "/(app)/health/remedy");
    assert.equal(hero.cta, "Start check");
  });
});

describe("homePageCards", () => {
  it("builds one Health, Clinic, and Profile card with live one-liners", () => {
    const empty = homePageCards({
      recordCount: 0,
      queue: null,
      remedy: null,
    });
    assert.deepEqual(
      empty.map((card) => card.id),
      ["health", "clinic", "profile"],
    );
    assert.equal(empty[0]?.href, "/(app)/health");
    assert.equal(empty[1]?.href, "/(app)/clinic");
    assert.equal(empty[2]?.href, "/(app)/profile");
    assert.match(empty[0]?.body ?? "", /files/i);

    const filled = homePageCards({
      recordCount: 2,
      queue: { clinicName: "City Care", minutesLeft: 8, complaint: null },
      remedy: { severity: "watch", summary: "Keep watch tonight." },
    });
    assert.match(filled[0]?.body ?? "", /2 on file/);
    assert.match(filled[1]?.body ?? "", /City Care/);
  });

  it("surfaces a self-care plan on Health when there is no inbound queue", () => {
    const cards = homePageCards({
      recordCount: 4,
      queue: null,
      remedy: { severity: "self_care", summary: "Rest and fluids today." },
    });
    assert.equal(cards[0]?.body, "Rest and fluids today.");
  });
});
