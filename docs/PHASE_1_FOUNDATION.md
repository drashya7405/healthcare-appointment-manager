# Phase 1 Foundation: Healthcare Appointment & Follow-up Manager

## 1. Requirements Analysis from Specification (PDF)

### Roles & Responsibilities
- **Patient**:
  - Register and log in.
  - Search doctors by specialization.
  - Fill out pre-visit symptom details prior to appointment confirmation.
  - Book available appointment slots.
  - View booked appointments and receive patient-friendly post-visit summaries.
  - Receive automated medication reminders based on prescription frequency.
  - Receive booking, reminder, and cancellation emails + Google Calendar invitations.
- **Doctor**:
  - View upcoming appointments and schedule.
  - Review AI-generated pre-visit symptom summaries (urgency level, chief complaint, suggested questions).
  - Submit clinical post-visit notes and prescriptions (medications with dosage and frequency).
  - Manage working hours and leave requests.
  - Synchronize appointments with Google Calendar via OAuth 2.0.
- **Admin**:
  - Create and manage doctor profiles (specialization, bio, working hours, slot duration, leave days).
  - System-wide monitoring and conflict oversight.

### Key Functional Modules
1. **Authentication & RBAC**: Secure session-based authentication with role-based access control (`PATIENT`, `DOCTOR`, `ADMIN`).
2. **Doctor & Schedule Management**: Admin/Doctor configuration of working hours, slot duration, and leave intervals.
3. **Appointment Booking Engine**: Search doctors, view open slots, and handle concurrent booking attempts safely to prevent double-booking.
4. **Leave Conflict Handler**: Automatic detection of overlapping appointments when a doctor is marked on leave, marking affected bookings and triggering patient notifications.
5. **AI Clinical Intelligence**:
   - *Pre-visit Summary*: Evaluates symptoms into Urgency Level (`LOW`, `MEDIUM`, `HIGH`), chief complaint, and 3 suggested diagnostic questions.
   - *Post-visit Summary*: Translates clinical notes into a patient-friendly summary with medication schedule and follow-up steps.
   - *Graceful Degradation*: Fallback mechanisms ensuring appointments and clinical records save without breaking if the LLM is unavailable.
6. **Prescription & Medication Reminders**: Structured prescription entry with background reminders dispatched per medication schedule.
7. **Email & Calendar Notifications**:
   - Transactional emails for booking confirmation, reminders, and cancellations.
   - Google Calendar event creation, updates on reschedule, and deletion on cancellation.

---

## 2. External Services & Mocking Strategy

| External Service | Production Role | Local Development / Mocking Strategy |
| :--- | :--- | :--- |
| **OpenAI API** | Pre-visit triage & post-visit translations | Deterministic mock adapter returning structured LLM outputs |
| **Resend / Email Provider** | Transactional emails & notifications | Mock email adapter logging to console or saving to database |
| **Google Calendar API** | OAuth 2.0 calendar event sync | Mock calendar adapter generating simulated calendar event IDs |
| **Inngest** | Background workers for medication reminders & retries | Inngest Dev Server or direct local task handler |

---

## 3. Architecture & Project Structure

- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Validation**: Zod schema validation at all API and form boundaries
- **Error Handling**: Standardized API response envelopes (`ApiSuccess<T>` / `ApiFailure`) and centralized error boundaries

### Folder Separation
```text
src/
├── app/               # Next.js App Router (Pages, layouts, API route handlers)
│   └── api/health/    # Health check endpoint
├── auth/              # Authentication & session helpers (Phase 2)
├── background-jobs/   # Inngest background functions & cron jobs (Future phase)
├── components/        # Reusable UI components
├── database/          # Prisma client instance & DB utilities
├── lib/               # Shared utilities, environment validation, API response helpers, errors
├── services/          # External service adapters & mocks (OpenAI, Resend, Google Calendar)
├── types/             # Shared TypeScript type definitions
└── validation/        # Zod validation schemas
```

---

## 4. Preliminary Data Model & Concurrency Design

### Prisma Models
- **`User`**: Base identity (email, password/auth data, role: `PATIENT` | `DOCTOR` | `ADMIN`).
- **`Patient`**: Profile details, linked to `User` and `Appointment`s.
- **`Doctor`**: Profile, specialization, slot duration, working hours, leaves, and calendar connection.
- **`DoctorWorkingHours`**: Day of week, start time, end time.
- **`DoctorLeave`**: Date/time ranges for doctor absence.
- **`Appointment`**: Links Patient and Doctor with start/end timestamps, status (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`).
- **`SymptomSubmission`**: Patient-entered symptoms, LLM pre-visit summary, urgency level, chief complaint, and suggested questions.
- **`Prescription`**: Clinical notes, LLM patient-friendly summary, follow-up instructions, and linked medications.
- **`Medication`**: Name, dosage, frequency, start/end dates.
- **`Notification`**: Channel (`EMAIL`, `IN_APP`), type, status (`PENDING`, `SENT`, `FAILED`), scheduled time, attempt counts, and error tracking.
- **`CalendarConnection` & `CalendarEvent`**: Doctor OAuth tokens and bidirectional calendar sync event IDs.

### Concurrency & Conflict Strategy
1. **Double-Booking Prevention**:
   - Application-level transaction checking doctor availability.
   - Database-level unique constraint (`doctorId`, `startsAt`) and PostgreSQL `tsrange` exclusion constraints for overlapping slots.
2. **Doctor Leave Conflict Resolution**:
   - Leave creation is wrapped in a database transaction that queries all confirmed appointments overlapping `[startsAt, endsAt]`.
   - Affected appointments are transitioned or flagged for rescheduling, and notification records are queued for all impacted patients.

