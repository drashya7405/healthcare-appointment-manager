import { Prisma, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { getDayOfWeek, parseTimeString } from "@/lib/date-utils";
import type { SafeUser } from "@/types/auth";
import { ForbiddenError } from "@/auth/rbac";
import type { CreateAppointmentInput } from "@/validation/appointment";
import { processPreVisitSummaryAsync } from "@/lib/ai/ai-service";
import {
  sendBookingConfirmation,
  sendCancellationNotice,
  sendRescheduleNotice,
} from "@/lib/notifications/email-service";
import {
  syncAppointmentToCalendar,
  updateAppointmentCalendarEvent,
  deleteAppointmentCalendarEvent,
} from "@/lib/google/calendar";

export class SlotUnavailableError extends Error {
  statusCode = 409;
  code = "SLOT_UNAVAILABLE";
  constructor(message = "This appointment slot is no longer available. Please select another slot.") {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

export class AppointmentNotFoundError extends Error {
  statusCode = 404;
  code = "NOT_FOUND";
  constructor(message = "Appointment not found.") {
    super(message);
    this.name = "AppointmentNotFoundError";
  }
}

/**
 * Concurrency-safe atomic booking transaction.
 *
 * Prevents double-booking and simultaneous race conditions using:
 * 1. Serializable database transaction isolation.
 * 2. Pre-write overlap detection against active leaves and non-cancelled appointments.
 * 3. PostgreSQL unique constraints mapping on [doctorId, startsAt].
 * 4. Error interception transforming raw database conflicts into clean 409 failure messages.
 */
export async function bookAppointment(patientUserId: string, input: CreateAppointmentInput) {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
  });

  if (!patient) {
    throw new Error("Patient profile not found for this account.");
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
    include: {
      user: { select: { name: true, isActive: true } },
      workingHours: true,
    },
  });

  if (!doctor || !doctor.user.isActive) {
    throw new SlotUnavailableError("The selected doctor is currently not available.");
  }

  // Calculate endsAt based on configured slot duration
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + doctor.slotDurationMins * 60 * 1000);

  // Validate working hours compliance
  const dayOfWeek = getDayOfWeek(startsAt);
  const wh = doctor.workingHours.find((w) => w.day === dayOfWeek);

  if (!wh) {
    throw new SlotUnavailableError("Doctor is not scheduled to work on this day.");
  }

  const startParsed = parseTimeString(wh.startTime);
  const endParsed = parseTimeString(wh.endTime);
  const startMinFromMidnight = startParsed.hours * 60 + startParsed.minutes;
  const endMinFromMidnight = endParsed.hours * 60 + endParsed.minutes;

  const slotStartMins = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
  const slotEndMins = slotStartMins + doctor.slotDurationMins;

  if (slotStartMins < startMinFromMidnight || slotEndMins > endMinFromMidnight) {
    throw new SlotUnavailableError("The selected time is outside the doctor's working hours.");
  }

  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        // 1. Check for doctor leaves during slot
        const leaveConflict = await tx.doctorLeave.findFirst({
          where: {
            doctorId: input.doctorId,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        });

        if (leaveConflict) {
          throw new SlotUnavailableError("The doctor is on leave during this time.");
        }

        // 2. Check for active appointment conflicts
        const activeConflict = await tx.appointment.findFirst({
          where: {
            doctorId: input.doctorId,
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        });

        if (activeConflict) {
          throw new SlotUnavailableError(
            "This appointment slot is no longer available. Please select another slot."
          );
        }

        // 3. Atomically create appointment & initial symptom submission
        const created = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: input.doctorId,
            startsAt,
            endsAt,
            status: AppointmentStatus.CONFIRMED,
            symptomSubmission: {
              create: {
                symptoms: input.symptoms,
              },
            },
          },
          include: {
            doctor: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            patient: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            symptomSubmission: true,
          },
        });

        return created;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Trigger non-blocking AI Pre-visit summary in background
    processPreVisitSummaryAsync(appointment.id, input.symptoms).catch((e) =>
      console.warn("Background AI summary failed:", e)
    );

    // Trigger non-blocking Booking Confirmation email to Patient & Doctor
    sendBookingConfirmation(appointment.id).catch((e) =>
      console.warn("Background email notification failed:", e)
    );

    // Trigger non-blocking Google Calendar synchronization
    syncAppointmentToCalendar(appointment.id).catch((e) =>
      console.warn("Background Google Calendar sync failed:", e)
    );

    return appointment;
  } catch (error) {
    // Intercept unique constraint violations or write serialization conflicts
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new SlotUnavailableError(
        "This appointment slot is no longer available. Please select another slot."
      );
    }
    throw error;
  }
}

/**
 * Cancels an appointment.
 */
export async function cancelAppointment(
  appointmentId: string,
  user: SafeUser,
  reason?: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  // Authorization: Admin, Patient who owns it, or Doctor assigned
  const isAuthorized =
    user.role === "ADMIN" ||
    (user.role === "PATIENT" && appointment.patient.userId === user.id) ||
    (user.role === "DOCTOR" && appointment.doctor.userId === user.id);

  if (!isAuthorized) {
    throw new ForbiddenError("You do not have permission to cancel this appointment.");
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    return appointment;
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: reason || `Cancelled by ${user.name} (${user.role})`,
    },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: { include: { user: { select: { name: true, email: true } } } },
      symptomSubmission: true,
      prescription: { include: { medications: true } },
    },
  });

  // Trigger non-blocking Cancellation notification
  sendCancellationNotice(appointmentId, reason).catch((e) =>
    console.warn("Background cancellation email failed:", e)
  );

  // Trigger non-blocking Google Calendar event cancellation/deletion
  deleteAppointmentCalendarEvent(appointmentId).catch((e) =>
    console.warn("Background Google Calendar deletion failed:", e)
  );

  return updated;
}

