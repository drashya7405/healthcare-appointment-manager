# Phase 4: Core Appointment System & Concurrency Protection

## 1. Architectural Overview

Phase 4 implements the complete end-to-end Patient Booking Flow, Appointment Lifecycle Management, and database-level concurrency protection to prevent double-booking under race conditions.

---

## 2. Concurrency & Double-Booking Strategy

### The Problem
Naive booking architectures query slot availability first and then insert an appointment record. When two concurrent requests arrive at the same millisecond, both pass the read check and insert duplicate appointments for the same doctor and time slot.

### The Solution
1. **Serializable Database Transactions**:
   All booking and rescheduling operations execute within `prisma.$transaction(..., { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`.
2. **Pre-Write Conflict Detection**:
   Inside the transaction boundary:
   - Queries `DoctorLeave` overlapping `[startsAt, endsAt]`.
   - Queries `Appointment` records where `status NOT IN ('CANCELLED', 'RESCHEDULED')` overlapping `[startsAt, endsAt]`.
3. **Database Unique Constraints**:
   PostgreSQL enforces unique slots per doctor on `(doctorId, startsAt)`.
4. **Clean Error Transformation**:
   When a conflict or serialization failure (e.g. Prisma `P2002` or `P2034`) occurs, it is intercepted and transformed into a clean HTTP 409 JSON response:
   ```json
   {
     "success": false,
     "error": {
       "code": "SLOT_UNAVAILABLE",
       "message": "This appointment slot is no longer available. Please select another slot."
     }
   }
   ```
   Raw database exceptions are never exposed to the client.

---

## 3. Appointment Lifecycle State Machine

```text
[ Patient Books Slot ]
         │
         ▼
     CONFIRMED (or BOOKED)
      ├──► CANCELLED (By Patient, Doctor, or Admin; slot becomes available)
      ├──► RESCHEDULED (Atomically moved to new slot; old slot released)
      ├──► AFFECTED_BY_LEAVE (Doctor takes leave over booked slot)
      └──► COMPLETED (Doctor finishes clinical consultation)
```

- **Cancelled Appointments**: Retained in database for historical auditing; do not block future slot availability.
- **Rescheduling**: Atomic move. The existing slot is never released unless the new requested slot is successfully locked and confirmed in the same transaction.

---

## 4. API Endpoints Reference

| Method | Endpoint | Role Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/appointments` | Authenticated | List appointments (Patients see their own, Doctors see theirs, Admins see all) |
| `POST` | `/api/appointments` | `PATIENT` | Book a consultation slot with symptom description |
| `GET` | `/api/appointments/[id]` | Authorized Owner | Get appointment details with symptom notes |
| `POST` | `/api/appointments/[id]/cancel` | Authorized Owner | Cancel appointment with optional reason |
| `POST` | `/api/appointments/[id]/reschedule` | Authorized Owner | Atomically reschedule appointment to a new slot |

---

## 5. Automated Verification Results

All 55 automated tests across 8 suites pass with 100% success rate:
- Standard booking & symptom submission
- 2 simultaneous booking race conditions (strictly 1 succeeds, 1 receives 409)
- 10 concurrent patients racing for the same slot (1 succeeds, 9 receive 409)
- Independent cross-doctor concurrency (both succeed)
- Leave collision rejection
- Cancelled slot immediate re-booking
- Atomic rescheduling & conflict rollback
