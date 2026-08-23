import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/rbac";
import { cancelAppointmentSchema } from "@/validation/appointment";
import { cancelAppointment } from "@/services/appointment";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    let reason: string | undefined;
    try {
      const body = await request.json();
      const validated = cancelAppointmentSchema.parse(body);
      reason = validated.reason;
    } catch {
      // Body is optional
    }

    const appointment = await cancelAppointment(id, user, reason);

    return successResponse({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
