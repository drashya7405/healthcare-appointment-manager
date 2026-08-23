import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { registerPatientSchema } from "@/validation/auth";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/auth/session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import type { SafeUser, AuthResult } from "@/types/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerPatientSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return errorResponse("EMAIL_IN_USE", "An account with this email already exists.", 400);
    }

    const passwordHash = await hashPassword(validatedData.password);

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: "PATIENT",
        patient: {
          create: {
            phone: validatedData.phone || null,
            dateOfBirth: validatedData.dateOfBirth || null,
            gender: validatedData.gender || null,
            emergencyContact: validatedData.emergencyContact || null,
            medicalHistory: validatedData.medicalHistory || null,
          },
        },
      },
      include: {
        patient: true,
      },
    });

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
      doctor: null,
    };

    return successResponse<AuthResult>(
      {
        user: safeUser,
        redirectUrl: "/patient/dashboard",
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
