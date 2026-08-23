import { requireAuth } from "@/auth/rbac";
import { prisma } from "@/database/prisma";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();

    if (!user.doctor) {
      return successResponse({ connected: false, status: "NOT_DOCTOR" });
    }

    const connection = await prisma.calendarConnection.findUnique({
      where: { doctorId: user.doctor.id },
      select: {
        provider: true,
        googleEmail: true,
        status: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    if (!connection || connection.status !== "CONNECTED") {
      return successResponse({
        connected: false,
        status: connection?.status || "DISCONNECTED",
      });
    }

    return successResponse({
      connected: true,
      provider: connection.provider,
      googleEmail: connection.googleEmail,
      status: connection.status,
      expiresAt: connection.expiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
