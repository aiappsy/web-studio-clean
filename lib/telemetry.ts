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

// Main Telemetry class
export default class Telemetry {
  static track(event: string, properties?: Record<string, any>) {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', event, properties);
      return;
    }

    // Production logging (placeholder for database or external collector)
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

  // AI execution tracking
  static logAIExecution(data: Record<string, any>) {
    this.track('ai_execution', data);
  }
}

/* ---------------------------------------------------------------------
   TelemetryService — Compatibility Layer
   Many older modules import TelemetryService instead of Telemetry.

   This keeps your system backward-compatible WITHOUT editing other files.
--------------------------------------------------------------------- */

export class TelemetryService {
  static log(event: string, properties?: Record<string, any>) {
    Telemetry.track(event, properties);
  }

  static logAIExecution(data: Record<string, any>) {
    Telemetry.logAIExecution(data);
  }

  static logError(error: Error, context?: Record<string, any>) {
    Telemetry.trackError(error, context);
  }

  static trackUserAction(action: string, userId?: string, properties?: Record<string, any>) {
    Telemetry.trackUserAction(action, userId, properties);
  }

  static trackAPIUsage(endpoint: string, userId?: string, properties?: Record<string, any>) {
    Telemetry.trackAPIUsage(endpoint, userId, properties);
  }
}
