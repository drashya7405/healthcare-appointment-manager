"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DoctorItem {
  id: string;
  specialization: string;
  slotDurationMins: number;
  timezone: string;
  bio?: string | null;
  user: {
    name: string;
    email: string;
    isActive: boolean;
  };
  workingHours: Array<{
    id: string;
    day: string;
    startTime: string;
    endTime: string;
  }>;
  leaves: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
  }>;
}

export function AdminDoctorManager({ initialDoctors }: { initialDoctors: DoctorItem[] }) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorItem[]>(initialDoctors);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoctorForLeave, setSelectedDoctorForLeave] = useState<DoctorItem | null>(null);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    bio: "",
    slotDurationMins: 30,
    timezone: "Asia/Kolkata",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    startsAt: "",
    endsAt: "",
    reason: "",
  });

  async function handleCreateDoctor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slotDurationMins: Number(form.slotDurationMins),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create doctor.");
        return;
      }

      setShowCreateModal(false);
      setForm({
        name: "",
        email: "",
        password: "",
        specialization: "",
        bio: "",
        slotDurationMins: 30,
        timezone: "Asia/Kolkata",
      });
      router.refresh();
      // Reload doctor list
      const listRes = await fetch("/api/doctors");
      const listData = await listRes.json();
      if (listData?.data?.doctors) setDoctors(listData.data.doctors);
    } catch (err) {
      console.error(err);
      setError("Network error while creating doctor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorForLeave) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${selectedDoctorForLeave.id}/leaves`, {
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
        setError(data?.error?.message || "Failed to record leave.");
        return;
      }

      setSelectedDoctorForLeave(null);
      setLeaveForm({ startsAt: "", endsAt: "", reason: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error while adding leave.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Doctor Directory & Schedule Management</h2>
          <p className="text-xs text-slate-500">Configure clinical specializations, working hours, and slot intervals</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setError(null); }}
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition cursor-pointer"
        >
          + Add New Doctor
        </button>
      </div>

      {/* Doctor Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {doctors.map((doc) => (
          <div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{doc.user.name}</h3>
                  <p className="text-xs text-slate-500">{doc.user.email}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {doc.specialization}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Slot Duration</span>
                  <span className="font-semibold text-slate-800">{doc.slotDurationMins} mins</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Working Days</span>
                  <span className="font-semibold text-slate-800">{doc.workingHours?.length || 0} days/wk</span>
                </div>
              </div>

              {doc.bio && (
                <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 italic">{doc.bio}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {doc.leaves?.length ? `${doc.leaves.length} upcoming leave(s)` : "No active leaves"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedDoctorForLeave(doc); setError(null); }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Schedule Leave
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Doctor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Doctor Profile</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Dr. Emily Watson"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="doctor@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="DoctorPass123!"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specialization *</label>
                  <input
                    type="text"
                    required
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="Neurology / Pediatrics"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Slot Duration (Mins) *</label>
                  <select
                    value={form.slotDurationMins}
                    onChange={(e) => setForm({ ...form, slotDurationMins: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Biography</label>
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Doctor's background, credentials, and clinic focus."
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Save Doctor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Leave Modal */}
      {selectedDoctorForLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule Leave for {selectedDoctorForLeave.user.name}</h3>
              <button
                onClick={() => setSelectedDoctorForLeave(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddLeave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Leave Starts At *</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.startsAt}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startsAt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Leave Ends At *</label>
                <input
                  type="datetime-local"
                  required
                  value={leaveForm.endsAt}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endsAt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Medical Conference / Personal leave"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorForLeave(null)}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Record Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
