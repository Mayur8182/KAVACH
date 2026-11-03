import type {
  ApiResponse,
  HealthResponse,
  LivenessResponse,
  ReadinessResponse,
  IntentResponse,
  IntentSubmitRequest,
  SecurityBlueprint,
  SecurityRequirement,
  BlueprintCreateRequest,
  BlueprintComparisonResponse,
  SecurityScan,
  SecurityFinding,
  ScannerExecution,
  RequirementVerification,
  ScanTriggerRequest,
  ScannerHealthResponse,
  SecurityPolicy,
  SecurityPolicyVersion,
  PolicyCreateRequest,
  SecurityDecision,
  EvaluateDecisionRequest,
  SimulateDecisionResponse,
  SecurityApproval,
} from '../types/api';

const API_BASE_URL =
  ((import.meta as any)?.env?.VITE_API_BASE_URL as string) ||
  (typeof (globalThis as any).process !== 'undefined' ? (globalThis as any).process.env?.NEXT_PUBLIC_API_URL : undefined) ||
  'http://localhost:8000/api/v1';

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

  /** Security Blueprint Engine APIs */
  public async generateBlueprint(
    projectId: string,
    payload?: BlueprintCreateRequest,
    token?: string,
  ): Promise<ApiResponse<SecurityBlueprint>> {
    return this.request<SecurityBlueprint>(
      `/projects/${projectId}/blueprints`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      token,
    );
  }

  public async getBlueprint(
    blueprintId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityBlueprint>> {
    return this.request<SecurityBlueprint>(`/blueprints/${blueprintId}`, {}, token);
  }

  public async listBlueprintsForProject(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityBlueprint[]>> {
    return this.request<SecurityBlueprint[]>(`/projects/${projectId}/blueprints`, {}, token);
  }

  public async getBlueprintRequirements(
    blueprintId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityRequirement[]>> {
    return this.request<SecurityRequirement[]>(`/blueprints/${blueprintId}/requirements`, {}, token);
  }

  public async regenerateBlueprint(
    blueprintId: string,
    payload?: BlueprintCreateRequest,
    token?: string,
  ): Promise<ApiResponse<SecurityBlueprint>> {
    return this.request<SecurityBlueprint>(
      `/blueprints/${blueprintId}/regenerate`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      token,
    );
  }

  public async compareBlueprints(
    v1: string,
    v2: string,
    token?: string,
  ): Promise<ApiResponse<BlueprintComparisonResponse>> {
    return this.request<BlueprintComparisonResponse>(
      `/blueprints/compare?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`,
      {},
      token,
    );
  }

  /** Security Scanner & Verification APIs */
  public async getScannersHealth(): Promise<ApiResponse<ScannerHealthResponse[]>> {
    return this.request<ScannerHealthResponse[]>('/scans/tools/health');
  }

  public async triggerScan(
    projectId: string,
    payload?: ScanTriggerRequest,
    token?: string,
  ): Promise<ApiResponse<SecurityScan>> {
    return this.request<SecurityScan>(
      `/projects/${projectId}/scans`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      token,
    );
  }

  public async getScan(
    scanId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityScan>> {
    return this.request<SecurityScan>(`/scans/${scanId}`, {}, token);
  }

  public async listProjectScans(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityScan[]>> {
    return this.request<SecurityScan[]>(`/projects/${projectId}/scans`, {}, token);
  }

  public async getScanFindings(
    scanId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityFinding[]>> {
    return this.request<SecurityFinding[]>(`/scans/${scanId}/findings`, {}, token);
  }

  public async getScanExecutions(
    scanId: string,
    token?: string,
  ): Promise<ApiResponse<ScannerExecution[]>> {
    return this.request<ScannerExecution[]>(`/scans/${scanId}/executions`, {}, token);
  }

  public async getScanVerifications(
    scanId: string,
    token?: string,
  ): Promise<ApiResponse<RequirementVerification[]>> {
    return this.request<RequirementVerification[]>(`/scans/${scanId}/verifications`, {}, token);
  }

  /** Step 7 — Policy, Decision & Approval APIs */
  public async getPolicies(
    projectId: string,
    activeOnly: boolean = false,
    token?: string,
  ): Promise<ApiResponse<SecurityPolicy[]>> {
    return this.request<SecurityPolicy[]>(`/projects/${projectId}/policies?active_only=${activeOnly}`, {}, token);
  }

  public async getPolicy(
    policyId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.request<SecurityPolicy>(`/policies/${policyId}`, {}, token);
  }

  public async createPolicy(
    projectId: string,
    payload: PolicyCreateRequest,
    token?: string,
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.request<SecurityPolicy>(
      `/projects/${projectId}/policies`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async createPolicyVersion(
    policyId: string,
    payload: { definition: Record<string, any>; change_reason?: string },
    token?: string,
  ): Promise<ApiResponse<SecurityPolicyVersion>> {
    return this.request<SecurityPolicyVersion>(
      `/policies/${policyId}/versions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async activatePolicy(
    policyId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.request<SecurityPolicy>(
      `/policies/${policyId}/activate`,
      { method: 'POST' },
      token,
    );
  }

  public async disablePolicy(
    policyId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.request<SecurityPolicy>(
      `/policies/${policyId}/disable`,
      { method: 'POST' },
      token,
    );
  }

  public async evaluateDecision(
    projectId: string,
    payload: EvaluateDecisionRequest,
    token?: string,
  ): Promise<ApiResponse<SecurityDecision>> {
    return this.request<SecurityDecision>(
      `/projects/${projectId}/decisions/evaluate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async simulateDecision(
    projectId: string,
    payload: EvaluateDecisionRequest,
    token?: string,
  ): Promise<ApiResponse<SimulateDecisionResponse>> {
    return this.request<SimulateDecisionResponse>(
      `/projects/${projectId}/policies/simulate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async listDecisions(
    projectId: string,
    limit: number = 50,
    token?: string,
  ): Promise<ApiResponse<SecurityDecision[]>> {
    return this.request<SecurityDecision[]>(`/projects/${projectId}/decisions?limit=${limit}`, {}, token);
  }

  public async getDecision(
    decisionId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityDecision>> {
    return this.request<SecurityDecision>(`/decisions/${decisionId}`, {}, token);
  }

  public async approveDecision(
    approvalId: string,
    payload: { approval_notes?: string },
    token?: string,
  ): Promise<ApiResponse<SecurityApproval>> {
    return this.request<SecurityApproval>(
      `/approvals/${approvalId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async rejectDecision(
    approvalId: string,
    payload: { reason?: string; approval_notes?: string },
    token?: string,
  ): Promise<ApiResponse<SecurityApproval>> {
    return this.request<SecurityApproval>(
      `/approvals/${approvalId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  public async listPendingApprovals(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<SecurityApproval[]>> {
    return this.request<SecurityApproval[]>(`/projects/${projectId}/approvals/pending`, {}, token);
  }

  /** SBOM APIs */
  public async triggerSBOMGeneration(
    payload: import('../types/api').SBOMGenerateRequest,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMJob>> {
    return this.request<import('../types/api').SBOMJob>(
      '/sbom/generate',
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    );
  }

  public async getSBOMJob(
    jobId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMJob>> {
    return this.request<import('../types/api').SBOMJob>(`/sbom/jobs/${jobId}`, {}, token);
  }

  public async listSBOMJobs(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMJob[]>> {
    return this.request<import('../types/api').SBOMJob[]>(
      `/sbom/jobs?project_id=${projectId}`,
      {},
      token,
    );
  }

  public async listSBOMDocuments(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMDocument[]>> {
    return this.request<import('../types/api').SBOMDocument[]>(
      `/sbom?project_id=${projectId}`,
      {},
      token,
    );
  }

  public async getSBOMDocument(
    documentId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMDocument>> {
    return this.request<import('../types/api').SBOMDocument>(`/sbom/${documentId}`, {}, token);
  }

  public async getSBOMSummary(
    documentId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMSummary>> {
    return this.request<import('../types/api').SBOMSummary>(
      `/sbom/${documentId}/summary`,
      {},
      token,
    );
  }

  public async listSBOMComponents(
    documentId: string,
    params: {
      search?: string;
      component_type?: string;
      license_name?: string;
      risk_level?: string;
      component_status?: string;
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_dir?: string;
    } = {},
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMComponentPage>> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<import('../types/api').SBOMComponentPage>(
      `/sbom/${documentId}/components${query}`,
      {},
      token,
    );
  }

  public async getLatestSBOM(
    projectId: string,
    token?: string,
  ): Promise<ApiResponse<import('../types/api').SBOMDocument>> {
    return this.request<import('../types/api').SBOMDocument>(
      `/sbom/projects/${projectId}/latest`,
      {},
      token,
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
