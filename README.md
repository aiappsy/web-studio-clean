# AiAppsy WebStudio - Complete BYOK System

## 🎯 Overview

AiAppsy WebStudio is a comprehensive AI-powered website building platform that implements a **Bring Your Own Key (BYOK)** system for OpenRouter API integration. Users can bring their own OpenRouter API key to access multiple AI models and build professional websites through an intuitive pipeline system.

## 🚀 Key Features

### 🔐 BYOK (Bring Your Own Key) System
- **Secure API Key Management**: AES-256 encryption for all stored API keys
- **Usage Tracking**: Real-time monitoring of token usage and costs
- **Quota Management**: Set monthly limits on tokens and spending
- **Multi-Model Support**: Access to Claude, GPT-4, Gemini, and more via OpenRouter

### 🤖 AI Pipeline System
- **Modular Agents**: Specialized AI agents for architecture, content, layout, export, and deployment
- **Real-time Progress**: Live pipeline execution with step-by-step tracking
- **Error Recovery**: Automatic retry and self-healing mechanisms
- **Cost Optimization**: Smart model selection and token optimization

### 📊 Multi-Tenant Architecture
- **Workspaces**: Collaborative workspaces with role-based access
- **Member Management**: Invite team members with specific permissions
- **Resource Isolation**: Complete data separation between workspaces

### 🌐 Export & Deployment
- **Multiple Formats**: Export as ZIP, GitHub repo, or deploy directly
- **Platform Support**: Vercel, Netlify, Coolify, GitHub Pages, custom webhooks
- **Automated Builds**: CI/CD integration with real-time build logs

### 📈 Monitoring & Analytics
- **Performance Metrics**: Request tracking, response times, resource usage
- **Error Handling**: Comprehensive error capture and classification
- **Health Checks**: System health monitoring with service status

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (Neon)        │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • API Routes    │    │ • Users         │
│ • Editor        │    │ • AI Pipeline   │    │ • Workspaces    │
│ • BYOK Setup    │    │ • Export Mgmt   │    │ • Projects      │
│                 │    │ • Deployment    │    │ • BYOK Configs  │
└─────────────────┘    │ • Monitoring    │    │ • Usage Tracking│
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   External      │
                       │   Services      │
                       │                 │
                       │ • OpenRouter    │
                       │ • Vercel API    │
                       │ • Netlify API   │
                       │ • GitHub API    │
                       │ • Storage S3    │
                       └─────────────────┘
```

## 📋 Prerequisites

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key-here"
JWT_SECRET="your-jwt-secret-here-min-32-chars"

# Optional: System fallback API key
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-api-key-here"
```

### Optional Integrations

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Storage (AWS S3)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="aiappsy-exports"

