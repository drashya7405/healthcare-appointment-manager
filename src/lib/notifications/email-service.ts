import { prisma } from "@/database/prisma";
import type { EmailProvider } from "./providers/types";
import { BrevoEmailProvider } from "./providers/brevo";
import { ResendEmailProvider } from "./providers/resend";
import { globalMockEmailProvider } from "./providers/mock";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import {
  renderPatientBookingConfirmation,
  renderDoctorBookingNotification,
} from "./templates/booking-confirmation";
import { renderAppointmentReminder } from "./templates/appointment-reminder";
import { renderAppointmentCancellation } from "./templates/appointment-cancellation";
import { renderAppointmentReschedule } from "./templates/appointment-reschedule";
import { renderDoctorLeaveConflict } from "./templates/doctor-leave-conflict";
import { renderMedicationReminder } from "./templates/medication-reminder";

/**
 * Returns configured Email Provider.
 */
export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();

  if (provider === "brevo" && process.env.BREVO_API_KEY) {
    try {
      return new BrevoEmailProvider();
    } catch (err) {
      console.warn("Falling back to MockEmailProvider due to Brevo init error:", (err as Error).message);
      return globalMockEmailProvider;
    }
  }

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    try {
      return new ResendEmailProvider();
    } catch (err) {
      console.warn("Falling back to MockEmailProvider due to init error:", (err as Error).message);
      return globalMockEmailProvider;
    }
  }

  return globalMockEmailProvider;
}

interface DispatchParams {
  userId: string;
  appointmentId?: string;
  medicationId?: string;
  type: string;
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

/**
 * Core helper that logs notification state to database and dispatches via provider.
 * NEVER throws errors that disrupt the critical business transaction.
 * Supports idempotencyKey to prevent duplicate dispatches.
 */
export async function recordAndSendNotification(params: DispatchParams) {
  if (params.idempotencyKey) {
    const existing = await prisma.notification.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      // Already scheduled or sent, skip duplicate execution
      return existing;
    }
  }

  let notificationRecord;

  try {
    notificationRecord = await prisma.notification.create({
      data: {
        userId: params.userId,
        appointmentId: params.appointmentId,
        medicationId: params.medicationId,
        channel: NotificationChannel.EMAIL,
        type: params.type,
        status: NotificationStatus.PENDING,
        scheduledFor: new Date(),
        attemptCount: 0,
        idempotencyKey: params.idempotencyKey || null,
      },
    });
  } catch (dbErr) {
    console.error("[Notification DB Error] Failed to create notification log:", dbErr);
    return null;
  }

