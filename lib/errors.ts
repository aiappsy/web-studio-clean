import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { env } from './env'

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, provider: string, details?: any) {
    super(message, 502, 'AI_PROVIDER_ERROR', { provider, ...details })
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details)
  }
}

// Universal error handler
export function handleError(error: unknown): NextResponse {
  console.error('Unhandled error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    )
  }

  // Custom application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
      { status: error.statusCode }
    )
  }

  // Generic errors
  const message = error instanceof Error ? error.message : 'Internal server error'
  const statusCode = error instanceof Error && 'statusCode' in error 
    ? (error as any).statusCode 
    : 500

  return NextResponse.json(
    {
      error: env.NODE_ENV === 'production' ? 'Internal server error' : message,
      code: 'INTERNAL_ERROR',
      ...(env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined }),
    },
    { status: statusCode }
  )
}

// Safe wrapper for API routes
export function safe<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Timeout wrapper
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = env.AI_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new AppError('Operation timed out', 408, 'TIMEOUT')), timeoutMs)
    })
  ])
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = env.AI_MAX_RETRIES,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on validation errors or rate limits
      if (error instanceof ValidationError || error instanceof RateLimitError) {
        throw error
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Input validation wrapper
export function withValidation<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  data: unknown
): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    throw new ValidationError('Invalid input', result.error.errors)
  }
  
  return result.data
}

// Request logging
export function logRequest(request: NextRequest, additional?: any) {
  const log = {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    timestamp: new Date().toISOString(),
    ...additional,
  }
  
  console.log('API Request:', JSON.stringify(log, null, 2))
}

// Response logging
export function logResponse(response: NextResponse, additional?: any) {
  const log = {
    status: response.status,
    timestamp: new Date().toISOString(),
    ...additional,
  }
  
  console.log('API Response:', JSON.stringify(log, null, 2))
}