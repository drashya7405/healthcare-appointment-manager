"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateIST, formatTimeIST } from "@/lib/date-utils";

interface AdminAppointmentItem {
  id: string;
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
  patient: {
    user: {
      name: string;
      email: string;
    };
  };
  symptomSubmission?: {
    symptoms: string;
  } | null;
}

export function AdminAppointmentsManager({
  initialAppointments,
}: {
  initialAppointments: AdminAppointmentItem[];
}) {
  const router = useRouter();
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<AdminAppointmentItem>>>({});

  const appointments = initialAppointments.map((a) =>
    localOverrides[a.id] ? { ...a, ...localOverrides[a.id] } : a
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [doctorSearch, setDoctorSearch] = useState<string>("");
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

  const filtered = appointments.filter((appt) => {
    if (statusFilter !== "ALL" && appt.status !== statusFilter) return false;
    if (
      doctorSearch.trim() &&
      !appt.doctor.user.name.toLowerCase().includes(doctorSearch.toLowerCase()) &&
      !appt.patient.user.name.toLowerCase().includes(doctorSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  async function handleAdminCancel(id: string) {
    const reason = prompt("Enter administrative cancellation reason:") || "Cancelled by Admin";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Clinic Appointment Log</h2>
          <p className="text-xs text-slate-500">Live oversight of all patient bookings across all clinical specialties</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search patient / doctor..."
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-purple-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-purple-500 font-medium"
          >
            <option value="ALL">All Statuses ({appointments.length})</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RESCHEDULED">Rescheduled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
          No appointments matching criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date &amp; Time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Doctor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Symptoms</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((appt) => {
                const isCancellable =
                  appt.status !== "CANCELLED" && appt.status !== "COMPLETED";

                return (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {formatDateIST(appt.startsAt)}
                      <span className="font-mono text-teal-700 block text-[11px]">
                        {formatTimeIST(appt.startsAt)} IST
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block">{appt.doctor.user.name}</span>
                      <span className="text-[11px] text-blue-600">{appt.doctor.specialization}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block">{appt.patient.user.name}</span>
                      <span className="text-[11px] text-slate-500">{appt.patient.user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {appt.symptomSubmission?.symptoms || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          statusColors[appt.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isCancellable && (
                        <button
                          onClick={() => handleAdminCancel(appt.id)}
                          disabled={loading}
                          className="rounded border border-red-200 bg-red-50/50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
