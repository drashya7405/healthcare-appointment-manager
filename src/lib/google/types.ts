export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  googleEmail?: string | null;
}

export type CalendarConnectionStatus = "CONNECTED" | "DISCONNECTED" | "REVOKED" | "EXPIRED";

export type CalendarSyncStatus = "PENDING" | "SYNCED" | "FAILED" | "NOT_CONNECTED";

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface CalendarSyncResult {
  success: boolean;
  googleEventId?: string;
  error?: string;
  status: CalendarSyncStatus;
}
