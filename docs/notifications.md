# Transactional Email & Notification Subsystem

## Overview

The notification subsystem delivers responsive, accessible HTML and plaintext email alerts across all critical appointment milestones. It is built on a clean provider abstraction supporting **Brevo (Primary)**, **Resend (Alternative)**, and an **In-Memory Mock Provider (Testing)**.

---

## Provider Architecture & Brevo Integration

```mermaid
graph TD
    Trigger["Milestone Trigger (Booking / Reschedule / Cancel / Leave / Reminder)"] --> EmailService["Email Service Factory (getEmailProvider)"]
    
    EmailService --> ConfigCheck{"EMAIL_PROVIDER"}
    ConfigCheck -->|brevo (Default)| BrevoProvider["BrevoEmailProvider (/src/lib/notifications/providers/brevo.ts)"]
    ConfigCheck -->|resend| ResendProvider["ResendEmailProvider (/src/lib/notifications/providers/resend.ts)"]
    ConfigCheck -->|mock| MockProvider["MockEmailProvider (/src/lib/notifications/providers/mock.ts)"]
    
    BrevoProvider -->|HTTPS POST api.brevo.com/v3/smtp/email| BrevoAPI["Brevo Transactional SMTP API"]
    
    BrevoAPI --> DBLog["PostgreSQL Notification Log (status: SENT / FAILED)"]
```

### Brevo API Configuration
- **API Endpoint**: `https://api.brevo.com/v3/smtp/email`
- **Authentication Header**: `api-key: <BREVO_API_KEY>`
- **Verified Sender Identity**: `Healthcare Appointment Manager <drashya745@gmail.com>`
- **Timeout**: 15 seconds enforced via `AbortController`.
- **Safe Serverless Logging**:
  - `[Email] Provider=brevo`
  - `[Email] Attempting transactional email`
  - `[Email] Brevo response status=<HTTP Status>`
  - `[Email] Brevo request failed: <Sanitized Message>`
  *(Zero secrets or sensitive patient data are ever logged).*

---

## Implemented Notification Types & Templates

| Notification Type | Trigger Event | Primary Recipients | Key Content |
| :--- | :--- | :--- | :--- |
| **Booking Confirmation** | Patient confirms consultation | Patient & Doctor | Consultation time, Doctor name, Specialization, Clinic instructions, Symptoms overview |
| **Appointment Cancellation** | Patient or Doctor cancels | Patient & Doctor | Cancelled appointment date & time, Cancellation reason, Re-booking link |
| **Appointment Reschedule** | Appointment moved to new slot | Patient & Doctor | Previous date & time, New confirmed date & time, Updated Google Calendar link |
| **Doctor Leave Conflict Notice** | Doctor schedules planned leave | Affected Patients | Notice that consultation is affected by doctor absence, Priority rescheduling instructions |
| **Medication Reminder** | Scheduled background worker | Patient | Medication name, dosage, time to take, doctor instructions |
| **Admin Diagnostic Test** | Admin triggers `/api/admin/email-diagnostics` | Authenticated Admin | System configuration verification and timestamp |

---

## Notification Persistence & Lifecycle States

Every notification is tracked in the `Notification` PostgreSQL table:
- **`PENDING`**: Scheduled or queued for dispatch.
- **`SENT`**: Successfully accepted by Brevo (`HTTP 201 Created`) with valid `messageId` and recorded `sentAt`.
- **`FAILED`**: Encountered network timeout or SMTP rejection. Detailed in `lastError` with incremented `attemptCount`.

### Idempotency
Each notification record includes an `idempotencyKey` (e.g. `appt_123_booking_patient`). The background retry processor checks this key to prevent duplicate email delivery to patients.

---

## Reliability & Non-Blocking Isolation

1. **Awaited Serverless Dispatch**: In Vercel Serverless environments, API route handlers await email dispatch within `try/catch` blocks so that Lambda containers remain active until the outbound HTTPS socket finishes.
2. **Transactional Independence**: If Brevo is unavailable or returns an error, the error is recorded in the database notification log. **The patient's appointment booking, reschedule, or cancellation remains 100% valid and confirmed in the database.**
