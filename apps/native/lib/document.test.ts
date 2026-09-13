import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canPreviewDocument, healthItemHref, isPdfDocument } from "./document.ts";

describe("document helpers", () => {
  it("treats application/pdf and .pdf names as PDFs", () => {
    assert.equal(isPdfDocument("application/pdf", "note.txt"), true);
    assert.equal(isPdfDocument("text/plain", "labs.pdf"), true);
    assert.equal(isPdfDocument("image/png", "scan.png"), false);
  });

  it("opens documents in the in-app viewer", () => {
    assert.deepEqual(healthItemHref("document", "abc"), {
      pathname: "/(app)/health/view/[id]",
      params: { id: "abc" },
    });
    assert.deepEqual(healthItemHref("medication", "m1"), {
      pathname: "/(app)/health/detail/[kind]/[id]",
      params: { kind: "medication", id: "m1" },
    });
    assert.equal(canPreviewDocument("application/pdf", "a.pdf"), true);
  });
});
