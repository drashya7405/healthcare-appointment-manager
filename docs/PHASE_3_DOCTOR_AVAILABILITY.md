# Phase 3: Doctor Management & Slot Availability Engine

## 1. Overview

Phase 3 implements comprehensive doctor profile, working hours, and leave management alongside an authoritative backend Slot Availability Engine.

### Key Architectural Principles
- **Authoritative Backend**: Availability is computed strictly on the backend via `src/services/availability.ts`. The frontend never calculates slot validity on its own.
- **Timezone-Aware Precision**: Working hours are parsed as 24-hour time strings (`"HH:MM"`), anchored to the target date in UTC / Doctor timezone, and evaluated against interval boundaries without naive string manipulation.
- **Multi-Constraint Filtering**: Slots are filtered against:
  1. Doctor's configured working hours for the target day of the week.
  2. Doctor's approved leaves (`DoctorLeave`).
  3. Conflicting active appointments (`Appointment`).
  4. Real-time past time threshold (`startsAt <= now`).
  5. Schedule end boundaries (trailing partial slots exceeding `endTime` are safely omitted).

---

## 2. Slot Availability Algorithm

Given a `targetDateStr` (e.g. `"2026-08-25"`), a `Doctor` record with `workingHours`, `slotDurationMins` (e.g. `30`), `DoctorLeave`s, and `Appointment`s:

1. **Day of Week Resolution**: Convert target date to its day-of-week (`MONDAY` through `SUNDAY`).
2. **Working Hours Lookup**: If no working hours exist for this day of week, return `isWorkingDay: false` and `slots: []`.
3. **Discrete Slot Generation**:
   - `startMinutes = hours * 60 + minutes`
   - `endMinutes = hours * 60 + minutes`
   - Step from `startMinutes` with increment `slotDurationMins` while `slotStart + slotDurationMins <= endMinutes`.
4. **Collision Checking**:
   - Overlap formula: `areIntervalsOverlapping(slotStart, slotEnd, conflictStart, conflictEnd) = slotStart < conflictEnd && slotEnd > conflictStart`.
   - Leaves: if any leave overlaps, set `available: false, reason: "LEAVE"`.
   - Appointments: if any non-cancelled appointment overlaps, set `available: false, reason: "BOOKED"`.
   - Past check: if `slotStart <= referenceNow`, set `available: false, reason: "PAST"`.

---

## 3. API Endpoints Reference

| Method | Endpoint | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/doctors` | Public / Authenticated | List active doctors (filterable by `?specialization=...`) |
| `POST` | `/api/doctors` | `ADMIN` only | Create doctor user account and clinical profile |
| `GET` | `/api/doctors/[id]` | Authenticated | Retrieve doctor details, working hours, and leaves |
| `PATCH` | `/api/doctors/[id]` | `ADMIN` only | Update doctor profile, slot duration, and status |
| `GET` | `/api/doctors/[id]/working-hours` | Authenticated | Get weekly working schedule |
| `PUT` | `/api/doctors/[id]/working-hours` | `ADMIN` or Target `DOCTOR` | Set or replace working hours |
| `GET` | `/api/doctors/[id]/leaves` | Authenticated | List doctor leaves |
| `POST` | `/api/doctors/[id]/leaves` | `ADMIN` or Target `DOCTOR` | Record a leave period |
| `DELETE` | `/api/doctors/[id]/leaves/[leaveId]` | `ADMIN` or Target `DOCTOR` | Cancel / remove a leave period |
| `GET` | `/api/doctors/[id]/availability?date=YYYY-MM-DD` | Authenticated / Public | Compute real-time authoritative slot availability |

---

## 4. Verification Commands

```bash
# Run all automated tests (38 tests)
npm test

# Run TypeScript type check
npm run typecheck

# Run ESLint
npm run lint

# Validate Prisma Schema
npm run prisma:validate

# Build Next.js application
npm run build
```
