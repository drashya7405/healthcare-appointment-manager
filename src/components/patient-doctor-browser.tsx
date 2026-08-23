"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingModal } from "@/components/booking-modal";

interface DoctorItem {
  id: string;
  specialization: string;
  slotDurationMins: number;
  timezone: string;
  bio?: string | null;
  user: {
    name: string;
    email: string;
  };
  workingHours: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

interface TimeSlot {
  startsAt: string;
  endsAt: string;
  formattedTime: string;
  available: boolean;
  reason?: string;
}

export function PatientDoctorBrowser({
  doctors,
  defaultDate = "",
}: {
  doctors: DoctorItem[];
  defaultDate?: string;
}) {
  const router = useRouter();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(doctors[0] || null);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  const specializations = Array.from(
    new Set(doctors.map((d) => d.specialization))
  );

  const filteredDoctors =
    selectedSpecialization === "ALL"
      ? doctors
      : doctors.filter((d) => d.specialization === selectedSpecialization);

  async function fetchAvailability(docId: string, date: string) {
    setLoadingSlots(true);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${docId}/availability?date=${date}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to load availability slots.");
        setSlots(null);
        return;
      }

      setSlots(data.data.slots);
    } catch (err) {
      console.error(err);
      setError("Network error fetching doctor slots.");
      setSlots(null);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSelectDoctor(doc: DoctorItem) {
    setSelectedDoctor(doc);
    fetchAvailability(doc.id, selectedDate);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedDoctor) {
      fetchAvailability(selectedDoctor.id, date);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter by Specialization */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Specialization:</span>
        <button
          onClick={() => setSelectedSpecialization("ALL")}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
            selectedSpecialization === "ALL"
              ? "bg-teal-600 text-white shadow-2xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Specialists ({doctors.length})
        </button>
        {specializations.map((spec) => (
          <button
            key={spec}
            onClick={() => setSelectedSpecialization(spec)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
              selectedSpecialization === spec
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Doctor List */}
        <div className="space-y-3 md:col-span-1">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Available Doctors</h3>
          {filteredDoctors.map((doc) => {
            const isSelected = selectedDoctor?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => handleSelectDoctor(doc)}
                className={`rounded-xl border p-4 transition cursor-pointer ${
                  isSelected
                    ? "border-teal-500 bg-teal-50/50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{doc.user.name}</h4>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                    {doc.specialization}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{doc.slotDurationMins} min consultations</p>
                <div className="mt-2 text-[11px] text-slate-400">
                  {doc.workingHours?.length || 0} working days / week
                </div>
              </div>
            );
          })}
        </div>

        {/* Slot Inspector / Availability Explorer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
          {selectedDoctor ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDoctor.user.name}</h3>
                  <p className="text-xs text-teal-700 font-medium">
                    {selectedDoctor.specialization} · {selectedDoctor.slotDurationMins}m slots
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-900 focus:outline-teal-500 font-medium"
                  />
                </div>
              </div>

              {selectedDoctor.bio && (
                <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                  &ldquo;{selectedDoctor.bio}&rdquo;
                </p>
              )}

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Authoritative Appointment Slots for {selectedDate}
                  </h4>
                  {slots && (
                    <span className="text-xs text-slate-500">
                      <strong className="text-emerald-600">{slots.filter((s) => s.available).length}</strong> available / {slots.length} total
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Computing slot availability via backend engine...
                  </div>
                ) : !slots ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                    <button
                      onClick={() => fetchAvailability(selectedDoctor.id, selectedDate)}
                      className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 transition cursor-pointer"
                    >
                      Check Available Slots
                    </button>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                    Doctor is not available on this day (Outside working hours or day off).
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {slots.map((slot, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (slot.available) {
                            setSelectedSlotForBooking(slot);
                            setBookingSuccessMsg(null);
                          }
                        }}
                        className={`rounded-xl border p-3 text-center transition ${
                          slot.available
                            ? "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 shadow-2xs cursor-pointer active:scale-98"
                            : "border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="text-xs font-bold font-mono text-slate-800">
                          {slot.formattedTime}
                        </div>
                        <div className="mt-1">
                          {slot.available ? (
                            <span className="inline-block rounded bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                              BOOK SLOT →
                            </span>
                          ) : (
                            <span className="inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 uppercase">
                              {slot.reason || "UNAVAILABLE"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a doctor from the list to view appointment availability.
            </div>
          )}
        </div>
      </div>

      {bookingSuccessMsg && (
        <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 font-semibold">
          {bookingSuccessMsg}
        </div>
      )}

      {selectedSlotForBooking && selectedDoctor && (
        <BookingModal
          doctorId={selectedDoctor.id}
          doctorName={selectedDoctor.user.name}
          specialization={selectedDoctor.specialization}
          slotStartsAt={selectedSlotForBooking.startsAt}
          slotEndsAt={selectedSlotForBooking.endsAt}
          formattedTime={selectedSlotForBooking.formattedTime}
          selectedDate={selectedDate}
          onClose={() => setSelectedSlotForBooking(null)}
          onSuccess={() => {
            setSelectedSlotForBooking(null);
            setBookingSuccessMsg("Appointment booked successfully! You can view your visit above in Upcoming Visits.");
            fetchAvailability(selectedDoctor.id, selectedDate);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
