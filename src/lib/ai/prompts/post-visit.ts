interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string | null;
}

export const POST_VISIT_SYSTEM_PROMPT = `You are an empathetic, patient-centered healthcare communication assistant.

Your task is to translate doctor clinical notes and prescribed medications into a clear, patient-friendly consultation summary and daily medication schedule.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON object matching this schema:
{
  "summary": "A clear, reassuring, plain-language explanation of the diagnosis and consultation findings (avoid dense medical jargon)",
  "medicationSchedule": "A structured, easy-to-follow daily schedule explaining how and when to take each prescribed medication (including dosages and food instructions)",
  "followUpInstructions": "Clear instructions regarding follow-up consultations, monitoring, or lab tests",
  "nextSteps": "Actionable lifestyle tips, self-care guidance, and red-flag warning signs when to seek immediate emergency medical care"
}

2. Ensure all prescribed medications from the input are clearly included in the medicationSchedule with instructions. If no medications were prescribed, state: "No medications prescribed during this visit."

3. SAFETY DISCLAIMER:
Clearly explain the doctor's instructions in plain language without altering the medical guidance.`;

export function buildPostVisitUserPrompt(
  clinicalNotes: string,
  medications: MedicationInput[],
  followUpSteps?: string | null
): string {
  const medsList =
    medications.length > 0
      ? medications
          .map(
            (m, i) =>
              `${i + 1}. ${m.name} (Dosage: ${m.dosage}, Frequency: ${m.frequency}${
                m.instructions ? `, Instructions: ${m.instructions}` : ""
              })`
          )
          .join("\n")
      : "None prescribed.";

  return `Doctor's Clinical Notes & Diagnosis:
"""
${clinicalNotes.trim()}
"""

Prescribed Medications:
"""
${medsList}
"""

Doctor's Follow-up Instructions:
"""
${followUpSteps ? followUpSteps.trim() : "Standard routine follow-up as needed."}
"""

Generate the structured JSON patient-friendly summary, medicationSchedule, followUpInstructions, and nextSteps.`;
}
