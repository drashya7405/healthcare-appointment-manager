import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/rbac";
import { retryFailedNotifications, retryNotification } from "@/lib/notifications/email-service";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));

    if (body.notificationId) {
      const updated = await retryNotification(body.notificationId);
      return successResponse({ notification: updated });
    }

    const summary = await retryFailedNotifications(body.maxAttempts || 3);
    return successResponse({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
