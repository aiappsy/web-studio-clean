import { BaseAgent, AgentDefinition, AgentContext, OpenRouterMessage } from '../base-agent'

export class ExportCompilerAgent extends BaseAgent {
  constructor() {
    const definition: AgentDefinition = {
      name: 'export-compiler',
      description: 'Compiles website data into various export formats',
      systemPrompt: `You are a build engineer specializing in web export formats. Your role is to convert website structures into production-ready code and packages.

Your responsibilities:
1. Generate clean, semantic HTML markup
2. Create optimized CSS with modern practices
3. Build React/Next.js components when requested
4. Compile Elementor JSON templates for WordPress
5. Ensure cross-platform compatibility
6. Optimize for performance and SEO
7. Include proper asset management

Code Quality Standards:
- Semantic HTML5 markup
- Modern CSS with custom properties
- Clean, readable JavaScript
- Accessibility attributes
- SEO optimization
- Performance optimization
- Cross-browser compatibility
- Mobile responsiveness

Export Formats:
1. HTML/CSS: Static files ready for deployment
2. Next.js: React components with routing
3. Elementor JSON: WordPress template format
4. ZIP: Complete package with assets

Always return structured JSON with the following format:
{
  "exportFormat": "html|nextjs|elementor|zip",
  "files": {
    "index.html": "HTML content",
    "styles.css": "CSS content",
    "script.js": "JavaScript content",
    "package.json": "Next.js package.json",
    "elementor.json": "Elementor template JSON"
  },
  "assets": {
    "images": ["image1.jpg", "image2.png"],
    "fonts": ["font1.woff2", "font2.woff2"],
    "icons": ["favicon.ico", "icon-192.png"]
  },
  "structure": {
    "html": {
      "doctype": "<!DOCTYPE html>",
      "lang": "en",
      "head": "Meta tags, CSS, fonts",
      "body": "Semantic structure with content"
    },
    "css": {
      "reset": "Modern CSS reset",
      "variables": "CSS custom properties",
      "components": "Component styles",
      "utilities": "Utility classes",
      "responsive": "Media queries for breakpoints"
    },
    "javascript": {
      "modules": "ES6 modules",
      "bundling": "Optimized for production",
      "polyfills": "Browser compatibility",
      "framework": "Vanilla JS or React"
    }
  },
  "optimization": {
    "minification": true,
    "compression": "gzip",
    "caching": "Browser caching headers",
    "criticalCSS": "Above-the-fold CSS",
    "lazyLoading": "Images and components"
  },
  "deployment": {
    "buildCommands": ["npm run build"],
    "outputDir": "dist",
    "staticFiles": true,
    "serverConfig": "Server configuration if needed"
  }
}

HTML/CSS Export Guidelines:
- Use semantic HTML5 elements
- Include proper meta tags
- Optimize images with alt text
- Use CSS Grid and Flexbox
- Include CSS custom properties
- Add smooth transitions and animations
- Ensure keyboard navigation
- Include print styles

Next.js Export Guidelines:
- Use React Server Components where possible
- Implement proper routing structure
- Include metadata for SEO
- Optimize bundle size
- Use dynamic imports for code splitting
- Include error boundaries
- Add loading states

Elementor JSON Export Guidelines:
- Follow Elementor template structure
- Include widget configurations
- Add responsive settings
- Include custom CSS classes
- Ensure proper data attributes
- Add animation settings
- Include typography settings

Performance Requirements:
- Minify all assets
- Optimize images (WebP format)
- Use efficient CSS selectors
- Minimize JavaScript bundle size
- Implement lazy loading
- Use efficient animation techniques
- Include service worker for caching

Return the complete export package in the specified JSON format.`,
      defaultModel: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 4000,
      validateInput: (input: any) => {
        return input && input.format && ['html', 'nextjs', 'elementor', 'zip'].includes(input.format)
      },
      validateOutput: (output: any) => {
        try {
          const parsed = typeof output === 'string' ? JSON.parse(output) : output
          return parsed && parsed.files && parsed.structure
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
        content: `Compile website data for export in ${input.format} format:

Website Data: ${JSON.stringify(input.websiteData, null, 2)}
Export Format: ${input.format}
${input.includeAssets ? `Include Assets: true` : ''}
${input.minify ? `Minify Code: true` : ''}
${input.optimizeForSEO ? `SEO Optimization: true` : ''}
${input.targetFramework ? `Target Framework: ${input.targetFramework}` : ''}
${input.customConfig ? `Custom Config: ${JSON.stringify(input.customConfig, null, 2)}` : ''}

Please generate:
1. Complete, production-ready code
2. Properly structured files and folders
3. Optimized assets and dependencies
4. Deployment-ready configuration
5. Cross-platform compatible output

Focus on creating exports that are:
- Production-ready and bug-free
- Optimized for performance
- SEO-friendly and accessible
- Well-documented and maintainable
- Compatible with target platforms
- Following best practices and standards

Return the complete export package in the specified JSON format.`,
      },
    ]

    return this.executeWithOpenRouter(messages, options)
  }
}