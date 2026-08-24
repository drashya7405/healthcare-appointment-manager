# API Reference Documentation

All API endpoints follow a consistent JSON response envelope:

```json
// Success Response (HTTP 200 / 201)
{
  "success": true,
  "data": { ... }
}

// Error Response (HTTP 4xx / 5xx)
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable error explanation",
    "details": [ ... ] // Optional Zod field validation issues
  }
}
```

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
- **Description**: Registers a new patient user and creates associated `Patient` record.
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "password": "Password123!",
    "phone": "+91-9876543210",
    "dateOfBirth": "1995-05-15",
    "gender": "Female",
    "emergencyContact": "+91-9876543211",
    "medicalHistory": "No prior chronic illnesses"
  }
  ```
- **Response** (`201 Created`): Creates session cookie and returns `{ "user": { ... } }`.

### `POST /api/auth/login`
- **Description**: Authenticates user credentials and establishes database session token.
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`): Sets `healthcare_session` HTTP-only cookie and returns user profile.

### `POST /api/auth/logout`
- **Description**: Destroys active session token in database and clears cookie.
- **Auth**: Authenticated (Any Role)
- **Response** (`200 OK`): `{ "message": "Successfully logged out" }`.

### `GET /api/auth/me`
- **Description**: Retrieves current authenticated session user and profile.
- **Auth**: Authenticated (Any Role)
- **Response** (`200 OK`): `{ "user": { "id": "...", "email": "...", "role": "PATIENT", ... } }`.

---

## 2. Doctor Management Endpoints

### `GET /api/doctors`
- **Description**: Lists all active doctors with optional specialization filtering.
- **Auth**: Public / Authenticated
- **Query Params**:
  - `specialization` (optional, string): Filter by clinical domain (e.g. `Cardiology`).
- **Response** (`200 OK`): Array of doctors with working hours and profile details.

