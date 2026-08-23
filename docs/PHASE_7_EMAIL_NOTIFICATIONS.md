# Phase 7: Email Notifications System

## 1. Architecture & Provider Abstraction

Phase 7 implements a robust, multi-event notification service designed with strict non-blocking database isolation and retry mechanics.

```text
Email Service (email-service.ts)
    ↓
Provider Abstraction (EmailProvider interface)
    ├── ResendEmailProvider (official resend SDK)
    └── MockEmailProvider (deterministic execution & in-memory inspection)
```

---

## 2. Notification Events

### A. Booking Confirmation
- **Recipients**: Sent to **Patient** and **Doctor**.
- **Patient Content**: Doctor details, specialization, appointment date/time, submitted symptoms, and clinic arrival advice.
- **Doctor Content**: Patient name, contact details, date/time, chief complaint / symptoms, and AI pre-visit briefing status.

### B. Appointment Reminder
- **Recipient**: Sent to **Patient** before the scheduled consultation.
- **Content**: Date, time, doctor details, and clinical preparation checklist.

### C. Appointment Cancellation
- **Recipients**: Sent to **Patient** and **Doctor**.
- **Content**: Date, time, cancellation reason, and patient rebooking / doctor schedule release notice.

### D. Appointment Rescheduled
- **Recipients**: Sent to **Patient** and **Doctor**.
- **Content**: Comparison between previous scheduled slot and new confirmed date/time.

### E. Doctor Leave Conflict
- **Trigger**: When an Admin places a doctor on leave overlapping existing booked appointments.
- **Action**: Conflicting appointments are transitioned to `AFFECTED_BY_LEAVE` and leave-conflict alerts are dispatched with priority rescheduling guidance.

---

## 3. Database State & Reliability Rules

1. **Non-Blocking Execution & Database Isolation**:
   - Appointment creation and modification transactions commit completely in PostgreSQL before email dispatch begins.
   - If Resend or the network is unavailable:
     - The appointment remains 100% valid.
     - A `Notification` record is created in the database with status `FAILED`, attempt count `1`, and `lastError` captured.
     - Transactions are NEVER rolled back due to email failures.
2. **Notification Tracking Model**:
   - `id`: string
   - `userId`: recipient user ID
   - `appointmentId`: associated appointment
   - `channel`: `EMAIL`
   - `type`: `BOOKING_CONFIRMATION_PATIENT`, `BOOKING_CONFIRMATION_DOCTOR`, `APPOINTMENT_REMINDER`, `APPOINTMENT_CANCELLED_*`, `APPOINTMENT_RESCHEDULED_*`, `DOCTOR_LEAVE_CONFLICT_PATIENT`
   - `status`: `PENDING` -> `SENT` | `FAILED`
   - `attemptCount`: number
   - `lastError`: string | null
   - `sentAt`: DateTime | null
3. **Retry Mechanism**:
   - `retryNotification(notificationId)`: Retries an individual failed notification.
   - `retryFailedNotifications(maxAttempts)`: Retries all failed notifications under the attempt limit.
   - Exposed to administrators at `POST /api/notifications/retry`.

---

## 4. Verification Results

- **Automated Tests**: 83 tests passing 100% across all suites:
  - Template rendering engines for all 5 event types.
  - Mock email dispatch and sent email tracking.
  - Failure simulation (`EMAIL_MOCK_FAILURE=true`).
  - Resend provider initialization and safety checks.
  - Non-blocking isolation and retry state transitions.
- **Production Build**: Clean build of all 20 Next.js routes.
