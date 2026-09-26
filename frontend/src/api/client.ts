import type { ApiResponse, HealthResponse, LivenessResponse, ReadinessResponse } from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
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
        // Backend returned structured error or HTTP error
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
      // Catch real connection refused / network failures without faking data
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

  /** Checks process liveness (/health/live) */
  public async getLiveness(): Promise<ApiResponse<LivenessResponse>> {
    return this.request<LivenessResponse>('/health/live');
  }

  /** Checks infrastructure readiness (/health/ready) */
  public async getReadiness(): Promise<ApiResponse<ReadinessResponse>> {
    return this.request<ReadinessResponse>('/health/ready');
  }

  /** Retrieves aggregated platform operational metadata (/health) */
  public async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/health');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
