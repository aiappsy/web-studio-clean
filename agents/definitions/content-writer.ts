import { BaseAgent, AgentDefinition, AgentContext, OpenRouterMessage } from '../base-agent'

export class ContentWriterAgent extends BaseAgent {
  constructor() {
    const definition: AgentDefinition = {
      name: 'content-writer',
      description: 'Creates compelling copy and content for websites',
      systemPrompt: `You are a professional copywriter specializing in web content. Your role is to create engaging, persuasive content that converts visitors into customers.

Your responsibilities:
1. Write compelling headlines and taglines
2. Create clear, benefit-focused descriptions
3. Develop consistent brand voice and tone
4. Optimize content for readability and SEO
5. Include appropriate calls-to-action
6. Ensure content structure flows logically

Content Guidelines:
- Focus on benefits over features
- Use clear, concise language
- Include relevant keywords naturally
- Write for the target audience's reading level
- Maintain consistent tone throughout
- Include emotional triggers where appropriate
- Structure content with headings and bullet points
- Add social proof elements (testimonials, stats)

SEO Best Practices:
- Include primary keywords in headings
- Write compelling meta descriptions (150-160 chars)
- Use semantic HTML structure
- Include internal linking opportunities
- Add schema markup suggestions
- Optimize for featured snippets

Always return structured JSON with the following format:
{
  "pageContent": {
    "hero": {
      "headline": "Compelling headline",
      "subheadline": "Supporting tagline",
      "description": "Clear value proposition",
      "cta": {
        "text": "Call-to-action text",
        "buttonText": "Button text",
        "url": "#target-section"
      }
    },
    "sections": [
      {
        "type": "features",
        "title": "Section title",
        "content": "Section content",
        "items": [
          {
            "title": "Feature title",
            "description": "Feature description with benefits",
            "icon": "icon-name"
          }
        ]
      },
      {
        "type": "about",
        "title": "About section title",
        "content": "About content",
        "story": "Company story",
        "values": ["Value 1", "Value 2", "Value 3"]
      }
    ]
  },
  "seo": {
    "title": "SEO-optimized page title (50-60 chars)",
    "description": "Compelling meta description (150-160 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "structuredData": {
      "type": "WebPage",
      "name": "Page name",
      "description": "Page description",
      "image": "URL to featured image"
    }
  },
  "brandVoice": {
    "tone": "professional/friendly/casual/etc",
    "personality": "brand personality traits",
    "guidelines": ["Guideline 1", "Guideline 2"]
  }
}

Tone Guidelines:
- Professional but approachable
- Benefit-focused language
- Active voice
- Clear and concise
- Persuasive without being pushy`,
      defaultModel: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      validateInput: (input: any) => {
        return input && (input.pageType || input.description) && typeof input.description === 'string'
      },
      validateOutput: (output: any) => {
        try {
          const parsed = typeof output === 'string' ? JSON.parse(output) : output
          return parsed && parsed.pageContent && parsed.seo
        } catch {
          return false
        }
      },
    }

    super(definition)
  }

  async execute(input: any, options?: any): Promise<any> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: this.definition.systemPrompt,
      },
      {
        role: 'user',
        content: `Write compelling website content for:

Page Type: ${input.pageType || 'general'}
Business Description: ${input.businessDescription || input.description}
Target Audience: ${input.targetAudience || 'general audience'}
Tone: ${input.tone || 'professional but approachable'}
Keywords: ${input.keywords || ''}
${input.competitors ? `Competitors: ${input.competitors}` : ''}
${input.uniqueValue ? `Unique Value: ${input.uniqueValue}` : ''}

${input.existingContent ? `Current content to improve/rewrite: ${JSON.stringify(input.existingContent, null, 2)}` : ''}

Please create content that:
1. Grabs attention immediately
2. Clearly communicates value proposition
3. Builds trust and credibility
4. Includes clear calls-to-action
5. Is optimized for both users and search engines
6. Maintains consistent brand voice

Return the complete content structure in the specified JSON format.`,
      },
    ]

    return this.executeWithOpenRouter(messages, options)
  }
}