import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { requireAuth, assertDoctorOwnership } from "@/auth/rbac";
import { setWorkingHoursSchema } from "@/validation/doctor";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const workingHours = await prisma.doctorWorkingHours.findMany({
      where: { doctorId: id },
      orderBy: { day: "asc" },
    });

    return successResponse({ workingHours });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    assertDoctorOwnership(id, user);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      return errorResponse("NOT_FOUND", "Doctor not found.", 404);
    }

    const body = await request.json();
    const validatedData = setWorkingHoursSchema.parse(body);

    const updatedHours = await prisma.$transaction(async (tx) => {
      // Remove previous hours
      await tx.doctorWorkingHours.deleteMany({
        where: { doctorId: id },
      });

      // Insert new working hours
      if (validatedData.workingHours.length > 0) {
        await tx.doctorWorkingHours.createMany({
          data: validatedData.workingHours.map((wh) => ({
            doctorId: id,
            day: wh.day,
            startTime: wh.startTime,
            endTime: wh.endTime,
          })),
        });
      }

      return tx.doctorWorkingHours.findMany({
        where: { doctorId: id },
        orderBy: { day: "asc" },
      });
    });

    return successResponse({ workingHours: updatedHours });
  } catch (error) {
    return handleApiError(error);
  }
}
