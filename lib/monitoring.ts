import { z } from 'zod';

// Error Schema
export const ErrorSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  
  // Error details
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  code: z.string().optional(),
  
  // Error classification
  category: z.enum([
    'authentication',
    'authorization',
    'validation',
    'network',
    'database',
    'ai_service',
    'export',
    'deployment',
    'payment',
    'quota',
    'system',
    'unknown'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  
  // Context
  context: z.record(z.any()).optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  
  // Request info
  requestId: z.string().optional(),
  method: z.string().optional(),
  url: z.string().optional(),
  
  // Timestamps
  timestamp: z.date().default(() => new Date()),
  resolvedAt: z.date().optional(),
});

export type Error = z.infer<typeof ErrorSchema>;

// Performance Metrics Schema
export const PerformanceMetricsSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  
  // Request metrics
  requestId: z.string(),
  method: z.string(),
  url: z.string(),
  statusCode: z.number(),
  
  // Timing
  duration: z.number(), // milliseconds
  timestamp: z.date().default(() => new Date()),
  
  // Resource usage
  memoryUsage: z.number().optional(),
  cpuUsage: z.number().optional(),
  
  // AI metrics
  tokensUsed: z.number().optional(),
  model: z.string().optional(),
  
  // Database metrics
  queryCount: z.number().optional(),
  queryTime: z.number().optional(),
  
  // Additional context
  userAgent: z.string().optional(),
  ip: z.string().optional(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Health Check Schema
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date().default(() => new Date()),
  uptime: z.number(),
  version: z.string(),
  
  // Service status
  services: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    responseTime: z.number().optional(),
    error: z.string().optional(),
  })),
  
  // System metrics
  memory: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
  cpu: z.object({
    usage: z.number(),
  }),
  
  // Database status
  database: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    responseTime: z.number(),
    connections: z.number(),
  }),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// Monitoring Manager Class
export class MonitoringManager {
  private errors: Error[] = [];
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = Date.now();

