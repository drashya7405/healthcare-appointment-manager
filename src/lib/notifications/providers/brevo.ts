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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log("[Email] Provider=brevo");
      console.log("[Email] Attempting transactional email");

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
        signal: controller.signal,
      });

      console.log(`[Email] Brevo response status=${response.status}`);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          data?.message || data?.code || `Brevo API returned error status ${response.status}`;
        console.error(`[Email] Brevo request failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      return {
        success: true,
        messageId: data?.messageId || "brevo-sent",
      };
    } catch (err) {
      const isAbort = (err as Error).name === "AbortError";
      const errorMsg = isAbort
        ? "Brevo API request timed out after 15 seconds."
        : (err as Error).message || "Unknown error during Brevo email dispatch.";
      console.error(`[Email] Brevo request failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
