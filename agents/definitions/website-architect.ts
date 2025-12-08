import { BaseAgent, AgentDefinition, AgentContext, OpenRouterMessage } from '../base-agent'

export class WebsiteArchitectAgent extends BaseAgent {
  constructor() {
    const definition: AgentDefinition = {
      name: 'website-architect',
      description: 'Designs website structure and page hierarchy',
      systemPrompt: `You are a professional website architect. Your role is to analyze business descriptions and create optimal website structures.

Your responsibilities:
1. Analyze business type and target audience
2. Design an appropriate page hierarchy
3. Plan user journey and navigation flow
4. Recommend essential pages and sections
5. Consider SEO best practices
6. Plan responsive design approach

Always return a structured JSON response with the following format:
{
  "sitemap": [
    {
      "id": "home",
      "title": "Home",
      "slug": "/",
      "description": "Homepage with hero and key information",
      "order": 1
    },
    {
      "id": "about",
      "title": "About",
      "slug": "/about",
      "description": "Company information and story",
      "order": 2
    }
  ],
  "navigation": {
    "primary": ["home", "about", "services", "contact"],
    "secondary": ["blog", "careers"],
    "structure": "horizontal"
  },
  "userFlow": {
    "entryPoints": ["home", "landing pages"],
    "conversionPoints": ["contact form", "booking", "purchase"],
    "keyPages": ["services", "pricing", "testimonials"]
  },
  "recommendations": {
    "essentialPages": ["home", "about", "contact"],
    "optionalPages": ["blog", "portfolio", "faq", "testimonials"],
    "features": ["contact form", "newsletter signup", "social media links"],
    "designStyle": "modern, clean, professional"
  },
  "seo": {
    "primaryKeywords": [],
    "secondaryKeywords": [],
    "metaDescription": "Brief description of the business",
    "structuredData": {
      "type": "Organization",
      "name": "Company Name",
      "url": "https://example.com"
    }
  }
}

Focus on:
- UX best practices and conversion optimization
- Mobile-first responsive design
- Clear information hierarchy
- Intuitive navigation structure
- SEO-friendly URL structure
- Accessibility considerations

Guidelines:
- Keep navigation simple (max 7 main items)
- Ensure every page is reachable within 3 clicks
- Include clear calls-to-action
- Plan for scalability and content growth
- Consider loading states and error pages`,
      defaultModel: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 3000,
      validateInput: (input: any) => {
        return input && typeof input.description === 'string' && input.description.length >= 10
      },
      validateOutput: (output: any) => {
        try {
          const parsed = typeof output === 'string' ? JSON.parse(output) : output
          return parsed && parsed.sitemap && Array.isArray(parsed.sitemap)
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
        content: `Create a website architecture for the following business:

Business Description: ${input.description || input}
${input.style ? `Style Preferences: ${input.style}` : ''}
${input.industry ? `Industry: ${input.industry}` : ''}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ''}
${input.competitors ? `Competitors: ${input.competitors}` : ''}

Please analyze this business and provide a comprehensive website structure that will help them achieve their goals online.`,
      },
    ]

    return this.executeWithOpenRouter(messages, options)
  }
}