import { NextRequest } from "next/server";
import { requireAdmin } from "@/auth/rbac";
import {
  runAppointmentRemindersJob,
  runMedicationRemindersJob,
  runEmailRetriesJob,
  runAllBackgroundJobs,
} from "@/lib/jobs/runner";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const job = body.job || "all";

    let result;
    if (job === "appointmentReminders") {
      result = await runAppointmentRemindersJob(body.windowHours || 24);
    } else if (job === "medicationReminders") {
      result = await runMedicationRemindersJob();
    } else if (job === "emailRetries") {
      result = await runEmailRetriesJob(body.maxAttempts || 3);
    } else if (job === "all") {
      result = await runAllBackgroundJobs();
    } else {
      return errorResponse("BAD_REQUEST", `Unknown job type: ${job}`, 400);
    }

    return successResponse({ job, result });
  } catch (error) {
    return handleApiError(error);
  }
}
