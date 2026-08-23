# Phase 6: LLM Integration Using Groq Free API

## 1. Overview & Architecture

Phase 6 implements a fully decoupled, medical-safety-compliant AI layer powered by the **Groq API Free Tier** (`openai/gpt-oss-120b` and compatible Groq models) using the official `groq-sdk`.

The integration follows a strict non-blocking provider architecture:
```text
AI Service (ai-service.ts)
    ↓
Provider Abstraction (AIProvider interface)
    ├── GroqProvider (using groq-sdk with JSON mode & Zod validation)
    └── MockAIProvider (deterministic execution for tests & simulated failure)
```

---

## 2. Core Features

### A. Pre-Visit Symptom Summarization
- **Trigger**: Automatically queued in the background upon appointment booking, or on-demand via `POST /api/appointments/[id]/ai-summary` (`{ type: "PRE_VISIT" }`).
- **Structured JSON Schema**:
  ```json
  {
    "urgency": "Low | Medium | High",
    "chiefComplaint": "Concise summary of patient primary issue",
    "suggestedQuestions": [
      "Question 1 for doctor to ask",
      "Question 2 for doctor to ask",
      "Question 3 for doctor to ask"
    ]
  }
  ```
- **Validation**: Enforced via `preVisitResponseSchema` with Zod (validates urgency enum and strictly requires 3 diagnostic questions).
- **Medical Safety Rules**:
  - Labeled explicitly as *"AI-generated urgency indicator (Informational brief, not a medical diagnosis)"*.
  - Original raw symptoms entered by the patient are preserved separately and displayed side-by-side to the clinician.

### B. Post-Visit Patient-Friendly Clinical Instructions
- **Trigger**: Queued in the background upon doctor prescription entry / visit completion, or on-demand via `POST /api/appointments/[id]/ai-summary` (`{ type: "POST_VISIT" }`).
- **Structured JSON Schema**:
  ```json
  {
    "summary": "Plain-language, reassuring clinical summary",
    "medicationSchedule": "Clear schedule of when and how to take each prescribed medicine",
    "followUpInstructions": "Follow-up consultation instructions",
    "nextSteps": "Lifestyle guidance, self-care, and red-flag emergency symptoms"
  }
  ```
- **Validation**: Enforced via `postVisitResponseSchema` with Zod.
- **Distinction**: Patient portal clearly segregates *"Doctor-Entered Official Diagnosis & Notes"* from *"AI-Generated Patient Guide"*.

---

## 3. Resilience & Failure Isolation

1. **Non-Blocking Execution**:
   - Appointment booking and prescription storage execute inside database transactions independently of AI calls.
   - If Groq is unavailable, rate-limited, or times out:
     - The appointment booking succeeds 100%.
     - Original symptoms / doctor notes remain intact.
     - Failure is logged gracefully to `llmFailureMessage` without crashing the application.
2. **Deterministic Mock & Simulation Modes**:
   - `AI_PROVIDER=mock`: Runs deterministic mock AI without consuming external API quota.
   - `AI_MOCK_FAILURE=true`: Simulates API failures for automated resilience testing.

---

## 4. Verification & Testing

- **Automated Tests**: 72 tests passing 100% across all suites:
  - Structured JSON validation & schema constraints.
  - Mock deterministic mode & failure simulation.
  - Live Groq API JSON response parsing and Zod validation.
  - Non-blocking error containment and raw data preservation.
- **Production Build**: All 19 Next.js routes built and verified cleanly.
