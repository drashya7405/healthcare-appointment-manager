# Production Deployment Guide

## Overview

The application is engineered for automated CI/CD deployment on **Vercel** connected with a **Neon Serverless PostgreSQL** database.

- **Production URL**: `https://healthcare-appointment-manager.vercel.app`
- **Hosting Platform**: Vercel Serverless (Node.js runtime)
- **Database Engine**: Neon PostgreSQL with connection pooling (`sslmode=require`)

---

## 1. Database Provisioning (Neon PostgreSQL)

1. Create a project in [Neon Console](https://console.neon.tech).
2. Obtain the pooled connection string (e.g. `postgresql://user:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require`).
3. Run the schema migrations from your terminal:
   ```bash
   DATABASE_URL="<your-neon-url>" npx prisma db push
   ```

---

## 2. Vercel Deployment Setup

1. Import the GitHub repository into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Configure **Framework Preset**: Next.js.
3. Configure **Build & Output Settings**:
   - Build Command: `npm run build` (runs `prisma generate && next build --webpack`)
   - Node.js Version: `20.x` or higher.

---

## 3. Environment Variables Configuration

Add the following environment variables in **Vercel Dashboard** ➔ **Settings** ➔ **Environment Variables**:

| Variable Name | Description / Example | Environment |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Postgres pooled connection URL | Production, Preview |
| `AUTH_SECRET` | 32+ character random secret string | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://healthcare-appointment-manager.vercel.app` | Production |
| `AI_PROVIDER` | `groq` | Production, Preview |
| `GROQ_API_KEY` | Groq API Key starting with `gsk_...` | Production, Preview |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Production, Preview |
| `EMAIL_PROVIDER` | `brevo` | Production, Preview |
| `BREVO_API_KEY` | Brevo API key starting with `xkeysib_...` | Production, Preview |
| `EMAIL_FROM` | `Healthcare Appointment Manager <drashya745@gmail.com>` | Production, Preview |
| `GOOGLE_CLIENT_ID` | `<client-id>.apps.googleusercontent.com` | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | `<google-oauth-secret>` | Production, Preview |
| `GOOGLE_REDIRECT_URI` | `https://healthcare-appointment-manager.vercel.app/api/auth/google/callback` | Production |

---

## 4. Post-Deployment Verification

1. **Health Check**:
   Navigate to `https://healthcare-appointment-manager.vercel.app/api/health` ➔ should return `{"status": "ok"}`.
2. **Email Diagnostics**:
   Log in as Admin (`admin@example.com` / `AdminPass123!`), visit `/api/admin/email-diagnostics` via `GET` to verify provider configuration, and execute `POST` to confirm delivery of a test email.
3. **Google Calendar Verification**:
   Log in as Doctor, visit `/doctor/dashboard`, click **Connect Google Calendar**, grant consent, and verify that the dashboard reflects the connected state.
