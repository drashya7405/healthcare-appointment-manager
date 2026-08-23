import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/database/prisma";
import type { SafeUser } from "@/types/auth";

export const SESSION_COOKIE_NAME = "healthcare_session";
export const SESSION_EXPIRY_DAYS = 7;

/**
 * Creates a cryptographically random session token and persists it to the database.
 */
export async function createSession(userId: string): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

/**
 * Validates a session token, returning the associated safe user if valid and active.
 */
export async function validateSession(sessionToken: string): Promise<{ user: SafeUser; expiresAt: Date } | null> {
  if (!sessionToken || sessionToken.length < 16) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          patient: true,
          doctor: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Asynchronously delete expired session
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Check if user is active
  if (!session.user.isActive) {
    return null;
  }

  const safeUser: SafeUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    isActive: session.user.isActive,
    createdAt: session.user.createdAt,
    updatedAt: session.user.updatedAt,
    patient: session.user.patient
      ? {
          id: session.user.patient.id,
          phone: session.user.patient.phone,
          dateOfBirth: session.user.patient.dateOfBirth,
          gender: session.user.patient.gender,
          emergencyContact: session.user.patient.emergencyContact,
          medicalHistory: session.user.patient.medicalHistory,
        }
      : null,
    doctor: session.user.doctor
      ? {
          id: session.user.doctor.id,
          specialization: session.user.doctor.specialization,
          bio: session.user.doctor.bio,
          slotDurationMins: session.user.doctor.slotDurationMins,
          timezone: session.user.doctor.timezone,
        }
      : null,
  };

  return { user: safeUser, expiresAt: session.expiresAt };
}

/**
 * Destroys a session in the database by token.
 */
export async function destroySession(sessionToken: string): Promise<void> {
  if (!sessionToken) return;
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Destroys all sessions for a given user.
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Sets the session cookie in the Next.js response context.
 */
export async function setSessionCookie(sessionToken: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

/**
 * Retrieves the current session token from cookies if present.
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Server-side helper to get the current authenticated user from cookies.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = await getCurrentSessionToken();
  if (!token) return null;
  const result = await validateSession(token);
  return result ? result.user : null;
}
