import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./types";

export class BrevoEmailProvider implements EmailProvider {
  name = "brevo";
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    const key = apiKey || process.env.BREVO_API_KEY;
    if (!key) {
      throw new Error("BREVO_API_KEY is not configured in environment variables.");
    }
    this.apiKey = key;
    this.defaultFrom =
      defaultFrom ||
      process.env.EMAIL_FROM ||
      "Healthcare Appointment Manager <drashya745@gmail.com>";
  }

  /**
   * Helper to parse sender or recipient string: "Name <email@domain.com>" or "email@domain.com".
   */
  private parseEmailAddress(addr: string): { name?: string; email: string } {
    const match = addr.match(/^(.*?)\s*<([^>]+)>?$/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      return name ? { name, email } : { email };
    }
    return { email: addr.trim() };
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const sender = this.parseEmailAddress(options.from || this.defaultFrom);
      const toList = Array.isArray(options.to) ? options.to : [options.to];
      const recipients = toList.map((t) => this.parseEmailAddress(t));

      const payload: Record<string, unknown> = {
        sender,
        to: recipients,
        subject: options.subject,
        htmlContent: options.html,
      };

      if (options.text) {
        payload.textContent = options.text;
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message || data?.code || `Brevo API returned error status ${response.status}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      return {
        success: true,
        messageId: data?.messageId,
      };
    } catch (err) {
      const errorMsg = (err as Error).message || "Unknown error during Brevo email dispatch.";
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
