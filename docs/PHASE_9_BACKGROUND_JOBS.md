# Phase 9: Background Jobs and Medication Reminders

## 1. Architecture & Background Engine

Phase 9 integrates background job processing using **Inngest** along with an internal local job runner and trigger API (`POST /api/jobs/run`) for resilient reminder dispatch and failure retries.

```text
Inngest Engine / Local Scheduler (src/lib/jobs/runner.ts)
    ├── Appointment Reminders (24-hour pre-consultation scan)
    ├── Medication Reminders (frequency & active prescription schedule)
    └── Email Retries (bounded exponential retry for failed notifications)
```

---

## 2. Background Job Features

### A. Appointment Reminders
- **Schedule**: Periodic background scan (`cron: "0 * * * *"`).
- **Target**: Confirmed appointments starting within the next 24 hours.
- **Safety**: Automatically skips `CANCELLED`, `COMPLETED`, and `AFFECTED_BY_LEAVE` appointments.
- **Idempotency**: Generates deterministic notification key `appt_rem_{appointmentId}_{date}` to prevent duplicate reminders.

### B. Medication Reminders
- **Schedule**: Periodic daily intervals (`cron: "0 8,14,20 * * *"`).
- **Target**: Active prescriptions where `startsOn <= now <= endsOn`.
- **Frequency**: Supports `DAILY`, `TWICE_DAILY`, `THRICE_DAILY`, `WEEKLY`, `EVERY_8_HOURS`, `AS_NEEDED`.
- **Safety**: Automatically skips expired prescriptions (`endsOn < now`).
- **Idempotency**: Employs deterministic key `med_rem_{medicationId}_{date}` to ensure patients receive exactly one notification per scheduled slot.

### C. Bounded Email Retries
- **Schedule**: Runs every 15 minutes (`cron: "*/15 * * * *"`).
- **Target**: Notifications in `FAILED` status with `attemptCount < 3`.
- **Safety**: Increments `attemptCount`, updates `lastError`, and marks `SENT` on success or stops after max attempts (no infinite loops).

---

## 3. Endpoints & Integrations

1. **Inngest Serve Endpoint**: `GET / POST / PUT /api/inngest`
   - Serves `appointmentRemindersFunction`, `medicationRemindersFunction`, and `emailRetriesFunction`.
2. **On-Demand Job Trigger**: `POST /api/jobs/run`
   - Allows administrators or local automation to trigger specific jobs on demand (`job: "appointmentReminders" | "medicationReminders" | "emailRetries" | "all"`).

---

## 4. Verification Results

- **Automated Tests (`npm test`)**: 101/101 tests passing (100% pass rate).
  - Medication reminder template rendering.
  - Appointment reminder generation and cancellation/completion lifecycle safety.
  - Active prescription matching and expired prescription exclusion.
  - Idempotency key generation and duplicate execution guard.
  - Failed notification retry logic and max attempt threshold enforcement.
- **TypeScript (`npm run typecheck`)**: 0 errors.
- **ESLint (`npm run lint`)**: 0 errors / 0 warnings.
- **Production Build (`npm run build`)**: 24 routes compiled successfully.
