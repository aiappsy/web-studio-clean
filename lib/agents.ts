import { z } from 'zod'
import ZAI from 'z-ai-web-dev-sdk'
import { withTimeout, withRetry, AIProviderError, logRequest } from './errors'
import { aiConfig } from './env'

// Agent definition interface
export interface AgentDefinition {
  name: string
  description: string
  system: string
  model: string
  temperature?: number
  maxTokens?: number
  onPreProcess?: (input: any) => any
  onPostProcess?: (output: any) => any
  provider?: 'openai' | 'anthropic' | 'deepseek'
}

// Agent execution context
export interface AgentContext {
  userId?: string
  projectId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

// Agent execution result
export interface AgentResult {
  success: boolean
  data?: any
  error?: string
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  latency: number
  model: string
  agent: string
}

// Token usage tracking
export class TokenTracker {
  private usage: Map<string, { prompt: number; completion: number; total: number }> = new Map()

  record(model: string, usage: { prompt: number; completion: number; total: number }) {
    const current = this.usage.get(model) || { prompt: 0, completion: 0, total: 0 }
    this.usage.set(model, {
      prompt: current.prompt + usage.prompt,
      completion: current.completion + usage.completion,
      total: current.total + usage.total,
    })
  }

  getTotal(): { prompt: number; completion: number; total: number } {
    let total = { prompt: 0, completion: 0, total: 0 }
    for (const usage of this.usage.values()) {
      total.prompt += usage.prompt
      total.completion += usage.completion
      total.total += usage.total
    }
    return total
  }

  getByModel(model: string): { prompt: number; completion: number; total: number } | undefined {
    return this.usage.get(model)
  }
}

// Centralized agent runner
export class AgentRunner {
  private tokenTracker = new TokenTracker()
  private zai: ZAI | null = null

  constructor() {
    this.initializeZAI()
  }

  private async initializeZAI() {
    try {
      this.zai = await ZAI.create()
    } catch (error) {
      console.error('Failed to initialize ZAI:', error)
    }
  }

  async runAgent(
    agent: AgentDefinition,
    input: any,
    context?: AgentContext
  ): Promise<AgentResult> {
    const startTime = Date.now()
    
    try {
      logRequest(
        new Request('https://api.aiappsy.com/agent', { method: 'POST' }),
        {
          agent: agent.name,
          model: agent.model,
          input: typeof input === 'string' ? input.substring(0, 100) : input,
          context,
        }
      )

      // Pre-processing
      let processedInput = input
      if (agent.onPreProcess) {
        processedInput = agent.onPreProcess(input)
      }

      // Execute with timeout and retry
      const result = await withTimeout(
        withRetry(async () => {
          if (!this.zai) {
            throw new AIProviderError('ZAI not initialized', 'system')
          }

          const completion = await this.zai.chat.completions.create({
            messages: [
              { role: 'system', content: agent.system },
              { role: 'user', content: typeof processedInput === 'string' ? processedInput : JSON.stringify(processedInput) }
            ],
            model: agent.model,
            temperature: agent.temperature ?? 0.7,
            max_tokens: agent.maxTokens ?? 4000,
          })

          return completion
        }),
        aiConfig.timeout
      )

      const content = result.choices[0]?.message?.content
      if (!content) {
        throw new AIProviderError('No content generated', agent.model)
      }

      // Post-processing
      let processedOutput = content
      if (agent.onPostProcess) {
        processedOutput = agent.onPostProcess(content)
      }

      // Track token usage
      const tokenUsage = result.usage ? {
        prompt: result.usage.prompt_tokens || 0,
        completion: result.usage.completion_tokens || 0,
        total: result.usage.total_tokens || 0,
      } : { prompt: 0, completion: 0, total: 0 }

      this.tokenTracker.record(agent.model, tokenUsage)

      const latency = Date.now() - startTime

      return {
        success: true,
        data: processedOutput,
        tokenUsage,
        latency,
        model: agent.model,
        agent: agent.name,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency,
        model: agent.model,
        agent: agent.name,
      }
    }
  }

