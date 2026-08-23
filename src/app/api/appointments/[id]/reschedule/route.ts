import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/rbac";
import { rescheduleAppointmentSchema } from "@/validation/appointment";
import { rescheduleAppointment } from "@/services/appointment";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const body = await request.json();
    const validatedData = rescheduleAppointmentSchema.parse(body);

    const appointment = await rescheduleAppointment(
      id,
      user,
      validatedData.newStartsAt,
      validatedData.reason
    );

    return successResponse({ appointment });
  } catch (error) {
    return handleApiError(error);
  }
}
