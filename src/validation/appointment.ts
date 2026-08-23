import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const createAppointmentSchema = z.object({
  doctorId: z.string().trim().min(1, "Doctor ID is required."),
  startsAt: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
    message: "Valid startsAt date is required.",
  }),
  symptoms: z
    .string()
    .trim()
    .min(3, "Please provide symptoms description (at least 3 characters).")
    .max(2000, "Symptoms description cannot exceed 2000 characters."),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters.").optional(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  newStartsAt: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
    message: "Valid new startsAt date is required.",
  }),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters.").optional(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