  async captureError(error: Error | string, context?: any): Promise<void> {
    let errorData: Error;

    if (typeof error === 'string') {
      errorData = {
        id: this.generateId(),
        name: 'Error',
        message: error,
        category: 'unknown',
        severity: 'medium',
        timestamp: new Date(),
        context,
      };
    } else if (error instanceof Error) {
      errorData = {
        id: this.generateId(),
        name: error.name,
        message: error.message,
        stack: error.stack,
        category: this.categorizeError(error),
        severity: this.determineSeverity(error),
        timestamp: new Date(),
        context,
      };
    } else {
      errorData = {
        ...error,
        id: error.id || this.generateId(),
        timestamp: error.timestamp || new Date(),
      };
    }

    this.errors.push(errorData);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Monitoring Error]', errorData);
    }

    // Send to external monitoring service if configured
    await this.sendToMonitoringService(errorData);
  }

  async captureMetrics(metrics: Omit<PerformanceMetrics, 'id' | 'timestamp'>): Promise<void> {
    const metricData: PerformanceMetrics = {
      id: this.generateId(),
      timestamp: new Date(),
      ...metrics,
    };

    this.metrics.push(metricData);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send to monitoring service
    await this.sendMetricsToService(metricData);
  }

  async getHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check database
      const dbStatus = await this.checkDatabase();
      
      // Check external services
      const services = await this.checkExternalServices();
      
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // Determine overall status
      const overallStatus = this.determineOverallStatus(dbStatus, services, systemMetrics);
      
      return {
        status: overallStatus,
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services,
        memory: systemMetrics.memory,
        cpu: systemMetrics.cpu,
        database: dbStatus,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          monitoring: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        database: {
          status: 'unhealthy',
          responseTime: 0,
          connections: 0,
        },
      };
    }
  }

  getErrors(filters?: {
    userId?: string;
    workspaceId?: string;
    category?: string;
    severity?: string;
    limit?: number;
  }): Error[] {
    let filteredErrors = this.errors;

    if (filters?.userId) {
      filteredErrors = filteredErrors.filter(e => e.userId === filters.userId);
    }
    if (filters?.workspaceId) {
      filteredErrors = filteredErrors.filter(e => e.workspaceId === filters.workspaceId);
    }
    if (filters?.category) {
      filteredErrors = filteredErrors.filter(e => e.category === filters.category);
    }
    if (filters?.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    // Sort by timestamp (newest first)
    filteredErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredErrors = filteredErrors.slice(0, filters.limit);
    }

    return filteredErrors;
  }

  getMetrics(filters?: {
    userId?: string;
    workspaceId?: string;
    projectId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;

    if (filters?.userId) {
      filteredMetrics = filteredMetrics.filter(m => m.userId === filters.userId);
    }
    if (filters?.workspaceId) {
      filteredMetrics = filteredMetrics.filter(m => m.workspaceId === filters.workspaceId);
    }
    if (filters?.projectId) {
      filteredMetrics = filteredMetrics.filter(m => m.projectId === filters.projectId);
    }
    if (filters?.startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= filters.startTime!);
    }
    if (filters?.endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredMetrics = filteredMetrics.slice(0, filters.limit);
    }

    return filteredMetrics;
  }

  getErrorStats(timeframe?: 'hour' | 'day' | 'week' | 'month'): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    unresolved: number;
  } {
    const now = new Date();
    let startTime: Date;

    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(0);
    }

    const recentErrors = this.errors.filter(e => e.timestamp >= startTime);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let resolved = 0;
    let unresolved = 0;

    recentErrors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      
      if (error.resolvedAt) {
        resolved++;
      } else {
        unresolved++;
      }
    });

    return {
      total: recentErrors.length,
      byCategory,
      bySeverity,
      resolved,
      unresolved,
    };
  }

  private categorizeError(error: Error): Error['category'] {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authorization';
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return 'database';
    }
    if (message.includes('ai') || message.includes('openrouter') || message.includes('claude')) {
      return 'ai_service';
    }
    if (message.includes('export') || message.includes('zip') || message.includes('compile')) {
      return 'export';
    }
    if (message.includes('deploy') || message.includes('vercel') || message.includes('netlify')) {
      return 'deployment';
    }
    if (message.includes('quota') || message.includes('limit') || message.includes('usage')) {
      return 'quota';
    }

    return 'unknown';
  }

  private determineSeverity(error: Error): Error['severity'] {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'high';
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }

    return 'low';
  }

  private async sendToMonitoringService(error: Error): Promise<void> {
    // This would integrate with services like Sentry, LogRocket, etc.
    // For now, just store in memory
    if (process.env.SENTRY_DSN) {
      // Send to Sentry
      try {
        // Example Sentry integration
        // Sentry.captureException(error);
      } catch (e) {
        console.error('Failed to send error to monitoring service:', e);
      }
    }
  }

  private async sendMetricsToService(metrics: PerformanceMetrics): Promise<void> {
    // This would send metrics to services like DataDog, New Relic, etc.
    // For now, just store in memory
  }

  private async checkDatabase(): Promise<HealthCheck['database']> {
    const startTime = Date.now();
    
    try {
      // Simple database health check
      // In a real implementation, this would query the database
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        connections: 1, // This would be actual connection count
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        connections: 0,
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheck['services']> {
    const services: HealthCheck['services'] = {};

    // Check OpenRouter API
    try {
      const startTime = Date.now();
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      services.openrouter = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      services.openrouter = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return services;
  }

  private async getSystemMetrics(): Promise<{ memory: HealthCheck['memory']; cpu: HealthCheck['cpu'] }> {
    // In a real implementation, this would use process.memoryUsage() and system metrics
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        usage: 0, // This would require additional monitoring
      },
    };
  }

  private determineOverallStatus(
    dbStatus: HealthCheck['database'],
    services: HealthCheck['services'],
    systemMetrics: { memory: HealthCheck['memory']; cpu: HealthCheck['cpu'] }
  ): HealthCheck['status'] {
    const serviceStatuses = Object.values(services).map(s => s.status);
    const allHealthy = [
      dbStatus.status,
      ...serviceStatuses,
    ].every(status => status === 'healthy');

    const hasUnhealthy = [
      dbStatus.status,
      ...serviceStatuses,
    ].some(status => status === 'unhealthy');

    if (allHealthy && systemMetrics.memory.percentage < 90) {
      return 'healthy';
    }
    
    if (hasUnhealthy || systemMetrics.memory.percentage > 95) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const monitoringManager = new MonitoringManager();