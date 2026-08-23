import { google } from "googleapis";
import { prisma } from "@/database/prisma";
import { getAuthenticatedClientForDoctor } from "./oauth";
import { globalMockGoogleCalendar } from "./mock";
import type { CalendarEventPayload, CalendarSyncResult } from "./types";

/**
 * Builds safe calendar event payload without exposing sensitive patient details.
 */
function buildEventPayload(appointment: {
  startsAt: Date;
  endsAt: Date;
  doctor: { specialization: string; user: { name: string } };
  patient: { user: { name: string } };
  symptomSubmission?: { symptoms: string } | null;
}): CalendarEventPayload {
  const doctorName = appointment.doctor.user.name;
  const patientName = appointment.patient.user.name;
  const specialization = appointment.doctor.specialization;

  return {
    summary: `Healthcare Consultation: Dr. ${doctorName} & ${patientName}`,
    description: `Clinical Consultation Details:\n• Specialist: Dr. ${doctorName} (${specialization})\n• Patient: ${patientName}\n• Scheduled Duration: ${Math.round(
      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000
    )} minutes\n• Managed via HealthCare Appointment Portal`,
    start: {
      dateTime: appointment.startsAt.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: appointment.endsAt.toISOString(),
      timeZone: "UTC",
    },
  };
}

/**
 * Creates Google Calendar event for an appointment.
 * Non-blocking: never throws to disrupt core appointment database operations.
 */
export async function createAppointmentCalendarEvent(
  appointmentId: string
): Promise<CalendarSyncResult> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        symptomSubmission: true,
      },
    });

    if (!appointment) {
      return { success: false, status: "FAILED", error: "Appointment not found." };
    }

    const payload = buildEventPayload(appointment);

    // Mock check for testing or offline development
    if (
      process.env.GOOGLE_MOCK_CALENDAR === "true" ||
      !process.env.GOOGLE_CLIENT_ID ||
      process.env.NODE_ENV === "test"
    ) {
      const mockResult = await globalMockGoogleCalendar.insertEvent("primary", payload);
      await prisma.calendarEvent.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          googleEventId: mockResult.googleEventId || null,
          doctorEventId: mockResult.googleEventId || null,
          status: mockResult.status,
          lastSyncedAt: mockResult.success ? new Date() : null,
          lastError: mockResult.error || null,
        },
        update: {
          googleEventId: mockResult.googleEventId || null,
          doctorEventId: mockResult.googleEventId || null,
          status: mockResult.status,
          lastSyncedAt: mockResult.success ? new Date() : null,
          lastError: mockResult.error || null,
        },
      });

      return mockResult;
    }

    // Real Google Calendar integration
    const oauth2Client = await getAuthenticatedClientForDoctor(appointment.doctorId);

    if (!oauth2Client) {
      await prisma.calendarEvent.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          status: "NOT_CONNECTED",
          lastError: "Doctor has not connected Google Calendar.",
        },
        update: {
          status: "NOT_CONNECTED",
          lastError: "Doctor has not connected Google Calendar.",
        },
      });

      return {
        success: true,
        status: "NOT_CONNECTED",
      };
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: payload,
    });

    const googleEventId = res.data.id || undefined;

    await prisma.calendarEvent.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        googleEventId: googleEventId || null,
        doctorEventId: googleEventId || null,
        status: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
      update: {
        googleEventId: googleEventId || null,
        doctorEventId: googleEventId || null,
        status: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });

    return {
      success: true,
      googleEventId,
      status: "SYNCED",
    };
  } catch (err) {
    const errorMsg = (err as Error).message || "Google Calendar synchronization failed.";
    console.error(`[Google Calendar Sync Error] Appointment ${appointmentId}:`, errorMsg);

    try {
      await prisma.calendarEvent.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          status: "FAILED",
          lastError: errorMsg,
        },
        update: {
          status: "FAILED",
          lastError: errorMsg,
        },
      });
    } catch {
      // Suppress secondary DB logging errors
    }

    return {
      success: false,
      status: "FAILED",
      error: errorMsg,
    };
  }
}

