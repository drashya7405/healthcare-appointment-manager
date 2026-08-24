# System Design Write-Up

## 1. Double-Booking Prevention & Concurrency Guard

To guarantee zero double-booking under high concurrent load, the system enforces a multi-layered concurrency architecture:

1. **Pre-Transaction Working Hours Compliance**: Before initiating database transactions, slot validity is computed in Indian Standard Time (IST, UTC+05:30) against the doctor's weekly working schedule.
2. **Atomic Serializable Transactions**: Booking and rescheduling requests execute inside Prisma `$transaction` blocks with explicit concurrency timeouts (`timeout: 20000ms`, `maxWait: 10000ms`).
3. **Concurrent Database Conflict Queries**: Within the transaction, the engine executes parallelized conflict checks (`Promise.all`) searching for overlapping active appointments (`status NOT IN ['CANCELLED', 'RESCHEDULED']`) and approved doctor leaves (`startsAt < endsAt AND endsAt > startsAt`). If a conflict exists, the transaction aborts with a `SlotUnavailableError` (HTTP 409 Conflict).
4. **Database-Level Unique Constraints**: A PostgreSQL unique composite index `@@unique([doctorId, startsAt])` enforces an immutable barrier at the database storage engine layer, rejecting duplicate entries even under parallel race conditions.

---

## 2. Doctor Leave Conflict Handling

When a physician schedules a planned leave:
- **Interval Masking**: The availability engine (`src/services/availability.ts`) compares calculated slot boundaries against UTC leave intervals. Slots overlapping any portion of a single-day or multi-day leave are marked `available: false` with `reason: "LEAVE"`.
- **Preservation Over Deletion**: Rather than deleting existing consultations, conflicting appointments are transitioned to `status: AFFECTED_BY_LEAVE` and annotated with the doctor's leave reason.
- **Automated Patient Communication**: The system immediately dispatches `DoctorLeaveConflictNotice` emails to all affected patients, providing priority guidance for rescheduling without clinical record loss.

---

## 3. Slot Hold Mechanism: Implementation Analysis

- **Actual Architectural Design**: The production codebase prioritizes atomic, pessimistic check-and-insert transactions over optimistic temporary slot reservations ("soft holds"). 
- **Rationale & Trade-Offs**: Temporary slot holds introduce distributed state expiry hazards, orphaned holds when users abandon carts, and vulnerability to inventory exhaustion attacks in healthcare settings. By executing atomic verification at the exact instant of symptom submission, the system guarantees 100% data consistency, immediate feedback, and eliminates stale lock states without requiring distributed Redis timers.

---

## 4. Notification & Integration Fault Tolerance

### A. Transactional Email Reliability (Brevo SMTP API)
- **Awaited Serverless Lifecycle**: Email dispatches are explicitly awaited in API handlers within safe `try/catch` blocks, preventing Vercel Serverless containers from prematurely freezing in-flight HTTPS sockets.
- **Non-Blocking Isolation**: Email delivery status is recorded in the `Notification` table (`SENT` or `FAILED`). If Brevo is unavailable, the failure is logged and queued for retry; **the underlying appointment booking is never rolled back**.

### B. AI Pre/Post-Visit Synthesis (Groq LLM)
- **Async Execution**: Pre-visit triage summaries and post-visit patient instructions are generated asynchronously.
- **Rule-Based Fallback**: If the Groq API encounters rate limits or network errors, the system records `llmFailureMessage` and provides structured fallback briefings. Patient medical intake and doctor clinical notes remain pristine and fully accessible.

### C. Google Calendar Synchronization (OAuth 2.0)
- **Decoupled Event Sync**: Consultations are synced to Google Calendar via background API calls. Token expiration is resolved automatically using stored refresh tokens. Calendar sync failures are isolated to `CalendarEvent.status = "FAILED"`, ensuring clinical records remain intact.
