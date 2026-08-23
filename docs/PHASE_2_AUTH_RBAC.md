# Phase 2: Database + Authentication + Role-Based Access Control (RBAC)

## 1. Overview & Architecture

Phase 2 establishes the persistence and access boundary for the Healthcare Appointment & Follow-up Manager. It introduces:
- A normalized, concurrency-ready PostgreSQL database model via Prisma ORM.
- Secure, database-backed session management using cryptographically random tokens and HTTP-only cookies.
- Password hashing with salt rounds via `bcryptjs`.
- Strict server-side Role-Based Access Control (RBAC) spanning three distinct roles: `PATIENT`, `DOCTOR`, `ADMIN`.
- Multi-layer defense: Next.js middleware for route protection + server component/route handler guards ensuring zero frontend role trust.
- Development seed scripts with demo accounts and one-click testing shortcuts.

---

## 2. Relational Database Schema & Concurrency Constraints

### Schema Highlights (`prisma/schema.prisma`)
- **`User`**: Core credentials (`email`, `passwordHash`, `role: UserRole`, `isActive`).
- **`Session`**: Database-backed sessions with `sessionToken`, `userId`, `expiresAt`, indexed on `[userId]` and `[sessionToken]`.
- **`Patient`**: Profile attributes (`dateOfBirth`, `phone`, `gender`, `emergencyContact`, `medicalHistory`).
- **`Doctor`**: Medical profile (`specialization`, `slotDurationMins`, `timezone`, `bio`).
- **`DoctorWorkingHours`**: Weekly schedule with composite unique constraint `@@unique([doctorId, day])`.
- **`DoctorLeave`**: Absence intervals with index `@@index([doctorId, startsAt, endsAt])`.
- **`Appointment`**: Links Patient and Doctor. Includes concurrency indices:
  - `@@unique([doctorId, startsAt])`: Guarantees no identical start time for the same doctor.
  - `@@index([doctorId, startsAt, endsAt])`: Enables fast interval overlap verification.
  - `@@index([patientId, startsAt])`: Quick retrieval of patient appointment schedules.
- **`SymptomSubmission`**: Pre-visit symptoms, AI triage fields (`urgencyLevel`, `chiefComplaint`, `doctorQuestions`), and fallback error tracking.
- **`Prescription` & `Medication`**: Post-visit clinical notes, patient summary, and normalized medications with `dosage` and `frequency`.
- **`Notification`**: Notification queue tracking `channel` (`EMAIL`, `IN_APP`), `status` (`PENDING`, `SENT`, `FAILED`), attempt counters, and failure reasons.
- **`CalendarConnection` & `CalendarEvent`**: OAuth tokens and Google Calendar synchronization IDs.

---

## 3. Authentication & Security Implementation

### Security Features
1. **Password Hashing**: Passwords are never stored in plain text. `bcryptjs` is utilized with salt rounds of 10.
2. **Session Persistence**: Sessions are saved in the `Session` table and issued via an HTTP-Only, Secure (in production), `SameSite=Lax` cookie (`healthcare_session`).
3. **Session Revocation**: Logout actively removes the session token from the database, preventing replay attacks.
4. **Session Expiry**: Sessions are valid for 7 days. Expired sessions are automatically cleaned up during validation.
5. **No Frontend Role Trust**: User roles are always resolved directly from the authenticated session in the database.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Route / Resource | `PATIENT` | `DOCTOR` | `ADMIN` | Unauthenticated |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Landing Page) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/login` & `/register` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| `/patient/*` | ✅ Full Access (Own records) | ❌ 403 Forbidden | ❌ 403 Forbidden | 🔄 302 Redirect to `/login` |
| `/doctor/*` | ❌ 403 Forbidden | ✅ Full Access (Own schedule) | ❌ 403 Forbidden | 🔄 302 Redirect to `/login` |
| `/admin/*` | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Full Access | 🔄 302 Redirect to `/login` |
| Cross-Patient Records | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Override Allowed | ❌ 401 Unauthorized |
| Doctor Schedule Edits | ❌ 403 Forbidden | ✅ Own Schedule Only | ✅ All Doctors | ❌ 401 Unauthorized |

---

## 5. Development Seed Accounts

To seed development users, run `npm run db:seed` when connected to PostgreSQL:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `AdminPass123!` | System Administrator |
| **Doctor** | `doctor.smith@example.com` | `DoctorPass123!` | Cardiology (Mon–Fri 09:00–17:00, 30m slots) |
| **Doctor** | `doctor.jones@example.com` | `DoctorPass123!` | Dermatology (Mon–Fri 10:00–18:00, 30m slots) |
| **Patient** | `patient.doe@example.com` | `PatientPass123!` | John Doe |

---

## 6. Verification Commands

```bash
# 1. Run automated test suite (Password, Validation, RBAC, Sessions)
npm test

# 2. Run TypeScript checks
npm run typecheck

# 3. Run ESLint
npm run lint

# 4. Validate Prisma Schema
npm run prisma:validate

# 5. Verify Next.js Build
npm run build
```
