import { NextRequest } from "next/server";
import { prisma } from "@/database/prisma";
import { requireAdmin } from "@/auth/rbac";
import { createDoctorSchema } from "@/validation/doctor";
import { hashPassword } from "@/lib/password";
import { successResponse, errorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get("specialization");

    const whereClause: {
      specialization?: { contains: string; mode: "insensitive" };
      user?: { isActive: boolean };
    } = {};

    if (specialization) {
      whereClause.specialization = { contains: specialization, mode: "insensitive" };
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        workingHours: {
          orderBy: { day: "asc" },
        },
        leaves: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse({ doctors });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createDoctorSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return errorResponse("EMAIL_IN_USE", "An account with this email already exists.", 400);
    }

    const passwordHash = await hashPassword(validatedData.password);

    const doctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          passwordHash,
          role: "DOCTOR",
          isActive: true,
        },
      });

      const newDoctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialization: validatedData.specialization,
          bio: validatedData.bio || null,
          slotDurationMins: validatedData.slotDurationMins,
          timezone: validatedData.timezone,
          workingHours: validatedData.workingHours
            ? {
                createMany: {
                  data: validatedData.workingHours.map((wh) => ({
                    day: wh.day,
                    startTime: wh.startTime,
                    endTime: wh.endTime,
                  })),
                },
              }
            : undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
          workingHours: true,
        },
      });

      return newDoctor;
    });

    return successResponse({ doctor }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
