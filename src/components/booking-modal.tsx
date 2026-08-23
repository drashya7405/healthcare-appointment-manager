"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BookingModalProps {
  doctorId: string;
  doctorName: string;
  specialization: string;
  slotStartsAt: string;
  slotEndsAt: string;
  formattedTime: string;
  selectedDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({
  doctorId,
  doctorName,
  specialization,
  slotStartsAt,
  formattedTime,
  selectedDate,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          startsAt: slotStartsAt,
          symptoms,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data?.error?.message ||
            "This appointment slot is no longer available. Please select another slot."
        );
        return;
      }

      onSuccess();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred while booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
              Confirm Appointment
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">Book Consultation Slot</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
            <p className="font-bold">Booking Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Appointment Details Box */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Doctor:</span>
            <span className="font-bold text-slate-900">{doctorName} ({specialization})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span className="font-semibold text-slate-800">{selectedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time Interval:</span>
            <span className="font-bold font-mono text-teal-700">{formattedTime} IST</span>
          </div>
        </div>

        <form onSubmit={handleBook} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Describe Your Symptoms *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Please provide detailed symptoms, pain level, duration, or reason for this visit.
            </p>
            <textarea
              required
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Experiencing persistent headaches and dizziness for the past 3 days, especially in the morning."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || symptoms.trim().length < 3}
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Securing Slot..." : "Confirm & Book Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
