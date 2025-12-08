import { BaseAgentClass, AgentResponse } from '../ai-pipeline';
import { z } from 'zod';

// Content Writer Agent - Responsible for generating website content
export class ContentWriterAgent extends BaseAgentClass {
  protected getSystemPrompt(): string {
    return `You are a Content Writer AI specializing in website copywriting. Your role is to create compelling, SEO-optimized content for websites.

Your responsibilities:
1. Write engaging headlines and copy
2. Create SEO-friendly meta descriptions and titles
3. Develop clear calls-to-action
4. Ensure consistent brand voice and tone
5. Optimize content for user experience and conversions

Always respond with structured JSON that includes:
- pages: Content for each page with sections
- seo: Meta titles, descriptions, and keywords
- brandVoice: Description of the established voice
- callsToAction: List of CTAs used throughout the site
- contentGuidelines: Style and tone guidelines

Focus on creating professional, persuasive content that drives user engagement and conversions while maintaining SEO best practices.`;
  }

  async execute(input: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      this.addLog('Starting content generation', 'info');

      const prompt = this.buildPrompt(input);
      const schema = this.getResponseSchema();

      const response = await this.callAI(prompt, schema);
      const duration = Date.now() - startTime;

      // Validate and enhance the content
      const validatedContent = this.validateContent(response.content);

      this.updateMemory('content', validatedContent);
      this.addLog('Content generation completed successfully', 'success');

      return {
        success: true,
        data: validatedContent,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration,
      };
    } catch (error) {
      this.addLog(`Content generation failed: ${error}`, 'error');
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
    const architecture = input.architecture || {};
    const brandInfo = input.brandInfo || {};
    const targetAudience = input.targetAudience || 'General audience';

    return `Please create comprehensive website content based on the following architecture:

Website Architecture:
${JSON.stringify(architecture, null, 2)}

Brand Information:
- Company Name: ${brandInfo.companyName || 'Not specified'}
- Industry: ${brandInfo.industry || 'Not specified'}
- Brand Values: ${brandInfo.values || 'Not specified'}
- Unique Selling Proposition: ${brandInfo.usp || 'Not specified'}

Target Audience:
${targetAudience}

Content Requirements:
${input.contentRequirements || 'Standard website content'}

Tone and Style:
${input.toneStyle || 'Professional and approachable'}

Please create engaging, SEO-optimized content for all pages in the sitemap.`;
  }

  private getResponseSchema(): any {
    return {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pageName: { type: 'string' },
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sectionType: { type: 'string' },
                    headline: { type: 'string' },
                    content: { type: 'string' },
                    subtext: { type: 'string' },
                    callToAction: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        seo: {
          type: 'object',
          properties: {
            globalKeywords: { type: 'array', items: { type: 'string' } },
            pageSEO: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  page: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  keywords: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        brandVoice: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            characteristics: { type: 'array', items: { type: 'string' } },
            doList: { type: 'array', items: { type: 'string' } },
            dontList: { type: 'array', items: { type: 'string' } },
          },
        },
        callsToAction: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              purpose: { type: 'string' },
              placement: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        contentGuidelines: {
          type: 'object',
          properties: {
            tone: { type: 'string' },
            style: { type: 'string' },
            readability: { type: 'string' },
            formatting: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['pages', 'seo', 'brandVoice'],
    };
  }

  private validateContent(content: any): any {
    // Validate and enhance the content
    if (!content.pages || !Array.isArray(content.pages)) {
      throw new Error('Invalid pages structure in content response');
    }

    // Ensure each page has required sections
    content.pages.forEach((page: any) => {
      if (!page.sections || !Array.isArray(page.sections)) {
        page.sections = [{
          sectionType: 'hero',
          headline: 'Welcome',
          content: 'Default content',
          subtext: 'Please update this section',
          callToAction: 'Learn More',
        }];
      }
    });

    // Add word counts and readability scores
    content.totalWordCount = this.calculateTotalWordCount(content);
    content.averageReadabilityScore = this.calculateReadabilityScore(content);

    // Ensure SEO data exists
    if (!content.seo) {
      content.seo = {
        globalKeywords: [],
        pageSEO: [],
      };
    }

    // Add SEO data for each page if missing
    content.pages.forEach((page: any, index: number) => {
      const existingSEO = content.seo.pageSEO?.find((seo: any) => seo.page === page.pageName);
      if (!existingSEO) {
        content.seo.pageSEO = content.seo.pageSEO || [];
        content.seo.pageSEO.push({
          page: page.pageName,
          title: `${page.pageName} | Your Company`,
          description: `Learn more about ${page.pageName} at Your Company`,
          keywords: [],
        });
      }
    });

    return content;
  }

  private calculateTotalWordCount(content: any): number {
    let totalWords = 0;
    content.pages?.forEach((page: any) => {
      page.sections?.forEach((section: any) => {
        if (section.content) {
          totalWords += section.content.split(/\s+/).length;
        }
        if (section.headline) {
          totalWords += section.headline.split(/\s+/).length;
        }
      });
    });
    return totalWords;
  }

  private calculateReadabilityScore(content: any): string {
    // Simple readability calculation based on average sentence length
    let totalSentences = 0;
    let totalWords = 0;

    content.pages?.forEach((page: any) => {
      page.sections?.forEach((section: any) => {
        if (section.content) {
          const sentences = section.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const words = section.content.split(/\s+/).length;
          totalSentences += sentences.length;
          totalWords += words;
        }
      });
    });

    if (totalSentences === 0) return 'Good';

    const avgWordsPerSentence = totalWords / totalSentences;

    if (avgWordsPerSentence < 15) return 'Very Easy';
    if (avgWordsPerSentence < 20) return 'Easy';
    if (avgWordsPerSentence < 25) return 'Fairly Easy';
    if (avgWordsPerSentence < 30) return 'Standard';
    return 'More Difficult';
  }
}