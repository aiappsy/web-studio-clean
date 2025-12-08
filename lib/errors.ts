// lib/errors.ts

import { NextResponse } from "next/server";
import { env } from "./env";

// --------------------------------------------------------
// 1. Timeout wrapper
// --------------------------------------------------------
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeout!);
  }
}

// --------------------------------------------------------
// 2. Retry wrapper
// --------------------------------------------------------
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 300
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, delay));
    return withRetry(fn, retries - 1, delay);
  }
}

// --------------------------------------------------------
// 3. Simple safety wrapper
// --------------------------------------------------------
export function safe(fn: Function) {
  try {
    return fn();
  } catch (err) {
    console.error("safe() wrapper caught error:", err);
    return null;
  }
}

// --------------------------------------------------------
// 4. Validation wrapper (no-op stub, customizable later)
// --------------------------------------------------------
export function withValidation<T>(schema: any, handler: Function) {
  return async function (req: any) {
    try {
      // If schema is provided, validate or ignore quietly
      if (schema && schema.parse) {
        schema.parse(await req.json());
      }
      return handler(req);
    } catch (err: any) {
      console.error("Validation error:", err);
      return NextResponse.json(
        { error: err?.message || "Validation failed" },
        { status: 400 }
      );
    }
  };
}

// --------------------------------------------------------
// 5. Request / Response log stubs
// --------------------------------------------------------
export function logRequest(info: any) {
  console.log("API Request:", info);
}

export function logResponse(info: any) {
  console.log("API Response:", info);
}

// --------------------------------------------------------
// 6. Security Headers
// --------------------------------------------------------
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "microphone=(), geolocation=()");
  return response;
}

// --------------------------------------------------------
// 7. API Error helper
// --------------------------------------------------------
export function apiError(message: string, status = 400) {
  const response = NextResponse.json(
    { success: false, error: message },
    { status }
  );
  return addSecurityHeaders(response);
}

// --------------------------------------------------------
// 8. Export env for compatibility
// --------------------------------------------------------
export { env };
