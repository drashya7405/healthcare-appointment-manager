import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { exchangeGoogleCodeForTokens } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_error=missing_code_or_state`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;

  // CSRF validation
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_error=invalid_csrf_state`);
  }

  // Clear state cookie
  cookieStore.delete("google_oauth_state");

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login?redirect=/doctor/dashboard`);
  }

  let doctorId: string | null = null;
  if (user.role === "DOCTOR" && user.doctor) {
    doctorId = user.doctor.id;
  } else if (user.role === "ADMIN") {
    const adminDoc = await prisma.doctor.findFirst({ where: { userId: user.id } });
    doctorId = adminDoc?.id || null;
  }

  if (!doctorId) {
    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_error=no_doctor_profile`);
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);

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

    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_calendar=connected`);
  } catch (err) {
    const errorMsg = (err as Error).message || "Token exchange failed";
    console.error("[Google OAuth Callback Error]:", errorMsg);
    return NextResponse.redirect(`${baseUrl}/doctor/dashboard?google_error=${encodeURIComponent(errorMsg)}`);
  }
}
