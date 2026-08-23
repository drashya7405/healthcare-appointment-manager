import { getCurrentUser } from "@/auth/session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated.", 401);
    }

    return successResponse({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
