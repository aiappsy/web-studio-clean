import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { byokManager } from '@/lib/byok-manager';

// Deployment Configuration Schema
export const DeploymentConfigSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  
  // Platform selection
  platform: z.enum(['vercel', 'netlify', 'coolify', 'github-pages', 'custom']),
  
  // Platform-specific configuration
  platformConfig: z.object({
    // Vercel
    vercelToken: z.string().optional(),
    vercelTeamId: z.string().optional(),
    projectName: z.string().optional(),
    
    // Netlify
    netlifyToken: z.string().optional(),
    siteId: z.string().optional(),
    
    // Coolify
    coolifyUrl: z.string().optional(),
    coolifyToken: z.string().optional(),
    dockerCompose: z.string().optional(),
    
    // GitHub Pages
    githubToken: z.string().optional(),
    repoOwner: z.string().optional(),
    repoName: z.string().optional(),
    branch: z.string().default('gh-pages'),
    
    // Custom
    customWebhook: z.string().optional(),
    customHeaders: z.record(z.string()).optional(),
  }),
  
  // Build configuration
  buildCommand: z.string().default('npm run build'),
  outputDirectory: z.string().default('dist'),
  environmentVariables: z.record(z.string()).default({}),
  
  // Domain configuration
  customDomain: z.string().optional(),
  sslEnabled: z.boolean().default(true),
  
  // Deployment settings
  autoDeploy: z.boolean().default(false),
  previewDeployments: z.boolean().default(true),
  
  // Metadata
  deploymentName: z.string(),
  description: z.string().optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// Deployment Status Schema
