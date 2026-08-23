import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "@/auth/rbac";
import { getGoogleAuthUrl } from "@/lib/google/oauth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
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

    const origin = request.nextUrl.origin;
    const dynamicRedirectUri = `${origin}/api/auth/google/callback`;
    const authUrl = getGoogleAuthUrl(state, process.env.GOOGLE_REDIRECT_URI || dynamicRedirectUri);

    return NextResponse.redirect(authUrl);
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", "/doctor/dashboard");
    return NextResponse.redirect(loginUrl);
  }
}
