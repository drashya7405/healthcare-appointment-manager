import { NextRequest } from "next/server";
import { requireAuth, requirePatient } from "@/auth/rbac";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "@/validation/appointment";
import { bookAppointment, listAppointments } from "@/services/appointment";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const query = listAppointmentsQuerySchema.parse({
      doctorId: searchParams.get("doctorId") || undefined,
      patientId: searchParams.get("patientId") || undefined,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });

    const appointments = await listAppointments(user, query);

    return successResponse({ appointments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePatient();
    const body = await request.json();
    const validatedData = createAppointmentSchema.parse(body);

    const appointment = await bookAppointment(user.id, validatedData);

    return successResponse({ appointment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
