import { OpenRouterMessage } from '@/lib/openrouter'

export class MessageBuilder {
  private messages: OpenRouterMessage[] = []

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.messages.push({
        role: 'system',
        content: systemPrompt,
      })
    }
  }

  addUser(content: string): this {
    this.messages.push({
      role: 'user',
      content,
    })
    return this
  }

  addAssistant(content: string): this {
    this.messages.push({
      role: 'assistant',
      content,
    })
    return this
  }

  build(): OpenRouterMessage[] {
    return [...this.messages]
  }

  clear(): void {
    this.messages = []
  }

  getLength(): number {
    return this.messages.length
  }
}

export class PromptBuilder {
  private sections: string[] = []

  addSection(title: string, content: string): this {
    this.sections.push(`## ${title}\n\n${content}\n`)
    return this
  }

  addInstruction(instruction: string): this {
    this.sections.push(`${instruction}\n`)
    return this
  }

  addConstraint(constraint: string): this {
    this.sections.push(`Constraint: ${constraint}\n`)
    return this
  }

  addExample(example: string): this {
    this.sections.push(`Example:\n${example}\n`)
    return this
  }

  build(): string {
    return this.sections.join('\n')
  }

  clear(): void {
    this.sections = []
  }

  getLength(): number {
    return this.sections.length
  }
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use NLP libraries
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Remove common words and get unique
  const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
  const keywords = [...new Set(words.filter(word => !commonWords.has(word)))]
  
  return keywords.slice(0, 10) // Return top 10 keywords
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .join('-')
    .replace(/-+/g, '-')
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function extractJsonFromText(text: string): any {
  // Try to extract JSON from AI response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      return null
    }
  }
  
  // Try to find JSON between ```json and ```
  const codeBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch {
      return null
    }
  }
  
  return null
}

export function validateJsonStructure(data: any, requiredFields: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      return false
    }
  }
  
  return true
}

export function createErrorResponse(message: string, code?: string, details?: any) {
  return {
    success: false,
    error: message,
    code: code || 'UNKNOWN_ERROR',
    details,
    timestamp: new Date().toISOString(),
  }
}

export function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const f = Math.floor((bytes / Math.pow(k, i)) * 100) / 100
  const rounded = Math.round(bytes / Math.pow(k, i)) * 100 / 100
  
  return `${rounded} ${sizes[i]}`
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}