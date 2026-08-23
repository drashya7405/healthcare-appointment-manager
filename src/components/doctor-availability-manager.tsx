"use client";

import { useState } from "react";
import { formatDateTimeIST } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

interface WorkingHour {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface LeaveItem {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  reason?: string | null;
}

interface TimeSlot {
  startsAt: string;
  endsAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

export function DoctorAvailabilityManager({
  doctorId,
  defaultDate = "",
  slotDurationMins,
  initialWorkingHours,
  initialLeaves,
}: {
  doctorId: string;
  defaultDate?: string;
  slotDurationMins: number;
  initialWorkingHours: WorkingHour[];
  initialLeaves: LeaveItem[];
}) {
  const router = useRouter();

  // Working Hours State
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(initialWorkingHours);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState(
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => {
      const existing = initialWorkingHours.find((w) => w.day === day);
      return {
        day,
        enabled: !!existing,
        startTime: existing?.startTime || "09:00",
        endTime: existing?.endTime || "17:00",
      };
    })
  );

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [leaveForm, setLeaveForm] = useState({
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const [showAddLeave, setShowAddLeave] = useState(false);

  // Inspector State
  const [inspectDate, setInspectDate] = useState<string>(defaultDate);
  const [inspectSlots, setInspectSlots] = useState<TimeSlot[] | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSaveWorkingHours(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const activeHours = hoursForm
      .filter((h) => h.enabled)
      .map((h) => ({
        day: h.day,
        startTime: h.startTime,
        endTime: h.endTime,
      }));

    try {
      const res = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours: activeHours }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to update working hours.");
        return;
      }

      setWorkingHours(data.data.workingHours);
      setEditingHours(false);
      setSuccessMsg("Working hours saved successfully.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error while updating working hours.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLeave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(leaveForm.startsAt).toISOString(),
          endsAt: new Date(leaveForm.endsAt).toISOString(),
          reason: leaveForm.reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to add leave.");
        return;
      }

      setLeaves([...leaves, data.data.leave]);
      setShowAddLeave(false);
      setLeaveForm({ startsAt: "", endsAt: "", reason: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error while adding leave.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLeave(leaveId: string) {
    if (!confirm("Are you sure you want to cancel this leave?")) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/leaves/${leaveId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLeaves(leaves.filter((l) => l.id !== leaveId));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInspectSlots() {
    if (!inspectDate) return;
    setInspectLoading(true);
    setInspectError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/availability?date=${inspectDate}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setInspectError(data?.error?.message || "Could not retrieve slots.");
        setInspectSlots(null);
        return;
      }

      setInspectSlots(data.data.slots);
    } catch (err) {
      console.error(err);
      setInspectError("Network error while fetching slots.");
    } finally {
      setInspectLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-200">
          {successMsg}
        </div>
      )}

      {/* 1. Working Hours Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Weekly Working Hours</h2>
            <p className="text-xs text-slate-500">Configured clinic consultation schedule ({slotDurationMins}m slots)</p>
          </div>
          <button
            onClick={() => setEditingHours(!editingHours)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {editingHours ? "Cancel Edit" : "Configure Hours"}
          </button>
        </div>

        {editingHours ? (
          <form onSubmit={handleSaveWorkingHours} className="mt-4 space-y-3">
            {hoursForm.map((item, idx) => (
              <div key={item.day} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => {
                    const next = [...hoursForm];
                    next[idx].enabled = e.target.checked;
                    setHoursForm(next);
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="w-28 text-xs font-semibold text-slate-800">{item.day}</span>
                {item.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => {
                        const next = [...hoursForm];
                        next[idx].startTime = e.target.value;
                        setHoursForm(next);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-teal-500"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => {
                        const next = [...hoursForm];
                        next[idx].endTime = e.target.value;
                        setHoursForm(next);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-teal-500"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Off / Closed</span>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
              >
                {loading ? "Saving..." : "Save Working Hours"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Day</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Start Time</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700">End Time</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {workingHours.length > 0 ? (
                  workingHours.map((wh) => (
                    <tr key={wh.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{wh.day}</td>
                      <td className="px-4 py-2 font-mono text-slate-600">{wh.startTime}</td>
                      <td className="px-4 py-2 font-mono text-slate-600">{wh.endTime}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-600">Active</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                      No working hours configured yet. Click &quot;Configure Hours&quot; above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Leaves & Time-Off Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Leaves &amp; Absence Calendar</h2>
            <p className="text-xs text-slate-500">Slots on approved leave dates are automatically blocked by the availability engine</p>
          </div>
          <button
            onClick={() => setShowAddLeave(!showAddLeave)}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition cursor-pointer"
          >
            {showAddLeave ? "Close" : "+ Schedule Leave"}
          </button>
        </div>

        {showAddLeave && (
          <form onSubmit={handleAddLeave} className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase">New Leave Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Starts At *</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.startsAt}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startsAt: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Ends At *</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.endsAt}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endsAt: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Reason (Optional)</label>
              <input
                type="text"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Personal leave / Medical symposium"
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? "Recording..." : "Record Leave"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {leaves.length > 0 ? (
            leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {formatDateTimeIST(leave.startsAt)} — {formatDateTimeIST(leave.endsAt)}
                  </div>
                  {leave.reason && (
                    <div className="text-slate-500 mt-0.5">{leave.reason}</div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteLeave(leave.id)}
                  className="text-red-600 hover:text-red-800 font-medium ml-4 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">No leave periods recorded.</p>
          )}
        </div>
      </div>

      {/* 3. Real-Time Slot Availability Inspector */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-200/60">
          <div>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
              Backend Engine Inspector
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">Live Slot Availability Preview</h2>
            <p className="text-xs text-slate-600">Inspect how the authoritative backend generates and filters your slots for any date</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={inspectDate}
              onChange={(e) => setInspectDate(e.target.value)}
              className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-teal-500"
            />
            <button
              onClick={handleInspectSlots}
              disabled={inspectLoading}
              className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50 cursor-pointer"
            >
              {inspectLoading ? "Computing..." : "Inspect Slots"}
            </button>
          </div>
        </div>

        {inspectError && (
          <div className="mt-3 rounded bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {inspectError}
          </div>
        )}

        {inspectSlots && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-700 mb-3 font-medium">
              <span>Date: <span className="font-bold">{inspectDate}</span></span>
              <span>
                Available: <span className="font-bold text-emerald-600">{inspectSlots.filter((s) => s.available).length}</span> / {inspectSlots.length} Total Slots
              </span>
            </div>

            {inspectSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                No slots generated for this date (Doctor is not scheduled to work on this day of week).
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {inspectSlots.map((slot, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-2.5 text-center text-xs transition ${
                      slot.available
                        ? "border-emerald-300 bg-white text-emerald-900 shadow-2xs"
                        : "border-slate-200 bg-slate-100/80 text-slate-400"
                    }`}
                  >
                    <div className="font-bold font-mono">{slot.formattedTime}</div>
                    <div className="mt-1 text-[10px] font-semibold">
                      {slot.available ? (
                        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">AVAILABLE</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase">{slot.reason || "UNAVAILABLE"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