### `POST /api/doctors`
- **Description**: Creates a new doctor account and clinical profile (Admin only).
- **Auth**: Required (`ADMIN` role)
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah Smith",
    "email": "sarah.smith@example.com",
    "password": "DoctorPass123!",
    "specialization": "Cardiology",
    "bio": "Consultant Cardiologist with 12 years experience.",
    "slotDurationMins": 30,
    "workingHours": [
      { "day": "MONDAY", "startTime": "10:00", "endTime": "18:00" },
      { "day": "TUESDAY", "startTime": "10:00", "endTime": "18:00" }
    ]
  }
  ```
- **Response** (`201 Created`): Created doctor object.

### `GET /api/doctors/:id`
- **Description**: Fetches single doctor profile and consultation settings.
- **Auth**: Public / Authenticated

### `GET /api/doctors/:id/availability`
- **Description**: Authoritative calculation of available slots for a specific date in Indian Standard Time (IST).
- **Auth**: Public / Authenticated
- **Query Params**:
  - `date` (required, `"YYYY-MM-DD"`): Target calendar date.
- **Response** (`200 OK`):
  ```json
  {
    "doctorId": "doc_123",
    "doctorName": "Dr. Sarah Smith",
    "specialization": "Cardiology",
    "slotDurationMins": 30,
    "date": "2026-08-25",
    "isWorkingDay": true,
    "totalSlots": 16,
    "availableSlotsCount": 10,
    "slots": [
      {
        "startsAt": "2026-08-25T04:30:00.000Z",
        "endsAt": "2026-08-25T05:00:00.000Z",
        "formattedTime": "10:00 - 10:30",
        "available": true
      },
      {
        "startsAt": "2026-08-25T09:30:00.000Z",
        "endsAt": "2026-08-25T10:00:00.000Z",
        "formattedTime": "15:00 - 15:30",
        "available": false,
        "reason": "LEAVE"
      }
    ]
  }
  ```

### `PUT /api/doctors/:id/working-hours`
- **Description**: Updates recurring weekly schedule for doctor.
- **Auth**: Required (`DOCTOR` owner or `ADMIN`)
- **Request Body**: `{ "workingHours": [ { "day": "MONDAY", "startTime": "09:00", "endTime": "17:00" } ] }`.

### `GET /api/doctors/:id/leaves`
- **Description**: Lists scheduled leaves for a doctor.
- **Auth**: Required (`DOCTOR` owner or `ADMIN`)

### `POST /api/doctors/:id/leaves`
- **Description**: Schedules a planned absence. Automatically transitions any conflicting appointments to `AFFECTED_BY_LEAVE` and dispatches notification emails.
- **Auth**: Required (`DOCTOR` owner or `ADMIN`)
- **Request Body**:
  ```json
  {
    "startsAt": "2026-08-25T09:30:00.000Z",
    "endsAt": "2026-08-26T09:30:00.000Z",
    "reason": "Annual Medical Symposium"
  }
  ```
- **Response** (`201 Created`): `{ "leave": { ... }, "affectedAppointmentsCount": 2 }`.

### `DELETE /api/doctors/:id/leaves/:leaveId`
- **Description**: Cancels a scheduled leave period.
- **Auth**: Required (`DOCTOR` owner or `ADMIN`)

---

## 3. Appointment Endpoints

### `GET /api/appointments`
- **Description**: Lists appointments for the authenticated user. Patients see their consultations; Doctors see their scheduled patients; Admins see all.
- **Auth**: Required (Any Role)

### `POST /api/appointments`
- **Description**: Books a consultation slot with symptom submission. Executes inside a serializable Prisma transaction to eliminate double-booking. Triggers async AI triage summary and confirmation emails.
- **Auth**: Required (`PATIENT` or `ADMIN`)
- **Request Body**:
  ```json
  {
    "doctorId": "doc_123",
    "startsAt": "2026-08-25T04:30:00.000Z",
    "symptoms": "Mild chest discomfort upon exertion for past 3 days",
    "patientId": "pat_123" // Required only if ADMIN booking on behalf
  }
  ```
- **Response** (`201 Created`): Returns created `Appointment` with initial `SymptomSubmission`.

### `GET /api/appointments/:id`
- **Description**: Retrieves single appointment details including symptoms, AI briefing, and prescription.
- **Auth**: Required (Owner Patient, Doctor, or Admin)

### `POST /api/appointments/:id/cancel`
- **Description**: Cancels a booked consultation and releases the slot.
- **Auth**: Required (Owner Patient, Doctor, or Admin)
- **Request Body**: `{ "reason": "Patient conflict with travel" }`.

### `POST /api/appointments/:id/reschedule`
- **Description**: Atomically moves appointment to a new available slot. Updates Google Calendar event and dispatches reschedule notices.
- **Auth**: Required (Owner Patient, Doctor, or Admin)
- **Request Body**: `{ "newStartsAt": "2026-08-27T04:30:00.000Z" }`.

---

## 4. Clinical & Prescription Endpoints

### `POST /api/appointments/:id/notes`
- **Description**: Doctor enters clinical notes and completes appointment.
- **Auth**: Required (Doctor owner or Admin)
- **Request Body**: `{ "clinicalNotes": "Patient shows normal sinus rhythm. Advised hydration and lifestyle moderation." }`.

### `POST /api/appointments/:id/prescription`
- **Description**: Doctor issues prescription with structured medications. Triggers asynchronous AI generation of patient-friendly summary and follow-up instructions.
- **Auth**: Required (Doctor owner or Admin)
- **Request Body**:
  ```json
  {
    "clinicalNotes": "Patient diagnosed with mild seasonal allergic rhinitis.",
    "medications": [
      {
        "name": "Cetirizine",
        "dosage": "10mg",
        "frequency": "Once daily at bedtime",
        "instructions": "Take after dinner with water",
        "startsOn": "2026-08-25T00:00:00.000Z",
        "endsOn": "2026-09-01T00:00:00.000Z"
      }
    ]
  }
  ```

### `POST /api/appointments/:id/ai-summary`
- **Description**: Manually triggers / re-generates AI pre-visit or post-visit summary.
- **Auth**: Required (Doctor owner or Admin)

---

## 5. Google Calendar Endpoints

### `GET /api/auth/google`
- **Description**: Initiates Google OAuth consent flow for doctor.
- **Auth**: Required (`DOCTOR` role)
- **Response**: HTTP 302 Redirect to `accounts.google.com`.

### `GET /api/auth/google/callback`
- **Description**: OAuth authorization callback. Exchanges auth code for tokens and saves `CalendarConnection`. Issues HTTP 302 redirect back to `/doctor/dashboard`.
- **Auth**: Session cookie via top-level redirect

### `GET /api/auth/google/status`
- **Description**: Checks current connection status and connected Google email.
- **Auth**: Required (`DOCTOR` role)

### `POST /api/auth/google/disconnect`
- **Description**: Revokes Google tokens and disconnects integration.
- **Auth**: Required (`DOCTOR` role)

---

## 6. System Diagnostics & Background Jobs

### `GET /api/admin/email-diagnostics`
- **Description**: Returns safe email configuration diagnostics without revealing secrets.
- **Auth**: Required (`ADMIN` role)

### `POST /api/admin/email-diagnostics`
- **Description**: Dispatches a test transactional email strictly to the authenticated Admin's email.
- **Auth**: Required (`ADMIN` role)

### `GET /api/health`
- **Description**: System health check verifying database connectivity.
- **Auth**: Public

### `POST /api/jobs/run`
- **Description**: Triggers background worker execution for medication reminders and notification retries.
- **Auth**: Public / Internal Cron
