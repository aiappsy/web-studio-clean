import { OpenRouterMessage, openRouterClient } from '@/lib/openrouter'

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
  cost: number
}

export interface ModelPricing {
  model: string
  name: string
  provider: string
  costPer1kTokens: number
  maxTokens: number
  features: string[]
}

export class TokenTracker {
  private usage: Map<string, TokenUsage> = new Map()
  private models: Map<string, ModelPricing> = new Map()

  constructor() {
    this.initializeModelPricing()
  }

  private initializeModelPricing(): void {
    const models: ModelPricing[] = [
      {
        model: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        costPer1kTokens: 0.015,
        maxTokens: 128000,
        features: ['vision', 'function-calling', 'json-mode'],
      },
      {
        model: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        costPer1kTokens: 0.0005,
        maxTokens: 128000,
        features: ['vision', 'function-calling', 'json-mode'],
      },
      {
        model: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        costPer1kTokens: 0.015,
        maxTokens: 200000,
        features: ['vision', 'function-calling', 'long-context'],
      },
      {
        model: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        costPer1kTokens: 0.00025,
        maxTokens: 200000,
        features: ['vision', 'function-calling'],
      },
      {
        model: 'deepseek/deepseek-r1-0528:free',
        name: 'DeepSeek R1',
        provider: 'DeepSeek',
        costPer1kTokens: 0,
        maxTokens: 64000,
        features: ['reasoning', 'long-context'],
      },
      {
        model: 'deepseek/deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 Distill',
        provider: 'DeepSeek',
        costPer1kTokens: 0.00014,
        maxTokens: 32000,
        features: ['fast', 'cost-effective'],
      },
    ]

    models.forEach(model => {
      this.models.set(model.model, model)
    })
  }

  record(model: string, usage: { prompt: number; completion: number; total: number }): void {
    const modelPricing = this.models.get(model)
    if (!modelPricing) {
      console.warn(`Unknown model: ${model}`)
      return
    }

    const cost = (usage.total / 1000) * modelPricing.costPer1kTokens

    const current = this.usage.get(model) || {
      prompt: 0,
      completion: 0,
      total: 0,
      cost: 0,
    }

    // Update cumulative usage
    current.prompt += usage.prompt
    current.completion += usage.completion
    current.total += usage.total
    current.cost += cost

    this.usage.set(model, current)
  }

  getTotal(): TokenUsage {
    let total = {
      prompt: 0,
      completion: 0,
      total: 0,
      cost: 0,
    }

    for (const usage of this.usage.values()) {
      total.prompt += usage.prompt
      total.completion += usage.completion
      total.total += usage.total
      total.cost += usage.cost
    }

    return total
  }

  getByModel(model: string): TokenUsage | undefined {
    return this.usage.get(model)
  }

  getModelPricing(model: string): ModelPricing | undefined {
    return this.models.get(model)
  }

  getAllModels(): ModelPricing[] {
    return Array.from(this.models.values())
  }

  getUsageByTimeRange(startDate: Date, endDate: Date): Map<string, TokenUsage> {
    // This would integrate with a database in production
    // For now, return current usage
    const usageByTimeRange = new Map<string, TokenUsage>()
    
    for (const [model, usage] of this.usage.entries()) {
      usageByTimeRange.set(model, usage)
    }

    return usageByTimeRange
  }

  getCostBreakdown(): { model: string; cost: number; percentage: number }[] {
    const total = this.getTotal()
    const breakdown: { model: string; cost: number; percentage: number }[] = []

    for (const [model, usage] of this.usage.entries()) {
      if (usage.cost > 0) {
        breakdown.push({
          model,
          cost: usage.cost,
          percentage: total.cost > 0 ? (usage.cost / total.cost) * 100 : 0,
        })
      }
    }

    // Sort by cost descending
    return breakdown.sort((a, b) => b.cost - a.cost)
  }

  getTopModels(limit: number = 5): { model: string; usage: TokenUsage; pricing: ModelPricing }[] {
    const topModels: { model: string; usage: TokenUsage; pricing: ModelPricing }[] = []

    for (const [model, usage] of this.usage.entries()) {
      const pricing = this.models.get(model)
      if (pricing && usage.total > 0) {
        topModels.push({
          model,
          usage,
          pricing,
        })
      }
    }

    // Sort by total tokens used
    return topModels
      .sort((a, b) => b.usage.total - a.usage.total)
      .slice(0, limit)
  }

  estimateTokensForText(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4)
  }

  estimateCostForTokens(tokens: number, model: string): number {
    const pricing = this.models.get(model)
    if (!pricing) return 0

    return (tokens / 1000) * pricing.costPer1kTokens
  }

  getDailyAverage(): number {
    const total = this.getTotal()
    // Assume current usage is for today (in production, this would be time-based)
    return total.cost
  }

  getMonthlyProjection(): number {
    const dailyAverage = this.getDailyAverage()
    return dailyAverage * 30
  }

  reset(): void {
    this.usage.clear()
  }

  exportToJSON(): any {
    const exportData = {
      timestamp: new Date().toISOString(),
      total: this.getTotal(),
      byModel: Object.fromEntries(this.usage.entries()),
      models: this.getAllModels(),
      costBreakdown: this.getCostBreakdown(),
      topModels: this.getTopModels(),
    }

    return exportData
  }

  // Analytics methods
  getUsageStats(): {
    totalRequests: number
    totalTokens: number
    totalCost: number
    averageTokensPerRequest: number
    topModel: string
  } {
    const total = this.getTotal()
    const requestCount = this.usage.size > 0 ? 
      Array.from(this.usage.values()).reduce((sum, usage) => sum + 1, 0) : 0

    const topModels = this.getTopModels(1)
    const topModel = topModels.length > 0 ? topModels[0].model : 'none'

    return {
      totalRequests: requestCount,
      totalTokens: total.total,
      totalCost: total.cost,
      averageTokensPerRequest: requestCount > 0 ? Math.round(total.total / requestCount) : 0,
      topModel,
    }
  }

  checkBudgetLimit(budget: number): {
    isOverBudget: boolean
    currentSpend: number
    remainingBudget: number
    percentageUsed: number
  } {
    const total = this.getTotal()
    const isOverBudget = total.cost >= budget
    const remainingBudget = Math.max(0, budget - total.cost)
    const percentageUsed = budget > 0 ? (total.cost / budget) * 100 : 0

    return {
      isOverBudget,
      currentSpend: total.cost,
      remainingBudget,
      percentageUsed,
    }
  }
}

// Export singleton instance
export const tokenTracker = new TokenTracker()