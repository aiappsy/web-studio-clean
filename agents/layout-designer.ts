import { BaseAgentClass, AgentResponse } from '../ai-pipeline';
import { z } from 'zod';

// Layout Designer Agent - Responsible for creating website layouts and designs
export class LayoutDesignerAgent extends BaseAgentClass {
  protected getSystemPrompt(): string {
    return `You are a Layout Designer AI specializing in modern website design and user experience. Your role is to create beautiful, functional website layouts.

Your responsibilities:
1. Design responsive layouts for all devices
2. Create visual hierarchy and information architecture
3. Specify color schemes, typography, and spacing
4. Design component layouts and interactions
5. Ensure accessibility and usability best practices

Always respond with structured JSON that includes:
- layout: Grid system and layout structure
- designSystem: Colors, typography, spacing
- components: Detailed component designs
- responsive: Breakpoint-specific layouts
- accessibility: ARIA labels and accessibility features
- interactions: Hover states, transitions, animations

Focus on creating modern, clean designs that provide excellent user experience across all devices while following current design trends and best practices.`;
  }

  async execute(input: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      this.addLog('Starting layout design', 'info');

      const prompt = this.buildPrompt(input);
      const schema = this.getResponseSchema();

      const response = await this.callAI(prompt, schema);
      const duration = Date.now() - startTime;

      // Validate and enhance the design
      const validatedDesign = this.validateDesign(response.content);

      this.updateMemory('design', validatedDesign);
      this.addLog('Layout design completed successfully', 'success');

      return {
        success: true,
        data: validatedDesign,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration,
      };
    } catch (error) {
      this.addLog(`Layout design failed: ${error}`, 'error');
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
    const content = input.content || {};
    const designPreferences = input.designPreferences || {};

    return `Please create a comprehensive website layout design based on:

Architecture:
${JSON.stringify(architecture, null, 2)}

Content Structure:
${JSON.stringify(content.pages?.map((p: any) => ({ pageName: p.pageName, sections: p.sections.length })) || [], null, 2)}

Design Preferences:
- Style: ${designPreferences.style || 'Modern and clean'}
- Colors: ${designPreferences.colors || 'Professional blue palette'}
- Typography: ${designPreferences.typography || 'Clean sans-serif'}
- Industry: ${designPreferences.industry || 'Technology'}

Target Audience:
${input.targetAudience || 'Professional audience'}

Special Requirements:
${input.specialRequirements || 'None specified'}

Please create a responsive, accessible design that provides excellent user experience.`;
  }

