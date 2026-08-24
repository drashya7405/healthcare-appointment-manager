import { requireAdmin } from "@/auth/rbac";
import { getEmailProvider } from "@/lib/notifications/email-service";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET: Returns safe diagnostic status of the email subsystem without exposing secrets.
 * Strictly requires authenticated ADMIN role.
 */
export async function GET() {
  try {
    const user = await requireAdmin();

    const providerName = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();
    const brevoKeyConfigured = Boolean(
      process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().length > 0
    );
    const resendKeyConfigured = Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
    );
    const emailFrom =
      process.env.EMAIL_FROM || "Healthcare Appointment Manager <drashya745@gmail.com>";

    return successResponse({
      configuredProvider: providerName,
      brevoApiKeyConfigured: brevoKeyConfigured,
      resendApiKeyConfigured: resendKeyConfigured,
      senderConfigured: emailFrom,
      adminEmail: user.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST: Sends a single diagnostic test email ONLY to the authenticated admin's verified email.
 * Strictly ignores arbitrary recipient inputs. Never exposes secrets.
 */
export async function POST() {
  try {
    const user = await requireAdmin();
    const provider = getEmailProvider();

    const result = await provider.sendEmail({
      to: user.email,
      subject: "Healthcare Manager: Production Email Diagnostic Test",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0d9488; margin-top: 0;">Production Email Diagnostic Test</h2>
          <p>This test email confirms that transactional email delivery is functioning correctly.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <ul style="color: #475569; font-size: 14px; line-height: 1.6;">
            <li><strong>Provider:</strong> ${provider.name}</li>
            <li><strong>Recipient:</strong> ${user.name} (${user.email})</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
      `,
      text: `Production Email Diagnostic Test. Provider: ${provider.name}. Recipient: ${user.name} (${user.email}). Timestamp: ${new Date().toISOString()}`,
    });

    return successResponse({
      provider: provider.name,
      recipient: user.email,
      success: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