  getTokenTracker(): TokenTracker {
    return this.tokenTracker
  }
}

// Website Architect Agent
export const WebsiteArchitectAgent: AgentDefinition = {
  name: 'Website Architect',
  description: 'Designs website structure and page hierarchy',
  system: `You are a professional website architect. Your role is to analyze business descriptions and create optimal website structures.

Your responsibilities:
1. Analyze the business type and target audience
2. Design an appropriate page hierarchy
3. Plan the user journey and navigation flow
4. Recommend essential pages and sections

Always return a structured JSON response with:
- sitemap: Array of pages with id, title, slug, description
- navigation: Recommended navigation structure
- userFlow: Key user journeys to consider

Focus on UX best practices and conversion optimization.`,
  model: aiConfig.default.model,
  temperature: 0.3,
  maxTokens: 2000,
}

// Content Writer Agent
export const ContentWriterAgent: AgentDefinition = {
  name: 'Content Writer',
  description: 'Creates compelling copy and content for websites',
  system: `You are a professional copywriter specializing in web content. Your role is to create engaging, persuasive content that converts.

Your responsibilities:
1. Write compelling headlines and taglines
2. Create clear, benefit-focused descriptions
3. Develop consistent brand voice
4. Optimize for readability and SEO

Always return structured JSON content with:
- hero: title, subtitle, description, callToAction
- sections: Array of content sections with type, title, content
- seo: meta title, description, keywords

Focus on benefits over features, use clear language, and maintain brand consistency.`,
  model: aiConfig.default.model,
  temperature: 0.7,
  maxTokens: 3000,
}

// Layout Designer Agent
export const LayoutDesignerAgent: AgentDefinition = {
  name: 'Layout Designer',
  description: 'Designs responsive layouts and visual hierarchy',
  system: `You are a UI/UX designer specializing in website layouts. Your role is to create visually appealing, functional layouts.

Your responsibilities:
1. Design responsive grid systems
2. Establish visual hierarchy
3. Plan component layouts
4. Ensure accessibility and usability

Always return structured JSON with:
- layout: Grid system and spacing
- components: Component hierarchy and structure
- responsive: Breakpoint-specific layouts
- accessibility: ARIA labels and semantic structure

Focus on modern design principles, mobile-first approach, and user experience.`,
  model: aiConfig.default.model,
  temperature: 0.2,
  maxTokens: 2500,
}

// Export Compiler Agent
export const ExportCompilerAgent: AgentDefinition = {
  name: 'Export Compiler',
  description: 'Compiles website data into various export formats',
  system: `You are a build engineer specializing in web export formats. Your role is to convert website structures into production-ready code.

Your responsibilities:
1. Generate clean, semantic HTML/CSS
2. Create React/Next.js components
3. Compile Elementor JSON templates
4. Ensure cross-platform compatibility

Always return structured JSON with:
- html: Complete HTML markup
- css: Optimized stylesheets
- js: Required JavaScript
- assets: Asset references and optimization

Focus on performance, SEO, and maintainability.`,
  model: aiConfig.default.model,
  temperature: 0.1,
  maxTokens: 4000,
}

// Deployment Agent
export const DeploymentAgent: AgentDefinition = {
  name: 'Deployment Agent',
  description: 'Handles deployment configurations and setup',
  system: `You are a DevOps engineer specializing in web deployments. Your role is to configure deployment settings for various platforms.

Your responsibilities:
1. Configure build processes
2. Set up environment variables
3. Plan deployment pipelines
4. Ensure security and performance

Always return structured JSON with:
- platform: Target deployment platform
- config: Platform-specific configuration
- env: Required environment variables
- pipeline: Build and deployment steps

Focus on security, scalability, and reliability.`,
  model: aiConfig.default.model,
  temperature: 0.1,
  maxTokens: 2000,
}

// Agent registry
export const AgentRegistry = {
  'website-architect': WebsiteArchitectAgent,
  'content-writer': ContentWriterAgent,
  'layout-designer': LayoutDesignerAgent,
  'export-compiler': ExportCompilerAgent,
  'deployment': DeploymentAgent,
}

// Global agent runner instance
export const agentRunner = new AgentRunner()