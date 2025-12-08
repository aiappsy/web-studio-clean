import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // AI Provider Keys
  OPENROUTER_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  
  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default('100'),
  
  // AI Configuration
  DEFAULT_AI_MODEL: z.string().default('deepseek/deepseek-r1-0528:free'),
  AI_TIMEOUT_MS: z.coerce.number().default('30000'),
  AI_MAX_RETRIES: z.coerce.number().default('3'),
  
  // Neon Database Configuration
  NEON_CONNECTION_TIMEOUT_MS: z.coerce.number().default('10000'),
  NEON_MAX_POOL_SIZE: z.coerce.number().default('10'),
  
  // Coolify Configuration
  COOLIFY_ENDPOINT: z.string().url().optional(),
  COOLIFY_TOKEN: z.string().optional(),
  
  // CORS Configuration
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  
  // Feature Flags
  ENABLE_BETA_FEATURES: z.coerce.boolean().default('false'),
  ENABLE_ANALYTICS: z.coerce.boolean().default('true'),
  ENABLE_MULTI_USER: z.coerce.boolean().default('false'),
  
  // Development helpers
  SKIP_AUTH: z.coerce.boolean().default('false'),
  MOCK_AI_RESPONSES: z.coerce.boolean().default('false'),
})

// Parse and validate environment
export const env = envSchema.parse(process.env)

// Export typed environment variables
export type Env = z.infer<typeof envSchema>

// Database configuration
export const dbConfig = {
  url: env.DATABASE_URL,
  timeout: env.NEON_CONNECTION_TIMEOUT_MS,
  maxPoolSize: env.NEON_MAX_POOL_SIZE,
}

// AI Provider configuration
export const aiConfig = {
  openrouter: {
    apiKey: env.OPENROUTER_API_KEY,
    models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'deepseek/deepseek-r1-0528:free', 'deepseek/deepseek-r1-distill-llama-70b'],
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  deepseek: {
    apiKey: env.DEEPSEEK_API_KEY,
    models: ['deepseek/deepseek-r1-0528:free', 'deepseek/deepseek-r1-distill-llama-70b'],
  },
  default: {
    model: env.DEFAULT_AI_MODEL,
    timeout: env.AI_TIMEOUT_MS,
    maxRetries: env.AI_MAX_RETRIES,
  },
}

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
}

// Application configuration
export const appConfig = {
  url: env.NEXT_PUBLIC_APP_URL,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
}

// Security configuration
export const securityConfig = {
  jwtSecret: env.JWT_SECRET,
  skipAuth: env.SKIP_AUTH,
}

// Feature flags
export const featureFlags = {
  betaFeatures: env.ENABLE_BETA_FEATURES,
  analytics: env.ENABLE_ANALYTICS,
  multiUser: env.ENABLE_MULTI_USER,
}

// Development configuration
export const devConfig = {
  mockAIResponses: env.MOCK_AI_RESPONSES,
}

// CORS configuration
export const corsConfig = {
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
}

// Validation helpers
export function validateApiKey(key: string | undefined, provider: string): boolean {
  if (!key) return false
  
  const minLengths: Record<string, number> = {
    openrouter: 40,
    anthropic: 50,
    deepseek: 40,
  }
  
  return key.length >= (minLengths[provider] || 40)
}

export function validateDatabaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:'
  } catch {
    return false
  }
}

export function validateAppUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Environment-specific configurations
export const isDevelopment = appConfig.isDevelopment
export const isProduction = appConfig.isProduction
export const isTest = appConfig.isTest

// Helper to get environment-specific value
export function getEnvVar(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || ''
}

// Helper to check if required services are available
export function hasAIService(): boolean {
  return !!(aiConfig.openrouter.apiKey && aiConfig.anthropic.apiKey && aiConfig.deepseek.apiKey)
}

export function getAvailableAIProviders(): string[] {
  const providers: string[] = []
  
  if (aiConfig.openrouter.apiKey) providers.push('openrouter')
  if (aiConfig.anthropic.apiKey) providers.push('anthropic')
  if (aiConfig.deepseek.apiKey) providers.push('deepseek')
  
  return providers
}

export function isAIConfigured(): boolean {
  return getAvailableAIProviders().length > 0
}