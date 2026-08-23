import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/rbac";
import { prisma } from "@/database/prisma";
import { createPrescriptionSchema } from "@/validation/prescription";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { ForbiddenError } from "@/auth/rbac";
import { AppointmentNotFoundError } from "@/services/appointment";
import { processPostVisitSummaryAsync } from "@/lib/ai/ai-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });

    if (!appointment) {
      throw new AppointmentNotFoundError();
    }

    // Only Admin or Assigned Doctor can create/update prescriptions
    const isAuthorized =
      user.role === "ADMIN" ||
      (user.role === "DOCTOR" && appointment.doctor.userId === user.id);

    if (!isAuthorized) {
      throw new ForbiddenError("You do not have permission to prescribe for this appointment.");
    }

    const body = await request.json();
    const validated = createPrescriptionSchema.parse(body);

    const prescription = await prisma.$transaction(async (tx) => {
      // Upsert prescription
      const p = await tx.prescription.upsert({
        where: { appointmentId: id },
        create: {
          appointmentId: id,
          clinicalNotes: validated.clinicalNotes,
          patientFriendlySummary: validated.patientFriendlySummary,
          followUpSteps: validated.followUpSteps,
          medications: {
            create: validated.medications.map((m) => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              instructions: m.instructions,
              startsOn: m.startsOn,
              endsOn: m.endsOn,
              reminderTimes: m.reminderTimes,
            })),
          },
        },
        update: {
          clinicalNotes: validated.clinicalNotes,
          patientFriendlySummary: validated.patientFriendlySummary,
          followUpSteps: validated.followUpSteps,
          medications: {
            deleteMany: {},
            create: validated.medications.map((m) => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              instructions: m.instructions,
              startsOn: m.startsOn,
              endsOn: m.endsOn,
              reminderTimes: m.reminderTimes,
            })),
          },
        },
        include: {
          medications: true,
        },
      });

      if (validated.markCompleted) {
        await tx.appointment.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
      }

      return p;
    });

    // Trigger non-blocking AI Post-visit summary in background
    processPostVisitSummaryAsync(
      id,
      validated.clinicalNotes,
      validated.medications,
      validated.followUpSteps
    ).catch((e) => console.warn("Background AI post-visit generation failed:", e));

    return successResponse({ prescription }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