  private getResponseSchema(): any {
    return {
      type: 'object',
      properties: {
        layout: {
          type: 'object',
          properties: {
            gridSystem: {
              type: 'object',
              properties: {
                columns: { type: 'number' },
                maxWidth: { type: 'string' },
                gutters: { type: 'string' },
              },
            },
            header: {
              type: 'object',
              properties: {
                layout: { type: 'string' },
                elements: { type: 'array', items: { type: 'string' } },
                height: { type: 'string' },
              },
            },
            footer: {
              type: 'object',
              properties: {
                layout: { type: 'string' },
                sections: { type: 'array', items: { type: 'string' } },
                height: { type: 'string' },
              },
            },
            main: {
              type: 'object',
              properties: {
                layout: { type: 'string' },
                sidebar: { type: 'boolean' },
                contentWidth: { type: 'string' },
              },
            },
          },
        },
        designSystem: {
          type: 'object',
          properties: {
            colors: {
              type: 'object',
              properties: {
                primary: { type: 'string' },
                secondary: { type: 'string' },
                accent: { type: 'string' },
                background: { type: 'string' },
                text: { type: 'string' },
                muted: { type: 'string' },
              },
            },
            typography: {
              type: 'object',
              properties: {
                fontFamily: { type: 'string' },
                headingFont: { type: 'string' },
                scale: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      size: { type: 'string' },
                      weight: { type: 'string' },
                      lineHeight: { type: 'string' },
                    },
                  },
                },
              },
            },
            spacing: {
              type: 'object',
              properties: {
                scale: { type: 'array', items: { type: 'string' } },
                containerPadding: { type: 'string' },
                sectionPadding: { type: 'string' },
              },
            },
            borderRadius: { type: 'string' },
            shadows: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              purpose: { type: 'string' },
              structure: {
                type: 'object',
                properties: {
                  html: { type: 'string' },
                  css: { type: 'string' },
                },
              },
              variations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        responsive: {
          type: 'object',
          properties: {
            breakpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  minWidth: { type: 'string' },
                  maxWidth: { type: 'string' },
                },
              },
            },
            adaptations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  breakpoint: { type: 'string' },
                  changes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        accessibility: {
          type: 'object',
          properties: {
            colorContrast: { type: 'string' },
            fontSize: { type: 'string' },
            focusIndicators: { type: 'boolean' },
            ariaLabels: { type: 'boolean' },
            keyboardNavigation: { type: 'boolean' },
            screenReaderSupport: { type: 'boolean' },
          },
        },
        interactions: {
          type: 'object',
          properties: {
            hover: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  element: { type: 'string' },
                  effect: { type: 'string' },
                },
              },
            },
            transitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  property: { type: 'string' },
                  duration: { type: 'string' },
                  easing: { type: 'string' },
                },
              },
            },
            animations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  trigger: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
          },
        },
      },
      required: ['layout', 'designSystem', 'components'],
    };
  }

  private validateDesign(design: any): any {
    // Validate and enhance the design
    if (!design.layout) {
      throw new Error('Invalid layout structure in design response');
    }

    // Ensure default values for layout
    design.layout.gridSystem = design.layout.gridSystem || {
      columns: 12,
      maxWidth: '1200px',
      gutters: '1rem',
    };

    // Ensure design system has all required properties
    design.designSystem = design.designSystem || {};
    design.designSystem.colors = design.designSystem.colors || {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937',
      muted: '#9ca3af',
    };

    design.designSystem.typography = design.designSystem.typography || {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Inter, sans-serif',
      scale: [
        { size: '3rem', weight: '700', lineHeight: '1.2' },
        { size: '2rem', weight: '600', lineHeight: '1.3' },
        { size: '1.5rem', weight: '500', lineHeight: '1.4' },
        { size: '1rem', weight: '400', lineHeight: '1.5' },
      ],
    };

    // Ensure components array exists
    design.components = design.components || [];
    
    // Add essential components if missing
    const essentialComponents = ['Button', 'Card', 'Navigation', 'Hero'];
    essentialComponents.forEach(compName => {
      if (!design.components.find((c: any) => c.name === compName)) {
        design.components.push({
          name: compName,
          purpose: `Essential ${compName} component`,
          structure: {
            html: `<div class="${compName.toLowerCase()}"></div>`,
            css: `.${compName.toLowerCase()} { /* styles */ }`,
          },
          variations: [],
        });
      }
    });

    // Ensure responsive breakpoints
    design.responsive = design.responsive || {};
    design.responsive.breakpoints = design.responsive.breakpoints || [
      { name: 'mobile', maxWidth: '767px' },
      { name: 'tablet', minWidth: '768px', maxWidth: '1023px' },
      { name: 'desktop', minWidth: '1024px' },
    ];

    // Add performance metrics
    design.performanceMetrics = {
      estimatedLoadTime: this.estimateLoadTime(design),
      accessibilityScore: this.calculateAccessibilityScore(design),
      responsiveScore: this.calculateResponsiveScore(design),
    };

    return design;
  }

  private estimateLoadTime(design: any): string {
    // Simple estimation based on complexity
    const componentCount = design.components?.length || 0;
    const hasAnimations = design.interactions?.animations?.length > 0;
    
    let baseTime = 1.5; // seconds
    baseTime += componentCount * 0.1;
    if (hasAnimations) baseTime += 0.5;
    
    return `${baseTime.toFixed(1)}s`;
  }

  private calculateAccessibilityScore(design: any): number {
    let score = 80; // Base score
    
    if (design.accessibility?.colorContrast === 'WCAG AA') score += 10;
    if (design.accessibility?.focusIndicators) score += 5;
    if (design.accessibility?.ariaLabels) score += 5;
    
    return Math.min(100, score);
  }

  private calculateResponsiveScore(design: any): number {
    let score = 70; // Base score
    
    const breakpointCount = design.responsive?.breakpoints?.length || 0;
    score += Math.min(20, breakpointCount * 5);
    
    if (design.responsive?.adaptations?.length > 0) score += 10;
    
    return Math.min(100, score);
  }
}