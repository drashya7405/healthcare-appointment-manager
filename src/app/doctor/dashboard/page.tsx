import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { prisma } from "@/database/prisma";
import { getTomorrowDateString } from "@/lib/date-utils";
import { DoctorAvailabilityManager } from "@/components/doctor-availability-manager";
import { DoctorAppointmentsList } from "@/components/doctor-appointments-list";
import { GoogleCalendarCard } from "@/components/google-calendar-card";

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/doctor/dashboard");
  }

  if (user.role !== "DOCTOR") {
    redirect("/unauthorized");
  }

  const [doctorData, rawAppointments] = await Promise.all([
    user.doctor
      ? prisma.doctor.findUnique({
          where: { id: user.doctor.id },
          include: {
            workingHours: { orderBy: { day: "asc" } },
            leaves: { orderBy: { startsAt: "asc" } },
          },
        })
      : null,
    user.doctor
      ? prisma.appointment.findMany({
          where: { doctorId: user.doctor.id },
          include: {
            patient: {
              select: {
                phone: true,
                gender: true,
                emergencyContact: true,
                medicalHistory: true,
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
          orderBy: { startsAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!doctorData) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Doctor profile not found for this account.
      </div>
    );
  }

  const appointments = rawAppointments.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    cancellationReason: a.cancellationReason,
    patient: a.patient,
    symptomSubmission: a.symptomSubmission,
    prescription: a.prescription
      ? {
          clinicalNotes: a.prescription.clinicalNotes,
          followUpSteps: a.prescription.followUpSteps,
          medications: a.prescription.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            instructions: m.instructions,
          })),
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
              Doctor Portal
            </span>
            <span className="text-xs text-slate-400">Authenticated Clinical Session</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
            {user.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Specialization: <span className="font-semibold text-slate-800">{doctorData.specialization}</span> · Slot Duration: <span className="font-semibold text-slate-800">{doctorData.slotDurationMins} mins</span> · Timezone: <span className="font-semibold text-slate-800">{doctorData.timezone} (IST)</span>
          </p>
        </div>
      </div>

      <GoogleCalendarCard />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Doctor Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-1 h-fit">
          <h2 className="text-base font-semibold text-slate-900">Clinical Profile</h2>
          <dl className="mt-4 space-y-3 text-xs">
            <div>
              <dt className="text-slate-400 uppercase font-medium">Doctor ID</dt>
              <dd className="mt-0.5 font-mono text-slate-700 break-all">{doctorData.id}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Email</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Slot Duration</dt>
              <dd className="mt-0.5 text-slate-800 font-semibold">{doctorData.slotDurationMins} minutes</dd>
            </div>
            <div>
              <dt className="text-slate-400 uppercase font-medium">Biography</dt>
              <dd className="mt-0.5 text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                {doctorData.bio || "No biography provided."}
              </dd>
            </div>
          </dl>
        </div>

        {/* Schedule & Appointments */}
        <div className="md:col-span-2 space-y-6">
          {/* Patient Consultations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Scheduled Patient Consultations
              </h2>
              <span className="text-xs text-slate-500">
                {appointments.length} appointment(s)
              </span>
            </div>
            <DoctorAppointmentsList initialAppointments={appointments} />
          </div>

          {/* Working Hours, Leaves, and Live Slot Inspector */}
          <DoctorAvailabilityManager
            doctorId={doctorData.id}
            defaultDate={getTomorrowDateString()}
            slotDurationMins={doctorData.slotDurationMins}
            initialWorkingHours={doctorData.workingHours}
            initialLeaves={doctorData.leaves.map((l) => ({
              id: l.id,
              startsAt: l.startsAt.toISOString(),
              endsAt: l.endsAt.toISOString(),
              reason: l.reason,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
