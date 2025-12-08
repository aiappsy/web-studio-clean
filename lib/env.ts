import { z } from 'zod';

// Enhanced Environment Schema with BYOK support
export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // NextAuth.js
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // OpenRouter (Optional - system fallback)
  OPENROUTER_API_KEY: z.string().optional(),
  
  // Alternative AI Providers (Optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Storage (Optional - users can bring their own)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_NAME: z.string().optional(),
  
  // Cloudflare R2 (Alternative storage)
  CLOUDFLARE_R2_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  
  // Deployment platforms (Optional - users bring their own)
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  NETLIFY_TOKEN: z.string().optional(),
  NETLIFY_SITE_ID: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  
  // Monitoring (Optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  
  // Email (Optional)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  
  // Development
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_BASE_URL: z.string().default('http://localhost:3000/api'),
  WEBSOCKET_URL: z.string().default('ws://localhost:3001'),
  REDIS_URL: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // AI Configuration
  AI_MAX_TOKENS: z.coerce.number().default(4000),
  AI_TEMPERATURE: z.coerce.number().default(0.7),
  AI_TIMEOUT: z.coerce.number().default(30000),
  
  // Features
  ENABLE_AI_FEATURES: z.coerce.boolean().default(true),
  ENABLE_EXPORT_FEATURES: z.coerce.boolean().default(true),
  ENABLE_DEPLOYMENT_FEATURES: z.coerce.boolean().default(true),
  ENABLE_COLLABORATION: z.coerce.boolean().default(true),
  ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  STRUCTURED_LOGGING: z.coerce.boolean().default(true),
  
  // Security
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  ENABLE_CSP: z.coerce.boolean().default(true),
  
  // Background Processing
  JOB_QUEUE_CONCURRENCY: z.coerce.number().default(5),
  JOB_QUEUE_MAX_ATTEMPTS: z.coerce.number().default(3),
  JOB_QUEUE_DELAY_MS: z.coerce.number().default(1000),
  WORKER_TIMEOUT: z.coerce.number().default(300000),
  WORKER_MEMORY_LIMIT: z.coerce.number().default(512),
});

export type Env = z.infer<typeof envSchema>;