# Phase 5: Application Portals & User Interfaces

## 1. Overview

Phase 5 builds intuitive, responsive, and role-secured user interfaces for all four application domains:
- **Public Domain**: Landing page, Specialist directory, Login with 1-click test credentials, and Patient registration.
- **Patient Portal**: Live slot booking, symptom submission, upcoming vs completed visits, detailed prescription/medication views, atomic rescheduling, and cancellation.
- **Doctor Portal**: Daily schedule, consultation viewer, patient symptom review with urgency indicators, AI pre-visit summary area, diagnosis notes editor, and digital prescription creation.
- **Admin Portal**: Clinic oversight metrics, doctor directory management (creation, profiles, slot durations, timezone), working hours configuration, leave management, and clinic-wide appointment tracking.

---

## 2. Portal Feature Breakdown

### A. Public Pages
- `/` (Home): Clean hero overview, available clinical specialties, and direct entry cards for Patient, Doctor, and Admin portals.
- `/doctors` (Specialists Directory): Browse active clinical specialists by medical field with slot duration and schedule summaries.
- `/login` (Sign In): Standard email/password login with 1-click demo credential shortcuts (`Admin`, `Dr. Smith`, `Dr. Jones`, `Patient Jane Doe`).
- `/register` (Patient Registration): Comprehensive patient signup collecting phone, date of birth, gender, emergency contact, and medical history.

### B. Patient Portal (`/patient/dashboard`)
- **Interactive Doctor Browser**: Select specialist and view live availability.
- **Booking Modal**: Confirm slot interval and enter symptoms.
- **Appointments Management**:
  - Filter by "Upcoming Visits", "Past & Completed", and "All".
  - **Consultation Record Modal**: View pre-visit symptoms, doctor diagnosis, and prescribed medications (name, dosage, frequency, instructions).
  - **Reschedule Modal**: Live slot picker for choosing a new time with atomic backend concurrency protection.
  - **Cancellation**: One-click cancellation with optional reason.

### C. Doctor Portal (`/doctor/dashboard`)
- **Consultation Schedule**: Filter appointments by "Today's Schedule", "Upcoming", and "Completed".
- **Clinical Consultation & Prescription Modal**:
  - Patient Chief Complaint & Submitted Symptoms with Urgency Level.
  - Pre-visit clinical briefing placeholder.
  - Clinical Diagnosis & Notes editor.
  - Interactive Medication Form (add/remove drugs, dosage, frequency, instructions).
  - One-click completion marking appointment as `COMPLETED`.
- **Availability & Leave Manager**: Configure weekly working hours and schedule absence leaves.

### D. Admin Portal (`/admin/dashboard`)
- **System Metrics**: Total system users, active doctors, and registered patients.
- **Clinic Appointment Log**: Searchable table of all clinic appointments with status filters and administrative cancellation.
- **Doctor Management**: Create new specialists, update profiles, customize slot durations (15m, 30m, 45m, 60m), and manage doctor leave.

---

## 3. Security & Route Protection

1. **Authoritative Backend Guards**:
   - `requireAuth()`, `requirePatient()`, `requireDoctor()`, `requireAdmin()` strictly guard all API mutations and data queries.
2. **Server-Side Page Protection**:
   - Next.js server components verify active user session and redirect unauthorized access attempts to `/unauthorized` or `/login`.
3. **Edge Middleware**:
   - `src/middleware.ts` guards role-specific route prefixes (`/patient/*`, `/doctor/*`, `/admin/*`).
