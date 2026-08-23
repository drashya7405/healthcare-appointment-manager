import { z } from "zod";

export const postVisitResponseSchema = z.object({
  summary: z.string().trim().min(1, "Patient-friendly summary is required."),
  medicationSchedule: z.string().trim().min(1, "Medication schedule is required."),
  followUpInstructions: z.string().trim().min(1, "Follow-up instructions are required."),
  nextSteps: z.string().trim().min(1, "Next steps guidance is required."),
});

export type PostVisitResponse = z.infer<typeof postVisitResponseSchema>;
