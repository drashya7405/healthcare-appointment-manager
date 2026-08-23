"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: "Admin",
      email: "admin@example.com",
      pass: "AdminPass123!",
      desc: "Manage doctors & platform",
      color: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
    },
    {
      role: "Doctor",
      email: "doctor.smith@example.com",
      pass: "DoctorPass123!",
      desc: "Cardiology, working hours",
      color: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      role: "Patient",
      email: "patient.doe@example.com",
      pass: "PatientPass123!",
      desc: "Bookings & medical profile",
      color: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
  ];

  function fillDemo(e: string, p: string) {
    setEmail(e);
    setPassword(p);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Invalid email or password.");
        return;
      }

      const destination = redirectParam || data.data.redirectUrl || "/";
      window.location.href = destination;
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Enter your credentials or choose a quick-fill demo account
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider text-center">
            Quick Development Accounts
          </p>
          <div className="grid gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc.email, acc.pass)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition cursor-pointer ${acc.color}`}
              >
                <div>
                  <span className="font-bold">{acc.role}:</span> {acc.email}
                  <div className="text-[11px] opacity-80">{acc.desc}</div>
                </div>
                <span className="text-[10px] uppercase font-semibold bg-white/70 px-2 py-0.5 rounded shadow-2xs">
                  Fill
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          New patient?{" "}
          <Link href="/register" className="font-medium text-teal-600 hover:text-teal-700 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
