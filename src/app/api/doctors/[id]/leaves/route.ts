import { NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { requireAuth, assertDoctorOwnership } from "@/auth/rbac";
import { createLeaveSchema } from "@/validation/doctor";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { sendDoctorLeaveConflictNotice } from "@/lib/notifications/email-service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: id },
      orderBy: { startsAt: "asc" },
    });

    return successResponse({ leaves });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
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
    const validatedData = createLeaveSchema.parse(body);

    const leave = await prisma.$transaction(async (tx) => {
      const createdLeave = await tx.doctorLeave.create({
        data: {
          doctorId: id,
          startsAt: validatedData.startsAt,
          endsAt: validatedData.endsAt,
          reason: validatedData.reason || null,
        },
      });

      // Find conflicting active appointments
      const conflictingAppointments = await tx.appointment.findMany({
        where: {
          doctorId: id,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED] },
          startsAt: { lt: validatedData.endsAt },
          endsAt: { gt: validatedData.startsAt },
        },
      });

      // Mark conflicting appointments as AFFECTED_BY_LEAVE
      for (const appt of conflictingAppointments) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: {
            status: AppointmentStatus.AFFECTED_BY_LEAVE,
            cancellationReason: validatedData.reason
              ? `Affected by doctor leave: ${validatedData.reason}`
              : "Affected by scheduled doctor leave",
          },
        });
      }

      return { createdLeave, conflictingAppointmentIds: conflictingAppointments.map((a) => a.id) };
    });

    // Send notifications outside transaction
    for (const apptId of leave.conflictingAppointmentIds) {
      sendDoctorLeaveConflictNotice(apptId, validatedData.reason).catch((e) =>
        console.warn("Background leave conflict email failed:", e)
      );
    }

    return successResponse(
      {
        leave: leave.createdLeave,
        affectedAppointmentsCount: leave.conflictingAppointmentIds.length,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