export const DeploymentStatusSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  
  status: z.enum(['pending', 'building', 'deploying', 'success', 'failed', 'cancelled']),
  progress: z.number().default(0),
  
  // Deployment details
  platform: z.string(),
  url: z.string().optional(),
  buildUrl: z.string().optional(),
  
  // Build information
  commitHash: z.string().optional(),
  branch: z.string().default('main'),
  buildLogs: z.string().optional(),
  
  // Error handling
  error: z.string().optional(),
  retryCount: z.number().default(0),
  
  // Timestamps
  createdAt: z.date().default(() => new Date()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

// Deployment Manager Class
export class DeploymentManager {
  async createDeployment(config: DeploymentConfig): Promise<DeploymentStatus> {
    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId: config.projectId,
        workspaceId: config.workspaceId,
        userId: config.userId,
        platform: config.platform,
        status: 'pending',
        settings: config,
        createdAt: new Date(),
      },
    });

    // Queue deployment job
    await prisma.jobQueue.create({
      data: {
        type: 'deployment',
        status: 'pending',
        data: {
          deploymentId: deployment.id,
          config,
        },
        priority: 8, // Higher priority than exports
        userId: config.userId,
        workspaceId: config.workspaceId,
        projectId: config.projectId,
      },
    });

    return deployment as DeploymentStatus;
  }

  async processDeployment(deploymentId: string): Promise<void> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: true,
      },
    });

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    try {
      // Update status to building
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'building',
          startedAt: new Date(),
          progress: 10,
        },
      });

      const config = deployment.settings as DeploymentConfig;
      
      // First, export the project
      const exportResult = await this.prepareProjectForDeployment(deployment.project);
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { progress: 40 },
      });

      // Deploy based on platform
      let deploymentResult;
      switch (config.platform) {
        case 'vercel':
          deploymentResult = await this.deployToVercel(exportResult, config);
          break;
        case 'netlify':
          deploymentResult = await this.deployToNetlify(exportResult, config);
          break;
        case 'coolify':
          deploymentResult = await this.deployToCoolify(exportResult, config);
          break;
        case 'github-pages':
          deploymentResult = await this.deployToGitHubPages(exportResult, config);
          break;
        case 'custom':
          deploymentResult = await this.deployToCustom(exportResult, config);
          break;
        default:
          throw new Error(`Unsupported deployment platform: ${config.platform}`);
      }

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'success',
          progress: 100,
          completedAt: new Date(),
          url: deploymentResult.url,
          buildUrl: deploymentResult.buildUrl,
          buildLogs: deploymentResult.logs,
        },
      });

    } catch (error) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  private async prepareProjectForDeployment(project: any): Promise<any> {
    // This would use the ExportManager to prepare files
    // For now, return a placeholder
    return {
      files: [],
      buildPath: '/tmp/build',
      size: 0,
    };
  }

  private async deployToVercel(exportResult: any, config: DeploymentConfig): Promise<{
    url: string;
    buildUrl?: string;
    logs: string;
  }> {
    const platformConfig = config.platformConfig;
    
    if (!platformConfig.vercelToken) {
      throw new Error('Vercel token is required');
    }

    try {
      // Create Vercel project
      const projectResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platformConfig.vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: platformConfig.projectName || `aiappsy-${Date.now()}`,
          framework: 'other',
        }),
      });

      if (!projectResponse.ok) {
        throw new Error(`Failed to create Vercel project: ${projectResponse.statusText}`);
      }

      const projectData = await projectResponse.json();
      
      // Deploy files
      const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platformConfig.vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name,
          files: exportResult.files,
          target: 'production',
        }),
      });

      if (!deployResponse.ok) {
        throw new Error(`Failed to deploy to Vercel: ${deployResponse.statusText}`);
      }

      const deployData = await deployResponse.json();

      return {
        url: deployData.url,
        buildUrl: deployData.inspectorUrl,
        logs: 'Successfully deployed to Vercel',
      };

    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deployToNetlify(exportResult: any, config: DeploymentConfig): Promise<{
    url: string;
    buildUrl?: string;
    logs: string;
  }> {
    const platformConfig = config.platformConfig;
    
    if (!platformConfig.netlifyToken) {
      throw new Error('Netlify token is required');
    }

    try {
      // Create or get site
      let siteId = platformConfig.siteId;
      if (!siteId) {
        const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${platformConfig.netlifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: config.deploymentName.toLowerCase().replace(/\s+/g, '-'),
          }),
        });

        if (!siteResponse.ok) {
          throw new Error(`Failed to create Netlify site: ${siteResponse.statusText}`);
        }

        const siteData = await siteResponse.json();
        siteId = siteData.site_id;
      }

      // Deploy files
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platformConfig.netlifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: exportResult.files,
          force: true,
        }),
      });

      if (!deployResponse.ok) {
        throw new Error(`Failed to deploy to Netlify: ${deployResponse.statusText}`);
      }

      const deployData = await deployResponse.json();

      return {
        url: deployData.deploy_ssl_url || deployData.deploy_url,
        logs: 'Successfully deployed to Netlify',
      };

    } catch (error) {
      throw new Error(`Netlify deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deployToCoolify(exportResult: any, config: DeploymentConfig): Promise<{
    url: string;
    buildUrl?: string;
    logs: string;
  }> {
    const platformConfig = config.platformConfig;
    
    if (!platformConfig.coolifyUrl || !platformConfig.coolifyToken) {
      throw new Error('Coolify URL and token are required');
    }

    try {
      // Create application
      const appResponse = await fetch(`${platformConfig.coolifyUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platformConfig.coolifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.deploymentName,
          type: 'static',
          repository: null,
          branch: 'main',
          buildCommand: config.buildCommand,
          publishDirectory: config.outputDirectory,
        }),
      });

      if (!appResponse.ok) {
        throw new Error(`Failed to create Coolify application: ${appResponse.statusText}`);
      }

      const appData = await appResponse.json();

      // Deploy application
      const deployResponse = await fetch(`${platformConfig.coolifyUrl}/api/v1/applications/${appData.id}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platformConfig.coolifyToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!deployResponse.ok) {
        throw new Error(`Failed to deploy to Coolify: ${deployResponse.statusText}`);
      }

      return {
        url: appData.url || `${platformConfig.coolifyUrl}/app/${appData.id}`,
        logs: 'Successfully deployed to Coolify',
      };

    } catch (error) {
      throw new Error(`Coolify deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deployToGitHubPages(exportResult: any, config: DeploymentConfig): Promise<{
    url: string;
    buildUrl?: string;
    logs: string;
  }> {
    const platformConfig = config.platformConfig;
    
    if (!platformConfig.githubToken || !platformConfig.repoOwner || !platformConfig.repoName) {
      throw new Error('GitHub token, repo owner, and repo name are required');
    }

    try {
      // Create or update files in the repository
      const files = exportResult.files;
      const branch = platformConfig.branch || 'gh-pages';
      
      for (const file of files) {
        const content = Buffer.from(file.content).toString('base64');
        
        await fetch(`https://api.github.com/repos/${platformConfig.repoOwner}/${platformConfig.repoName}/contents/${file.path}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${platformConfig.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Deploy ${file.path} via AiAppsy`,
            content,
            branch,
          }),
        });
      }

      // Enable GitHub Pages if not already enabled
      await fetch(`https://api.github.com/repos/${platformConfig.repoOwner}/${platformConfig.repoName}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${platformConfig.githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch: branch,
            path: '/',
          },
        }),
      });

      return {
        url: `https://${platformConfig.repoOwner}.github.io/${platformConfig.repoName}`,
        logs: 'Successfully deployed to GitHub Pages',
      };

    } catch (error) {
      throw new Error(`GitHub Pages deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deployToCustom(exportResult: any, config: DeploymentConfig): Promise<{
    url: string;
    buildUrl?: string;
    logs: string;
  }> {
    const platformConfig = config.platformConfig;
    
    if (!platformConfig.customWebhook) {
      throw new Error('Custom webhook URL is required');
    }

    try {
      const response = await fetch(platformConfig.customWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...platformConfig.customHeaders,
        },
        body: JSON.stringify({
          deploymentName: config.deploymentName,
          files: exportResult.files,
          environment: config.environmentVariables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom deployment failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        url: result.url || 'Custom deployment completed',
        buildUrl: result.buildUrl,
        logs: result.message || 'Successfully deployed to custom platform',
      };

    } catch (error) {
      throw new Error(`Custom deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    return deployment as DeploymentStatus || null;
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    // Cancel any pending jobs
    await prisma.jobQueue.updateMany({
      where: {
        data: {
          path: ['deploymentId'],
          equals: deploymentId,
        },
        status: 'pending',
      },
      data: {
        status: 'cancelled',
      },
    });
  }
}

// Singleton instance
export const deploymentManager = new DeploymentManager();