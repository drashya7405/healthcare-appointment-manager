"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CalendarStatus {
  connected: boolean;
  provider?: string;
  googleEmail?: string | null;
  status?: string;
  expiresAt?: string | null;
}

export function GoogleCalendarCard() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [actionBanner, setActionBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const googleCalendarParam = searchParams.get("google_calendar");
  const googleErrorParam = searchParams.get("google_error");

  const urlBanner =
    googleCalendarParam === "connected"
      ? { type: "success" as const, message: "Google Calendar successfully connected!" }
      : googleErrorParam
      ? {
          type: "error" as const,
          message: `Google Calendar connection error: ${decodeURIComponent(googleErrorParam)}`,
        }
      : null;

  const currentBanner = actionBanner || urlBanner;

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/google/status")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setStatus(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) return;

    try {
      setDisconnecting(true);
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setActionBanner({ type: "success", message: "Google Calendar disconnected." });
        setStatus({ connected: false, status: "DISCONNECTED" });
      } else {
        setActionBanner({ type: "error", message: json.error?.message || "Failed to disconnect." });
      }
    } catch (err) {
      setActionBanner({ type: "error", message: (err as Error).message });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold">
            <svg
              className="w-5 h-5 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Google Calendar Integration</h3>
            <p className="text-xs text-slate-500">
              Synchronize your patient consultations to Google Calendar in real-time.
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <span className="text-xs text-slate-400">Checking connection...</span>
          ) : status?.connected ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected {status.googleEmail ? `(${status.googleEmail})` : "✓"}
              </span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>

      {currentBanner && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs font-medium border ${
            currentBanner.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {currentBanner.message}
        </div>
      )}
    </div>
  );
}
