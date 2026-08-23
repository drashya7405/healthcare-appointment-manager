import { z } from "zod";

export const preVisitResponseSchema = z.object({
  urgency: z.enum(["Low", "Medium", "High"], {
    message: "Urgency must be Low, Medium, or High.",
  }),
  chiefComplaint: z.string().trim().min(1, "Chief complaint is required."),
  suggestedQuestions: z
    .array(z.string().trim().min(1, "Question cannot be empty."))
    .length(3, "Exactly 3 suggested questions are required."),
});

export type PreVisitResponse = z.infer<typeof preVisitResponseSchema>;
