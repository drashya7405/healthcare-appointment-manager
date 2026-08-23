import { NextRequest } from "next/server";
import { getDoctorAvailability } from "@/services/availability";
import { availabilityQuerySchema } from "@/validation/doctor";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const validatedQuery = availabilityQuerySchema.parse({
      date: dateParam,
    });

    const availability = await getDoctorAvailability(id, validatedQuery.date);

    return successResponse(availability);
  } catch (error) {
    return handleApiError(error);
  }
}
