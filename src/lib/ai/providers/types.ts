import type { PreVisitResponse } from "../schemas/pre-visit";
import type { PostVisitResponse } from "../schemas/post-visit";

export interface PostVisitInput {
  clinicalNotes: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string | null;
  }>;
  followUpSteps?: string | null;
}

export interface AIProvider {
  name: string;
  generatePreVisitSummary(symptoms: string): Promise<PreVisitResponse>;
  generatePostVisitSummary(input: PostVisitInput): Promise<PostVisitResponse>;
}
