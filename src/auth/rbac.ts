import { getCurrentUser } from "@/auth/session";
import type { SafeUser, UserRole } from "@/types/auth";

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = "UNAUTHORIZED";
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = "FORBIDDEN";
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Ensures the request is authenticated, returning the verified SafeUser.
 */
export async function requireAuth(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Ensures the authenticated user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<SafeUser> {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Role '${user.role}' is not authorized for this resource.`
    );
  }

  return user;
}

/**
 * Enforces PATIENT role on the active session.
 */
export async function requirePatient(): Promise<SafeUser> {
  return requireRole("PATIENT");
}

/**
 * Enforces DOCTOR role on the active session.
 */
export async function requireDoctor(): Promise<SafeUser> {
  return requireRole("DOCTOR");
}

/**
 * Enforces ADMIN role on the active session.
 */
export async function requireAdmin(): Promise<SafeUser> {
  return requireRole("ADMIN");
}

/**
 * Enforces DOCTOR or ADMIN role on the active session.
 */
export async function requireDoctorOrAdmin(): Promise<SafeUser> {
  return requireRole(["DOCTOR", "ADMIN"]);
}

/**
 * Ensures the active user owns the target resource or is an Admin.
 */
export function assertResourceOwnership(
  resourceOwnerUserId: string,
  currentUser: SafeUser,
  allowAdmin = true
): boolean {
  if (allowAdmin && currentUser.role === "ADMIN") {
    return true;
  }

  if (currentUser.id !== resourceOwnerUserId) {
    throw new ForbiddenError("You cannot view or modify another user's resources.");
  }

  return true;
}

/**
 * Ensures the active user is the specified Doctor or an Admin.
 */
export function assertDoctorOwnership(
  targetDoctorId: string,
  currentUser: SafeUser,
  allowAdmin = true
): boolean {
  if (allowAdmin && currentUser.role === "ADMIN") {
    return true;
  }

  if (!currentUser.doctor || currentUser.doctor.id !== targetDoctorId) {
    throw new ForbiddenError("You cannot modify another doctor's schedule or information.");
  }

  return true;
}

/**
 * Maps a verified role to its corresponding portal route.
 */
export function getRoleDashboardUrl(role: UserRole): string {
  switch (role) {
    case "PATIENT":
      return "/patient/dashboard";
    case "DOCTOR":
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}
