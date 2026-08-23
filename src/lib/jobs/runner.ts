import { prisma } from "@/database/prisma";
import {
  sendAppointmentReminder,
  sendMedicationReminder,
  retryFailedNotifications,
} from "@/lib/notifications/email-service";

/**
 * Runs Appointment Reminders job.
 * Finds upcoming confirmed appointments within the next 24 hours and dispatches reminders.
 * Skips cancelled, completed, and already-reminded appointments.
 */
export async function runAppointmentRemindersJob(windowHours = 24) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: {
        gte: now,
        lte: windowEnd,
      },
    },
    include: {
      notifications: {
        where: { type: "APPOINTMENT_REMINDER" },
      },
    },
  });

  let remindersSent = 0;

  for (const appt of appointments) {
    // Only send if reminder has not already been created
    if (appt.notifications.length === 0) {
      const result = await sendAppointmentReminder(appt.id);
      if (result) {
        remindersSent++;
      }
    }
  }

  return {
    scannedAppointments: appointments.length,
    remindersSent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Runs Medication Reminders job based on prescription frequency and active date range.
 * Skips expired prescriptions (endsOn < now).
 */
export async function runMedicationRemindersJob(referenceDate = new Date()) {
  const now = referenceDate;
  const todayDateStr = now.toISOString().slice(0, 10);

  const activeMedications = await prisma.medication.findMany({
    where: {
      OR: [{ endsOn: null }, { endsOn: { gte: now } }],
      AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: now } }] }],
    },
    include: {
      prescription: {
        include: {
          appointment: {
            include: {
              patient: { include: { user: true } },
              doctor: { include: { user: true } },
            },
          },
        },
      },
    },
  });

  let remindersSent = 0;

  for (const med of activeMedications) {
    if (!med.prescription?.appointment) continue;

    // Idempotency key per medication per day
    const idempotencyKey = `med_rem_${med.id}_${todayDateStr}`;

    const result = await sendMedicationReminder(
      med.id,
      med.frequency,
      idempotencyKey
    );

    if (result) {
      remindersSent++;
    }
  }

  return {
    activeMedicationsScanned: activeMedications.length,
    remindersSent,
    timestamp: now.toISOString(),
  };
}

/**
 * Runs Email Notification Retries job for failed notifications.
 */
export async function runEmailRetriesJob(maxAttempts = 3) {
  const summary = await retryFailedNotifications(maxAttempts);
  return {
    ...summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Runs all periodic background jobs.
 */
export async function runAllBackgroundJobs() {
  const [appointmentReminders, medicationReminders, emailRetries] = await Promise.all([
    runAppointmentRemindersJob(),
    runMedicationRemindersJob(),
    runEmailRetriesJob(),
  ]);

  return {
    appointmentReminders,
    medicationReminders,
    emailRetries,
  };
}
