import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCnic,
  isValidCnic,
  isValidPakistanPhone,
  normalizeCnic,
  normalizePakistanPhone,
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
