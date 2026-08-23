import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loginSchema, registerPatientSchema, createDoctorSchema } from "../validation/auth";

describe("Authentication Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should accept valid email and password", () => {
      const result = loginSchema.safeParse({
        email: "patient.doe@example.com",
        password: "ValidPassword123!",
      });
      assert.equal(result.success, true);
    });

    it("should reject invalid email format", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "ValidPassword123!",
      });
      assert.equal(result.success, false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "patient.doe@example.com",
        password: "",
      });
      assert.equal(result.success, false);
    });
  });

  describe("registerPatientSchema", () => {
    it("should accept valid patient registration payload", () => {
      const result = registerPatientSchema.safeParse({
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: "SecurePassword1!",
        phone: "+1-555-0144",
        gender: "Female",
        emergencyContact: "Bob Smith",
        medicalHistory: "Asthma",
      });
      assert.equal(result.success, true);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = registerPatientSchema.safeParse({
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: "Pass1!",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) => i.message.includes("8 characters"))
        );
      }
    });

    it("should reject password missing uppercase letter", () => {
      const result = registerPatientSchema.safeParse({
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: "password123!",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) => i.message.includes("uppercase letter"))
        );
      }
    });

    it("should reject password missing number", () => {
      const result = registerPatientSchema.safeParse({
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: "PasswordWithoutNumber!",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) => i.message.includes("number"))
        );
      }
    });
  });

  describe("createDoctorSchema", () => {
    it("should accept valid doctor payload", () => {
      const result = createDoctorSchema.safeParse({
        name: "Dr. Gregory House",
        email: "house@example.com",
        password: "Diagnostic123!",
        specialization: "Diagnostics",
        bio: "Department head",
        slotDurationMins: 45,
      });
      assert.equal(result.success, true);
    });

    it("should reject invalid slot durations outside [10, 120]", () => {
      const resultLow = createDoctorSchema.safeParse({
        name: "Dr. Fast",
        email: "fast@example.com",
        password: "Password123!",
        specialization: "General",
        slotDurationMins: 5,
      });
      assert.equal(resultLow.success, false);

      const resultHigh = createDoctorSchema.safeParse({
        name: "Dr. Slow",
        email: "slow@example.com",
        password: "Password123!",
        specialization: "General",
        slotDurationMins: 200,
      });
      assert.equal(resultHigh.success, false);
    });
  });
});
