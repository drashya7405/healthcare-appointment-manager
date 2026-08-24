import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { exchangeGoogleCodeForTokens, resolveOAuthRedirectUri } from "@/lib/google/oauth";

/**
 * Creates a fail-safe HTTP 302 redirect response with HTML/JS fallback.
 * Guarantees that the browser will never remain stuck on a blank page under any circumstance.
 */
function createRedirectResponse(targetUrl: string, error?: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <title>Redirecting to Doctor Dashboard...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
    .card { background: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 420px; }
    .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #0d9488; border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    a { color: #0d9488; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h3>${error ? "Returning to Dashboard..." : "Connecting Google Calendar..."}</h3>
    <p style="font-size: 0.875rem; color: #64748b;">
      ${error ? `Notice: ${error}` : "Redirecting to your dashboard..."}
    </p>
    <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 1rem;">
      If you are not redirected automatically, <a href="${targetUrl}">click here to continue</a>.
    </p>
  </div>
  <script>
    window.location.replace(${JSON.stringify(targetUrl)});
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 302,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Location: targetUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

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
      return createRedirectResponse(errorUrl.toString(), error);
    }

    if (!code || !state) {
      console.warn("[OAuth Callback] Missing code or state parameter in callback URL");
      errorUrl.searchParams.set("google_error", "missing_code_or_state");
      return createRedirectResponse(errorUrl.toString(), "Missing OAuth code or state parameter");
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
      return createRedirectResponse(errorUrl.toString(), "Invalid CSRF state token");
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
      return createRedirectResponse(loginUrl.toString(), "Session expired, please log in");
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
      return createRedirectResponse(errorUrl.toString(), "No doctor profile associated with current account");
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

    return createRedirectResponse(successUrl.toString());
  } catch (err) {
    const errorMsg = (err as Error).message || "Token exchange failed";
    console.error("[OAuth Callback] Exception during callback processing:", errorMsg);
    errorUrl.searchParams.set("google_error", errorMsg);
    return createRedirectResponse(errorUrl.toString(), errorMsg);
  }
}
