import { prisma } from "@/database/prisma";
import type { AIProvider, PostVisitInput } from "./providers/types";
import { GroqProvider } from "./providers/groq";
import { MockAIProvider } from "./providers/mock";
import type { PreVisitResponse } from "./schemas/pre-visit";
import type { PostVisitResponse } from "./schemas/post-visit";
import { UrgencyLevel } from "@prisma/client";

/**
 * Returns the configured AI provider instance.
 */
export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (providerType === "groq") {
    try {
      return new GroqProvider();
    } catch (err) {
      console.warn("Falling back to Mock AI Provider due to init error:", (err as Error).message);
      return new MockAIProvider();
    }
  }

  return new MockAIProvider();
}

/**
 * Direct pre-visit summary generator.
 */
export async function generatePreVisitSummary(symptoms: string): Promise<PreVisitResponse> {
  const provider = getAIProvider();
  return await provider.generatePreVisitSummary(symptoms);
}

/**
 * Direct post-visit summary generator.
 */
export async function generatePostVisitSummary(input: PostVisitInput): Promise<PostVisitResponse> {
  const provider = getAIProvider();
  return await provider.generatePostVisitSummary(input);
}

/**
 * Non-blocking, isolated pre-visit symptom processor.
 * Guarantees that appointment booking succeeds even if AI service is unavailable.
 */
export async function processPreVisitSummaryAsync(
  appointmentId: string,
  symptoms: string
): Promise<void> {
  try {
    const summary = await generatePreVisitSummary(symptoms);

    const urgencyEnum: UrgencyLevel =
      summary.urgency.toUpperCase() === "HIGH"
        ? UrgencyLevel.HIGH
        : summary.urgency.toUpperCase() === "LOW"
        ? UrgencyLevel.LOW
        : UrgencyLevel.MEDIUM;

    await prisma.symptomSubmission.update({
      where: { appointmentId },
      data: {
        urgencyLevel: urgencyEnum,
        chiefComplaint: summary.chiefComplaint,
        doctorQuestions: summary.suggestedQuestions,
        llmSummary: `Chief Complaint: ${summary.chiefComplaint}\n\nSuggested Clinical Inquiries:\n1. ${summary.suggestedQuestions[0]}\n2. ${summary.suggestedQuestions[1]}\n3. ${summary.suggestedQuestions[2]}`,
        llmGeneratedAt: new Date(),
        llmFailureMessage: null,
      },
    });
  } catch (err) {
    const errorMsg = (err as Error).message || "AI summary generation failed.";
    console.error(`[AI Pre-Visit Non-Blocking Failure] Appointment: ${appointmentId}:`, errorMsg);

    try {
      await prisma.symptomSubmission.update({
        where: { appointmentId },
        data: {
          llmFailureMessage: `AI Summary Unavailable: ${errorMsg}`,
        },
      });
    } catch {
      // Non-critical background failure suppression
    }
  }
}

/**
 * Non-blocking, isolated post-visit consultation processor.
 * Guarantees that doctor notes and prescription stay intact even if AI generation fails.
 */
export async function processPostVisitSummaryAsync(
  appointmentId: string,
  clinicalNotes: string,
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string | null;
  }>,
  followUpSteps?: string | null
): Promise<void> {
  try {
    const postVisit = await generatePostVisitSummary({
      clinicalNotes,
      medications,
      followUpSteps,
    });

    const fullSummaryText = `${postVisit.summary}\n\nMedication Schedule:\n${postVisit.medicationSchedule}`;
    const fullFollowUpText = `${postVisit.followUpInstructions}\n\nActionable Next Steps:\n${postVisit.nextSteps}`;

    await prisma.prescription.update({
      where: { appointmentId },
      data: {
        patientFriendlySummary: fullSummaryText,
        followUpSteps: fullFollowUpText,
        llmGeneratedAt: new Date(),
        llmFailureMessage: null,
      },
    });
  } catch (err) {
    const errorMsg = (err as Error).message || "AI post-visit summary generation failed.";
    console.error(`[AI Post-Visit Non-Blocking Failure] Appointment: ${appointmentId}:`, errorMsg);

    try {
      await prisma.prescription.update({
        where: { appointmentId },
        data: {
          llmFailureMessage: `AI Summary Unavailable: ${errorMsg}`,
        },
      });
    } catch {
      // Non-critical background failure suppression
    }
  }
}
