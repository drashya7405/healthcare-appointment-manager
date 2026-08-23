import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Healthcare Appointment & Follow-up Manager",
  description: "Privacy Policy for Healthcare Appointment & Follow-up Manager",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
            Legal &amp; Compliance
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: August 2026</p>
        </div>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            The Healthcare Appointment &amp; Follow-up Manager collects patient information necessary to coordinate clinical appointments, including names, contact emails, phone numbers, self-reported symptoms, and medical history shared for pre-visit preparation.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">2. Google Calendar Integration</h2>
          <p>
            When practitioners or patients connect their Google Calendar, our application requests access strictly under the <code>https://www.googleapis.com/auth/calendar.events</code> scope. This access is utilized solely to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Create appointment events upon confirmed booking.</li>
            <li>Update event times when an appointment is rescheduled.</li>
            <li>Remove or cancel events when an appointment is cancelled.</li>
          </ul>
          <p>
            We do not read, process, or store private calendar events unrelated to clinic appointments booked through this platform. OAuth tokens are encrypted at rest.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">3. Artificial Intelligence &amp; Summarization</h2>
          <p>
            Patient-submitted symptoms and doctor clinical notes are processed using LLM APIs to generate structured pre-visit clinical briefings and patient-friendly post-visit summaries. AI interactions are stateless and isolated.
          </p>
        </section>

        <section className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">4. Data Security &amp; Retention</h2>
          <p>
            All data is transmitted via HTTPS and stored in managed PostgreSQL databases with encrypted password hashing (bcrypt) and strict role-based access control.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-teal-700 hover:text-teal-800">
            ← Return to Homepage
          </Link>
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-800">
            Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  );
}
