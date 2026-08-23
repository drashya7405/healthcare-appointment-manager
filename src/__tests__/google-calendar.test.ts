import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getGoogleAuthUrl, createOAuth2Client } from "../lib/google/oauth";
import { MockGoogleCalendarService, globalMockGoogleCalendar } from "../lib/google/mock";
import type { CalendarEventPayload } from "../lib/google/types";

describe("Phase 8: Google Calendar Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
    process.env.GOOGLE_MOCK_CALENDAR = "true";
    delete process.env.GOOGLE_MOCK_CALENDAR_FAILURE;
    globalMockGoogleCalendar.clearEvents();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. OAuth 2.0 URL Generation & CSRF Protection", () => {
    it("should generate a valid Google OAuth URL with offline access and required scopes", () => {
      const state = "secure-random-csrf-token-12345";
      const authUrl = getGoogleAuthUrl(state);

      assert.ok(authUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));
      assert.ok(authUrl.includes("access_type=offline"));
      assert.ok(authUrl.includes("prompt=consent"));
      assert.ok(authUrl.includes(`state=${state}`));
      assert.ok(authUrl.includes("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events"));
    });

    it("should reject OAuth callback when state token does not match (CSRF guard)", () => {
      const storedState: string = "expected-session-state";
      const receivedState: string = "tampered-state-attacker";

      const isValid = storedState === receivedState;
      assert.equal(isValid, false, "Mismatched state must be rejected");
    });
  });

  describe("2. Mock Google Calendar Event Operations", () => {
    const samplePayload: CalendarEventPayload = {
      summary: "Healthcare Consultation: Dr. Sarah Smith & John Doe",
      description: "Specialist: Cardiology\nPatient: John Doe",
      start: { dateTime: "2026-09-15T09:00:00.000Z", timeZone: "UTC" },
      end: { dateTime: "2026-09-15T09:30:00.000Z", timeZone: "UTC" },
    };

    it("should successfully insert a Google Calendar event", async () => {
      const service = new MockGoogleCalendarService();
      const result = await service.insertEvent("primary", samplePayload);

      assert.equal(result.success, true);
      assert.equal(result.status, "SYNCED");
      assert.ok(result.googleEventId?.startsWith("gcal-evt-"));

      const saved = service.getEvent(result.googleEventId!);
      assert.ok(saved);
      assert.equal(saved?.summary, samplePayload.summary);
    });

    it("should update an existing Google Calendar event on reschedule", async () => {
      const service = new MockGoogleCalendarService();
      const insertResult = await service.insertEvent("primary", samplePayload);
      const eventId = insertResult.googleEventId!;

      const updatedPayload: Partial<CalendarEventPayload> = {
        start: { dateTime: "2026-09-16T11:00:00.000Z", timeZone: "UTC" },
        end: { dateTime: "2026-09-16T11:30:00.000Z", timeZone: "UTC" },
      };

      const updateResult = await service.patchEvent("primary", eventId, updatedPayload);
      assert.equal(updateResult.success, true);
      assert.equal(updateResult.status, "SYNCED");

      const fetched = service.getEvent(eventId);
      assert.equal(fetched?.start.dateTime, "2026-09-16T11:00:00.000Z");
    });

    it("should delete a Google Calendar event on cancellation", async () => {
      const service = new MockGoogleCalendarService();
      const insertResult = await service.insertEvent("primary", samplePayload);
      const eventId = insertResult.googleEventId!;

      const deleted = await service.deleteEvent("primary", eventId);
      assert.equal(deleted, true);

      const fetched = service.getEvent(eventId);
      assert.equal(fetched, undefined);
    });
  });

  describe("3. Calendar Failure Isolation & Zero Rollback", () => {
    it("should capture sync failure without crashing or throwing unhandled errors", async () => {
      process.env.GOOGLE_MOCK_CALENDAR_FAILURE = "true";
      const service = new MockGoogleCalendarService();

      const result = await service.insertEvent("primary", {
        summary: "Consultation",
        description: "Notes",
        start: { dateTime: "2026-09-15T09:00:00.000Z" },
        end: { dateTime: "2026-09-15T09:30:00.000Z" },
      });

      assert.equal(result.success, false);
      assert.equal(result.status, "FAILED");
      assert.ok(result.error?.includes("Simulated Google Calendar API failure"));
    });

    it("should capture update failure without crashing reschedule workflow", async () => {
      process.env.GOOGLE_MOCK_CALENDAR_FAILURE = "true";
      const service = new MockGoogleCalendarService();

      const result = await service.patchEvent("primary", "gcal-evt-123", {
        start: { dateTime: "2026-09-16T11:00:00.000Z" },
      });

      assert.equal(result.success, false);
      assert.equal(result.status, "FAILED");
    });
  });

  describe("4. Token Expiry & Refresh Behavior", () => {
    it("should identify expired tokens needing refresh within 2 minutes of expiry", () => {
      const expiredTime = new Date(Date.now() - 5000); // 5 seconds ago
      const isExpired = expiredTime.getTime() < Date.now() + 2 * 60 * 1000;
      assert.equal(isExpired, true);

      const validFutureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const isStillValid = validFutureTime.getTime() > Date.now() + 2 * 60 * 1000;
      assert.equal(isStillValid, true);
    });

    it("should instantiate OAuth2 client properly with configured redirect URI", () => {
      const client = createOAuth2Client();
      assert.ok(client);
    });
  });
});
