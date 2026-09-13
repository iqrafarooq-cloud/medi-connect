import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { installCryptoPolyfill } from "./crypto-polyfill.ts";

describe("installCryptoPolyfill", () => {
  it("adds randomUUID when crypto is missing", () => {
    const host: { crypto?: { randomUUID?: () => string } } = {};
    installCryptoPolyfill(host, {
      getRandomValues: (values) => values,
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(host.crypto?.randomUUID?.(), "11111111-1111-4111-8111-111111111111");
  });

  it("does not replace an existing randomUUID", () => {
    const host = {
      crypto: {
        randomUUID: () => "already-there",
        getRandomValues: (values: ArrayBufferView) => values,
      },
    };
    installCryptoPolyfill(host, {
      getRandomValues: (values) => values,
      randomUUID: () => "polyfill",
    });
    assert.equal(host.crypto.randomUUID(), "already-there");
  });
});