/**
 * Concurrency-safe atomic appointment rescheduling.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  user: SafeUser,
  newStartsAt: Date,
  reason?: string
) {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: {
        include: {
          user: true,
          workingHours: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppointmentNotFoundError();
  }

  // Authorization check
  const isAuthorized =
    user.role === "ADMIN" ||
    (user.role === "PATIENT" && existing.patient.userId === user.id) ||
    (user.role === "DOCTOR" && existing.doctor.userId === user.id);

  if (!isAuthorized) {
    throw new ForbiddenError("You do not have permission to reschedule this appointment.");
  }

  if (existing.status === AppointmentStatus.CANCELLED) {
    throw new Error("Cannot reschedule a cancelled appointment.");
  }

  const newEndsAt = new Date(newStartsAt.getTime() + existing.doctor.slotDurationMins * 60 * 1000);

  // Validate working hours
  const dayOfWeek = getDayOfWeek(newStartsAt);
  const wh = existing.doctor.workingHours.find((w) => w.day === dayOfWeek);

  if (!wh) {
    throw new SlotUnavailableError("Doctor is not scheduled to work on this requested day.");
  }

  const startParsed = parseTimeString(wh.startTime);
  const endParsed = parseTimeString(wh.endTime);
  const startMinFromMidnight = startParsed.hours * 60 + startParsed.minutes;
  const endMinFromMidnight = endParsed.hours * 60 + endParsed.minutes;

  const slotStartMins = newStartsAt.getUTCHours() * 60 + newStartsAt.getUTCMinutes();
  const slotEndMins = slotStartMins + existing.doctor.slotDurationMins;

  if (slotStartMins < startMinFromMidnight || slotEndMins > endMinFromMidnight) {
    throw new SlotUnavailableError("The requested time is outside the doctor's working hours.");
  }

  try {
    const rescheduled = await prisma.$transaction(
      async (tx) => {
        // Check for leave collision
        const leaveConflict = await tx.doctorLeave.findFirst({
          where: {
            doctorId: existing.doctorId,
            startsAt: { lt: newEndsAt },
            endsAt: { gt: newStartsAt },
          },
        });

        if (leaveConflict) {
          throw new SlotUnavailableError("The doctor is on leave during the requested new time.");
        }

        // Check for active appointment collisions (excluding the appointment itself)
        const apptConflict = await tx.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            doctorId: existing.doctorId,
            status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
            startsAt: { lt: newEndsAt },
            endsAt: { gt: newStartsAt },
          },
        });

        if (apptConflict) {
          throw new SlotUnavailableError(
            "This appointment slot is no longer available. Please select another slot."
          );
        }

        // Atomically update existing appointment to the new slot
        const updated = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            startsAt: newStartsAt,
            endsAt: newEndsAt,
            status: AppointmentStatus.CONFIRMED,
            cancellationReason: reason ? `Rescheduled: ${reason}` : undefined,
          },
          include: {
            doctor: { include: { user: { select: { name: true, email: true } } } },
            patient: { include: { user: { select: { name: true, email: true } } } },
            symptomSubmission: true,
            prescription: { include: { medications: true } },
          },
        });

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Trigger non-blocking Reschedule notification
    sendRescheduleNotice(appointmentId, existing.startsAt).catch((e) =>
      console.warn("Background reschedule email failed:", e)
    );

    // Trigger non-blocking Google Calendar event update
    updateAppointmentCalendarEvent(appointmentId).catch((e) =>
      console.warn("Background Google Calendar update failed:", e)
    );

    return rescheduled;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new SlotUnavailableError(
        "This appointment slot is no longer available. Please select another slot."
      );
    }
    throw error;
  }
}

/**
 * Retrieves appointment details with role-based access control.
 */
export async function getAppointmentById(appointmentId: string, user: SafeUser) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      patient: { include: { user: { select: { id: true, name: true, email: true } } } },
      symptomSubmission: true,
      prescription: { include: { medications: true } },
    },
  });

  if (!appointment) {
    throw new AppointmentNotFoundError();
  }

  const isAuthorized =
    user.role === "ADMIN" ||
    (user.role === "PATIENT" && appointment.patient.userId === user.id) ||
    (user.role === "DOCTOR" && appointment.doctor.userId === user.id);

  if (!isAuthorized) {
    throw new ForbiddenError("You do not have access to view this appointment.");
  }

  return appointment;
}

/**
 * Lists appointments filtered by user role and query parameters.
 */
export async function listAppointments(
  user: SafeUser,
  filters: {
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus;
    from?: Date;
    to?: Date;
  } = {}
) {
  const where: Prisma.AppointmentWhereInput = {};

  if (user.role === "PATIENT") {
    where.patient = { userId: user.id };
  } else if (user.role === "DOCTOR") {
    where.doctor = { userId: user.id };
  } else if (user.role === "ADMIN") {
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.patientId) where.patientId = filters.patientId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = filters.from;
    if (filters.to) where.startsAt.lte = filters.to;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      patient: { include: { user: { select: { id: true, name: true, email: true } } } },
      symptomSubmission: true,
      prescription: { include: { medications: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return appointments;
}
