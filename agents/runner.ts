import { AgentContext, AgentResult } from './base-agent'
import { WebsiteArchitectAgent } from './definitions/website-architect'
import { ContentWriterAgent } from './definitions/content-writer'
import { LayoutDesignerAgent } from './definitions/layout-designer'
import { ExportCompilerAgent } from './definitions/export-compiler'
import { DeploymentAgent } from './definitions/deployment-agent'

export class AgentRunner {
  private agents: Map<string, any> = new Map()
  private executionHistory: Map<string, AgentResult[]> = new Map()

  constructor() {
    // Initialize all agents
    this.agents.set('website-architect', new WebsiteArchitectAgent())
    this.agents.set('content-writer', new ContentWriterAgent())
    this.agents.set('layout-designer', new LayoutDesignerAgent())
    this.agents.set('export-compiler', new ExportCompilerAgent())
    this.agents.set('deployment', new DeploymentAgent())
  }

  setContext(context: AgentContext): void {
    // Set context for all agents
    for (const agent of this.agents.values()) {
      agent.setContext(context)
    }
  }

  async runAgent(
    agentName: string,
    input: any,
    options?: any
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentName)
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`)
    }

    const executionId = crypto.randomUUID()
    const startTime = Date.now()

    try {
      console.log(`🤖 Starting agent execution: ${agentName}`, {
        executionId,
        input: typeof input === 'string' ? input.substring(0, 200) : input,
        options,
      })

      const result = await agent.execute(input, options)

      // Store in execution history
      if (!this.executionHistory.has(agentName)) {
        this.executionHistory.set(agentName, [])
      }
      this.executionHistory.get(agentName)!.push(result)

      console.log(`✅ Agent execution completed: ${agentName}`, {
        executionId,
        success: result.success,
        latency: result.latency,
        tokenUsage: result.tokenUsage,
      })

      return result

    } catch (error) {
      const errorResult: AgentResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
        model: 'unknown',
        agent: agentName,
        executionId,
      }

      // Store failed execution
      if (!this.executionHistory.has(agentName)) {
        this.executionHistory.set(agentName, [])
      }
      this.executionHistory.get(agentName)!.push(errorResult)

      console.error(`❌ Agent execution failed: ${agentName}`, {
        executionId,
        error: errorResult.error,
        latency: errorResult.latency,
      })

      return errorResult
    }
  }

  async runAgentPipeline(
    pipeline: Array<{
      agentName: string
      input: any
      options?: any
      dependsOn?: string[]
    }>
  ): Promise<{ success: boolean; results: AgentResult[]; errors: string[] }> {
    const results: AgentResult[] = []
    const errors: string[] = []
    const completedAgents = new Set<string>()

    for (const step of pipeline) {
      // Check dependencies
      if (step.dependsOn) {
        const missingDeps = step.dependsOn.filter(dep => !completedAgents.has(dep))
        if (missingDeps.length > 0) {
          const error = `Step '${step.agentName}' depends on: ${missingDeps.join(', ')}`
          errors.push(error)
          continue
        }
      }

      try {
        console.log(`🔄 Running pipeline step: ${step.agentName}`)
        const result = await this.runAgent(step.agentName, step.input, step.options)
        
        if (result.success) {
          results.push(result)
          completedAgents.add(step.agentName)
        } else {
          errors.push(`Agent '${step.agentName}' failed: ${result.error}`)
        }
      } catch (error) {
        const errorMsg = `Agent '${step.agentName}' threw error: ${error instanceof Error ? error.message : 'Unknown'}`
        errors.push(errorMsg)
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    }
  }

  getAgentHistory(agentName: string): AgentResult[] {
    return this.executionHistory.get(agentName) || []
  }

  getAllAgentHistory(): Map<string, AgentResult[]> {
    return new Map(this.executionHistory)
  }

  clearHistory(): void {
    this.executionHistory.clear()
  }

  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys())
  }

  getAgentInfo(agentName: string): any {
    const agent = this.agents.get(agentName)
    if (!agent) {
      return null
    }

    return {
      name: agentName,
      description: agent['definition']?.description || 'No description available',
      defaultModel: agent['definition']?.defaultModel || 'unknown',
      temperature: agent['definition']?.temperature,
      maxTokens: agent['definition']?.maxTokens,
    }
  }

  async runWebsiteGenerationPipeline(input: {
    description: string
    style?: string
    projectName?: string
    industry?: string
    targetAudience?: string
  }): Promise<any> {
    console.log('🚀 Starting complete website generation pipeline')

    // Step 1: Generate website architecture
    console.log('📐 Step 1: Generating website architecture...')
    const architectResult = await this.runAgent('website-architect', input)
    
    if (!architectResult.success) {
      throw new Error(`Website architecture generation failed: ${architectResult.error}`)
    }

    const architecture = architectResult.data

    // Step 2: Generate content for all pages
    console.log('✍️ Step 2: Generating content...')
    const contentResults = []
    
    for (const page of architecture.sitemap) {
      const contentInput = {
        pageType: page.id,
        businessDescription: input.description,
        targetAudience: input.targetAudience,
        tone: input.style,
        keywords: `${input.industry}, ${page.title}`,
      }
      
      const contentResult = await this.runAgent('content-writer', contentInput)
      
      if (!contentResult.success) {
        throw new Error(`Content generation failed for page '${page.title}': ${contentResult.error}`)
      }
      
      contentResults.push({
        pageId: page.id,
        pageTitle: page.title,
        content: contentResult.data,
      })
    }

    // Step 3: Generate layout system
    console.log('🎨 Step 3: Generating layout system...')
    const layoutInput = {
      websiteType: input.industry || 'business',
      businessDescription: input.description,
      style: input.style,
      colorScheme: input.colorScheme,
    }
    
    const layoutResult = await this.runAgent('layout-designer', layoutInput)
    
    if (!layoutResult.success) {
      throw new Error(`Layout generation failed: ${layoutResult.error}`)
    }

    // Combine all results
    const websiteData = {
      architecture,
      content: contentResults.reduce((acc, curr) => {
        acc[curr.pageId] = curr.content
        return acc
      }, {}),
      layout: layoutResult.data,
      metadata: {
        projectName: input.projectName,
        description: input.description,
        style: input.style,
        industry: input.industry,
        targetAudience: input.targetAudience,
        generatedAt: new Date().toISOString(),
      },
    }

    console.log('✅ Website generation pipeline completed successfully')
    return websiteData
  }

  async runExportPipeline(input: {
    websiteData: any
    format: string
    includeAssets?: boolean
    minify?: boolean
  }): Promise<any> {
    console.log(`📦 Starting export pipeline for format: ${input.format}`)

    const exportInput = {
      websiteData: input.websiteData,
      format: input.format,
      includeAssets: input.includeAssets,
      minify: input.minify,
    }

    const exportResult = await this.runAgent('export-compiler', exportInput)
    
    if (!exportResult.success) {
      throw new Error(`Export failed: ${exportResult.error}`)
    }

    console.log(`✅ Export pipeline completed for format: ${input.format}`)
    return exportResult.data
  }

  async runDeploymentPipeline(input: {
    websiteData: any
    platform: string
    environment?: string
    domain?: string
    customSettings?: any
  }): Promise<any> {
    console.log(`🚀 Starting deployment pipeline for platform: ${input.platform}`)

    const deploymentInput = {
      projectData: input.websiteData,
      platform: input.platform,
      environment: input.environment || 'production',
      domain: input.domain,
      customSettings: input.customSettings,
    }

    const deploymentResult = await this.runAgent('deployment', deploymentInput)
    
    if (!deploymentResult.success) {
      throw new Error(`Deployment failed: ${deploymentResult.error}`)
    }

    console.log(`✅ Deployment pipeline completed for platform: ${input.platform}`)
    return deploymentResult.data
  }
}

// Export singleton instance
export const agentRunner = new AgentRunner()