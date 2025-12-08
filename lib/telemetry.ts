// Telemetry and monitoring utilities
export interface TelemetryEvent {
  event: string;
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

export class Telemetry {
  static track(event: string, properties?: Record<string, any>) {
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', event, properties);
      return;
    }

    // In production, you would send to your telemetry service
    // For now, we'll just log
    const telemetryEvent: TelemetryEvent = {
      event,
      properties,
      timestamp: new Date(),
    };

    console.log('[Telemetry]', telemetryEvent);
  }

  static trackUserAction(action: string, userId?: string, properties?: Record<string, any>) {
    this.track(action, {
      ...properties,
      userId,
      type: 'user_action',
    });
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
}

export default Telemetry;