const foundationItems = [
  ["Application", "Next.js App Router, TypeScript, Tailwind CSS"],
  ["Data layer", "PostgreSQL configuration, Prisma preliminary model"],
  ["Reliability", "Zod validation and a consistent API response envelope"],
  ["Planned next", "Authentication, scheduling, notifications, integrations"],
];

export function FoundationStatus() {
  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">Foundation checklist</h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {foundationItems.map(([label, detail]) => (
          <div key={label} className="border-l-2 border-teal-500 pl-4">
            <dt className="font-medium text-slate-900">{label}</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
