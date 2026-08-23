import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("healthcare_session");

  const isProtectedRoute =
    pathname.startsWith("/patient") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/admin");

  if (isProtectedRoute && !sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/patient/:path*",
    "/doctor/:path*",
    "/admin/:path*",
  ],
};
