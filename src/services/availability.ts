import { prisma } from "@/database/prisma";
import {
  getDayOfWeek,
  parseTimeString,
  createDateTime,
  areIntervalsOverlapping,
} from "@/lib/date-utils";

export interface TimeSlot {
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
  formattedTime: string; // e.g. "09:00 - 09:30"
  available: boolean;
  reason?: "BOOKED" | "LEAVE" | "PAST" | "OUTSIDE_HOURS";
}

export interface DoctorAvailabilityResult {
  doctorId: string;
  doctorName: string;
  specialization: string;
  slotDurationMins: number;
  date: string;
  isWorkingDay: boolean;
  totalSlots: number;
  availableSlotsCount: number;
  slots: TimeSlot[];
}

interface ComputeSlotsParams {
  dateStr: string;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  leaves?: Array<{ startsAt: Date; endsAt: Date }>;
  appointments?: Array<{ startsAt: Date; endsAt: Date; status: string }>;
  referenceNow?: Date;
}

/**
 * Pure function to compute discrete slots for a single day given working hours,
 * slot duration, leave intervals, and existing appointments.
 */
export function computeDaySlots({
  dateStr,
  startTime,
  endTime,
  slotDurationMins,
  leaves = [],
  appointments = [],
  referenceNow = new Date(),
}: ComputeSlotsParams): TimeSlot[] {
  const startParsed = parseTimeString(startTime);
  const endParsed = parseTimeString(endTime);

  const startTotalMins = startParsed.hours * 60 + startParsed.minutes;
  const endTotalMins = endParsed.hours * 60 + endParsed.minutes;

  const slots: TimeSlot[] = [];

  let currentStartMins = startTotalMins;

  while (currentStartMins + slotDurationMins <= endTotalMins) {
    const currentEndMins = currentStartMins + slotDurationMins;

    const startHourStr = Math.floor(currentStartMins / 60)
      .toString()
      .padStart(2, "0");
    const startMinStr = (currentStartMins % 60).toString().padStart(2, "0");
    const startFormatted = `${startHourStr}:${startMinStr}`;

    const endHourStr = Math.floor(currentEndMins / 60)
      .toString()
      .padStart(2, "0");
    const endMinStr = (currentEndMins % 60).toString().padStart(2, "0");
    const endFormatted = `${endHourStr}:${endMinStr}`;

    const slotStartsAt = createDateTime(dateStr, startFormatted);
    const slotEndsAt = createDateTime(dateStr, endFormatted);

    let isAvailable = true;
    let unavailableReason: TimeSlot["reason"] = undefined;

    // 1. Check if slot is in the past
    if (slotStartsAt.getTime() <= referenceNow.getTime()) {
      isAvailable = false;
      unavailableReason = "PAST";
    }

    // 2. Check for doctor leaves
    if (isAvailable) {
      const onLeave = leaves.some((leave) =>
        areIntervalsOverlapping(slotStartsAt, slotEndsAt, leave.startsAt, leave.endsAt)
      );
      if (onLeave) {
        isAvailable = false;
        unavailableReason = "LEAVE";
      }
    }

    // 3. Check for conflicting active appointments
    if (isAvailable) {
      const isBooked = appointments.some((appt) => {
        if (appt.status === "CANCELLED") return false;
        return areIntervalsOverlapping(slotStartsAt, slotEndsAt, appt.startsAt, appt.endsAt);
      });
      if (isBooked) {
        isAvailable = false;
        unavailableReason = "BOOKED";
      }
    }

    slots.push({
      startsAt: slotStartsAt.toISOString(),
      endsAt: slotEndsAt.toISOString(),
      formattedTime: `${startFormatted} - ${endFormatted}`,
      available: isAvailable,
      reason: unavailableReason,
    });

    currentStartMins += slotDurationMins;
  }

  return slots;
}

/**
 * Authoritative backend function to query and generate doctor slot availability.
 */
export async function getDoctorAvailability(
  doctorId: string,
  dateStr: string,
  referenceNow = new Date()
): Promise<DoctorAvailabilityResult> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true, isActive: true } },
      workingHours: true,
    },
  });

  if (!doctor || !doctor.user.isActive) {
    throw new Error("Doctor not found or inactive.");
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = getDayOfWeek(targetDate);

  const workingHour = doctor.workingHours.find((wh) => wh.day === dayOfWeek);

  if (!workingHour) {
    return {
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      specialization: doctor.specialization,
      slotDurationMins: doctor.slotDurationMins,
      date: dateStr,
      isWorkingDay: false,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Fetch leaves overlapping the target date
  const leaves = await prisma.doctorLeave.findMany({
    where: {
      doctorId: doctor.id,
      startsAt: { lte: dayEnd },
      endsAt: { gte: dayStart },
    },
  });

  // Fetch non-cancelled appointments overlapping the target date
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: { not: "CANCELLED" },
      startsAt: { lte: dayEnd },
      endsAt: { gte: dayStart },
    },
  });

  const slots = computeDaySlots({
    dateStr,
    startTime: workingHour.startTime,
    endTime: workingHour.endTime,
    slotDurationMins: doctor.slotDurationMins,
    leaves,
    appointments,
    referenceNow,
  });

  return {
    doctorId: doctor.id,
    doctorName: doctor.user.name,
    specialization: doctor.specialization,
    slotDurationMins: doctor.slotDurationMins,
    date: dateStr,
    isWorkingDay: true,
    totalSlots: slots.length,
    availableSlotsCount: slots.filter((s) => s.available).length,
    slots,
  };
}
