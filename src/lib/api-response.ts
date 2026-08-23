import { NextResponse } from "next/server";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function errorResponse(code: string, message: string, status = 500, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { code, message, details } },
    { status },
  );
}
