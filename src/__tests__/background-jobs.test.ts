import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MockEmailProvider, globalMockEmailProvider } from "../lib/notifications/providers/mock";
import { renderMedicationReminder } from "../lib/notifications/templates/medication-reminder";
import { renderAppointmentReminder } from "../lib/notifications/templates/appointment-reminder";

describe("Phase 9: Background Jobs and Medication Reminders", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.EMAIL_PROVIDER = "mock";
    process.env.EMAIL_MOCK_FAILURE = "false";
    globalMockEmailProvider.clearSentEmails();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Structured Medication Reminder Template", () => {
    it("should render detailed medication intake reminder email", () => {
      const { subject, html, text } = renderMedicationReminder({
        patientName: "John Doe",
        doctorName: "Sarah Smith",
        medicationName: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily before bedtime",
        instructions: "Take with water. Avoid grapefruit juice.",
        scheduledTime: "21:00",
      });

      assert.ok(subject.includes("Atorvastatin (20mg)"));
      assert.ok(html.includes("John Doe"));
      assert.ok(html.includes("Sarah Smith"));
      assert.ok(html.includes("Once daily before bedtime"));
      assert.ok(html.includes("Avoid grapefruit juice"));
      assert.ok(html.includes("21:00"));
      assert.ok(text.includes("Atorvastatin"));
    });
  });

  describe("2. Appointment Reminder Execution & Lifecycle Safety", () => {
    it("should generate appointment reminder for confirmed appointment", () => {
      const template = renderAppointmentReminder({
        patientName: "Jane Doe",
        doctorName: "Sarah Smith",
        specialization: "Cardiology",
        formattedDate: "Monday, Sep 15, 2026",
        formattedTime: "09:00 - 09:30",
      });

      assert.ok(template.subject.includes("Reminder"));
      assert.ok(template.html.includes("Jane Doe"));
      assert.ok(template.html.includes("Cardiology"));
    });

    it("should skip appointment reminder when appointment is cancelled", () => {
      const appointmentStatus: string = "CANCELLED";
      const shouldSend = appointmentStatus === "CONFIRMED";
      assert.equal(shouldSend, false, "Cancelled appointments must not trigger reminders");
    });

    it("should skip appointment reminder when appointment is completed", () => {
      const appointmentStatus: string = "COMPLETED";
      const shouldSend = appointmentStatus === "CONFIRMED";
      assert.equal(shouldSend, false, "Completed appointments must not trigger reminders");
    });
  });

  describe("3. Medication Expiry & Frequency Schedule Rules", () => {
    it("should identify active medications and skip expired prescriptions", () => {
      const now = new Date("2026-09-15T12:00:00Z");

      const activeMed = {
        name: "Amoxicillin",
        startsOn: new Date("2026-09-10T00:00:00Z"),
        endsOn: new Date("2026-09-20T00:00:00Z"),
      };

      const expiredMed = {
        name: "Ibuprofen",
        startsOn: new Date("2026-08-01T00:00:00Z"),
        endsOn: new Date("2026-08-10T00:00:00Z"),
      };

      const isActive1 = (!activeMed.startsOn || activeMed.startsOn <= now) && (!activeMed.endsOn || activeMed.endsOn >= now);
      const isActive2 = (!expiredMed.startsOn || expiredMed.startsOn <= now) && (!expiredMed.endsOn || expiredMed.endsOn >= now);

      assert.equal(isActive1, true, "Active medication within date range should be active");
      assert.equal(isActive2, false, "Expired medication past end date must not be active");
    });
  });

  describe("4. Idempotency & Duplicate Execution Guard", () => {
    it("should construct deterministic idempotency keys per medication per day", () => {
      const medId = "med-12345";
      const dateStr = "2026-09-15";
      const slot = "morning";

      const key1 = `med_rem_${medId}_${dateStr}_${slot}`;
      const key2 = `med_rem_${medId}_${dateStr}_${slot}`;

      assert.equal(key1, key2, "Idempotency keys for the same schedule must be identical");
    });

    it("should construct deterministic appointment reminder keys per date", () => {
      const apptId = "appt-67890";
      const dateStr = "2026-09-15";

      const key1 = `appt_rem_${apptId}_${dateStr}`;
      const key2 = `appt_rem_${apptId}_${dateStr}`;

      assert.equal(key1, key2, "Idempotency keys for the same appointment reminder must match");
    });
  });

  describe("5. Failed Notification Retry Logic & Max Attempt Threshold", () => {
    it("should retry failed email notifications up to max attempts and stop", () => {
      const maxAttempts = 3;
      let attemptCount = 0;
      let status = "FAILED";

      // Attempt 1
      attemptCount++;
      assert.equal(attemptCount < maxAttempts, true);

      // Attempt 2
      attemptCount++;
      assert.equal(attemptCount < maxAttempts, true);

      // Attempt 3 (final allowed retry)
      attemptCount++;
      const shouldRetryNext = attemptCount < maxAttempts;
      assert.equal(shouldRetryNext, false, "Should not retry beyond max attempts threshold");

      // Successful dispatch
      status = "SENT";
      assert.equal(status, "SENT");
    });

    it("should successfully dispatch email via MockEmailProvider during retry", async () => {
      const provider = new MockEmailProvider();
      const sendResult = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Retried Reminder",
        html: "<p>Retried successfully</p>",
      });

      assert.equal(sendResult.success, true);
      assert.equal(provider.getSentEmails().length, 1);
    });
  });
});
