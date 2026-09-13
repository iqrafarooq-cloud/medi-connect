import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCnic,
  isValidCnic,
  isValidPakistanPhone,
  maskCnicInput,
  normalizeCnic,
  normalizePakistanPhone,
  parseIsoDateOfBirth,
} from "./pakistan.ts";

describe("normalizeCnic", () => {
  it("accepts dashed CNIC", () => {
    assert.equal(normalizeCnic("42101-1234567-1"), "4210112345671");
  });
  it("rejects wrong length", () => {
    assert.equal(normalizeCnic("42101-123456-1"), null);
  });
  it("isValidCnic mirrors normalize", () => {
    assert.equal(isValidCnic("4210112345671"), true);
    assert.equal(isValidCnic("123"), false);
  });
  it("formats for display", () => {
    assert.equal(formatCnic("4210112345671"), "42101-1234567-1");
  });
  it("masks while typing", () => {
    assert.equal(maskCnicInput("421011"), "42101-1");
    assert.equal(maskCnicInput("4210112345671"), "42101-1234567-1");
  });
});

describe("normalizePakistanPhone", () => {
  it("normalizes 03xx", () => {
    assert.equal(normalizePakistanPhone("03001234567"), "+923001234567");
  });
  it("normalizes +92", () => {
    assert.equal(normalizePakistanPhone("+92 300 1234567"), "+923001234567");
  });
  it("normalizes bare 3xxxxxxxxx", () => {
    assert.equal(normalizePakistanPhone("3001234567"), "+923001234567");
  });
  it("rejects invalid", () => {
    assert.equal(normalizePakistanPhone("12345"), null);
    assert.equal(isValidPakistanPhone("0211234567"), false);
  });
});

describe("parseIsoDateOfBirth", () => {
  const now = new Date("2026-09-13T00:00:00.000Z");

  it("accepts a valid past date", () => {
    assert.equal(parseIsoDateOfBirth("1990-04-12", now), "1990-04-12");
  });
  it("rejects impossible calendar dates", () => {
    assert.equal(parseIsoDateOfBirth("2020-02-30", now), null);
  });
  it("rejects future dates", () => {
    assert.equal(parseIsoDateOfBirth("2026-09-14", now), null);
  });
  it("rejects ages over 120", () => {
    assert.equal(parseIsoDateOfBirth("1900-01-01", now), null);
  });
});

