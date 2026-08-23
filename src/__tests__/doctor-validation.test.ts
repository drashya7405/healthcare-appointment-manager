import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DayOfWeek } from "@prisma/client";
import {
  workingHourItemSchema,
  setWorkingHoursSchema,
  createLeaveSchema,
  availabilityQuerySchema,
} from "../validation/doctor";

describe("Doctor Validation Schemas", () => {
  describe("workingHourItemSchema", () => {
    it("should accept valid working hours", () => {
      const result = workingHourItemSchema.safeParse({
        day: DayOfWeek.MONDAY,
        startTime: "09:00",
        endTime: "17:00",
      });
      assert.equal(result.success, true);
    });

    it("should reject working hours where startTime >= endTime", () => {
      const resultInverted = workingHourItemSchema.safeParse({
        day: DayOfWeek.MONDAY,
        startTime: "17:00",
        endTime: "09:00",
      });
      assert.equal(resultInverted.success, false);

      const resultEqual = workingHourItemSchema.safeParse({
        day: DayOfWeek.MONDAY,
        startTime: "10:00",
        endTime: "10:00",
      });
      assert.equal(resultEqual.success, false);
    });

    it("should reject invalid time format strings", () => {
      const result = workingHourItemSchema.safeParse({
        day: DayOfWeek.MONDAY,
        startTime: "9:00", // missing leading zero
        endTime: "17:00",
      });
      assert.equal(result.success, false);
    });
  });

  describe("setWorkingHoursSchema", () => {
    it("should accept an array of valid working hours", () => {
      const result = setWorkingHoursSchema.safeParse({
        workingHours: [
          { day: DayOfWeek.MONDAY, startTime: "09:00", endTime: "17:00" },
          { day: DayOfWeek.TUESDAY, startTime: "10:00", endTime: "18:00" },
        ],
      });
      assert.equal(result.success, true);
    });
  });

  describe("createLeaveSchema", () => {
    it("should accept valid leave intervals", () => {
      const result = createLeaveSchema.safeParse({
        startsAt: "2026-09-01T09:00:00Z",
        endsAt: "2026-09-05T17:00:00Z",
        reason: "Annual medical conference",
      });
      assert.equal(result.success, true);
    });

    it("should reject leave intervals where startsAt >= endsAt", () => {
      const result = createLeaveSchema.safeParse({
        startsAt: "2026-09-05T17:00:00Z",
        endsAt: "2026-09-01T09:00:00Z",
        reason: "Invalid dates",
      });
      assert.equal(result.success, false);
    });
  });

  describe("availabilityQuerySchema", () => {
    it("should accept valid YYYY-MM-DD date query", () => {
      const result = availabilityQuerySchema.safeParse({
        date: "2026-08-25",
      });
      assert.equal(result.success, true);
    });

    it("should reject malformed date strings", () => {
      const result = availabilityQuerySchema.safeParse({
        date: "25-08-2026",
      });
      assert.equal(result.success, false);
    });
  });
});
