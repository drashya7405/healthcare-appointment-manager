import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Healthcare Appointment & Follow-up Manager",
  description: "Healthcare appointment management with secure role-based portals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
            <p>© {new Date().getFullYear()} Healthcare Appointment &amp; Follow-up Manager. All rights reserved.</p>
            <div className="flex items-center gap-4 font-medium">
              <Link href="/doctors" className="hover:text-teal-700 transition">
                Find Doctors
              </Link>
              <Link href="/privacy" className="hover:text-teal-700 transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-teal-700 transition">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
