// lib/errors.ts

import { NextResponse } from "next/server";
import { env } from "./env";

/**
 * Add common security headers to all API responses.
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "microphone=(), geolocation=()");

  return response;
}

/**
 * Wrap errors for consistent API responses.
 */
export function apiError(message: string, status = 400) {
  const response = NextResponse.json({ success: false, error: message }, { status });
  return addSecurityHeaders(response);
}

export { env };
