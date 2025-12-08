import { env } from './env'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterCompletion {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    total_time?: number
  }
}

export interface OpenRouterOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
}

export interface OpenRouterError {
  error: {
    message: string
    type: string
    code: string
  }
}

export class OpenRouterClient {
  private apiKey: string
  private baseURL: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.OPENAI_API_KEY || ''
    this.baseURL = 'https://openrouter.ai/api/v1'
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.')
    }
  }

  async createChatCompletion(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<OpenRouterCompletion> {
    this.validateApiKey()

    const requestBody = {
      model: options.model || env.DEFAULT_AI_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4000,
      stream: options.stream ?? false,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stop: options.stop,
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData: OpenRouterError = await response.json()
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`)
    }

    return response.json()
  }

  async createStreamingCompletion(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<OpenRouterCompletion> {
    this.validateApiKey()

    const requestBody = {
      model: options.model || env.DEFAULT_AI_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4000,
      stream: true,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stop: options.stop,
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData: OpenRouterError = await response.json()
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let usage: any = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content
                fullContent += content
                if (onChunk) {
                  onChunk(content)
                }
              }
              
              if (parsed.usage) {
                usage = parsed.usage
              }
            } catch (e) {
              // Skip malformed JSON chunks
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Return a completion object for consistency
    return {
      id: crypto.randomUUID(),
      object: 'chat.completion',
      created: Date.now(),
      model: options.model || env.DEFAULT_AI_MODEL,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: fullContent,
        },
        finish_reason: 'stop',
      }],
      usage: usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    }
  }

  async getModels(): Promise<any[]> {
    this.validateApiKey()

    const response = await fetch(`${this.baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    return response.json()
  }

  async getUsage(): Promise<any> {
    this.validateApiKey()

    const response = await fetch(`${this.baseURL}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch usage: ${response.statusText}`)
    }

    return response.json()
  }

  // Model selection utilities
  static getModelInfo(model: string): { name: string; provider: string; costPer1kTokens?: number } {
    const modelMap: Record<string, { name: string; provider: string; costPer1kTokens?: number }> = {
      'gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', costPer1kTokens: 0.015 },
      'gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', costPer1kTokens: 0.0005 },
      'claude-3-sonnet-20240229': { name: 'Claude 3 Sonnet', provider: 'Anthropic', costPer1kTokens: 0.015 },
      'claude-3-haiku-20240307': { name: 'Claude 3 Haiku', provider: 'Anthropic', costPer1kTokens: 0.00025 },
      'deepseek/deepseek-r1-0528:free': { name: 'DeepSeek R1', provider: 'DeepSeek', costPer1kTokens: 0 },
      'deepseek/deepseek-r1-distill-llama-70b': { name: 'DeepSeek R1 Distill', provider: 'DeepSeek', costPer1kTokens: 0.00014 },
    }

    return modelMap[model] || { name: model, provider: 'Unknown' }
  }

  static getOptimalModel(task: 'generation' | 'editing' | 'analysis'): string {
    const taskModels = {
      generation: ['gpt-4o', 'claude-3-sonnet-20240229', 'deepseek/deepseek-r1-0528:free'],
      editing: ['gpt-4o', 'claude-3-sonnet-20240229', 'deepseek/deepseek-r1-0528:free'],
      analysis: ['gpt-4o-mini', 'claude-3-haiku-20240307', 'deepseek/deepseek-r1-distill-llama-70b'],
    }

    return taskModels[task]?.[0] || env.DEFAULT_AI_MODEL
  }
}

// Create singleton instance
export const openRouterClient = new OpenRouterClient()