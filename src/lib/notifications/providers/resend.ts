import { Resend } from "resend";
import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./types";

export class ResendEmailProvider implements EmailProvider {
  name = "resend";
  private client: Resend;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    const key = apiKey || process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not configured in environment variables.");
    }
    this.client = new Resend(key);
    this.defaultFrom =
      defaultFrom ||
      process.env.EMAIL_FROM ||
      "Healthcare Clinic <onboarding@resend.dev>";
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const response = await this.client.emails.send({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err) {
      const errorMsg = (err as Error).message || "Unknown error during Resend email dispatch.";
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
