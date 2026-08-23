import { successResponse } from "@/lib/api-response";

export function GET() {
  return successResponse({
    service: "healthcare-appointment-manager",
    status: "ok",
  });
}
