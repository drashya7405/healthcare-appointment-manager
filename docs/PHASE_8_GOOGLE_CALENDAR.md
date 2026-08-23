# Phase 8: Google Calendar Integration

## 1. Architecture & OAuth 2.0 Flow

Phase 8 implements server-side Google Calendar synchronization using Google's official Node.js SDK (`googleapis`).

```text
Appointment Service (src/services/appointment.ts)
    ↓
Google Calendar Service (src/lib/google/calendar.ts)
    ↓
OAuth2 Manager (src/lib/google/oauth.ts)
    ↓
Google Calendar API (googleapis)
```

---

## 2. Security & Credentials

1. **Server-Side Authorization**:
   - Authorization URL generated via `GET /api/auth/google`.
   - CSRF protection enforced using a cryptographic `state` parameter stored in an HTTP-only cookie.
   - Callback handled at `GET /api/auth/google/callback` to exchange code for tokens.
2. **Offline Access & Automatic Token Refresh**:
   - Requested scope: `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/userinfo.email`.
   - `access_type: "offline"` with `prompt: "consent"` to guarantee long-lived refresh tokens.
   - Automatically refreshes access tokens within 2 minutes of expiration and updates `CalendarConnection` in PostgreSQL.
3. **Sensitive Credential Isolation**:
   - `GOOGLE_CLIENT_SECRET`, access tokens, and refresh tokens are strictly server-side and never exposed to the client.
   - Status endpoint (`GET /api/auth/google/status`) returns only non-sensitive metadata (`connected: boolean`, `googleEmail: string`).

---

## 3. Database State & Reliability Rules

1. **Non-Blocking Calendar Synchronization**:
   - Core PostgreSQL appointment transactions commit before Calendar synchronization begins.
   - If Google Calendar is down, offline, or returns an error:
     - The appointment remains 100% valid.
     - `CalendarEvent` record is updated with `status: "FAILED"` and `lastError` captured.
     - Transactions are NEVER rolled back due to Calendar API errors.
2. **Lifecycle Sync Events**:
   - **Booking**: Creates event titled `Healthcare Consultation: Dr. {doctorName} & {patientName}` -> `CalendarEvent` status `SYNCED`.
   - **Reschedule**: Updates event start/end timestamps.
   - **Cancellation**: Deletes event from Google Calendar -> status `NOT_CONNECTED`.
   - **Doctor without Calendar**: Handled gracefully with status `NOT_CONNECTED`.

---

## 4. Verification Results

- **Automated Tests (`npm test`)**: 92/92 tests passing (100% pass rate).
  - OAuth authorization URL with offline scope.
  - CSRF state validation.
  - Mock event insertion, patching, and deletion.
  - API failure isolation & zero-rollback guarantees.
  - Token expiration windows and auto-refresh mechanisms.
- **TypeScript (`npm run typecheck`)**: 0 errors.
- **ESLint (`npm run lint`)**: 0 errors / 0 warnings.
- **Production Build (`npm run build`)**: 22 routes compiled successfully.
