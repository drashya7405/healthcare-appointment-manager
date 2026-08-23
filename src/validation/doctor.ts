import { z } from "zod";
import { DayOfWeek } from "@prisma/client";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const workingHourItemSchema = z
  .object({
    day: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(TIME_REGEX, "Start time must be in HH:MM format (24-hour)."),
    endTime: z.string().regex(TIME_REGEX, "End time must be in HH:MM format (24-hour)."),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Working hour end time must be after start time.",
    path: ["endTime"],
  });

export const setWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourItemSchema),
});

export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;

export const createLeaveSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().trim().optional(),
  })
  .refine((data) => data.startsAt < data.endsAt, {
    message: "Leave endsAt must be strictly after startsAt.",
    path: ["endsAt"],
  });

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please provide a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  specialization: z.string().trim().min(2, "Specialization is required."),
  bio: z.string().trim().optional(),
  slotDurationMins: z.number().int().min(10, "Slot duration must be at least 10 mins.").max(120, "Slot duration cannot exceed 120 mins.").default(30),
  timezone: z.string().default("Asia/Kolkata"),
  workingHours: z.array(workingHourItemSchema).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = z.object({
  name: z.string().trim().min(2).optional(),
  specialization: z.string().trim().min(2).optional(),
  bio: z.string().trim().optional(),
  slotDurationMins: z.number().int().min(10).max(120).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date parameter must be in YYYY-MM-DD format."),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
