// lib/telemetry.ts

// Telemetry event structure
export interface TelemetryEvent {
  event: string;
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

// Telemetry utility class
export default class Telemetry {
  static track(event: string, properties?: Record<string, any>) {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', event, properties);
      return;
    }

    // Production logging (placeholder)
    const telemetryEvent: TelemetryEvent = {
      event,
      properties,
      timestamp: new Date(),
    };

    console.log('[Telemetry]', telemetryEvent);
  }

  static trackUserAction(action: string, userId?: string, properties?: Record<string, any>) {
    this.track(action, { ...properties, userId, type: 'user_action' });
  }

  static trackAPIUsage(endpoint: string, userId?: string, properties?: Record<string, any>) {
    this.track('api_usage', {
      endpoint,
      userId,
      ...properties,
      type: 'api_call',
    });
  }

  static trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
      type: 'error',
    });
  }

  // New method replacing TelemetryService.logAIExecution
  static logAIExecution(data: Record<string, any>) {
    this.track('ai_execution', data);
  }
}
