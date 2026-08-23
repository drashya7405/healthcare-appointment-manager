import type { AIProvider, PostVisitInput } from "./types";
import type { PreVisitResponse } from "../schemas/pre-visit";
import type { PostVisitResponse } from "../schemas/post-visit";

export class MockAIProvider implements AIProvider {
  name = "mock";

  async generatePreVisitSummary(symptoms: string): Promise<PreVisitResponse> {
    if (
      process.env.AI_MOCK_FAILURE === "true" ||
      symptoms.includes("simulate_ai_failure")
    ) {
      throw new Error("Simulated Mock AI API service failure.");
    }

    const lower = symptoms.toLowerCase();
    let urgency: "Low" | "Medium" | "High" = "Low";

    if (
      lower.includes("chest pain") ||
      lower.includes("shortness of breath") ||
      lower.includes("bleeding") ||
      lower.includes("severe")
    ) {
      urgency = "High";
    } else if (
      lower.includes("fever") ||
      lower.includes("vomiting") ||
      lower.includes("days") ||
      lower.includes("dizziness")
    ) {
      urgency = "Medium";
    }

    return {
      urgency,
      chiefComplaint: `Patient reports: ${symptoms.slice(0, 80)}${symptoms.length > 80 ? "..." : ""}`,
      suggestedQuestions: [
        "How long have you been experiencing these exact symptoms?",
        "Have you taken any over-the-counter medications to relieve the discomfort?",
        "Do you have a personal or family history of similar clinical episodes?",
      ],
    };
  }

  async generatePostVisitSummary(input: PostVisitInput): Promise<PostVisitResponse> {
    if (
      process.env.AI_MOCK_FAILURE === "true" ||
      input.clinicalNotes.includes("simulate_ai_failure")
    ) {
      throw new Error("Simulated Mock AI API service failure.");
    }

    const medsSummary =
      input.medications.length > 0
        ? input.medications
            .map((m) => `• Take ${m.name} (${m.dosage}) ${m.frequency}${m.instructions ? ` - ${m.instructions}` : ""}`)
            .join("\n")
        : "No prescription medications were required for this consultation.";

    return {
      summary: `During your visit, the doctor assessed your condition: ${input.clinicalNotes}. Follow the outlined care instructions closely to support complete recovery.`,
      medicationSchedule: medsSummary,
      followUpInstructions:
        input.followUpSteps ||
        "Monitor symptoms daily and schedule a follow-up consultation if discomfort persists.",
      nextSteps:
        "Rest, stay well hydrated, and contact urgent medical care immediately if you experience severe shortness of breath or persistent high fever.",
    };
  }
}
