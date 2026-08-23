import Link from "next/link";
import { getCurrentUser } from "@/auth/session";
import { getRoleDashboardUrl } from "@/auth/rbac";
import { LogoutButton } from "@/components/logout-button";

export async function Navbar() {
  const user = await getCurrentUser();

  const roleColors: Record<string, string> = {
    PATIENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
    DOCTOR: "bg-blue-100 text-blue-800 border-blue-200",
    ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm shadow-sm">
              +
            </span>
            <span className="font-semibold text-slate-900 tracking-tight text-base sm:text-lg">
              HealthCare Manager
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/doctors" className="hover:text-teal-700 transition">
              Find Doctors
            </Link>
            {user && (
              <Link
                href={getRoleDashboardUrl(user.role)}
                className="hover:text-teal-700 transition font-bold text-teal-700"
              >
                My Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                <div className="text-[11px] text-slate-500">{user.email}</div>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  roleColors[user.role] || "bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                {user.role}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition"
              >
                Patient Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
