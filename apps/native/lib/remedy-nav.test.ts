import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { finishRemedy, remedyResultNav } from "./remedy-nav.ts";

describe("remedyResultNav", () => {
  it("keeps self-care and watch on Health and sends clinic care to Clinic", () => {
    assert.deepEqual(remedyResultNav("self_care"), { label: "Done", after: "health" });
    assert.deepEqual(remedyResultNav("watch"), { label: "Done", after: "health" });
    assert.deepEqual(remedyResultNav("severe"), { label: "Find a clinic", after: "clinic" });
  });

  it("clears the Health form before opening Clinic", () => {
    const calls: string[] = [];
    const router = {
      canDismiss: () => true,
      dismissTo: (href: string) => calls.push(`dismiss:${href}`),
      replace: (href: string) => calls.push(`replace:${href}`),
      navigate: (href: { pathname: string }) => calls.push(`navigate:${href.pathname}`),
    };
    finishRemedy(router, "clinic");
    assert.deepEqual(calls, ["dismiss:/(app)/health", "navigate:/(app)/clinic"]);
  });

  it("returns to the Health hub when the check is done", () => {
    const calls: string[] = [];
    const router = {
      canDismiss: () => false,
      dismissTo: (href: string) => calls.push(`dismiss:${href}`),
      replace: (href: string) => calls.push(`replace:${href}`),
      navigate: (href: { pathname: string }) => calls.push(`navigate:${href.pathname}`),
    };
    finishRemedy(router, "health");
    assert.deepEqual(calls, ["replace:/(app)/health"]);
  });
});
