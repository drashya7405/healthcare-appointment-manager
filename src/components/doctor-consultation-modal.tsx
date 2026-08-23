"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

interface DoctorConsultationModalProps {
  appointment: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date;
    status: string;
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
      doctorQuestions?: string[] | null;
      llmSummary?: string | null;
      llmFailureMessage?: string | null;
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
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DoctorConsultationModal({
  appointment,
  onClose,
  onSuccess,
}: DoctorConsultationModalProps) {
  const router = useRouter();
  const [clinicalNotes, setClinicalNotes] = useState(
    appointment.prescription?.clinicalNotes || ""
  );
  const [followUpSteps, setFollowUpSteps] = useState(
    appointment.prescription?.followUpSteps || ""
  );
  const [medications, setMedications] = useState<MedicationInput[]>(
    appointment.prescription?.medications?.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      instructions: m.instructions || "",
    })) || []
  );

  const [aiBrief, setAiBrief] = useState({
    urgencyLevel: appointment.symptomSubmission?.urgencyLevel || "MEDIUM",
    chiefComplaint: appointment.symptomSubmission?.chiefComplaint || null,
    doctorQuestions: appointment.symptomSubmission?.doctorQuestions || [],
    llmFailureMessage: appointment.symptomSubmission?.llmFailureMessage || null,
  });

  const [regeneratingAi, setRegeneratingAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urgencyColors: Record<string, string> = {
    HIGH: "bg-red-100 text-red-800 border-red-300",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
    LOW: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };

  function addMedicationRow() {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "Once daily", instructions: "" },
    ]);
  }

  function removeMedicationRow(index: number) {
    setMedications(medications.filter((_, i) => i !== index));
  }

  function updateMedicationField(index: number, field: keyof MedicationInput, val: string) {
    const updated = [...medications];
    updated[index][field] = val;
    setMedications(updated);
  }

  async function handleRegenerateAi() {
    setRegeneratingAi(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PRE_VISIT" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "AI summary generation was unavailable.");
        return;
      }

      setAiBrief({
        urgencyLevel: data.data.preVisitSummary.urgency.toUpperCase(),
        chiefComplaint: data.data.preVisitSummary.chiefComplaint,
        doctorQuestions: data.data.preVisitSummary.suggestedQuestions,
        llmFailureMessage: null,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error contacting AI service.");
    } finally {
      setRegeneratingAi(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicalNotes,
          followUpSteps: followUpSteps || undefined,
          markCompleted: true,
          medications: medications.filter((m) => m.name.trim().length > 0),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to save consultation.");
        return;
      }

      onSuccess();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error saving consultation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
              Clinical Session
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Consultation &amp; Prescription Entry</h3>
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

        {/* Patient Profile Box */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 uppercase font-semibold">Patient Name</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{appointment.patient.user.name}</p>
            <p className="text-slate-600">{appointment.patient.user.email}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Contact &amp; Gender</span>
            <p className="font-medium text-slate-800 mt-0.5">
              {appointment.patient.phone || "No phone"} · {appointment.patient.gender || "Unspecified"}
            </p>
            <p className="text-slate-500">Emergency: {appointment.patient.emergencyContact || "None"}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Medical History</span>
            <p className="text-slate-700 mt-0.5 line-clamp-2">
              {appointment.patient.medicalHistory || "None recorded."}
            </p>
          </div>
        </div>

        {/* Original Patient Symptoms (Preserved) */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Patient Submitted Symptoms (Original)
            </h4>
            <span className="text-[11px] text-slate-400">Preserved as entered</span>
          </div>
          <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-sans">
            {appointment.symptomSubmission?.symptoms || "No symptoms recorded."}
          </p>
        </div>

        {/* AI Pre-Visit Clinical Brief (Groq LLM) */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-900 text-[11px] uppercase tracking-wider">
                AI Clinical Assistant Briefing
              </span>
              <span className="text-[10px] text-teal-700 font-normal italic">
                (Informational only · Not a medical diagnosis)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRegenerateAi}
              disabled={regeneratingAi}
              className="rounded bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 hover:bg-teal-200 transition cursor-pointer"
            >
              {regeneratingAi ? "Analyzing..." : "↻ Refresh AI Brief"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">AI-generated urgency indicator:</span>
            <span
              className={`inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                urgencyColors[aiBrief.urgencyLevel] || "bg-slate-100 text-slate-800"
              }`}
            >
              {aiBrief.urgencyLevel} Urgency
            </span>
          </div>

          {aiBrief.chiefComplaint && (
            <div className="bg-white p-3 rounded-lg border border-teal-100">
              <strong className="text-teal-900 block mb-0.5">Chief Complaint:</strong>
              <p className="text-slate-700">{aiBrief.chiefComplaint}</p>
            </div>
          )}

          {aiBrief.doctorQuestions && aiBrief.doctorQuestions.length > 0 && (
            <div className="bg-white p-3 rounded-lg border border-teal-100 space-y-1">
              <strong className="text-teal-900 block mb-1">
                Suggested Diagnostic Questions for Doctor:
              </strong>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                {aiBrief.doctorQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}

          {aiBrief.llmFailureMessage && (
            <p className="text-[11px] text-amber-700 italic">
              Notice: {aiBrief.llmFailureMessage}
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Clinical Diagnosis &amp; Consultation Notes *
            </label>
            <textarea
              required
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Record findings, examination summary, clinical diagnosis, and guidance..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-blue-500 font-sans"
            />
          </div>

          {/* Medications Form */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider">
                Prescribe Medications
              </label>
              <button
                type="button"
                onClick={addMedicationRow}
                className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
              >
                + Add Medication
              </button>
            </div>

            {medications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400">
                No medications added. Click &ldquo;+ Add Medication&rdquo; to prescribe.
              </div>
            ) : (
              <div className="space-y-2.5">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 items-center"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Medication Name"
                      value={med.name}
                      onChange={(e) => updateMedicationField(idx, "name", e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:outline-blue-500 font-medium"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedicationField(idx, "dosage", e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:outline-blue-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Frequency (e.g. Twice daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedicationField(idx, "frequency", e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-xs focus:outline-blue-500"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Instructions (after meals)"
                        value={med.instructions}
                        onChange={(e) => updateMedicationField(idx, "instructions", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:outline-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedicationRow(idx)}
                        className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Follow-up Steps &amp; Recommendations
            </label>
            <input
              type="text"
              value={followUpSteps}
              onChange={(e) => setFollowUpSteps(e.target.value)}
              placeholder="e.g. Return for follow-up in 2 weeks if symptoms do not subside."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || clinicalNotes.trim().length < 3}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Saving Consultation..." : "Save & Complete Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
