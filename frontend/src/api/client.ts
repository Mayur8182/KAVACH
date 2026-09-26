import type {
  ApiResponse,
  HealthResponse,
  LivenessResponse,
  ReadinessResponse,
  IntentResponse,
  IntentSubmitRequest,
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const status = response.status;
      let responseBody: any = null;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        const errorDetail = responseBody?.error || {
          code: `HTTP_${status}`,
          message: responseBody?.message || response.statusText || 'Request failed',
          timestamp: new Date().toISOString(),
          details: responseBody?.details || responseBody,
        };

        return {
          isError: true,
          status,
          error: errorDetail,
        };
      }

      return {
        isError: false,
        status,
        data: responseBody as T,
      };
    } catch (networkError: any) {
      return {
        isError: true,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to backend at ${this.baseUrl}. Check if the server is running.`,
          timestamp: new Date().toISOString(),
          details: networkError?.message || String(networkError),
        },
      };
    }
  }

  /** Health & Readiness Probes */
  public async getLiveness(): Promise<ApiResponse<LivenessResponse>> {
    return this.request<LivenessResponse>('/health/live');
  }

  public async getReadiness(): Promise<ApiResponse<ReadinessResponse>> {
    return this.request<ReadinessResponse>('/health/ready');
  }

  public async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/health');
  }

  /** Intent Understanding Engine APIs */
  public async submitIntent(
    payload: IntentSubmitRequest,
    token?: string,
  ): Promise<ApiResponse<IntentResponse>> {
    return this.request<IntentResponse>(
      '/intents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async getIntent(
    intentId: string,
    token?: string,
  ): Promise<ApiResponse<IntentResponse>> {
    return this.request<IntentResponse>(`/intents/${intentId}`, {}, token);
  }

  public async listIntentsForProject(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<IntentResponse[]>> {
    return this.request<IntentResponse[]>(`/intents/project/${projectId}`, {}, token);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
