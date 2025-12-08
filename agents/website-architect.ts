import { BaseAgentClass, AgentResponse } from '../ai-pipeline';
import { z } from 'zod';

// Website Architect Agent - Responsible for planning and architecture
export class WebsiteArchitectAgent extends BaseAgentClass {
  protected getSystemPrompt(): string {
    return `You are a Website Architect AI. Your role is to analyze user requirements and create a comprehensive website architecture plan.

Your responsibilities:
1. Analyze user requirements and goals
2. Define website structure and navigation
3. Plan content sections and pages
4. Suggest appropriate technologies and features
5. Create a detailed sitemap and user flow

Always respond with structured JSON that includes:
- sitemap: Array of pages with their purpose
- features: List of recommended features
- technologies: Suggested tech stack
- contentStrategy: Content plan and recommendations
- userFlow: How users will navigate the site
- seoConsiderations: SEO recommendations

Focus on creating practical, achievable website architectures that align with the user's goals and technical capabilities.`;
  }

  async execute(input: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      this.addLog('Starting website architecture analysis', 'info');

      const prompt = this.buildPrompt(input);
      const schema = this.getResponseSchema();

      const response = await this.callAI(prompt, schema);
      const duration = Date.now() - startTime;

      // Validate and enhance the response
      const validatedArchitecture = this.validateArchitecture(response.content);

      this.updateMemory('architecture', validatedArchitecture);
      this.addLog('Website architecture completed successfully', 'success');

      return {
        success: true,
        data: validatedArchitecture,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration,
      };
    } catch (error) {
      this.addLog(`Architecture analysis failed: ${error}`, 'error');
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensUsed: 0,
        cost: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  private buildPrompt(input: any): string {
    return `Please create a comprehensive website architecture for the following requirements:

User Requirements:
${JSON.stringify(input.requirements || {}, null, 2)}

Target Audience:
${input.targetAudience || 'General audience'}

Business Goals:
${input.businessGoals || 'Not specified'}

Budget/Constraints:
${input.constraints || 'No specific constraints mentioned'}

Timeline:
${input.timeline || 'Not specified'}

Please provide a detailed architectural plan that will guide the website development process.`;
  }

  private getResponseSchema(): any {
    return {
      type: 'object',
      properties: {
        sitemap: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              page: { type: 'string' },
              purpose: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              estimatedContent: { type: 'string' },
            },
          },
        },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              feature: { type: 'string' },
              priority: { type: 'string', enum: ['essential', 'important', 'nice-to-have'] },
              complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
            },
          },
        },
        technologies: {
          type: 'object',
          properties: {
            frontend: { type: 'array', items: { type: 'string' } },
            backend: { type: 'array', items: { type: 'string' } },
            database: { type: 'array', items: { type: 'string' } },
            deployment: { type: 'array', items: { type: 'string' } },
          },
        },
        contentStrategy: {
          type: 'object',
          properties: {
            primaryContent: { type: 'array', items: { type: 'string' } },
            contentTypes: { type: 'array', items: { type: 'string' } },
            updateFrequency: { type: 'string' },
            contentSources: { type: 'array', items: { type: 'string' } },
          },
        },
        userFlow: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step: { type: 'number' },
              action: { type: 'string' },
              description: { type: 'string' },
              nextStep: { type: 'number' },
            },
          },
        },
        seoConsiderations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['sitemap', 'features', 'technologies', 'contentStrategy'],
    };
  }

  private validateArchitecture(architecture: any): any {
    // Validate and enhance the architecture
    if (!architecture.sitemap || !Array.isArray(architecture.sitemap)) {
      throw new Error('Invalid sitemap in architecture response');
    }

    // Ensure homepage exists
    const hasHomepage = architecture.sitemap.some((page: any) => 
      page.page.toLowerCase().includes('home') || page.page === '/'
    );
    
    if (!hasHomepage) {
      architecture.sitemap.unshift({
        page: 'Home',
        purpose: 'Main landing page and entry point',
        priority: 'high',
        estimatedContent: 'Hero section, key features, call-to-action',
      });
    }

    // Add metadata
    architecture.totalPages = architecture.sitemap.length;
    architecture.estimatedComplexity = this.calculateComplexity(architecture);
    architecture.estimatedTimeline = this.calculateTimeline(architecture);

    return architecture;
  }

  private calculateComplexity(architecture: any): string {
    const complexFeatures = architecture.features?.filter((f: any) => f.complexity === 'complex').length || 0;
    const totalFeatures = architecture.features?.length || 0;
    
    if (complexFeatures > totalFeatures * 0.5) return 'high';
    if (complexFeatures > totalFeatures * 0.25) return 'medium';
    return 'low';
  }

  private calculateTimeline(architecture: any): string {
    const pageCount = architecture.sitemap?.length || 0;
    const complexFeatures = architecture.features?.filter((f: any) => f.complexity === 'complex').length || 0;
    
    const baseWeeks = Math.max(2, Math.ceil(pageCount / 2));
    const complexityWeeks = complexFeatures * 2;
    
    return `${baseWeeks + complexityWeeks} weeks`;
  }
}