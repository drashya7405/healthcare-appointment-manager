import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/rbac";
import { getAppointmentById } from "@/services/appointment";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const appointment = await getAppointmentById(id, user);

    return successResponse({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
