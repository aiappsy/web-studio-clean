
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];
const PUBLIC_ROUTES = ["/", "/api/public"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // Public routes always allowed
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/projects") || pathname.startsWith("/editor") || pathname.startsWith("/settings");

  // Read session cookie (NextAuth default)
  const token = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");

  // If visiting auth route and already logged in -> redirect to dashboard
  if (isAuthRoute && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If visiting dashboard routes and not logged in -> redirect to login
  if (isDashboardRoute && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/projects/:path*",
    "/editor/:path*",
    "/settings/:path*",
  ],
};
