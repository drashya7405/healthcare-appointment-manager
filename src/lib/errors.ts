import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/auth/rbac";
import { SlotUnavailableError, AppointmentNotFoundError } from "@/services/appointment";
import { errorResponse } from "@/lib/api-response";

/** Centralized error boundary for route handlers. */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", "Invalid request data.", 400, error.issues);
  }

  if (error instanceof UnauthorizedError) {
    return errorResponse(error.code, error.message, error.statusCode);
  }

  if (error instanceof ForbiddenError) {
    return errorResponse(error.code, error.message, error.statusCode);
  }

  if (error instanceof SlotUnavailableError) {
    return errorResponse(error.code, error.message, error.statusCode);
  }

  if (error instanceof AppointmentNotFoundError) {
    return errorResponse(error.code, error.message, error.statusCode);
  }

  if (error instanceof Error) {
    console.error("API error:", error.message);
    return errorResponse("INTERNAL_ERROR", error.message, 500);
  }

  console.error("Unhandled API error", error);
  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
