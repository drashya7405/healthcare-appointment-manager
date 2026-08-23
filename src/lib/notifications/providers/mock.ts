import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./types";

export interface MockSentEmail extends SendEmailOptions {
  id: string;
  sentAt: Date;
}

export class MockEmailProvider implements EmailProvider {
  name = "mock";
  private sentEmails: MockSentEmail[] = [];

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const toStr = Array.isArray(options.to) ? options.to.join(",") : options.to;

    if (
      process.env.EMAIL_MOCK_FAILURE === "true" ||
      toStr.includes("simulate_email_failure") ||
      options.subject.includes("simulate_email_failure")
    ) {
      return {
        success: false,
        error: "Simulated email provider network failure.",
      };
    }

    const messageId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: MockSentEmail = {
      ...options,
      id: messageId,
      sentAt: new Date(),
    };

    this.sentEmails.push(record);

    return {
      success: true,
      messageId,
    };
  }

  getSentEmails(): MockSentEmail[] {
    return [...this.sentEmails];
  }

  getLastEmail(): MockSentEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

// Global shared singleton for test assertions across requests
export const globalMockEmailProvider = new MockEmailProvider();
