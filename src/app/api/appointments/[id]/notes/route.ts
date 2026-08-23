import { NextRequest } from "next/server";
import { requireAuth, ForbiddenError } from "@/auth/rbac";
import { prisma } from "@/database/prisma";
import { updateNotesSchema } from "@/validation/prescription";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { AppointmentNotFoundError } from "@/services/appointment";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, prescription: true },
    });

    if (!appointment) {
      throw new AppointmentNotFoundError();
    }

    const isAuthorized =
      user.role === "ADMIN" ||
      (user.role === "DOCTOR" && appointment.doctor.userId === user.id);

    if (!isAuthorized) {
      throw new ForbiddenError("You do not have permission to update notes for this appointment.");
    }

    const body = await request.json();
    const validated = updateNotesSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      // Upsert prescription note
      await tx.prescription.upsert({
        where: { appointmentId: id },
        create: {
          appointmentId: id,
          clinicalNotes: validated.clinicalNotes,
        },
        update: {
          clinicalNotes: validated.clinicalNotes,
        },
      });

      if (validated.status) {
        await tx.appointment.update({
          where: { id },
          data: { status: validated.status },
        });
      }

      return tx.appointment.findUnique({
        where: { id },
        include: {
          prescription: { include: { medications: true } },
          symptomSubmission: true,
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
        },
      });
    });

    return successResponse({ appointment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
