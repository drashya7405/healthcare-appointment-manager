import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  listAppointmentsQuerySchema,
} from "../validation/appointment";

describe("Appointment Validation Schemas", () => {
  describe("createAppointmentSchema", () => {
    it("should accept valid appointment booking payload", () => {
      const result = createAppointmentSchema.safeParse({
        doctorId: "doc_123",
        startsAt: "2026-08-25T10:00:00.000Z",
        symptoms: "Severe headache and light sensitivity for 2 days.",
      });

      assert.equal(result.success, true);
    });

    it("should reject missing doctorId", () => {
      const result = createAppointmentSchema.safeParse({
        doctorId: "",
        startsAt: "2026-08-25T10:00:00.000Z",
        symptoms: "Headache",
      });

      assert.equal(result.success, false);
    });

    it("should reject symptoms with less than 3 characters", () => {
      const result = createAppointmentSchema.safeParse({
        doctorId: "doc_123",
        startsAt: "2026-08-25T10:00:00.000Z",
        symptoms: "ab",
      });

      assert.equal(result.success, false);
    });

    it("should reject invalid date string", () => {
      const result = createAppointmentSchema.safeParse({
        doctorId: "doc_123",
        startsAt: "invalid-date",
        symptoms: "Persistent fever",
      });

      assert.equal(result.success, false);
    });
  });

  describe("cancelAppointmentSchema", () => {
    it("should accept optional reason", () => {
      const withReason = cancelAppointmentSchema.safeParse({ reason: "Feeling better" });
      const withoutReason = cancelAppointmentSchema.safeParse({});

      assert.equal(withReason.success, true);
      assert.equal(withoutReason.success, true);
    });
  });

  describe("rescheduleAppointmentSchema", () => {
    it("should accept valid new startsAt date and optional reason", () => {
      const result = rescheduleAppointmentSchema.safeParse({
        newStartsAt: "2026-08-26T11:00:00.000Z",
        reason: "Conflict with personal schedule",
      });

      assert.equal(result.success, true);
    });

    it("should reject invalid new date", () => {
      const result = rescheduleAppointmentSchema.safeParse({
        newStartsAt: "not-a-date",
      });

      assert.equal(result.success, false);
    });
  });

  describe("listAppointmentsQuerySchema", () => {
    it("should accept valid filters", () => {
      const result = listAppointmentsQuerySchema.safeParse({
        doctorId: "doc_1",
        status: "CONFIRMED",
        from: "2026-08-01",
        to: "2026-08-31",
      });

      assert.equal(result.success, true);
    });
  });
});
