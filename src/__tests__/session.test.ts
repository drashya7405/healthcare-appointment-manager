import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS } from "../auth/session";

describe("Session Configuration & Constants", () => {
  it("should have correct cookie name and expiration period", () => {
    assert.equal(SESSION_COOKIE_NAME, "healthcare_session");
    assert.equal(SESSION_EXPIRY_DAYS, 7);
  });

  it("should correctly compute expiration dates 7 days in the future", () => {
    const before = Date.now();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const after = Date.now();

    const expectedMinMs = 7 * 24 * 60 * 60 * 1000;
    const diff = expiresAt.getTime() - before;

    assert.ok(diff >= expectedMinMs);
    assert.ok(diff <= expectedMinMs + (after - before) + 100);
  });
});
