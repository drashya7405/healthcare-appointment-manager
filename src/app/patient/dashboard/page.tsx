import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { getTomorrowDateString } from "@/lib/date-utils";
import { PatientDoctorBrowser } from "@/components/patient-doctor-browser";
import { PatientAppointmentsList } from "@/components/patient-appointments-list";

export default async function PatientDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/patient/dashboard");
  }

  if (user.role !== "PATIENT") {
    redirect("/unauthorized");
  }

  const [rawDoctors, rawAppointments] = await Promise.all([
    prisma.doctor.findMany({
      where: { user: { isActive: true } },
      include: {
        user: { select: { name: true, email: true } },
        workingHours: { orderBy: { day: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { patient: { userId: user.id } },
      include: {
        doctor: {
          select: {
            specialization: true,
            user: { select: { name: true, email: true } },
          },
        },
        symptomSubmission: {
          select: { symptoms: true, urgencyLevel: true, chiefComplaint: true, llmSummary: true },
        },
        prescription: {
          include: { medications: true },
        },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const tomorrowStr = getTomorrowDateString();

  const appointments = rawAppointments.map((a) => ({
    id: a.id,
    doctorId: a.doctorId,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    cancellationReason: a.cancellationReason,
    doctor: a.doctor,
    symptomSubmission: a.symptomSubmission,
    prescription: a.prescription
      ? {
          clinicalNotes: a.prescription.clinicalNotes,
          patientFriendlySummary: a.prescription.patientFriendlySummary,
          followUpSteps: a.prescription.followUpSteps,
          medications: a.prescription.medications.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            instructions: m.instructions,
          })),
        }
      : null,
  }));

  const doctors = rawDoctors.map((d) => ({
    id: d.id,
    specialization: d.specialization,
    slotDurationMins: d.slotDurationMins,
    timezone: d.timezone,
    bio: d.bio,
    user: d.user,
    workingHours: d.workingHours.map((wh) => ({
      day: wh.day,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              Patient Portal
            </span>
            <span className="text-xs text-slate-400">Authenticated Session</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search clinical specialists and preview real-time available appointment slots.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-1 h-fit">
          <h2 className="text-base font-semibold text-slate-900">Patient Profile</h2>
          <dl className="mt-4 space-y-3 text-xs">
            <div>
              <dt className="text-slate-400 uppercase font-medium">Email</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Phone</dt>
              <dd className="mt-0.5 text-slate-800">{user.patient?.phone || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Gender</dt>
              <dd className="mt-0.5 text-slate-800">{user.patient?.gender || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Emergency Contact</dt>
              <dd className="mt-0.5 text-slate-800">{user.patient?.emergencyContact || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Medical History / Allergies</dt>
              <dd className="mt-0.5 text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                {user.patient?.medicalHistory || "None recorded"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* My Appointments */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                My Booked Appointments
              </h2>
              <span className="text-xs text-slate-500">
                {appointments.length} record(s)
              </span>
            </div>
            <PatientAppointmentsList
              initialAppointments={appointments}
              defaultDate={tomorrowStr}
            />
          </div>

          {/* Doctor Search & Live Slot Availability Browser */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Book a New Appointment
            </h2>
            <PatientDoctorBrowser
              doctors={doctors}
              defaultDate={tomorrowStr}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
