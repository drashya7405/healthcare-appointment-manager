"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DoctorConsultationModal } from "@/components/doctor-consultation-modal";
import { formatDateIST, formatIntervalIST } from "@/lib/date-utils";

interface AppointmentItem {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: string;
  cancellationReason?: string | null;
  patient: {
    phone?: string | null;
    gender?: string | null;
    emergencyContact?: string | null;
    medicalHistory?: string | null;
    user: {
      name: string;
      email: string;
    };
  };
  symptomSubmission?: {
    symptoms: string;
    urgencyLevel?: string | null;
    chiefComplaint?: string | null;
    llmSummary?: string | null;
  } | null;
  prescription?: {
    clinicalNotes: string;
    followUpSteps?: string | null;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      instructions?: string | null;
    }>;
  } | null;
}

export function DoctorAppointmentsList({
  initialAppointments,
}: {
  initialAppointments: AppointmentItem[];
}) {
  const router = useRouter();
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<AppointmentItem>>>({});

  const appointments = initialAppointments.map((a) =>
    localOverrides[a.id] ? { ...a, ...localOverrides[a.id] } : a
  );

  const [filterTab, setFilterTab] = useState<"TODAY" | "UPCOMING" | "COMPLETED" | "ALL">("TODAY");
  const [selectedForConsultation, setSelectedForConsultation] = useState<AppointmentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    BOOKED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
    RESCHEDULED: "bg-amber-50 text-amber-700 border-amber-200",
    AFFECTED_BY_LEAVE: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const filteredAppointments = appointments.filter((appt) => {
    const start = new Date(appt.startsAt);
    const end = new Date(appt.endsAt);

    if (filterTab === "TODAY") {
      return start >= todayStart && start < todayEnd && appt.status !== "CANCELLED";
    }
    if (filterTab === "UPCOMING") {
      return end >= now && appt.status !== "CANCELLED" && appt.status !== "COMPLETED";
    }
    if (filterTab === "COMPLETED") {
      return appt.status === "COMPLETED";
    }
    return true;
  });

  async function handleCancel(id: string) {
    const reason = prompt("Optional: Enter cancellation note for patient") || undefined;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to cancel appointment.");
        return;
      }

      setLocalOverrides((prev) => ({
        ...prev,
        [id]: data.data.appointment,
      }));
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error while cancelling appointment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab("TODAY")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "TODAY"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Today&apos;s Schedule ({appointments.filter((a) => new Date(a.startsAt) >= todayStart && new Date(a.startsAt) < todayEnd).length})
        </button>
        <button
          onClick={() => setFilterTab("UPCOMING")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "UPCOMING"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Upcoming ({appointments.filter((a) => new Date(a.startsAt) >= todayEnd && a.status !== "CANCELLED" && a.status !== "COMPLETED").length})
        </button>
        <button
          onClick={() => setFilterTab("COMPLETED")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "COMPLETED"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Completed ({appointments.filter((a) => a.status === "COMPLETED").length})
        </button>
        <button
          onClick={() => setFilterTab("ALL")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "ALL"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({appointments.length})
        </button>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          No appointments found in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isCancellable =
              appt.status !== "CANCELLED" && appt.status !== "COMPLETED";

            return (
              <div
                key={appt.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        statusColors[appt.status] ||
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {appt.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {formatDateIST(appt.startsAt)}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700">
                      {formatIntervalIST(appt.startsAt, appt.endsAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => setSelectedForConsultation(appt)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                    >
                      {appt.status === "COMPLETED" ? "Review Record" : "Clinical Consultation →"}
                    </button>

                    {isCancellable && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={loading}
                        className="rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-bold text-slate-900">Patient:</span>{" "}
                    {appt.patient.user.name} ({appt.patient.user.email})
                    {appt.patient.phone && (
                      <span className="text-slate-500 ml-2">Phone: {appt.patient.phone}</span>
                    )}
                  </div>

                  {appt.symptomSubmission?.symptoms && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-[11px]">
                          Submitted Symptoms:
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Urgency: {appt.symptomSubmission.urgencyLevel || "MEDIUM"}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {appt.symptomSubmission.symptoms}
                      </p>
                    </div>
                  )}

                  {appt.prescription && (
                    <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 mt-1">
                      <span className="font-bold text-blue-900 text-[11px] block mb-0.5">
                        Clinical Diagnosis &amp; Notes:
                      </span>
                      <p className="text-slate-700">{appt.prescription.clinicalNotes}</p>
                    </div>
                  )}

                  {appt.cancellationReason && (
                    <p className="text-[11px] text-red-600 italic">
                      Cancellation note: {appt.cancellationReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedForConsultation && (
        <DoctorConsultationModal
          appointment={selectedForConsultation}
          onClose={() => setSelectedForConsultation(null)}
          onSuccess={() => {
            setSelectedForConsultation(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
