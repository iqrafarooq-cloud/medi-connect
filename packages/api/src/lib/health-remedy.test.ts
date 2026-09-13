import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assembleRemedyHub,
  classifyRemedySeverity,
  defaultRemedySuggestions,
  rankNearbyClinics,
  remedyAnswersInput,
  REMEDY_QUESTIONS,
  sanitizeRemedySuggestions,
} from "./health-remedy.ts";

const mild = {
  complaint: "headache" as const,
  duration: "hours" as const,
  intensity: "mild" as const,
  fever: "none" as const,
  breathing: "ok" as const,
  chestPain: "no" as const,
  eatDrinkSleep: "yes" as const,
  energy: "normal" as const,
  alreadyTried: ["rest"] as const,
  rapidlyWorse: "no" as const,
};

describe("REMEDY_QUESTIONS", () => {
  it("asks exactly ten questions", () => {
    assert.equal(REMEDY_QUESTIONS.length, 10);
    assert.ok(REMEDY_QUESTIONS.every((item) => item.id && item.prompt && item.options.length > 0));
  });
});

describe("remedyAnswersInput", () => {
  it("accepts a complete set of answers", () => {
    const parsed = remedyAnswersInput.parse(mild);
    assert.equal(parsed.complaint, "headache");
  });

  it("rejects a missing complaint", () => {
    const { complaint: _, ...rest } = mild;
    assert.throws(() => remedyAnswersInput.parse(rest));
  });
});

describe("classifyRemedySeverity", () => {
  it("marks chest pain as severe", () => {
    assert.equal(classifyRemedySeverity({ ...mild, chestPain: "yes" }), "severe");
  });

  it("marks hard breathing as severe", () => {
    assert.equal(classifyRemedySeverity({ ...mild, breathing: "hard" }), "severe");
  });

  it("marks a severe case that is rapidly worse as severe", () => {
    assert.equal(
      classifyRemedySeverity({ ...mild, intensity: "severe", rapidlyWorse: "yes" }),
      "severe",
    );
  });

  it("keeps a mild headache as self-care", () => {
    assert.equal(classifyRemedySeverity(mild), "self_care");
  });

  it("watches a moderate case without red flags", () => {
    assert.equal(classifyRemedySeverity({ ...mild, intensity: "moderate" }), "watch");
  });
});

describe("sanitizeRemedySuggestions", () => {
  it("drops medicine and dose language", () => {
    const kept = sanitizeRemedySuggestions([
      { kind: "rest", title: "Lie down", detail: "Rest in a dark, quiet room." },
      { kind: "rest", title: "Take paracetamol", detail: "500 mg tablet twice daily." },
      { kind: "movement", title: "Walk", detail: "A slow 10-minute walk if you can." },
    ]);
    assert.equal(kept.length, 2);
    assert.deepEqual(
      kept.map((item) => item.title),
      ["Lie down", "Walk"],
    );
  });

  it("fills safe defaults when every suggestion is medical", () => {
    const kept = sanitizeRemedySuggestions(
      [{ kind: "rest", title: "Ibuprofen", detail: "Take a dose of antibiotic syrup." }],
      mild,
    );
    assert.ok(kept.length > 0);
    assert.ok(kept.every((item) => !/paracetamol|ibuprofen|antibiotic|tablet|mg|dose/i.test(`${item.title} ${item.detail}`)));
  });

  it("returns no lifestyle tips when the case is severe", () => {
    const kept = sanitizeRemedySuggestions(
      [{ kind: "rest", title: "Lie down", detail: "Rest in a dark, quiet room." }],
      mild,
      "severe",
    );
    assert.deepEqual(kept, []);
  });
});

describe("defaultRemedySuggestions", () => {
  it("never returns a medicine kind", () => {
    const kinds = defaultRemedySuggestions("self_care", mild).map((item) => item.kind);
    assert.ok(kinds.every((kind) => ["rest", "movement", "hydration", "nutrition", "sleep"].includes(kind)));
  });
});

describe("rankNearbyClinics", () => {
  it("keeps only active clinics and sorts by distance", () => {
    const ranked = rankNearbyClinics(
      [
        {
          id: "lahore",
          name: "Lahore Clinic",
          type: "clinic",
          address: "Mall Road",
          city: "Lahore",
          phone: "0421111111",
          status: "active",
          latitude: 31.52,
          longitude: 74.35,
        },
        {
          id: "pending",
          name: "Pending Clinic",
          type: "clinic",
          address: "Near you",
          city: "Karachi",
          phone: "0210000000",
          status: "pending_verification",
          latitude: 24.87,
          longitude: 67.03,
        },
        {
          id: "karachi",
          name: "Seaview Clinic",
          type: "clinic",
          address: "Clifton",
          city: "Karachi",
          phone: "0212222222",
          status: "active",
          latitude: 24.87,
          longitude: 67.03,
        },
      ],
      { latitude: 24.86, longitude: 67.0 },
      3,
    );
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.id, "karachi");
    assert.equal(ranked[1]?.id, "lahore");
    assert.ok((ranked[0]?.distanceKm ?? 99) < (ranked[1]?.distanceKm ?? 0));
  });
});

describe("assembleRemedyHub", () => {
  it("hides clinics until the last check is severe", () => {
    const empty = assembleRemedyHub({ last: null, clinics: [] });
    assert.equal(empty.last, null);
    assert.equal(empty.clinics.length, 0);

    const watch = assembleRemedyHub({
      last: {
        id: "1",
        severity: "watch",
        summary: "Rest and fluids",
        suggestions: defaultRemedySuggestions("watch", mild),
        createdAt: "2026-09-13T00:00:00.000Z",
      },
      clinics: [
        {
          id: "karachi",
          name: "Seaview Clinic",
          type: "clinic",
          address: "Clifton",
          city: "Karachi",
          phone: "0212222222",
          distanceKm: 1.2,
        },
      ],
    });
    assert.equal(watch.clinics.length, 0);
    assert.equal(watch.last?.severity, "watch");

    const severe = assembleRemedyHub({
      last: {
        id: "2",
        severity: "severe",
        summary: "Contact a clinic",
        suggestions: [],
        createdAt: "2026-09-13T00:00:00.000Z",
      },
      clinics: watch.clinics.length
        ? []
        : [
            {
              id: "karachi",
              name: "Seaview Clinic",
              type: "clinic",
              address: "Clifton",
              city: "Karachi",
              phone: "0212222222",
              distanceKm: 1.2,
            },
          ],
    });
    assert.equal(severe.clinics.length, 1);
    assert.equal(severe.clinics[0]?.name, "Seaview Clinic");
  });
});
