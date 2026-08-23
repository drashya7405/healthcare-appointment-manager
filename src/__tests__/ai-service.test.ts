import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { preVisitResponseSchema } from "../lib/ai/schemas/pre-visit";
import { postVisitResponseSchema } from "../lib/ai/schemas/post-visit";
import { MockAIProvider } from "../lib/ai/providers/mock";
import { GroqProvider } from "../lib/ai/providers/groq";
import {
  generatePreVisitSummary,
  generatePostVisitSummary,
} from "../lib/ai/ai-service";

describe("Phase 6: LLM Integration & AI Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    process.env.AI_MOCK_FAILURE = "false";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Structured Schemas & Zod Validation", () => {
    it("should validate a conforming Pre-Visit JSON response", () => {
      const validPayload = {
        urgency: "High",
        chiefComplaint: "Patient reports severe crushing chest pain radiating to the left arm.",
        suggestedQuestions: [
          "When did the pain start?",
          "Do you have a history of hypertension?",
          "Are you experiencing any shortness of breath?",
        ],
      };

      const result = preVisitResponseSchema.safeParse(validPayload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.urgency, "High");
        assert.equal(result.data.suggestedQuestions.length, 3);
      }
    });

    it("should reject Pre-Visit JSON when urgency value is invalid", () => {
      const invalidPayload = {
        urgency: "Critical", // Must be Low | Medium | High
        chiefComplaint: "Chest pain",
        suggestedQuestions: ["Q1?", "Q2?", "Q3?"],
      };

      const result = preVisitResponseSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });

    it("should reject Pre-Visit JSON when suggestedQuestions has less or more than 3 questions", () => {
      const invalidPayload = {
        urgency: "Medium",
        chiefComplaint: "Fever and cough",
        suggestedQuestions: ["Only one question?"],
      };

      const result = preVisitResponseSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });

    it("should validate a conforming Post-Visit JSON response", () => {
      const validPayload = {
        summary: "Your consultation confirmed acute bronchitis. Rest and hydration are key.",
        medicationSchedule: "Take Amoxicillin 500mg three times daily with food for 7 days.",
        followUpInstructions: "Schedule a follow-up in 10 days if cough does not improve.",
        nextSteps: "Rest, drink plenty of water, and seek emergency care if you experience difficulty breathing.",
      };

      const result = postVisitResponseSchema.safeParse(validPayload);
      assert.equal(result.success, true);
    });

    it("should reject Post-Visit JSON when required fields are missing", () => {
      const invalidPayload = {
        summary: "Bronchitis diagnosed.",
        // Missing medicationSchedule, followUpInstructions, nextSteps
      };

      const result = postVisitResponseSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });
  });

  describe("2. Mock AI Provider Deterministic Execution", () => {
    it("should generate deterministic Pre-Visit summary in Mock Mode", async () => {
      const provider = new MockAIProvider();
      const result = await provider.generatePreVisitSummary("Severe chest pain radiating to jaw");

      assert.equal(result.urgency, "High");
      assert.ok(result.chiefComplaint.length > 0);
      assert.equal(result.suggestedQuestions.length, 3);
    });

    it("should generate deterministic Post-Visit summary in Mock Mode", async () => {
      const provider = new MockAIProvider();
      const result = await provider.generatePostVisitSummary({
        clinicalNotes: "Acute Strep Pharyngitis",
        medications: [
          {
            name: "Penicillin VK",
            dosage: "500mg",
            frequency: "Twice daily",
            instructions: "Take with full glass of water",
          },
        ],
        followUpSteps: "Return in 7 days if sore throat persists",
      });

      assert.ok(result.summary.includes("Strep Pharyngitis"));
      assert.ok(result.medicationSchedule.includes("Penicillin VK"));
      assert.ok(result.nextSteps.length > 0);
    });

    it("should simulate failure when AI_MOCK_FAILURE is enabled", async () => {
      process.env.AI_MOCK_FAILURE = "true";
      const provider = new MockAIProvider();

      await assert.rejects(
        async () => {
          await provider.generatePreVisitSummary("Mild headache");
        },
        /Simulated Mock AI API service failure/
      );
    });
  });

  describe("3. Groq Provider Initialization & Safety", () => {
    it("should instantiate GroqProvider when API key is provided", () => {
      const provider = new GroqProvider("gsk_test_api_key_placeholder", "openai/gpt-oss-120b");
      assert.equal(provider.name, "groq");
    });

    it("should throw a clear error when GROQ_API_KEY is missing", () => {
      const currentKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      assert.throws(() => {
        new GroqProvider();
      }, /GROQ_API_KEY is not configured/);

      process.env.GROQ_API_KEY = currentKey;
    });
  });

  describe("4. Non-Blocking AI Failure Isolation & Data Integrity", () => {
    it("should preserve original patient symptoms and continue when AI generation fails", async () => {
      process.env.AI_MOCK_FAILURE = "true";

      const originalSymptoms = "Sharp lower back pain after heavy lifting.";

      let aiFailed = false;
      let recordedFailure: string | null = null;

      try {
        await generatePreVisitSummary(originalSymptoms);
      } catch (err) {
        aiFailed = true;
        recordedFailure = (err as Error).message;
      }

      assert.equal(aiFailed, true, "AI generation should report failure");
      assert.ok(recordedFailure?.includes("Simulated Mock AI API service failure"));

      // Crucial assertion: Original symptoms string is completely untouched and preserved
      assert.equal(originalSymptoms, "Sharp lower back pain after heavy lifting.");
    });

    it("should preserve original doctor clinical notes and continue when Post-Visit AI fails", async () => {
      process.env.AI_MOCK_FAILURE = "true";

      const doctorNotes = "Lumbar strain. Prescribed NSAIDs and physical therapy.";
      const medications = [{ name: "Ibuprofen", dosage: "400mg", frequency: "Every 6 hours" }];

      let aiFailed = false;
      let recordedFailure: string | null = null;

      try {
        await generatePostVisitSummary({
          clinicalNotes: doctorNotes,
          medications,
        });
      } catch (err) {
        aiFailed = true;
        recordedFailure = (err as Error).message;
      }

      assert.equal(aiFailed, true);
      assert.ok(recordedFailure?.includes("Simulated Mock AI API service failure"));

      // Crucial assertion: Original doctor clinical notes and medications are completely preserved
      assert.equal(doctorNotes, "Lumbar strain. Prescribed NSAIDs and physical therapy.");
      assert.equal(medications.length, 1);
      assert.equal(medications[0].name, "Ibuprofen");
    });
  });
});
