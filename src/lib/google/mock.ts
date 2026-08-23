import type { CalendarEventPayload, CalendarSyncResult } from "./types";

export interface MockCalendarEvent extends CalendarEventPayload {
  id: string;
  calendarId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MockGoogleCalendarService {
  private events: Map<string, MockCalendarEvent> = new Map();

  async insertEvent(
    calendarId: string,
    payload: CalendarEventPayload
  ): Promise<CalendarSyncResult> {
    if (
      process.env.GOOGLE_MOCK_CALENDAR_FAILURE === "true" ||
      payload.summary?.includes("simulate_calendar_failure") ||
      payload.description?.includes("simulate_calendar_failure")
    ) {
      return {
        success: false,
        error: "Simulated Google Calendar API failure.",
        status: "FAILED",
      };
    }

    const eventId = `gcal-evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.events.set(eventId, {
      ...payload,
      id: eventId,
      calendarId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      googleEventId: eventId,
      status: "SYNCED",
    };
  }

  async patchEvent(
    calendarId: string,
    eventId: string,
    payload: Partial<CalendarEventPayload>
  ): Promise<CalendarSyncResult> {
    if (process.env.GOOGLE_MOCK_CALENDAR_FAILURE === "true") {
      return {
        success: false,
        error: "Simulated Google Calendar API update failure.",
        status: "FAILED",
      };
    }

    const existing = this.events.get(eventId);
    if (!existing) {
      // Re-create if missing in mock
      return this.insertEvent(calendarId, payload as CalendarEventPayload);
    }

    const updated: MockCalendarEvent = {
      ...existing,
      ...payload,
      updatedAt: new Date(),
    };
    this.events.set(eventId, updated);

    return {
      success: true,
      googleEventId: eventId,
      status: "SYNCED",
    };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
    if (process.env.GOOGLE_MOCK_CALENDAR_FAILURE === "true") {
      return false;
    }
    return this.events.delete(eventId);
  }

  getEvent(eventId: string): MockCalendarEvent | undefined {
    return this.events.get(eventId);
  }

  getAllEvents(): MockCalendarEvent[] {
    return Array.from(this.events.values());
  }

  clearEvents(): void {
    this.events.clear();
  }
}

export const globalMockGoogleCalendar = new MockGoogleCalendarService();
