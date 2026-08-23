import Link from "next/link";
import { getCurrentUser } from "@/auth/session";
import { getRoleDashboardUrl } from "@/auth/rbac";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-md flex-col justify-center px-4 py-12 text-center">
      <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xl">
          !
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Access Denied (403)</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have the required permissions or role to view this page.
        </p>

        {user && (
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 text-left">
            <div><span className="font-semibold">Logged in as:</span> {user.name} ({user.email})</div>
            <div className="mt-1"><span className="font-semibold">Your Role:</span> <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">{user.role}</span></div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {user ? (
            <Link
              href={getRoleDashboardUrl(user.role)}
              className="rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              Go to my {user.role.toLowerCase()} portal
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/"
            className="rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
