import Groq from "groq-sdk";
import type { AIProvider, PostVisitInput } from "./types";
import { preVisitResponseSchema, type PreVisitResponse } from "../schemas/pre-visit";
import { postVisitResponseSchema, type PostVisitResponse } from "../schemas/post-visit";
import { PRE_VISIT_SYSTEM_PROMPT, buildPreVisitUserPrompt } from "../prompts/pre-visit";
import { POST_VISIT_SYSTEM_PROMPT, buildPostVisitUserPrompt } from "../prompts/post-visit";

export class GroqProvider implements AIProvider {
  name = "groq";
  private client: Groq;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured in environment variables.");
    }
    this.client = new Groq({ apiKey: key });
    this.model = model || process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  async generatePreVisitSummary(symptoms: string): Promise<PreVisitResponse> {
    const userPrompt = buildPreVisitUserPrompt(symptoms);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: PRE_VISIT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq API returned an empty completion response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse Groq completion as JSON: ${content}`);
    }

    const validated = preVisitResponseSchema.safeParse(parsed);
    if (!validated.success) {
      const errorMsgs = validated.error.issues.map((i) => i.message).join("; ");
      throw new Error(`Pre-visit summary validation failed: ${errorMsgs}`);
    }

    return validated.data;
  }

  async generatePostVisitSummary(input: PostVisitInput): Promise<PostVisitResponse> {
    const userPrompt = buildPostVisitUserPrompt(
      input.clinicalNotes,
      input.medications,
      input.followUpSteps
    );

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: POST_VISIT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq API returned an empty completion response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse Groq completion as JSON: ${content}`);
    }

    const validated = postVisitResponseSchema.safeParse(parsed);
    if (!validated.success) {
      const errorMsgs = validated.error.issues.map((i) => i.message).join("; ");
      throw new Error(`Post-visit summary validation failed: ${errorMsgs}`);
    }

    return validated.data;
  }
}
