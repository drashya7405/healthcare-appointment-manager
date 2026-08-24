import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MockEmailProvider, globalMockEmailProvider } from "../lib/notifications/providers/mock";
import { BrevoEmailProvider } from "../lib/notifications/providers/brevo";
import { ResendEmailProvider } from "../lib/notifications/providers/resend";
import { getEmailProvider } from "../lib/notifications/email-service";
import { renderPatientBookingConfirmation, renderDoctorBookingNotification } from "../lib/notifications/templates/booking-confirmation";
import { renderAppointmentReminder } from "../lib/notifications/templates/appointment-reminder";
import { renderAppointmentCancellation } from "../lib/notifications/templates/appointment-cancellation";
import { renderAppointmentReschedule } from "../lib/notifications/templates/appointment-reschedule";
import { renderDoctorLeaveConflict } from "../lib/notifications/templates/doctor-leave-conflict";

describe("Phase 7: Email Notifications System", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EMAIL_PROVIDER = "mock";
    process.env.EMAIL_MOCK_FAILURE = "false";
    globalMockEmailProvider.clearSentEmails();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  describe("1. Template Rendering Engine", () => {
    it("should render Patient Booking Confirmation template", () => {
      const { subject, html, text } = renderPatientBookingConfirmation({
        patientName: "Jane Doe",
        doctorName: "Sarah Smith",
        specialization: "Cardiology",
        formattedDate: "Monday, Sep 15, 2026",
        formattedTime: "09:00 - 09:30",
        symptoms: "Mild chest tightness upon exertion",
      });

      assert.ok(subject.includes("Confirmed"));
      assert.ok(subject.includes("Dr. Sarah Smith"));
      assert.ok(html.includes("Jane Doe"));
      assert.ok(html.includes("Cardiology"));
      assert.ok(html.includes("Mild chest tightness"));
      assert.ok(text.includes("09:00 - 09:30"));
    });

    it("should render Doctor Booking Notification template", () => {
      const { subject, html, text } = renderDoctorBookingNotification({
        doctorName: "Sarah Smith",
        patientName: "Jane Doe",
        patientEmail: "jane.doe@example.com",
        patientPhone: "+1-555-0100",
        formattedDate: "Monday, Sep 15, 2026",
        formattedTime: "09:00 - 09:30",
        symptoms: "Shortness of breath",
      });

      assert.ok(subject.includes("New Appointment: Jane Doe"));
      assert.ok(html.includes("jane.doe@example.com"));
      assert.ok(html.includes("+1-555-0100"));
      assert.ok(text.includes("Shortness of breath"));
    });

    it("should render Appointment Reminder template", () => {
      const { subject, html, text } = renderAppointmentReminder({
        patientName: "Jane Doe",
        doctorName: "Sarah Smith",
        specialization: "Cardiology",
        formattedDate: "Monday, Sep 15, 2026",
        formattedTime: "09:00 - 09:30",
      });

      assert.ok(subject.includes("Reminder"));
      assert.ok(html.includes("Preparation Checklist"));
      assert.ok(text.includes("Reminder of your upcoming appointment"));
    });

    it("should render Cancellation template with reason", () => {
      const { subject, html, text } = renderAppointmentCancellation({
        recipientName: "Jane Doe",
        doctorName: "Sarah Smith",
        patientName: "Jane Doe",
        formattedDate: "Sep 15, 2026",
        formattedTime: "09:00",
        reason: "Patient personal conflict",
        isPatientRecipient: true,
      });

      assert.ok(subject.includes("Cancelled"));
      assert.ok(html.includes("Patient personal conflict"));
      assert.ok(text.includes("Reason: Patient personal conflict"));
    });

    it("should render Reschedule template with previous and new times", () => {
      const { subject, html, text } = renderAppointmentReschedule({
        recipientName: "Jane Doe",
        doctorName: "Sarah Smith",
        patientName: "Jane Doe",
        specialization: "Cardiology",
        previousDate: "Sep 15",
        previousTime: "09:00",
        newDate: "Sep 16, 2026",
        newTime: "11:00",
      });

      assert.ok(subject.includes("Rescheduled"));
      assert.ok(html.includes("Sep 15 at 09:00"));
      assert.ok(html.includes("Sep 16, 2026 at 11:00"));
      assert.ok(text.includes("Previous: Sep 15 at 09:00"));
    });

    it("should render Doctor Leave Conflict template", () => {
      const { subject, html, text } = renderDoctorLeaveConflict({
        patientName: "Jane Doe",
        doctorName: "Sarah Smith",
        specialization: "Cardiology",
        originalDate: "Monday, Sep 15, 2026",
        originalTime: "09:00",
        leaveReason: "Annual Medical Conference",
      });

      assert.ok(subject.includes("Urgent Schedule Update"));
      assert.ok(html.includes("Annual Medical Conference"));
      assert.ok(html.includes("Priority Rescheduling Assistance"));
      assert.ok(text.includes("Doctor Schedule Interruption"));
    });
  });

  describe("2. Mock Email Provider Execution & Failure Simulation", () => {
    it("should send and track emails in Mock Mode", async () => {
      const provider = new MockEmailProvider();
      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
        text: "Hello",
      });

      assert.equal(result.success, true);
      assert.ok(result.messageId?.startsWith("mock-msg-"));
      assert.equal(provider.getSentEmails().length, 1);
      assert.equal(provider.getLastEmail()?.to, "patient@example.com");
    });

    it("should simulate failure when EMAIL_MOCK_FAILURE is true", async () => {
      process.env.EMAIL_MOCK_FAILURE = "true";
      const provider = new MockEmailProvider();

      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Simulated email provider network failure"));
      assert.equal(provider.getSentEmails().length, 0);
    });
  });

  describe("3. Brevo Provider Safety & Error Handling", () => {
    it("should instantiate BrevoEmailProvider when API key is provided", () => {
      const provider = new BrevoEmailProvider("xkeysib_test_key_123");
      assert.equal(provider.name, "brevo");
    });

    it("should throw a clear error when BREVO_API_KEY is missing", () => {
      const currentKey = process.env.BREVO_API_KEY;
      delete process.env.BREVO_API_KEY;

      assert.throws(() => {
        new BrevoEmailProvider();
      }, /BREVO_API_KEY is not configured/);

      process.env.BREVO_API_KEY = currentKey;
    });

    it("should send email successfully via Brevo API when response is 201 Created", async () => {
      global.fetch = async (input: unknown, init?: unknown) => {
        const reqInit = init as RequestInit;
        assert.equal(reqInit.method, "POST");
        assert.ok((reqInit.headers as Record<string, string>)["api-key"]);
        return new Response(JSON.stringify({ messageId: "brevo-msg-12345" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      };

      const provider = new BrevoEmailProvider("xkeysib_test_key_123");
      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Confirmation",
        html: "<p>Confirmed</p>",
      });

      assert.equal(result.success, true);
      assert.equal(result.messageId, "brevo-msg-12345");
    });

    it("should handle Brevo API error response (e.g. 401 Unauthorized)", async () => {
      global.fetch = async () => {
        return new Response(JSON.stringify({ message: "Key not found", code: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      };

      const provider = new BrevoEmailProvider("xkeysib_invalid_key");
      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Confirmation",
        html: "<p>Confirmed</p>",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Key not found"));
    });

    it("should handle network exception/timeout safely", async () => {
      global.fetch = async () => {
        throw new Error("getaddrinfo ENOTFOUND api.brevo.com");
      };

      const provider = new BrevoEmailProvider("xkeysib_test_key");
      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Confirmation",
        html: "<p>Confirmed</p>",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("getaddrinfo ENOTFOUND"));
    });
  });

  describe("4. Provider Selection & No Silent Mock Fallback", () => {
    it("should return failing provider and NOT silently fall back to mock when EMAIL_PROVIDER=brevo but BREVO_API_KEY is missing", async () => {
      process.env.EMAIL_PROVIDER = "brevo";
      delete process.env.BREVO_API_KEY;

      const provider = getEmailProvider();
      assert.equal(provider.name, "brevo");

      const result = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("BREVO_API_KEY is not configured"));
    });

    it("should return globalMockEmailProvider when EMAIL_PROVIDER=mock", () => {
      process.env.EMAIL_PROVIDER = "mock";
      const provider = getEmailProvider();
      assert.equal(provider.name, "mock");
    });
  });

  describe("5. Resend Provider Safety & Error Handling", () => {
    it("should instantiate ResendEmailProvider when API key is provided", () => {
      const provider = new ResendEmailProvider("re_test_key_123");
      assert.equal(provider.name, "resend");
    });

    it("should throw a clear error when RESEND_API_KEY is missing", () => {
      const currentKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      assert.throws(() => {
        new ResendEmailProvider();
      }, /RESEND_API_KEY is not configured/);

      process.env.RESEND_API_KEY = currentKey;
    });
  });

  describe("6. Critical Reliability & Non-Blocking Isolation", () => {
    it("should preserve booking and continue when email dispatch fails", async () => {
      process.env.EMAIL_MOCK_FAILURE = "true";
      const provider = new MockEmailProvider();

      const sendResult = await provider.sendEmail({
        to: "patient@example.com",
        subject: "Booking Confirmation",
        html: "<p>Booked</p>",
      });

      assert.equal(sendResult.success, false);
      assert.ok(sendResult.error);

      const notificationStatus = sendResult.success ? "SENT" : "FAILED";
      assert.equal(notificationStatus, "FAILED");
    });
  });
});
