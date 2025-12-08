import { z } from 'zod'

export function safeRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on certain errors
      if (error instanceof Error && (
        error.message.includes('401') || // Unauthorized
        error.message.includes('403') || // Forbidden
        error.message.includes('validation') || // Validation errors
        error.message.includes('invalid') // Invalid input
      )) {
        throw lastError
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError
      }

      // Calculate exponential backoff delay
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export function safeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    })
  ])
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return safeTimeout(promise, timeoutMs)
}

export function createSafeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data)
    
    if (!result.success) {
      const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }
    
    return result.data
  }
}

export function sanitizeForAI(input: string): string {
  return input
    // Remove potential prompt injection patterns
    .replace(/ignore\s+previous\s+instructions/gi, '[FILTERED]')
    .replace(/disregard\s+the\s+above/gi, '[FILTERED]')
    .replace(/system\s*:/gi, '[FILTERED]')
    .replace(/assistant\s*:/gi, '[FILTERED]')
    .replace(/\[INST\]/gi, '[FILTERED]')
    .replace(/\[\/INST\]/gi, '[FILTERED]')
    // Remove code injection attempts
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove excessive whitespace
    .trim()
}

export function extractErrorDetails(error: unknown): {
  message: string
  type: string
  code?: string
  details?: any
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      type: error.constructor.name,
      details: {
        stack: error.stack,
        name: error.name,
      }
    }
  }
  
  return {
    message: String(error),
    type: 'Unknown',
    details: error,
  }
}

export function isValidApiKey(key: string): boolean {
  // Basic API key validation
  return typeof key === 'string' && 
         key.length > 20 && 
         /^[a-zA-Z0-9\-_]+$/.test(key)
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***'
  
  const visible = key.substring(0, 4)
  const masked = '*'.repeat(key.length - 8)
  
  return visible + masked
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export function createPaginationOptions(page: number = 1, limit: number = 20) {
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

export function calculateCost(tokens: number, model: string): number {
  // Rough cost estimation based on model pricing
  const modelCosts: Record<string, number> = {
    'gpt-4o': 0.015, // $0.015 per 1K tokens
    'gpt-4o-mini': 0.0005,
    'claude-3-sonnet-20240229': 0.015,
    'claude-3-haiku-20240307': 0.00025,
    'deepseek/deepseek-r1-0528:free': 0,
    'deepseek/deepseek-r1-distill-llama-70b': 0.00014,
  }
  
  const costPer1k = modelCosts[model] || 0.01
  return (tokens / 1000) * costPer1k
}

export function validateModelSelection(model: string, availableModels: string[]): boolean {
  return availableModels.includes(model)
}

export function getOptimalModelForTask(task: 'generation' | 'editing' | 'analysis', availableModels: string[]): string {
  const taskModels = {
    generation: ['gpt-4o', 'claude-3-sonnet-20240229', 'deepseek/deepseek-r1-0528:free'],
    editing: ['gpt-4o', 'claude-3-sonnet-20240229', 'deepseek/deepseek-r1-0528:free'],
    analysis: ['gpt-4o-mini', 'claude-3-haiku-20240307', 'deepseek/deepseek-r1-distill-llama-70b'],
  }
  
  const models = taskModels[task] || taskModels.generation
  
  // Return the first available model
  for (const model of models) {
    if (availableModels.includes(model)) {
      return model
    }
  }
  
  return availableModels[0] || 'gpt-4o' // fallback
}

export function createSafeFormData(data: Record<string, any>): FormData {
  const formData = new FormData()
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  }
  
  return formData
}

export function parseUserAgent(userAgent: string): {
  browser: string
  os: string
  device: string
  isBot: boolean
} {
  const ua = userAgent.toLowerCase()
  
  // Detect browser
  let browser = 'unknown'
  if (ua.includes('chrome')) browser = 'chrome'
  else if (ua.includes('firefox')) browser = 'firefox'
  else if (ua.includes('safari')) browser = 'safari'
  else if (ua.includes('edge')) browser = 'edge'
  
  // Detect OS
  let os = 'unknown'
  if (ua.includes('windows')) os = 'windows'
  else if (ua.includes('mac')) os = 'macos'
  else if (ua.includes('linux')) os = 'linux'
  else if (ua.includes('android')) os = 'android'
  else if (ua.includes('ios')) os = 'ios'
  
  // Detect device
  let device = 'desktop'
  if (ua.includes('mobile')) device = 'mobile'
  else if (ua.includes('tablet')) device = 'tablet'
  
  // Detect bots
  const isBot = /bot|crawler|spider|scraper/i.test(ua)
  
  return { browser, os, device, isBot }
}