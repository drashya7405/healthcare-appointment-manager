# Testing & Quality Assurance Documentation

## Overview

The application features a test suite utilizing Node.js's native test runner (`node:test`, `node:assert/strict`) executed via TypeScript (`tsx`). The suite validates critical business logic, concurrency guarantees, authentication boundaries, validation schemas, and resilient integration adapters without requiring external mock servers or network dependencies.

---

## Current Test Suite Summary

- **Total Test Suites**: 59
- **Total Test Cases**: 125
- **Status**: 125 Passed, 0 Failed, 0 Skipped (100% Pass Rate)

```text
# tests 125
# suites 59
# pass 125
# fail 0
# cancelled 0
# skipped 0
# duration_ms 1682ms
```

---

## Test Category Catalog

| Test File | Primary Focus | Key Scenarios Verified |
| :--- | :--- | :--- |
| `src/__tests__/availability.test.ts` | Slot Availability Engine | 15/30/45m slot generation, IST timezone alignment, single-day and multi-day partial leave masking (e.g. 15:00 to 15:00 next day), past time filtering, appointment subtraction. |
| `src/__tests__/concurrency.test.ts` | Concurrency & Double-Booking Guard | Simultaneous booking attempts on identical slots (1 winner, N 409 errors), transactional serialization, cancellation slot release, rescheduling into occupied slots. |
| `src/__tests__/email-notifications.test.ts` | Transactional Email & Brevo | Template rendering, Brevo 201 success, Brevo 401/network failure handling, missing API key diagnostics, non-silent mock fallback, non-blocking booking isolation. |
| `src/__tests__/ai-service.test.ts` | AI Pre/Post-Visit Summaries | Urgency classification (`LOW`/`MEDIUM`/`HIGH`), chief complaint extraction, 3 doctor questions, patient-friendly summary, graceful fallback on LLM failure. |
| `src/__tests__/google-calendar.test.ts` | Calendar & OAuth 2.0 | OAuth consent URL generation, code token exchange, event creation/patch/deletion, automatic token refresh, API failure isolation. |
| `src/__tests__/background-jobs.test.ts` | Background Jobs & Reminders | Medication reminder processing, notification retry logic with exponential backoff, duplicate prevention via idempotency keys. |
| `src/__tests__/rbac.test.ts` | Role-Based Access Control | Permission guards (`requirePatient`, `requireDoctor`, `requireAdmin`), resource ownership assertions (IDOR protection). |
| `src/__tests__/session.test.ts` | Session Management | Cryptographic token generation, database session lookup, 7-day expiration checks, secure cookie options. |
| `src/__tests__/password.test.ts` | Password Security | Bcrypt hashing, salt round verification, comparison safety. |
| `src/__tests__/validation.test.ts` | Auth Schemas | Zod validation for registration, login, and profile payloads. |
| `src/__tests__/appointment-validation.test.ts` | Appointment Schemas | Booking, cancellation reason, and rescheduling input validations. |
| `src/__tests__/doctor-validation.test.ts` | Doctor Schemas | Working hours intervals, slot duration boundaries ([10, 120] minutes), leave interval rules. |
| `src/__tests__/prescription-validation.test.ts` | Clinical Schemas | Clinical notes, medication items, dosage, and frequency schemas. |
| `src/__tests__/comprehensive-verification.test.ts` | End-to-End Integration Audit | Full-system lifecycle verification spanning Auth, RBAC, Availability, AI, Email, Calendar, and Error Handling. |

---

## Verification Commands

Run the full suite using standard project npm scripts:

```bash
# 1. Run Automated Unit & Integration Tests
npm test

# 2. Run TypeScript Static Type Checking
npm run typecheck

# 3. Run ESLint Code Quality Inspection
npm run lint

# 4. Compile Production Next.js Build
npm run build
```
