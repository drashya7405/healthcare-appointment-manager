"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RescheduleModal } from "@/components/reschedule-modal";
import { PatientAppointmentDetailModal } from "@/components/patient-appointment-detail-modal";
import { formatDateIST, formatIntervalIST } from "@/lib/date-utils";

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string | null;
}

interface AppointmentItem {
  id: string;
  doctorId: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: string;
  cancellationReason?: string | null;
  doctor: {
    specialization: string;
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
    patientFriendlySummary?: string | null;
    followUpSteps?: string | null;
    medications: MedicationItem[];
  } | null;
}

export function PatientAppointmentsList({
  initialAppointments,
  defaultDate = "",
}: {
  initialAppointments: AppointmentItem[];
  defaultDate?: string;
}) {
  const router = useRouter();
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<AppointmentItem>>>({});

  const appointments = initialAppointments.map((a) =>
    localOverrides[a.id] ? { ...a, ...localOverrides[a.id] } : a
  );

  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "PAST">("UPCOMING");
  const [selectedForDetail, setSelectedForDetail] = useState<AppointmentItem | null>(null);
  const [selectedForReschedule, setSelectedForReschedule] = useState<AppointmentItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
  const filteredAppointments = appointments.filter((appt) => {
    const isPast =
      new Date(appt.endsAt) < now ||
      appt.status === "COMPLETED" ||
      appt.status === "CANCELLED";

    if (filterTab === "UPCOMING") return !isPast;
    if (filterTab === "PAST") return isPast;
    return true;
  });

  async function handleCancel(id: string) {
    const reason = prompt("Optional: Enter a reason for cancellation") || undefined;
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
      setCancellingId(null);
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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab("UPCOMING")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "UPCOMING"
              ? "bg-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Upcoming Visits ({appointments.filter((a) => new Date(a.endsAt) >= now && a.status !== "CANCELLED" && a.status !== "COMPLETED").length})
        </button>
        <button
          onClick={() => setFilterTab("PAST")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "PAST"
              ? "bg-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Past &amp; Completed ({appointments.filter((a) => new Date(a.endsAt) < now || a.status === "COMPLETED" || a.status === "CANCELLED").length})
        </button>
        <button
          onClick={() => setFilterTab("ALL")}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
            filterTab === "ALL"
              ? "bg-teal-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({appointments.length})
        </button>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          {filterTab === "UPCOMING"
            ? "No upcoming visits scheduled. Browse doctors below to book an appointment."
            : "No records found for this filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isCancellable =
              appt.status !== "CANCELLED" && appt.status !== "COMPLETED";

            return (
              <div
                key={appt.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
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
                    <span className="text-xs font-mono font-bold text-teal-700">
                      {formatIntervalIST(appt.startsAt, appt.endsAt)}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      {appt.doctor.user.name}
                    </span>{" "}
                    ·{" "}
                    <span className="text-teal-700 font-medium">
                      {appt.doctor.specialization}
                    </span>
                  </div>

                  {appt.symptomSubmission?.symptoms && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                      <span className="font-semibold text-slate-700">Symptoms:</span>{" "}
                      {appt.symptomSubmission.symptoms}
                    </p>
                  )}

                  {appt.cancellationReason && (
                    <p className="text-[11px] text-red-600 italic">
                      Note: {appt.cancellationReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setSelectedForDetail(appt)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    View Details
                  </button>

                  {isCancellable && (
                    <>
                      <button
                        onClick={() => setSelectedForReschedule(appt)}
                        className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={loading && cancellingId === appt.id}
                        className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedForDetail && (
        <PatientAppointmentDetailModal
          appointment={selectedForDetail}
          onClose={() => setSelectedForDetail(null)}
        />
      )}

      {selectedForReschedule && (
        <RescheduleModal
          appointmentId={selectedForReschedule.id}
          doctorId={selectedForReschedule.doctorId}
          doctorName={selectedForReschedule.doctor.user.name}
          currentStartsAt={typeof selectedForReschedule.startsAt === "string" ? selectedForReschedule.startsAt : selectedForReschedule.startsAt.toISOString()}
          defaultDate={defaultDate}
          onClose={() => setSelectedForReschedule(null)}
          onSuccess={() => {
            setSelectedForReschedule(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
