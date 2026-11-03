/**
 * Thing Telemetry & Correlation ID Engine
 * Generates unique correlation IDs for request traceability and error tracing.
 */

export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
}

export interface TelemetryEvent {
  name: string;
  category: 'api' | 'navigation' | 'security' | 'error';
  properties?: Record<string, any>;
  timestamp: string;
  correlation_id?: string;
}

export function recordTelemetry(event: Omit<TelemetryEvent, 'timestamp'>): void {
  // Avoid logging sensitive tokens, keys, passwords
  const sanitizedProps = { ...event.properties };
  ['password', 'token', 'secret', 'credentials', 'api_key', 'authorization'].forEach((key) => {
    if (key in sanitizedProps) {
      sanitizedProps[key] = '[REDACTED]';
    }
  });

  const payload: TelemetryEvent = {
    ...event,
    properties: sanitizedProps,
    timestamp: new Date().toISOString(),
  };

  // Structured client logger for observability
  if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
    // Development console breadcrumb
    // eslint-disable-next-line no-console
    console.debug(`[Thing Telemetry] [${payload.category.toUpperCase()}] ${payload.name}`, payload);
  }
}
