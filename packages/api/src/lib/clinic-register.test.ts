import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registerProfileInput } from "./clinic-register.ts";

describe("registerProfileInput", () => {
  const base = {
    name: "Shifa Clinic",
    type: "clinic" as const,
    address: "Gulberg III, Lahore, Punjab, Pakistan",
    city: "Lahore",
    latitude: 31.5204,
    longitude: 74.3587,
    ownerName: "Dr. Ayesha",
    phone: "03001234567",
    licenseNumber: "PMC-12345",
  };

  it("accepts a pin with formatted address and city", () => {
    const parsed = registerProfileInput.parse(base);
    assert.equal(parsed.latitude, 31.5204);
    assert.equal(parsed.longitude, 74.3587);
    assert.equal(parsed.city, "Lahore");
  });

  it("rejects missing coordinates", () => {
    assert.throws(() =>
      registerProfileInput.parse({
        ...base,
        latitude: undefined,
        longitude: undefined,
      }),
    );
  });

  it("rejects out-of-range latitude", () => {
    assert.throws(() => registerProfileInput.parse({ ...base, latitude: 91 }));
  });

  it("rejects out-of-range longitude", () => {
    assert.throws(() => registerProfileInput.parse({ ...base, longitude: -181 }));
  });

  it("rejects short address", () => {
    assert.throws(() => registerProfileInput.parse({ ...base, address: "ab" }));
  });
});
