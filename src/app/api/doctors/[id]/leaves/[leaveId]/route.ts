import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { requireAuth, assertDoctorOwnership } from "@/auth/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; leaveId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, leaveId } = await context.params;

    assertDoctorOwnership(id, user);

    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave || leave.doctorId !== id) {
      return errorResponse("NOT_FOUND", "Leave record not found for this doctor.", 404);
    }

    await prisma.doctorLeave.delete({
      where: { id: leaveId },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
