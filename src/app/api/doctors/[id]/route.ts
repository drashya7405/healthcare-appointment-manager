import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { requireAdmin } from "@/auth/rbac";
import { updateDoctorSchema } from "@/validation/doctor";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        workingHours: { orderBy: { day: "asc" } },
        leaves: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
        },
      },
    });

    if (!doctor) {
      return errorResponse("NOT_FOUND", "Doctor not found.", 404);
    }

    return successResponse({ doctor });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const body = await request.json();
    const validatedData = updateDoctorSchema.parse(body);

    const existingDoctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!existingDoctor) {
      return errorResponse("NOT_FOUND", "Doctor not found.", 404);
    }

    const updatedDoctor = await prisma.$transaction(async (tx) => {
      if (validatedData.name !== undefined || validatedData.isActive !== undefined) {
        await tx.user.update({
          where: { id: existingDoctor.userId },
          data: {
            name: validatedData.name,
            isActive: validatedData.isActive,
          },
        });
      }

      return tx.doctor.update({
        where: { id },
        data: {
          specialization: validatedData.specialization,
          bio: validatedData.bio,
          slotDurationMins: validatedData.slotDurationMins,
          timezone: validatedData.timezone,
        },
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
          workingHours: true,
        },
      });
    });

    return successResponse({ doctor: updatedDoctor });
  } catch (error) {
    return handleApiError(error);
  }
}
