export interface DependencyHealth {
  status: 'healthy' | 'unhealthy' | 'not_configured';
  latency_ms?: number;
  details?: string;
}

export interface LivenessResponse {
  status: string;
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  dependencies: {
    postgresql: DependencyHealth;
    [key: string]: DependencyHealth;
  };
}

export interface HealthResponse {
  app_name: string;
  environment: string;
  version: string;
  status: 'operational' | 'degraded';
  timestamp: string;
  dependencies: {
    postgresql: DependencyHealth;
    [key: string]: DependencyHealth;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorDetail;
  isError: boolean;
  status: number;
}
