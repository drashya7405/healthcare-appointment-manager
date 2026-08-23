import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { AdminDoctorManager } from "@/components/admin-doctor-manager";
import { AdminAppointmentsManager } from "@/components/admin-appointments-manager";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const [totalUsers, totalDoctors, totalPatients, rawDoctors, rawAppointments] = await Promise.all([
    prisma.user.count(),
    prisma.doctor.count(),
    prisma.patient.count(),
    prisma.doctor.findMany({
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        workingHours: { orderBy: { day: "asc" } },
        leaves: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      include: {
        doctor: {
          select: {
            specialization: true,
            user: { select: { name: true, email: true } },
          },
        },
        patient: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
        symptomSubmission: {
          select: { symptoms: true },
        },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const appointments = rawAppointments.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    cancellationReason: a.cancellationReason,
    doctor: a.doctor,
    patient: a.patient,
    symptomSubmission: a.symptomSubmission,
  }));

  const doctors = rawDoctors.map((d) => ({
    id: d.id,
    specialization: d.specialization,
    slotDurationMins: d.slotDurationMins,
    timezone: d.timezone,
    bio: d.bio,
    user: d.user,
    workingHours: d.workingHours.map((wh) => ({
      id: wh.id,
      day: wh.day,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
    leaves: d.leaves.map((l) => ({
      id: l.id,
      startsAt: l.startsAt.toISOString(),
      endsAt: l.endsAt.toISOString(),
      reason: l.reason,
    })),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
              Admin Portal
            </span>
            <span className="text-xs text-slate-400">System Administration</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
            Clinic Oversight &amp; Doctor Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure doctors, working hours, slot durations, and absence calendars.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs uppercase font-medium text-slate-500">Total System Users</dt>
          <dd className="mt-2 text-3xl font-bold text-slate-900">{totalUsers}</dd>
          <p className="mt-1 text-xs text-slate-400">Across all role types</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs uppercase font-medium text-slate-500">Active Doctors</dt>
          <dd className="mt-2 text-3xl font-bold text-blue-600">{totalDoctors}</dd>
          <p className="mt-1 text-xs text-slate-400">Registered clinical specialists</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs uppercase font-medium text-slate-500">Registered Patients</dt>
          <dd className="mt-2 text-3xl font-bold text-emerald-600">{totalPatients}</dd>
          <p className="mt-1 text-xs text-slate-400">Active patient accounts</p>
        </div>
      </div>

      {/* Clinic Appointment Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <AdminAppointmentsManager initialAppointments={appointments} />
      </div>

      {/* Interactive Doctor Manager Component */}
      <AdminDoctorManager initialDoctors={doctors} />
    </div>
  );
}
