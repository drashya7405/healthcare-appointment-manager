import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Healthcare Appointment & Follow-up Manager",
  description: "Terms of Service for Healthcare Appointment & Follow-up Manager",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
            Terms &amp; Conditions
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 2026</p>
        </div>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Healthcare Appointment &amp; Follow-up Manager platform, you agree to comply with and be bound by these terms.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">2. Appointment Scheduling &amp; Cancellations</h2>
          <p>
            Patients may schedule appointments based on real-time doctor availability. Cancellations or rescheduling requests must be submitted through the portal.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">3. Clinical Information &amp; AI Summaries</h2>
          <p>
            AI-generated briefings and patient-friendly summaries are supplementary tools intended to assist clinical communication and are not a substitute for formal diagnostic judgment.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">4. Google Calendar &amp; Third-Party Services</h2>
          <p>
            Use of integrated third-party services such as Google Calendar is governed by the respective provider policies. You may disconnect integration at any time.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-teal-700 hover:text-teal-800">
            ← Return to Homepage
          </Link>
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-800">
            Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  );
}
