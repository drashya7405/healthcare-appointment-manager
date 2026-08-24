import { requireDoctor } from "@/auth/rbac";
import { disconnectDoctorGoogleCalendar } from "@/lib/google/oauth";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireDoctor();

    if (!user.doctor) {
      throw new Error("Doctor profile not found.");
    }

    await disconnectDoctorGoogleCalendar(user.doctor.id);

    return successResponse({
      connected: false,
      message: "Google Calendar successfully disconnected.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
