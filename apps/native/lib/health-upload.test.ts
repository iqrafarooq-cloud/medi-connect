import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseUploadResponse } from "./health-upload.ts";

describe("parseUploadResponse", () => {
  it("returns the document id on success", () => {
    const result = parseUploadResponse(
      200,
      JSON.stringify({ document: { id: "doc-1" }, replayed: false }),
    );
    assert.deepEqual(result, { id: "doc-1", replayed: false });
  });

  it("throws the server error message", () => {
    assert.throws(
      () => parseUploadResponse(400, JSON.stringify({ error: "file is required" })),
      { message: "file is required" },
    );
  });

  it("does not surface a JSON parse error for HTML bodies", () => {
    assert.throws(() => parseUploadResponse(500, "<html>Internal Server Error</html>"), {
      message: "Upload failed",
    });
  });
});
