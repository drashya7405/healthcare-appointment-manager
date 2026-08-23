import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { exchangeGoogleCodeForTokens } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      const redirectUrl = new URL("/doctor/dashboard", request.url);
      redirectUrl.searchParams.set("google_error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = new URL("/doctor/dashboard", request.url);
      redirectUrl.searchParams.set("google_error", "missing_code_or_state");
      return NextResponse.redirect(redirectUrl);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;

    // CSRF validation
    if (!storedState || storedState !== state) {
      const redirectUrl = new URL("/doctor/dashboard", request.url);
      redirectUrl.searchParams.set("google_error", "invalid_csrf_state");
      return NextResponse.redirect(redirectUrl);
    }

    // Clear state cookie
    cookieStore.delete("google_oauth_state");

    const user = await getCurrentUser();
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", "/doctor/dashboard");
      return NextResponse.redirect(redirectUrl);
    }

    let doctorId: string | null = null;
    if (user.role === "DOCTOR" && user.doctor) {
      doctorId = user.doctor.id;
    } else if (user.role === "ADMIN") {
      const adminDoc = await prisma.doctor.findFirst({ where: { userId: user.id } });
      doctorId = adminDoc?.id || null;
    }

    if (!doctorId) {
      const redirectUrl = new URL("/doctor/dashboard", request.url);
      redirectUrl.searchParams.set("google_error", "no_doctor_profile");
      return NextResponse.redirect(redirectUrl);
    }

    const origin = request.nextUrl.origin;
    const dynamicRedirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCodeForTokens(
      code,
      process.env.GOOGLE_REDIRECT_URI || dynamicRedirectUri
    );

    await prisma.calendarConnection.upsert({
      where: { doctorId },
      create: {
        doctorId,
        provider: "GOOGLE",
        googleEmail: tokens.googleEmail,
        scope: tokens.scope,
        status: "CONNECTED",
        encryptedAccessToken: tokens.accessToken,
        encryptedRefreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        provider: "GOOGLE",
        googleEmail: tokens.googleEmail,
        scope: tokens.scope,
        status: "CONNECTED",
        encryptedAccessToken: tokens.accessToken,
        ...(tokens.refreshToken ? { encryptedRefreshToken: tokens.refreshToken } : {}),
        expiresAt: tokens.expiresAt,
      },
    });

    const successUrl = new URL("/doctor/dashboard", request.url);
    successUrl.searchParams.set("google_calendar", "connected");
    return NextResponse.redirect(successUrl);
  } catch (err) {
    const errorMsg = (err as Error).message || "Token exchange failed";
    console.error("[Google OAuth Callback Error]:", errorMsg);
    const errorUrl = new URL("/doctor/dashboard", request.url);
    errorUrl.searchParams.set("google_error", errorMsg);
    return NextResponse.redirect(errorUrl);
  }
}
