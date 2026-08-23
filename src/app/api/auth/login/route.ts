import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { loginSchema } from "@/validation/auth";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/auth/session";
import { getRoleDashboardUrl } from "@/auth/rbac";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import type { SafeUser, AuthResult } from "@/types/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!user || !user.isActive) {
      return errorResponse("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const isPasswordValid = await verifyPassword(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const { sessionToken, expiresAt } = await createSession(user.id);
    await setSessionCookie(sessionToken, expiresAt);

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      patient: user.patient
        ? {
            id: user.patient.id,
            phone: user.patient.phone,
            dateOfBirth: user.patient.dateOfBirth,
            gender: user.patient.gender,
            emergencyContact: user.patient.emergencyContact,
            medicalHistory: user.patient.medicalHistory,
          }
        : null,
      doctor: user.doctor
        ? {
            id: user.doctor.id,
            specialization: user.doctor.specialization,
            bio: user.doctor.bio,
            slotDurationMins: user.doctor.slotDurationMins,
            timezone: user.doctor.timezone,
          }
        : null,
    };

    const redirectUrl = getRoleDashboardUrl(user.role);

    return successResponse<AuthResult>(
      {
        user: safeUser,
        redirectUrl,
      },
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
