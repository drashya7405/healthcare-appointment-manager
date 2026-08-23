import { requireAdmin } from "@/auth/rbac";
import { prisma } from "@/database/prisma";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();

    const notifications = await prisma.notification.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        appointment: {
          select: {
            startsAt: true,
            doctor: { select: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return successResponse({ notifications });
  } catch (error) {
    return handleApiError(error);
  }
}