/**
 * Updates Google Calendar event times when an appointment is rescheduled.
 */
export async function updateAppointmentCalendarEvent(
  appointmentId: string
): Promise<CalendarSyncResult> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        calendarEvent: true,
      },
    });

    if (!appointment) {
      return { success: false, status: "FAILED", error: "Appointment not found." };
    }

    const eventId = appointment.calendarEvent?.googleEventId || appointment.calendarEvent?.doctorEventId;
    if (!eventId) {
      // Re-create event if never created
      return createAppointmentCalendarEvent(appointmentId);
    }

    const payload = buildEventPayload(appointment);

    // Mock check
    if (
      process.env.GOOGLE_MOCK_CALENDAR === "true" ||
      !process.env.GOOGLE_CLIENT_ID ||
      process.env.NODE_ENV === "test"
    ) {
      const mockResult = await globalMockGoogleCalendar.patchEvent("primary", eventId, payload);
      await prisma.calendarEvent.update({
        where: { appointmentId },
        data: {
          status: mockResult.status,
          lastSyncedAt: mockResult.success ? new Date() : null,
          lastError: mockResult.error || null,
        },
      });
      return mockResult;
    }

    const oauth2Client = await getAuthenticatedClientForDoctor(appointment.doctorId);
    if (!oauth2Client) {
      return { success: true, status: "NOT_CONNECTED" };
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: payload,
    });

    await prisma.calendarEvent.update({
      where: { appointmentId },
      data: {
        status: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });

    return { success: true, googleEventId: eventId, status: "SYNCED" };
  } catch (err) {
    const errorMsg = (err as Error).message || "Google Calendar update failed.";
    console.error(`[Google Calendar Update Error] Appointment ${appointmentId}:`, errorMsg);

    try {
      await prisma.calendarEvent.update({
        where: { appointmentId },
        data: {
          status: "FAILED",
          lastError: errorMsg,
        },
      });
    } catch {
      // Suppress secondary DB logging errors
    }

    return { success: false, status: "FAILED", error: errorMsg };
  }
}

/**
 * Deletes/Cancels Google Calendar event when an appointment is cancelled.
 */
export async function deleteAppointmentCalendarEvent(
  appointmentId: string
): Promise<boolean> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        calendarEvent: true,
      },
    });

    if (!appointment || !appointment.calendarEvent) return true;

    const eventId = appointment.calendarEvent.googleEventId || appointment.calendarEvent.doctorEventId;
    if (!eventId) return true;

    // Mock check
    if (
      process.env.GOOGLE_MOCK_CALENDAR === "true" ||
      !process.env.GOOGLE_CLIENT_ID ||
      process.env.NODE_ENV === "test"
    ) {
      await globalMockGoogleCalendar.deleteEvent("primary", eventId);
      await prisma.calendarEvent.update({
        where: { appointmentId },
        data: {
          status: "NOT_CONNECTED",
          lastSyncedAt: new Date(),
          lastError: "Event removed from Google Calendar upon cancellation.",
        },
      });
      return true;
    }

    const oauth2Client = await getAuthenticatedClientForDoctor(appointment.doctorId);
    if (!oauth2Client) return true;

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    await prisma.calendarEvent.update({
      where: { appointmentId },
      data: {
        status: "NOT_CONNECTED",
        lastSyncedAt: new Date(),
        lastError: "Event deleted from Google Calendar upon cancellation.",
      },
    });

    return true;
  } catch (err) {
    console.error(`[Google Calendar Delete Error] Appointment ${appointmentId}:`, (err as Error).message);
    return false;
  }
}

/**
 * Asynchronous background synchronizer.
 */
export async function syncAppointmentToCalendar(appointmentId: string): Promise<void> {
  await createAppointmentCalendarEvent(appointmentId);
}
