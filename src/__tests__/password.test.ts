import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/password";

describe("Password Hashing & Verification", () => {
  it("should securely hash a password and verify matching plain text", async () => {
    const plain = "SuperSecret123!";
    const hashed = await hashPassword(plain);

    assert.ok(hashed.startsWith("$2"), "Hash should be a valid bcrypt string");
    assert.notEqual(hashed, plain, "Hash must not equal plain text");

    const isValid = await verifyPassword(plain, hashed);
    assert.equal(isValid, true, "Valid password should verify successfully");
  });

  it("should reject an incorrect password", async () => {
    const plain = "CorrectPassword123!";
    const wrong = "WrongPassword999!";
    const hashed = await hashPassword(plain);

    const isValid = await verifyPassword(wrong, hashed);
    assert.equal(isValid, false, "Wrong password must fail verification");
  });

  it("should produce different hashes for the same password due to salting", async () => {
    const plain = "ConstantPassword123!";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    assert.notEqual(hash1, hash2, "Hashes of the same password should differ due to unique salts");
    assert.equal(await verifyPassword(plain, hash1), true);
    assert.equal(await verifyPassword(plain, hash2), true);
  });

  it("should safely return false for empty or null password comparisons", async () => {
    assert.equal(await verifyPassword("", "$2a$10$dummyhashvaluehere"), false);
    assert.equal(await verifyPassword("Password123!", ""), false);
  });
});
