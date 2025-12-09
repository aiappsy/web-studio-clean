import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { z } from 'zod'

// AES-256 encryption for BYOK API keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

export interface EncryptedData {
  data: string
  iv: string
  tag: string
}

export class SecurityManager {
  // Encrypt API keys using AES-256
  static encryptApiKey(apiKey: string): EncryptedData {
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)

    let encrypted = cipher.update(apiKey, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    }
  }

  // Decrypt API keys
  static decryptApiKey(encrypted: EncryptedData): string {
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(encrypted.iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'))

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // Hash API keys for identification
  static hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex')
  }

  // Validate API key format
  static validateApiKeyFormat(key: string, provider: string): boolean {
    const patterns = {
      openrouter: /^sk-or-v1-[a-zA-Z0-9]{32,}$/,
      anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]{95,}$/,
      deepseek: /^sk-[a-zA-Z0-9]{48}$/
    }

    return patterns[provider as keyof typeof patterns]?.test(key) || false
  }

  // Generate secure tokens
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }

  // Sanitize HTML content
  static sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  // Validate JSON schema
  static validateJsonSchema(data: any, schema: z.ZodSchema): boolean {
    try {
      schema.parse(data)
      return true
    } catch {
      return false
    }
  }

  // Repair malformed JSON
  static repairJson(jsonString: string): any {
    try {
      return JSON.parse(jsonString)
    } catch {
      let repaired = jsonString
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"')

      try {
        return JSON.parse(repaired)
      } catch {
        throw new Error('Unable to repair malformed JSON')
      }
    }
  }

  // Rate limiting key generator
  static generateRateLimitKey(identifier: string, window: string): string {
    return `rate_limit:${identifier}:${window}`
  }

  // Content Security Policy headers
  static getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://openrouter.ai https://api.openai.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }

  // CSRF token generation
  static generateCSRFToken(): string {
    return randomBytes(32).toString('base64')
  }

  // Validate CSRF token
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken
  }

  // Secure cookie options
  static getCookieOptions(isProduction: boolean = true): {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    maxAge: number
  } {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    }
  }
}

// Input validation schemas
export const securitySchemas = {
  apiKey: z.object({
    provider: z.enum(['openrouter', 'anthropic', 'deepseek']),
    apiKey: z.string().min(10),
    name: z.string().min(1).max(100)
  }),

  workspace: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
  }),

  project: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    workspaceId: z.string().uuid()
  }),

  aiRequest: z.object({
    model: z.string().min(1),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1)
    })),
    maxTokens: z.number().min(1).max(4000).optional(),
    temperature: z.number().min(0).max(2).optional()
  })
}

// Rate limiting configuration
export const rateLimitConfig = {
  windows: {
    perMinute: 60 * 1000,
    perHour: 60 * 60 * 1000,
    perDay: 24 * 60 * 60 * 1000
  },
  limits: {
    anonymous: {
      perMinute: 10,
      perHour: 100,
      perDay: 1000
    },
    authenticated: {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000
    },
    premium: {
      perMinute: 120,
      perHour: 5000,
      perDay: 50000
    }
  }
}

// Error classification for AI responses
export const errorClassifier = {
  isQuotaError: (error: any): boolean => {
    return error?.message?.toLowerCase().includes('quota') ||
      error?.message?.toLowerCase().includes('limit') ||
      error?.code === 'insufficient_quota'
  },

  isInvalidKeyError: (error: any): boolean => {
    return error?.message?.toLowerCase().includes('invalid') ||
      error?.message?.toLowerCase().includes('unauthorized') ||
      error?.code === 'invalid_api_key'
  },

  isModelUnavailableError: (error: any): boolean => {
    return error?.message?.toLowerCase().includes('model') &&
      error?.message?.toLowerCase().includes('not available')
  },

  isConnectionTimeoutError: (error: any): boolean => {
    return error?.message?.toLowerCase().includes('timeout') ||
      error?.code === 'ETIMEDOUT' ||
      error?.type === 'timeout'
  },

  isMalformedOutputError: (error: any): boolean => {
    return error?.message?.toLowerCase().includes('json') ||
      error?.message?.toLowerCase().includes('malformed') ||
      error?.type === 'json_error'
  }
}

// Request ID generator for tracing
export class RequestTracer {
  static generateRequestId(): string {
    return `req_${Date.now()}_${randomBytes(8).toString('hex')}`
  }

  static formatLogMessage(requestId: string, level: string, message: string, meta?: any): string {
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    }
    return JSON.stringify(logEntry)
  }
}

/* ---------------------------------------------------------
   MISSING EXPORTS ADDED BELOW (required by your app)
--------------------------------------------------------- */

// Very simple prompt sanitizer (expected by routes/api/ai)
export function sanitizePrompt(prompt: string): string {
  return prompt.replace(/<[^>]*>?/gm, '').trim()
}

// Very simple in-memory rate limiter for now
const requestBuckets = new Map<string, { count: number; ts: number }>()

export function rateLimit(identifier: string, windowMs = 60000, limit = 60): boolean {
  const now = Date.now()
  const bucket = requestBuckets.get(identifier)

  if (!bucket) {
    requestBuckets.set(identifier, { count: 1, ts: now })
    return true
  }

  // Reset window
  if (now - bucket.ts > windowMs) {
    requestBuckets.set(identifier, { count: 1, ts: now })
    return true
  }

  // Reject if over limit
  if (bucket.count >= limit) {
    return false
  }

  bucket.count++
  return true
}
