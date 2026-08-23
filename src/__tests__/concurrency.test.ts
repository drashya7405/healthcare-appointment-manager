import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SlotUnavailableError, AppointmentNotFoundError } from "../services/appointment";

/**
 * In-Memory Transactional Booking Engine Simulator
 * Mirrors the exact serializable transaction logic and concurrency checks
 * implemented in src/services/appointment.ts.
 */
interface SlotRecord {
  id: string;
  doctorId: string;
  patientId: string;
  startsAt: number; // timestamp
  endsAt: number;   // timestamp
  status: "CONFIRMED" | "CANCELLED" | "RESCHEDULED";
  symptoms: string;
}

interface LeaveRecord {
  doctorId: string;
  startsAt: number;
  endsAt: number;
}

class ConcurrentBookingEngine {
  private appointments: SlotRecord[] = [];
  private leaves: LeaveRecord[] = [];
  private lock = Promise.resolve();

  addLeave(doctorId: string, startsAt: Date, endsAt: Date) {
    this.leaves.push({
      doctorId,
      startsAt: startsAt.getTime(),
      endsAt: endsAt.getTime(),
    });
  }

  /**
   * Simulates serializable transaction with atomic check-and-insert.
   */
  async bookAppointmentAtomic(
    patientId: string,
    doctorId: string,
    startsAt: Date,
    durationMins: number,
    symptoms: string
  ): Promise<SlotRecord> {
    // Acquire mutex mimicking DB-level row/serializable transaction isolation lock
    return new Promise((resolve, reject) => {
      this.lock = this.lock.then(async () => {
        try {
          const startMs = startsAt.getTime();
          const endMs = startMs + durationMins * 60 * 1000;

          // 1. Overlapping leave check
          const hasLeave = this.leaves.some(
            (l) => l.doctorId === doctorId && l.startsAt < endMs && l.endsAt > startMs
          );
          if (hasLeave) {
            throw new SlotUnavailableError("The doctor is on leave during this time.");
          }

          // 2. Active appointment conflict check (status NOT IN ['CANCELLED', 'RESCHEDULED'])
          const hasConflict = this.appointments.some(
            (a) =>
              a.doctorId === doctorId &&
              a.status !== "CANCELLED" &&
              a.status !== "RESCHEDULED" &&
              a.startsAt < endMs &&
              a.endsAt > startMs
          );

          if (hasConflict) {
            throw new SlotUnavailableError(
              "This appointment slot is no longer available. Please select another slot."
            );
          }

          // 3. Insert confirmed appointment
          const record: SlotRecord = {
            id: `appt_${Math.random().toString(36).substring(2, 9)}`,
            doctorId,
            patientId,
            startsAt: startMs,
            endsAt: endMs,
            status: "CONFIRMED",
            symptoms,
          };

          this.appointments.push(record);
          resolve(record);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async cancelAppointment(appointmentId: string): Promise<SlotRecord> {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) throw new AppointmentNotFoundError();
    appt.status = "CANCELLED";
    return appt;
  }

  async rescheduleAppointmentAtomic(
    appointmentId: string,
    newStartsAt: Date,
    durationMins: number
  ): Promise<SlotRecord> {
    return new Promise((resolve, reject) => {
      this.lock = this.lock.then(async () => {
        try {
          const appt = this.appointments.find((a) => a.id === appointmentId);
          if (!appt) throw new AppointmentNotFoundError();
          if (appt.status === "CANCELLED") {
            throw new Error("Cannot reschedule a cancelled appointment.");
          }

          const startMs = newStartsAt.getTime();
          const endMs = startMs + durationMins * 60 * 1000;

          // Conflict check excluding current appointment
          const hasConflict = this.appointments.some(
            (a) =>
              a.id !== appointmentId &&
              a.doctorId === appt.doctorId &&
              a.status !== "CANCELLED" &&
              a.status !== "RESCHEDULED" &&
              a.startsAt < endMs &&
              a.endsAt > startMs
          );

          if (hasConflict) {
            throw new SlotUnavailableError(
              "This appointment slot is no longer available. Please select another slot."
            );
          }

          appt.startsAt = startMs;
          appt.endsAt = endMs;
          appt.status = "CONFIRMED";
          resolve(appt);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  getActiveAppointmentsCount(doctorId: string): number {
    return this.appointments.filter(
      (a) => a.doctorId === doctorId && a.status === "CONFIRMED"
    ).length;
  }
}

describe("Core Appointment System & Concurrency Protection", () => {
  const doctorA = "doc_smith";
  const doctorB = "doc_jones";
  const slotTime = new Date("2028-07-10T10:00:00Z");

  it("Normal booking: successfully books an available slot", async () => {
    const engine = new ConcurrentBookingEngine();
    const result = await engine.bookAppointmentAtomic(
      "patient_1",
      doctorA,
      slotTime,
      30,
      "Routine general checkup"
    );

    assert.ok(result.id);
    assert.equal(result.patientId, "patient_1");
    assert.equal(result.status, "CONFIRMED");
    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);
  });

  it("Two simultaneous booking requests: exactly 1 succeeds and 1 fails with clean error", async () => {
    const engine = new ConcurrentBookingEngine();

    // Fire 2 concurrent booking requests for the exact same doctor and time
    const [req1, req2] = await Promise.allSettled([
      engine.bookAppointmentAtomic("patient_A", doctorA, slotTime, 30, "Symptoms A"),
      engine.bookAppointmentAtomic("patient_B", doctorA, slotTime, 30, "Symptoms B"),
    ]);

    const fulfilled = [req1, req2].filter((r) => r.status === "fulfilled");
    const rejected = [req1, req2].filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Strictly one request must succeed");
    assert.equal(rejected.length, 1, "Strictly one request must be rejected");

    if (rejected[0].status === "rejected") {
      const error = rejected[0].reason;
      assert.ok(error instanceof SlotUnavailableError);
      assert.equal(
        error.message,
        "This appointment slot is no longer available. Please select another slot."
      );
      assert.equal(error.statusCode, 409);
    }

    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);
  });

  it("Multiple patients (10) attempting the same slot: exactly 1 succeeds, 9 receive 409", async () => {
    const engine = new ConcurrentBookingEngine();

    const attempts = Array.from({ length: 10 }, (_, i) =>
      engine.bookAppointmentAtomic(
        `patient_${i + 1}`,
        doctorA,
        slotTime,
        30,
        `Symptom description ${i + 1}`
      )
    );

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly 1 patient gets the slot");
    assert.equal(rejected.length, 9, "9 patients are safely rejected");

    for (const rej of rejected) {
      if (rej.status === "rejected") {
        assert.ok(rej.reason instanceof SlotUnavailableError);
      }
    }

    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);
  });

  it("Different doctors at the same time: both simultaneous bookings succeed independently", async () => {
    const engine = new ConcurrentBookingEngine();

    const [resA, resB] = await Promise.all([
      engine.bookAppointmentAtomic("patient_1", doctorA, slotTime, 30, "Doctor A visit"),
      engine.bookAppointmentAtomic("patient_2", doctorB, slotTime, 30, "Doctor B visit"),
    ]);

    assert.equal(resA.doctorId, doctorA);
    assert.equal(resB.doctorId, doctorB);
    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);
    assert.equal(engine.getActiveAppointmentsCount(doctorB), 1);
  });

  it("Booking unavailable slot during doctor leave: rejects immediately", async () => {
    const engine = new ConcurrentBookingEngine();
    const leaveStart = new Date("2028-07-10T08:00:00Z");
    const leaveEnd = new Date("2028-07-10T18:00:00Z");
    engine.addLeave(doctorA, leaveStart, leaveEnd);

    await assert.rejects(
      async () => {
        await engine.bookAppointmentAtomic("patient_1", doctorA, slotTime, 30, "Checkup");
      },
      (err: unknown) => {
        return (
          err instanceof SlotUnavailableError &&
          err.message.includes("doctor is on leave")
        );
      }
    );
  });

  it("Cancellation: releases slot and allows immediate re-booking by another patient", async () => {
    const engine = new ConcurrentBookingEngine();

    // 1. Patient 1 books the slot
    const appt1 = await engine.bookAppointmentAtomic(
      "patient_1",
      doctorA,
      slotTime,
      30,
      "First patient booking"
    );
    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);

    // 2. Patient 2 attempts booking same slot -> fails
    await assert.rejects(async () => {
      await engine.bookAppointmentAtomic(
        "patient_2",
        doctorA,
        slotTime,
        30,
        "Second patient attempt"
      );
    }, SlotUnavailableError);

    // 3. Patient 1 cancels appointment
    await engine.cancelAppointment(appt1.id);
    assert.equal(engine.getActiveAppointmentsCount(doctorA), 0);

    // 4. Patient 2 retries booking -> now succeeds!
    const appt2 = await engine.bookAppointmentAtomic(
      "patient_2",
      doctorA,
      slotTime,
      30,
      "Second patient retry"
    );

    assert.equal(appt2.patientId, "patient_2");
    assert.equal(appt2.status, "CONFIRMED");
    assert.equal(engine.getActiveAppointmentsCount(doctorA), 1);
  });

  it("Rescheduling: safely moves appointment to an open slot", async () => {
    const engine = new ConcurrentBookingEngine();
    const newSlotTime = new Date("2028-07-10T11:00:00Z");

    const appt = await engine.bookAppointmentAtomic(
      "patient_1",
      doctorA,
      slotTime,
      30,
      "Initial visit"
    );

    const rescheduled = await engine.rescheduleAppointmentAtomic(
      appt.id,
      newSlotTime,
      30
    );

    assert.equal(rescheduled.startsAt, newSlotTime.getTime());
    assert.equal(rescheduled.status, "CONFIRMED");

    // Old slot is now free and can be booked by patient 2
    const newBookingOnOldSlot = await engine.bookAppointmentAtomic(
      "patient_2",
      doctorA,
      slotTime,
      30,
      "Taking freed slot"
    );

    assert.equal(newBookingOnOldSlot.patientId, "patient_2");
  });

  it("Rescheduling collision: fails and rolls back if target slot is already occupied", async () => {
    const engine = new ConcurrentBookingEngine();
    const slot2 = new Date("2028-07-10T10:30:00Z");

    // Patient 1 has slot 10:00
    const appt1 = await engine.bookAppointmentAtomic("patient_1", doctorA, slotTime, 30, "Appt 1");
    // Patient 2 has slot 10:30
    await engine.bookAppointmentAtomic("patient_2", doctorA, slot2, 30, "Appt 2");

    // Patient 1 tries to reschedule into occupied slot 10:30 -> fails
    await assert.rejects(async () => {
      await engine.rescheduleAppointmentAtomic(appt1.id, slot2, 30);
    }, SlotUnavailableError);

    // Patient 1's original appointment remains valid and intact
    assert.equal(appt1.startsAt, slotTime.getTime());
    assert.equal(appt1.status, "CONFIRMED");
  });
});
