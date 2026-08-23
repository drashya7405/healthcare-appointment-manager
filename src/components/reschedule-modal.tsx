"use client";

import { useState } from "react";
import { formatDateTimeIST } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

interface TimeSlot {
  startsAt: string;
  endsAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

interface RescheduleModalProps {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  currentStartsAt: string;
  defaultDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleModal({
  appointmentId,
  doctorId,
  doctorName,
  currentStartsAt,
  defaultDate,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSlots(date: string) {
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/availability?date=${date}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to load slots.");
        setSlots(null);
        return;
      }
      setSlots(data.data.slots);
    } catch (err) {
      console.error(err);
      setError("Network error fetching availability.");
      setSlots(null);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    fetchSlots(date);
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStartsAt: selectedSlot.startsAt,
          reason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(
          data?.error?.message ||
            "This slot is no longer available. Please select another slot."
        );
        return;
      }

      onSuccess();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred while rescheduling.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Reschedule Visit
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">Select New Slot</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1">
          <p className="text-slate-500">Doctor: <strong className="text-slate-900">{doctorName}</strong></p>
          <p className="text-slate-500">Current Time: <strong className="text-slate-900">{formatDateTimeIST(currentStartsAt)}</strong></p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-900 focus:outline-teal-500 font-medium"
            />
          </div>

          <div className="mt-3">
            {!slots && !loadingSlots ? (
              <button
                type="button"
                onClick={() => fetchSlots(selectedDate)}
                className="w-full rounded-lg bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Load Available Slots for {selectedDate}
              </button>
            ) : loadingSlots ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Checking authoritative availability...
              </div>
            ) : slots && slots.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No slots available on this date.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {slots?.map((slot, i) => {
                  const isSelected = selectedSlot?.startsAt === slot.startsAt;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border p-2 text-center text-xs transition cursor-pointer ${
                        isSelected
                          ? "border-teal-600 bg-teal-600 text-white font-bold"
                          : slot.available
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-semibold"
                          : "border-slate-200 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="font-mono text-[11px]">{slot.formattedTime}</div>
                      <div className="text-[9px] uppercase mt-0.5">
                        {slot.available ? "Free" : slot.reason || "Taken"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleReschedule} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Rescheduling (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Schedule conflict"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? "Securing New Slot..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