# Monitoring (Sentry)
SENTRY_DSN="your-sentry-dsn"
```

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd aiappsy-webstudio
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your actual values
nano .env
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🎯 User Guide

### Getting Started

1. **Sign Up / Sign In**
   - Use email/password or OAuth (Google/GitHub)
   - Create your account and workspace

2. **Set Up BYOK**
   - Navigate to Settings → API Keys
   - Enter your OpenRouter API key
   - Set usage limits and preferences

3. **Create First Project**
   - Go to Dashboard → New Project
   - Enter project requirements
   - Run the AI pipeline

### Using the AI Pipeline

The AI pipeline consists of 5 specialized agents:

1. **Website Architect**
   - Analyzes requirements
   - Creates sitemap and structure
   - Plans features and technologies

2. **Content Writer**
   - Generates website copy
   - Creates SEO metadata
   - Establishes brand voice

3. **Layout Designer**
   - Designs visual layout
   - Creates color schemes and typography
   - Ensures responsive design

4. **Export Compiler**
   - Compiles website files
   - Optimizes assets
   - Creates deployment package

5. **Deployment Agent**
   - Deploys to selected platform
   - Configures domains and SSL
   - Monitors deployment status

### Export Options

- **ZIP Download**: Download complete website as ZIP file
- **GitHub Push**: Push to GitHub repository
- **Vercel Deploy**: Deploy directly to Vercel
- **Netlify Deploy**: Deploy to Netlify
- **Coolify Deploy**: Deploy to Coolify instance

## 🔧 API Documentation

### Authentication

All API routes require authentication except `/api/auth/*` endpoints.

```typescript
// Example authenticated request
const response = await fetch('/api/projects', {
  headers: {
    'Authorization': `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Key Endpoints

#### BYOK Management

```typescript
// Get BYOK configuration
GET /api/byok/config

// Save/update BYOK configuration
POST /api/byok/config
{
  "openrouterApiKey": "sk-or-v1-...",
  "keyName": "My API Key",
  "monthlyTokenLimit": 50000,
  "costLimit": 50
}

// Validate API key
POST /api/byok/validate
{
  "apiKey": "sk-or-v1-..."
}
```

#### Project Management

```typescript
// List projects
GET /api/projects

// Create project
POST /api/projects
{
  "name": "My Website",
  "description": "A beautiful website",
  "workspaceId": "workspace_123"
}

// Get project details
GET /api/projects/[id]

// Update project
PUT /api/projects/[id]
{
  "name": "Updated Name",
  "status": "published"
}
```

#### AI Pipeline

```typescript
// Run pipeline
POST /api/pipeline/run
{
  "projectId": "project_123",
  "input": {
    "requirements": "Build a portfolio website",
    "targetAudience": "Potential clients",
    "businessGoals": "Showcase work"
  }
}

// Get pipeline status
GET /api/pipeline/[id]/status

// Cancel pipeline
POST /api/pipeline/[id]/cancel
```

#### Export & Deployment

```typescript
// Create export
POST /api/export
{
  "projectId": "project_123",
  "format": "zip",
  "includeSource": true
}

// Get export status
GET /api/export/[id]

// Download export
GET /api/export/download/[filename]

// Create deployment
POST /api/deploy
{
  "projectId": "project_123",
  "platform": "vercel",
  "platformConfig": {
    "vercelToken": "token_123"
  }
}
```

## 🔒 Security Features

### API Key Security
- **Encryption**: All API keys encrypted with AES-256 at rest
- **Isolation**: Keys isolated per workspace and user
- **Audit Trail**: Complete usage tracking and logging

### Data Protection
- **Input Validation**: All inputs validated and sanitized
- **Rate Limiting**: Configurable rate limits per IP/user
- **CORS Protection**: Proper CORS configuration
- **CSRF Protection**: CSRF tokens for state-changing operations

### Access Control
- **Role-Based Access**: Owner, Admin, Member, Viewer roles
- **Workspace Isolation**: Complete data separation
- **JWT Authentication**: Secure token-based authentication

## 📊 Monitoring & Logging

### Performance Metrics
- Request response times
- Database query performance
- AI service response times
- Resource usage (memory, CPU)

### Error Tracking
- Automatic error capture
- Error classification and severity
- Stack traces and context
- Resolution tracking

### Health Checks
- Database connectivity
- External service status
- System resource monitoring
- API endpoint availability

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV="production"
   DATABASE_URL="your-production-neon-db"
   NEXTAUTH_SECRET="production-secret"
   ENCRYPTION_KEY="production-encryption-key"
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Deploy to Platform**

   **Vercel:**
   ```bash
   npx vercel --prod
   ```

   **Docker:**
   ```bash
   docker build -t aiappsy-webstudio .
   docker run -p 3000:3000 aiappsy-webstudio
   ```

   **Coolify:**
   - Connect repository
   - Set environment variables
   - Deploy with Docker Compose

### Docker Configuration

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── editor/            # Project editor
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility libraries
│   ├── byok.ts          # BYOK management
│   ├── auth.ts          # Authentication
│   ├── ai-pipeline.ts   # AI pipeline system
│   ├── export-manager.ts # Export system
│   ├── deployment-manager.ts # Deployment system
│   └── monitoring.ts    # Monitoring system
├── agents/               # AI agent implementations
└── hooks/               # React hooks
```

### Adding New AI Agents

1. Create agent class extending `BaseAgentClass`
2. Implement `execute()` and `getSystemPrompt()` methods
3. Add to pipeline configuration
4. Update UI to show new step

Example:
```typescript
export class MyCustomAgent extends BaseAgentClass {
  protected getSystemPrompt(): string {
    return "You are a custom AI agent...";
  }

  async execute(input: any): Promise<AgentResponse> {
    // Implementation
  }
}
```

### Adding New Deployment Platforms

1. Add platform to `DeploymentConfigSchema`
2. Implement deployment method in `DeploymentManager`
3. Update UI with platform-specific configuration
4. Add platform icon and documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- Use TypeScript for all new code
- Follow ESLint configuration
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code documentation
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@aiappsy.com

## 🗺️ Roadmap

### Version 2.0
- [ ] Real-time collaboration
- [ ] Advanced AI model fine-tuning
- [ ] Custom component library
- [ ] Advanced analytics dashboard

### Version 2.1
- [ ] Mobile app companion
- [ ] Integration marketplace
- [ ] Advanced workflow automation
- [ ] Enterprise SSO

### Version 3.0
- [ ] Multi-language support
- [ ] Advanced AI agent training
- [ ] White-label solutions
- [ ] Advanced security features

---

**Built with ❤️ by the AiAppsy Team**