import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  AI_PROVIDER: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/** Validates server-only configuration only when a feature needs it. */
export function getServerEnv() {
  return serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GROQ_API_KEY: process.env.GROQ_API_KEY || undefined,
    GROQ_MODEL: process.env.GROQ_MODEL || undefined,
    AI_PROVIDER: process.env.AI_PROVIDER || undefined,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || undefined,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY || undefined,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY || undefined,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  });
}
