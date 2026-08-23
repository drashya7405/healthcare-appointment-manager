import { destroySession, clearSessionCookie, getCurrentSessionToken } from "@/auth/session";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    const token = await getCurrentSessionToken();
    if (token) {
      await destroySession(token);
    }
    await clearSessionCookie();

    return successResponse({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
