import { NextRequest } from "next/server";
import { requireAuth, ForbiddenError } from "@/auth/rbac";
import { prisma } from "@/database/prisma";
import {
  generatePreVisitSummary,
  generatePostVisitSummary,
} from "@/lib/ai/ai-service";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { AppointmentNotFoundError } from "@/services/appointment";
import { UrgencyLevel } from "@prisma/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
        patient: true,
        symptomSubmission: true,
        prescription: { include: { medications: true } },
      },
    });

    if (!appointment) {
      throw new AppointmentNotFoundError();
    }

    const isAuthorized =
      user.role === "ADMIN" ||
      (user.role === "DOCTOR" && appointment.doctor.userId === user.id) ||
      (user.role === "PATIENT" && appointment.patient.userId === user.id);

    if (!isAuthorized) {
      throw new ForbiddenError("You do not have access to this appointment.");
    }

    const body = await request.json().catch(() => ({}));
    const summaryType = body.type || "PRE_VISIT";

    if (summaryType === "PRE_VISIT" && appointment.symptomSubmission) {
      const result = await generatePreVisitSummary(appointment.symptomSubmission.symptoms);

      const urgencyEnum: UrgencyLevel =
        result.urgency.toUpperCase() === "HIGH"
          ? UrgencyLevel.HIGH
          : result.urgency.toUpperCase() === "LOW"
          ? UrgencyLevel.LOW
          : UrgencyLevel.MEDIUM;

      const updated = await prisma.symptomSubmission.update({
        where: { appointmentId: id },
        data: {
          urgencyLevel: urgencyEnum,
          chiefComplaint: result.chiefComplaint,
          doctorQuestions: result.suggestedQuestions,
          llmSummary: `Chief Complaint: ${result.chiefComplaint}\n\nSuggested Inquiries:\n1. ${result.suggestedQuestions[0]}\n2. ${result.suggestedQuestions[1]}\n3. ${result.suggestedQuestions[2]}`,
          llmGeneratedAt: new Date(),
          llmFailureMessage: null,
        },
      });

      return successResponse({ preVisitSummary: result, symptomSubmission: updated });
    }

    if (summaryType === "POST_VISIT" && appointment.prescription) {
      const result = await generatePostVisitSummary({
        clinicalNotes: appointment.prescription.clinicalNotes,
        medications: appointment.prescription.medications,
        followUpSteps: appointment.prescription.followUpSteps,
      });

      const updated = await prisma.prescription.update({
        where: { appointmentId: id },
        data: {
          patientFriendlySummary: `${result.summary}\n\nMedication Schedule:\n${result.medicationSchedule}`,
          followUpSteps: `${result.followUpInstructions}\n\nNext Steps:\n${result.nextSteps}`,
          llmGeneratedAt: new Date(),
          llmFailureMessage: null,
        },
      });

      return successResponse({ postVisitSummary: result, prescription: updated });
    }

    return successResponse({ message: "No summary generated for requested type." });
  } catch (error) {
    return handleApiError(error);
  }
}
