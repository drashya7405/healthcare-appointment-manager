"use client";

import { useState } from "react";
import { formatDateIST, formatIntervalIST } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string | null;
}

interface AppointmentDetails {
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
  symptomSubmission?: {
    symptoms: string;
    urgencyLevel?: string | null;
    chiefComplaint?: string | null;
    doctorQuestions?: string[] | null;
    llmSummary?: string | null;
  } | null;
  prescription?: {
    clinicalNotes: string;
    patientFriendlySummary?: string | null;
    followUpSteps?: string | null;
    llmFailureMessage?: string | null;
    medications: MedicationItem[];
  } | null;
}

export function PatientAppointmentDetailModal({
  appointment,
  onClose,
}: {
  appointment: AppointmentDetails;
  onClose: () => void;
}) {
  const router = useRouter();
  const [prescription, setPrescription] = useState(appointment.prescription);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegeneratePostVisitAi() {
    setGeneratingAi(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "POST_VISIT" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to generate patient-friendly summary.");
        return;
      }

      setPrescription(data.data.prescription);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error contacting AI service.");
    } finally {
      setGeneratingAi(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
              Consultation Record
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Visit Summary &amp; Prescriptions</h3>
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

        {/* Doctor & Schedule Card */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold">Specialist</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{appointment.doctor.user.name}</p>
            <p className="text-teal-700 font-medium">{appointment.doctor.specialization}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Appointment Time</span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {formatDateIST(appointment.startsAt)}
            </p>
            <p className="font-mono font-bold text-teal-700">
              {formatIntervalIST(appointment.startsAt, appointment.endsAt)}
            </p>
          </div>
        </div>

        {/* Pre-visit Symptoms Section */}
        {appointment.symptomSubmission && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Pre-Visit Symptoms Recorded
            </h4>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans">
              {appointment.symptomSubmission.symptoms}
            </p>
          </div>
        )}

        {/* Post-Visit Clinical Summary & Notes */}
        {prescription ? (
          <div className="space-y-4">
            {/* Section 1: Doctor's Official Clinical Diagnosis */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                Doctor-Entered Information
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">
                Official Clinical Diagnosis &amp; Consultation Notes
              </h4>
              <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-blue-100">
                {prescription.clinicalNotes}
              </p>
            </div>

            {/* Section 2: Prescribed Medications */}
            {prescription.medications && prescription.medications.length > 0 ? (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  Prescribed Medications ({prescription.medications.length})
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {prescription.medications.map((med) => (
                    <div
                      key={med.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                          {med.dosage}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">Frequency: {med.frequency}</p>
                      {med.instructions && (
                        <p className="text-[11px] text-slate-500 italic mt-1">
                          Instructions: {med.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Section 3: AI-Generated Patient-Friendly Summary (Groq LLM) */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                    AI-Generated Patient Guide
                  </span>
                  <h4 className="font-bold text-teal-950 text-sm mt-1">
                    Plain-Language Summary &amp; Medication Schedule
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleRegeneratePostVisitAi}
                  disabled={generatingAi}
                  className="rounded bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 hover:bg-teal-200 transition cursor-pointer"
                >
                  {generatingAi ? "Generating..." : "↻ Refresh AI Summary"}
                </button>
              </div>

              {prescription.patientFriendlySummary ? (
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 text-slate-800 space-y-2 whitespace-pre-line leading-relaxed">
                  {prescription.patientFriendlySummary}
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-dashed border-teal-200 text-center text-teal-700">
                  Click &ldquo;↻ Refresh AI Summary&rdquo; to generate an easy-to-read patient guide.
                </div>
              )}

              {prescription.followUpSteps && (
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 text-slate-800 space-y-1 whitespace-pre-line">
                  <strong className="text-teal-900 block mb-0.5">Follow-up &amp; Next Steps:</strong>
                  {prescription.followUpSteps}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            Post-visit clinical notes and prescriptions will appear here once your consultation is completed by the doctor.
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