  const provider = getEmailProvider();
  const sendResult = await provider.sendEmail({
    to: params.toEmail,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  try {
    if (sendResult.success) {
      return await prisma.notification.update({
        where: { id: notificationRecord.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
          lastError: null,
        },
      });
    } else {
      return await prisma.notification.update({
        where: { id: notificationRecord.id },
        data: {
          status: NotificationStatus.FAILED,
          attemptCount: { increment: 1 },
          lastError: sendResult.error || "Email provider dispatch failed.",
        },
      });
    }
  } catch (dbUpdateErr) {
    console.error("[Notification DB Error] Failed to update status:", dbUpdateErr);
    return notificationRecord;
  }
}

/**
 * Sends Booking Confirmation to Patient and Doctor.
 */
export async function sendBookingConfirmation(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        symptomSubmission: true,
      },
    });

    if (!appointment) return;

    const startDate = new Date(appointment.startsAt);
    const formattedDate = startDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = `${startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${new Date(appointment.endsAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const symptoms = appointment.symptomSubmission?.symptoms || "None provided";

    // 1. Patient Notification
    const patientTemplate = renderPatientBookingConfirmation({
      patientName: appointment.patient.user.name,
      doctorName: appointment.doctor.user.name,
      specialization: appointment.doctor.specialization,
      formattedDate,
      formattedTime,
      symptoms,
    });

    await recordAndSendNotification({
      userId: appointment.patient.userId,
      appointmentId: appointment.id,
      type: "BOOKING_CONFIRMATION_PATIENT",
      toEmail: appointment.patient.user.email,
      subject: patientTemplate.subject,
      html: patientTemplate.html,
      text: patientTemplate.text,
    });

    // 2. Doctor Notification
    const doctorTemplate = renderDoctorBookingNotification({
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      patientEmail: appointment.patient.user.email,
      patientPhone: appointment.patient.phone,
      formattedDate,
      formattedTime,
      symptoms,
    });

    await recordAndSendNotification({
      userId: appointment.doctor.userId,
      appointmentId: appointment.id,
      type: "BOOKING_CONFIRMATION_DOCTOR",
      toEmail: appointment.doctor.user.email,
      subject: doctorTemplate.subject,
      html: doctorTemplate.html,
      text: doctorTemplate.text,
    });
  } catch (err) {
    console.error("[Email Notification Error] Booking confirmation error:", err);
  }
}

/**
 * Sends Pre-visit Reminder to Patient.
 */
export async function sendAppointmentReminder(
  appointmentId: string,
  idempotencyKey?: string
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (
      !appointment ||
      appointment.status === "CANCELLED" ||
      appointment.status === "COMPLETED" ||
      appointment.status === "AFFECTED_BY_LEAVE"
    ) {
      return null;
    }

    const startDate = new Date(appointment.startsAt);
    const formattedDate = startDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = `${startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${new Date(appointment.endsAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const template = renderAppointmentReminder({
      patientName: appointment.patient.user.name,
      doctorName: appointment.doctor.user.name,
      specialization: appointment.doctor.specialization,
      formattedDate,
      formattedTime,
    });

    return await recordAndSendNotification({
      userId: appointment.patient.userId,
      appointmentId: appointment.id,
      type: "APPOINTMENT_REMINDER",
      toEmail: appointment.patient.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: idempotencyKey || `appt_rem_${appointment.id}_${startDate.toISOString().slice(0, 10)}`,
    });
  } catch (err) {
    console.error("[Email Notification Error] Appointment reminder error:", err);
    return null;
  }
}

/**
 * Sends Medication Intake Reminder to Patient.
 */
export async function sendMedicationReminder(
  medicationId: string,
  scheduledTime?: string,
  idempotencyKey?: string
) {
  try {
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        prescription: {
          include: {
            appointment: {
              include: {
                doctor: { include: { user: true } },
                patient: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    if (!medication || !medication.prescription?.appointment) {
      return null;
    }

    const appt = medication.prescription.appointment;
    const now = new Date();

    // Skip if prescription is expired
    if (medication.endsOn && medication.endsOn < now) {
      return null;
    }

    const template = renderMedicationReminder({
      patientName: appt.patient.user.name,
      doctorName: appt.doctor.user.name,
      medicationName: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      instructions: medication.instructions,
      scheduledTime,
    });

    const defaultKey = `med_rem_${medication.id}_${now.toISOString().slice(0, 10)}_${scheduledTime || "default"}`;

    return await recordAndSendNotification({
      userId: appt.patient.userId,
      appointmentId: appt.id,
      medicationId: medication.id,
      type: "MEDICATION_REMINDER",
      toEmail: appt.patient.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: idempotencyKey || defaultKey,
    });
  } catch (err) {
    console.error("[Email Notification Error] Medication reminder error:", err);
    return null;
  }
}

/**
 * Sends Cancellation Alert to Patient and Doctor.
 */
export async function sendCancellationNotice(appointmentId: string, reason?: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (!appointment) return;

    const startDate = new Date(appointment.startsAt);
    const formattedDate = startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Patient notice
    const patientTemplate = renderAppointmentCancellation({
      recipientName: appointment.patient.user.name,
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      formattedDate,
      formattedTime,
      reason,
      isPatientRecipient: true,
    });

    await recordAndSendNotification({
      userId: appointment.patient.userId,
      appointmentId: appointment.id,
      type: "APPOINTMENT_CANCELLED_PATIENT",
      toEmail: appointment.patient.user.email,
      subject: patientTemplate.subject,
      html: patientTemplate.html,
      text: patientTemplate.text,
    });

    // Doctor notice
    const doctorTemplate = renderAppointmentCancellation({
      recipientName: `Dr. ${appointment.doctor.user.name}`,
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      formattedDate,
      formattedTime,
      reason,
      isPatientRecipient: false,
    });

    await recordAndSendNotification({
      userId: appointment.doctor.userId,
      appointmentId: appointment.id,
      type: "APPOINTMENT_CANCELLED_DOCTOR",
      toEmail: appointment.doctor.user.email,
      subject: doctorTemplate.subject,
      html: doctorTemplate.html,
      text: doctorTemplate.text,
    });
  } catch (err) {
    console.error("[Email Notification Error] Cancellation notice error:", err);
  }
}

/**
 * Sends Reschedule Notice to Patient and Doctor.
 */
export async function sendRescheduleNotice(
  appointmentId: string,
  previousStartsAt: Date
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (!appointment) return;

    const prevDate = new Date(previousStartsAt);
    const newDate = new Date(appointment.startsAt);

    const previousDateStr = prevDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const previousTimeStr = prevDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newDateStr = newDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const newTimeStr = newDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Patient notice
    const patientTemplate = renderAppointmentReschedule({
      recipientName: appointment.patient.user.name,
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      specialization: appointment.doctor.specialization,
      previousDate: previousDateStr,
      previousTime: previousTimeStr,
      newDate: newDateStr,
      newTime: newTimeStr,
    });

    await recordAndSendNotification({
      userId: appointment.patient.userId,
      appointmentId: appointment.id,
      type: "APPOINTMENT_RESCHEDULED_PATIENT",
      toEmail: appointment.patient.user.email,
      subject: patientTemplate.subject,
      html: patientTemplate.html,
      text: patientTemplate.text,
    });

    // Doctor notice
    const doctorTemplate = renderAppointmentReschedule({
      recipientName: `Dr. ${appointment.doctor.user.name}`,
      doctorName: appointment.doctor.user.name,
      patientName: appointment.patient.user.name,
      specialization: appointment.doctor.specialization,
      previousDate: previousDateStr,
      previousTime: previousTimeStr,
      newDate: newDateStr,
      newTime: newTimeStr,
    });

    await recordAndSendNotification({
      userId: appointment.doctor.userId,
      appointmentId: appointment.id,
      type: "APPOINTMENT_RESCHEDULED_DOCTOR",
      toEmail: appointment.doctor.user.email,
      subject: doctorTemplate.subject,
      html: doctorTemplate.html,
      text: doctorTemplate.text,
    });
  } catch (err) {
    console.error("[Email Notification Error] Reschedule notice error:", err);
  }
}

/**
 * Sends Doctor Leave Conflict Notice to Affected Patient.
 */
export async function sendDoctorLeaveConflictNotice(
  appointmentId: string,
  leaveReason?: string | null
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (!appointment) return;

    const startDate = new Date(appointment.startsAt);
    const originalDate = startDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const originalTime = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const template = renderDoctorLeaveConflict({
      patientName: appointment.patient.user.name,
      doctorName: appointment.doctor.user.name,
      specialization: appointment.doctor.specialization,
      originalDate,
      originalTime,
      leaveReason,
    });

    await recordAndSendNotification({
      userId: appointment.patient.userId,
      appointmentId: appointment.id,
      type: "DOCTOR_LEAVE_CONFLICT_PATIENT",
      toEmail: appointment.patient.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    console.error("[Email Notification Error] Leave conflict notice error:", err);
  }
}

/**
 * Retries sending a failed notification.
 */
export async function retryNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: true,
      medication: true,
      appointment: {
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          symptomSubmission: true,
        },
      },
    },
  });

  if (!notification) {
    throw new Error("Notification not found for retry.");
  }

  let subject = `Notification: Healthcare Update`;
  let html = `<p>Healthcare system notification update.</p>`;
  let text = `Healthcare system notification update.`;

  if (notification.appointment) {
    const appt = notification.appointment;
    const startDate = new Date(appt.startsAt);
    const formattedDate = startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    subject = `Notification: Appointment on ${formattedDate}`;
    html = `<p>Appointment update for Dr. ${appt.doctor.user.name} and ${appt.patient.user.name} on ${formattedDate} at ${formattedTime}</p>`;
    text = `Appointment update on ${formattedDate} at ${formattedTime}`;

    if (notification.type.startsWith("BOOKING_CONFIRMATION")) {
      const t = renderPatientBookingConfirmation({
        patientName: appt.patient.user.name,
        doctorName: appt.doctor.user.name,
        specialization: appt.doctor.specialization,
        formattedDate,
        formattedTime,
        symptoms: appt.symptomSubmission?.symptoms || "None provided",
      });
      subject = t.subject;
      html = t.html;
      text = t.text;
    } else if (notification.type === "APPOINTMENT_REMINDER") {
      const t = renderAppointmentReminder({
        patientName: appt.patient.user.name,
        doctorName: appt.doctor.user.name,
        specialization: appt.doctor.specialization,
        formattedDate,
        formattedTime,
      });
      subject = t.subject;
      html = t.html;
      text = t.text;
    }
  } else if (notification.medication && notification.type === "MEDICATION_REMINDER") {
    const med = notification.medication;
    const t = renderMedicationReminder({
      patientName: notification.user.name,
      doctorName: "Treating Physician",
      medicationName: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      instructions: med.instructions,
    });
    subject = t.subject;
    html = t.html;
    text = t.text;
  }

  const provider = getEmailProvider();
  const sendResult = await provider.sendEmail({
    to: notification.user.email,
    subject,
    html,
    text,
  });

  if (sendResult.success) {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        attemptCount: { increment: 1 },
        lastError: null,
      },
    });
  } else {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        attemptCount: { increment: 1 },
        lastError: sendResult.error || "Retry failed.",
      },
    });
  }
}

/**
 * Retries all failed notifications below maxAttempts threshold.
 */
export async function retryFailedNotifications(maxAttempts = 3) {
  const failedNotifications = await prisma.notification.findMany({
    where: {
      status: NotificationStatus.FAILED,
      attemptCount: { lt: maxAttempts },
    },
  });

  let succeededCount = 0;
  let failedCount = 0;

  for (const n of failedNotifications) {
    try {
      const updated = await retryNotification(n.id);
      if (updated.status === NotificationStatus.SENT) {
        succeededCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return {
    totalRetried: failedNotifications.length,
    succeededCount,
    failedCount,
  };
}
