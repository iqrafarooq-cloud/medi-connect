import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SUPPORT_EMAIL,
  clinicLoginGate,
  isAdminEmail,
  registrationBlockedMessage,
} from "./clinic-verification.ts";

describe("isAdminEmail", () => {
  it("matches case-insensitively with trim", () => {
    assert.equal(isAdminEmail(" Admin@MediConnect.com ", "admin@mediconnect.com"), true);
  });

  it("rejects other emails", () => {
    assert.equal(isAdminEmail("clinic@example.com", "admin@mediconnect.com"), false);
  });
});

describe("clinicLoginGate", () => {
  const adminEmail = "admin@mediconnect.com";

  it("blocks admin email on clinic login", () => {
    const result = clinicLoginGate({
      email: adminEmail,
      adminEmail,
      clinicStatus: null,
    });
    assert.equal(result.allow, false);
    if (!result.allow) {
      assert.equal(result.reason, "admin");
      assert.match(result.message, /admin\/login/i);
    }
  });

  it("allows active clinics", () => {
    const result = clinicLoginGate({
      email: "clinic@example.com",
      adminEmail,
      clinicStatus: "active",
    });
    assert.equal(result.allow, true);
  });

  it("blocks pending verification", () => {
    const result = clinicLoginGate({
      email: "clinic@example.com",
      adminEmail,
      clinicStatus: "pending_verification",
    });
    assert.equal(result.allow, false);
    if (!result.allow) {
      assert.equal(result.reason, "pending");
      assert.match(result.message, /awaiting|verification/i);
    }
  });

  it("blocks rejected clinics with support email", () => {
    const result = clinicLoginGate({
      email: "clinic@example.com",
      adminEmail,
      clinicStatus: "rejected",
    });
    assert.equal(result.allow, false);
    if (!result.allow) {
      assert.equal(result.reason, "rejected");
      assert.match(result.message, /rejected/i);
      assert.match(result.message, new RegExp(SUPPORT_EMAIL));
    }
  });

  it("blocks accounts with no clinic profile", () => {
    const result = clinicLoginGate({
      email: "clinic@example.com",
      adminEmail,
      clinicStatus: null,
    });
    assert.equal(result.allow, false);
    if (!result.allow) {
      assert.equal(result.reason, "no_clinic");
    }
  });
});

describe("registrationBlockedMessage", () => {
  it("returns message for pending and rejected", () => {
    const pending = registrationBlockedMessage("pending_verification");
    const rejected = registrationBlockedMessage("rejected");
    assert.ok(pending);
    assert.ok(rejected);
    assert.match(pending!, /already registered but not approved/i);
    assert.match(rejected!, new RegExp(SUPPORT_EMAIL));
  });

  it("returns null for active or unknown", () => {
    assert.equal(registrationBlockedMessage("active"), null);
    assert.equal(registrationBlockedMessage(null), null);
  });
});
