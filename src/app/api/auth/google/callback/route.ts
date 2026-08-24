import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { exchangeGoogleCodeForTokens, resolveOAuthRedirectUri } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  const errorUrl = new URL("/doctor/dashboard", request.url);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log(
      `[OAuth Callback] Callback received. hasCode=${Boolean(code)}, hasState=${Boolean(state)}, error=${error || "none"}`
    );

    if (error) {
      console.warn(`[OAuth Callback] Google authorization returned error: ${error}`);
      errorUrl.searchParams.set("google_error", error);
      return NextResponse.redirect(errorUrl, 302);
    }

    if (!code || !state) {
      console.warn("[OAuth Callback] Missing code or state parameter in callback URL");
      errorUrl.searchParams.set("google_error", "missing_code_or_state");
      return NextResponse.redirect(errorUrl, 302);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;
    const stateMatches = Boolean(storedState && storedState === state);

    console.log(
      `[OAuth Callback] State verification: storedStatePresent=${Boolean(storedState)}, stateMatches=${stateMatches}`
    );

    // CSRF verification: only reject if cookie exists and actively mismatches
    if (storedState && storedState !== state) {
      console.warn("[OAuth Callback] State mismatch detected");
      errorUrl.searchParams.set("google_error", "invalid_csrf_state");
      return NextResponse.redirect(errorUrl, 302);
    }

    // Clear state cookie
    try {
      cookieStore.delete("google_oauth_state");
    } catch {
      // Non-critical cookie clear error
    }

    // Authenticate session
    const user = await getCurrentUser();
    console.log(
      `[OAuth Callback] Session validation: isAuthenticated=${Boolean(user)}, role=${user?.role || "none"}`
    );

    if (!user) {
      console.warn("[OAuth Callback] No active session found, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/doctor/dashboard");
      return NextResponse.redirect(loginUrl, 302);
    }

    let doctorId: string | null = null;
    if (user.role === "DOCTOR" && user.doctor) {
      doctorId = user.doctor.id;
    } else if (user.role === "ADMIN") {
      const adminDoc = await prisma.doctor.findFirst({ where: { userId: user.id } });
      doctorId = adminDoc?.id || null;
    }

    console.log(`[OAuth Callback] Doctor profile check: doctorIdPresent=${Boolean(doctorId)}`);

    if (!doctorId) {
      console.warn("[OAuth Callback] User is not associated with a doctor profile");
      errorUrl.searchParams.set("google_error", "no_doctor_profile");
      return NextResponse.redirect(errorUrl, 302);
    }

    const redirectUri = resolveOAuthRedirectUri(requestOrigin);
    console.log(`[OAuth Callback] Token exchange starting with redirectUri=${redirectUri}`);

    const tokens = await exchangeGoogleCodeForTokens(code, redirectUri);
    console.log(
      `[OAuth Callback] Token exchange succeeded: hasAccessToken=${Boolean(tokens.accessToken)}, hasRefreshToken=${Boolean(tokens.refreshToken)}, hasEmail=${Boolean(tokens.googleEmail)}`
    );

    console.log(`[OAuth Callback] Upserting CalendarConnection record for doctorId=${doctorId}`);
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
    console.log("[OAuth Callback] CalendarConnection record successfully saved in database");

    const successUrl = new URL("/doctor/dashboard", request.url);
    successUrl.searchParams.set("google_calendar", "connected");
    console.log(`[OAuth Callback] Redirecting to success destination: ${successUrl.pathname}${successUrl.search}`);

    return NextResponse.redirect(successUrl, 302);
  } catch (err) {
    const errorMsg = (err as Error).message || "Token exchange failed";
    console.error("[OAuth Callback] Exception during callback processing:", errorMsg);
    errorUrl.searchParams.set("google_error", errorMsg);
    return NextResponse.redirect(errorUrl, 302);
  }
}
