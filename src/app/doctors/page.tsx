import Link from "next/link";
import { prisma } from "@/database/prisma";
import { getCurrentUser } from "@/auth/session";

export const dynamic = "force-dynamic";

export default async function DoctorsDirectoryPage() {
  const user = await getCurrentUser();

  const rawDoctors = await prisma.doctor.findMany({
    where: { user: { isActive: true } },
    include: {
      user: { select: { name: true, email: true } },
      workingHours: { orderBy: { day: "asc" } },
    },
    orderBy: { specialization: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800 uppercase tracking-wider">
          Clinical Specialists
        </span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Find a Doctor &amp; Specialist</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore our certified healthcare professionals across all clinical disciplines.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rawDoctors.map((doc) => (
          <div
            key={doc.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{doc.user.name}</h2>
                  <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 mt-1">
                    {doc.specialization}
                  </span>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700">
                  Dr
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {doc.bio || "Certified medical practitioner dedicated to exceptional patient care and precision diagnostic treatment."}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-500">
                <div className="flex justify-between">
                  <span>Slot Duration:</span>
                  <strong className="text-slate-800">{doc.slotDurationMins} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span>Working Schedule:</span>
                  <strong className="text-slate-800">{doc.workingHours.length} days / week</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href={user ? "/patient/dashboard" : "/login?redirect=/patient/dashboard"}
                className="block w-full text-center rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-teal-700 transition"
              >
                Book Appointment →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
