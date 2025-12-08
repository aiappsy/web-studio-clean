import { z } from 'zod'

// Common schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export const UUIDSchema = z.string().uuid()

export const EmailSchema = z.string().email('Invalid email format')

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')

// Website Generation schemas
export const GenerateWebsiteSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  style: z.string().optional(),
  model: z.string().optional(),
  projectName: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  colorTheme: z.string().optional(),
})

export const EditPageSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  instruction: z.string().min(5, 'Instruction must be at least 5 characters').max(500, 'Instruction must be less than 500 characters'),
  currentContent: z.any().optional(),
  model: z.string().optional(),
})

// Export schemas
export const ExportProjectSchema = z.object({
  projectId: UUIDSchema,
  format: z.enum(['html', 'nextjs', 'elementor', 'zip'], {
    errorMap: () => ({ message: 'Format must be one of: html, nextjs, elementor, zip' })
  }),
  includeAssets: z.boolean().default(true),
  minify: z.boolean().default(true),
})

// Deployment schemas
export const DeployToCoolifySchema = z.object({
  projectId: UUIDSchema,
  coolifyToken: z.string().min(1, 'Coolify token is required'),
  coolifyEndpoint: z.string().url('Invalid Coolify endpoint URL'),
  domain: z.string().optional(),
  ssl: z.boolean().default(true),
  environmentVariables: z.record(z.string()).optional(),
})

export const DeployToGitHubSchema = z.object({
  projectId: UUIDSchema,
  repository: z.string().min(1, 'Repository is required'),
  branch: z.string().default('main'),
  token: z.string().min(1, 'GitHub token is required'),
  path: z.string().default('/'),
})

// User schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  password: PasswordSchema,
})

export const LoginUserSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: EmailSchema.optional(),
  currentPassword: z.string().optional(),
  newPassword: PasswordSchema.optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false
  }
  return true
}, {
  message: 'Current password is required when setting a new password',
  path: ['currentPassword']
})

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  templateId: UUIDSchema.optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  theme: z.any().optional(),
  settings: z.any().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

// Page schemas
export const CreatePageSchema = z.object({
  projectId: UUIDSchema,
  title: z.string().min(1, 'Page title is required').max(200, 'Page title must be less than 200 characters'),
  slug: z.string().min(1, 'Page slug is required').max(200, 'Page slug must be less than 200 characters'),
  content: z.any(),
  seoTitle: z.string().max(60, 'SEO title must be less than 60 characters').optional(),
  seoDescription: z.string().max(160, 'SEO description must be less than 160 characters').optional(),
  isPublished: z.boolean().default(false),
  order: z.number().min(0).default(0),
})

export const UpdatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().min(0).optional(),
})

// Template schemas
export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name must be less than 100 characters'),
  description: z.string().max(500, 'Template description must be less than 500 characters').optional(),
  category: z.string().min(1, 'Category is required'),
  industry: z.string().optional(),
  structure: z.any(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
})

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).optional(),
  industry: z.string().optional(),
  structure: z.any().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
})

// Settings schemas
export const OpenRouterSettingsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  modelId: z.string().min(1, 'Model ID is required'),
  modelName: z.string().min(1, 'Model name is required'),
})

export const NeonSettingsSchema = z.object({
  databaseUrl: z.string().url('Invalid database URL'),
  isEnabled: z.boolean().default(false),
})

export const GeneralSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  defaultLanguage: z.enum(['en', 'es', 'fr', 'de', 'zh']).optional(),
  autoSave: z.boolean().optional(),
  analytics: z.boolean().optional(),
  encryptProjects: z.boolean().optional(),
  shareAnalytics: z.boolean().optional(),
  betaFeatures: z.boolean().optional(),
})

// AI Agent schemas
export const AgentExecutionSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required'),
  input: z.any(),
  context: z.object({
    userId: UUIDSchema.optional(),
    projectId: UUIDSchema.optional(),
    sessionId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8000).optional(),
})

export const AgentTraceSchema = z.object({
  executionId: z.string().min(1, 'Execution ID is required'),
  agentName: z.string().min(1, 'Agent name is required'),
  step: z.enum(['pre-process', 'execution', 'post-process']),
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
  latency: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
})

// API Key schemas
export const CreateAPIKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100, 'Key name must be less than 100 characters'),
  provider: z.enum(['openai', 'anthropic', 'deepseek'], {
    errorMap: () => ({ message: 'Provider must be one of: openai, anthropic, deepseek' })
  }),
  key: z.string().min(1, 'API key is required'),
})

export const UpdateAPIKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

// Search schemas
export const SearchProjectsSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  ...PaginationSchema.shape,
})

export const SearchTemplatesSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  ...PaginationSchema.shape,
})

// File upload schemas
export const UploadFileSchema = z.object({
  file: z.any(),
  type: z.enum(['image', 'document', 'asset']),
  projectId: UUIDSchema.optional(),
})

// Webhook schemas
export const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum(['project.created', 'project.updated', 'project.deleted', 'deployment.started', 'deployment.success', 'deployment.failed'])),
  secret: z.string().min(1, 'Webhook secret is required').min(8, 'Webhook secret must be at least 8 characters'),
  isActive: z.boolean().default(true),
})

// Analytics schemas
export const GetAnalyticsSchema = z.object({
  userId: UUIDSchema.optional(),
  projectId: UUIDSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.enum(['ai_usage', 'projects', 'deployments', 'users'])).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
})

// Export types
export type GenerateWebsiteInput = z.infer<typeof GenerateWebsiteSchema>
export type EditPageInput = z.infer<typeof EditPageSchema>
export type ExportProjectInput = z.infer<typeof ExportProjectSchema>
export type DeployToCoolifyInput = z.infer<typeof DeployToCoolifySchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type LoginUserInput = z.infer<typeof LoginUserSchema>
export type CreateProjectInput = z.infer<typeof CreateProjectInput>
export type CreatePageInput = z.infer<typeof CreatePageSchema>
export type AgentExecutionInput = z.infer<typeof AgentExecutionSchema>

// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): T => {
  const result = schema.safeParse(input)
  if (!result.success) {
    const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
    throw new Error(`Validation failed: ${errorMessages}`)
  }
  return result.data
}

// Sanitization helpers
export const sanitizeString = (input: string, maxLength?: number): string => {
  if (typeof input !== 'string') return input
  
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove potential JS injection
    .replace(/on\w+\s*=/gi, '') // Remove potential event handlers
  
  if (maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

export const sanitizeHTML = (input: string): string => {
  if (typeof input !== 'string') return input
  
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=/gi, '')
}