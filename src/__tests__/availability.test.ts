import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDaySlots } from "../services/availability";
import { createDateTime } from "../lib/date-utils";

describe("Authoritative Slot Availability Engine", () => {
  const futureDateStr = "2028-06-15";
  const pastRefDate = new Date("2028-06-01T00:00:00Z");

  it("should generate exact 30-minute slots between 09:00 and 17:00 (16 slots)", () => {
    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "17:00",
      slotDurationMins: 30,
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 16, "09:00 to 17:00 with 30m slots should produce 16 slots");
    assert.equal(slots[0].formattedTime, "09:00 - 09:30");
    assert.equal(slots[slots.length - 1].formattedTime, "16:30 - 17:00");
    assert.ok(slots.every((s) => s.available === true), "All future slots should be available");
  });

  it("should generate exact 15-minute slots between 09:00 and 11:00 (8 slots)", () => {
    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "11:00",
      slotDurationMins: 15,
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 8);
    assert.equal(slots[0].formattedTime, "09:00 - 09:15");
    assert.equal(slots[7].formattedTime, "10:45 - 11:00");
  });

  it("should truncate trailing partial slots that exceed doctor endTime", () => {
    // 09:00 to 10:00 with 45-min slots: 09:00-09:45 fits, next 09:45-10:30 exceeds 10:00
    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "10:00",
      slotDurationMins: 45,
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 1);
    assert.equal(slots[0].formattedTime, "09:00 - 09:45");
  });

  it("should mark full-day leave intervals as unavailable with LEAVE reason", () => {
    const leaveStarts = createDateTime(futureDateStr, "00:00");
    const leaveEnds = createDateTime(futureDateStr, "23:59");

    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "17:00",
      slotDurationMins: 30,
      leaves: [{ startsAt: leaveStarts, endsAt: leaveEnds }],
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 16);
    assert.ok(slots.every((s) => s.available === false));
    assert.ok(slots.every((s) => s.reason === "LEAVE"));
  });

  it("should mark only overlapping slots as unavailable during partial doctor leave", () => {
    // Leave from 10:00 to 12:00
    const leaveStarts = createDateTime(futureDateStr, "10:00");
    const leaveEnds = createDateTime(futureDateStr, "12:00");

    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "14:00", // 10 slots
      slotDurationMins: 30,
      leaves: [{ startsAt: leaveStarts, endsAt: leaveEnds }],
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 10);

    // 09:00-09:30 and 09:30-10:00 -> available
    assert.equal(slots[0].available, true);
    assert.equal(slots[1].available, true);

    // 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00 -> LEAVE
    assert.equal(slots[2].available, false);
    assert.equal(slots[2].reason, "LEAVE");
    assert.equal(slots[3].available, false);
    assert.equal(slots[3].reason, "LEAVE");
    assert.equal(slots[4].available, false);
    assert.equal(slots[4].reason, "LEAVE");
    assert.equal(slots[5].available, false);
    assert.equal(slots[5].reason, "LEAVE");

    // 12:00-12:30 -> available
    assert.equal(slots[6].available, true);
  });

  it("should mark existing confirmed appointments as BOOKED", () => {
    const apptStarts = createDateTime(futureDateStr, "10:00");
    const apptEnds = createDateTime(futureDateStr, "10:30");

    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "11:00",
      slotDurationMins: 30,
      appointments: [{ startsAt: apptStarts, endsAt: apptEnds, status: "CONFIRMED" }],
      referenceNow: pastRefDate,
    });

    assert.equal(slots.length, 4);
    assert.equal(slots[0].available, true); // 09:00-09:30
    assert.equal(slots[1].available, true); // 09:30-10:00
    assert.equal(slots[2].available, false); // 10:00-10:30
    assert.equal(slots[2].reason, "BOOKED");
    assert.equal(slots[3].available, true); // 10:30-11:00
  });

  it("should not block slots for CANCELLED appointments", () => {
    const apptStarts = createDateTime(futureDateStr, "10:00");
    const apptEnds = createDateTime(futureDateStr, "10:30");

    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "11:00",
      slotDurationMins: 30,
      appointments: [{ startsAt: apptStarts, endsAt: apptEnds, status: "CANCELLED" }],
      referenceNow: pastRefDate,
    });

    assert.equal(slots[2].available, true, "Cancelled appointment slot must remain available");
  });

  it("should mark slots in the past as PAST", () => {
    // Current time is 10:15
    const nowRef = createDateTime(futureDateStr, "10:15");

    const slots = computeDaySlots({
      dateStr: futureDateStr,
      startTime: "09:00",
      endTime: "12:00",
      slotDurationMins: 30,
      referenceNow: nowRef,
    });

    // 09:00-09:30 (starts <= 10:15) -> PAST
    assert.equal(slots[0].available, false);
    assert.equal(slots[0].reason, "PAST");

    // 09:30-10:00 (starts <= 10:15) -> PAST
    assert.equal(slots[1].available, false);
    assert.equal(slots[1].reason, "PAST");

    // 10:00-10:30 (starts <= 10:15) -> PAST
    assert.equal(slots[2].available, false);
    assert.equal(slots[2].reason, "PAST");

    // 10:30-11:00 (starts 10:30 > 10:15) -> available
    assert.equal(slots[3].available, true);
  });
});
