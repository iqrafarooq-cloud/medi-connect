import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveNativeServerUrl } from "./server-url.ts";

describe("resolveNativeServerUrl", () => {
  it("keeps localhost on web", () => {
    assert.equal(
      resolveNativeServerUrl({
        envUrl: "http://localhost:3001",
        hostUri: "192.168.1.20:8081",
        platform: "web",
      }),
      "http://localhost:3001",
    );
  });

  it("replaces localhost with the Expo bundler host on native", () => {
    assert.equal(
      resolveNativeServerUrl({
        envUrl: "http://localhost:3001",
        hostUri: "192.168.1.20:8081",
        platform: "ios",
      }),
      "http://192.168.1.20:3001",
    );
  });

  it("maps Android emulator localhost to 10.0.2.2", () => {
    assert.equal(
      resolveNativeServerUrl({
        envUrl: "http://localhost:3001",
        hostUri: "localhost:8081",
        platform: "android",
      }),
      "http://10.0.2.2:3001",
    );
  });

  it("leaves a deployed API URL unchanged", () => {
    assert.equal(
      resolveNativeServerUrl({
        envUrl: "https://api.mediconnect.example",
        hostUri: "192.168.1.20:8081",
        platform: "ios",
      }),
      "https://api.mediconnect.example",
    );
  });
});
