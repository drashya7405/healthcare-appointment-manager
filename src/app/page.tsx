import Link from "next/link";
import { getCurrentUser } from "@/auth/session";
import { getRoleDashboardUrl } from "@/auth/rbac";
import { prisma } from "@/database/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, totalDoctors, specializations] = await Promise.all([
    getCurrentUser(),
    prisma.doctor.count(),
    prisma.doctor.findMany({
      select: { specialization: true },
      distinct: ["specialization"],
    }),
  ]);

  return (
    <main className="mx-auto flex flex-1 w-full max-w-6xl flex-col justify-center px-4 py-12 sm:px-8 space-y-12">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
            Intelligent Clinic Management
          </span>
          <span className="text-xs text-slate-400">Local &amp; Secure</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Healthcare Appointment &amp; Clinical Follow-up Manager
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-7 text-slate-600">
          Book specialist consultations with authoritative concurrency protection, submit structured symptoms, and access digital prescriptions seamlessly.
        </p>

        {user ? (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/80 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold text-teal-700 tracking-wider">Active Clinical Session</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Welcome, {user.name} ({user.role})</h2>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
            <Link
              href={getRoleDashboardUrl(user.role)}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition"
            >
              Open {user.role} Dashboard →
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition"
            >
              Sign In / 1-Click Demo Logins
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              Register as New Patient
            </Link>
            <Link
              href="/doctors"
              className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Browse Specialists ({totalDoctors})
            </Link>
          </div>
        )}
      </div>

      {/* Specialization Tags */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Clinical Specialties Available
        </h3>
        <div className="flex flex-wrap gap-2">
          {specializations.map((s) => (
            <Link
              key={s.specialization}
              href="/doctors"
              className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 border border-teal-200 hover:bg-teal-100 transition"
            >
              {s.specialization}
            </Link>
          ))}
        </div>
      </div>

      {/* Role Portals Grid */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                PATIENT
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/patient/*</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Patient Portal</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Find specialists, view live available slots, submit pre-visit symptoms, manage upcoming visits, and view prescriptions.
            </p>
          </div>
          <Link
            href="/patient/dashboard"
            className="mt-4 inline-block text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Open Patient Portal →
          </Link>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                DOCTOR
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/doctor/*</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Doctor Portal</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Review daily appointments, inspect patient symptoms, record clinical notes, prescribe medications, and manage working hours.
            </p>
          </div>
          <Link
            href="/doctor/dashboard"
            className="mt-4 inline-block text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Open Doctor Portal →
          </Link>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                ADMIN
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/admin/*</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Admin Portal</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Create &amp; edit doctor accounts, configure slot durations, schedule doctor leave, and oversee clinic appointments.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="mt-4 inline-block text-xs font-bold text-purple-600 hover:text-purple-700"
          >
            Open Admin Portal →
          </Link>
        </div>
      </div>
    </main>
  );
}
