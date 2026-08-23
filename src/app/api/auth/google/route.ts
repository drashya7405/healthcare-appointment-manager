import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "@/auth/rbac";
import { getGoogleAuthUrl } from "@/lib/google/oauth";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }

    const state = crypto.randomBytes(24).toString("hex");

    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(new URL("/login?redirect=/doctor/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
}
