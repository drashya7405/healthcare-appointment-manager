import { z } from "zod";

export const medicationInputSchema = z.object({
  name: z.string().trim().min(1, "Medication name is required."),
  dosage: z.string().trim().min(1, "Dosage is required (e.g. 500mg)."),
  frequency: z.string().trim().min(1, "Frequency is required (e.g. Twice daily)."),
  instructions: z.string().trim().optional(),
  startsOn: z.coerce.date().optional(),
  endsOn: z.coerce.date().optional(),
  reminderTimes: z.string().trim().optional(),
});

export const createPrescriptionSchema = z.object({
  clinicalNotes: z.string().trim().min(3, "Clinical diagnosis and notes are required."),
  patientFriendlySummary: z.string().trim().optional(),
  followUpSteps: z.string().trim().optional(),
  markCompleted: z.boolean().default(true),
  medications: z.array(medicationInputSchema).default([]),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const updateNotesSchema = z.object({
  clinicalNotes: z.string().trim().min(1, "Notes cannot be empty."),
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
});

export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
