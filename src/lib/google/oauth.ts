import { google } from "googleapis";
import { prisma } from "@/database/prisma";
import type { GoogleTokens } from "./types";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Returns a configured Google OAuth2 Client instance.
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth consent URL with offline access and CSRF state token.
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent", // Force prompt to guarantee refresh token on re-authorization
    state,
  });
}

/**
 * Exchanges authorization code for access & refresh tokens and fetches connected email.
 */
export async function exchangeGoogleCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Failed to obtain access token from Google OAuth token exchange.");
  }

  oauth2Client.setCredentials(tokens);

  let googleEmail: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    googleEmail = userInfo.data.email || null;
  } catch {
    // Non-critical if userinfo email lookup fails
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope || CALENDAR_SCOPES.join(" "),
    googleEmail,
  };
}

/**
 * Returns an authenticated OAuth2Client for a Doctor, automatically refreshing expired tokens.
 */
export async function getAuthenticatedClientForDoctor(doctorId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { doctorId },
  });

  if (
    !connection ||
    connection.status !== "CONNECTED" ||
    !connection.encryptedAccessToken
  ) {
    return null;
  }

  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: connection.encryptedAccessToken,
    refresh_token: connection.encryptedRefreshToken || undefined,
    expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined,
  });

  // Check if token is expired or expires within 2 minutes
  const isExpired =
    connection.expiresAt &&
    connection.expiresAt.getTime() < Date.now() + 2 * 60 * 1000;

  if (isExpired && connection.encryptedRefreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newTokens = refreshed.credentials;

      if (newTokens.access_token) {
        await prisma.calendarConnection.update({
          where: { doctorId },
          data: {
            encryptedAccessToken: newTokens.access_token,
            expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
            status: "CONNECTED",
          },
        });
      }
    } catch (refreshErr) {
      console.warn(`[Google OAuth Refresh Error] Doctor ${doctorId}:`, (refreshErr as Error).message);
      // Mark as REVOKED / EXPIRED if refresh token failed permanently
      await prisma.calendarConnection.update({
        where: { doctorId },
        data: { status: "REVOKED" },
      });
      return null;
    }
  }

  return oauth2Client;
}

/**
 * Disconnects Doctor Google Calendar connection and revokes OAuth tokens.
 */
export async function disconnectDoctorGoogleCalendar(doctorId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { doctorId },
  });

  if (!connection) return;

  if (connection.encryptedAccessToken) {
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(connection.encryptedAccessToken);
    } catch {
      // Suppress token revocation error if already expired/revoked
    }
  }

  await prisma.calendarConnection.update({
    where: { doctorId },
    data: {
      status: "DISCONNECTED",
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      expiresAt: null,
    },
  });
}
