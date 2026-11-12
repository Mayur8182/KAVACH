/**
 * Thing Central API Client
 * Single authoritative network gateway to the FastAPI backend.
 * Implements Section 13: base URL, auth, headers, request ID, timeout, error normalization, retry policy.
 */

import { getAuthToken, clearAuthToken, redirectToLogin } from '@/lib/auth/token';
import { generateCorrelationId, recordTelemetry } from '@/lib/telemetry/correlation';
import { normalizeHttpError, normalizeNetworkError } from '@/lib/errors/normalizedError';
import { apiCache } from '@/lib/api/cache';
import type {
  ProviderCatalogItem,
  CentralResourceCapabilityItem,
  UpdateCapabilitiesPayload,
  CentralConnectPayload,
  IntegrationHealthResponse,
} from '@/types/api/integrations';
import type { Project, ProjectCreatePayload } from '@/types/api/projects';
import type { Organization } from '@/types/api/organizations';
import type { Environment } from '@/types/api/environments';
import type { UserProfile } from '@/types/api/auth';
import type {
  HomeOverviewResponse,
  SecurityStateResponse,
  AttentionListResponse,
  HomeCoverageResponse,
  HomeProductHealthResponse,
  HomeActivityResponse,
  HomeIncidentsResponse,
  HomeTrendsResponse,
} from '@/types/api/home';
import type {
  CloudOverviewResponse,
  CloudConnectionsResponse,
  CloudConnectionItem,
  ConnectProviderRequest,
  CloudAssetsResponse,
  CloudAssetDetailResponse,
  CloudFindingsResponse,
  CloudFindingDetailResponse,
  CloudIAMResponse,
  CloudNetworkResponse,
  CloudStorageResponse,
  CloudDatabaseResponse,
  CloudKubernetesResponse,
  CloudDockerResponse,
  CloudIaCResponse,
  CloudExposuresResponse,
  CloudAttackPathsResponse,
  CloudBlastRadiusResponse,
  CloudComplianceResponse,
  CloudRemediationResponse,
  CloudEvidenceResponse,
} from '@/types/api/cloud';
import type {
  AttackOverviewResponse,
  AttackAssetListResponse,
  CreateAttackAssetRequest,
  AttackAssetItem,
  AttackAssetDetailResponse,
  AttackApiEndpointListResponse,
  AttackApiEndpointDetailResponse,
  AttackDiscoveryRunListResponse,
  TriggerDiscoveryRequest,
  AttackDiscoveryRunItem,
  AttackDastRunListResponse,
  StartDastRunRequest,
  AttackDastRunItem,
  AttackPentestListResponse,
  CreatePentestRequest,
  AttackPentestItem,
  AttackPentestDetailResponse,
  AttackPathListResponse,
  AttackFindingListResponse,
  AttackFindingDetailResponse,
  RetestFindingResponse,
  AttackEvidenceListResponse,
  AttackEvidenceItemSchema,
  AttackScheduleListResponse,
  CreateScheduleRequest,
  AttackScheduleItem,
  AttackReportListResponse,
  CreateReportRequest,
  AttackReportItem,
  AttackPolicyListResponse,
  CreatePolicyRequest,
  AttackPolicyItem,
} from '@/types/api/attack';
import type {
  IaCSummaryResponse,
  IaCFindingsPageResponse,
  IaCFindingItem,
  TriggerIaCScanRequest,
  IaCScanJobResponse,
  IaCDriftOverviewResponse,
  IaCDriftResourcesPage,
  IaCDriftResourceItem,
  IaCDriftEventItem,
  IaCDriftConfigDTO,
  IaCBaselineStateDTO,
  IaCBaselineCompareRequest,
  IaCBaselineCompareResult,
  IaCRemediationPlanResponse,
  IaCApplyRemediationResponse,
  IaCDriftGlobalSettingsDTO,
  IaCIgnoredResourceItem,
  IaCScansListResponse,
  IaCFileItem,
  IaCFilesListResponse,
  IaCFileContentResponse,
  IaCPoliciesListResponse,
  IaCPolicyItem,
  UpdatePolicyStatusRequest,
  IaCComplianceResponse,
  IaCRemediationOverviewResponse,
  IaCConfigAnalysisOverviewResponse,
  IaCInventoryPageResponse,
  IaCMisconfigurationsPageResponse,
  IaCSecureConfigsPageResponse,
  IaCConfigDriftPageResponse,
  IaCBestPracticesResponse,
  IaCResourceAnalysisDetailResponse,
  IaCComparisonDiffResponse,
  IaCSecurityOverviewDashboardResponse,
  IaCEnvironmentOverviewResponse,
  IaCProviderOverviewResponse,
  IaCOverviewResourcesResponse,
  IaCCoverageResponse,
  IaCOverviewComplianceResponse,
  IaCRiskSummaryResponse,
  IaCRecentActivityResponse,
  IaCPoliciesQualityGatesOverviewResponse,
  IaCPoliciesCatalogResponse,
  IaCPolicyDetailResponse,
  CreatePolicyRequest as CreateIaCPolicyRequest,
  IaCQualityGatesListResponse,
  IaCQualityGateDetailResponse,
  CreateQualityGateRequest,
  AddQualityGateRuleRequest,
  IaCPolicyViolationsResponse,
  IaCPolicyExceptionsResponse,
  CreatePolicyExceptionRequest,
  IaCPolicyExceptionItem,
  IaCPoliciesSettings,
  IaCRulesOverviewResponse,
  IaCRulesListResponse,
  IaCRuleItem,
  IaCRuleDetailResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  ValidateRegoRequest,
  ValidateRegoResponse,
  IaCRulePackItem,
  IaCRulePacksListResponse,
  IaCTopRepoFindingsItem,
  IaCScansOverviewResponse,
  IaCScanHistoryRow,
  IaCScanHistoryResponse,
  IaCScheduledScanItem,
  IaCScheduledScansResponse,
  CreateScheduledScanRequest,
  TriggerOnDemandScanRequest,
  TriggerOnDemandScanResponse,
  IaCScanConfigurationsDTO,
  IaCComparisonSeverityDiff,
  IaCChangedResourceItem,
  IaCResultsComparisonResponse,
  IaCQueueScanItem,
  IaCScanQueueResponse,
  IaCScanGlobalSettings,
  IaCComplianceOverviewResponse,
  IaCComplianceFrameworkItem,
  IaCComplianceFrameworksResponse,
  CreateFrameworkRequest,
  IaCComplianceControlMappingItem,
  IaCComplianceControlsResponse,
  IaCControlDetailResponse,
  GenerateComplianceReportRequest,
  ComplianceReportGeneratedResponse,
  ComplianceReportHistoryResponse,
  IaCComplianceEvidenceItem,
  IaCComplianceEvidenceResponse,
  CreateEvidenceRequest,
  IaCComplianceExceptionItem,
  IaCComplianceExceptionsResponse,
  CreateComplianceExceptionRequest,
  IaCComplianceAuditLogItem,
  IaCComplianceAuditLogsResponse,
  IaCComplianceSettings,
  IaCDriftSuiteOverviewResponse,
  IaCDriftEnvironmentsResponse,
  IaCDriftEnvironmentItem,
  CreateDriftEnvironmentRequest,
  IaCDriftChangesResponse,
  IaCDriftResourceDetailResponse,
  IaCDriftRemediationResponse,
  ApplyDriftRemediationResponse,
  IaCDriftHistoryResponse,
  IaCDriftSettingsDTO,
  IaCDriftCompareResponse,
  IaCFindingsOverviewResponse,
  IaCFindingsAllResponse,
  IaCFindingsByProviderResponse,
  IaCFindingsBySeverityResponse,
  IaCFindingsByCategoryResponse,
  IaCFindingsByFrameworkResponse,
  IaCFindingsByEnvironmentResponse,
  ExportFindingsRequest,
  ExportFindingsResponse,
  IaCFindingDetailResponse,
  AssignFindingRequest,
  CommentFindingRequest,
  RemediateFindingRequest,
  IaCFindingsTriageItem,
  IaCFindingsTriageResponse,
  BulkFindingActionRequest,
  IaCFindingsTrendsResponse,
  IaCFindingsByResourceResponse,
  IaCFindingsByFrameworkSummaryResponse,
  ExportFindingsAdvancedRequest,
  ScheduledReportItem,
  ScheduledReportCreateRequest,
  ReportHistoryItem,
  IaCRemediationOverviewSuiteResponse,
  FixRecommendationsPageResponse,
  FixRecommendationItem,
  RemediationDetailResponse,
  AutoFixListResponse,
  AutoFixItem,
  GeneratePRRequest,
  GeneratePRResponse,
  RemediationPRsPageResponse,
  RemediationPRItem,
  SuppressedFindingsPageResponse,
  SuppressedFindingItem,
  UpdateSuppressionRequest,
  RemediationActivityPageResponse,
  RemediationActivityItem,
  RemediationSettingsDTO,
  UpdateRemediationSettingsRequest,
  RuleDetailOverviewResponse,
  RuleDefinitionResponse,
  RuleLogicResponse,
  RuleRiskDetailsResponse,
  RuleFrameworkMappingsResponse,
  AffectedResourcesPageResponse,
  RuleExceptionsPageResponse,
  RuleExceptionItem,
  CreateRuleExceptionRequest,
  RuleHistoryResponse,
  TriggerRuleScanResponse,
  GeneralSettingsDTO,
  UpdateGeneralSettingsRequest,
  ScanSettingsDTO,
  UpdateScanSettingsRequest,
  RulesPoliciesSettingsDTO,
  UpdateRulesPoliciesRequest,
  PolicyPackItem,
  ExclusionsSettingsDTO,
  ExclusionItem,
  AddExclusionRequest,
  PreviewExclusionRequest,
  PreviewExclusionResponse,
  NotificationsSettingsDTO,
  NotificationChannelItem,
  UpdateNotificationsRequest,
  AddNotificationChannelRequest,
  AccessSettingsDTO,
  UserAccessItem,
  AddUserAccessRequest,
  AdvancedSettingsDTO,
  EnvVariableItem,
  UpdateAdvancedSettingsRequest,
  IaCSettingsSuiteMasterDTO,
  GraphOverviewResponse,
  ResourceGraphResponse,
  ResourceDetailResponse,
  RiskViewResponse,
  RelationshipsPageResponse,
  BlastRadiusResponse,
  ChangeHistoryPageResponse,
  GraphSettingsDTO,
  ExportGraphRequest,
  ExportGraphResponse,
  IntegrationsOverviewResponse,
  ConnectedIntegrationsResponse,
  AvailableIntegrationsResponse,
  ConnectIntegrationRequest as ConnectIacIntegrationRequest,
  ConnectIntegrationResponse,
  IntegrationDetailResponse,
  UpdateIntegrationDetailRequest,
  IntegrationRepositoriesResponse,
  IntegrationRepositoryItem,
  ToggleRepoScanStatusRequest,
  IntegrationWebhooksResponse,
  IntegrationWebhookItem,
  WebhookEventsConfig,
  UpdateWebhookConfigRequest,
  CreateWebhookRequest,
  TestWebhookResponse,
  IntegrationScanSettingsDTO,
  IntegrationSyncLogsResponse,
  TriggerSyncResponse,
  RunOverviewResponse,
  WorkloadsResponse,
  ContainersResponse,
  KubernetesClusterResponse,
  RuntimeThreatsResponse,
  RuntimeThreatItem,
  UpdateThreatStatusRequest,
  RuntimeVulnerabilitiesResponse,
  RuntimeVulnerabilityItem,
  UpdateVulnerabilityStatusRequest,
  NetworkActivityResponse,
  RuntimePoliciesResponse,
  RuntimePolicyItem,
  CreateRuntimePolicyRequest,
  TogglePolicyStatusRequest,
} from '@/types/api/iac';
import type {
  ProtectOverviewResponse,
  RuntimeProtectionListResponse,
  RuntimeProtectionDetailResponse,
  ProtectionPolicyListResponse,
  ProtectionPolicyItem,
  ProtectionPolicyDetailResponse,
  CreatePolicyRequest as CreateProtectPolicyRequest,
  PolicySimulationResponse,
  PolicyPublishResponse,
  ProtectionDecisionListResponse,
  ProtectionDecisionDetailResponse,
  McpServerListResponse,
  McpToolControlListResponse,
  McpRequestAuditListResponse,
  ProtectedAgentListResponse,
  ProtectedSessionListResponse,
  ApiProtectionListResponse,
  NetworkProtectionListResponse,
  DnsProtectionListResponse,
  ThreatSignalListResponse,
  ProtectionApprovalListResponse,
  BreakGlassResponse,
  ControlEffectivenessListResponse,
  ProtectionCoverageResponse,
  ProtectionEvidenceListResponse,
  ProtectionEvidenceItem,
  ProtectionActivityListResponse,
  RevokeSessionResponse,
} from '@/types/api/protect';
import type {
  SecretRemediationMetrics,
  SecretRemediationItem,
  SecretRemediationFindingsResponse,
  RemediationPRResponse,
  BulkRemediateRequest,
  BulkRemediateResponse,
  RemediationSettings,
  SecretInventoryMetrics,
  SecretInventoryTableResponse,
  SecretInventoryRow,
  AddInventoryPolicyRequest,
  AddInventoryPolicyResponse,
  SecretDetectionsOverviewResponse,
  SecretDetectionsTableResponse,
  SecretDetectionsItem,
  SecretRepositoriesOverviewResponse,
  SecretRepositoriesTableResponse,
  SecretRepositoryRow,
  TriggerRepoScanRequest,
  TriggerRepoScanResponse,
  PolicyComplianceOverviewResponse,
  SecurityPoliciesTableResponse,
  SecurityPolicyRow,
  CreateSecurityPolicyRequest,
  UpdateSecurityPolicyRequest,
  EnforceAllPoliciesResponse,
  PolicyEnforcementSettings,
  PolicyTemplateItem,
  ComplianceFrameworkItem,
  SecretIntegrationsOverviewResponse,
  SecretRotationRuleItem,
  CreateRotationRuleRequest,
  UpdateRotationRuleRequest,
  TriggerRuleRotationResponse,
  ConnectedToolCard,
  ConnectIntegrationRequest,
  UpdateIntegrationConfigRequest,
  SecretsIntegrationConfig,
  RotationGlobalSettings,
} from '@/types/api/secrets';
import type {
  ContainerSummaryResponse,
  ContainerImageListResponse,
  ContainerImageDetailResponse,
  ContainerScanJobResponse,
  ContainerRegistryListResponse,
  DockerfileSummaryResponse,
  DockerfileChartDataResponse,
  DockerfileListResponse,
  DockerfileFindingDetail,
  DockerfileRecommendationItem,
  ContainerConfigSummaryResponse,
  ContainerConfigChartsResponse,
  ContainerConfigListResponse,
  RegistrySummaryResponse,
  RegistryEnhancedListResponse,
  ImageScanSummaryResponse,
  ImageScanChartsResponse,
  ImageScanListResponse,
  RunNewScanRequest,
  ImageScanDetailResponse,
  ScanScheduleListResponse,
  CreateScheduleRequest as CreateContainerScheduleRequest,
  ScanScheduleItem,
  KubernetesOverviewResponse,
  TopRiskyWorkloadRow,
  KubernetesClustersSummaryResponse,
  KubernetesClusterListResponse,
  KubernetesWorkloadListResponse,
  KubernetesWorkloadDetailResponse,
  KubernetesFindingsListResponse,
  RuntimeOverviewResponse,
  RuntimeAlertsListResponse,
  RuntimeEventsListResponse,
  RuntimeEventDetailResponse,
  RuntimePoliciesSummaryResponse,
  CreateRuntimePolicyRequest as CreateContainerRuntimePolicyRequest,
  RuntimePolicyRow,
} from '@/types/api/container';

export interface ScopeHeaders {
  organizationId?: string | null;
  projectId?: string | null;
  environmentId?: string | null;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
  ttlMs?: number;
  bypassCache?: boolean;
}

export function buildScopeHeaders(scope?: ScopeHeaders): Record<string, string> {
  const headers: Record<string, string> = {};
  if (scope?.organizationId) headers['X-Organization-ID'] = scope.organizationId;
  if (scope?.projectId) headers['X-Project-ID'] = scope.projectId;
  if (scope?.environmentId) headers['X-Environment-ID'] = scope.environmentId;
  return headers;
}

class ThingApiClient {
  private baseUrl: string;

  constructor() {
    if (typeof window !== 'undefined') {
      // In browser, route requests through Next.js proxy rewrite to eliminate cross-origin and private network access restrictions
      this.baseUrl = '';
    } else {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    }
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Invalidate cached client queries matching an endpoint prefix.
   */
  public invalidateCache(prefix?: string) {
    apiCache.invalidate(prefix);
  }

  /**
   * Clear entire in-memory client cache.
   */
  public clearCache() {
    apiCache.clear();
  }

  /**
   * Core execute request with correlation ID, timeout, retry, SWR cache, and error normalization.
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T; requestId: string }> {
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const cacheKey = apiCache.buildKey(endpoint, options);

    // 1. SWR In-Memory Cache Lookup for GET requests
    if (isGet && !options.bypassCache) {
      const cached = apiCache.getWithStatus<T>(cacheKey);
      if (cached) {
        if (cached.isStale) {
          // Stale-While-Revalidate: Return cached entry in 0ms (nanoseconds memory lookup),
          // while refreshing in background without blocking caller!
          const bgPromise = this.executeNetworkRequest<T>(endpoint, options, isGet, cacheKey);
          apiCache.setInflight<T>(cacheKey, bgPromise);
        }
        return { data: cached.data, requestId: cached.requestId };
      }
      const inflight = apiCache.getInflight<T>(cacheKey);
      if (inflight) {
        return inflight;
      }
    }

    const execPromise = this.executeNetworkRequest<T>(endpoint, options, isGet, cacheKey);

    if (isGet && !options.bypassCache) {
      apiCache.setInflight<T>(cacheKey, execPromise);
    }

    return execPromise;
  }

  public async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return res.data;
  }

  public async post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers,
      body: isFormData ? body : body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    return res.data;
  }

  public async put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers,
      body: isFormData ? body : body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    return res.data;
  }

  public async patch<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers,
      body: isFormData ? body : body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    return res.data;
  }

  public async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return res.data;
  }

  private async executeNetworkRequest<T>(
    endpoint: string,
    options: RequestOptions,
    isGet: boolean,
    cacheKey: string
  ): Promise<{ data: T; requestId: string }> {
    const {
      timeoutMs = 30000,
      retries = 1,
      skipAuth = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const correlationId = generateCorrelationId();
    const token = getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': correlationId,
      'X-Correlation-ID': correlationId,
      ...(customHeaders as Record<string, string>),
    };

    if (!skipAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    let attempts = 0;
    while (attempts <= retries) {
      attempts++;
      const controller = new AbortController();
      const timeoutReason = new Error(`Request timed out after ${timeoutMs}ms`);
      const timer = setTimeout(() => {
        try {
          controller.abort(timeoutReason);
        } catch {
          controller.abort();
        }
      }, timeoutMs);


      try {
        recordTelemetry({
          name: `API Request: ${options.method || 'GET'} ${endpoint}`,
          category: 'api',
          properties: { endpoint, method: options.method || 'GET', correlationId, attempt: attempts },
          correlation_id: correlationId,
        });

        const res = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const apiError = await normalizeHttpError(res, correlationId);
          recordTelemetry({
            name: `API Error: ${options.method || 'GET'} ${endpoint}`,
            category: 'error',
            properties: { code: apiError.code, status: apiError.status_code, message: apiError.message },
            correlation_id: correlationId,
          });

          // Session invalid or expired: purge tokens and redirect immediately to login
          if (res.status === 401 || apiError.status_code === 401) {
            redirectToLogin();
          }

          throw apiError;
        }

        if (res.status === 204) {
          return { data: {} as T, requestId: correlationId };
        }

        const contentType = res.headers.get('content-type') || '';
        let data: T;
        if (contentType.includes('application/json') || contentType.includes('+json')) {
          data = (await res.json()) as T;
        } else {
          data = (await res.text()) as unknown as T;
        }

        // 2. Cache successful GET responses in memory
        if (isGet && !options.bypassCache) {
          apiCache.set<T>(cacheKey, data, correlationId, options.ttlMs);
        } else if (!isGet) {
          // Auto-invalidate matching cache namespace on state mutations (POST, PUT, DELETE, PATCH)
          const baseScope = endpoint.split('?')[0].split('/').slice(0, 4).join('/');
          if (baseScope) {
            apiCache.invalidate(baseScope);
          }
          // Assistant / Scan / Action synchronization: Invalidate dashboard & findings caches
          if (endpoint.includes('/assistant') || endpoint.includes('/scans') || endpoint.includes('/findings')) {
            apiCache.invalidate('/findings');
            apiCache.invalidate('/scans');
            apiCache.invalidate('/code');
            apiCache.invalidate('/home');
            apiCache.invalidate('/overview');
            apiCache.invalidate('/api-security');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kavach:data_invalidated', { detail: { endpoint } }));
            }
          }
        }

        return { data, requestId: correlationId };
      } catch (err: any) {
        clearTimeout(timer);

        // If timed out or network error and attempts remain, retry
        if (attempts <= retries && (err?.name === 'AbortError' || err?.code === 'NETWORK_ERROR')) {
          await new Promise((r) => setTimeout(r, 400 * attempts));
          continue;
        }

        const normalized = normalizeNetworkError(err, correlationId);
        console.error('API request failed', {
          endpoint,
          method: options.method || 'GET',
          attempt: attempts,
          requestId: normalized.request_id,
          code: normalized.code,
          message: normalized.message,
          remediation: normalized.remediation,
        });
        recordTelemetry({
          name: `API Network Failure: ${endpoint}`,
          category: 'error',
          properties: { error: normalized.message },
          correlation_id: correlationId,
        });
        throw normalized;
      }
    }

    throw normalizeNetworkError(new Error('Max retries exceeded'), correlationId);
  }

  // =========================================================================
  // LOCAL DEV GUARDRAIL & DIRECT-TO-IDE REMEDIATION
  // =========================================================================
  public local = {
    workspaceInfo: async (workspacePath?: string): Promise<any> => {
      const q = workspacePath ? `?workspace_path=${encodeURIComponent(workspacePath)}` : '';
      const res = await this.request<any>(`/api/v1/local/workspace-info${q}`);
      return res.data;
    },
    scan: async (payload: { workspace_path?: string; target_files?: string[] } = {}): Promise<any> => {
      const res = await this.request<any>('/api/v1/local/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    applyPatch: async (payload: {
      finding_id: string;
      file_path: string;
      patched_code?: string;
      original_snippet?: string;
      replacement_lines?: any[];
      workspace_path?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/local/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    createSampleVulnerability: async (workspacePath?: string): Promise<any> => {
      const q = workspacePath ? `?workspace_path=${encodeURIComponent(workspacePath)}` : '';
      const res = await this.request<any>(`/api/v1/local/create-sample-vulnerability${q}`, {
        method: 'POST',
      });
      return res.data;
    },
    cleanupSampleVulnerability: async (workspacePath?: string): Promise<any> => {
      const q = workspacePath ? `?workspace_path=${encodeURIComponent(workspacePath)}` : '';
      const res = await this.request<any>(`/api/v1/local/sample-vulnerability${q}`, {
        method: 'DELETE',
      });
      return res.data;
    },
  };

  // =========================================================================
  // AUTH APIS
  // =========================================================================
  public auth = {
    me: async (): Promise<UserProfile> => {
      const res = await this.request<UserProfile>('/api/v1/auth/me');
      return res.data;
    },
    accessContext: async (): Promise<{
      user_id: string;
      email: string;
      name: string;
      role: string;
      permissions: string[];
      is_superuser: boolean;
      organization_id?: string | null;
      organization_name?: string | null;
    }> => {
      const res = await this.request<any>('/api/v1/auth/access-context');
      return res.data;
    },
    login: async (formData: FormData | { username: string; password: string }): Promise<{ access_token: string; token_type: string }> => {
      let body: string;
      if (formData instanceof FormData) {
        body = new URLSearchParams(formData as any).toString();
      } else {
        const params = new URLSearchParams();
        params.append('username', formData.username);
        params.append('password', formData.password);
        body = params.toString();
      }
      const res = await this.request<{ access_token: string; token_type: string }>('/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        skipAuth: true,
      });
      return res.data;
    },
    register: async (payload: { email: string; password: string; name?: string; company?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    resendVerification: async (payload?: { email?: string }): Promise<{
      status: string;
      message: string;
      verified: boolean;
      expired: boolean;
      email?: string;
    }> => {
      const res = await this.request<{
        status: string;
        message: string;
        verified: boolean;
        expired: boolean;
        email?: string;
      }>('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined,
        skipAuth: true,
      });
      return res.data;
    },
    checkEmailVerification: async (token: string): Promise<{
      status: string;
      message: string;
      verified: boolean;
      expired: boolean;
      email?: string;
    }> => {
      const res = await this.request<{
        status: string;
        message: string;
        verified: boolean;
        expired: boolean;
        email?: string;
      }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
        skipAuth: true,
      });
      return res.data;
    },
    verifyEmail: async (tokenOrPayload: string | { token: string }): Promise<{
      status: string;
      message: string;
      verified: boolean;
      expired: boolean;
      email?: string;
    }> => {
      const token = typeof tokenOrPayload === 'string' ? tokenOrPayload : tokenOrPayload.token;
      const res = await this.request<{
        status: string;
        message: string;
        verified: boolean;
        expired: boolean;
        email?: string;
      }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
        skipAuth: true,
      });
      return res.data;
    },
    devInstantVerify: async (email?: string): Promise<{
      status: string;
      message: string;
      verified: boolean;
      expired: boolean;
      email?: string;
    }> => {
      const res = await this.request<{
        status: string;
        message: string;
        verified: boolean;
        expired: boolean;
        email?: string;
      }>('/api/v1/auth/verify-email/dev-instant', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      return res.data;
    },
    checkEmailStatus: async (email: string): Promise<{
      status: string;
      message: string;
      verified: boolean;
      expired: boolean;
      email?: string;
    }> => {
      const res = await this.request<{
        status: string;
        message: string;
        verified: boolean;
        expired: boolean;
        email?: string;
      }>(`/api/v1/auth/verification-status?email=${encodeURIComponent(email)}`, {
        skipAuth: true,
        bypassCache: true,
      });
      return res.data;
    },
    getGithubAuthUrl: async (redirectUri?: string): Promise<{ url: string; client_id: string; redirect_uri: string; state: string }> => {
      const q = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
      const res = await this.request<any>(`/api/v1/auth/github/url${q}`, {
        skipAuth: true,
      });
      return res.data;
    },
    githubCallback: async (payload: { code: string; state?: string; redirect_uri?: string }): Promise<{
      access_token: string;
      token_type: string;
      user: any;
      github_login?: string;
      avatar_url?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/github/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
        timeoutMs: 60000,
        retries: 0,
      });
      return res.data;
    },
    getGoogleAuthUrl: async (): Promise<{ url: string; client_id: string; redirect_uri: string; state: string }> => {
      const res = await this.request<any>('/api/v1/auth/google/url', {
        skipAuth: true,
      });
      return res.data;
    },
    googleCallback: async (payload: { code: string; state?: string }): Promise<{
      access_token: string;
      token_type: string;
      user: any;
      email?: string;
      picture?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
        timeoutMs: 45000,
        retries: 0,
      });
      return res.data;
    },
    getSsoAuthUrl: async (provider?: string): Promise<{
      url: string;
      provider: string;
      relay_state: string;
      supported_providers: string[];
    }> => {
      const q = provider ? `?provider=${encodeURIComponent(provider)}` : '';
      const res = await this.request<any>(`/api/v1/auth/sso/url${q}`, {
        skipAuth: true,
      });
      return res.data;
    },
    ssoCallback: async (payload: {
      provider?: string;
      saml_response?: string;
      code?: string;
      state?: string;
      email?: string;
    }): Promise<{
      access_token: string;
      token_type: string;
      user: any;
      sso_provider: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/sso/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    forgotPassword: async (payload: { email: string }): Promise<{
      status: string;
      message: string;
      email?: string;
      reset_token?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    resetPassword: async (payload: { token: string; new_password: string }): Promise<{
      status: string;
      message: string;
      email?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    getAccountStatus: async (email?: string): Promise<{
      email?: string;
      is_locked: boolean;
      locked_until?: string;
      failed_attempts: number;
      mfa_enabled: boolean;
      is_verified: boolean;
      is_active: boolean;
    }> => {
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      const res = await this.request<any>(`/api/v1/auth/account-status${q}`, {
        skipAuth: true,
      });
      return res.data;
    },
    requestUnlockOtp: async (payload: { email: string }): Promise<{
      status: string;
      message: string;
      dev_otp?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/unlock/request-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    unlockAccount: async (payload: { email: string; token?: string; otp?: string }): Promise<{
      status: string;
      message: string;
      verified: boolean;
    }> => {
      const res = await this.request<any>('/api/v1/auth/unlock', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    requestAccountRecovery: async (payload: { email: string; reason?: string }): Promise<{
      status: string;
      message: string;
      email?: string;
    }> => {
      const res = await this.request<any>('/api/v1/auth/recovery/request', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    verifyAccountRecovery: async (payload: { email: string; recovery_code: string }): Promise<{
      status: string;
      message: string;
      verified: boolean;
    }> => {
      const res = await this.request<any>('/api/v1/auth/recovery/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    logout: async (): Promise<{ status: string; message: string }> => {
      const res = await this.request<any>('/api/v1/auth/logout', {
        method: 'POST',
      });
      return res.data;
    },
    getSessions: async (): Promise<Array<{
      id: string;
      client_name: string;
      ip_address: string;
      location: string;
      last_active: string;
      created_at: string;
      is_current: boolean;
    }>> => {
      const res = await this.request<any[]>('/api/v1/auth/sessions');
      return res.data;
    },
    revokeSession: async (sessionId: string): Promise<{ status: string; message: string }> => {
      const res = await this.request<any>(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    revokeAllOtherSessions: async (): Promise<{ status: string; message: string }> => {
      const res = await this.request<any>('/api/v1/auth/sessions', {
        method: 'DELETE',
      });
      return res.data;
    },
    getLoginHistory: async (): Promise<Array<{
      id: string;
      timestamp: string;
      ip_address: string;
      location: string;
      user_agent: string;
      auth_method: string;
      status: string;
    }>> => {
      const res = await this.request<any[]>('/api/v1/auth/login-history');
      return res.data;
    },
    mfa: {
      setup: async (email?: string): Promise<{
        secret: string;
        base32_key: string;
        totp_uri: string;
        recovery_codes: string[];
      }> => {
        const query = email ? `?email=${encodeURIComponent(email)}` : '';
        const res = await this.request<any>(`/api/v1/auth/mfa/setup${query}`, {
          method: 'POST',
          skipAuth: true,
        });
        return res.data;
      },
      verify: async (payload: {
        code: string;
        secret?: string;
        email?: string;
        trust_device?: boolean;
      }): Promise<{
        status: string;
        message: string;
        verified: boolean;
        recovery_codes?: string[];
      }> => {
        const res = await this.request<any>('/api/v1/auth/mfa/verify', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      recovery: async (recoveryCode: string, email?: string): Promise<{
        status: string;
        message: string;
        verified: boolean;
        remaining_recovery_codes?: number;
      }> => {
        const res = await this.request<any>('/api/v1/auth/mfa/recovery', {
          method: 'POST',
          body: JSON.stringify({ recovery_code: recoveryCode, email }),
          skipAuth: true,
        });
        return res.data;
      },
      sendRecoveryLink: async (email?: string): Promise<{
        status: string;
        message: string;
        email?: string;
      }> => {
        const res = await this.request<any>('/api/v1/auth/mfa/send-recovery-link', {
          method: 'POST',
          body: JSON.stringify({ email }),
          skipAuth: true,
        });
        return res.data;
      },
      getBackupCodes: async (email?: string): Promise<{
        recovery_codes: string[];
        count: number;
        email?: string;
      }> => {
        const q = email ? `?email=${encodeURIComponent(email)}` : '';
        const res = await this.request<any>(`/api/v1/auth/mfa/backup-codes${q}`, {
          method: 'GET',
        });
        return res.data;
      },
      regenerateBackupCodes: async (email?: string): Promise<{
        recovery_codes: string[];
        count: number;
        email?: string;
      }> => {
        const q = email ? `?email=${encodeURIComponent(email)}` : '';
        const res = await this.request<any>(`/api/v1/auth/mfa/backup-codes/regenerate${q}`, {
          method: 'POST',
        });
        return res.data;
      },
    },
  };

  // =========================================================================
  // USER ACCOUNT & PERSONAL SECURITY APIS (Truthful PostgreSQL persistence)
  // =========================================================================
  public account = {
    getProfile: async (): Promise<{
      user_id: string;
      email: string;
      name: string;
      is_verified: boolean;
      job_title?: string;
      department?: string;
      company?: string;
      phone?: string;
      bio?: string;
      location?: string;
      timezone: string;
      language: string;
      avatar_url?: string;
      created_at: string;
      updated_at: string;
    }> => {
      const res = await this.request<any>('/api/v1/account/profile');
      return res.data;
    },
    updateProfile: async (payload: {
      name?: string;
      job_title?: string;
      department?: string;
      company?: string;
      phone?: string;
      bio?: string;
      location?: string;
      timezone?: string;
      language?: string;
      avatar_url?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getSettings: async (): Promise<{
      theme: string;
      default_workspace_id?: string;
      date_format: string;
      time_format: string;
      auto_lockout_minutes: number;
      session_timeout_hours: number;
      updated_at: string;
    }> => {
      const res = await this.request<any>('/api/v1/account/settings');
      return res.data;
    },
    updateSettings: async (payload: {
      theme?: string;
      default_workspace_id?: string;
      date_format?: string;
      time_format?: string;
      auto_lockout_minutes?: number;
      session_timeout_hours?: number;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/account/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getSecurity: async (): Promise<{
      mfa_enabled: boolean;
      email_verified: boolean;
      failed_login_attempts: number;
      is_locked: boolean;
      active_sessions_count: number;
      security_score: number;
      recommendations: Array<{ title: string; impact: string; description: string; action_url: string }>;
      password_updated_at: string;
    }> => {
      const res = await this.request<any>('/api/v1/account/security');
      return res.data;
    },
    changePassword: async (payload: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }): Promise<{ success: boolean; message: string }> => {
      const res = await this.request<any>('/api/v1/account/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getMfaStatus: async (): Promise<{
      enabled: boolean;
      secret_configured: boolean;
      recovery_codes_remaining: number;
      trusted_devices_count: number;
    }> => {
      const res = await this.request<any>('/api/v1/account/mfa/status');
      return res.data;
    },
    disableMfa: async (password: string): Promise<{ success: boolean; message: string }> => {
      const res = await this.request<any>('/api/v1/account/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      return res.data;
    },
    getConnectedAccounts: async (): Promise<Array<{
      id: string;
      provider: string;
      account_email?: string;
      username?: string;
      avatar_url?: string;
      connected_at: string;
      status: string;
    }>> => {
      const res = await this.request<any[]>('/api/v1/account/connected-accounts');
      return res.data;
    },
    disconnectAccount: async (provider: string): Promise<{ success: boolean; message: string }> => {
      const res = await this.request<any>(`/api/v1/account/connected-accounts/${encodeURIComponent(provider)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    connectAccount: async (payload: {
      provider: string;
      username?: string;
      account_email?: string;
      token?: string;
      instance_url?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/account/connected-accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getTokens: async (): Promise<Array<{
      id: string;
      name: string;
      token_prefix: string;
      scopes: string[];
      status: string;
      expires_at?: string;
      last_used_at?: string;
      created_at: string;
    }>> => {
      const res = await this.request<any[]>('/api/v1/account/tokens');
      return res.data;
    },
    createToken: async (payload: {
      name: string;
      scopes?: string[];
      expires_in_days?: number;
    }): Promise<{
      id: string;
      name: string;
      raw_token: string;
      token_prefix: string;
      scopes: string[];
      status: string;
      expires_at?: string;
      created_at: string;
    }> => {
      const res = await this.request<any>('/api/v1/account/tokens', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    revokeToken: async (tokenId: string): Promise<{ success: boolean; message: string }> => {
      const res = await this.request<any>(`/api/v1/account/tokens/${encodeURIComponent(tokenId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    getNotifications: async (): Promise<{
      email_security_alerts: boolean;
      email_weekly_digest: boolean;
      email_login_alerts: boolean;
      email_scan_completed: boolean;
      email_policy_violations: boolean;
      in_app_sound: boolean;
      slack_notifications_enabled: boolean;
      slack_webhook_url?: string;
      updated_at: string;
    }> => {
      const res = await this.request<any>('/api/v1/account/notifications');
      return res.data;
    },
    updateNotifications: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/account/notifications', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  // =========================================================================
  // CONTACT & INQUIRIES APIS (Real PostgreSQL Audit Persistence)
  // =========================================================================
  public contact = {
    submit: async (payload: {
      name: string;
      email: string;
      company?: string;
      phone?: string;
      inquiry_type?: string;
      subject?: string;
      message: string;
    }): Promise<{
      status: string;
      message: string;
      inquiry_id: string;
      received_at: string;
      estimated_response_sla: string;
    }> => {
      const res = await this.request<any>('/api/v1/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    list: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/contact', {
        method: 'GET',
        skipAuth: true,
      });
      return res.data;
    },
  };

  // =========================================================================
  // TEAM INVITATIONS & WORKSPACE MEMBERS APIS (Real PostgreSQL + Email)
  // =========================================================================
  public invitations = {
    list: async (params?: { organizationId?: string; organization_id?: string; projectId?: string; project_id?: string; status?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const qs = new URLSearchParams();
      const orgId = params?.organizationId || params?.organization_id;
      const projId = params?.projectId || params?.project_id;
      if (orgId) qs.set('organization_id', orgId);
      if (projId) qs.set('project_id', projId);
      if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset != null) qs.set('offset', String(params.offset));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/invitations${query}`);
      return res.data ?? [];
    },
    create: async (payload: {
      email: string;
      role?: string;
      organization_id?: string;
      project_id?: string;
      message?: string;
      permissions?: string[];
      project_access?: string[];
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    resend: async (invitationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/${encodeURIComponent(invitationId)}/resend`, {
        method: 'POST',
      });
      return res.data;
    },
    cancel: async (invitationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    delete: async (invitationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    verify: async (token: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/verify?token=${encodeURIComponent(token)}`, {
        skipAuth: true,
      });
      return res.data;
    },
    accept: async (payloadOrToken: string | { token: string; full_name?: string; password?: string }): Promise<any> => {
      const body = typeof payloadOrToken === 'string' ? { token: payloadOrToken } : payloadOrToken;
      const res = await this.request<any>('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      });
      return res.data;
    },
    members: async (paramsOrOrgId?: string | { organization_id?: string; organizationId?: string }): Promise<any[]> => {
      const orgId = typeof paramsOrOrgId === 'string' ? paramsOrOrgId : (paramsOrOrgId?.organization_id || paramsOrOrgId?.organizationId);
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
      const res = await this.request<any[]>(`/api/v1/invitations/members${qs}`);
      return res.data ?? [];
    },
    listMembers: async (paramsOrOrgId?: string | { organization_id?: string; organizationId?: string }): Promise<any[]> => {
      const orgId = typeof paramsOrOrgId === 'string' ? paramsOrOrgId : (paramsOrOrgId?.organization_id || paramsOrOrgId?.organizationId);
      const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
      const res = await this.request<any[]>(`/api/v1/invitations/members${qs}`);
      return res.data ?? [];
    },
    removeMember: async (memberId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/members/${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    updateMemberRole: async (memberId: string, role: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/invitations/members/${encodeURIComponent(memberId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      return res.data;
    },
  };

  // =========================================================================
  // INTEGRATIONS APIS (Real SAST, SCM, CI/CD, Webhook & API Key Gateway)
  // =========================================================================
  public integrations = {
    listProviders: async (): Promise<ProviderCatalogItem[]> => {
      const res = await this.request<ProviderCatalogItem[]>('/api/v1/integrations/providers');
      return res.data;
    },
    connectCentral: async (payload: CentralConnectPayload): Promise<ProviderCatalogItem> => {
      const res = await this.request<ProviderCatalogItem>('/api/v1/integrations/central/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    disconnectCentral: async (providerOrConnectionId: string): Promise<{ success: boolean; message: string }> => {
      const res = await this.request<{ success: boolean; message: string }>(
        `/api/v1/integrations/central/disconnect?provider=${encodeURIComponent(providerOrConnectionId)}`,
        { method: 'POST' }
      );
      return res.data;
    },
    getResources: async (connectionIdOrProvider?: string): Promise<CentralResourceCapabilityItem[]> => {
      const param = connectionIdOrProvider ? `?connection_id=${encodeURIComponent(connectionIdOrProvider)}` : '';
      const res = await this.request<CentralResourceCapabilityItem[]>(`/api/v1/integrations/central/resources${param}`);
      return res.data;
    },
    updateCapabilities: async (payload: UpdateCapabilitiesPayload): Promise<CentralResourceCapabilityItem> => {
      const res = await this.request<CentralResourceCapabilityItem>('/api/v1/integrations/central/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    checkHealth: async (connectionIdOrProvider: string): Promise<IntegrationHealthResponse> => {
      const res = await this.request<IntegrationHealthResponse>(
        `/api/v1/integrations/central/health?connection_id=${encodeURIComponent(connectionIdOrProvider)}`
      );
      return res.data;
    },

    overview: async (params?: { type?: string; status?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.type && params.type !== 'All') q.append('type', params.type);
      if (params?.status && params.status !== 'All') q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/integrations/overview${qs}`);
      return res.data;
    },

    getProviderStatus: async (provider: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(provider)}/status`);
      return res.data;
    },

    connectProvider: async (provider: string, payload: any = {}): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(provider)}/connect`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    disconnectProvider: async (provider: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(provider)}/disconnect`, {
        method: 'POST',
      });
      return res.data;
    },

    syncProvider: async (provider: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(provider)}/sync`, {
        method: 'POST',
      });
      return res.data;
    },

    updateRepoSelection: async (provider: string, selectedIds: string[]): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(provider)}/repositories/select`, {
        method: 'POST',
        body: JSON.stringify({ selected_ids: selectedIds }),
      });
      return res.data;
    },

    testJenkins: async (payload: { jenkins_url: string; jenkins_username?: string; jenkins_token?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/jenkins/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getCiCdConfig: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/ci-cd/config');
      return res.data;
    },

    updateCiCdConfig: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/ci-cd/config', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listWebhooks: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/integrations/webhooks');
      return res.data;
    },

    createWebhook: async (payload: { name: string; url: string; events: string[]; secret?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/webhooks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteWebhook: async (webhookId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/webhooks/${encodeURIComponent(webhookId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    testWebhook: async (payload?: { url?: string; secret?: string }, webhookId?: string): Promise<any> => {
      const endpoint = webhookId
        ? `/api/v1/integrations/webhooks/${encodeURIComponent(webhookId)}/test`
        : '/api/v1/integrations/webhooks/test';
      const res = await this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    listApiKeys: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/integrations/api-keys');
      return res.data;
    },

    generateApiKey: async (payload: { name: string; scopes: string[]; expires_in_days?: number }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/api-keys', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    revokeApiKey: async (keyId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/api-keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    getGithubStatus: async (): Promise<{
      connected: boolean;
      login?: string;
      name?: string;
      avatar_url?: string;
      scopes?: string[];
      source?: string;
    }> => {
      const res = await this.request<any>('/api/v1/integrations/github/status');
      return res.data;
    },

    getGithubRepos: async (): Promise<{
      connected: boolean;
      login?: string;
      repositories: Array<{
        id: string;
        name: string;
        full_name: string;
        private: boolean;
        html_url: string;
        clone_url: string;
        default_branch: string;
        description: string;
        language: string;
        stars: number;
        updated_at: string;
      }>;
      total?: number;
      message?: string;
    }> => {
      const res = await this.request<any>('/api/v1/integrations/github/repos');
      return res.data;
    },

    githubRepositories: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/github/repos');
      return res.data;
    },

    list: async (projectId?: string): Promise<any[]> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any[]>(`/api/v1/integrations${qs}`);
      return res.data;
    },

    get: async (integrationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(integrationId)}`);
      return res.data;
    },

    create: async (payload: {
      provider: string;
      name?: string;
      project_id?: string;
      credentials_json?: string;
      config?: Record<string, any>;
      is_connected?: boolean;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    update: async (integrationId: string, payload: Record<string, any>): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(integrationId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    delete: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    disconnect: async (providerOrConnectionId: string): Promise<any> => {
      const res = await this.request<{ success: boolean; message: string }>(
        `/api/v1/integrations/central/disconnect?provider=${encodeURIComponent(providerOrConnectionId)}`,
        { method: 'POST' }
      );
      return res.data;
    },

    getProviderDetails: async (provider: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/providers/${encodeURIComponent(provider)}/details`);
      return res.data;
    },

    testSlack: async (payload: { webhook_url?: string; channel?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/slack/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    testTeams: async (payload: { webhook_url: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/teams/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listRules: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/integrations/rules');
      return res.data;
    },

    createRule: async (payload: {
      name: string;
      description?: string;
      event_trigger: string;
      conditions?: Record<string, any>;
      actions: Array<Record<string, any>>;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/integrations/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    toggleRule: async (ruleId: string, is_enabled: boolean): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/rules/${encodeURIComponent(ruleId)}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_enabled }),
      });
      return res.data;
    },

    deleteRule: async (ruleId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/integrations/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    getRuleExecutions: async (ruleId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/integrations/rules/${encodeURIComponent(ruleId)}/executions`);
      return res.data;
    },

    listDeadLetters: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/integrations/webhooks/dead-letter');
      return res.data;
    },
  };

  // =========================================================================
  // ORGANIZATIONS APIS (Truthful backend client)
  // =========================================================================
  public organizations = {
    list: async (): Promise<{ items: Organization[] }> => {
      try {
        const res = await this.request<{ items: Organization[] }>('/api/v1/organizations');
        return res.data;
      } catch (err: any) {
        if (err.status_code === 404) {
          return { items: [] };
        }
        throw err;
      }
    },
    create: async (payload: {
      name: string;
      slug?: string;
      org_type?: string;
      industry?: string;
      team_size?: string;
      region?: string;
      website?: string;
      owner_name?: string;
      owner_email?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    getOverview: async (organizationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/organizations/${organizationId}/overview`);
      return res.data;
    },
  };

  public workspaces = {
    list: async (): Promise<{ personal: any[]; organizations: any[]; items: any[] } & any[]> => {
      try {
        const res = await this.request<any>('/api/v1/workspaces');
        const data = res.data;
        if (data && !Array.isArray(data) && data.items) {
          const arr = [...(data.items || [])] as any;
          arr.personal = data.personal || [];
          arr.organizations = data.organizations || [];
          arr.items = data.items || [];
          return arr;
        }
        if (Array.isArray(data)) {
          const arr = [...data] as any;
          arr.personal = [];
          arr.organizations = [];
          arr.items = data;
          return arr;
        }
        return { personal: [], organizations: [], items: [] } as any;
      } catch {
        const fallback = [] as any;
        fallback.personal = [];
        fallback.organizations = [];
        fallback.items = [];
        return fallback;
      }
    },
    get: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${id}`);
      return res.data;
    },
    create: async (payload: {
      name: string;
      slug?: string;
      description?: string;
      workspace_type?: string;
      organization_id?: string;
      visibility?: string;
      default_branch?: string;
      region?: string;
      deployment_target?: string;
      admins?: string[];
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    update: async (id: string, payload: {
      name?: string;
      description?: string;
      visibility?: string;
      default_branch?: string;
      region?: string;
      deployment_target?: string;
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    delete: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${id}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    getProjects: async (workspaceId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/workspaces/${workspaceId}/projects`);
      return res.data || [];
    },
    createProject: async (workspaceId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getRepositories: async (workspaceId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/workspaces/${workspaceId}/repositories`);
      return res.data || [];
    },
    assignRepository: async (workspaceId: string, repoId: string, projectId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${workspaceId}/repositories/${repoId}/assign?project_id=${projectId}`, {
        method: 'POST',
      });
      return res.data;
    },
    removeRepository: async (workspaceId: string, repoId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/workspaces/${workspaceId}/repositories/${repoId}`, {
        method: 'DELETE',
      });
      return res.data;
    },
  };

  public environments = {
    list: async (projectId?: string): Promise<any[] & { items: any[] }> => {
      try {
        const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<any>(`/api/v1/environments${query}`);
        const data = res.data;
        const rawList = Array.isArray(data) ? data : (data?.items || []);
        const result = [...rawList] as any;
        result.items = rawList;
        return result;
      } catch (err: any) {
        const empty = [] as any;
        empty.items = [];
        return empty;
      }
    },
    configure: async (payload: {
      name: string;
      project_id?: string;
      workspace_id?: string;
      env_type?: string;
      cloud_provider?: string;
      region?: string;
      cluster_target?: string;
      cluster_resource?: string;
      security_scans?: boolean;
      block_on_critical?: boolean;
      scan_containers?: boolean;
      scan_iac?: boolean;
      deploy_branch?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/environments', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          cluster_target: payload.cluster_target || payload.cluster_resource,
        }),
        skipAuth: true,
      });
      return res.data;
    },
    create: async (payload: any): Promise<any> => {
      return (this as any).environments.configure(payload);
    },
  };


  public onboarding = {
    getSummary: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/summary', {
        method: 'GET',
        skipAuth: true,
      });
      return res.data;
    },
    createProject: async (payload: {
      name: string;
      description?: string;
      project_type?: string;
      repo_url?: string;
      default_branch?: string;
      organization_id?: string;
      workspace_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/project', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    getProject: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/project', {
        method: 'GET',
        skipAuth: true,
      });
      return res.data;
    },
    saveProducts: async (payload: {
      products: string[];
      project_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/products', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    getProducts: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/products', {
        method: 'GET',
        skipAuth: true,
      });
      return res.data;
    },
    saveConfiguration: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/configure', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });
      return res.data;
    },
    getConfiguration: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/configure', {
        method: 'GET',
        skipAuth: true,
      });
      return res.data;
    },
    getState: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/state');
      return res.data;
    },
    updateState: async (payload: {
      current_step?: string;
      completed_steps?: string[];
      selected_products?: string[];
      status?: string;
      onboarding_completed?: boolean;
      setup_deferred?: boolean;
      last_step?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/state', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    complete: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/onboarding/state', {
        method: 'PUT',
        body: JSON.stringify({
          onboarding_completed: true,
          current_step: 'complete',
          status: 'COMPLETED',
        }),
      });
      return res.data;
    },
  };

  public github = {
    getOnboardingStatus: async (): Promise<{
      connected: boolean;
      status: string;
      account_name?: string | null;
      organization_count: number;
      repository_count: number;
      organizations: Array<{ name: string; display_name?: string; avatar_url?: string }>;
      repositories: Array<{ id: string; name: string; full_name: string; url: string; default_branch: string; private: boolean; last_scan_status?: string }>;
      scopes: string[];
      last_connected_at?: string | null;
    }> => {
      const res = await this.request<any>('/api/v1/onboarding/github/status');
      return res.data;
    },
    connectOnboarding: async (payload?: {
      installation_id?: string;
      code?: string;
      account_name?: string;
      repositories?: string[];
    }): Promise<{
      connected: boolean;
      status: string;
      account_name?: string | null;
      organization_count: number;
      repository_count: number;
      organizations: Array<any>;
      repositories: Array<any>;
      scopes: string[];
    }> => {
      const res = await this.request<any>('/api/v1/onboarding/github/connect', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },
    disconnectOnboarding: async (): Promise<{
      connected: boolean;
      status: string;
    }> => {
      const res = await this.request<any>('/api/v1/onboarding/github/disconnect', {
        method: 'POST',
      });
      return res.data;
    },
  };

  // =========================================================================
  // GUIDED TOURS & WALKTHROUGHS APIS (PostgreSQL persistent tour progress)
  // =========================================================================
  public tours = {
    getStatus: async (): Promise<{
      onboarding_completed: boolean;
      onboarding_state: any;
      completed_tours: string[];
      active_tour?: string | null;
      available_tours: Array<{
        id: string;
        name: string;
        description: string;
        module: string;
        steps_count: number;
      }>;
    }> => {
      const res = await this.request<any>('/api/v1/tours/status');
      return res.data;
    },
    complete: async (payload: {
      tour_id: string;
      step_index?: number;
      dismissed?: boolean;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/tours/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    reset: async (payload: { tour_id: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/tours/reset', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  // =========================================================================
  // PROJECTS APIS (Real PostgreSQL persistence)
  // =========================================================================
  public projects = {
    list: async (params?: { limit?: number; offset?: number }): Promise<Project[]> => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', params.limit.toString());
      if (params?.offset) qs.set('offset', params.offset.toString());
      const query = qs.toString() ? `?${qs.toString()}` : '';
      const res = await this.request<Project[]>(`/api/v1/projects${query}`);
      return res.data;
    },
    get: async (id: string): Promise<Project> => {
      const res = await this.request<Project>(`/api/v1/projects/${id}`);
      return res.data;
    },
    create: async (payload: ProjectCreatePayload): Promise<Project> => {
      const res = await this.request<Project>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    delete: async (id: string): Promise<Project> => {
      const res = await this.request<Project>(`/api/v1/projects/${id}`, {
        method: 'DELETE',
      });
      return res.data;
    },
  };


  // =========================================================================
  // SECURITY HOTSPOTS APIS (Deterministic Real Security Scanner & Manual Review)
  // =========================================================================
  public hotspots = {
    summary: async (params?: { workspaceId?: string; repositoryId?: string }): Promise<any> => {
      const qs = new URLSearchParams();
      if (params?.workspaceId) qs.set('workspace_id', params.workspaceId);
      if (params?.repositoryId) qs.set('repository_id', params.repositoryId);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      const res = await this.request<any>(`/api/hotspots/summary${query}`);
      return res.data;
    },
    recent: async (limit: number = 10): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/hotspots/recent?limit=${limit}`);
      return res.data;
    },
    list: async (params?: {
      search?: string;
      severity?: string;
      status?: string;
      category?: string;
      branch?: string;
      repository_id?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: string;
    }): Promise<{ total: number; page: number; page_size: number; total_pages: number; items: any[] }> => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.severity) qs.set('severity', params.severity);
      if (params?.status) qs.set('status', params.status);
      if (params?.category) qs.set('category', params.category);
      if (params?.branch) qs.set('branch', params.branch);
      if (params?.repository_id) qs.set('repository_id', params.repository_id);
      if (params?.page) qs.set('page', params.page.toString());
      if (params?.pageSize) qs.set('page_size', params.pageSize.toString());
      if (params?.sortBy) qs.set('sort_by', params.sortBy);
      if (params?.sortOrder) qs.set('sort_order', params.sortOrder);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      const res = await this.request<any>(`/api/hotspots${query}`);
      return res.data;
    },
    get: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}`);
      return res.data;
    },
    getCode: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}/code`);
      return res.data;
    },
    getHistory: async (id: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/hotspots/${id}/history`);
      return res.data;
    },
    updateStatus: async (id: string, status: string, comment?: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment }),
      });
      return res.data;
    },
    assign: async (id: string, assigneeName: string, assigneeId?: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_name: assigneeName, assignee_id: assigneeId }),
      });
      return res.data;
    },
    addComment: async (id: string, comment: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
      return res.data;
    },
    createIssue: async (id: string, tracker: string = 'github', title?: string, description?: string): Promise<any> => {
      const res = await this.request<any>(`/api/hotspots/${id}/issue`, {
        method: 'POST',
        body: JSON.stringify({ tracker, title, description }),
      });
      return res.data;
    },
    triggerScan: async (payload?: { target_path?: string; branch?: string }): Promise<any> => {
      const res = await this.request<any>('/api/hotspots/scan', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },
    getRules: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/hotspots/rules');
      return res.data;
    },
  };


  // =========================================================================
  // SCANS & POLICIES
  // =========================================================================
  public scans = {
    list: async (projectId?: string): Promise<any[]> => {
      const query = projectId ? `?project_id=${projectId}` : '';
      const res = await this.request<any[]>(`/api/v1/scans${query}`);
      return res.data;
    },
  };

  public policies = {
    list: async (projectId?: string, params?: { status?: string; policyType?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.policyType) q.append('policy_type', params.policyType);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (projectId) {
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/policies${qs}`);
        return res.data;
      }
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/policies${qs}`);
      return res.data;
    },

    get: async (policyId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/policies/${encodeURIComponent(policyId)}`);
      return res.data;
    },

    create: async (projectId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/policies`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    evaluate: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/policies/evaluate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    simulate: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/policies/simulate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listApprovals: async (params?: { status?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/policies/approvals${qs}`);
      return res.data;
    },

    takeApprovalAction: async (approvalId: string, payload: { action: 'APPROVE' | 'REJECT'; reason?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/policies/approvals/${encodeURIComponent(approvalId)}/action`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  public health = {
    status: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/health');
      return res.data;
    },
    readiness: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/health/ready');
      return res.data;
    },
  };

  // =========================================================================
  // HOME / SECURITY HQ APIS (Scoped & Aggregated)
  // =========================================================================
  public buildScopeHeaders(scope?: ScopeHeaders): Record<string, string> {
    return buildScopeHeaders(scope);
  }

  public home = {
    overview: async (scope?: ScopeHeaders): Promise<HomeOverviewResponse> => {
      const query = scope?.projectId ? `?project_id=${encodeURIComponent(scope.projectId)}` : '';
      const res = await this.request<HomeOverviewResponse>(`/api/v1/home/overview${query}`, {
        headers: this.buildScopeHeaders(scope),
      });
      return res.data;
    },

    securityState: async (scope?: ScopeHeaders): Promise<SecurityStateResponse> => {
      const query = scope?.projectId ? `?project_id=${encodeURIComponent(scope.projectId)}` : '';
      const res = await this.request<SecurityStateResponse>(`/api/v1/home/security-state${query}`, {
        headers: this.buildScopeHeaders(scope),
      });
      return res.data;
    },

    attention: async (
      params?: ScopeHeaders & { severity?: string; product?: string; status?: string; limit?: number; cursor?: string }
    ): Promise<AttentionListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.product) q.append('product', params.product);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.cursor) q.append('cursor', params.cursor);

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<AttentionListResponse>(`/api/v1/home/attention${queryStr}`, {
        headers: this.buildScopeHeaders(params),
      });
      return res.data;
    },

    coverage: async (scope?: ScopeHeaders): Promise<HomeCoverageResponse> => {
      const query = scope?.projectId ? `?project_id=${encodeURIComponent(scope.projectId)}` : '';
      const res = await this.request<HomeCoverageResponse>(`/api/v1/home/coverage${query}`, {
        headers: this.buildScopeHeaders(scope),
      });
      return res.data;
    },

    productHealth: async (scope?: ScopeHeaders): Promise<HomeProductHealthResponse> => {
      const query = scope?.projectId ? `?project_id=${encodeURIComponent(scope.projectId)}` : '';
      const res = await this.request<HomeProductHealthResponse>(`/api/v1/home/product-health${query}`, {
        headers: this.buildScopeHeaders(scope),
      });
      return res.data;
    },

    activity: async (
      params?: ScopeHeaders & { limit?: number; cursor?: string; product?: string; severity?: string; event_type?: string }
    ): Promise<HomeActivityResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.cursor) q.append('cursor', params.cursor);
      if (params?.product) q.append('product', params.product);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.event_type) q.append('event_type', params.event_type);

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<HomeActivityResponse>(`/api/v1/home/activity${queryStr}`, {
        headers: this.buildScopeHeaders(params),
      });
      return res.data;
    },

    incidents: async (scope?: ScopeHeaders): Promise<HomeIncidentsResponse> => {
      const query = scope?.projectId ? `?project_id=${encodeURIComponent(scope.projectId)}` : '';
      const res = await this.request<HomeIncidentsResponse>(`/api/v1/home/incidents${query}`, {
        headers: this.buildScopeHeaders(scope),
      });
      return res.data;
    },

    trends: async (
      params?: ScopeHeaders & { metric?: string; window?: string }
    ): Promise<HomeTrendsResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.metric) q.append('metric', params.metric);
      if (params?.window) q.append('window', params.window);

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<HomeTrendsResponse>(`/api/v1/home/trends${queryStr}`, {
        headers: this.buildScopeHeaders(params),
      });
      return res.data;
    },
  };

  // =========================================================================
  // THING CODE — Code Security Product APIs
  // =========================================================================
  public code = {
    overview: async (projectId?: string | null, options?: RequestOptions): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/code/overview${q}`, options);
      return res.data;
    },

    coverage: async (projectId?: string | null, options?: RequestOptions): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/code/coverage${q}`, options);
      return res.data;
    },

    attention: async (params?: { projectId?: string | null; limit?: number }, options?: RequestOptions): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/attention${qs}`, options);
      return res.data;
    },

    recentScans: async (params?: { projectId?: string | null; project_id?: string | null; limit?: number }, options?: RequestOptions): Promise<any> => {
      const q = new URLSearchParams();
      const pId = params?.projectId || params?.project_id;
      if (pId) q.append('project_id', pId);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/recent-scans${qs}`, options);
      return res.data;
    },

    getRecentScans: async (params?: { projectId?: string | null; project_id?: string | null; limit?: number }, options?: RequestOptions): Promise<any> => {
      return this.code.recentScans(params, options);
    },

    repositoryHealth: async (params?: { projectId?: string | null; limit?: number; offset?: number; page?: number; pageSize?: number }, options?: RequestOptions): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/repository-health${qs}`, options);
      return res.data;
    },

    repositories: async (params?: { projectId?: string | null; limit?: number; offset?: number }, options?: RequestOptions): Promise<any> => {
      try {
        const healthRes = await this.code.repositoryHealth(params, options);
        let rawItems = Array.isArray(healthRes?.items) ? [...healthRes.items] : [];
        let items: Array<any> = rawItems.map((r: any) => {
          const repoName = r.name || r.repository_name || (r.full_name ? r.full_name.split('/').pop() : '') || 'repository';
          const repoId = r.id || r.repository_id || repoName;
          const fullName = r.full_name || repoName;
          return {
            ...r,
            id: repoId,
            name: repoName,
            repository_id: repoId,
            repository_name: repoName,
            full_name: fullName,
            default_branch: r.default_branch || 'main',
          };
        }).filter((r: any) => Boolean(r.name));

        return { items, total: healthRes?.total ?? items.length };
      } catch (err) {
        return { items: [], total: 0 };
      }
    },

    findings: async (params?: {
      projectId?: string | null;
      severity?: string;
      scannerName?: string;
      repositoryId?: string;
      rule_id?: string;
      ruleId?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.scannerName) q.append('scanner_name', params.scannerName);
      if (params?.rule_id || params?.ruleId) q.append('rule_id', (params.rule_id || params.ruleId)!);
      const repoId = params?.repositoryId || (params as any)?.repository_id;
      if (repoId) q.append('repository_id', repoId);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.category) q.append('category', params.category);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/findings${qs}`);
      return res.data;
    },

    autofix: async (findingId: string, dryRun: boolean = false): Promise<any> => {
      const res = await this.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}/autofix?dry_run=${dryRun}`, {
        method: 'POST',
      });
      return res.data;
    },

    createPRForFinding: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}/pr`, {
        method: 'POST',
      });
      return res.data;
    },

    // Wipe all scan, repository, finding, and pipeline data to clean slate
    wipeData: async (): Promise<{ status: string; message: string }> => {
      const res = await this.request<{ status: string; message: string }>('/api/v1/code/wipe-data', {
        method: 'POST',
      });
      this.clearCache();
      return res.data;
    },

    // Repository-level scan trigger (via existing github endpoint)
    triggerRepositoryScan: async (repositoryId: string, branch?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/github/repositories/${repositoryId}/scans`, {
        method: 'POST',
        body: JSON.stringify({ branch: branch || 'main', event_type: 'manual_scan' }),
      });
      return res.data;
    },

    // Connect repository and trigger security scan directly in Thing Code
    connectRepository: async (payload: { repo_url: string; default_branch?: string; private?: boolean; trigger_scan?: boolean; project_id?: string }): Promise<any> => {
      const q = payload.project_id ? `?project_id=${payload.project_id}` : '';
      const res = await this.request<any>(`/api/v1/code/repositories${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 120000,
      });
      this.invalidateCache('/api/v1/code/overview');
      this.invalidateCache('/api/v1/code/repository-health');
      this.invalidateCache('/api/v1/code/coverage');
      this.invalidateCache('/api/v1/code/attention');
      this.invalidateCache('/api/v1/code/repositories');
      return res.data;
    },

    deleteRepository: async (repositoryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/code/repository-health');
      return res.data;
    },

    // Get scan job status
    getScanJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/github/security-jobs/${jobId}`);
      return res.data;
    },

    // Get active or latest scan for repository (for page reload recovery)
    getActiveScan: async (repositoryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}/active-scan`);
      return res.data;
    },

    // List all security verification jobs for repository
    repositoryJobs: async (repositoryId: string, limit = 50): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}/jobs?limit=${limit}`);
      return res.data || [];
    },

    // Cancel a running or queued scan job
    cancelScanJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/security-jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
      });
      return res.data;
    },

    // Repository Details
    repositoryDetail: async (repositoryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}`);
      return res.data;
    },

    // Repository File Tree
    repositoryTree: async (repositoryId: string, branch: string = 'main'): Promise<any> => {
      const q = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await this.request<any>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}/tree${q}`);
      return res.data;
    },

    // Repository File Content & Findings
    repositoryFile: async (repositoryId: string, path: string, branch: string = 'main'): Promise<any> => {
      const q = `?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`;
      const res = await this.request<any>(`/api/v1/code/repositories/${encodeURIComponent(repositoryId)}/file${q}`);
      return res.data;
    },

    // Repository Commits
    commits: async (repositoryId: string, limit: number = 20): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/github/repositories/${encodeURIComponent(repositoryId)}/commits?limit=${limit}`);
      return res.data;
    },


    // Pull Requests per Repository
    pullRequests: async (repositoryId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/github/repositories/${encodeURIComponent(repositoryId)}/pull-requests`);
      return res.data;
    },

    // Rescan Pull Request
    rescanPullRequest: async (pullRequestId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/github/pull-requests/${encodeURIComponent(pullRequestId)}/rescan`, {
        method: 'POST',
      });
      return res.data;
    },

    // Finding Detail
    findingDetail: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/findings/${encodeURIComponent(findingId)}`);
      return res.data;
    },

    // Finding Remediation & Suggestions
    getFindingRemediation: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/findings/${encodeURIComponent(findingId)}/remediation`);
      return res.data;
    },

    generateRemediation: async (findingId: string, payload?: { mode?: string; instructions?: string } | any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/findings/${encodeURIComponent(findingId)}/remediation/generate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    applyRemediation: async (findingId: string, payload?: any): Promise<any> => {
      const bodyPayload = typeof payload === 'string' ? { mode: payload, suggestion_id: payload } : (payload || {});
      const res = await this.request<any>(`/api/v1/code/findings/${encodeURIComponent(findingId)}/remediation/apply`, {
        method: 'POST',
        body: JSON.stringify(bodyPayload),
      });
      return res.data;
    },

    createRemediationPR: async (findingId: string, payload?: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/findings/${encodeURIComponent(findingId)}/remediation/create-pr`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    remediationProposals: async (params?: { limit?: number; offset?: number; projectId?: string; repository?: string }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.repository) q.set('repository', params.repository);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/scans/remediation${qs}`);
      return res.data ?? [];
    },

    autofixOverview: async (params?: { projectId?: string; repositoryId?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/autofix/overview${qs}`);
      return res.data;
    },

    autofixProposals: async (params?: {
      status?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
      projectId?: string;
      repositoryId?: string;
    }): Promise<{ total: number; items: any[] }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.sort) q.set('sort', params.sort);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/code/autofix/proposals${qs}`);
      return res.data;
    },

    generateAutofix: async (payload?: { finding_ids?: string[]; project_id?: string; repository_id?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/autofix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    validateAutofixProposal: async (proposalId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/validate`, {
        method: 'POST',
      });
      return res.data;
    },

    createAutofixPR: async (proposalId: string, payload?: { branch_name?: string; pr_title?: string; pr_body?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    dismissAutofixProposal: async (proposalId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/dismiss`, {
        method: 'POST',
      });
      return res.data;
    },

    batchFixAutofix: async (payload?: { proposal_ids?: string[]; finding_ids?: string[]; project_id?: string; repository_id?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/autofix/batch-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    restoreAutofixProposal: async (proposalId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/restore`, {
        method: 'POST',
      });
      return res.data;
    },

    syncVcs: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/autofix/sync-vcs', {
        method: 'POST',
      });
      return res.data;
    },

    // AI Security Controls (/code/ai-security)
    aiSecurityOverview: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/code/ai-security/overview${q}`);
      return res.data;
    },

    aiSecurityAgents: async (projectId?: string | null): Promise<{ total: number; items: any[] }> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/code/ai-security/agents${q}`);
      return res.data;
    },

    registerAiAgent: async (payload: {
      name: string;
      agent_type?: string;
      trust_level?: string;
      description?: string;
      project_id?: string | null;
      repository_id?: string | null;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/ai-security/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteAiAgent: async (agentId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/ai-security/agents/${encodeURIComponent(agentId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    aiSecurityToolPermissions: async (projectId?: string | null): Promise<{ total: number; items: any[] }> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/code/ai-security/tool-permissions${q}`);
      return res.data;
    },

    configureToolPermission: async (payload: {
      tool_name: string;
      effect: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
      reason?: string;
      agent_id?: string | null;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/ai-security/tool-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    aiSecurityPolicies: async (projectId?: string | null): Promise<{ total: number; items: any[] }> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/code/ai-security/policies${q}`);
      return res.data;
    },

    aiSecurityAuditLogs: async (params?: { limit?: number; offset?: number; agentId?: string }): Promise<{ total: number; items: any[] }> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.agentId) q.set('agent_id', params.agentId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/code/ai-security/audit-logs${qs}`);
      return res.data;
    },

    // Secrets Overview (/code/secrets)
    secretsOverview: async (params?: {
      projectId?: string | null;
      repositoryId?: string | null;
      dateRange?: string;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.repositoryId) q.append('repository_id', params.repositoryId);
      if (params?.dateRange) q.append('date_range', params.dateRange);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/secrets/overview${qs}`);
      return res.data;
    },

    secretsInventory: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/code/secrets/inventory${q}`);
      return res.data;
    },

    secretsPolicies: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/code/secrets/policies${q}`);
      return res.data;
    },

    createSecretsPolicy: async (payload: { name: string; description: string; scanner?: string; severity?: string; action?: string; enabled?: boolean; project_id?: string }): Promise<any> => {
      const q = payload.project_id ? `?project_id=${encodeURIComponent(payload.project_id)}` : '';
      const res = await this.request<any>(`/api/v1/code/secrets/policies${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    triggerSecretScan: async (payload?: { repositoryId?: string; branch?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/scan`, {
        method: 'POST',
        body: JSON.stringify({
          repository: payload?.repositoryId,
          repository_id: payload?.repositoryId,
          branch: payload?.branch || 'main',
        }),
      });
      return res.data;
    },

    // Secret Remediation (/code/secrets/remediation)
    secretRemediationMetrics: async (): Promise<SecretRemediationMetrics> => {
      const res = await this.request<SecretRemediationMetrics>('/api/v1/code/secrets/remediation/metrics');
      return res.data;
    },

    secretRemediationFindings: async (params?: {
      tab?: string;
      severity?: string;
      secret_type?: string;
      repository?: string;
      status?: string;
      search?: string;
      sort?: string;
      page?: number;
      page_size?: number;
    }): Promise<SecretRemediationFindingsResponse> => {
      const q = new URLSearchParams();
      if (params?.tab) q.append('tab', params.tab);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.secret_type) q.append('secret_type', params.secret_type);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      if (params?.sort) q.append('sort', params.sort);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecretRemediationFindingsResponse>(`/api/v1/code/secrets/remediation/findings${qs}`);
      return res.data;
    },

    updateSecretRemediationStatus: async (findingId: string, status: string, reason?: string): Promise<SecretRemediationItem> => {
      const res = await this.request<SecretRemediationItem>(`/api/v1/code/secrets/remediation/findings/${encodeURIComponent(findingId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      return res.data;
    },

    createSecretRemediationPR: async (findingId: string, payload?: any): Promise<RemediationPRResponse> => {
      const res = await this.request<RemediationPRResponse>(`/api/v1/code/secrets/remediation/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return res.data;
    },

    bulkRemediateSecrets: async (payload: BulkRemediateRequest): Promise<BulkRemediateResponse> => {
      const res = await this.request<BulkRemediateResponse>('/api/v1/code/secrets/remediation/bulk-remediate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getSecretRemediationSettings: async (): Promise<RemediationSettings> => {
      const res = await this.request<RemediationSettings>('/api/v1/code/secrets/remediation/settings');
      return res.data;
    },

    updateSecretRemediationSettings: async (payload: RemediationSettings): Promise<RemediationSettings> => {
      const res = await this.request<RemediationSettings>('/api/v1/code/secrets/remediation/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    // Secret Inventory (/code/secrets/inventory)
    secretInventoryMetrics: async (): Promise<SecretInventoryMetrics> => {
      const res = await this.request<SecretInventoryMetrics>('/api/v1/code/secrets/inventory/metrics');
      return res.data;
    },

    secretInventoryTable: async (params?: {
      search?: string;
      secret_type?: string;
      severity?: string;
      repository?: string;
      status?: string;
      date_range?: string;
      page?: number;
      page_size?: number;
    }): Promise<SecretInventoryTableResponse> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.secret_type) q.append('secret_type', params.secret_type);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.status) q.append('status', params.status);
      if (params?.date_range) q.append('date_range', params.date_range);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecretInventoryTableResponse>(`/api/v1/code/secrets/inventory/table${qs}`);
      return res.data;
    },

    secretInventoryDetail: async (secretId: string): Promise<SecretInventoryRow> => {
      const res = await this.request<SecretInventoryRow>(`/api/v1/code/secrets/inventory/detail/${encodeURIComponent(secretId)}`);
      return res.data;
    },

    updateSecretInventoryStatus: async (secretId: string, status: string, reason?: string): Promise<SecretInventoryRow> => {
      const res = await this.request<SecretInventoryRow>(`/api/v1/code/secrets/inventory/${encodeURIComponent(secretId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      return res.data;
    },

    addSecretInventoryPolicy: async (payload: AddInventoryPolicyRequest): Promise<AddInventoryPolicyResponse> => {
      const res = await this.request<AddInventoryPolicyResponse>('/api/v1/code/secrets/inventory/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    exportSecretInventory: async (format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/inventory/export?format=${encodeURIComponent(format)}`);
      return res.data;
    },

    // Secret Detections (/code/secrets/detections)
    secretDetectionsOverview: async (): Promise<SecretDetectionsOverviewResponse> => {
      const res = await this.request<SecretDetectionsOverviewResponse>('/api/v1/code/secrets/detections/overview');
      return res.data;
    },

    secretDetectionsTable: async (params?: {
      search?: string;
      repository?: string;
      secret_type?: string;
      severity?: string;
      status?: string;
      date_range?: string;
      page?: number;
      page_size?: number;
    }): Promise<SecretDetectionsTableResponse> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.secret_type) q.append('secret_type', params.secret_type);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.date_range) q.append('date_range', params.date_range);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecretDetectionsTableResponse>(`/api/v1/code/secrets/detections/table${qs}`);
      return res.data;
    },

    secretDetectionDetail: async (detectionId: string): Promise<SecretDetectionsItem> => {
      const res = await this.request<SecretDetectionsItem>(`/api/v1/code/secrets/detections/detail/${encodeURIComponent(detectionId)}`);
      return res.data;
    },

    updateSecretDetectionStatus: async (detectionId: string, status: string, reason?: string): Promise<SecretDetectionsItem> => {
      const res = await this.request<SecretDetectionsItem>(`/api/v1/code/secrets/detections/${encodeURIComponent(detectionId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
      return res.data;
    },

    exportSecretDetections: async (format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/detections/export?format=${encodeURIComponent(format)}`);
      return res.data;
    },

    triggerNewSecretScan: async (payload: { repository: string; branch?: string; scan_type?: string; scope?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/secrets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_id: payload.repository,
          branch: payload.branch || 'main',
          scan_type: payload.scan_type || 'Full Secret Scan',
          scope: payload.scope || 'full',
        }),
      });
      return res.data;
    },

    // Secret Repositories & Mapping (/code/secrets/repositories)
    secretRepositoriesOverview: async (): Promise<SecretRepositoriesOverviewResponse> => {
      const res = await this.request<SecretRepositoriesOverviewResponse>('/api/v1/code/secrets/repositories/overview');
      return res.data;
    },

    secretRepositoriesTable: async (params?: {
      search?: string;
      visibility?: string;
      risk_level?: string;
      secret_type?: string;
      scan_status?: string;
      page?: number;
      page_size?: number;
    }): Promise<SecretRepositoriesTableResponse> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.visibility) q.append('visibility', params.visibility);
      if (params?.risk_level) q.append('risk_level', params.risk_level);
      if (params?.secret_type) q.append('secret_type', params.secret_type);
      if (params?.scan_status) q.append('scan_status', params.scan_status);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecretRepositoriesTableResponse>(`/api/v1/code/secrets/repositories/table${qs}`);
      return res.data;
    },

    secretRepositoryDetail: async (repoIdOrName: string): Promise<SecretRepositoryRow> => {
      const res = await this.request<SecretRepositoryRow>(`/api/v1/code/secrets/repositories/detail/${encodeURIComponent(repoIdOrName)}`);
      return res.data;
    },

    triggerSecretRepositoryScan: async (payload: TriggerRepoScanRequest): Promise<TriggerRepoScanResponse> => {
      const res = await this.request<TriggerRepoScanResponse>('/api/v1/code/secrets/repositories/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    exportSecretRepositories: async (format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/repositories/export?format=${encodeURIComponent(format)}`);
      return res.data;
    },

    activeSecretScan: async (): Promise<{ has_active_scan: boolean; job: any }> => {
      const res = await this.request<any>('/api/v1/code/secrets/scans/active');
      return res.data;
    },

    secretScanStatus: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/scans/status/${encodeURIComponent(jobId)}`);
      return res.data;
    },

    // Get repositories for a project via GitHub integration
    projectGithubRepositories: async (projectId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${projectId}/github/repositories`);
      return res.data;
    },

    // Get verifiable code evidence records
    evidence: async (params?: { projectId?: string | null; source?: string; limit?: number; offset?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.source) q.append('source', params.source);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/code/evidence${qs}`);
      return res.data;
    },

    getFile: async (repositoryId: string, path: string, branch = 'main'): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/code/repositories/${repositoryId}/file?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`
      );
      return res.data;
    },

    deleteJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/github/security-jobs/${jobId}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    // Load all findings from same scan for the left sidebar (sibling navigation)
    findingsInScan: async (scanId: string, limit = 100): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/findings?scan_id=${encodeURIComponent(scanId)}&limit=${limit}`);
      return res.data;
    },

    applyFindingFix: async (findingId: string, suggestionId?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}/apply-fix`, {
        method: 'POST',
        body: JSON.stringify({ suggestion_id: suggestionId || null }),
      });
      return res.data;
    },

    testFindingFix: async (findingId: string, suggestionId?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}/test-fix`, {
        method: 'POST',
        body: JSON.stringify({ suggestion_id: suggestionId || null }),
      });
      return res.data;
    },

    createFindingPR: async (findingId: string, payload?: { suggestion_id?: string; title?: string; branch?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    // Policies & Compliance (/code/settings/policies & /code/policies)
    policyComplianceOverview: async (): Promise<PolicyComplianceOverviewResponse> => {
      const res = await this.request<PolicyComplianceOverviewResponse>('/api/v1/code/settings/policies/overview');
      return res.data;
    },

    securityPoliciesTable: async (params?: {
      search?: string;
      policy_type?: string;
      scope?: string;
      status?: string;
      compliance?: string;
      page?: number;
      page_size?: number;
    }): Promise<SecurityPoliciesTableResponse> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.policy_type) q.append('policy_type', params.policy_type);
      if (params?.scope) q.append('scope', params.scope);
      if (params?.status) q.append('status', params.status);
      if (params?.compliance) q.append('compliance', params.compliance);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecurityPoliciesTableResponse>(`/api/v1/code/settings/policies/table${qs}`);
      return res.data;
    },

    securityPolicyDetail: async (policyId: string): Promise<SecurityPolicyRow> => {
      const res = await this.request<SecurityPolicyRow>(`/api/v1/code/settings/policies/detail/${encodeURIComponent(policyId)}`);
      return res.data;
    },

    createSecurityPolicy: async (payload: CreateSecurityPolicyRequest): Promise<SecurityPolicyRow> => {
      const res = await this.request<SecurityPolicyRow>('/api/v1/code/settings/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    updateSecurityPolicy: async (policyId: string, payload: UpdateSecurityPolicyRequest): Promise<SecurityPolicyRow> => {
      const res = await this.request<SecurityPolicyRow>(`/api/v1/code/settings/policies/${encodeURIComponent(policyId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    enforceAllPolicies: async (): Promise<EnforceAllPoliciesResponse> => {
      const res = await this.request<EnforceAllPoliciesResponse>('/api/v1/code/settings/policies/enforce-all', {
        method: 'POST',
      });
      return res.data;
    },

    updatePolicyEnforcementSettings: async (payload: PolicyEnforcementSettings): Promise<PolicyEnforcementSettings> => {
      const res = await this.request<PolicyEnforcementSettings>('/api/v1/code/settings/policies/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    policyTemplates: async (): Promise<PolicyTemplateItem[]> => {
      const res = await this.request<PolicyTemplateItem[]>('/api/v1/code/settings/policies/templates');
      return res.data;
    },

    exportSecurityPolicies: async (format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/settings/policies/export?format=${encodeURIComponent(format)}`);
      return res.data;
    },

    complianceFrameworks: async (): Promise<ComplianceFrameworkItem[]> => {
      const res = await this.request<ComplianceFrameworkItem[]>('/api/v1/code/settings/compliance');
      return res.data;
    },

    // Secrets Integrations & Rotation (/code/secrets/integrations)
    secretIntegrationsOverview: async (): Promise<SecretIntegrationsOverviewResponse> => {
      const res = await this.request<SecretIntegrationsOverviewResponse>('/api/v1/code/secrets/integrations/overview');
      return res.data;
    },

    getRotationRules: async (params?: { search?: string; secret_type?: string; status?: string }): Promise<SecretRotationRuleItem[]> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.secret_type) q.append('secret_type', params.secret_type);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<SecretRotationRuleItem[]>(`/api/v1/code/secrets/rotation/rules${qs}`);
      return res.data;
    },

    createRotationRule: async (payload: CreateRotationRuleRequest): Promise<SecretRotationRuleItem> => {
      const res = await this.request<SecretRotationRuleItem>('/api/v1/code/secrets/rotation/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    updateRotationRule: async (ruleId: string, payload: UpdateRotationRuleRequest): Promise<SecretRotationRuleItem> => {
      const res = await this.request<SecretRotationRuleItem>(`/api/v1/code/secrets/rotation/rules/${encodeURIComponent(ruleId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    triggerRuleRotation: async (ruleId: string): Promise<TriggerRuleRotationResponse> => {
      const res = await this.request<TriggerRuleRotationResponse>(`/api/v1/code/secrets/rotation/rules/${encodeURIComponent(ruleId)}/rotate`, {
        method: 'POST',
      });
      return res.data;
    },

    connectIntegrationTool: async (payload: ConnectIntegrationRequest): Promise<ConnectedToolCard> => {
      const res = await this.request<ConnectedToolCard>('/api/v1/code/secrets/integrations/connect', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    syncIntegrationTool: async (toolId: string): Promise<ConnectedToolCard> => {
      const res = await this.request<ConnectedToolCard>(`/api/v1/code/secrets/integrations/${encodeURIComponent(toolId)}/sync`, {
        method: 'POST',
      });
      return res.data;
    },

    updateIntegrationConfig: async (payload: UpdateIntegrationConfigRequest): Promise<SecretsIntegrationConfig> => {
      const res = await this.request<SecretsIntegrationConfig>('/api/v1/code/secrets/integrations/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getRotationSettings: async (): Promise<RotationGlobalSettings> => {
      const res = await this.request<RotationGlobalSettings>('/api/v1/code/secrets/rotation/settings');
      return res.data;
    },

    updateRotationSettings: async (payload: RotationGlobalSettings): Promise<RotationGlobalSettings> => {
      const res = await this.request<RotationGlobalSettings>('/api/v1/code/secrets/rotation/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    exportSecretIntegrations: async (format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/integrations/export?format=${encodeURIComponent(format)}`);
      return res.data;
    },

    createSecretPolicy: async (payload: { name: string; description: string; scanner?: string; severity?: string; action?: string; enabled?: boolean }): Promise<import('@/types/api/secrets').SecretPolicyItem> => {
      const res = await this.request<import('@/types/api/secrets').SecretPolicyItem>('/api/v1/code/secrets/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    secretScanMetrics: async (params?: { projectId?: string; dateRange?: string }): Promise<import('@/types/api/secrets').SecretScanMetricsResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.dateRange) q.set('date_range', params.dateRange);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/secrets').SecretScanMetricsResponse>(`/api/v1/code/secrets/scans/metrics${qs}`);
      return res.data;
    },

    secretScans: async (params?: {
      repository?: string;
      branch?: string;
      scanType?: string;
      status?: string;
      search?: string;
      dateRange?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/secrets').SecretScansTableResponse> => {
      const q = new URLSearchParams();
      if (params?.repository) q.set('repository', params.repository);
      if (params?.branch) q.set('branch', params.branch);
      if (params?.scanType) q.set('scan_type', params.scanType);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.dateRange) q.set('date_range', params.dateRange);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/secrets').SecretScansTableResponse>(`/api/v1/code/secrets/scans${qs}`);
      return res.data;
    },

    secretScanConfig: async (): Promise<import('@/types/api/secrets').SecretScanConfig> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanConfig>('/api/v1/code/secrets/scans/config');
      return res.data;
    },

    updateSecretScanConfig: async (payload: import('@/types/api/secrets').SecretScanConfig): Promise<import('@/types/api/secrets').SecretScanConfig> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanConfig>('/api/v1/code/secrets/scans/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    secretScanIntegrations: async (): Promise<import('@/types/api/secrets').SecretScanIntegrationItem[]> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanIntegrationItem[]>('/api/v1/code/secrets/scans/integrations');
      return res.data;
    },

    toggleSecretScanIntegration: async (id: string, enabled: boolean): Promise<import('@/types/api/secrets').SecretScanIntegrationItem[]> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanIntegrationItem[]>('/api/v1/code/secrets/scans/integrations/toggle', {
        method: 'POST',
        body: JSON.stringify({ id, enabled }),
      });
      return res.data;
    },

    secretScanActivity: async (): Promise<import('@/types/api/secrets').SecretScanActivityItem[]> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanActivityItem[]>('/api/v1/code/secrets/scans/activity');
      return res.data;
    },

    scheduleSecretScan: async (payload: import('@/types/api/secrets').ScheduleSecretScanRequest): Promise<import('@/types/api/secrets').SecretScanConfig> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanConfig>('/api/v1/code/secrets/scans/schedule', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    secretScanDetail: async (scanId: string): Promise<import('@/types/api/secrets').SecretScanDetailResponse> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanDetailResponse>(`/api/v1/code/secrets/scans/${encodeURIComponent(scanId)}`);
      return res.data;
    },

    rescanSecretScan: async (scanId: string): Promise<import('@/types/api/secrets').SecretScanDetailResponse> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanDetailResponse>(`/api/v1/code/secrets/scans/${encodeURIComponent(scanId)}/rescan`, {
        method: 'POST',
      });
      return res.data;
    },

    resolveSecretFinding: async (scanId: string, findingId: string, resolved: boolean): Promise<import('@/types/api/secrets').SecretScanFindingDetailItem> => {
      const res = await this.request<import('@/types/api/secrets').SecretScanFindingDetailItem>(`/api/v1/code/secrets/scans/${encodeURIComponent(scanId)}/findings/${encodeURIComponent(findingId)}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolved }),
      });
      return res.data;
    },

    createFindingRemediationPR: async (scanId: string, findingId: string, payload?: { branch_name?: string; title?: string; body?: string }): Promise<import('@/types/api/secrets').RemediationPRResponse> => {
      const res = await this.request<import('@/types/api/secrets').RemediationPRResponse>(`/api/v1/code/secrets/scans/${encodeURIComponent(scanId)}/findings/${encodeURIComponent(findingId)}/remediation-pr`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    downloadSecretScanReport: async (scanId: string, format = 'json'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/code/secrets/scans/${encodeURIComponent(scanId)}/report?format=${format}`);
      return res.data;
    },

    secretRemediationFindingDetail: async (findingId: string): Promise<import('@/types/api/secrets').SecretRemediationItem> => {
      const res = await this.request<import('@/types/api/secrets').SecretRemediationItem>(`/api/v1/code/secrets/remediation/findings/${encodeURIComponent(findingId)}`);
      return res.data;
    },

    secretDetailFull: async (secretId: string): Promise<import('@/types/api/secrets').SecretDetailResponse> => {
      const res = await this.request<import('@/types/api/secrets').SecretDetailResponse>(`/api/v1/code/secrets/inventory/detail/${encodeURIComponent(secretId)}/full`);
      return res.data;
    },

    revokeSecretKey: async (secretId: string): Promise<import('@/types/api/secrets').RevokeSecretKeyResponse> => {
      const res = await this.request<import('@/types/api/secrets').RevokeSecretKeyResponse>(
        `/api/v1/code/secrets/inventory/${encodeURIComponent(secretId)}/revoke`,
        {
          method: 'POST',
        }
      );
      return res.data;
    },

    rotateSecretKey: async (secretId: string): Promise<import('@/types/api/secrets').RotateSecretKeyResponse> => {
      const res = await this.request<import('@/types/api/secrets').RotateSecretKeyResponse>(
        `/api/v1/code/secrets/inventory/${encodeURIComponent(secretId)}/rotate`,
        {
          method: 'POST',
        }
      );
      return res.data;
    },

    secretDetectionDetailFull: async (detectionId: string): Promise<import('@/types/api/secrets').SecretDetectionDetailResponse> => {
      const res = await this.request<import('@/types/api/secrets').SecretDetectionDetailResponse>(`/api/v1/code/secrets/detections/detail/${encodeURIComponent(detectionId)}/full`);
      return res.data;
    },

    // =========================================================================
    // DEPENDENCIES APIS
    // =========================================================================
    dependencies: {
      overview: async (projectId?: string | null, repositoryId?: string | null): Promise<import('@/types/api/dependencies').DependenciesOverviewResponse> => {
        const params = new URLSearchParams();
        if (projectId) params.append('project_id', projectId);
        if (repositoryId && repositoryId !== 'all' && repositoryId !== 'All Repositories') {
          params.append('repository_id', repositoryId);
        }
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependenciesOverviewResponse>(`/api/v1/code/dependencies/overview${qs}`);
        return res.data;
      },

      trends: async (params?: { projectId?: string | null; repositoryId?: string | null; timeRange?: string }): Promise<import('@/types/api/dependencies').DependencyTrendsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId && params.repositoryId !== 'all' && params.repositoryId !== 'All Repositories') {
          q.append('repository_id', params.repositoryId);
        }
        if (params?.timeRange) q.append('time_range', params.timeRange);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyTrendsResponse>(`/api/v1/code/dependencies/trends${qs}`);
        return res.data;
      },

      critical: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        severity?: string;
        ecosystem?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').CriticalDependenciesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId && params.repositoryId !== 'all' && params.repositoryId !== 'All Repositories') {
          q.append('repository_id', params.repositoryId);
        }
        if (params?.severity) q.append('severity', params.severity);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').CriticalDependenciesResponse>(`/api/v1/code/dependencies/critical${qs}`);
        return res.data;
      },

      outdated: async (params?: {
        projectId?: string | null;
        driftType?: string;
        ecosystem?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').OutdatedPackagesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.driftType) q.append('drift_type', params.driftType);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').OutdatedPackagesResponse>(`/api/v1/code/dependencies/outdated${qs}`);
        return res.data;
      },

      coverage: async (params?: {
        projectId?: string | null;
        search?: string;
        status?: string;
      }): Promise<import('@/types/api/dependencies').DependencyCoveragePageResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.status) q.append('status', params.status);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyCoveragePageResponse>(`/api/v1/code/dependencies/coverage${qs}`);
        return res.data;
      },

      triggerScan: async (payload: { repository_id: string; branch?: string }): Promise<import('@/types/api/dependencies').TriggerDependencyScanResponse> => {
        const res = await this.request<import('@/types/api/dependencies').TriggerDependencyScanResponse>('/api/v1/code/dependencies/scan', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      inventory: async (params?: {
        projectId?: string | null;
        search?: string;
        ecosystem?: string;
        license?: string;
        securityStatus?: string;
        repoId?: string;
        dependencyType?: string;
        limit?: number;
        offset?: number;
        selectedId?: string;
      }): Promise<import('@/types/api/dependencies').DependencyInventoryResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.license) q.append('license', params.license);
        if (params?.securityStatus) q.append('security_status', params.securityStatus);
        if (params?.repoId) q.append('repo_id', params.repoId);
        if (params?.dependencyType) q.append('dependency_type', params.dependencyType);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        if (params?.selectedId) q.append('selected_id', params.selectedId);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyInventoryResponse>(`/api/v1/code/dependencies/inventory${qs}`);
        return res.data;
      },

      detail: async (dependencyId: string, projectId?: string | null): Promise<import('@/types/api/dependencies').DependencyDetailResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyDetailResponse>(`/api/v1/code/dependencies/inventory/${encodeURIComponent(dependencyId)}${q}`);
        return res.data;
      },

      direct: async (params?: {
        projectId?: string | null;
        search?: string;
        ecosystem?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').DependencyInventoryResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyInventoryResponse>(`/api/v1/code/dependencies/direct${qs}`);
        return res.data;
      },

      transitive: async (params?: {
        projectId?: string | null;
        search?: string;
        ecosystem?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').DependencyInventoryResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyInventoryResponse>(`/api/v1/code/dependencies/transitive${qs}`);
        return res.data;
      },

      usage: async (params?: {
        projectId?: string | null;
        packageName?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').DependencyUsageResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.packageName) q.append('package_name', params.packageName);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset != null) q.append('offset', params.offset.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyUsageResponse>(`/api/v1/code/dependencies/usage${qs}`);
        return res.data;
      },

      duplicates: async (projectId?: string | null): Promise<import('@/types/api/dependencies').DuplicatePackagesResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').DuplicatePackagesResponse>(`/api/v1/code/dependencies/duplicates${q}`);
        return res.data;
      },

      vulnerabilities: async (params?: {
        projectId?: string | null;
        severity?: string;
        ecosystem?: string;
        hasFix?: boolean;
        search?: string;
        selectedCveId?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').VulnerabilityAnalysisResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.hasFix !== undefined) q.append('has_fix', String(params.hasFix));
        if (params?.search) q.append('search', params.search);
        if (params?.selectedCveId) q.append('selected_cve_id', params.selectedCveId);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').VulnerabilityAnalysisResponse>(`/api/v1/code/dependencies/vulnerabilities${qs}`);
        return res.data;
      },

      criticalHigh: async (params?: {
        projectId?: string | null;
        ecosystem?: string;
        hasFix?: boolean;
        search?: string;
        selectedCveId?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').VulnerabilityAnalysisResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.hasFix !== undefined) q.append('has_fix', String(params.hasFix));
        if (params?.search) q.append('search', params.search);
        if (params?.selectedCveId) q.append('selected_cve_id', params.selectedCveId);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').VulnerabilityAnalysisResponse>(`/api/v1/code/dependencies/vulnerabilities/severity${qs}`);
        return res.data;
      },

      affectedPackages: async (params?: {
        projectId?: string | null;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').AffectedPackagesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').AffectedPackagesResponse>(`/api/v1/code/dependencies/vulnerabilities/affected-packages${qs}`);
        return res.data;
      },

      fixAvailable: async (params?: {
        projectId?: string | null;
        severity?: string;
        ecosystem?: string;
        search?: string;
        selectedCveId?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').VulnerabilityAnalysisResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.selectedCveId) q.append('selected_cve_id', params.selectedCveId);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').VulnerabilityAnalysisResponse>(`/api/v1/code/dependencies/vulnerabilities/fix-available${qs}`);
        return res.data;
      },

      knownExploited: async (params?: {
        projectId?: string | null;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').KnownExploitedResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').KnownExploitedResponse>(`/api/v1/code/dependencies/vulnerabilities/known-exploited${qs}`);
        return res.data;
      },

      cveDetail: async (cveId: string, projectId?: string | null): Promise<import('@/types/api/dependencies').VulnerabilityDetailResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').VulnerabilityDetailResponse>(`/api/v1/code/dependencies/vulnerabilities/${encodeURIComponent(cveId)}${q}`);
        return res.data;
      },

      versions: async (params?: {
        projectId?: string | null;
        ecosystem?: string;
        versionStatus?: string;
        upgradeAvailable?: string;
        search?: string;
        selectedPackageId?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').PackageVersionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.versionStatus) q.append('version_status', params.versionStatus);
        if (params?.upgradeAvailable) q.append('upgrade_available', params.upgradeAvailable);
        if (params?.search) q.append('search', params.search);
        if (params?.selectedPackageId) q.append('selected_package_id', params.selectedPackageId);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageVersionsResponse>(`/api/v1/code/dependencies/versions${qs}`);
        return res.data;
      },

      outdatedVersions: async (params?: {
        projectId?: string | null;
        ecosystem?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').PackageVersionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageVersionsResponse>(`/api/v1/code/dependencies/versions/outdated${qs}`);
        return res.data;
      },

      upgrades: async (params?: {
        projectId?: string | null;
        ecosystem?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').PackageVersionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageVersionsResponse>(`/api/v1/code/dependencies/versions/upgrades${qs}`);
        return res.data;
      },

      breakingChanges: async (params?: {
        projectId?: string | null;
        ecosystem?: string;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').BreakingChangesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').BreakingChangesResponse>(`/api/v1/code/dependencies/versions/breaking-changes${qs}`);
        return res.data;
      },

      eol: async (params?: {
        projectId?: string | null;
        search?: string;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').EolPackagesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').EolPackagesResponse>(`/api/v1/code/dependencies/versions/eol${qs}`);
        return res.data;
      },
      ecosystems: async (params?: { projectId?: string | null; timeRange?: string }): Promise<import('@/types/api/dependencies').EcosystemsOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.timeRange) q.append('time_range', params.timeRange);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').EcosystemsOverviewResponse>(`/api/v1/code/dependencies/ecosystems${qs}`);
        return res.data;
      },
      ecosystemDetail: async (
        ecosystemSlug: string,
        params?: { projectId?: string | null; search?: string; limit?: number; offset?: number }
      ): Promise<import('@/types/api/dependencies').EcosystemDetailResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').EcosystemDetailResponse>(
          `/api/v1/code/dependencies/ecosystems/${encodeURIComponent(ecosystemSlug)}${qs}`
        );
        return res.data;
      },
      graph: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        branch?: string | null;
        ecosystem?: string | null;
        viewType?: string | null;
        riskLevel?: string | null;
        search?: string | null;
        selectedId?: string | null;
      }): Promise<import('@/types/api/dependencies').DependencyGraphResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId) q.append('repository_id', params.repositoryId);
        if (params?.branch) q.append('branch', params.branch);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.viewType) q.append('view_type', params.viewType);
        if (params?.riskLevel) q.append('risk_level', params.riskLevel);
        if (params?.search) q.append('search', params.search);
        if (params?.selectedId) q.append('selected_id', params.selectedId);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyGraphResponse>(
          `/api/v1/code/dependencies/graph${qs}`
        );
        return res.data;
      },
      relationships: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        search?: string | null;
        relationshipType?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').PackageRelationshipsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId) q.append('repository_id', params.repositoryId);
        if (params?.search) q.append('search', params.search);
        if (params?.relationshipType) q.append('relationship_type', params.relationshipType);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageRelationshipsResponse>(
          `/api/v1/code/dependencies/graph/relationships${qs}`
        );
        return res.data;
      },
      riskPaths: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        search?: string | null;
        severity?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').TransitiveRiskPathsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId) q.append('repository_id', params.repositoryId);
        if (params?.search) q.append('search', params.search);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').TransitiveRiskPathsResponse>(
          `/api/v1/code/dependencies/graph/risk-paths${qs}`
        );
        return res.data;
      },
      blastRadius: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        packageName?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').BlastRadiusResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId) q.append('repository_id', params.repositoryId);
        if (params?.packageName) q.append('package_name', params.packageName);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').BlastRadiusResponse>(
          `/api/v1/code/dependencies/graph/blast-radius${qs}`
        );
        return res.data;
      },
      upgradeImpact: async (params?: {
        projectId?: string | null;
        repositoryId?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').UpgradeImpactResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repositoryId) q.append('repository_id', params.repositoryId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').UpgradeImpactResponse>(
          `/api/v1/code/dependencies/graph/upgrade-impact${qs}`
        );
        return res.data;
      },
      licenses: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        timeRange?: string | null;
      }): Promise<import('@/types/api/dependencies').LicenseOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.timeRange) q.append('time_range', params.timeRange);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').LicenseOverviewResponse>(
          `/api/v1/code/dependencies/licenses${qs}`
        );
        return res.data;
      },
      licenseInventory: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
        licenseType?: string | null;
        complianceStatus?: string | null;
        ecosystem?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').LicenseInventoryResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        if (params?.licenseType) q.append('license_type', params.licenseType);
        if (params?.complianceStatus) q.append('compliance_status', params.complianceStatus);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').LicenseInventoryResponse>(
          `/api/v1/code/dependencies/licenses/inventory${qs}`
        );
        return res.data;
      },
      licenseViolations: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
        severity?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').LicenseViolationsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').LicenseViolationsResponse>(
          `/api/v1/code/dependencies/licenses/violations${qs}`
        );
        return res.data;
      },
      restrictedLicenses: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').RestrictedLicensesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').RestrictedLicensesResponse>(
          `/api/v1/code/dependencies/licenses/restricted${qs}`
        );
        return res.data;
      },
      licenseExceptions: async (params?: {
        projectId?: string | null;
        status?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').LicenseExceptionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.status) q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').LicenseExceptionsResponse>(
          `/api/v1/code/dependencies/licenses/exceptions${qs}`
        );
        return res.data;
      },
      createLicenseException: async (
        data: import('@/types/api/dependencies').CreateLicenseExceptionRequest,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').LicenseExceptionItem> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').LicenseExceptionItem>(
          `/api/v1/code/dependencies/licenses/exceptions${q}`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );
        return res.data;
      },
      health: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        timeRange?: string | null;
      }): Promise<import('@/types/api/dependencies').PackageHealthOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.timeRange) q.append('time_range', params.timeRange);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageHealthOverviewResponse>(
          `/api/v1/code/dependencies/health${qs}`
        );
        return res.data;
      },
      healthMaintenance: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        ecosystem?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').MaintenanceReleaseActivityResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').MaintenanceReleaseActivityResponse>(
          `/api/v1/code/dependencies/health/maintenance${qs}`
        );
        return res.data;
      },
      abandonedPackages: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
        minDaysInactive?: number;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').AbandonedPackagesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        if (params?.minDaysInactive) q.append('min_days_inactive', String(params.minDaysInactive));
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').AbandonedPackagesResponse>(
          `/api/v1/code/dependencies/health/abandoned${qs}`
        );
        return res.data;
      },
      packageReleases: async (params?: {
        packageName?: string | null;
        projectId?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').ReleaseVersionHistoryResponse> => {
        const q = new URLSearchParams();
        if (params?.packageName) q.append('package_name', params.packageName);
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').ReleaseVersionHistoryResponse>(
          `/api/v1/code/dependencies/health/releases${qs}`
        );
        return res.data;
      },
      packageTrustDetail: async (
        packageId: string,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').PackageTrustDetailResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageTrustDetailResponse>(
          `/api/v1/code/dependencies/health/${encodeURIComponent(packageId)}${q}`
        );
        return res.data;
      },
      remediation: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        branch?: string | null;
        status?: string | null;
        severity?: string | null;
        ecosystem?: string | null;
        search?: string | null;
        selectedId?: string | null;
      }): Promise<import('@/types/api/dependencies').DependencyRemediationOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.branch) q.append('branch', params.branch);
        if (params?.status) q.append('status', params.status);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        if (params?.selectedId) q.append('selected_id', params.selectedId);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyRemediationOverviewResponse>(
          `/api/v1/code/dependencies/remediation${qs}`
        );
        return res.data;
      },
      remediationUpgrades: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }): Promise<import('@/types/api/dependencies').UpgradeRecommendationsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        if (params?.limit) q.append('limit', String(params.limit));
        if (params?.offset != null) q.append('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').UpgradeRecommendationsResponse>(
          `/api/v1/code/dependencies/remediation/upgrades${qs}`
        );
        return res.data;
      },
      remediationDiff: async (
        remediationId: string,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').ManifestLockfileDiffResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').ManifestLockfileDiffResponse>(
          `/api/v1/code/dependencies/remediation/diff/${encodeURIComponent(remediationId)}${q}`
        );
        return res.data;
      },
      createFixPullRequest: async (
        data: import('@/types/api/dependencies').CreateFixPullRequestRequest,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').CreateFixPullRequestResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').CreateFixPullRequestResponse>(
          `/api/v1/code/dependencies/remediation/pull-requests${q}`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );
        return res.data;
      },
      verifyRemediation: async (
        data: import('@/types/api/dependencies').TriggerRemediationVerificationRequest,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').RemediationVerificationResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').RemediationVerificationResponse>(
          `/api/v1/code/dependencies/remediation/verification${q}`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );
        return res.data;
      },
      updateRemediationStatus: async (
        remediationId: string,
        data: import('@/types/api/dependencies').UpdateRemediationStatusRequest,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').RemediationQueueItem> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').RemediationQueueItem>(
          `/api/v1/code/dependencies/remediation/${encodeURIComponent(remediationId)}/status${q}`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        );
        return res.data;
      },
      sbom: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        branch?: string | null;
        ecosystem?: string | null;
        componentType?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').SBOMOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.branch) q.append('branch', params.branch);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.componentType) q.append('component_type', params.componentType);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').SBOMOverviewResponse>(
          `/api/v1/code/dependencies/sbom${qs}`
        );
        return res.data;
      },
      sbomComponentDetail: async (
        componentId: string,
        projectId?: string | null
      ): Promise<import('@/types/api/dependencies').SBOMComponentDetailResponse> => {
        const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        const res = await this.request<import('@/types/api/dependencies').SBOMComponentDetailResponse>(
          `/api/v1/code/dependencies/sbom/components/${encodeURIComponent(componentId)}${q}`
        );
        return res.data;
      },
      sbomRepositories: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').SBOMRepositoryMappingResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').SBOMRepositoryMappingResponse>(
          `/api/v1/code/dependencies/sbom/repositories${qs}`
        );
        return res.data;
      },
      sbomDiff: async (params?: {
        projectId?: string | null;
        sourceRef?: string | null;
        targetRef?: string | null;
      }): Promise<import('@/types/api/dependencies').SBOMVersionComparisonResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.sourceRef) q.append('source_ref', params.sourceRef);
        if (params?.targetRef) q.append('target_ref', params.targetRef);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').SBOMVersionComparisonResponse>(
          `/api/v1/code/dependencies/sbom/diff${qs}`
        );
        return res.data;
      },
      sbomExports: async (params?: {
        projectId?: string | null;
        repository?: string | null;
      }): Promise<import('@/types/api/dependencies').SBOMExportsProvenanceResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').SBOMExportsProvenanceResponse>(
          `/api/v1/code/dependencies/sbom/exports${qs}`
        );
        return res.data;
      },
      policies: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        branch?: string | null;
        policyType?: string | null;
        status?: string | null;
        scope?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').DependencyPoliciesOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.branch) q.append('branch', params.branch);
        if (params?.policyType) q.append('policy_type', params.policyType);
        if (params?.status) q.append('status', params.status);
        if (params?.scope) q.append('scope', params.scope);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyPoliciesOverviewResponse>(
          `/api/v1/code/dependencies/policies${qs}`
        );
        return res.data;
      },
      policyVulnerabilities: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        severity?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').VulnerabilityThresholdsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.severity) q.append('severity', params.severity);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').VulnerabilityThresholdsResponse>(
          `/api/v1/code/dependencies/policies/vulnerabilities${qs}`
        );
        return res.data;
      },
      policyPackageRules: async (params?: {
        projectId?: string | null;
        ruleType?: string | null;
        ecosystem?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').PackageRulesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ruleType) q.append('rule_type', params.ruleType);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PackageRulesResponse>(
          `/api/v1/code/dependencies/policies/package-rules${qs}`
        );
        return res.data;
      },
      policyVersions: async (params?: {
        projectId?: string | null;
        ecosystem?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').VersionRestrictionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.ecosystem) q.append('ecosystem', params.ecosystem);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').VersionRestrictionsResponse>(
          `/api/v1/code/dependencies/policies/versions${qs}`
        );
        return res.data;
      },
      policyExceptions: async (params?: {
        projectId?: string | null;
        status?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').PolicyExceptionsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.status) q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PolicyExceptionsResponse>(
          `/api/v1/code/dependencies/policies/exceptions${qs}`
        );
        return res.data;
      },
      cicd: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        branch?: string | null;
        status?: string | null;
        eventType?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').DependencyCICDOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.branch) q.append('branch', params.branch);
        if (params?.status) q.append('status', params.status);
        if (params?.eventType) q.append('event_type', params.eventType);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').DependencyCICDOverviewResponse>(
          `/api/v1/code/dependencies/ci-cd${qs}`
        );
        return res.data;
      },
      cicdPullRequests: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        status?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').PRDependencyChecksResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.status) q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PRDependencyChecksResponse>(
          `/api/v1/code/dependencies/ci-cd/pull-requests${qs}`
        );
        return res.data;
      },
      cicdBuilds: async (params?: {
        projectId?: string | null;
        repository?: string | null;
        status?: string | null;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').BuildScanResultsResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        if (params?.status) q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').BuildScanResultsResponse>(
          `/api/v1/code/dependencies/ci-cd/builds${qs}`
        );
        return res.data;
      },
      cicdQualityGates: async (params?: {
        projectId?: string | null;
        gateType?: string | null;
        activeOnly?: boolean;
        search?: string | null;
      }): Promise<import('@/types/api/dependencies').QualityGatesResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.gateType) q.append('gate_type', params.gateType);
        if (params?.activeOnly) q.append('active_only', 'true');
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').QualityGatesResponse>(
          `/api/v1/code/dependencies/ci-cd/quality-gates${qs}`
        );
        return res.data;
      },
      cicdSettings: async (params?: {
        projectId?: string | null;
        repository?: string | null;
      }): Promise<import('@/types/api/dependencies').PipelineConfigResponse> => {
        const q = new URLSearchParams();
        if (params?.projectId) q.append('project_id', params.projectId);
        if (params?.repository) q.append('repository', params.repository);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<import('@/types/api/dependencies').PipelineConfigResponse>(
          `/api/v1/code/dependencies/ci-cd/settings${qs}`
        );
        return res.data;
      },
    },
  };

  // =========================================================================
  // THING CLOUD — Cloud Infrastructure Security APIs
  // =========================================================================
  public cloud = {
    overview: async (projectId?: string | null): Promise<CloudOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudOverviewResponse>(`/api/v1/cloud/overview${q}`);
      return res.data;
    },

    connections: async (params?: { projectId?: string | null; provider?: string }): Promise<CloudConnectionsResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudConnectionsResponse>(`/api/v1/cloud/connections${qs}`);
      return res.data;
    },

    createConnection: async (payload: ConnectProviderRequest, projectId?: string | null): Promise<CloudConnectionItem> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudConnectionItem>(`/api/v1/cloud/connections${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    assets: async (params?: {
      projectId?: string | null;
      provider?: string;
      resourceType?: string;
      environment?: string;
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    }): Promise<CloudAssetsResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      if (params?.resourceType) q.append('resource_type', params.resourceType);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudAssetsResponse>(`/api/v1/cloud/assets${qs}`);
      return res.data;
    },

    assetDetail: async (assetId: string): Promise<CloudAssetDetailResponse> => {
      const res = await this.request<CloudAssetDetailResponse>(`/api/v1/cloud/assets/${encodeURIComponent(assetId)}`);
      return res.data;
    },

    findings: async (params?: {
      projectId?: string | null;
      severity?: string;
      provider?: string;
      findingType?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    }): Promise<CloudFindingsResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.provider) q.append('provider', params.provider);
      if (params?.findingType) q.append('finding_type', params.findingType);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudFindingsResponse>(`/api/v1/cloud/findings${qs}`);
      return res.data;
    },

    connectProvider: async (payload: any, projectId?: string | null): Promise<CloudConnectionItem> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudConnectionItem>(`/api/v1/cloud/connections${q}`, {
        method: 'POST',
        body: JSON.stringify({
          provider: payload.provider,
          connection_name: payload.name || payload.connection_name,
          authentication_method: payload.authentication_method || 'ROLE_ARN',
          account_identifier: payload.account_id || payload.account_identifier,
          credentials_payload: payload.credentials || payload.credentials_payload,
        }),
      });
      return res.data;
    },

    proposeRemediation: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/cloud/remediation/propose`, {
        method: 'POST',
        body: JSON.stringify({ finding_id: findingId }),
      });
      return res.data;
    },

    executeRemediation: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/cloud/remediation/${encodeURIComponent(jobId)}/execute`, {
        method: 'POST',
      });
      return res.data;
    },

    findingDetail: async (findingId: string): Promise<CloudFindingDetailResponse> => {
      const res = await this.request<CloudFindingDetailResponse>(`/api/v1/cloud/findings/${encodeURIComponent(findingId)}`);
      return res.data;
    },

    iam: async (params?: { projectId?: string | null; provider?: string }): Promise<CloudIAMResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudIAMResponse>(`/api/v1/cloud/iam${qs}`);
      return res.data;
    },

    network: async (params?: { projectId?: string | null; provider?: string }): Promise<CloudNetworkResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudNetworkResponse>(`/api/v1/cloud/network${qs}`);
      return res.data;
    },

    storage: async (params?: { projectId?: string | null; provider?: string }): Promise<CloudStorageResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudStorageResponse>(`/api/v1/cloud/storage${qs}`);
      return res.data;
    },

    databases: async (params?: { projectId?: string | null; provider?: string }): Promise<CloudDatabaseResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.provider) q.append('provider', params.provider);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudDatabaseResponse>(`/api/v1/cloud/databases${qs}`);
      return res.data;
    },

    kubernetes: async (projectId?: string | null): Promise<CloudKubernetesResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudKubernetesResponse>(`/api/v1/cloud/kubernetes${q}`);
      return res.data;
    },

    docker: async (projectId?: string | null): Promise<CloudDockerResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudDockerResponse>(`/api/v1/cloud/docker${q}`);
      return res.data;
    },

    iac: async (projectId?: string | null): Promise<CloudIaCResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudIaCResponse>(`/api/v1/cloud/iac${q}`);
      return res.data;
    },

    exposures: async (projectId?: string | null): Promise<CloudExposuresResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudExposuresResponse>(`/api/v1/cloud/exposures${q}`);
      return res.data;
    },

    attackPaths: async (projectId?: string | null): Promise<CloudAttackPathsResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudAttackPathsResponse>(`/api/v1/cloud/attack-paths${q}`);
      return res.data;
    },

    blastRadius: async (assetId?: string): Promise<CloudBlastRadiusResponse> => {
      const q = assetId ? `?asset_id=${encodeURIComponent(assetId)}` : '';
      const res = await this.request<CloudBlastRadiusResponse>(`/api/v1/cloud/blast-radius${q}`);
      return res.data;
    },

    compliance: async (projectId?: string | null): Promise<CloudComplianceResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudComplianceResponse>(`/api/v1/cloud/compliance${q}`);
      return res.data;
    },

    remediation: async (projectId?: string | null): Promise<CloudRemediationResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<CloudRemediationResponse>(`/api/v1/cloud/remediation${q}`);
      return res.data;
    },

    evidence: async (params?: { projectId?: string | null; source?: string; limit?: number; offset?: number }): Promise<CloudEvidenceResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.source) q.append('source', params.source);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<CloudEvidenceResponse>(`/api/v1/cloud/evidence${qs}`);
      return res.data;
    },

    scan: async (payload: { provider?: string; project_id?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/cloud/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    connect: async (payload: any, projectId?: string | null): Promise<any> => {
      return this.cloud.createConnection(payload, projectId);
    },
  };

  // =========================================================================
  // THING ATTACK — Offensive Security & Verification APIs
  // =========================================================================
  public attack = {
    overview: async (projectId?: string | null): Promise<AttackOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackOverviewResponse>(`/api/v1/attack/overview${q}`);
      return res.data;
    },

    assets: async (params?: {
      projectId?: string | null;
      assetType?: string;
      asset_type?: string;
      environment?: string;
      exposure?: string;
      risk?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    }): Promise<AttackAssetListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      const at = params?.assetType || params?.asset_type;
      if (at) q.append('asset_type', at);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.exposure) q.append('exposure', params.exposure);
      if (params?.risk) q.append('risk', params.risk);
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<AttackAssetListResponse>(`/api/v1/attack/assets${qs}`);
      return res.data;
    },

    createAsset: async (payload: CreateAttackAssetRequest): Promise<AttackAssetItem> => {
      const res = await this.request<AttackAssetItem>('/api/v1/attack/assets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    assetDetail: async (assetId: string): Promise<AttackAssetDetailResponse> => {
      const res = await this.request<AttackAssetDetailResponse>(`/api/v1/attack/assets/${encodeURIComponent(assetId)}`);
      return res.data;
    },

    apis: async (params?: {
      projectId?: string | null;
      method?: string;
      authType?: string;
      discoverySource?: string;
      risk?: string;
      testStatus?: string;
      search?: string;
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    }): Promise<AttackApiEndpointListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.method) q.append('method', params.method);
      if (params?.authType) q.append('auth_type', params.authType);
      if (params?.discoverySource) q.append('discovery_source', params.discoverySource);
      if (params?.risk) q.append('risk', params.risk);
      if (params?.testStatus) q.append('test_status', params.testStatus);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      if (params?.page != null) q.append('page', params.page.toString());
      if (params?.pageSize != null) q.append('pageSize', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<AttackApiEndpointListResponse>(`/api/v1/attack/apis${qs}`);
      return res.data;
    },

    apiDetail: async (endpointId: string): Promise<AttackApiEndpointDetailResponse> => {
      const res = await this.request<AttackApiEndpointDetailResponse>(`/api/v1/attack/apis/${encodeURIComponent(endpointId)}`);
      return res.data;
    },

    triggerDiscovery: async (payload: TriggerDiscoveryRequest): Promise<AttackDiscoveryRunItem> => {
      const res = await this.request<AttackDiscoveryRunItem>('/api/v1/attack/api-discovery/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    discoveryRuns: async (projectId?: string | null): Promise<AttackDiscoveryRunListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackDiscoveryRunListResponse>(`/api/v1/attack/api-discovery/runs${q}`);
      return res.data;
    },

    startDast: async (payload: StartDastRunRequest): Promise<AttackDastRunItem> => {
      const res = await this.request<AttackDastRunItem>('/api/v1/attack/dast/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    dastRuns: async (projectId?: string | null): Promise<AttackDastRunListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackDastRunListResponse>(`/api/v1/attack/dast/runs${q}`);
      return res.data;
    },

    cancelDast: async (runId: string): Promise<AttackDastRunItem> => {
      const res = await this.request<AttackDastRunItem>(`/api/v1/attack/dast/runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
      });
      return res.data;
    },

    createPentest: async (payload: CreatePentestRequest): Promise<AttackPentestItem> => {
      const res = await this.request<AttackPentestItem>('/api/v1/attack/pentests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    pentests: async (projectId?: string | null): Promise<AttackPentestListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackPentestListResponse>(`/api/v1/attack/pentests${q}`);
      return res.data;
    },

    pentestDetail: async (pentestId: string): Promise<AttackPentestDetailResponse> => {
      const res = await this.request<AttackPentestDetailResponse>(`/api/v1/attack/pentests/${encodeURIComponent(pentestId)}`);
      return res.data;
    },

    launchPentest: async (pentestId: string): Promise<AttackPentestItem> => {
      const res = await this.request<AttackPentestItem>(`/api/v1/attack/pentests/${encodeURIComponent(pentestId)}/launch`, {
        method: 'POST',
      });
      return res.data;
    },

    paths: async (params?: string | null | { projectId?: string | null; limit?: number }): Promise<AttackPathListResponse> => {
      const projectId = typeof params === 'string' ? params : params?.projectId;
      const limit = typeof params === 'object' && params !== null ? params.limit : undefined;
      const q = new URLSearchParams();
      if (projectId) q.append('project_id', projectId);
      if (limit != null) q.append('limit', limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<AttackPathListResponse>(`/api/v1/attack/paths${qs}`);
      return res.data;
    },

    findings: async (params?: {
      projectId?: string | null;
      severity?: string;
      exploitability?: string;
      attackType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<AttackFindingListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.exploitability) q.append('exploitability', params.exploitability);
      if (params?.attackType) q.append('attack_type', params.attackType);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<AttackFindingListResponse>(`/api/v1/attack/findings${qs}`);
      return res.data;
    },

    findingDetail: async (findingId: string): Promise<AttackFindingDetailResponse> => {
      const res = await this.request<AttackFindingDetailResponse>(`/api/v1/attack/findings/${encodeURIComponent(findingId)}`);
      return res.data;
    },

    retestFinding: async (findingId: string): Promise<RetestFindingResponse> => {
      const res = await this.request<RetestFindingResponse>(`/api/v1/attack/findings/${encodeURIComponent(findingId)}/retest`, {
        method: 'POST',
      });
      return res.data;
    },

    evidence: async (projectId?: string | null): Promise<AttackEvidenceListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackEvidenceListResponse>(`/api/v1/attack/evidence${q}`);
      return res.data;
    },

    evidenceDetail: async (evidenceId: string): Promise<AttackEvidenceItemSchema> => {
      const res = await this.request<AttackEvidenceItemSchema>(`/api/v1/attack/evidence/${encodeURIComponent(evidenceId)}`);
      return res.data;
    },

    schedules: async (projectId?: string | null): Promise<AttackScheduleListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackScheduleListResponse>(`/api/v1/attack/schedules${q}`);
      return res.data;
    },

    createSchedule: async (payload: CreateScheduleRequest): Promise<AttackScheduleItem> => {
      const res = await this.request<AttackScheduleItem>('/api/v1/attack/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    reports: async (projectId?: string | null): Promise<AttackReportListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackReportListResponse>(`/api/v1/attack/reports${q}`);
      return res.data;
    },

    createReport: async (payload: CreateReportRequest): Promise<AttackReportItem> => {
      const res = await this.request<AttackReportItem>('/api/v1/attack/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    policies: async (projectId?: string | null): Promise<AttackPolicyListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<AttackPolicyListResponse>(`/api/v1/attack/policies${q}`);
      return res.data;
    },

    createPolicy: async (payload: CreatePolicyRequest): Promise<AttackPolicyItem> => {
      const res = await this.request<AttackPolicyItem>('/api/v1/attack/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  // =========================================================================
  // THING PROTECT — Runtime Defense, Policy Enforcement & MCP Security APIs
  // =========================================================================
  public protect = {
    overview: async (projectId?: string | null): Promise<ProtectOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectOverviewResponse>(`/api/v1/protect/overview${q}`);
      return res.data;
    },

    runtimes: async (projectId?: string | null): Promise<RuntimeProtectionListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<RuntimeProtectionListResponse>(`/api/v1/protect/runtime${q}`);
      return res.data;
    },

    posture: async (params?: {
      projectId?: string | null;
      environment?: string;
      workloadType?: string;
      timeRange?: string;
      search?: string;
    }): Promise<{ workloads: any[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.workloadType) q.append('workload_type', params.workloadType);
      if (params?.timeRange) q.append('time_range', params.timeRange);
      if (params?.search) q.append('search', params.search);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ workloads: any[]; total: number }>(`/api/v1/protect/posture${qs}`);
      return res.data;
    },

    runtimeDetail: async (runtimeId: string): Promise<RuntimeProtectionDetailResponse> => {

      const res = await this.request<RuntimeProtectionDetailResponse>(`/api/v1/protect/runtime/${encodeURIComponent(runtimeId)}`);
      return res.data;
    },

    policies: async (projectId?: string | null): Promise<ProtectionPolicyListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectionPolicyListResponse>(`/api/v1/protect/policies${q}`);
      return res.data;
    },

    createPolicy: async (payload: CreateProtectPolicyRequest): Promise<ProtectionPolicyItem> => {
      const res = await this.request<ProtectionPolicyItem>('/api/v1/protect/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    policyDetail: async (policyId: string): Promise<ProtectionPolicyDetailResponse> => {
      const res = await this.request<ProtectionPolicyDetailResponse>(`/api/v1/protect/policies/${encodeURIComponent(policyId)}`);
      return res.data;
    },

    simulatePolicy: async (policyId: string, payload: { historical_window_days?: number; sample_events?: any[] } = {}): Promise<PolicySimulationResponse> => {
      const res = await this.request<PolicySimulationResponse>(`/api/v1/protect/policies/${encodeURIComponent(policyId)}/simulate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    publishPolicy: async (policyId: string): Promise<PolicyPublishResponse> => {
      const res = await this.request<PolicyPublishResponse>(`/api/v1/protect/policies/${encodeURIComponent(policyId)}/publish`, {
        method: 'POST',
      });
      return res.data;
    },

    rollbackPolicy: async (policyId: string, targetVersion: number): Promise<PolicyPublishResponse> => {
      const res = await this.request<PolicyPublishResponse>(`/api/v1/protect/policies/${encodeURIComponent(policyId)}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ target_version: targetVersion }),
      });
      return res.data;
    },

    decisions: async (params?: {
      projectId?: string | null;
      runtime_id?: string;
      runtimeId?: string;
      decision?: string;
      actor?: string;
      limit?: number;
      offset?: number;
    }): Promise<ProtectionDecisionListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.runtime_id || params?.runtimeId) q.append('runtime_id', (params.runtime_id || params.runtimeId)!);
      if (params?.decision) q.append('decision', params.decision);
      if (params?.actor) q.append('actor', params.actor);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<ProtectionDecisionListResponse>(`/api/v1/protect/enforcement${qs}`);
      return res.data;
    },

    decisionDetail: async (decisionId: string): Promise<ProtectionDecisionDetailResponse> => {
      const res = await this.request<ProtectionDecisionDetailResponse>(`/api/v1/protect/enforcement/${encodeURIComponent(decisionId)}`);
      return res.data;
    },

    mcpServers: async (projectId?: string | null): Promise<McpServerListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<McpServerListResponse>(`/api/v1/protect/mcp/servers${q}`);
      return res.data;
    },

    mcpTools: async (projectId?: string | null): Promise<McpToolControlListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<McpToolControlListResponse>(`/api/v1/protect/mcp/tools${q}`);
      return res.data;
    },

    mcpRequests: async (projectId?: string | null): Promise<McpRequestAuditListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<McpRequestAuditListResponse>(`/api/v1/protect/mcp/requests${q}`);
      return res.data;
    },

    agents: async (projectId?: string | null): Promise<ProtectedAgentListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectedAgentListResponse>(`/api/v1/protect/agents${q}`);
      return res.data;
    },

    sessions: async (projectId?: string | null): Promise<ProtectedSessionListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectedSessionListResponse>(`/api/v1/protect/sessions${q}`);
      return res.data;
    },

    revokeSession: async (sessionId: string, reason: string): Promise<RevokeSessionResponse> => {
      const res = await this.request<RevokeSessionResponse>(`/api/v1/protect/sessions/${encodeURIComponent(sessionId)}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    apis: async (projectId?: string | null): Promise<ApiProtectionListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ApiProtectionListResponse>(`/api/v1/protect/apis${q}`);
      return res.data;
    },

    network: async (projectId?: string | null): Promise<NetworkProtectionListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<NetworkProtectionListResponse>(`/api/v1/protect/network${q}`);
      return res.data;
    },

    dns: async (projectId?: string | null): Promise<DnsProtectionListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<DnsProtectionListResponse>(`/api/v1/protect/network/dns${q}`);
      return res.data;
    },

    threats: async (projectId?: string | null): Promise<ThreatSignalListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ThreatSignalListResponse>(`/api/v1/protect/threats${q}`);
      return res.data;
    },

    approvals: async (projectId?: string | null): Promise<ProtectionApprovalListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectionApprovalListResponse>(`/api/v1/protect/approvals${q}`);
      return res.data;
    },

    resolveApproval: async (approvalId: string, approved: boolean | 'APPROVED' | 'REJECTED', reason?: string): Promise<any> => {
      const isApproved = typeof approved === 'boolean' ? approved : approved === 'APPROVED';
      const decisionStr = typeof approved === 'string' ? approved : (approved ? 'APPROVED' : 'REJECTED');
      const res = await this.request<any>(`/api/v1/protect/approvals/${encodeURIComponent(approvalId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: isApproved, decision: decisionStr, reason }),
      });
      return res.data;
    },

    breakGlass: async (payload?: { scope?: string; justification?: string; duration_minutes?: number; project_id?: string }): Promise<any> => {
      if (payload) {
        const res = await this.request<BreakGlassResponse>('/api/v1/protect/break-glass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return res.data;
      }
      const res = await this.request<any>('/api/v1/protect/break-glass');
      return res.data;
    },

    requestBreakGlass: async (payload: { scope: string; reason: string; duration_minutes?: number; approver?: string; project_id?: string }): Promise<any> => {
      const res = await this.request<BreakGlassResponse>('/api/v1/protect/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: payload.scope,
          justification: payload.reason,
          duration_minutes: payload.duration_minutes || 30,
          approver: payload.approver,
          project_id: payload.project_id,
        }),
      });
      return res.data;
    },

    controls: async (projectId?: string | null): Promise<ControlEffectivenessListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ControlEffectivenessListResponse>(`/api/v1/protect/controls${q}`);
      return res.data;
    },

    coverage: async (projectId?: string | null): Promise<ProtectionCoverageResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectionCoverageResponse>(`/api/v1/protect/coverage${q}`);
      return res.data;
    },

    evidence: async (
      paramsOrProjectId?: { projectId?: string | null; page?: number; pageSize?: number; search?: string; evidenceType?: string } | string | null
    ): Promise<ProtectionEvidenceListResponse> => {
      const q = new URLSearchParams();
      if (typeof paramsOrProjectId === 'string') {
        if (paramsOrProjectId) q.append('project_id', paramsOrProjectId);
      } else if (paramsOrProjectId && typeof paramsOrProjectId === 'object') {
        if (paramsOrProjectId.projectId) q.append('project_id', paramsOrProjectId.projectId);
        if (paramsOrProjectId.page != null) q.append('page', paramsOrProjectId.page.toString());
        if (paramsOrProjectId.pageSize != null) q.append('pageSize', paramsOrProjectId.pageSize.toString());
        if (paramsOrProjectId.search) q.append('search', paramsOrProjectId.search);
        if (paramsOrProjectId.evidenceType) q.append('evidence_type', paramsOrProjectId.evidenceType);
      }
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<ProtectionEvidenceListResponse>(`/api/v1/protect/evidence${qs}`);
      return res.data;
    },

    evidenceDetail: async (evidenceId: string): Promise<ProtectionEvidenceItem> => {
      const res = await this.request<ProtectionEvidenceItem>(`/api/v1/protect/evidence/${encodeURIComponent(evidenceId)}`);
      return res.data;
    },

    activity: async (projectId?: string | null): Promise<ProtectionActivityListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ProtectionActivityListResponse>(`/api/v1/protect/activity${q}`);
      return res.data;
    },
  };

  // =========================================================================
  // THING AGENT — AI Agent Identity, Authority, Delegation & Runtime Security
  // =========================================================================
  public agent = {
    overview: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/overview${q}`);
      return res.data;
    },

    roles: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/agent/roles');
      return res.data;
    },

    run: async (payload: { agent_id: string; task: string; project_id?: string; max_turns?: number } | any, projectId?: string): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/run${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    runStream: async (
      payload: { agent_id: string; task: string; project_id?: string; max_turns?: number },
      onEvent: (event: string, data: any) => void,
    ): Promise<void> => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/v1/agent/run/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to start stream`);
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent('message', data);
            } catch { }
          }
        }
      }
    },

    agents: async (params?: { projectId?: string | null; status?: string; risk?: string; environment?: string; search?: string; limit?: number; offset?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.status) q.append('status', params.status);
      if (params?.risk) q.append('risk', params.risk);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/agents${qs}`);
      return res.data;
    },

    createAgent: async (payload: { name: string; identity_uri: string; owner: string; owner_email?: string; environment_id?: string; description?: string; capabilities?: string[]; tags?: string[] }, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/agents${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    agentDetail: async (agentId: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/agents/${encodeURIComponent(agentId)}${q}`);
      return res.data;
    },

    quarantineAgent: async (agentId: string, reason: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/agents/${encodeURIComponent(agentId)}/quarantine${q}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    disableAgent: async (agentId: string, reason: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/agents/${encodeURIComponent(agentId)}/disable${q}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    identities: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/identities${q}`);
      return res.data;
    },

    permissions: async (params?: { projectId?: string | null; agentId?: string; status?: string; limit?: number; offset?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.agentId) q.append('agent_id', params.agentId);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/permissions${qs}`);
      return res.data;
    },

    revokePermission: async (permissionId: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/permissions/${encodeURIComponent(permissionId)}${q}`, { method: 'DELETE' });
      return res.data;
    },

    tools: async (projectId?: string | null, risk?: string): Promise<any> => {
      const q = new URLSearchParams();
      if (projectId) q.append('project_id', projectId);
      if (risk) q.append('risk', risk);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/tools${qs}`);
      return res.data;
    },

    toolDetail: async (toolId: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/tools/${encodeURIComponent(toolId)}${q}`);
      return res.data;
    },

    sessions: async (params?: { projectId?: string | null; agentId?: string; status?: string; limit?: number; offset?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.agentId) q.append('agent_id', params.agentId);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/sessions${qs}`);
      return res.data;
    },

    revokeSession: async (sessionId: string, reason: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/sessions/${encodeURIComponent(sessionId)}/revoke${q}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    delegations: async (params?: { projectId?: string | null; agentId?: string; status?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.agentId) q.append('agent_id', params.agentId);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/delegations${qs}`);
      return res.data;
    },

    revokeDelegation: async (delegationId: string, reason: string, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/delegations/${encodeURIComponent(delegationId)}/revoke${q}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    actions: async (params?: { projectId?: string | null; agentId?: string; decision?: string; limit?: number; offset?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.agentId) q.append('agent_id', params.agentId);
      if (params?.decision) q.append('decision', params.decision);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/agent/actions${qs}`);
      return res.data;
    },

    dataAccess: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/data-access${q}`);
      return res.data;
    },

    behavior: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/behavior${q}`);
      return res.data;
    },

    approvals: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/approvals${q}`);
      return res.data;
    },

    resolveApproval: async (
      approvalId: string,
      decisionOrPayload: 'APPROVED' | 'REJECTED' | { decision: 'APPROVED' | 'REJECTED'; reason?: string; project_id?: string },
      reason?: string,
      projectId?: string | null
    ): Promise<any> => {
      let dec: 'APPROVED' | 'REJECTED';
      let r: string;
      let pid: string | null | undefined;
      if (typeof decisionOrPayload === 'object' && decisionOrPayload !== null) {
        dec = decisionOrPayload.decision;
        r = decisionOrPayload.reason || `Operator decision: ${dec}`;
        pid = decisionOrPayload.project_id;
      } else {
        dec = decisionOrPayload as 'APPROVED' | 'REJECTED';
        r = reason || `Operator decision: ${dec}`;
        pid = projectId;
      }
      const q = pid ? `?project_id=${encodeURIComponent(pid)}` : '';
      const res = await this.request<any>(`/api/v1/agent/approvals/${encodeURIComponent(approvalId)}/resolve${q}`, {
        method: 'POST',
        body: JSON.stringify({ decision: dec, reason: r }),
      });
      return res.data;
    },

    evidence: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/evidence${q}`);
      return res.data;
    },

    activity: async (projectId?: string | null, limit = 50): Promise<any> => {
      const q = new URLSearchParams();
      if (projectId) q.append('project_id', projectId);
      q.append('limit', limit.toString());
      const res = await this.request<any>(`/api/v1/agent/activity?${q.toString()}`);
      return res.data;
    },

    risk: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/agent/risk${q}`);
      return res.data;
    },
  };

  // =========================================================================
  // THING DATA — DSPM (Data Security Posture Management) APIs
  // =========================================================================
  public readonly data = {
    overview: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/data/overview${q}`);
      return res.data;
    },

    stores: async (params?: {
      projectId?: string | null;
      storeType?: string;
      store_type?: string;
      sensitivity?: string;
      complianceStatus?: string;
      compliance_status?: string;
      environment?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      const st = params?.storeType || params?.store_type;
      if (st) q.append('store_type', st);
      if (params?.sensitivity) q.append('sensitivity', params.sensitivity);
      const cs = params?.complianceStatus || params?.compliance_status;
      if (cs) q.append('compliance_status', cs);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/data/stores${qs}`);
      return res.data;
    },

    storeDetail: async (storeId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/data/stores/${encodeURIComponent(storeId)}`);
      return res.data;
    },

    store: async (storeId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/data/stores/${encodeURIComponent(storeId)}`);
      return res.data;
    },

    createStore: async (payload: {
      name: string;
      store_type: string;
      provider?: string;
      location?: string;
      region?: string;
      environment?: string;
      owner_team?: string;
      tags?: Record<string, any>;
      project_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/data/stores', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteStore: async (storeId: string): Promise<void> => {
      await this.request<void>(`/api/v1/data/stores/${encodeURIComponent(storeId)}`, {
        method: 'DELETE',
      });
    },

    inventory: async (params?: {
      projectId?: string | null;
      dataStoreId?: string;
      dataType?: string;
      sensitivityThreshold?: number;
      limit?: number;
      offset?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.dataStoreId) q.append('data_store_id', params.dataStoreId);
      if (params?.dataType) q.append('data_type', params.dataType);
      if (params?.sensitivityThreshold != null) q.append('sensitivity_threshold', params.sensitivityThreshold.toString());
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/data/inventory${qs}`);
      return res.data;
    },

    flows: async (params?: {
      projectId?: string | null;
      policyResult?: string;
      dataClassification?: string;
      limit?: number;
      offset?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.policyResult) q.append('policy_result', params.policyResult);
      if (params?.dataClassification) q.append('data_classification', params.dataClassification);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/data/flows${qs}`);
      return res.data;
    },

    policies: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/data/policies${q}`);
      return res.data;
    },

    createPolicy: async (payload: {
      name: string;
      description?: string;
      data_types?: string[];
      action?: string;
      severity?: string;
      enabled?: boolean;
      conditions?: Record<string, any>;
      project_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/data/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    scans: async (params?: {
      projectId?: string | null;
      dataStoreId?: string;
      limit?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.dataStoreId) q.append('data_store_id', params.dataStoreId);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/data/scans${qs}`);
      return res.data;
    },

    triggerScan: async (payload: {
      data_store_id: string;
      scanner_type?: string;
      project_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/data/scans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  // =========================================================================
  // THING GRAPH — Security Knowledge Graph APIs
  // =========================================================================
  public readonly graph = {
    get: async (projectId: string, paramsOrMaxNodes?: any, maxEdges?: number): Promise<any> => {
      const params = typeof paramsOrMaxNodes === 'object' ? paramsOrMaxNodes : { maxNodes: paramsOrMaxNodes, maxEdges };
      const q = new URLSearchParams();
      if (params?.maxNodes) q.append('max_nodes', params.maxNodes.toString());
      if (params?.maxEdges) q.append('max_edges', params.maxEdges.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph${qs}`);
      return res.data;
    },

    listNodes: async (projectId: string, params?: any): Promise<any> => {
      return this.graph.nodes(projectId, params);
    },

    projectGraph: async (projectId: string, params?: { maxNodes?: number; maxEdges?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.maxNodes) q.append('max_nodes', params.maxNodes.toString());
      if (params?.maxEdges) q.append('max_edges', params.maxEdges.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph${qs}`);
      return res.data;
    },

    nodes: async (projectId: string, params?: {
      nodeType?: string;
      environment?: string;
      limit?: number;
      offset?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.nodeType) q.append('node_type', params.nodeType);
      if (params?.environment) q.append('environment', params.environment);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/nodes${qs}`);
      return res.data;
    },

    edges: async (projectId: string, params?: {
      edgeType?: string;
      state?: string;
      limit?: number;
      offset?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.edgeType) q.append('edge_type', params.edgeType);
      if (params?.state) q.append('state', params.state);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/edges${qs}`);
      return res.data;
    },

    attackPaths: async (projectId: string, payload?: {
      source_id?: string;
      target_id?: string;
      max_depth?: number;
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/attack-paths`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    blastRadius: async (projectId: string, nodeId: string, maxDepth?: number): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/blast-radius`, {
        method: 'POST',
        body: JSON.stringify({ node_id: nodeId, max_depth: maxDepth ?? 5 }),
      });
      return res.data;
    },

    reachability: async (projectId: string, payload: {
      source_node_id: string;
      target_node_id: string;
      reachability_type?: string;
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/reachability`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    reconcile: async (projectId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/reconcile`, {
        method: 'POST',
      });
      return res.data;
    },

    snapshot: async (projectId: string, reason: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/graph/snapshot`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },
  };

  public readonly containers = {
    summary: async (projectId?: string | null): Promise<import('@/types/api/container').ContainerSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ContainerSummaryResponse>(`/api/v1/containers/summary${q}`);
      return res.data;
    },

    images: async (params?: {
      projectId?: string | null;
      search?: string;
      registry?: string;
      status?: string;
      severity?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/container').ContainerImageListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.registry && params.registry !== 'All Registries' && params.registry !== 'All') {
        p.set('registry', params.registry);
      }
      if (params?.status && params.status !== 'All Status' && params.status !== 'All') {
        p.set('status', params.status);
      }
      if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') {
        p.set('severity', params.severity);
      }
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));

      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').ContainerImageListResponse>(`/api/v1/containers/images${qs}`);
      return res.data;
    },

    imageDetail: async (imageId: string): Promise<import('@/types/api/container').ContainerImageDetailResponse> => {
      const res = await this.request<import('@/types/api/container').ContainerImageDetailResponse>(
        `/api/v1/containers/images/${encodeURIComponent(imageId)}`
      );
      return res.data;
    },

    scan: async (payload: {
      projectId: string;
      imageId?: string;
      repository?: string;
      tag?: string;
    }): Promise<import('@/types/api/container').ContainerScanJobResponse> => {
      const res = await this.request<import('@/types/api/container').ContainerScanJobResponse>(
        '/api/v1/containers/scan',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: payload.projectId,
            image_id: payload.imageId,
            repository: payload.repository,
            tag: payload.tag,
          }),
        }
      );
      return res.data;
    },

    scanJob: async (jobId: string): Promise<import('@/types/api/container').ContainerScanJobResponse> => {
      const res = await this.request<import('@/types/api/container').ContainerScanJobResponse>(
        `/api/v1/containers/jobs/${encodeURIComponent(jobId)}`
      );
      return res.data;
    },

    registries: async (projectId?: string | null): Promise<import('@/types/api/container').ContainerRegistryListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ContainerRegistryListResponse>(`/api/v1/containers/registries${q}`);
      return res.data;
    },

    testRegistryConnection: async (registryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(registryId)}/test-connection`, {
        method: 'POST',
      });
      return res.data;
    },

    syncRegistry: async (registryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(registryId)}/sync`, {
        method: 'POST',
      });
      return res.data;
    },

    disconnectRegistry: async (registryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(registryId)}/disconnect`, {
        method: 'POST',
      });
      return res.data;
    },

    connectRegistry: async (registryIdOrPayload: string | any, payload?: any): Promise<any> => {
      if (typeof registryIdOrPayload === 'string') {
        const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(registryIdOrPayload)}/connect`, {
          method: 'POST',
          body: JSON.stringify(payload || {}),
        });
        return res.data;
      }
      return this.containers.createRegistry(registryIdOrPayload, registryIdOrPayload?.projectId);
    },

    createRegistry: async (payload: { provider: string; name: string; url: string; account_id?: string; region?: string; access_token?: string }, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/registries${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteRegistry: async (registryId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(registryId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    providers: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/containers/providers');
      return res.data || [];
    },

    // Module A: Dockerfiles & Build Security
    dockerfilesSummary: async (projectId?: string | null): Promise<import('@/types/api/container').DockerfileSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').DockerfileSummaryResponse>(`/api/v1/containers/dockerfiles/summary${q}`);
      return res.data;
    },

    dockerfilesCharts: async (projectId?: string | null): Promise<import('@/types/api/container').DockerfileChartDataResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').DockerfileChartDataResponse>(`/api/v1/containers/dockerfiles/charts${q}`);
      return res.data;
    },

    dockerfilesList: async (params?: {
      projectId?: string | null;
      search?: string;
      repository?: string;
      severity?: string;
      build_type?: string;
      base_image?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/container').DockerfileListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.repository && params.repository !== 'All' && params.repository !== 'All Repositories') p.set('repository', params.repository);
      if (params?.severity && params.severity !== 'All' && params.severity !== 'All Severities') p.set('severity', params.severity);
      if (params?.build_type && params.build_type !== 'All' && params.build_type !== 'All Build Types') p.set('build_type', params.build_type);
      if (params?.base_image && params.base_image !== 'All' && params.base_image !== 'All Base Images') p.set('base_image', params.base_image);
      if (params?.status && params.status !== 'All' && params.status !== 'All Status') p.set('status', params.status);
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));

      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').DockerfileListResponse>(`/api/v1/containers/dockerfiles${qs}`);
      return res.data;
    },

    dockerfilesFindings: async (params?: {
      projectId?: string | null;
      dockerfileId?: string;
      severity?: string;
      category?: string;
    }): Promise<import('@/types/api/container').DockerfileFindingDetail[]> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.dockerfileId) p.set('dockerfile_id', params.dockerfileId);
      if (params?.severity && params.severity !== 'All') p.set('severity', params.severity);
      if (params?.category && params.category !== 'All') p.set('category', params.category);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').DockerfileFindingDetail[]>(`/api/v1/containers/dockerfiles/findings${qs}`);
      return res.data || [];
    },

    dockerfilesRecommendations: async (projectId?: string | null): Promise<import('@/types/api/container').DockerfileRecommendationItem[]> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').DockerfileRecommendationItem[]>(`/api/v1/containers/dockerfiles/recommendations${q}`);
      return res.data || [];
    },

    scanDockerfile: async (payload: {
      project_id?: string | null;
      repository_name?: string;
      dockerfile_path?: string;
      content?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/dockerfiles/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    dockerfileDetail: async (dockerfileId: string): Promise<import('@/types/api/container').DockerfileInspectionResponse> => {
      const res = await this.request<import('@/types/api/container').DockerfileInspectionResponse>(
        `/api/v1/containers/dockerfiles/${encodeURIComponent(dockerfileId)}`
      );
      return res.data;
    },

    remediateDockerfile: async (
      dockerfileId: string,
      payload: import('@/types/api/container').RemediateDockerfileRequest
    ): Promise<import('@/types/api/container').RemediateDockerfileResponse> => {
      const res = await this.request<import('@/types/api/container').RemediateDockerfileResponse>(
        `/api/v1/containers/dockerfiles/${encodeURIComponent(dockerfileId)}/remediate`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      this.invalidateCache('/api/v1/containers/dockerfiles');
      return res.data;
    },

    // Module B: Container Configuration & Hardening
    configurationSummary: async (projectId?: string | null): Promise<import('@/types/api/container').ContainerConfigSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ContainerConfigSummaryResponse>(`/api/v1/containers/configuration/summary${q}`);
      return res.data;
    },

    configurationCharts: async (projectId?: string | null): Promise<import('@/types/api/container').ContainerConfigChartsResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ContainerConfigChartsResponse>(`/api/v1/containers/configuration/charts${q}`);
      return res.data;
    },

    configurationContainers: async (params?: {
      projectId?: string | null;
      search?: string;
      cluster?: string;
      namespace?: string;
      status?: string;
      security_posture?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/container').ContainerConfigListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.cluster && params.cluster !== 'All' && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
      if (params?.namespace && params.namespace !== 'All' && params.namespace !== 'All Namespaces') p.set('namespace', params.namespace);
      if (params?.status && params.status !== 'All' && params.status !== 'All Status') p.set('status', params.status);
      if (params?.security_posture && params.security_posture !== 'All' && params.security_posture !== 'All Posture') p.set('security_posture', params.security_posture);
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));

      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').ContainerConfigListResponse>(`/api/v1/containers/configuration/containers${qs}`);
      return res.data;
    },

    // Module C: Registry Integrations (Enhanced)
    registriesSummary: async (projectId?: string | null): Promise<import('@/types/api/container').RegistrySummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').RegistrySummaryResponse>(`/api/v1/containers/registries/summary${q}`);
      return res.data;
    },

    registriesEnhanced: async (params?: {
      projectId?: string | null;
      search?: string;
      provider?: string;
      status?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/container').RegistryEnhancedListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.provider && params.provider !== 'All' && params.provider !== 'All Providers') p.set('provider', params.provider);
      if (params?.status && params.status !== 'All' && params.status !== 'All Status') p.set('status', params.status);
      if (params?.type && params.type !== 'All' && params.type !== 'All Types') p.set('type', params.type);
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));

      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').RegistryEnhancedListResponse>(`/api/v1/containers/registries/enhanced${qs}`);
      return res.data;
    },

    kubernetesOverview: async (projectId?: string | null): Promise<import('@/types/api/container').KubernetesOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').KubernetesOverviewResponse>(`/api/v1/containers/kubernetes/overview${q}`);
      return res.data;
    },

    kubernetesClustersSummary: async (projectId?: string | null): Promise<import('@/types/api/container').KubernetesClustersSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').KubernetesClustersSummaryResponse>(`/api/v1/containers/kubernetes/clusters/summary${q}`);
      return res.data;
    },

    kubernetesClusters: async (projectId?: string | null): Promise<import('@/types/api/container').KubernetesClusterListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').KubernetesClusterListResponse>(`/api/v1/containers/kubernetes/clusters${q}`);
      return res.data;
    },

    kubernetesWorkloads: async (params?: {
      projectId?: string | null;
      search?: string;
      cluster?: string;
      namespace?: string;
      status?: string;
      risk_level?: string;
      workload_type?: string;
      page?: number;
      page_size?: number;
    }): Promise<import('@/types/api/container').KubernetesWorkloadListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.cluster) p.set('cluster', params.cluster);
      if (params?.namespace) p.set('namespace', params.namespace);
      if (params?.status) p.set('status', params.status);
      if (params?.risk_level) p.set('risk_level', params.risk_level);
      if (params?.workload_type) p.set('workload_type', params.workload_type);
      if (params?.page) p.set('page', String(params.page));
      if (params?.page_size) p.set('page_size', String(params.page_size));
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').KubernetesWorkloadListResponse>(`/api/v1/containers/kubernetes/workloads${qs}`);
      return res.data;
    },

    kubernetesWorkloadDetail: async (workloadId: string): Promise<import('@/types/api/container').KubernetesWorkloadDetailResponse> => {
      const res = await this.request<import('@/types/api/container').KubernetesWorkloadDetailResponse>(
        `/api/v1/containers/kubernetes/workloads/${encodeURIComponent(workloadId)}`
      );
      return res.data;
    },

    kubernetesFindings: async (params?: {
      projectId?: string | null;
      severity?: string;
      category?: string;
    }): Promise<import('@/types/api/container').KubernetesFindingsListResponse> => {
      const p = new URLSearchParams();
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.severity) p.set('severity', params.severity);
      if (params?.category) p.set('category', params.category);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/container').KubernetesFindingsListResponse>(`/api/v1/containers/kubernetes/findings${qs}`);
      return res.data;
    },

    topRiskyWorkloads: async (projectId?: string | null): Promise<import('@/types/api/container').TopRiskyWorkloadRow[]> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').TopRiskyWorkloadRow[]>(`/api/v1/containers/kubernetes/top-risky${q}`, { ttlMs: 5000 });
      return res.data;
    },

    imageScansSummary: async (projectId?: string | null): Promise<import('@/types/api/container').ImageScanSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ImageScanSummaryResponse>(`/api/v1/containers/scans/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },

    imageScansCharts: async (projectId?: string | null): Promise<import('@/types/api/container').ImageScanChartsResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ImageScanChartsResponse>(`/api/v1/containers/scans/charts${q}`, { ttlMs: 10000 });
      return res.data;
    },

    imageScansList: async (params?: {
      projectId?: string | null;
      search?: string;
      registry?: string;
      scan_type?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/container').ImageScanListResponse> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.search) q.append('search', params.search);
      if (params?.registry && params.registry !== 'All') q.append('registry', params.registry);
      if (params?.scan_type && params.scan_type !== 'All') q.append('scan_type', params.scan_type);
      if (params?.status && params.status !== 'All') q.append('status', params.status);
      if (params?.page) q.append('page', String(params.page));
      if (params?.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/container').ImageScanListResponse>(`/api/v1/containers/scans/list${query}`, { ttlMs: 5000 });
      return res.data;
    },

    runImageScan: async (payload: import('@/types/api/container').RunNewScanRequest): Promise<import('@/types/api/container').ImageScanDetailResponse> => {
      const res = await this.request<import('@/types/api/container').ImageScanDetailResponse>('/api/v1/containers/scans/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/scans');
      return res.data;
    },

    imageScanDetail: async (scanId: string): Promise<import('@/types/api/container').ImageScanDetailResponse> => {
      const res = await this.request<import('@/types/api/container').ImageScanDetailResponse>(`/api/v1/containers/scans/${encodeURIComponent(scanId)}`, { ttlMs: 10000 });
      return res.data;
    },

    scanSchedules: async (projectId?: string | null): Promise<import('@/types/api/container').ScanScheduleListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').ScanScheduleListResponse>(`/api/v1/containers/scans/schedules${q}`, { ttlMs: 10000 });
      return res.data;
    },

    runtimeOverview: async (projectId?: string | null): Promise<import('@/types/api/container').RuntimeOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<import('@/types/api/container').RuntimeOverviewResponse>(`/api/v1/containers/runtime/overview${q}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeAlerts: async (params: {
      projectId?: string | null;
      search?: string;
      status?: string;
      severity?: string;
      event_type?: string;
    } = {}): Promise<import('@/types/api/container').RuntimeAlertsListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.event_type && params.event_type !== 'All') q.append('event_type', params.event_type);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/container').RuntimeAlertsListResponse>(`/api/v1/containers/runtime/alerts${query}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeEvents: async (params: {
      projectId?: string | null;
      search?: string;
      severity?: string;
      event_type?: string;
      workload?: string;
      namespace?: string;
      page?: number;
      pageSize?: number;
      page_size?: number;
    } = {}): Promise<import('@/types/api/container').RuntimeEventsListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.event_type && params.event_type !== 'All') q.append('event_type', params.event_type);
      if (params.workload && params.workload !== 'All') q.append('workload', params.workload);
      if (params.namespace && params.namespace !== 'All') q.append('namespace', params.namespace);
      if (params.page) q.append('page', String(params.page));
      const pSize = params.pageSize || params.page_size;
      if (pSize) q.append('page_size', String(pSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/container').RuntimeEventsListResponse>(`/api/v1/containers/runtime/events${query}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeEventDetail: async (eventId: string): Promise<import('@/types/api/container').RuntimeEventDetailResponse> => {
      const res = await this.request<import('@/types/api/container').RuntimeEventDetailResponse>(`/api/v1/containers/runtime/events/${encodeURIComponent(eventId)}`, { ttlMs: 10000 });
      return res.data;
    },
    runtimePolicies: async (paramsOrProjectId?: any, policyType?: string): Promise<import('@/types/api/container').RuntimePoliciesSummaryResponse> => {
      let pId: string | undefined = undefined;
      let pType: string | undefined = policyType;
      if (typeof paramsOrProjectId === 'object' && paramsOrProjectId !== null) {
        pId = paramsOrProjectId.projectId || paramsOrProjectId.project_id;
        pType = paramsOrProjectId.policy_type || policyType;
      } else if (typeof paramsOrProjectId === 'string') {
        pId = paramsOrProjectId;
      }
      const q = new URLSearchParams();
      if (pId) q.append('project_id', pId);
      if (pType && pType !== 'All') q.append('policy_type', pType);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/container').RuntimePoliciesSummaryResponse>(`/api/v1/containers/runtime/policies${query}`, { ttlMs: 5000 });
      return res.data;
    },
    createRuntimePolicy: async (payload: import('@/types/api/container').CreateRuntimePolicyRequest): Promise<import('@/types/api/container').RuntimePolicyRow> => {
      const res = await this.request<import('@/types/api/container').RuntimePolicyRow>('/api/v1/containers/runtime/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/runtime/policies');
      return res.data;
    },

    vulnerabilityReachability: async (cveId?: string, imageId?: string): Promise<any> => {
      const p = new URLSearchParams();
      if (cveId) p.set('cve_id', cveId);
      if (imageId) p.set('image_id', imageId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/vulnerabilities/reachability${qs}`);
      return res.data;
    },

    scanCharts: async (projectId?: string | null): Promise<any> => {
      return this.containers.imageScansCharts(projectId);
    },

    repositories: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/repositories${q}`);
      return res.data;
    },

    inventory: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.registry) q.set('registry', params.registry);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize || params?.page_size) q.set('page_size', String(params.pageSize || params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/inventory${qs}`);
      return res.data;
    },

    vulnerabilities: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.severity) q.set('severity', params.severity);
      if (params?.package) q.set('package', params.package);
      if (params?.fixAvailable !== undefined) q.set('fix_available', String(params.fixAvailable));
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize || params?.page_size) q.set('page_size', String(params.pageSize || params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/vulnerabilities${qs}`);
      return res.data;
    },

    secrets: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.severity) q.set('severity', params.severity);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize || params?.page_size) q.set('page_size', String(params.pageSize || params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/secrets${qs}`);
      return res.data;
    },

    sbom: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.imageId) q.set('image_id', params.imageId);
      if (params?.format) q.set('format', params.format);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/sbom${qs}`);
      return res.data;
    },

    layers: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.imageId) q.set('image_id', params.imageId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/containers/layers${qs}`);
      return res.data;
    },

    aiAssistant: async (payload: { prompt: string; context?: any; projectId?: string | null }): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    remediation: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/remediation${q}`);
      return res.data;
    },

    applyRemediation: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/remediation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    policies: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/policies${q}`);
      return res.data;
    },

    savePolicy: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    cicdGates: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/ci-cd${q}`);
      return res.data;
    },

    compliance: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/compliance${q}`);
      return res.data;
    },

    integrations: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/integrations${q}`);
      return res.data;
    },

    reports: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/reports${q}`);
      return res.data;
    },

    settings: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/settings${q}`);
      return res.data;
    },

    saveSettings: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  public readonly iac = {
    summary: async (params?: { repositoryId?: string | null; projectId?: string | null }): Promise<import('@/types/api/iac').IaCSummaryResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCSummaryResponse>(`/api/v1/iac/summary${qs}`);
      return res.data;
    },

    findings: async (params?: {
      repositoryId?: string | null;
      projectId?: string | null;
      search?: string;
      provider?: string;
      framework?: string;
      severity?: string;
      status?: string;
      category?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/iac').IaCFindingsPageResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.provider && params.provider !== 'All Providers' && params.provider !== 'All') {
        p.set('provider', params.provider);
      }
      if (params?.framework && params.framework !== 'All Frameworks' && params.framework !== 'All') {
        p.set('framework', params.framework);
      }
      if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') {
        p.set('severity', params.severity);
      }
      if (params?.status && params.status !== 'All Status' && params.status !== 'All') {
        p.set('status', params.status);
      }
      if (params?.category && params.category !== 'All Categories' && params.category !== 'All') {
        p.set('category', params.category);
      }
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));

      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCFindingsPageResponse>(`/api/v1/iac/findings${qs}`);
      return res.data;
    },

    findingDetail: async (findingId: string): Promise<import('@/types/api/iac').IaCFindingItem> => {
      const res = await this.request<import('@/types/api/iac').IaCFindingItem>(
        `/api/v1/iac/findings/${encodeURIComponent(findingId)}`
      );
      return res.data;
    },

    scan: async (payload: {
      repository_id: string;
      branch?: string;
      frameworks?: string[];
    }): Promise<import('@/types/api/iac').IaCScanJobResponse> => {
      const res = await this.request<import('@/types/api/iac').IaCScanJobResponse>(
        '/api/v1/iac/scan',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    scanJob: async (jobId: string): Promise<import('@/types/api/iac').IaCScanJobResponse> => {
      const res = await this.request<import('@/types/api/iac').IaCScanJobResponse>(
        `/api/v1/iac/jobs/${encodeURIComponent(jobId)}`
      );
      return res.data;
    },

    getConfig: async (repositoryId: string): Promise<import('@/types/api/iac').IaCScanConfig> => {
      const res = await this.request<import('@/types/api/iac').IaCScanConfig>(
        `/api/v1/iac/config?repository_id=${encodeURIComponent(repositoryId)}`
      );
      return res.data;
    },

    updateConfig: async (config: import('@/types/api/iac').IaCScanConfig): Promise<import('@/types/api/iac').IaCScanConfig> => {
      const res = await this.request<import('@/types/api/iac').IaCScanConfig>(
        '/api/v1/iac/config',
        {
          method: 'POST',
          body: JSON.stringify(config),
        }
      );
      return res.data;
    },

    applyFix: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/iac/findings/${encodeURIComponent(findingId)}/apply-fix`, {
        method: 'POST',
      });
      return res.data;
    },

    createPR: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/iac/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
      });
      return res.data;
    },

    suppress: async (findingId: string, reason = 'Accepted Business Risk'): Promise<any> => {
      const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
      const res = await this.request<any>(`/api/v1/iac/findings/${encodeURIComponent(findingId)}/suppress${q}`, {
        method: 'POST',
      });
      return res.data;
    },

    updateStatus: async (findingId: string, status: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/iac/findings/${encodeURIComponent(findingId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return res.data;
    },

    exportReport: async (params?: { repositoryId?: string | null; projectId?: string | null; format?: string }): Promise<Blob | void> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.format) p.set('format', params.format);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<any>(`/api/v1/iac/export${qs}`);
      if (typeof window !== 'undefined') {
        const isJson = params?.format === 'json';
        const blob = new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)], {
          type: isJson ? 'application/json' : 'text/csv',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iac-security-report-${Date.now()}.${isJson ? 'json' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      return res.data;
    },

    scans: async (params?: { repositoryId?: string | null; projectId?: string | null }): Promise<import('@/types/api/iac').IaCScansListResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCScansListResponse>(`/api/v1/iac/scans${qs}`);
      return res.data;
    },

    scanDetail: async (scanId: string): Promise<import('@/types/api/iac').IaCScanDetailResponse> => {
      const res = await this.request<import('@/types/api/iac').IaCScanDetailResponse>(
        `/api/v1/iac/scans/${encodeURIComponent(scanId)}`
      );
      return res.data;
    },

    rerunScan: async (scanId: string): Promise<import('@/types/api/iac').IaCScanJobResponse> => {
      const res = await this.request<import('@/types/api/iac').IaCScanJobResponse>(
        `/api/v1/iac/scans/${encodeURIComponent(scanId)}/rerun`,
        { method: 'POST' }
      );
      return res.data;
    },

    updateScanConfig: async (
      scanId: string,
      payload: import('@/types/api/iac').IaCUpdateScanConfigRequest
    ): Promise<import('@/types/api/iac').IaCScanConfigDetails> => {
      const res = await this.request<import('@/types/api/iac').IaCScanConfigDetails>(
        `/api/v1/iac/scans/${encodeURIComponent(scanId)}/config`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    exportScanReport: async (scanId: string, format: string = 'json'): Promise<void> => {
      const res = await this.request<any>(
        `/api/v1/iac/scans/${encodeURIComponent(scanId)}/export?format=${encodeURIComponent(format)}`
      );
      if (typeof window !== 'undefined' && res.data) {
        const isJson = format.toLowerCase() === 'json' || format.toLowerCase() === 'sarif';
        const blob = new Blob(
          [typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)],
          { type: isJson ? 'application/json' : 'text/csv' }
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iac-scan-${scanId}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    },

    downloadScanLogs: async (scanId: string): Promise<void> => {
      const res = await this.request<any>(
        `/api/v1/iac/scans/${encodeURIComponent(scanId)}/logs/download`
      );
      if (typeof window !== 'undefined' && res.data) {
        const blob = new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data)], {
          type: 'text/plain',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iac-scan-${scanId}-logs.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    },


    files: async (params?: { repositoryId?: string | null; projectId?: string | null }): Promise<import('@/types/api/iac').IaCFilesListResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCFilesListResponse>(`/api/v1/iac/files${qs}`);
      return res.data;
    },

    fileContent: async (filePath: string, repositoryId?: string | null): Promise<import('@/types/api/iac').IaCFileContentResponse> => {
      const p = new URLSearchParams();
      if (repositoryId) p.set('repository_id', repositoryId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCFileContentResponse>(`/api/v1/iac/files/${encodeURIComponent(filePath)}${qs}`);
      return res.data;
    },

    policies: async (params?: { repositoryId?: string | null; projectId?: string | null }): Promise<import('@/types/api/iac').IaCPoliciesListResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCPoliciesListResponse>(`/api/v1/iac/policies${qs}`);
      return res.data;
    },

    updatePolicyStatus: async (ruleId: string, status: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/iac/policies/${encodeURIComponent(ruleId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return res.data;
    },

    compliance: async (params?: {
      repositoryId?: string | null;
      projectId?: string | null;
      search?: string;
      framework?: string;
      status?: string;
      provider?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/iac').IaCComplianceResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.framework && params.framework !== 'All Frameworks') p.set('framework', params.framework);
      if (params?.status && params.status !== 'All Status') p.set('status', params.status);
      if (params?.provider && params.provider !== 'All Providers') p.set('provider', params.provider);
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCComplianceResponse>(`/api/v1/iac/compliance${qs}`);
      return res.data;
    },

    remediation: async (params?: {
      repositoryId?: string | null;
      projectId?: string | null;
      search?: string;
      provider?: string;
      severity?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/iac').IaCRemediationOverviewResponse> => {
      const p = new URLSearchParams();
      if (params?.repositoryId) p.set('repository_id', params.repositoryId);
      if (params?.projectId) p.set('project_id', params.projectId);
      if (params?.search) p.set('search', params.search);
      if (params?.provider && params.provider !== 'All Providers') p.set('provider', params.provider);
      if (params?.severity && params.severity !== 'All Severities') p.set('severity', params.severity);
      if (params?.status && params.status !== 'All Status') p.set('status', params.status);
      if (params?.page) p.set('page', String(params.page));
      if (params?.pageSize) p.set('page_size', String(params.pageSize));
      const qs = p.toString() ? `?${p.toString()}` : '';
      const res = await this.request<import('@/types/api/iac').IaCRemediationOverviewResponse>(`/api/v1/iac/remediation${qs}`);
      return res.data;
    },

    createFindingPR: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/iac/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
      });
      return res.data;
    },

    drift: {
      getOverview: async (): Promise<IaCDriftOverviewResponse> => {
        const res = await this.request<IaCDriftOverviewResponse>('/api/v1/iac/drift/overview');
        return res.data;
      },
      overview: async (): Promise<IaCDriftOverviewResponse> => {
        const res = await this.request<IaCDriftOverviewResponse>('/api/v1/iac/drift/overview');
        return res.data;
      },
      getResources: async (params?: { search?: string; provider?: string; status?: string; page?: number; pageSize?: number }): Promise<IaCDriftResourcesPage> => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.provider) q.append('provider', params.provider);
        if (params?.status) q.append('status', params.status);
        if (params?.page) q.append('page', params.page.toString());
        if (params?.pageSize) q.append('page_size', params.pageSize.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCDriftResourcesPage>(`/api/v1/iac/drift/resources${qs}`);
        return res.data;
      },
      resources: async (params?: { search?: string; provider?: string; status?: string; page?: number; pageSize?: number }): Promise<IaCDriftResourcesPage> => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.provider) q.append('provider', params.provider);
        if (params?.status) q.append('status', params.status);
        if (params?.page) q.append('page', params.page.toString());
        if (params?.pageSize) q.append('page_size', params.pageSize.toString());
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCDriftResourcesPage>(`/api/v1/iac/drift/resources${qs}`);
        return res.data;
      },
      getResourceDetail: async (resourceId: string): Promise<IaCDriftResourceItem> => {
        const res = await this.request<IaCDriftResourceItem>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}`);
        return res.data;
      },
      rescanResource: async (resourceId: string): Promise<IaCDriftResourceItem> => {
        const res = await this.request<IaCDriftResourceItem>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/rescan`, {
          method: 'POST',
        });
        return res.data;
      },
      rescanAll: async (): Promise<{ scanned_count: number; timestamp: string }> => {
        const res = await this.request<{ scanned_count: number; timestamp: string }>('/api/v1/iac/drift/rescan-all', {
          method: 'POST',
        });
        return res.data;
      },
      getTimeline: async (resourceId: string): Promise<IaCDriftEventItem[]> => {
        const res = await this.request<IaCDriftEventItem[]>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/timeline`);
        return res.data;
      },
      getConfig: async (resourceId: string): Promise<IaCDriftConfigDTO> => {
        const res = await this.request<IaCDriftConfigDTO>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/config`);
        return res.data;
      },
      updateConfig: async (resourceId: string, data: IaCDriftConfigDTO): Promise<IaCDriftConfigDTO> => {
        const res = await this.request<IaCDriftConfigDTO>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/config`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },
      getBaseline: async (workspace?: string): Promise<IaCBaselineStateDTO> => {
        const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
        const res = await this.request<IaCBaselineStateDTO>(`/api/v1/iac/drift/baseline${q}`);
        return res.data;
      },
      compareBaseline: async (payload: IaCBaselineCompareRequest): Promise<IaCBaselineCompareResult> => {
        const res = await this.request<IaCBaselineCompareResult>('/api/v1/iac/drift/baseline/compare', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      baselineCompare: async (payload: IaCBaselineCompareRequest): Promise<IaCBaselineCompareResult> => {
        const res = await this.request<IaCBaselineCompareResult>('/api/v1/iac/drift/baseline/compare', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      updateBaseline: async (payload: IaCBaselineCompareRequest): Promise<IaCBaselineStateDTO> => {
        const res = await this.request<IaCBaselineStateDTO>('/api/v1/iac/drift/baseline', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      generatePlan: async (resourceId: string): Promise<IaCRemediationPlanResponse> => {
        const res = await this.request<IaCRemediationPlanResponse>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/remediate/plan`, {
          method: 'POST',
        });
        return res.data;
      },
      plan: async (resourceId: string): Promise<IaCRemediationPlanResponse> => {
        const res = await this.request<IaCRemediationPlanResponse>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/remediate/plan`, {
          method: 'POST',
        });
        return res.data;
      },
      applyRemediation: async (resourceId: string, payload?: { target_action?: string; comments?: string; comment?: string }): Promise<IaCApplyRemediationResponse> => {
        const res = await this.request<IaCApplyRemediationResponse>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/remediate/apply`, {
          method: 'POST',
          body: JSON.stringify(payload || {}),
        });
        return res.data;
      },
      ignoreResource: async (resourceId: string, reason: string): Promise<IaCDriftResourceItem> => {
        const res = await this.request<IaCDriftResourceItem>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/ignore`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        return res.data;
      },
      ignore: async (resourceId: string, reason?: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/ignore`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Business exception' }),
        });
        return res.data;
      },
      unignore: async (resourceId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/drift/resources/${encodeURIComponent(resourceId)}/unignore`, {
          method: 'POST',
        });
        return res.data;
      },
      getSettings: async (): Promise<IaCDriftGlobalSettingsDTO> => {
        const res = await this.request<IaCDriftGlobalSettingsDTO>('/api/v1/iac/drift/settings');
        return res.data;
      },
      globalSettings: async (): Promise<IaCDriftGlobalSettingsDTO> => {
        const res = await this.request<IaCDriftGlobalSettingsDTO>('/api/v1/iac/drift/settings');
        return res.data;
      },
      updateSettings: async (data: IaCDriftGlobalSettingsDTO): Promise<IaCDriftGlobalSettingsDTO> => {
        const res = await this.request<IaCDriftGlobalSettingsDTO>('/api/v1/iac/drift/settings', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },
      updateGlobalSettings: async (settings: Partial<IaCDriftGlobalSettingsDTO>): Promise<IaCDriftGlobalSettingsDTO> => {
        const res = await this.request<IaCDriftGlobalSettingsDTO>('/api/v1/iac/drift/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
        return res.data;
      },
      addIgnoredPattern: async (pattern: string, reason: string, addedBy?: string): Promise<IaCIgnoredResourceItem> => {
        const res = await this.request<IaCIgnoredResourceItem>('/api/v1/iac/drift/settings/ignored-patterns', {
          method: 'POST',
          body: JSON.stringify({ resource_pattern: pattern, reason, added_by: addedBy }),
        });
        return res.data;
      },
      deleteIgnoredPattern: async (patternId: string): Promise<boolean> => {
        const res = await this.request<any>(`/api/v1/iac/drift/settings/ignored-patterns/${encodeURIComponent(patternId)}`, {
          method: 'DELETE',
        });
        return res.data?.success ?? true;
      },
    },

    /**
     * Section 4: Configuration Analysis Gateway
     */
    configAnalysis: {
      getOverview: async (params?: { repositoryId?: string; projectId?: string; timeRange?: string }): Promise<IaCConfigAnalysisOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.timeRange) q.set('time_range', params.timeRange);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCConfigAnalysisOverviewResponse>(`/api/v1/iac/config-analysis/overview${qs}`);
        return res.data;
      },
      getInventory: async (params?: {
        repositoryId?: string;
        projectId?: string;
        search?: string;
        provider?: string;
        resourceType?: string;
        environment?: string;
        page?: number;
        pageSize?: number;
      }): Promise<IaCInventoryPageResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.search) q.set('search', params.search);
        if (params?.provider) q.set('provider', params.provider);
        if (params?.resourceType) q.set('resource_type', params.resourceType);
        if (params?.environment) q.set('environment', params.environment);
        if (params?.page) q.set('page', String(params.page));
        if (params?.pageSize) q.set('page_size', String(params.pageSize));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCInventoryPageResponse>(`/api/v1/iac/config-analysis/inventory${qs}`);
        return res.data;
      },
      getMisconfigurations: async (params?: {
        repositoryId?: string;
        projectId?: string;
        search?: string;
        severity?: string;
        provider?: string;
        resourceType?: string;
        page?: number;
        pageSize?: number;
      }): Promise<IaCMisconfigurationsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.search) q.set('search', params.search);
        if (params?.severity) q.set('severity', params.severity);
        if (params?.provider) q.set('provider', params.provider);
        if (params?.resourceType) q.set('resource_type', params.resourceType);
        if (params?.page) q.set('page', String(params.page));
        if (params?.pageSize) q.set('page_size', String(params.pageSize));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCMisconfigurationsPageResponse>(`/api/v1/iac/config-analysis/misconfigurations${qs}`);
        return res.data;
      },
      getSecureConfigs: async (params?: {
        repositoryId?: string;
        projectId?: string;
        search?: string;
        provider?: string;
        resourceType?: string;
        page?: number;
        pageSize?: number;
      }): Promise<IaCSecureConfigsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.search) q.set('search', params.search);
        if (params?.provider) q.set('provider', params.provider);
        if (params?.resourceType) q.set('resource_type', params.resourceType);
        if (params?.page) q.set('page', String(params.page));
        if (params?.pageSize) q.set('page_size', String(params.pageSize));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCSecureConfigsPageResponse>(`/api/v1/iac/config-analysis/secure-configs${qs}`);
        return res.data;
      },
      getDrift: async (params?: {
        repositoryId?: string;
        projectId?: string;
        search?: string;
        provider?: string;
        resourceType?: string;
        status?: string;
        page?: number;
        pageSize?: number;
      }): Promise<IaCConfigDriftPageResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.search) q.set('search', params.search);
        if (params?.provider) q.set('provider', params.provider);
        if (params?.resourceType) q.set('resource_type', params.resourceType);
        if (params?.status) q.set('status', params.status);
        if (params?.page) q.set('page', String(params.page));
        if (params?.pageSize) q.set('page_size', String(params.pageSize));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCConfigDriftPageResponse>(`/api/v1/iac/config-analysis/drift${qs}`);
        return res.data;
      },
      getBestPractices: async (params?: {
        repositoryId?: string;
        projectId?: string;
        framework?: string;
        search?: string;
      }): Promise<IaCBestPracticesResponse> => {
        const q = new URLSearchParams();
        if (params?.repositoryId) q.set('repository_id', params.repositoryId);
        if (params?.projectId) q.set('project_id', params.projectId);
        if (params?.framework) q.set('framework', params.framework);
        if (params?.search) q.set('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCBestPracticesResponse>(`/api/v1/iac/config-analysis/best-practices${qs}`);
        return res.data;
      },
      getResourceDetail: async (resourceId: string): Promise<IaCResourceAnalysisDetailResponse> => {
        const res = await this.request<IaCResourceAnalysisDetailResponse>(`/api/v1/iac/config-analysis/resources/${encodeURIComponent(resourceId)}`);
        return res.data;
      },
      getComparison: async (resourceId: string, viewMode: string = 'Side by side'): Promise<IaCComparisonDiffResponse> => {
        const res = await this.request<IaCComparisonDiffResponse>(`/api/v1/iac/config-analysis/compare/${encodeURIComponent(resourceId)}?view_mode=${encodeURIComponent(viewMode)}`);
        return res.data;
      },
      reconcileDrift: async (resourceId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/config-analysis/reconcile/${encodeURIComponent(resourceId)}`, {
          method: 'POST',
        });
        return res.data;
      },
    },

    overview: {
      getDashboard: async (params?: { repository_id?: string; project_id?: string; time_range?: string }): Promise<IaCSecurityOverviewDashboardResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.time_range) q.append('time_range', params.time_range);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCSecurityOverviewDashboardResponse>(`/api/v1/iac/overview/dashboard${qs}`);
        return res.data;
      },

      getEnvironments: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCEnvironmentOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCEnvironmentOverviewResponse>(`/api/v1/iac/overview/environments${qs}`);
        return res.data;
      },

      getProviders: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCProviderOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCProviderOverviewResponse>(`/api/v1/iac/overview/providers${qs}`);
        return res.data;
      },

      getResources: async (params?: {
        repository_id?: string;
        project_id?: string;
        search?: string;
        provider?: string;
        environment?: string;
        resource_type?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCOverviewResourcesResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.search) q.append('search', params.search);
        if (params?.provider) q.append('provider', params.provider);
        if (params?.environment) q.append('environment', params.environment);
        if (params?.resource_type) q.append('resource_type', params.resource_type);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCOverviewResourcesResponse>(`/api/v1/iac/overview/resources${qs}`);
        return res.data;
      },

      getCoverage: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCCoverageResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCCoverageResponse>(`/api/v1/iac/overview/coverage${qs}`);
        return res.data;
      },

      getCompliance: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCOverviewComplianceResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCOverviewComplianceResponse>(`/api/v1/iac/overview/compliance${qs}`);
        return res.data;
      },

      getRisk: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCRiskSummaryResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCRiskSummaryResponse>(`/api/v1/iac/overview/risk${qs}`);
        return res.data;
      },

      getActivity: async (params?: {
        repository_id?: string;
        project_id?: string;
        activity_type?: string;
        user_filter?: string;
      }): Promise<IaCRecentActivityResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.activity_type) q.append('activity_type', params.activity_type);
        if (params?.user_filter) q.append('user_filter', params.user_filter);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCRecentActivityResponse>(`/api/v1/iac/overview/activity${qs}`);
        return res.data;
      },
    },

    policiesGates: {
      getOverview: async (params?: { repository_id?: string; project_id?: string }): Promise<IaCPoliciesQualityGatesOverviewResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCPoliciesQualityGatesOverviewResponse>(`/api/v1/iac/policies-gates/overview${qs}`);
        return res.data;
      },

      getPolicies: async (params?: {
        repository_id?: string;
        project_id?: string;
        search?: string;
        type?: string;
        status?: string;
        framework?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCPoliciesCatalogResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.search) q.append('search', params.search);
        if (params?.type && params.type !== 'All Types') q.append('type', params.type);
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.framework && params.framework !== 'All Frameworks') q.append('framework', params.framework);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCPoliciesCatalogResponse>(`/api/v1/iac/policies-gates/policies${qs}`);
        return res.data;
      },

      getPolicyDetail: async (policyId: string): Promise<IaCPolicyDetailResponse> => {
        const res = await this.request<IaCPolicyDetailResponse>(`/api/v1/iac/policies-gates/policies/${encodeURIComponent(policyId)}`);
        return res.data;
      },

      createPolicy: async (data: CreateIaCPolicyRequest): Promise<IaCPolicyDetailResponse> => {
        const res = await this.request<IaCPolicyDetailResponse>('/api/v1/iac/policies-gates/policies', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      updatePolicy: async (policyId: string, updates: Record<string, any>): Promise<IaCPolicyDetailResponse> => {
        const res = await this.request<IaCPolicyDetailResponse>(`/api/v1/iac/policies-gates/policies/${encodeURIComponent(policyId)}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        return res.data;
      },

      getQualityGates: async (params?: {
        repository_id?: string;
        project_id?: string;
        search?: string;
        status?: string;
        repository?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCQualityGatesListResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.search) q.append('search', params.search);
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.repository && params.repository !== 'All Repositories') q.append('repository', params.repository);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCQualityGatesListResponse>(`/api/v1/iac/policies-gates/quality-gates${qs}`);
        return res.data;
      },

      getQualityGateDetail: async (gateId: string): Promise<IaCQualityGateDetailResponse> => {
        const res = await this.request<IaCQualityGateDetailResponse>(`/api/v1/iac/policies-gates/quality-gates/${encodeURIComponent(gateId)}`);
        return res.data;
      },

      createQualityGate: async (data: CreateQualityGateRequest): Promise<IaCQualityGateDetailResponse> => {
        const res = await this.request<IaCQualityGateDetailResponse>('/api/v1/iac/policies-gates/quality-gates', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      addQualityGateRule: async (gateId: string, data: AddQualityGateRuleRequest): Promise<IaCQualityGateDetailResponse> => {
        const res = await this.request<IaCQualityGateDetailResponse>(`/api/v1/iac/policies-gates/quality-gates/${encodeURIComponent(gateId)}/rules`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      removeQualityGateRule: async (gateId: string, ruleId: string): Promise<IaCQualityGateDetailResponse> => {
        const res = await this.request<IaCQualityGateDetailResponse>(`/api/v1/iac/policies-gates/quality-gates/${encodeURIComponent(gateId)}/rules/${encodeURIComponent(ruleId)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      getViolations: async (params?: {
        repository_id?: string;
        project_id?: string;
        search?: string;
        severity?: string;
        status?: string;
        repository?: string;
        time_range?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCPolicyViolationsResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.search) q.append('search', params.search);
        if (params?.severity && params.severity !== 'All Severities') q.append('severity', params.severity);
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.repository && params.repository !== 'All Repositories') q.append('repository', params.repository);
        if (params?.time_range) q.append('time_range', params.time_range);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCPolicyViolationsResponse>(`/api/v1/iac/policies-gates/violations${qs}`);
        return res.data;
      },

      getExceptions: async (params?: {
        repository_id?: string;
        project_id?: string;
        search?: string;
        status?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCPolicyExceptionsResponse> => {
        const q = new URLSearchParams();
        if (params?.repository_id) q.append('repository_id', params.repository_id);
        if (params?.project_id) q.append('project_id', params.project_id);
        if (params?.search) q.append('search', params.search);
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCPolicyExceptionsResponse>(`/api/v1/iac/policies-gates/exceptions${qs}`);
        return res.data;
      },

      createException: async (data: CreatePolicyExceptionRequest): Promise<IaCPolicyExceptionItem> => {
        const res = await this.request<IaCPolicyExceptionItem>('/api/v1/iac/policies-gates/exceptions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getSettings: async (): Promise<IaCPoliciesSettings> => {
        const res = await this.request<IaCPoliciesSettings>('/api/v1/iac/policies-gates/settings');
        return res.data;
      },

      updateSettings: async (settings: IaCPoliciesSettings): Promise<IaCPoliciesSettings> => {
        const res = await this.request<IaCPoliciesSettings>('/api/v1/iac/policies-gates/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
        return res.data;
      },
    },

    rules: {
      getOverview: async (): Promise<IaCRulesOverviewResponse> => {
        const res = await this.request<IaCRulesOverviewResponse>('/api/v1/iac/rules/overview');
        return res.data;
      },

      getRules: async (params?: {
        search?: string;
        framework?: string;
        provider?: string;
        severity?: string;
        status?: string;
        category?: string;
        rule_type?: string;
        is_custom?: boolean;
        page?: number;
        page_size?: number;
      }): Promise<IaCRulesListResponse> => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.framework && params.framework !== 'All Frameworks' && params.framework !== 'All') q.append('framework', params.framework);
        if (params?.provider && params.provider !== 'All Providers' && params.provider !== 'All') q.append('provider', params.provider);
        if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') q.append('severity', params.severity);
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') q.append('status', params.status);
        if (params?.category && params.category !== 'All') q.append('category', params.category);
        if (params?.rule_type && params.rule_type !== 'All') q.append('rule_type', params.rule_type);
        if (params?.is_custom !== undefined) q.append('is_custom', String(params.is_custom));
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCRulesListResponse>(`/api/v1/iac/rules${qs}`);
        return res.data;
      },

      createRule: async (data: CreateRuleRequest): Promise<IaCRuleDetailResponse> => {
        const res = await this.request<IaCRuleDetailResponse>('/api/v1/iac/rules', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getRuleDetail: async (ruleId: string): Promise<IaCRuleDetailResponse> => {
        const res = await this.request<IaCRuleDetailResponse>(`/api/v1/iac/rules/${encodeURIComponent(ruleId)}`);
        return res.data;
      },

      updateRule: async (ruleId: string, data: UpdateRuleRequest): Promise<IaCRuleDetailResponse> => {
        const res = await this.request<IaCRuleDetailResponse>(`/api/v1/iac/rules/${encodeURIComponent(ruleId)}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      updateRuleStatus: async (ruleId: string, status: string): Promise<IaCRuleItem> => {
        const res = await this.request<IaCRuleItem>(`/api/v1/iac/rules/${encodeURIComponent(ruleId)}/status?status=${encodeURIComponent(status)}`, {
          method: 'PATCH',
        });
        return res.data;
      },

      deleteRule: async (ruleId: string): Promise<{ status: string; id: string }> => {
        const res = await this.request<{ status: string; id: string }>(`/api/v1/iac/rules/${encodeURIComponent(ruleId)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      validateRego: async (data: ValidateRegoRequest): Promise<ValidateRegoResponse> => {
        const res = await this.request<ValidateRegoResponse>('/api/v1/iac/rules/validate-rego', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getPacks: async (): Promise<IaCRulePacksListResponse> => {
        const res = await this.request<IaCRulePacksListResponse>('/api/v1/iac/rules/packs');
        return res.data;
      },

      togglePack: async (packName: string, status: string): Promise<IaCRulePackItem> => {
        const res = await this.request<IaCRulePackItem>(`/api/v1/iac/rules/packs/${encodeURIComponent(packName)}/status?status=${encodeURIComponent(status)}`, {
          method: 'PATCH',
        });
        return res.data;
      },
    },

    scansSuite: {
      getOverview: async (timeRange: string = 'Last 30 days'): Promise<IaCScansOverviewResponse> => {
        const q = timeRange ? `?time_range=${encodeURIComponent(timeRange)}` : '';
        const res = await this.request<IaCScansOverviewResponse>(`/api/v1/iac/scans-suite/overview${q}`);
        return res.data;
      },

      getHistory: async (params?: {
        repository?: string;
        environment?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCScanHistoryResponse> => {
        const q = new URLSearchParams();
        if (params?.repository && params.repository !== 'All Repositories' && params.repository !== 'All') q.append('repository', params.repository);
        if (params?.environment && params.environment !== 'All Environments' && params.environment !== 'All') q.append('environment', params.environment);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCScanHistoryResponse>(`/api/v1/iac/scans-suite/history${qs}`);
        return res.data;
      },

      getSchedules: async (): Promise<IaCScheduledScansResponse> => {
        const res = await this.request<IaCScheduledScansResponse>('/api/v1/iac/scans-suite/schedules');
        return res.data;
      },

      createSchedule: async (data: CreateScheduledScanRequest): Promise<IaCScheduledScanItem> => {
        const res = await this.request<IaCScheduledScanItem>('/api/v1/iac/scans-suite/schedules', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      toggleSchedule: async (scheduleId: string, status: string): Promise<IaCScheduledScanItem> => {
        const res = await this.request<IaCScheduledScanItem>(`/api/v1/iac/scans-suite/schedules/${encodeURIComponent(scheduleId)}/status?status=${encodeURIComponent(status)}`, {
          method: 'PATCH',
        });
        return res.data;
      },

      deleteSchedule: async (scheduleId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/scans-suite/schedules/${encodeURIComponent(scheduleId)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      triggerOnDemand: async (data: TriggerOnDemandScanRequest): Promise<TriggerOnDemandScanResponse> => {
        const res = await this.request<TriggerOnDemandScanResponse>('/api/v1/iac/scans-suite/on-demand', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getConfigurations: async (): Promise<IaCScanConfigurationsDTO> => {
        const res = await this.request<IaCScanConfigurationsDTO>('/api/v1/iac/scans-suite/configurations');
        return res.data;
      },

      updateConfigurations: async (data: IaCScanConfigurationsDTO): Promise<IaCScanConfigurationsDTO> => {
        const res = await this.request<IaCScanConfigurationsDTO>('/api/v1/iac/scans-suite/configurations', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getComparison: async (scan1Id?: string, scan2Id?: string): Promise<IaCResultsComparisonResponse> => {
        const q = new URLSearchParams();
        if (scan1Id) q.append('scan_1_id', scan1Id);
        if (scan2Id) q.append('scan_2_id', scan2Id);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCResultsComparisonResponse>(`/api/v1/iac/scans-suite/comparison${qs}`);
        return res.data;
      },

      getQueue: async (): Promise<IaCScanQueueResponse> => {
        const res = await this.request<IaCScanQueueResponse>('/api/v1/iac/scans-suite/queue');
        return res.data;
      },

      cancelQueueAll: async (): Promise<any> => {
        const res = await this.request<any>('/api/v1/iac/scans-suite/queue/cancel-all', {
          method: 'POST',
        });
        return res.data;
      },

      cancelQueueScan: async (scanId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/scans-suite/queue/${encodeURIComponent(scanId)}/cancel`, {
          method: 'POST',
        });
        return res.data;
      },

      getSettings: async (): Promise<IaCScanGlobalSettings> => {
        const res = await this.request<IaCScanGlobalSettings>('/api/v1/iac/scans-suite/settings');
        return res.data;
      },

      updateSettings: async (data: IaCScanGlobalSettings): Promise<IaCScanGlobalSettings> => {
        const res = await this.request<IaCScanGlobalSettings>('/api/v1/iac/scans-suite/settings', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },
    },

    complianceSuite: {
      getOverview: async (repository?: string): Promise<IaCComplianceOverviewResponse> => {
        const q = repository && repository !== 'All Repositories' ? `?repository=${encodeURIComponent(repository)}` : '';
        const res = await this.request<IaCComplianceOverviewResponse>(`/api/v1/iac/compliance-suite/overview${q}`);
        return res.data;
      },

      getFrameworks: async (search?: string): Promise<IaCComplianceFrameworksResponse> => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await this.request<IaCComplianceFrameworksResponse>(`/api/v1/iac/compliance-suite/frameworks${q}`);
        return res.data;
      },

      createFramework: async (data: CreateFrameworkRequest): Promise<IaCComplianceFrameworkItem> => {
        const res = await this.request<IaCComplianceFrameworkItem>('/api/v1/iac/compliance-suite/frameworks', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getControls: async (params?: {
        framework?: string;
        status?: string;
        severity?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCComplianceControlsResponse> => {
        const q = new URLSearchParams();
        if (params?.framework && params.framework !== 'All Frameworks' && params.framework !== 'All') q.append('framework', params.framework);
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') q.append('status', params.status);
        if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') q.append('severity', params.severity);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCComplianceControlsResponse>(`/api/v1/iac/compliance-suite/controls${qs}`);
        return res.data;
      },

      getControlDetail: async (controlId: string): Promise<IaCControlDetailResponse> => {
        const res = await this.request<IaCControlDetailResponse>(`/api/v1/iac/compliance-suite/controls/${encodeURIComponent(controlId)}`);
        return res.data;
      },

      generateReport: async (data: GenerateComplianceReportRequest): Promise<ComplianceReportGeneratedResponse> => {
        const res = await this.request<ComplianceReportGeneratedResponse>('/api/v1/iac/compliance-suite/reports/generate', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getReports: async (): Promise<ComplianceReportHistoryResponse> => {
        const res = await this.request<ComplianceReportHistoryResponse>('/api/v1/iac/compliance-suite/reports');
        return res.data;
      },

      getEvidence: async (params?: {
        framework?: string;
        control_id?: string;
        status?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCComplianceEvidenceResponse> => {
        const q = new URLSearchParams();
        if (params?.framework && params.framework !== 'All Frameworks' && params.framework !== 'All') q.append('framework', params.framework);
        if (params?.control_id && params.control_id !== 'All Controls' && params.control_id !== 'All') q.append('control_id', params.control_id);
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCComplianceEvidenceResponse>(`/api/v1/iac/compliance-suite/evidence${qs}`);
        return res.data;
      },

      createEvidence: async (data: CreateEvidenceRequest): Promise<IaCComplianceEvidenceItem> => {
        const res = await this.request<IaCComplianceEvidenceItem>('/api/v1/iac/compliance-suite/evidence', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      deleteEvidence: async (evidenceId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/compliance-suite/evidence/${encodeURIComponent(evidenceId)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      getExceptions: async (params?: {
        status?: string;
        search?: string;
      }): Promise<IaCComplianceExceptionsResponse> => {
        const q = new URLSearchParams();
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') q.append('status', params.status);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCComplianceExceptionsResponse>(`/api/v1/iac/compliance-suite/exceptions${qs}`);
        return res.data;
      },

      createException: async (data: CreateComplianceExceptionRequest): Promise<IaCComplianceExceptionItem> => {
        const res = await this.request<IaCComplianceExceptionItem>('/api/v1/iac/compliance-suite/exceptions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      updateExceptionStatus: async (exceptionId: string, status: string): Promise<IaCComplianceExceptionItem> => {
        const res = await this.request<IaCComplianceExceptionItem>(
          `/api/v1/iac/compliance-suite/exceptions/${encodeURIComponent(exceptionId)}/status?status=${encodeURIComponent(status)}`,
          { method: 'PATCH' }
        );
        return res.data;
      },

      deleteException: async (exceptionId: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/compliance-suite/exceptions/${encodeURIComponent(exceptionId)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      getAuditLogs: async (params?: {
        event?: string;
        user?: string;
        date_range?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCComplianceAuditLogsResponse> => {
        const q = new URLSearchParams();
        if (params?.event && params.event !== 'All Events' && params.event !== 'All') q.append('event', params.event);
        if (params?.user && params.user !== 'All Users' && params.user !== 'All') q.append('user', params.user);
        if (params?.date_range) q.append('date_range', params.date_range);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCComplianceAuditLogsResponse>(`/api/v1/iac/compliance-suite/audit-logs${qs}`);
        return res.data;
      },

      getSettings: async (): Promise<IaCComplianceSettings> => {
        const res = await this.request<IaCComplianceSettings>('/api/v1/iac/compliance-suite/settings');
        return res.data;
      },

      updateSettings: async (data: IaCComplianceSettings): Promise<IaCComplianceSettings> => {
        const res = await this.request<IaCComplianceSettings>('/api/v1/iac/compliance-suite/settings', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },
    },

    driftSuite: {
      getOverview: async (environment?: string): Promise<IaCDriftSuiteOverviewResponse> => {
        const q = environment && environment !== 'All Environments' ? `?environment=${encodeURIComponent(environment)}` : '';
        const res = await this.request<IaCDriftSuiteOverviewResponse>(`/api/v1/iac/drift/suite/overview${q}`);
        return res.data;
      },

      getEnvironments: async (): Promise<IaCDriftEnvironmentsResponse> => {
        const res = await this.request<IaCDriftEnvironmentsResponse>('/api/v1/iac/drift/suite/environments');
        return res.data;
      },

      createEnvironment: async (data: CreateDriftEnvironmentRequest): Promise<IaCDriftEnvironmentItem> => {
        const res = await this.request<IaCDriftEnvironmentItem>('/api/v1/iac/drift/suite/environments', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      scanEnvironment: async (name: string): Promise<IaCDriftEnvironmentItem> => {
        const res = await this.request<IaCDriftEnvironmentItem>(`/api/v1/iac/drift/suite/environments/${encodeURIComponent(name)}/scan`, {
          method: 'POST',
        });
        return res.data;
      },

      deleteEnvironment: async (name: string): Promise<{ success: boolean; message: string }> => {
        const res = await this.request<{ success: boolean; message: string }>(`/api/v1/iac/drift/suite/environments/${encodeURIComponent(name)}`, {
          method: 'DELETE',
        });
        return res.data;
      },

      getChanges: async (params?: {
        environment?: string;
        change_type?: string;
        status?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCDriftChangesResponse> => {
        const q = new URLSearchParams();
        if (params?.environment && params.environment !== 'All Environments' && params.environment !== 'All') {
          q.append('environment', params.environment);
        }
        if (params?.change_type && params.change_type !== 'All Change Types' && params.change_type !== 'All') {
          q.append('change_type', params.change_type);
        }
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') {
          q.append('status', params.status);
        }
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCDriftChangesResponse>(`/api/v1/iac/drift/suite/changes${qs}`);
        return res.data;
      },

      getResourceDetail: async (resourceName: string): Promise<IaCDriftResourceDetailResponse> => {
        const res = await this.request<IaCDriftResourceDetailResponse>(`/api/v1/iac/drift/suite/resources/${encodeURIComponent(resourceName)}`);
        return res.data;
      },

      getRemediation: async (params?: {
        environment?: string;
        severity?: string;
        status?: string;
        search?: string;
      }): Promise<IaCDriftRemediationResponse> => {
        const q = new URLSearchParams();
        if (params?.environment && params.environment !== 'All Environments' && params.environment !== 'All') {
          q.append('environment', params.environment);
        }
        if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') {
          q.append('severity', params.severity);
        }
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') {
          q.append('status', params.status);
        }
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCDriftRemediationResponse>(`/api/v1/iac/drift/suite/remediation${qs}`);
        return res.data;
      },

      applyRemediation: async (id: string): Promise<ApplyDriftRemediationResponse> => {
        const res = await this.request<ApplyDriftRemediationResponse>(`/api/v1/iac/drift/suite/remediation/${encodeURIComponent(id)}/apply`, {
          method: 'POST',
        });
        return res.data;
      },

      getHistory: async (params?: {
        resource?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCDriftHistoryResponse> => {
        const q = new URLSearchParams();
        if (params?.resource && params.resource !== 'All Resources' && params.resource !== 'All') {
          q.append('resource', params.resource);
        }
        if (params?.start_date) q.append('start_date', params.start_date);
        if (params?.end_date) q.append('end_date', params.end_date);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCDriftHistoryResponse>(`/api/v1/iac/drift/suite/history${qs}`);
        return res.data;
      },

      getSettings: async (): Promise<IaCDriftSettingsDTO> => {
        const res = await this.request<IaCDriftSettingsDTO>('/api/v1/iac/drift/suite/settings');
        return res.data;
      },

      updateSettings: async (data: IaCDriftSettingsDTO): Promise<IaCDriftSettingsDTO> => {
        const res = await this.request<IaCDriftSettingsDTO>('/api/v1/iac/drift/suite/settings', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getCompare: async (resourceName?: string): Promise<IaCDriftCompareResponse> => {
        const target = resourceName ? encodeURIComponent(resourceName) : 'eks-prod-cluster';
        const res = await this.request<IaCDriftCompareResponse>(`/api/v1/iac/drift/suite/compare/${target}`);
        return res.data;
      },
    },

    findingsSuite: {
      getOverview: async (timeRange?: string): Promise<IaCFindingsOverviewResponse> => {
        const q = timeRange ? `?time_range=${encodeURIComponent(timeRange)}` : '';
        const res = await this.request<IaCFindingsOverviewResponse>(`/api/v1/iac/findings-suite/overview${q}`);
        return res.data;
      },

      getAll: async (params?: {
        severity?: string;
        provider?: string;
        framework?: string;
        status?: string;
        environment?: string;
        category?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsAllResponse> => {
        const q = new URLSearchParams();
        if (params?.severity && params.severity !== 'All Severities' && params.severity !== 'All') {
          q.append('severity', params.severity);
        }
        if (params?.provider && params.provider !== 'All Providers' && params.provider !== 'All') {
          q.append('provider', params.provider);
        }
        if (params?.framework && params.framework !== 'All Frameworks' && params.framework !== 'All') {
          q.append('framework', params.framework);
        }
        if (params?.status && params.status !== 'All Statuses' && params.status !== 'All') {
          q.append('status', params.status);
        }
        if (params?.environment && params.environment !== 'All Environments' && params.environment !== 'All') {
          q.append('environment', params.environment);
        }
        if (params?.category && params.category !== 'All Categories' && params.category !== 'All') {
          q.append('category', params.category);
        }
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsAllResponse>(`/api/v1/iac/findings-suite/all${qs}`);
        return res.data;
      },

      getByProvider: async (params?: {
        provider?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByProviderResponse> => {
        const q = new URLSearchParams();
        if (params?.provider) q.append('provider', params.provider);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByProviderResponse>(`/api/v1/iac/findings-suite/by-provider${qs}`);
        return res.data;
      },

      getBySeverity: async (params?: {
        severity?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsBySeverityResponse> => {
        const q = new URLSearchParams();
        if (params?.severity) q.append('severity', params.severity);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsBySeverityResponse>(`/api/v1/iac/findings-suite/by-severity${qs}`);
        return res.data;
      },

      getByCategory: async (params?: {
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByCategoryResponse> => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByCategoryResponse>(`/api/v1/iac/findings-suite/by-category${qs}`);
        return res.data;
      },

      getByFramework: async (params?: {
        framework?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByFrameworkResponse> => {
        const q = new URLSearchParams();
        if (params?.framework) q.append('framework', params.framework);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByFrameworkResponse>(`/api/v1/iac/findings-suite/by-framework${qs}`);
        return res.data;
      },

      getByEnvironment: async (params?: {
        environment?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByEnvironmentResponse> => {
        const q = new URLSearchParams();
        if (params?.environment) q.append('environment', params.environment);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByEnvironmentResponse>(`/api/v1/iac/findings-suite/by-environment${qs}`);
        return res.data;
      },

      export: async (data: ExportFindingsRequest): Promise<ExportFindingsResponse> => {
        const res = await this.request<ExportFindingsResponse>('/api/v1/iac/findings-suite/export', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      updateStatus: async (findingId: string, status: string): Promise<any> => {
        const res = await this.request<any>(`/api/v1/iac/findings-suite/${encodeURIComponent(findingId)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        return res.data;
      },

      // 3.3 Finding Detail
      getDetail: async (findingId: string): Promise<IaCFindingDetailResponse> => {
        const res = await this.request<IaCFindingDetailResponse>(
          `/api/v1/iac/findings-suite/detail/${encodeURIComponent(findingId)}`
        );
        return res.data;
      },

      assign: async (findingId: string, assignee: string): Promise<IaCFindingDetailResponse> => {
        const res = await this.request<IaCFindingDetailResponse>(
          `/api/v1/iac/findings-suite/detail/${encodeURIComponent(findingId)}/assign`,
          {
            method: 'POST',
            body: JSON.stringify({ assignee }),
          }
        );
        return res.data;
      },

      comment: async (findingId: string, commentText: string, author?: string): Promise<IaCFindingDetailResponse> => {
        const res = await this.request<IaCFindingDetailResponse>(
          `/api/v1/iac/findings-suite/detail/${encodeURIComponent(findingId)}/comment`,
          {
            method: 'POST',
            body: JSON.stringify({ comment: commentText, author }),
          }
        );
        return res.data;
      },

      remediate: async (findingId: string, action: 'apply' | 'revert' = 'apply'): Promise<IaCFindingDetailResponse> => {
        const res = await this.request<IaCFindingDetailResponse>(
          `/api/v1/iac/findings-suite/detail/${encodeURIComponent(findingId)}/remediate`,
          {
            method: 'POST',
            body: JSON.stringify({ action }),
          }
        );
        return res.data;
      },

      // 3.4 Findings Triage
      getTriage: async (params?: {
        status?: string;
        severity?: string;
        provider?: string;
        assignee?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsTriageResponse> => {
        const q = new URLSearchParams();
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.severity && params.severity !== 'All Severities') q.append('severity', params.severity);
        if (params?.provider && params.provider !== 'All Providers') q.append('provider', params.provider);
        if (params?.assignee && params.assignee !== 'All Assignees') q.append('assignee', params.assignee);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsTriageResponse>(`/api/v1/iac/findings-suite/triage${qs}`);
        return res.data;
      },

      bulkAction: async (
        action: 'assign' | 'set_status' | 'suppress' | string,
        findingIds: string[],
        value: string
      ): Promise<{ success: boolean; updated_count: number }> => {
        const res = await this.request<{ success: boolean; updated_count: number }>(
          '/api/v1/iac/findings-suite/triage/bulk',
          {
            method: 'POST',
            body: JSON.stringify({ action, finding_ids: findingIds, value }),
          }
        );
        return res.data;
      },

      // 3.5 Findings Trends
      getTrends: async (timeRange: string = 'Last 90 days'): Promise<IaCFindingsTrendsResponse> => {
        const q = `?time_range=${encodeURIComponent(timeRange)}`;
        const res = await this.request<IaCFindingsTrendsResponse>(`/api/v1/iac/findings-suite/trends${q}`);
        return res.data;
      },

      // 3.6 Findings by Resource
      getByResource: async (params?: {
        provider?: string;
        environment?: string;
        search?: string;
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByResourceResponse> => {
        const q = new URLSearchParams();
        if (params?.provider && params.provider !== 'All Providers') q.append('provider', params.provider);
        if (params?.environment && params.environment !== 'All Environments') q.append('environment', params.environment);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByResourceResponse>(`/api/v1/iac/findings-suite/by-resource${qs}`);
        return res.data;
      },

      // 3.7 Findings by Framework (Compliance Summary)
      getByFrameworkSummary: async (params?: {
        page?: number;
        page_size?: number;
      }): Promise<IaCFindingsByFrameworkSummaryResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<IaCFindingsByFrameworkSummaryResponse>(
          `/api/v1/iac/findings-suite/by-framework-summary${qs}`
        );
        return res.data;
      },

      // 3.8 Export & Reports
      exportAdvanced: async (data: ExportFindingsAdvancedRequest): Promise<ExportFindingsResponse> => {
        const res = await this.request<ExportFindingsResponse>('/api/v1/iac/findings-suite/export-advanced', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getScheduledReports: async (): Promise<ScheduledReportItem[]> => {
        const res = await this.request<ScheduledReportItem[]>('/api/v1/iac/findings-suite/reports/scheduled');
        return res.data;
      },

      createScheduledReport: async (data: ScheduledReportCreateRequest): Promise<ScheduledReportItem> => {
        const res = await this.request<ScheduledReportItem>('/api/v1/iac/findings-suite/reports/scheduled', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      toggleScheduledReport: async (reportId: string): Promise<ScheduledReportItem> => {
        const res = await this.request<ScheduledReportItem>(
          `/api/v1/iac/findings-suite/reports/scheduled/${encodeURIComponent(reportId)}/toggle`,
          {
            method: 'PATCH',
          }
        );
        return res.data;
      },

      getReportHistory: async (): Promise<ReportHistoryItem[]> => {
        const res = await this.request<ReportHistoryItem[]>('/api/v1/iac/findings-suite/reports/history');
        return res.data;
      },
    },

    remediationSuite: {
      getOverview: async (timeRange: string = 'Last 30 days'): Promise<IaCRemediationOverviewSuiteResponse> => {
        const q = `?time_range=${encodeURIComponent(timeRange)}`;
        const res = await this.request<IaCRemediationOverviewSuiteResponse>(`/api/v1/iac/remediation-suite/overview${q}`);
        return res.data;
      },

      getRecommendations: async (params?: {
        page?: number;
        page_size?: number;
        severity?: string;
        framework?: string;
        provider?: string;
        search?: string;
      }): Promise<FixRecommendationsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        if (params?.severity && params.severity !== 'All Severities') q.append('severity', params.severity);
        if (params?.framework && params.framework !== 'All Frameworks') q.append('framework', params.framework);
        if (params?.provider && params.provider !== 'All Providers') q.append('provider', params.provider);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<FixRecommendationsPageResponse>(`/api/v1/iac/remediation-suite/recommendations${qs}`);
        return res.data;
      },

      getDetail: async (itemId: string): Promise<RemediationDetailResponse> => {
        const res = await this.request<RemediationDetailResponse>(`/api/v1/iac/remediation-suite/detail/${encodeURIComponent(itemId)}`);
        return res.data;
      },

      getAutoFixList: async (params?: {
        page?: number;
        page_size?: number;
        severity?: string;
        provider?: string;
        framework?: string;
      }): Promise<AutoFixListResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        if (params?.severity && params.severity !== 'All Severities') q.append('severity', params.severity);
        if (params?.provider && params.provider !== 'All Providers') q.append('provider', params.provider);
        if (params?.framework && params.framework !== 'All Frameworks') q.append('framework', params.framework);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<AutoFixListResponse>(`/api/v1/iac/remediation-suite/autofix${qs}`);
        return res.data;
      },

      generatePR: async (data: GeneratePRRequest): Promise<GeneratePRResponse> => {
        const res = await this.request<GeneratePRResponse>('/api/v1/iac/remediation-suite/autofix/generate-pr', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getPRs: async (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        repository?: string;
        search?: string;
      }): Promise<RemediationPRsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.repository && params.repository !== 'All Repositories') q.append('repository', params.repository);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<RemediationPRsPageResponse>(`/api/v1/iac/remediation-suite/prs${qs}`);
        return res.data;
      },

      getSuppressions: async (params?: {
        page?: number;
        page_size?: number;
        reason?: string;
        resource?: string;
        search?: string;
        active_only?: boolean;
      }): Promise<SuppressedFindingsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        if (params?.reason && params.reason !== 'All Reasons') q.append('reason', params.reason);
        if (params?.resource && params.resource !== 'All Resources') q.append('resource', params.resource);
        if (params?.search) q.append('search', params.search);
        if (params?.active_only !== undefined) q.append('active_only', String(params.active_only));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<SuppressedFindingsPageResponse>(`/api/v1/iac/remediation-suite/suppressions${qs}`);
        return res.data;
      },

      updateSuppression: async (suppressionId: string, data: UpdateSuppressionRequest): Promise<SuppressedFindingItem> => {
        const res = await this.request<SuppressedFindingItem>(`/api/v1/iac/remediation-suite/suppressions/${encodeURIComponent(suppressionId)}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      getActivity: async (params?: {
        page?: number;
        page_size?: number;
        action?: string;
        user?: string;
        search?: string;
      }): Promise<RemediationActivityPageResponse> => {
        const q = new URLSearchParams();
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        if (params?.action && params.action !== 'All Actions') q.append('action', params.action);
        if (params?.user && params.user !== 'All Users') q.append('user', params.user);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<RemediationActivityPageResponse>(`/api/v1/iac/remediation-suite/activity${qs}`);
        return res.data;
      },

      getSettings: async (): Promise<RemediationSettingsDTO> => {
        const res = await this.request<RemediationSettingsDTO>('/api/v1/iac/remediation-suite/settings');
        return res.data;
      },

      saveSettings: async (data: UpdateRemediationSettingsRequest): Promise<RemediationSettingsDTO> => {
        const res = await this.request<RemediationSettingsDTO>('/api/v1/iac/remediation-suite/settings', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      },

      resetSettings: async (): Promise<RemediationSettingsDTO> => {
        const res = await this.request<RemediationSettingsDTO>('/api/v1/iac/remediation-suite/settings/reset', {
          method: 'POST',
        });
        return res.data;
      },
    },

    ruleDetailSuite: {
      getOverview: async (ruleId: string): Promise<RuleDetailOverviewResponse> => {
        const res = await this.request<RuleDetailOverviewResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/overview`
        );
        return res.data;
      },

      getDefinition: async (ruleId: string): Promise<RuleDefinitionResponse> => {
        const res = await this.request<RuleDefinitionResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/definition`
        );
        return res.data;
      },

      getLogic: async (ruleId: string): Promise<RuleLogicResponse> => {
        const res = await this.request<RuleLogicResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/logic`
        );
        return res.data;
      },

      getRisk: async (ruleId: string): Promise<RuleRiskDetailsResponse> => {
        const res = await this.request<RuleRiskDetailsResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/risk`
        );
        return res.data;
      },

      getMappings: async (ruleId: string): Promise<RuleFrameworkMappingsResponse> => {
        const res = await this.request<RuleFrameworkMappingsResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/mappings`
        );
        return res.data;
      },

      getResources: async (
        ruleId: string,
        params?: {
          status?: string;
          environment?: string;
          region?: string;
          search?: string;
          page?: number;
          page_size?: number;
        }
      ): Promise<AffectedResourcesPageResponse> => {
        const q = new URLSearchParams();
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        if (params?.environment && params.environment !== 'All Environments') q.append('environment', params.environment);
        if (params?.region && params.region !== 'All Regions') q.append('region', params.region);
        if (params?.search) q.append('search', params.search);
        if (params?.page) q.append('page', String(params.page));
        if (params?.page_size) q.append('page_size', String(params.page_size));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<AffectedResourcesPageResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/resources${qs}`
        );
        return res.data;
      },

      getExceptions: async (
        ruleId: string,
        params?: {
          search?: string;
          status?: string;
        }
      ): Promise<RuleExceptionsPageResponse> => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.status && params.status !== 'All Statuses') q.append('status', params.status);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request<RuleExceptionsPageResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/exceptions${qs}`
        );
        return res.data;
      },

      createException: async (
        ruleId: string,
        payload: CreateRuleExceptionRequest
      ): Promise<RuleExceptionItem> => {
        const res = await this.request<RuleExceptionItem>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/exceptions`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      },

      deleteException: async (
        ruleId: string,
        exceptionId: string
      ): Promise<{ success: boolean; message: string }> => {
        const res = await this.request<{ success: boolean; message: string }>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/exceptions/${encodeURIComponent(exceptionId)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },

      getHistory: async (ruleId: string): Promise<RuleHistoryResponse> => {
        const res = await this.request<RuleHistoryResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/history`
        );
        return res.data;
      },

      triggerScan: async (
        ruleId: string,
        environment?: string
      ): Promise<TriggerRuleScanResponse> => {
        const res = await this.request<TriggerRuleScanResponse>(
          `/api/v1/iac/rule-detail-suite/${encodeURIComponent(ruleId)}/run-scan`,
          {
            method: 'POST',
            body: JSON.stringify({ environment: environment || 'production' }),
          }
        );
        return res.data;
      },
    },

    settingsSuite: {
      getAll: async (): Promise<IaCSettingsSuiteMasterDTO> => {
        const res = await this.request<IaCSettingsSuiteMasterDTO>('/api/v1/iac/settings-suite/all');
        return res.data;
      },

      resetAll: async (): Promise<IaCSettingsSuiteMasterDTO> => {
        const res = await this.request<IaCSettingsSuiteMasterDTO>('/api/v1/iac/settings-suite/reset-all', {
          method: 'POST',
        });
        return res.data;
      },

      getGeneral: async (): Promise<GeneralSettingsDTO> => {
        const res = await this.request<GeneralSettingsDTO>('/api/v1/iac/settings-suite/general');
        return res.data;
      },

      updateGeneral: async (payload: UpdateGeneralSettingsRequest): Promise<GeneralSettingsDTO> => {
        const res = await this.request<GeneralSettingsDTO>('/api/v1/iac/settings-suite/general', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      resetGeneral: async (): Promise<GeneralSettingsDTO> => {
        const res = await this.request<GeneralSettingsDTO>('/api/v1/iac/settings-suite/general/reset', {
          method: 'POST',
        });
        return res.data;
      },

      getScan: async (): Promise<ScanSettingsDTO> => {
        const res = await this.request<ScanSettingsDTO>('/api/v1/iac/settings-suite/scan');
        return res.data;
      },

      updateScan: async (payload: UpdateScanSettingsRequest): Promise<ScanSettingsDTO> => {
        const res = await this.request<ScanSettingsDTO>('/api/v1/iac/settings-suite/scan', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      resetScan: async (): Promise<ScanSettingsDTO> => {
        const res = await this.request<ScanSettingsDTO>('/api/v1/iac/settings-suite/scan/reset', {
          method: 'POST',
        });
        return res.data;
      },

      checkScannerUpdates: async (): Promise<any> => {
        const res = await this.request<any>('/api/v1/iac/settings-suite/scan/check-updates', {
          method: 'POST',
        });
        return res.data;
      },

      getRulesPolicies: async (): Promise<RulesPoliciesSettingsDTO> => {
        const res = await this.request<RulesPoliciesSettingsDTO>('/api/v1/iac/settings-suite/rules-policies');
        return res.data;
      },

      updateRulesPolicies: async (payload: UpdateRulesPoliciesRequest): Promise<RulesPoliciesSettingsDTO> => {
        const res = await this.request<RulesPoliciesSettingsDTO>('/api/v1/iac/settings-suite/rules-policies', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      togglePolicyPack: async (packName: string, status: string): Promise<PolicyPackItem> => {
        const res = await this.request<PolicyPackItem>(
          `/api/v1/iac/settings-suite/rules-policies/packs/${encodeURIComponent(packName)}/status?status=${encodeURIComponent(status)}`,
          {
            method: 'PATCH',
          }
        );
        return res.data;
      },

      resetRulesPolicies: async (): Promise<RulesPoliciesSettingsDTO> => {
        const res = await this.request<RulesPoliciesSettingsDTO>('/api/v1/iac/settings-suite/rules-policies/reset', {
          method: 'POST',
        });
        return res.data;
      },

      getExclusions: async (): Promise<ExclusionsSettingsDTO> => {
        const res = await this.request<ExclusionsSettingsDTO>('/api/v1/iac/settings-suite/exclusions');
        return res.data;
      },

      addExclusion: async (payload: AddExclusionRequest): Promise<ExclusionItem> => {
        const res = await this.request<ExclusionItem>('/api/v1/iac/settings-suite/exclusions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      deleteExclusion: async (exclusionId: string): Promise<any> => {
        const res = await this.request<any>(
          `/api/v1/iac/settings-suite/exclusions/${encodeURIComponent(exclusionId)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },

      previewExclusion: async (payload: PreviewExclusionRequest): Promise<PreviewExclusionResponse> => {
        const res = await this.request<PreviewExclusionResponse>('/api/v1/iac/settings-suite/exclusions/preview', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      resetExclusions: async (): Promise<ExclusionsSettingsDTO> => {
        const res = await this.request<ExclusionsSettingsDTO>('/api/v1/iac/settings-suite/exclusions/reset', {
          method: 'POST',
        });
        return res.data;
      },

      getNotifications: async (): Promise<NotificationsSettingsDTO> => {
        const res = await this.request<NotificationsSettingsDTO>('/api/v1/iac/settings-suite/notifications');
        return res.data;
      },

      updateNotifications: async (payload: UpdateNotificationsRequest): Promise<NotificationsSettingsDTO> => {
        const res = await this.request<NotificationsSettingsDTO>('/api/v1/iac/settings-suite/notifications', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      addNotificationChannel: async (payload: AddNotificationChannelRequest): Promise<NotificationChannelItem> => {
        const res = await this.request<NotificationChannelItem>('/api/v1/iac/settings-suite/notifications/channels', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      deleteNotificationChannel: async (channelId: string): Promise<any> => {
        const res = await this.request<any>(
          `/api/v1/iac/settings-suite/notifications/channels/${encodeURIComponent(channelId)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },

      resetNotifications: async (): Promise<NotificationsSettingsDTO> => {
        const res = await this.request<NotificationsSettingsDTO>('/api/v1/iac/settings-suite/notifications/reset', {
          method: 'POST',
        });
        return res.data;
      },

      getAccess: async (): Promise<AccessSettingsDTO> => {
        const res = await this.request<AccessSettingsDTO>('/api/v1/iac/settings-suite/access');
        return res.data;
      },

      addUserAccess: async (payload: AddUserAccessRequest): Promise<UserAccessItem> => {
        const res = await this.request<UserAccessItem>('/api/v1/iac/settings-suite/access/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      deleteUserAccess: async (userId: string): Promise<any> => {
        const res = await this.request<any>(
          `/api/v1/iac/settings-suite/access/users/${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },

      updateUserRole: async (userId: string, newRole: string): Promise<UserAccessItem> => {
        const res = await this.request<UserAccessItem>(
          `/api/v1/iac/settings-suite/access/users/${encodeURIComponent(userId)}/role?new_role=${encodeURIComponent(newRole)}`,
          {
            method: 'PUT',
          }
        );
        return res.data;
      },

      resetAccess: async (): Promise<AccessSettingsDTO> => {
        const res = await this.request<AccessSettingsDTO>('/api/v1/iac/settings-suite/access/reset', {
          method: 'POST',
        });
        return res.data;
      },

      getAdvanced: async (): Promise<AdvancedSettingsDTO> => {
        const res = await this.request<AdvancedSettingsDTO>('/api/v1/iac/settings-suite/advanced');
        return res.data;
      },

      updateAdvanced: async (payload: UpdateAdvancedSettingsRequest): Promise<AdvancedSettingsDTO> => {
        const res = await this.request<AdvancedSettingsDTO>('/api/v1/iac/settings-suite/advanced', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      addEnvVar: async (payload: EnvVariableItem): Promise<EnvVariableItem> => {
        const res = await this.request<EnvVariableItem>('/api/v1/iac/settings-suite/advanced/env-vars', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      deleteEnvVar: async (varName: string): Promise<any> => {
        const res = await this.request<any>(
          `/api/v1/iac/settings-suite/advanced/env-vars/${encodeURIComponent(varName)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },

      resetAdvanced: async (): Promise<AdvancedSettingsDTO> => {
        const res = await this.request<AdvancedSettingsDTO>('/api/v1/iac/settings-suite/advanced/reset', {
          method: 'POST',
        });
        return res.data;
      },
    },

    graphSuite: {
      getOverview: async (params?: { repository?: string; environment?: string; provider?: string }): Promise<GraphOverviewResponse> => {
        const p = new URLSearchParams();
        if (params?.repository) p.set('repository', params.repository);
        if (params?.environment) p.set('environment', params.environment);
        if (params?.provider) p.set('provider', params.provider);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<GraphOverviewResponse>(`/api/v1/iac/graph-suite/overview${qs}`);
        return res.data;
      },

      getResourceGraph: async (params?: {
        repository?: string;
        environment?: string;
        resourceType?: string;
        provider?: string;
      }): Promise<ResourceGraphResponse> => {
        const p = new URLSearchParams();
        if (params?.repository) p.set('repository', params.repository);
        if (params?.environment) p.set('environment', params.environment);
        if (params?.resourceType && params.resourceType !== 'All Resource Types') {
          p.set('resource_type', params.resourceType);
        }
        if (params?.provider) p.set('provider', params.provider);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<ResourceGraphResponse>(`/api/v1/iac/graph-suite/resource-graph${qs}`);
        return res.data;
      },

      getResourceDetail: async (resourceId: string, provider?: string): Promise<ResourceDetailResponse> => {
        const qs = provider ? `?provider=${encodeURIComponent(provider)}` : '';
        const res = await this.request<ResourceDetailResponse>(
          `/api/v1/iac/graph-suite/resource/${encodeURIComponent(resourceId)}${qs}`
        );
        return res.data;
      },

      getRiskView: async (params?: { repository?: string; environment?: string; provider?: string }): Promise<RiskViewResponse> => {
        const p = new URLSearchParams();
        if (params?.repository) p.set('repository', params.repository);
        if (params?.environment) p.set('environment', params.environment);
        if (params?.provider) p.set('provider', params.provider);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<RiskViewResponse>(`/api/v1/iac/graph-suite/risk-view${qs}`);
        return res.data;
      },

      getRelationships: async (params?: {
        search?: string;
        relationshipType?: string;
        page?: number;
        pageSize?: number;
        provider?: string;
      }): Promise<RelationshipsPageResponse> => {
        const p = new URLSearchParams();
        if (params?.search) p.set('search', params.search);
        if (params?.relationshipType && params.relationshipType !== 'All Relationship Types') {
          p.set('relationship_type', params.relationshipType);
        }
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        if (params?.provider) p.set('provider', params.provider);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<RelationshipsPageResponse>(`/api/v1/iac/graph-suite/relationships${qs}`);
        return res.data;
      },

      getBlastRadius: async (resourceId: string, provider?: string): Promise<BlastRadiusResponse> => {
        const qs = provider ? `?provider=${encodeURIComponent(provider)}` : '';
        const res = await this.request<BlastRadiusResponse>(
          `/api/v1/iac/graph-suite/blast-radius/${encodeURIComponent(resourceId)}${qs}`
        );
        return res.data;
      },

      getChangeHistory: async (params?: {
        resource?: string;
        page?: number;
        pageSize?: number;
        provider?: string;
      }): Promise<ChangeHistoryPageResponse> => {
        const p = new URLSearchParams();
        if (params?.resource && params.resource !== 'All Resources') {
          p.set('resource', params.resource);
        }
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        if (params?.provider) p.set('provider', params.provider);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<ChangeHistoryPageResponse>(`/api/v1/iac/graph-suite/change-history${qs}`);
        return res.data;
      },

      getSettings: async (): Promise<GraphSettingsDTO> => {
        const res = await this.request<GraphSettingsDTO>('/api/v1/iac/graph-suite/settings');
        return res.data;
      },

      updateSettings: async (payload: any): Promise<GraphSettingsDTO> => {
        const res = await this.request<GraphSettingsDTO>('/api/v1/iac/graph-suite/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      resetSettings: async (): Promise<GraphSettingsDTO> => {
        const res = await this.request<GraphSettingsDTO>('/api/v1/iac/graph-suite/settings/reset', {
          method: 'POST',
        });
        return res.data;
      },

      exportGraph: async (payload: ExportGraphRequest): Promise<ExportGraphResponse> => {
        const res = await this.request<ExportGraphResponse>('/api/v1/iac/graph-suite/export', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
    },

    integrationsSuite: {
      getOverview: async (params?: { repository?: string }): Promise<IntegrationsOverviewResponse> => {
        const p = new URLSearchParams();
        if (params?.repository) p.set('repository', params.repository);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<IntegrationsOverviewResponse>(`/api/v1/iac/integrations-suite/overview${qs}`);
        return res.data;
      },

      getConnected: async (params?: { search?: string; typeFilter?: string }): Promise<ConnectedIntegrationsResponse> => {
        const p = new URLSearchParams();
        if (params?.search) p.set('search', params.search);
        if (params?.typeFilter && params.typeFilter !== 'All Types') p.set('type_filter', params.typeFilter);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<ConnectedIntegrationsResponse>(`/api/v1/iac/integrations-suite/connected${qs}`);
        return res.data;
      },

      getCatalog: async (params?: { category?: string; search?: string }): Promise<AvailableIntegrationsResponse> => {
        const p = new URLSearchParams();
        if (params?.category && params.category !== 'All') p.set('category', params.category);
        if (params?.search) p.set('search', params.search);
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<AvailableIntegrationsResponse>(`/api/v1/iac/integrations-suite/catalog${qs}`);
        return res.data;
      },

      connect: async (payload: ConnectIacIntegrationRequest): Promise<ConnectIntegrationResponse> => {
        const res = await this.request<ConnectIntegrationResponse>('/api/v1/iac/integrations-suite/connect', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      getDetail: async (integrationId: string = 'github'): Promise<IntegrationDetailResponse> => {
        const res = await this.request<IntegrationDetailResponse>(
          `/api/v1/iac/integrations-suite/detail/${encodeURIComponent(integrationId)}`
        );
        return res.data;
      },

      updateDetail: async (
        integrationId: string,
        payload: UpdateIntegrationDetailRequest
      ): Promise<IntegrationDetailResponse> => {
        const res = await this.request<IntegrationDetailResponse>(
          `/api/v1/iac/integrations-suite/detail/${encodeURIComponent(integrationId)}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      },

      reconnect: async (integrationId: string = 'github'): Promise<IntegrationDetailResponse> => {
        const res = await this.request<IntegrationDetailResponse>(
          `/api/v1/iac/integrations-suite/detail/${encodeURIComponent(integrationId)}/reconnect`,
          {
            method: 'POST',
          }
        );
        return res.data;
      },

      disconnect: async (integrationId: string = 'github'): Promise<any> => {
        const res = await this.request<any>(
          `/api/v1/iac/integrations-suite/detail/${encodeURIComponent(integrationId)}/disconnect`,
          {
            method: 'POST',
          }
        );
        return res.data;
      },

      getRepositories: async (params?: {
        search?: string;
        status?: string;
        visibility?: string;
        page?: number;
        pageSize?: number;
      }): Promise<IntegrationRepositoriesResponse> => {
        const p = new URLSearchParams();
        if (params?.search) p.set('search', params.search);
        if (params?.status && params.status !== 'All Status') p.set('status', params.status);
        if (params?.visibility && params.visibility !== 'All Visibility') p.set('visibility', params.visibility);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<IntegrationRepositoriesResponse>(`/api/v1/iac/integrations-suite/repositories${qs}`);
        return res.data;
      },

      toggleRepoScanStatus: async (
        repoId: string,
        scanStatus: string
      ): Promise<IntegrationRepositoryItem> => {
        const res = await this.request<IntegrationRepositoryItem>(
          `/api/v1/iac/integrations-suite/repositories/${encodeURIComponent(repoId)}/status`,
          {
            method: 'PUT',
            body: JSON.stringify({ scan_status: scanStatus }),
          }
        );
        return res.data;
      },

      getWebhooks: async (integrationId: string = 'github'): Promise<IntegrationWebhooksResponse> => {
        const res = await this.request<IntegrationWebhooksResponse>(
          `/api/v1/iac/integrations-suite/webhooks/${encodeURIComponent(integrationId)}`
        );
        return res.data;
      },

      updateWebhookConfig: async (
        integrationId: string,
        payload: UpdateWebhookConfigRequest
      ): Promise<WebhookEventsConfig> => {
        const res = await this.request<WebhookEventsConfig>(
          `/api/v1/iac/integrations-suite/webhooks/${encodeURIComponent(integrationId)}/config`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      },

      createWebhook: async (
        integrationId: string,
        payload: CreateWebhookRequest
      ): Promise<IntegrationWebhookItem> => {
        const res = await this.request<IntegrationWebhookItem>(
          `/api/v1/iac/integrations-suite/webhooks/${encodeURIComponent(integrationId)}`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      },

      testWebhook: async (integrationId: string = 'github'): Promise<TestWebhookResponse> => {
        const res = await this.request<TestWebhookResponse>(
          `/api/v1/iac/integrations-suite/webhooks/${encodeURIComponent(integrationId)}/test`,
          {
            method: 'POST',
          }
        );
        return res.data;
      },

      getScanSettings: async (integrationId: string = 'github'): Promise<IntegrationScanSettingsDTO> => {
        const res = await this.request<IntegrationScanSettingsDTO>(
          `/api/v1/iac/integrations-suite/scan-settings/${encodeURIComponent(integrationId)}`
        );
        return res.data;
      },

      updateScanSettings: async (
        integrationId: string,
        payload: any
      ): Promise<IntegrationScanSettingsDTO> => {
        const res = await this.request<IntegrationScanSettingsDTO>(
          `/api/v1/iac/integrations-suite/scan-settings/${encodeURIComponent(integrationId)}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      },

      resetScanSettings: async (integrationId: string = 'github'): Promise<IntegrationScanSettingsDTO> => {
        const res = await this.request<IntegrationScanSettingsDTO>(
          `/api/v1/iac/integrations-suite/scan-settings/${encodeURIComponent(integrationId)}/reset`,
          {
            method: 'POST',
          }
        );
        return res.data;
      },

      getSyncLogs: async (
        integrationId: string = 'github',
        params?: { event?: string; page?: number; pageSize?: number }
      ): Promise<IntegrationSyncLogsResponse> => {
        const p = new URLSearchParams();
        if (params?.event && params.event !== 'All Events') p.set('event', params.event);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<IntegrationSyncLogsResponse>(
          `/api/v1/iac/integrations-suite/sync-logs/${encodeURIComponent(integrationId)}${qs}`
        );
        return res.data;
      },

      triggerSync: async (integrationId: string = 'github'): Promise<TriggerSyncResponse> => {
        const res = await this.request<TriggerSyncResponse>(
          `/api/v1/iac/integrations-suite/sync/${encodeURIComponent(integrationId)}`,
          {
            method: 'POST',
          }
        );
        return res.data;
      },
    },

    runSuite: {
      getOverview: async (timeRange: string = 'Last 24 hours'): Promise<RunOverviewResponse> => {
        const res = await this.request<RunOverviewResponse>(
          `/api/v1/iac/run-suite/overview?time_range=${encodeURIComponent(timeRange)}`
        );
        return res.data;
      },

      getWorkloads: async (params?: {
        cluster?: string;
        namespace?: string;
        search?: string;
        page?: number;
        pageSize?: number;
      }): Promise<WorkloadsResponse> => {
        const p = new URLSearchParams();
        if (params?.cluster && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
        if (params?.namespace && params.namespace !== 'All Namespaces') p.set('namespace', params.namespace);
        if (params?.search) p.set('search', params.search);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<WorkloadsResponse>(`/api/v1/iac/run-suite/workloads${qs}`);
        return res.data;
      },

      getContainers: async (params?: {
        cluster?: string;
        namespace?: string;
        status?: string;
        search?: string;
        page?: number;
        pageSize?: number;
      }): Promise<ContainersResponse> => {
        const p = new URLSearchParams();
        if (params?.cluster && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
        if (params?.namespace && params.namespace !== 'All Namespaces') p.set('namespace', params.namespace);
        if (params?.status && params.status !== 'All Statuses') p.set('status', params.status);
        if (params?.search) p.set('search', params.search);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<ContainersResponse>(`/api/v1/iac/run-suite/containers${qs}`);
        return res.data;
      },

      getKubernetesCluster: async (clusterId: string = 'eks-prod-cluster'): Promise<KubernetesClusterResponse> => {
        const res = await this.request<KubernetesClusterResponse>(
          `/api/v1/iac/run-suite/kubernetes?cluster_id=${encodeURIComponent(clusterId)}`
        );
        return res.data;
      },

      getThreats: async (params?: {
        cluster?: string;
        severity?: string;
        search?: string;
        page?: number;
        pageSize?: number;
      }): Promise<RuntimeThreatsResponse> => {
        const p = new URLSearchParams();
        if (params?.cluster && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
        if (params?.severity && params.severity !== 'All Severities') p.set('severity', params.severity);
        if (params?.search) p.set('search', params.search);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<RuntimeThreatsResponse>(`/api/v1/iac/run-suite/threats${qs}`);
        return res.data;
      },

      updateThreatStatus: async (threatId: string, status: string): Promise<RuntimeThreatItem> => {
        const res = await this.request<RuntimeThreatItem>(
          `/api/v1/iac/run-suite/threats/${encodeURIComponent(threatId)}/status`,
          {
            method: 'PUT',
            body: JSON.stringify({ status }),
          }
        );
        return res.data;
      },

      getVulnerabilities: async (params?: {
        cluster?: string;
        severity?: string;
        status?: string;
        search?: string;
        page?: number;
        pageSize?: number;
      }): Promise<RuntimeVulnerabilitiesResponse> => {
        const p = new URLSearchParams();
        if (params?.cluster && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
        if (params?.severity && params.severity !== 'All Severities') p.set('severity', params.severity);
        if (params?.status && params.status !== 'All Statuses') p.set('status', params.status);
        if (params?.search) p.set('search', params.search);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<RuntimeVulnerabilitiesResponse>(`/api/v1/iac/run-suite/vulnerabilities${qs}`);
        return res.data;
      },

      updateVulnerabilityStatus: async (vulnId: string, status: string): Promise<RuntimeVulnerabilityItem> => {
        const res = await this.request<RuntimeVulnerabilityItem>(
          `/api/v1/iac/run-suite/vulnerabilities/${encodeURIComponent(vulnId)}/status`,
          {
            method: 'PUT',
            body: JSON.stringify({ status }),
          }
        );
        return res.data;
      },

      getNetworkActivity: async (params?: {
        cluster?: string;
        namespace?: string;
        search?: string;
        page?: number;
        pageSize?: number;
      }): Promise<NetworkActivityResponse> => {
        const p = new URLSearchParams();
        if (params?.cluster && params.cluster !== 'All Clusters') p.set('cluster', params.cluster);
        if (params?.namespace && params.namespace !== 'All Namespaces') p.set('namespace', params.namespace);
        if (params?.search) p.set('search', params.search);
        if (params?.page) p.set('page', params.page.toString());
        if (params?.pageSize) p.set('page_size', params.pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<NetworkActivityResponse>(`/api/v1/iac/run-suite/network-activity${qs}`);
        return res.data;
      },

      getPolicies: async (page?: number, pageSize?: number): Promise<RuntimePoliciesResponse> => {
        const p = new URLSearchParams();
        if (page) p.set('page', page.toString());
        if (pageSize) p.set('page_size', pageSize.toString());
        const qs = p.toString() ? `?${p.toString()}` : '';
        const res = await this.request<RuntimePoliciesResponse>(`/api/v1/iac/run-suite/policies${qs}`);
        return res.data;
      },

      createPolicy: async (payload: CreateRuntimePolicyRequest): Promise<RuntimePolicyItem> => {
        const res = await this.request<RuntimePolicyItem>('/api/v1/iac/run-suite/policies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },

      togglePolicyStatus: async (policyId: string, status: string): Promise<RuntimePolicyItem> => {
        const res = await this.request<RuntimePolicyItem>(
          `/api/v1/iac/run-suite/policies/${encodeURIComponent(policyId)}/status`,
          {
            method: 'PUT',
            body: JSON.stringify({ status }),
          }
        );
        return res.data;
      },

      deletePolicy: async (policyId: string): Promise<{ success: boolean; deleted_id: string }> => {
        const res = await this.request<{ success: boolean; deleted_id: string }>(
          `/api/v1/iac/run-suite/policies/${encodeURIComponent(policyId)}`,
          {
            method: 'DELETE',
          }
        );
        return res.data;
      },
    },
  };

  /**
   * SBOM Security Gateway
   */
  readonly sbom = {
    summary: async (params?: {
      repositoryId?: string | null;
      projectId?: string | null;
      documentId?: string | null;
    }): Promise<import('@/types/api/sbom').SBOMSummaryResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.documentId) q.set('document_id', params.documentId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/sbom').SBOMSummaryResponse>(
        `/api/v1/sbom/summary${qs}`
      );
      return res.data;
    },

    components: async (params?: {
      repositoryId?: string | null;
      projectId?: string | null;
      documentId?: string | null;
      search?: string;
      component_type?: string;
      license_name?: string;
      risk_level?: string;
      component_status?: string;
      page?: number;
      pageSize?: number;
      sort_by?: string;
      sort_dir?: string;
    }): Promise<import('@/types/api/sbom').SBOMComponentPageResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.documentId) q.set('document_id', params.documentId);
      if (params?.search) q.set('search', params.search);
      if (params?.component_type && params.component_type !== 'All Types' && params.component_type !== 'All') {
        q.set('component_type', params.component_type);
      }
      if (params?.license_name && params.license_name !== 'All Licenses' && params.license_name !== 'All') {
        q.set('license_name', params.license_name);
      }
      if (params?.risk_level && params.risk_level !== 'All Risk Levels' && params.risk_level !== 'All') {
        q.set('risk_level', params.risk_level);
      }
      if (params?.component_status && params.component_status !== 'All Status' && params.component_status !== 'All') {
        q.set('component_status', params.component_status);
      }
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));
      if (params?.sort_by) q.set('sort_by', params.sort_by);
      if (params?.sort_dir) q.set('sort_dir', params.sort_dir);

      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/sbom').SBOMComponentPageResponse>(
        `/api/v1/sbom/components${qs}`
      );
      return res.data;
    },

    generate: async (payload: import('@/types/api/sbom').SBOMGenerateRequest): Promise<import('@/types/api/sbom').SBOMJobResponse> => {
      const res = await this.request<import('@/types/api/sbom').SBOMJobResponse>(
        '/api/v1/sbom/generate',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    job: async (jobId: string): Promise<import('@/types/api/sbom').SBOMJobResponse> => {
      const res = await this.request<import('@/types/api/sbom').SBOMJobResponse>(
        `/api/v1/sbom/jobs/${encodeURIComponent(jobId)}`
      );
      return res.data;
    },

    jobs: async (params?: { projectId?: string; repositoryId?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.repositoryId) q.append('repository_id', params.repositoryId);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/sbom/jobs${qs}`);
      return res.data;
    },

    exportUrl: (params?: { repositoryId?: string; projectId?: string; documentId?: string; format?: string }): string => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.documentId) q.set('document_id', params.documentId);
      if (params?.format) q.set('format', params.format);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return `/api/v1/sbom/export${qs}`;
    },
  };

  public cicd = {
    summary: async (params?: { repositoryId?: string; projectId?: string }): Promise<import('@/types/api/cicd').CICDSummaryResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDSummaryResponse>(
        `/api/v1/cicd/summary${qs}`
      );
      return res.data;
    },

    pipelines: async (params?: {
      repositoryId?: string;
      projectId?: string;
      search?: string;
      branch?: string;
      status?: string;
      timeRange?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/cicd').CICDPipelineListResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.branch && params.branch !== 'All Branches') q.set('branch', params.branch);
      if (params?.status && params.status !== 'All Status') q.set('status', params.status);
      if (params?.timeRange && params.timeRange !== 'All time') q.set('time_range', params.timeRange);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));

      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDPipelineListResponse>(
        `/api/v1/cicd/pipelines${qs}`
      );
      return res.data;
    },

    runDetail: async (runId: string): Promise<import('@/types/api/cicd').CICDPipelineRunItem> => {
      const res = await this.request<import('@/types/api/cicd').CICDPipelineRunItem>(
        `/api/v1/cicd/runs/${encodeURIComponent(runId)}`
      );
      return res.data;
    },

    triggerRun: async (payload: import('@/types/api/cicd').TriggerPipelineRunRequest): Promise<import('@/types/api/cicd').TriggerPipelineRunResponse> => {
      const res = await this.request<import('@/types/api/cicd').TriggerPipelineRunResponse>(
        '/api/v1/cicd/run',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    workflow: async (params?: { repositoryId?: string }): Promise<import('@/types/api/cicd').WorkflowYAMLResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').WorkflowYAMLResponse>(
        `/api/v1/cicd/workflow${qs}`
      );
      return res.data;
    },

    // Pipelines Tab Extended
    createPipeline: async (payload: import('@/types/api/cicd').CICDPipelineCreateRequest): Promise<any> => {
      const res = await this.request<any>('/api/v1/cicd/pipelines', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    runDetailFull: async (runId: string): Promise<import('@/types/api/cicd').CICDPipelineRunDetailResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDPipelineRunDetailResponse>(
        `/api/v1/cicd/runs/${encodeURIComponent(runId)}/detail`
      );
      return res.data;
    },

    // Environments Tab
    environments: async (params?: { repositoryId?: string; projectId?: string }): Promise<import('@/types/api/cicd').CICDEnvironmentsOverviewResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDEnvironmentsOverviewResponse>(
        `/api/v1/cicd/environments${qs}`
      );
      return res.data;
    },

    createEnvironment: async (payload: import('@/types/api/cicd').CICDEnvironmentCreateRequest): Promise<import('@/types/api/cicd').CICDEnvironmentDetail> => {
      const res = await this.request<import('@/types/api/cicd').CICDEnvironmentDetail>('/api/v1/cicd/environments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deployEnvironment: async (environmentId: string, payload?: import('@/types/api/cicd').CICDEnvironmentDeployRequest): Promise<any> => {
      const res = await this.request<any>(`/api/v1/cicd/environments/${encodeURIComponent(environmentId)}/deploy`, {
        method: 'POST',
        body: JSON.stringify(payload || { environment_id: environmentId }),
      });
      return res.data;
    },

    // Integrations Tab
    integrations: async (params?: { repositoryId?: string; projectId?: string; category?: string }): Promise<import('@/types/api/cicd').CICDIntegrationsOverviewResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.category) q.set('category', params.category);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDIntegrationsOverviewResponse>(
        `/api/v1/cicd/integrations${qs}`
      );
      return res.data;
    },

    createIntegration: async (payload: import('@/types/api/cicd').CICDIntegrationCreateRequest): Promise<import('@/types/api/cicd').CICDIntegrationDetail> => {
      const res = await this.request<import('@/types/api/cicd').CICDIntegrationDetail>('/api/v1/cicd/integrations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    testIntegration: async (integrationId: string): Promise<import('@/types/api/cicd').CICDIntegrationTestResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDIntegrationTestResponse>(
        `/api/v1/cicd/integrations/${encodeURIComponent(integrationId)}/test`,
        { method: 'POST' }
      );
      return res.data;
    },

    syncIntegration: async (integrationId: string): Promise<import('@/types/api/cicd').CICDIntegrationSyncResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDIntegrationSyncResponse>(
        `/api/v1/cicd/integrations/${encodeURIComponent(integrationId)}/sync`,
        { method: 'POST' }
      );
      return res.data;
    },

    // Templates Tab
    templates: async (params?: {
      category?: string;
      templateType?: string;
      framework?: string;
      page?: number;
      pageSize?: number;
    }): Promise<import('@/types/api/cicd').CICDTemplatesOverviewResponse> => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.templateType) q.set('template_type', params.templateType);
      if (params?.framework) q.set('framework', params.framework);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDTemplatesOverviewResponse>(
        `/api/v1/cicd/templates${qs}`
      );
      return res.data;
    },

    useTemplate: async (payload: import('@/types/api/cicd').CICDUseTemplateRequest): Promise<import('@/types/api/cicd').CICDUseTemplateResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDUseTemplateResponse>(
        '/api/v1/cicd/templates/use',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    // Jobs Tab
    jobs: async (params?: {
      repositoryId?: string;
      projectId?: string;
      search?: string;
      pipeline?: string;
      status?: string;
      timeRange?: string;
      page?: number;
      pageSize?: number;
      selectedJobId?: string;
    }): Promise<import('@/types/api/cicd').CICDJobsOverviewResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.pipeline) q.set('pipeline', params.pipeline);
      if (params?.status) q.set('status', params.status);
      if (params?.timeRange) q.set('time_range', params.timeRange);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));
      if (params?.selectedJobId) q.set('selected_job_id', params.selectedJobId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDJobsOverviewResponse>(
        `/api/v1/cicd/jobs${qs}`
      );
      return res.data;
    },

    jobDetail: async (jobId: string): Promise<import('@/types/api/cicd').CICDJobDetailResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDJobDetailResponse>(
        `/api/v1/cicd/jobs/${encodeURIComponent(jobId)}`
      );
      return res.data;
    },

    rerunJob: async (jobId: string): Promise<import('@/types/api/cicd').CICDJobRerunResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDJobRerunResponse>(
        `/api/v1/cicd/jobs/${encodeURIComponent(jobId)}/rerun`,
        { method: 'POST' }
      );
      return res.data;
    },

    // Pipeline Runs Tab
    runsOverview: async (params?: {
      repositoryId?: string;
      projectId?: string;
      search?: string;
      status?: string;
      page?: number;
      pageSize?: number;
      activeRunId?: string;
    }): Promise<import('@/types/api/cicd').CICDPipelineRunsOverviewResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.pageSize) q.set('page_size', String(params.pageSize));
      if (params?.activeRunId) q.set('active_run_id', params.activeRunId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDPipelineRunsOverviewResponse>(
        `/api/v1/cicd/runs/overview${qs}`
      );
      return res.data;
    },

    rerunPipelineRun: async (runId: string): Promise<import('@/types/api/cicd').TriggerPipelineRunResponse> => {
      const res = await this.request<import('@/types/api/cicd').TriggerPipelineRunResponse>(
        `/api/v1/cicd/runs/${encodeURIComponent(runId)}/rerun`,
        { method: 'POST' }
      );
      return res.data;
    },

    // Workflow Editor Tab
    workflowConfig: async (params?: { repositoryId?: string }): Promise<import('@/types/api/cicd').CICDWorkflowConfigResponse> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.set('repository_id', params.repositoryId);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/cicd').CICDWorkflowConfigResponse>(
        `/api/v1/cicd/workflow/config${qs}`
      );
      return res.data;
    },

    saveWorkflowConfig: async (payload: import('@/types/api/cicd').CICDWorkflowSaveRequest): Promise<import('@/types/api/cicd').CICDWorkflowSaveResponse> => {
      const res = await this.request<import('@/types/api/cicd').CICDWorkflowSaveResponse>(
        '/api/v1/cicd/workflow/save',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },
  };

  // =========================================================================
  // QA & QUALITY ENGINEERING SUITE APIS
  // =========================================================================
  public qa = {
    overview: async (): Promise<import('@/types/api/qa').QAOverviewMetricsResponse> => {
      const res = await this.request<import('@/types/api/qa').QAOverviewMetricsResponse>('/api/v1/qa/overview');
      return res.data;
    },

    listTestCases: async (params?: {
      search?: string;
      suite?: string;
      priority?: string;
      status?: string;
      automation?: string;
      limit?: number;
      offset?: number;
    }): Promise<import('@/types/api/qa').TestCaseItem[]> => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.suite) q.append('suite', params.suite);
      if (params?.priority) q.append('priority', params.priority);
      if (params?.status) q.append('status', params.status);
      if (params?.automation) q.append('automation', params.automation);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/qa').TestCaseItem[]>(`/api/v1/qa/test-cases${qs}`);
      return res.data;
    },

    getTestCase: async (id: string): Promise<import('@/types/api/qa').TestCaseItem> => {
      const res = await this.request<import('@/types/api/qa').TestCaseItem>(`/api/v1/qa/test-cases/${encodeURIComponent(id)}`);
      return res.data;
    },

    createTestCase: async (payload: import('@/types/api/qa').TestCaseCreatePayload): Promise<import('@/types/api/qa').TestCaseItem> => {
      const res = await this.request<import('@/types/api/qa').TestCaseItem>('/api/v1/qa/test-cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    updateTestCase: async (id: string, payload: Partial<import('@/types/api/qa').TestCaseItem>): Promise<import('@/types/api/qa').TestCaseItem> => {
      const res = await this.request<import('@/types/api/qa').TestCaseItem>(`/api/v1/qa/test-cases/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    updateStep: async (
      testCaseId: string,
      stepNumber: number,
      actual: string,
      status: string
    ): Promise<import('@/types/api/qa').TestCaseItem> => {
      const res = await this.request<import('@/types/api/qa').TestCaseItem>(
        `/api/v1/qa/test-cases/${encodeURIComponent(testCaseId)}/steps/${stepNumber}`,
        {
          method: 'PUT',
          body: JSON.stringify({ step_number: stepNumber, actual, status }),
        }
      );
      return res.data;
    },

    runTestCase: async (id: string): Promise<import('@/types/api/qa').TestCaseItem> => {
      const res = await this.request<import('@/types/api/qa').TestCaseItem>(
        `/api/v1/qa/test-cases/${encodeURIComponent(id)}/run`,
        { method: 'POST' }
      );
      return res.data;
    },

    listTestRuns: async (limit = 50): Promise<import('@/types/api/qa').TestRunItem[]> => {
      const res = await this.request<import('@/types/api/qa').TestRunItem[]>(`/api/v1/qa/test-runs?limit=${limit}`);
      return res.data;
    },

    triggerTestRun: async (payload: { suite: string; environment?: string; branch?: string }): Promise<import('@/types/api/qa').TestRunItem> => {
      const res = await this.request<import('@/types/api/qa').TestRunItem>('/api/v1/qa/test-runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getAutomation: async (): Promise<import('@/types/api/qa').AutomationMetricResponse> => {
      const res = await this.request<import('@/types/api/qa').AutomationMetricResponse>('/api/v1/qa/automation');
      return res.data;
    },

    listApiTests: async (): Promise<import('@/types/api/qa').APITestItem[]> => {
      const res = await this.request<import('@/types/api/qa').APITestItem[]>('/api/v1/qa/api-testing');
      return res.data;
    },

    createApiTest: async (payload: { collection: string; name: string; method?: string; path: string; headers?: Record<string, string>; body?: string }): Promise<import('@/types/api/qa').APITestItem> => {
      const res = await this.request<import('@/types/api/qa').APITestItem>('/api/v1/qa/api-testing', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    executeApiTest: async (testId: string): Promise<import('@/types/api/qa').APITestItem> => {
      const res = await this.request<import('@/types/api/qa').APITestItem>(`/api/v1/qa/api-testing/${encodeURIComponent(testId)}/execute`, {
        method: 'POST',
      });
      return res.data;
    },

    listPerformance: async (): Promise<import('@/types/api/qa').PerformanceTestItem[]> => {
      const res = await this.request<import('@/types/api/qa').PerformanceTestItem[]>('/api/v1/qa/performance');
      return res.data;
    },
    listPerformanceTests: async (): Promise<import('@/types/api/qa').PerformanceTestItem[]> => {
      return this.qa.listPerformance();
    },

    runPerformance: async (payload: { name: string; type?: string; virtual_users?: number; duration?: string }): Promise<import('@/types/api/qa').PerformanceTestItem> => {
      const res = await this.request<import('@/types/api/qa').PerformanceTestItem>('/api/v1/qa/performance/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    runPerformanceTest: async (payload: { name: string; type?: string; virtual_users?: number; duration?: string }): Promise<import('@/types/api/qa').PerformanceTestItem> => {
      return this.qa.runPerformance(payload);
    },

    getBrowsers: async (): Promise<import('@/types/api/qa').BrowserMatrixItem[]> => {
      const res = await this.request<import('@/types/api/qa').BrowserMatrixItem[]>('/api/v1/qa/browsers');
      return res.data;
    },
    getBrowserMatrix: async (): Promise<import('@/types/api/qa').BrowserMatrixItem[]> => {
      return this.qa.getBrowsers();
    },

    launchBrowser: async (payload: { os: string; browser: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/qa/browsers/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listVisualDiffs: async (): Promise<import('@/types/api/qa').VisualDiffItem[]> => {
      const res = await this.request<import('@/types/api/qa').VisualDiffItem[]>('/api/v1/qa/visual-regression');
      return res.data;
    },

    reviewVisualDiff: async (diffId: string, action: 'approve' | 'reject', notes?: string): Promise<import('@/types/api/qa').VisualDiffItem> => {
      const res = await this.request<import('@/types/api/qa').VisualDiffItem>(`/api/v1/qa/visual-regression/${encodeURIComponent(diffId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      });
      return res.data;
    },

    approveAllVisualDiffs: async (): Promise<{ status: string; approved_count: number }> => {
      const res = await this.request<{ status: string; approved_count: number }>('/api/v1/qa/visual-regression/approve-all', {
        method: 'POST',
      });
      return res.data;
    },

    listAccessibility: async (): Promise<import('@/types/api/qa').AccessibilityScanItem[]> => {
      const res = await this.request<import('@/types/api/qa').AccessibilityScanItem[]>('/api/v1/qa/accessibility');
      return res.data;
    },
    listAccessibilityScans: async (): Promise<import('@/types/api/qa').AccessibilityScanItem[]> => {
      return this.qa.listAccessibility();
    },

    runAccessibilityScan: async (pageName?: string, targetUrl?: string): Promise<import('@/types/api/qa').AccessibilityScanItem> => {
      const q = new URLSearchParams();
      if (pageName) q.append('page_name', pageName);
      if (targetUrl) q.append('target_url', targetUrl);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<import('@/types/api/qa').AccessibilityScanItem>(`/api/v1/qa/accessibility/scan${qs}`, {
        method: 'POST',
      });
      return res.data;
    },

    listDefects: async (): Promise<import('@/types/api/qa').DefectItem[]> => {
      const res = await this.request<import('@/types/api/qa').DefectItem[]>('/api/v1/qa/defects');
      return res.data;
    },

    createDefect: async (payload: { title: string; description?: string; severity?: string; test_case_id?: string; steps_to_reproduce?: string[] }): Promise<import('@/types/api/qa').DefectItem> => {
      const res = await this.request<import('@/types/api/qa').DefectItem>('/api/v1/qa/defects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listQualityGates: async (): Promise<import('@/types/api/qa').QualityGateItem[]> => {
      const res = await this.request<import('@/types/api/qa').QualityGateItem[]>('/api/v1/qa/quality-gates');
      return res.data;
    },

    listTestSuites: async (): Promise<import('@/types/api/qa').TestSuiteItem[]> => {
      const res = await this.request<import('@/types/api/qa').TestSuiteItem[]>('/api/v1/qa/test-suites');
      return res.data;
    },

    createTestSuite: async (payload: import('@/types/api/qa').TestSuiteCreatePayload): Promise<import('@/types/api/qa').TestSuiteItem> => {
      const res = await this.request<import('@/types/api/qa').TestSuiteItem>('/api/v1/qa/test-suites', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listTestPlans: async (): Promise<import('@/types/api/qa').TestPlanItem[]> => {
      const res = await this.request<import('@/types/api/qa').TestPlanItem[]>('/api/v1/qa/test-plans');
      return res.data;
    },

    createTestPlan: async (payload: import('@/types/api/qa').TestPlanCreatePayload): Promise<import('@/types/api/qa').TestPlanItem> => {
      const res = await this.request<import('@/types/api/qa').TestPlanItem>('/api/v1/qa/test-plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    // Gemini AI Integrations
    generateTestCases: async (payload: { prompt: string; suite?: string; priority?: string; count?: number }): Promise<import('@/types/api/qa').AITestCaseGenerateResponse> => {
      const res = await this.request<import('@/types/api/qa').AITestCaseGenerateResponse>('/api/v1/qa/ai/generate-test-cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    automateTest: async (payload: { test_case_id: string; target_framework?: string }): Promise<import('@/types/api/qa').AIAutomateResponse> => {
      const res = await this.request<import('@/types/api/qa').AIAutomateResponse>('/api/v1/qa/ai/automate-test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    analyzeFailure: async (payload: { test_case_id?: string; error_message: string; stack_trace?: string; expected_result?: string; actual_result?: string }): Promise<import('@/types/api/qa').AIFailureAnalysisResponse> => {
      const res = await this.request<import('@/types/api/qa').AIFailureAnalysisResponse>('/api/v1/qa/ai/analyze-failure', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    explainVisualDiff: async (payload: { page_name: string; differences_count: number; bounding_boxes?: any[] }): Promise<import('@/types/api/qa').AIVisualDiffExplainResponse> => {
      const res = await this.request<import('@/types/api/qa').AIVisualDiffExplainResponse>('/api/v1/qa/ai/explain-visual-diff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    remediateA11y: async (payload: { violation_rule: string; element_snippet: string; impact: string }): Promise<import('@/types/api/qa').AIA11yRemediateResponse> => {
      const res = await this.request<import('@/types/api/qa').AIA11yRemediateResponse>('/api/v1/qa/ai/remediate-a11y', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    generateApiTests: async (payload: { endpoint_path: string; method?: string; sample_payload?: string }): Promise<import('@/types/api/qa').AIAPITestGenerateResponse> => {
      const res = await this.request<import('@/types/api/qa').AIAPITestGenerateResponse>('/api/v1/qa/ai/generate-api-tests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  // =========================================================================
  // THING SOC — Security Operations Center APIs
  // =========================================================================
  public soc = {
    overview: async (projectId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/overview`);
      return res.data;
    },

    listAlerts: async (projectId: string, params?: { status?: string; severity?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/alerts${qs}`);
      return res.data;
    },

    getAlert: async (alertId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/alerts/${encodeURIComponent(alertId)}`);
      return res.data;
    },

    acknowledgeAlert: async (alertId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: 'POST', body: JSON.stringify({}) });
      return res.data;
    },

    closeAlert: async (alertId: string, status: string, triageNotes?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/alerts/${encodeURIComponent(alertId)}/close`, {
        method: 'POST',
        body: JSON.stringify({ status, triage_notes: triageNotes }),
      });
      return res.data;
    },

    escalateAlert: async (alertId: string, payload?: { title?: string; description?: string; priority?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/alerts/${encodeURIComponent(alertId)}/escalate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    listCases: async (projectId: string, params?: { status?: string; priority?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.priority) q.append('priority', params.priority);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/cases${qs}`);
      return res.data;
    },

    createCase: async (projectId: string, payload: { title: string; description: string; priority?: string; alert_ids?: string[]; event_ids?: string[] }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/cases`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getCase: async (caseId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/cases/${encodeURIComponent(caseId)}`);
      return res.data;
    },

    listEvents: async (projectId: string, params?: { event_type?: string; severity?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.event_type) q.append('event_type', params.event_type);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/events${qs}`);
      return res.data;
    },

    ingestEvent: async (projectId: string, payload: { source_type: string; raw_payload: Record<string, any>; environment?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/events/ingest`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listDetectionRules: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/soc/detections/rules');
      return res.data;
    },

    assignAlert: async (alertId: string, assigneeId: string, assigneeType = 'ANALYST'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/alerts/${encodeURIComponent(alertId)}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id: assigneeId, assignee_type: assigneeType }),
      });
      return res.data;
    },

    addCaseNote: async (caseId: string, payload: { content: string; evidence_references?: string[] }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/cases/${encodeURIComponent(caseId)}/notes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    attachCaseEvidence: async (caseId: string, payload: { evidence_id: string; evidence_role?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/cases/${encodeURIComponent(caseId)}/evidence`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getEvent: async (eventId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/events/${encodeURIComponent(eventId)}`);
      return res.data;
    },

    createDetectionRule: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/soc/detections/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listWatchlists: async (projectId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/watchlists`);
      return res.data;
    },

    createWatchlist: async (projectId: string, payload: { name: string; description: string; watchlist_type?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/watchlists`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    addWatchlistEntity: async (watchlistId: string, payload: { entity_type: string; entity_identifier: string; entity_name: string; reason: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/watchlists/${encodeURIComponent(watchlistId)}/entities`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getEntityActivity: async (projectId: string, entityId: string, limit?: number): Promise<any[]> => {
      const q = limit ? `?limit=${limit}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/soc/entities/${encodeURIComponent(entityId)}/activity${q}`);
      return res.data;
    },

    requestAction: async (payload: { action_type: string; target_resource: string; reason: string; case_id?: string; alert_id?: string; policy_decision_id?: string; approval_id?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/soc/actions/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    recordActionResult: async (actionId: string, payload: { execution_status: string; post_action_evidence_id?: string; reverification_status?: string; details?: any }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/soc/actions/${encodeURIComponent(actionId)}/result`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    health: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/soc/health');
      return res.data;
    },
  };

  // =========================================================================
  // THING THREAT INTEL — Threat Intelligence Platform APIs
  // =========================================================================
  public threatIntel = {
    overview: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/intelligence/overview${q}`);
      return res.data;
    },

    listSources: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/intelligence/sources');
      return res.data;
    },

    createSource: async (payload: { name: string; source_type: string; provider: string; endpoint: string; protocol?: string; authentication_type?: string; configuration?: Record<string, any>; poll_interval_minutes?: number }): Promise<any> => {
      const res = await this.request<any>('/api/v1/intelligence/sources', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    syncSource: async (sourceId: string, payload?: { feed_payload?: any } | any): Promise<any> => {
      const feed = payload?.feed_payload !== undefined ? payload.feed_payload : payload;
      const res = await this.request<any>(`/api/v1/intelligence/sources/${encodeURIComponent(sourceId)}/sync`, {
        method: 'POST',
        body: JSON.stringify({ feed_payload: feed }),
      });
      return res.data;
    },

    listIndicators: async (params?: { indicator_type?: string; confidence?: string; severity?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.indicator_type && params.indicator_type !== 'ALL') q.append('indicator_type', params.indicator_type);
      if (params?.confidence && params.confidence !== 'ALL') q.append('confidence', params.confidence);
      if (params?.severity && params.severity !== 'ALL') q.append('severity', params.severity);
      if (params?.status && params.status !== 'ALL') q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/intelligence/indicators${qs}`);
      return res.data;
    },

    getIndicator: async (indicatorId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/intelligence/indicators/${encodeURIComponent(indicatorId)}`);
      return res.data;
    },

    suppressIndicator: async (indicatorId: string, payload: { reason: string; duration_days?: number; scope?: string; project_id?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/intelligence/indicators/${encodeURIComponent(indicatorId)}/suppress`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listThreatActors: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/intelligence/threat-actors');
      return res.data;
    },

    listMalware: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/intelligence/malware');
      return res.data;
    },

    listTechniques: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/intelligence/techniques');
      return res.data;
    },

    listMatches: async (projectId: string, params?: { status?: string; severity?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') q.append('status', params.status);
      if (params?.severity && params.severity !== 'ALL') q.append('severity', params.severity);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/intelligence/matches${qs}`);
      return res.data;
    },

    getMatch: async (matchId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/intelligence/matches/${encodeURIComponent(matchId)}`);
      return res.data;
    },

    escalateMatchToSoc: async (matchId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/intelligence/matches/${encodeURIComponent(matchId)}/escalate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.data;
    },

    correlate: async (payload: { project_id: string; observation_type: string; observed_value: string; observed_entity_id: string; observed_entity_type?: string; environment?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/intelligence/correlate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    correlateObservation: async (payload: { project_id: string; observation_type: string; observed_value: string; observed_entity_id: string; observed_entity_type?: string; environment?: string; evidence_reference?: string; context?: Record<string, any> }): Promise<any> => {
      const res = await this.request<any>('/api/v1/intelligence/correlate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  public intelligence = {
    overview: async (projectId?: string | null): Promise<any> => this.threatIntel.overview(projectId),
    indicators: async (params?: any): Promise<any> => this.threatIntel.listIndicators(params),
    sources: async (): Promise<any[]> => this.threatIntel.listSources(),
    matches: async (projectId: string, params?: any): Promise<any[]> => this.threatIntel.listMatches(projectId, params),
    correlate: async (payload: any): Promise<any> => this.threatIntel.correlate(payload),
  };

  // Audit Events API
  public audit = {
    list: async (params?: {
      projectId?: string;
      actorId?: string;
      limit?: number;
      offset?: number;
    }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.actorId) q.append('actor_id', params.actorId);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/audit-events${qs}`);
      return res.data;
    },
  };

  // Runtime Protection & Evidence API
  public runtime = {
    listEvidence: async (projectId: string, params?: { sourceType?: string; eventType?: string; limit?: number; offset?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.sourceType) q.append('source_type', params.sourceType);
      if (params?.eventType) q.append('event_type', params.eventType);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset != null) q.append('offset', params.offset.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/evidence${qs}`);
      return res.data;
    },

    listSources: async (projectId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/sources`);
      return res.data;
    },

    listVerifications: async (projectId: string, params?: { contractVersionId?: string; status?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.contractVersionId) q.append('contract_version_id', params.contractVersionId);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/verifications${qs}`);
      return res.data;
    },

    listViolations: async (projectId: string, params?: { status?: string; severity?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.limit) q.append('limit', params.limit.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/violations${qs}`);
      return res.data;
    },

    ingestEvidence: async (projectId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/runtime/evidence`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };



  // Security Jobs & Orchestration API
  public securityJobs = {
    overview: async (params?: {
      repositoryId?: string;
      projectId?: string;
      search?: string;
      status?: string;
      jobType?: string;
      page?: number;
      pageSize?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.repositoryId) q.append('repository_id', params.repositoryId);
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.search) q.append('search', params.search);
      if (params?.status && params.status !== 'All Status') q.append('status', params.status);
      if (params?.jobType && params.jobType !== 'All Types') q.append('job_type', params.jobType);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.pageSize) q.append('page_size', params.pageSize.toString());
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/github/security-jobs/overview${qs}`);
      return res.data;
    },

    run: async (payload: {
      repository_id?: string;
      repository?: string;
      branch?: string;
      job_type?: string;
      scan_types?: string[];
      severity_threshold?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/github/security-jobs/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/github/security-jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
  };



  // Code Security & Scanner Configurations API
  public codeConfig = {
    get: async (params?: { projectId?: string; category?: string }): Promise<{ configurations: Record<string, any> }> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.append('project_id', params.projectId);
      if (params?.category) q.append('category', params.category);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ configurations: Record<string, any> }>(`/api/v1/code/configuration${qs}`);
      return res.data;
    },

    save: async (payload: {
      category: string;
      project_id?: string;
      provider?: string;
      frameworks?: string[];
      triggers?: string[];
      severity_threshold?: string;
      fail_ci_threshold?: string;
      exclusions?: string[];
      settings_json?: Record<string, any>;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/configuration', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    test: async (payload: {
      category: string;
      provider?: string;
      frameworks?: string[];
      project_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/code/configuration/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };





  // =========================================================================
  // BACKGROUND TASK QUEUE APIS (/api/v1/tasks/*) — AGENTS.md Rule 12
  // =========================================================================
  public tasks = {
    enqueue: async (payload: {
      task_type: string;
      project_id?: string;
      payload?: Record<string, any>;
      priority?: number;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    get: async (taskId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/tasks/${taskId}`);
      return res.data;
    },

    list: async (params?: {
      project_id?: string;
      task_type?: string;
      status?: string;
      page?: number;
      page_size?: number;
      limit?: number;
    }): Promise<{
      items: any[];
      tasks?: any[];
      total: number;
      queued_count: number;
      running_count: number;
      completed_count: number;
      failed_count: number;
      page: number;
      page_size: number;
    }> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.task_type && params.task_type !== 'ALL') q.append('task_type', params.task_type);
      if (params?.status && params.status !== 'ALL') q.append('status', params.status);
      if (params?.page) q.append('page', String(params.page));
      const effectivePageSize = params?.page_size ?? params?.limit;
      if (effectivePageSize) q.append('page_size', String(effectivePageSize));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/tasks${qs}`);
      const data = res.data;
      if (data && !data.tasks && data.items) {
        data.tasks = data.items;
      }
      return data;
    },

    cancel: async (taskId: string): Promise<{ task_id: string; status: string; message: string }> => {
      const res = await this.request<any>(`/api/v1/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      return res.data;
    },

    retry: async (taskId: string): Promise<{ new_task_id: string; original_task_id: string; status: string; message: string }> => {
      const res = await this.request<any>(`/api/v1/tasks/${taskId}/retry`, {
        method: 'POST',
      });
      return res.data;
    },
  };





  // =========================================================================














  // =========================================================================
  // GOVERNANCE, OPA REGO POLICIES & COMPLIANCE COCKPIT (Task 11)
  // =========================================================================
  public governance = {
    overview: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/governance/overview');
      return res.data;
    },

    updatePolicyMode: async (
      policyCodeOrId: string,
      payload: { enforcement_mode?: string; status?: string }
    ): Promise<any> => {
      const res = await this.request<any>(`/api/v1/governance/policies/${encodeURIComponent(policyCodeOrId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    evaluatePolicies: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/governance/evaluate', {
        method: 'POST',
      });
      return res.data;
    },

    testRego: async (payload: { rego_code: string; input_payload?: Record<string, any> }): Promise<any> => {
      const res = await this.request<any>('/api/v1/governance/test-rego', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };



  // =========================================================================
  // SAST OVERVIEW & SECURITY DASHBOARD
  // =========================================================================
  public sast = {
    overview: async (params?: { project_id?: string; repository?: string; branch?: string; date_range?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.date_range) q.append('date_range', params.date_range);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/overview${qs}`);
      return res.data;
    },

    trends: async (params?: { project_id?: string; repository?: string; branch?: string; date_range?: string; group_by?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.date_range) q.append('date_range', params.date_range);
      if (params?.group_by) q.append('group_by', params.group_by);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/overview/trends${qs}`);
      return res.data;
    },

    severity: async (params?: { project_id?: string; repository?: string; branch?: string; date_range?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.date_range) q.append('date_range', params.date_range);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/overview/severity${qs}`);
      return res.data;
    },

    categories: async (params?: { project_id?: string; repository?: string; branch?: string; date_range?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.date_range) q.append('date_range', params.date_range);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/overview/categories${qs}`);
      return res.data;
    },

    recentFindings: async (params?: { project_id?: string; repository?: string; branch?: string; category?: string; severity?: string; status?: string; page?: number; page_size?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.category) q.append('category', params.category);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.page) q.append('page', String(params.page));
      if (params?.page_size) q.append('page_size', String(params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/findings/recent${qs}`);
      return res.data;
    },

    updateFinding: async (findingId: string, payload: { status?: string; assigned_to?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/findings/${encodeURIComponent(findingId)}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    scans: async (params?: { project_id?: string; status?: string; repository?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.status) q.append('status', params.status);
      if (params?.repository) q.append('repository', params.repository);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/scans${qs}`);
      return res.data;
    },

    triggerScan: async (payload: { repository_id?: string; branch?: string; scan_type?: string; ruleset?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    cancelScan: async (scanId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/${encodeURIComponent(scanId)}/cancel${qs}`, {
        method: 'POST',
      });
      return res.data;
    },

    retryScan: async (scanId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/${encodeURIComponent(scanId)}/retry${qs}`, {
        method: 'POST',
      });
      return res.data;
    },

    schedules: async (projectId?: string): Promise<any[]> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any[]>(`/api/sast/scans/schedules${qs}`);
      return res.data;
    },

    scheduleScan: async (payload: { repository_id: string; branch: string; frequency: string; time_utc: string; timezone?: string; enabled?: boolean }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/schedule${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    repositories: async (projectId?: string): Promise<any[]> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any[]>(`/api/sast/repositories${qs}`);
      return res.data;
    },

    branches: async (repositoryId: string, projectId?: string): Promise<string[]> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<string[]>(`/api/sast/repositories/${encodeURIComponent(repositoryId)}/branches${qs}`);
      return res.data;
    },

    scanDetail: async (scanId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/${encodeURIComponent(scanId)}${qs}`);
      return res.data;
    },

    scanPullRequest: async (payload: { repository_id: string; pull_request_number: number; branch?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/pull-request${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    deleteSchedule: async (scheduleId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/schedules/${encodeURIComponent(scheduleId)}${qs}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    exportFindings: async (params?: { project_id?: string; repository?: string; branch?: string; category?: string; severity?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.category) q.append('category', params.category);
      if (params?.severity) q.append('severity', params.severity);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/export${qs}`);
      return res.data;
    },

    rules: async (params?: { project_id?: string; category?: string; severity?: string; search?: string; repository?: string }): Promise<{
      total: number;
      enabled_count: number;
      disabled_count: number;
      custom_count: number;
      rules: Array<{
        id: string;
        rule_id: string;
        title: string;
        description: string;
        severity: string;
        category: string;
        cwe?: string;
        owasp?: string;
        pattern?: string;
        scanner: string;
        enabled: boolean;
        is_custom: boolean;
        created_at?: string;
        updated_at?: string;
      }>;
    }> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.category) q.append('category', params.category);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.search) q.append('search', params.search);
      if (params?.repository) q.append('repository', params.repository);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/rules${qs}`);
      return res.data;
    },

    createRule: async (payload: {
      rule_id?: string;
      title: string;
      description: string;
      severity?: string;
      category?: string;
      cwe?: string;
      owasp?: string;
      pattern: string;
      enabled?: boolean;
    }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/rules${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    toggleRule: async (ruleId: string, enabled: boolean, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/rules/${encodeURIComponent(ruleId)}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      return res.data;
    },

    updateRule: async (ruleId: string, payload: { enabled?: boolean; severity?: string; description?: string; pattern?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/rules/${encodeURIComponent(ruleId)}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    ruleDetail: async (ruleId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/rules/${encodeURIComponent(ruleId)}${qs}`);
      return res.data;
    },

    baselines: async (params?: { project_id?: string; repository_id?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.repository_id) q.append('repository_id', params.repository_id);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/baselines${qs}`);
      return res.data;
    },

    createBaseline: async (payload: { repository_id: string; branch?: string; scan_id?: string; note?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/baselines${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    exceptions: async (params?: { project_id?: string; status?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.status) q.append('status', params.status);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/exceptions${qs}`);
      return res.data;
    },

    createException: async (payload: { finding_id?: string; rule_id: string; file_path?: string; repository_id?: string; severity?: string; justification: string; expires_in_days?: number }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/exceptions${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    updateException: async (exceptionId: string, payload: { status?: string; justification?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/exceptions/${encodeURIComponent(exceptionId)}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    revokeException: async (exceptionId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/exceptions/${encodeURIComponent(exceptionId)}${qs}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    deleteException: async (exceptionId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/exceptions/${encodeURIComponent(exceptionId)}${qs}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    coverage: async (params?: { project_id?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/sast/coverage${qs}`);
      return res.data;
    },

    scanLogs: async (scanId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/${encodeURIComponent(scanId)}/logs${qs}`);
      return res.data;
    },

    compareScans: async (payload: { base_scan_id: string; compare_scan_id: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/sast/scans/compare${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  findings = {
    list: async (params?: {
      project_id?: string;
      organization_id?: string;
      repository?: string;
      repository_id?: string;
      branch?: string;
      severity?: string;
      status?: string;
      category?: string;
      rule_id?: string;
      cwe_id?: string;
      file_path?: string;
      author?: string;
      date_range?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      page?: number;
      page_size?: number;
    }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      const repo = params?.repository || params?.repository_id;
      if (repo) q.append('repository', repo);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.category) q.append('category', params.category);
      if (params?.rule_id) q.append('rule_id', params.rule_id);
      if (params?.cwe_id) q.append('cwe_id', params.cwe_id);
      if (params?.file_path) q.append('file_path', params.file_path);
      if (params?.author) q.append('author', params.author);
      if (params?.date_range) q.append('date_range', params.date_range);
      if (params?.start_date) q.append('start_date', params.start_date);
      if (params?.end_date) q.append('end_date', params.end_date);
      if (params?.search) q.append('search', params.search);
      if (params?.page) q.append('page', String(params.page));
      if (params?.page_size) q.append('page_size', String(params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings${qs}`);
      return res.data;
    },

    search: async (query: string, params?: any): Promise<any> => {
      const q = new URLSearchParams();
      q.append('q', query);
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.category) q.append('category', params.category);
      if (params?.page) q.append('page', String(params.page));
      if (params?.page_size) q.append('page_size', String(params.page_size));
      const res = await this.request<any>(`/api/findings/search?${q.toString()}`);
      return res.data;
    },

    summary: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.category) q.append('category', params.category);
      if (params?.date_range) q.append('date_range', params.date_range);
      if (params?.search) q.append('search', params.search);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings/summary${qs}`);
      return res.data;
    },

    severity: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.severity) q.append('severity', params.severity);
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.status) q.append('status', params.status);
      if (params?.category) q.append('category', params.category);
      if (params?.search) q.append('search', params.search);
      if (params?.page) q.append('page', String(params.page));
      if (params?.page_size) q.append('page_size', String(params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings/severity${qs}`);
      return res.data;
    },

    status: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.category) q.append('category', params.category);
      if (params?.search) q.append('search', params.search);
      if (params?.page) q.append('page', String(params.page));
      if (params?.page_size) q.append('page_size', String(params.page_size));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings/status${qs}`);
      return res.data;
    },

    categories: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.status) q.append('status', params.status);
      if (params?.date_range) q.append('date_range', params.date_range);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings/categories${qs}`);
      return res.data;
    },

    repositories: async (params?: any): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.status) q.append('status', params.status);
      if (params?.date_range) q.append('date_range', params.date_range);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/findings/repositories${qs}`);
      return res.data;
    },

    detail: async (findingId: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}${qs}`);
      return res.data;
    },

    patch: async (findingId: string, payload: { status: string; resolution_note?: string }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    assign: async (findingId: string, assignedTo: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/assign${qs}`, {
        method: 'POST',
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      return res.data;
    },

    resolve: async (findingId: string, note?: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/resolve${qs}`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: note }),
      });
      return res.data;
    },

    falsePositive: async (findingId: string, note?: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/false-positive${qs}`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: note }),
      });
      return res.data;
    },

    ignore: async (findingId: string, note?: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/ignore${qs}`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: note }),
      });
      return res.data;
    },

    reopen: async (findingId: string, note?: string, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/reopen${qs}`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: note }),
      });
      return res.data;
    },

    createIssue: async (findingId: string, payload?: { integration?: string; title?: string; description?: string; labels?: string[] }, projectId?: string): Promise<any> => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/issue${qs}`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    createFix: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/fix`, {
        method: 'POST',
      });
      return res.data;
    },

    autofix: async (findingId: string, dryRun = false): Promise<any> => {
      const q = dryRun ? '?dry_run=true' : '';
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/autofix${q}`, {
        method: 'POST',
      });
      return res.data;
    },

    applyFix: async (findingId: string, payload?: { suggestion_id?: string; dry_run?: boolean }): Promise<any> => {
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/autofix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },

    createPR: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/findings/${encodeURIComponent(findingId)}/pr`, {
        method: 'POST',
      });
      return res.data;
    },

    exportUrl: (params?: any, format = 'csv'): string => {
      const q = new URLSearchParams();
      q.append('format', format);
      if (params?.project_id) q.append('project_id', params.project_id);
      if (params?.organization_id) q.append('organization_id', params.organization_id);
      if (params?.repository) q.append('repository', params.repository);
      if (params?.branch) q.append('branch', params.branch);
      if (params?.severity) q.append('severity', params.severity);
      if (params?.status) q.append('status', params.status);
      if (params?.category) q.append('category', params.category);
      if (params?.search) q.append('search', params.search);
      return `/api/findings/export?${q.toString()}`;
    },
  };

  public sales = {
    getExperts: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/experts');
      return res.data;
    },
    listExperts: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/experts');
      return res.data;
    },

    getAvailability: async (date: string, expertId?: string): Promise<{
      date: string;
      expert_id?: string;
      slots: Array<{ time: string; available: boolean; booked: boolean }>;
      available_count: number;
    }> => {
      const q = new URLSearchParams({ date });
      if (expertId) q.append('expert_id', expertId);
      const res = await this.request<any>(`/api/v1/sales/availability?${q.toString()}`);
      return res.data;
    },

    listAppointments: async (status?: string): Promise<any[]> => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await this.request<any[]>(`/api/v1/sales/appointments${q}`);
      return res.data;
    },

    updateAppointmentStatus: async (appointmentId: string, statusUpdate: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/appointments/${encodeURIComponent(appointmentId)}?status_update=${encodeURIComponent(statusUpdate)}`,
        { method: 'PATCH' }
      );
      return res.data;
    },

    bookDemo: async (payload: {
      name: string;
      email: string;
      company: string;
      job_title?: string;
      preferred_date: string;
      preferred_time_slot: string;
      timezone?: string;
      primary_focus?: string;
      assigned_expert?: string;
      notes?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/book-demo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    requestDemo: async (payload: {
      name: string;
      email: string;
      company: string;
      job_title?: string;
      phone?: string;
      team_size?: string;
      cloud_provider?: string;
      deployment_target?: string;
      primary_focus?: string;
      current_tooling?: string;
      notes?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/request-demo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    contactSales: async (payload: {
      name: string;
      email: string;
      company: string;
      phone?: string;
      team_size?: string;
      deployment_target?: string;
      message: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/contact-sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    enterpriseInquiry: async (payload: {
      name: string;
      email: string;
      company: string;
      team_size?: string;
      compliance_frameworks?: string[];
      deployment_target?: string;
      estimated_developer_seats?: number;
      hsm_agent_signing_required?: boolean;
      custom_sla_required?: boolean;
      requirements_overview: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/enterprise-inquiry', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listEnterpriseInquiries: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/enterprise-inquiries');
      return res.data;
    },

    talkToExpert: async (payload: {
      name: string;
      email: string;
      company: string;
      team_size?: string;
      primary_focus: string;
      preferred_date?: string;
      preferred_time_slot?: string;
      notes?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/talk-to-expert', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listLeads: async (params?: { status?: string; source?: string; limit?: number }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.source) q.append('source', params.source);
      if (params?.limit) q.append('limit', params.limit.toString());
      const res = await this.request<any[]>(`/api/v1/sales/leads?${q.toString()}`);
      return res.data;
    },

    getLead: async (leadId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/leads/${encodeURIComponent(leadId)}`);
      return res.data;
    },

    updateLead: async (leadId: string, params: { status?: string; assigned_sales_user?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.assigned_sales_user) q.append('assigned_sales_user', params.assigned_sales_user);
      const res = await this.request<any>(
        `/api/v1/sales/leads/${encodeURIComponent(leadId)}?${q.toString()}`,
        { method: 'PATCH' }
      );
      return res.data;
    },

    qualifyLead: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/qualify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listQualifications: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/qualifications');
      return res.data;
    },

    getDemoSession: async (): Promise<{
      session_id: string;
      session_name: string;
      security_score: number;
      total_findings: number;
      critical_findings: number;
      high_findings: number;
      medium_findings: number;
      low_findings: number;
      assets_count: number;
      policies_evaluated: number;
      guided_steps_completed: string[];
      simulated_events: any[];
    }> => {
      const res = await this.request<any>('/api/v1/sales/demo-workspace/session');
      return res.data;
    },

    runDemoSimulation: async (payload: {
      scenario_id: string;
      sample_code_or_prompt?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/demo-workspace/run-simulation', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    completeGuidedStep: async (payload: { step_id: string } | string): Promise<any> => {
      const body = typeof payload === 'string' ? { step_id: payload } : payload;
      const res = await this.request<any>('/api/v1/sales/guided-demo/step-complete', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },

    requestPOC: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/poc/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    listPOCs: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/poc');
      return res.data;
    },

    getPOC: async (pocId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/poc/${encodeURIComponent(pocId)}`);
      return res.data;
    },

    verifyPOCMilestone: async (pocId: string, criterionId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/poc/${encodeURIComponent(pocId)}/milestone/${encodeURIComponent(criterionId)}/verify`,
        { method: 'POST' }
      );
      return res.data;
    },

    getPOCResults: async (pocId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/poc/${encodeURIComponent(pocId)}/results`);
      return res.data;
    },

    createProposal: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/proposal/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getProposal: async (quoteId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/proposal/${encodeURIComponent(quoteId)}`);
      return res.data;
    },

    listProposals: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/proposals');
      return res.data;
    },

    acceptProposal: async (quoteId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/proposal/${encodeURIComponent(quoteId)}/accept`,
        { method: 'POST' }
      );
      return res.data;
    },

    requestProposalChanges: async (quoteId: string, notes: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/proposal/${encodeURIComponent(quoteId)}/request-changes?notes=${encodeURIComponent(notes)}`,
        { method: 'POST' }
      );
      return res.data;
    },

    generateContract: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/contract/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getContract: async (contractId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/contract/${encodeURIComponent(contractId)}`);
      return res.data;
    },

    signContract: async (contractId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/contract/${encodeURIComponent(contractId)}/sign`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    startOnboarding: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/sales/onboarding/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    getOnboarding: async (onboardingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/sales/onboarding/${encodeURIComponent(onboardingId)}`);
      return res.data;
    },

    updateOnboardingStep: async (
      onboardingId: string,
      payload: { step_key: string; completed: boolean; details?: any }
    ): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/sales/onboarding/${encodeURIComponent(onboardingId)}/step-update`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },

    listOnboardings: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/sales/onboardings');
      return res.data;
    },
  };

  // =========================================================================
  // PRODUCT ENTITLEMENTS & SUBSCRIPTION ACCESS CONTROL
  // =========================================================================
  public entitlements = {
    getMe: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/entitlements/me', { bypassCache: true });
      return res.data;
    },

    getCatalog: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/entitlements/catalog');
      return res.data;
    },

    selectProducts: async (data: { products: string[]; plan?: string; billing_cycle?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/entitlements/onboarding/select-products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/entitlements');
      return res.data;
    },

    upgrade: async (data: { product_key: string; plan_name?: string; payment_token?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/entitlements/upgrade', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/entitlements');
      return res.data;
    },

    getAuditLog: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/entitlements/audit-log');
      return res.data;
    },
  };

  // =========================================================================
  // FOUNDER SUPERADMIN — TENANT MANAGEMENT
  // =========================================================================
  public superadmin = {
    listTenants: async (params?: {
      page?: number;
      page_size?: number;
      per_page?: number;
      search?: string;
      status?: string;
      plan?: string;
      sort_by?: string;
      sort_order?: string;
    }): Promise<{
      items: any[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      stats: { total: number; active: number; trial: number; pending: number; suspended: number; failed: number };
    }> => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      const effectivePageSize = params?.page_size ?? params?.per_page;
      if (effectivePageSize) q.set('page_size', String(effectivePageSize));
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.plan) q.set('plan', params.plan);
      if (params?.sort_by) q.set('sort_by', params.sort_by);
      if (params?.sort_order) q.set('sort_order', params.sort_order);
      const url = `/api/v1/superadmin/tenants${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    getPlans: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/superadmin/tenants/plans', { bypassCache: true });
      return res.data;
    },

    createTenant: async (data: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/tenants');
      return res.data;
    },

    getTenant: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantDetails: async (tenantId: string): Promise<any> => {
      return this.superadmin.getTenant(tenantId);
    },

    getTenantMembers: async (tenantId: string, params?: { role?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.role) q.set('role', params.role);
      if (params?.search) q.set('search', params.search);
      const url = `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/members${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    inviteTenantMember: async (tenantId: string, data: { email: string; role?: string; name?: string; team?: string; scope?: string; admin_type?: string; message?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/members/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    updateTenantMember: async (tenantId: string, memberId: string, data: { role?: string; is_active?: boolean }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    removeTenantMember: async (tenantId: string, memberId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: 'DELETE',
        }
      );
      return res.data;
    },

    inviteMember: async (tenantId: string, data: any): Promise<any> => {
      return this.superadmin.inviteTenantMember(tenantId, data);
    },

    updateMemberRole: async (tenantId: string, memberId: string, role: string): Promise<any> => {
      return this.superadmin.updateTenantMember(tenantId, memberId, { role });
    },

    removeMember: async (tenantId: string, memberId: string): Promise<any> => {
      return this.superadmin.removeTenantMember(tenantId, memberId);
    },

    getTenantRepositories: async (tenantId: string, search?: string): Promise<any[]> => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await this.request<any[]>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/repositories${q}`,
        { bypassCache: true }
      );
      return res.data;
    },

    getTenantIntegrations: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/integrations`,
        { bypassCache: true }
      );
      return res.data;
    },

    connectTenantIntegration: async (tenantId: string, data: { provider: string; account_name?: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/integrations/connect`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    disconnectTenantIntegration: async (tenantId: string, integrationId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/integrations/${encodeURIComponent(integrationId)}`,
        {
          method: 'DELETE',
        }
      );
      return res.data;
    },

    updateTenantIntegrationSetting: async (
      tenantId: string,
      data: { setting_key: string; enabled: boolean }
    ): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/integrations/settings`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    connectIntegration: async (tenantId: string, data: any): Promise<any> => {
      return this.superadmin.connectTenantIntegration(tenantId, data);
    },

    disconnectIntegration: async (tenantId: string, integrationId: string): Promise<any> => {
      return this.superadmin.disconnectTenantIntegration(tenantId, integrationId);
    },

    updateIntegrationSetting: async (
      tenantId: string,
      data: { setting_key: string; enabled: boolean }
    ): Promise<any> => {
      return this.superadmin.updateTenantIntegrationSetting(tenantId, data);
    },

    getTenantResources: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources`,
        { bypassCache: true }
      );
      return res.data;
    },

    updateTenantQuotas: async (tenantId: string, data: any): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/quotas`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    addTenantEnvironment: async (tenantId: string, data: { name: string; slug?: string; scan_schedule?: string; branch?: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/environments`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    addTenantEnvVariable: async (tenantId: string, data: { key: string; value: string; environment?: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/variables`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    deleteTenantEnvVariable: async (tenantId: string, variableKey: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/variables/${encodeURIComponent(variableKey)}`,
        {
          method: 'DELETE',
        }
      );
      return res.data;
    },

    addTenantSecret: async (tenantId: string, data: { name: string; environment?: string; type?: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/secrets`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    deleteTenantSecret: async (tenantId: string, secretName: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/secrets/${encodeURIComponent(secretName)}`,
        {
          method: 'DELETE',
        }
      );
      return res.data;
    },

    configureTenantIsolation: async (tenantId: string, data: { isolation_type: string; status?: string; description?: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/resources/isolation/configure`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    getTenantBilling: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/billing`,
        { bypassCache: true }
      );
      return res.data;
    },

    updateTenantPlan: async (tenantId: string, data: { plan: string }): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/billing/plan`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return res.data;
    },

    getTenantActivity: async (tenantId: string, params?: { page?: number; page_size?: number }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.page_size) q.set('page_size', String(params.page_size));
      const url = `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/activity${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    suspendTenant: async (tenantId: string, reason?: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/suspend`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      return res.data;
    },

    reinstateTenant: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/reinstate`,
        {
          method: 'POST',
        }
      );
      return res.data;
    },

    toggleMaintenance: async (tenantId: string, is_maintenance: boolean): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/maintenance`,
        {
          method: 'POST',
          body: JSON.stringify({ is_maintenance }),
        }
      );
      return res.data;
    },

    updateRetention: async (tenantId: string, data_retention_days: number): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/retention`,
        {
          method: 'POST',
          body: JSON.stringify({ data_retention_days }),
        }
      );
      return res.data;
    },

    updateRetentionPolicy: async (tenantId: string, data_retention_days: number): Promise<any> => {
      return this.superadmin.updateRetention(tenantId, data_retention_days);
    },

    deleteTenant: async (tenantId: string, confirmation: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/delete`,
        {
          method: 'POST',
          body: JSON.stringify({ confirmation }),
        }
      );
      return res.data;
    },

    getTenantLifecycle: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle`,
        { bypassCache: true }
      );
      return res.data;
    },

    rotateTenantSecrets: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/rotate-secrets`,
        { method: 'POST' }
      );
      return res.data;
    },

    reprovisionTenant: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/reprovision`,
        { method: 'POST' }
      );
      return res.data;
    },

    updateRetentionItem: async (tenantId: string, itemId: string, period: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/retention-item`,
        {
          method: 'POST',
          body: JSON.stringify({ item_id: itemId, period }),
        }
      );
      return res.data;
    },

    updateArchiveSettings: async (tenantId: string, enabled: boolean): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/lifecycle/archive-settings`,
        {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        }
      );
      return res.data;
    },

    listProvisioningJobs: async (params?: {
      status?: string;
      search?: string;
      page?: number;
      page_size?: number;
    }): Promise<{ items: any[]; jobs?: any[]; total: number; page: number; page_size: number; stats: any }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.page_size) q.set('page_size', String(params.page_size));
      const url = `/api/v1/superadmin/tenants/provisioning/jobs${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    createProvisioningJob: async (data: {
      tenant_name: string;
      job_type?: string;
      organization_id?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/tenants/provisioning/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    retryProvisioningJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/provisioning/jobs/${encodeURIComponent(jobId)}/retry`,
        {
          method: 'POST',
        }
      );
      return res.data;
    },

    cancelProvisioningJob: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(
        `/api/v1/superadmin/tenants/provisioning/jobs/${encodeURIComponent(jobId)}/cancel`,
        {
          method: 'POST',
        }
      );
      return res.data;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FOUNDER SUPERADMIN — SUBSCRIPTION PLANS & ENTITLEMENTS (PART 1)
    // ─────────────────────────────────────────────────────────────────────────
    listPlans: async (params?: {
      status?: string;
      plan_type?: string;
      search?: string;
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_order?: string;
    }): Promise<{
      plans: any[];
      stats: { total: number; active: number; trial: number; archived: number };
      total: number;
      page: number;
      page_size: number;
    }> => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.plan_type && params.plan_type !== 'all') q.set('plan_type', params.plan_type);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.page_size) q.set('page_size', params.page_size.toString());
      if (params?.sort_by) q.set('sort_by', params.sort_by);
      if (params?.sort_order) q.set('sort_order', params.sort_order);

      const url = `/api/v1/superadmin/plans${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    getFeatureCatalog: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/superadmin/plans/feature-catalog', { bypassCache: true });
      return res.data;
    },

    createPlan: async (data: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/plans');
      return res.data;
    },

    getPlanDetails: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`, {
        bypassCache: true,
      });
      return res.data;
    },

    updatePlan: async (planId: string, data: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/plans');
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    publishPlan: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/publish`, {
        method: 'POST',
      });
      this.invalidateCache('/api/v1/superadmin/plans');
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    archivePlan: async (planId: string, reason: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/archive`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      this.invalidateCache('/api/v1/superadmin/plans');
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    getPlanTenants: async (
      planId: string,
      params?: { search?: string; page?: number; page_size?: number }
    ): Promise<{
      items: any[];
      tenants: any[];
      total: number;
      page: number;
      page_size: number;
    }> => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.page_size) q.set('page_size', params.page_size.toString());

      const url = `/api/v1/superadmin/plans/${encodeURIComponent(planId)}/tenants${q.toString() ? '?' + q.toString() : ''
        }`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    getPlanUsage: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/usage`, {
        bypassCache: true,
      });
      return res.data;
    },

    getPlanHistory: async (planId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/history`, {
        bypassCache: true,
      });
      return res.data;
    },

    getPlanEntitlements: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/entitlements`, {
        bypassCache: true,
      });
      return res.data;
    },

    savePlanEntitlements: async (planId: string, features: string[], changelog?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/entitlements`, {
        method: 'PUT',
        body: JSON.stringify({ features, changelog }),
      });
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    getPlanLimits: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/limits`, {
        bypassCache: true,
      });
      return res.data;
    },

    savePlanLimits: async (planId: string, limits: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/limits`, {
        method: 'PUT',
        body: JSON.stringify(limits),
      });
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    getPlanPrices: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/prices`, {
        bypassCache: true,
      });
      return res.data;
    },

    savePlanPrices: async (planId: string, prices: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/prices`, {
        method: 'PUT',
        body: JSON.stringify(prices),
      });
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    getPlanTrialSettings: async (planId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/trial-settings`, {
        bypassCache: true,
      });
      return res.data;
    },

    savePlanTrialSettings: async (planId: string, trialSettings: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}/trial-settings`, {
        method: 'PUT',
        body: JSON.stringify(trialSettings),
      });
      this.invalidateCache(`/api/v1/superadmin/plans/${encodeURIComponent(planId)}`);
      return res.data;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FOUNDER SUPERADMIN — FEATURE ENTITLEMENTS & CATALOG (PART 2)
    // ─────────────────────────────────────────────────────────────────────────
    getEntitlementsMatrix: async (): Promise<{
      plans: Array<{ id: string; key: string; name: string; monthly_price: number }>;
      categories: Array<{
        name: string;
        features: Array<{
          id: string;
          key: string;
          name: string;
          tagline: string;
          description: string;
          category: string;
          module: string;
          status: string;
          icon: string;
          tiers: Record<string, { enabled: boolean; value_tier: string; usage_limit: number; custom_config: boolean }>;
        }>;
      }>;
      total_features: number;
    }> => {
      const res = await this.request<any>('/api/v1/superadmin/entitlements', { bypassCache: true });
      return res.data;
    },

    updateMatrixCell: async (data: {
      plan_key: string;
      feature_key: string;
      enabled: boolean;
      value_tier?: string;
      usage_limit?: number;
      custom_config?: boolean;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/entitlements/matrix/cell', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    listEntitlementFeatures: async (params?: {
      category?: string;
      status?: string;
      module?: string;
      search?: string;
      page?: number;
      page_size?: number;
    }): Promise<{
      items: any[];
      total: number;
      total_all: number;
      page: number;
      page_size: number;
      categories: Record<string, number>;
    }> => {
      const q = new URLSearchParams();
      if (params?.category && params.category !== 'all') q.set('category', params.category);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.module && params.module !== 'all') q.set('module', params.module);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.page_size) q.set('page_size', params.page_size.toString());

      const url = `/api/v1/superadmin/entitlements/features${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    createEntitlementFeature: async (data: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/entitlements/features', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/entitlements/features');
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    getEntitlementFeatureDetails: async (featureId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`, {
        bypassCache: true,
      });
      return res.data;
    },

    updateEntitlementFeature: async (featureId: string, data: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/entitlements/features');
      this.invalidateCache(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`);
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    publishEntitlementFeature: async (featureId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/publish`, {
        method: 'POST',
      });
      this.invalidateCache('/api/v1/superadmin/entitlements/features');
      this.invalidateCache(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`);
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    archiveEntitlementFeature: async (featureId: string, reason?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/archive`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      this.invalidateCache('/api/v1/superadmin/entitlements/features');
      this.invalidateCache(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`);
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    getEntitlementFeatureDependencies: async (featureId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/dependencies`, {
        bypassCache: true,
      });
      return res.data;
    },

    saveEntitlementFeatureDependencies: async (featureId: string, data: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/dependencies`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      this.invalidateCache(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`);
      return res.data;
    },

    getEntitlementFeaturePlanAvailability: async (featureId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/plans`, {
        bypassCache: true,
      });
      return res.data;
    },

    saveEntitlementFeaturePlanAvailability: async (featureId: string, planAvailability: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/plans`, {
        method: 'PUT',
        body: JSON.stringify({ plan_availability: planAvailability }),
      });
      this.invalidateCache(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}`);
      this.invalidateCache('/api/v1/superadmin/entitlements');
      return res.data;
    },

    getEntitlementFeatureUsage: async (featureId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/usage`, {
        bypassCache: true,
      });
      return res.data;
    },

    getEntitlementFeatureHistory: async (featureId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/superadmin/entitlements/features/${encodeURIComponent(featureId)}/history`, {
        bypassCache: true,
      });
      return res.data;
    },

    evaluateOrganizationEntitlement: async (data: { organization_id: string; feature_key: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/entitlements/evaluate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FOUNDER SUPERADMIN — TENANT PLAN ASSIGNMENT & OVERRIDES (PART 3)
    // ─────────────────────────────────────────────────────────────────────────
    listTenantPlanAssignments: async (params?: {
      search?: string;
      plan?: string;
      status?: string;
      page?: number;
      page_size?: number;
    }): Promise<{
      summary: { total_tenants: number; active: number; on_trial: number; suspended: number };
      items: any[];
      total: number;
      page: number;
      page_size: number;
    }> => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.page_size) q.set('page_size', params.page_size.toString());

      const url = `/api/v1/superadmin/tenant-plan-assignments${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any>(url, { bypassCache: true });
      return res.data;
    },

    getTenantCurrentPlan: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/current`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanOptions: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/options`, {
        bypassCache: true,
      });
      return res.data;
    },

    previewTenantPlanAssignment: async (tenantId: string, targetPlanKey: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/preview`, {
        method: 'POST',
        body: JSON.stringify({ target_plan_key: targetPlanKey }),
      });
      return res.data;
    },

    confirmTenantPlanAssignment: async (
      tenantId: string,
      data: { target_plan_key: string; billing_cycle?: string; reason?: string }
    ): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/confirm`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/tenant-plan-assignments');
      this.invalidateCache(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/current`);
      return res.data;
    },

    getTenantPlanAssignmentHistory: async (tenantId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/history`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanOverrides: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/overrides`, {
        bypassCache: true,
      });
      return res.data;
    },

    saveTenantPlanOverrides: async (
      tenantId: string,
      data: { category: string; overrides: any[] }
    ): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/overrides`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      this.invalidateCache(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/overrides`);
      return res.data;
    },

    resetTenantPlanOverrides: async (tenantId: string, category?: string): Promise<any> => {
      const q = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/overrides/reset${q}`, {
        method: 'POST',
      });
      this.invalidateCache(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/overrides`);
      return res.data;
    },

    getTenantPlanUsageOverview: async (tenantId: string, timeframe?: string): Promise<any> => {
      const q = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/usage${q}`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanRepositoryUsage: async (tenantId: string): Promise<any[]> => {
      const res = await this.request<any[]>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/usage/repositories`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanScanUsage: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/usage/scans`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanApiUsage: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/usage/api`, {
        bypassCache: true,
      });
      return res.data;
    },

    getTenantPlanStorageUsage: async (tenantId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/usage/storage`, {
        bypassCache: true,
      });
      return res.data;
    },

    previewTenantPlanChange: async (tenantId: string, targetPlanKey: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/change-preview`, {
        method: 'POST',
        body: JSON.stringify({ target_plan_key: targetPlanKey }),
      });
      return res.data;
    },

    executeTenantPlanChange: async (
      tenantId: string,
      data: {
        target_plan_key: string;
        effective_date_type?: string;
        reason?: string;
        is_downgrade_acknowledged?: boolean;
      }
    ): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/change`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/tenant-plan-assignments');
      this.invalidateCache(`/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/current`);
      return res.data;
    },

    getTenantPlanAuditLog: async (tenantId: string, params?: { action?: string; status?: string }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.action && params.action !== 'all') q.set('action', params.action);
      if (params?.status && params.status !== 'all') q.set('status', params.status);

      const url = `/api/v1/superadmin/tenants/${encodeURIComponent(tenantId)}/plan/audit${q.toString() ? '?' + q.toString() : ''}`;
      const res = await this.request<any[]>(url, { bypassCache: true });
      return res.data;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FOUNDER SUPERADMIN — QUOTAS, SEATS & TRIALS (PART 4)
    // ─────────────────────────────────────────────────────────────────────────
    getQuotasOverview: async (params?: { quota_type?: string; plan?: string; status?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.quota_type && params.quota_type !== 'all') q.set('quota_type', params.quota_type);
      if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.search) q.set('search', params.search);

      const res = await this.request<any>(`/api/v1/superadmin/quotas${q.toString() ? '?' + q.toString() : ''}`, { bypassCache: true });
      return res.data;
    },

    getRepositoryQuotas: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/repositories', { bypassCache: true });
      return res.data;
    },

    updateRepositoryRules: async (rules: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/repositories/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      });
      return res.data;
    },

    getScanQuotas: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/scans', { bypassCache: true });
      return res.data;
    },

    updateScanSettings: async (settings: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/scans/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      return res.data;
    },

    getApiUsageQuotas: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/api-usage', { bypassCache: true });
      return res.data;
    },

    updateApiSettings: async (settings: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/api-usage/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      return res.data;
    },

    getStorageQuotas: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/storage', { bypassCache: true });
      return res.data;
    },

    updateStorageSettings: async (settings: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/storage/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      return res.data;
    },

    listQuotaOverrides: async (params?: { quota_type?: string; status?: string; search?: string }): Promise<any[]> => {
      const q = new URLSearchParams();
      if (params?.quota_type && params.quota_type !== 'all') q.set('quota_type', params.quota_type);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.search) q.set('search', params.search);

      const res = await this.request<any[]>(`/api/v1/superadmin/quotas/overrides${q.toString() ? '?' + q.toString() : ''}`, { bypassCache: true });
      return res.data;
    },

    createQuotaOverride: async (data: { organization_name: string; quota_type: string; override_limit: string; valid_till?: string; reason?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/overrides', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    getQuotaUsageHistory: async (timeframe?: string): Promise<any> => {
      const q = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
      const res = await this.request<any>(`/api/v1/superadmin/quotas/history${q}`, { bypassCache: true });
      return res.data;
    },

    listQuotaAlerts: async (): Promise<{ alert_rules: any[]; notification_settings: any }> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/alerts', { bypassCache: true });
      return res.data;
    },

    createQuotaAlertRule: async (data: { rule_name: string; quota_type: string; threshold_percent: number; channels?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/alerts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    toggleQuotaAlertRule: async (alertId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/quotas/alerts/${encodeURIComponent(alertId)}/toggle`, {
        method: 'PATCH',
      });
      return res.data;
    },

    updateQuotaNotificationSettings: async (settings: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/quotas/notifications', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      return res.data;
    },

    // Developer Seats
    getSeatLimitsOverview: async (params?: { status?: string; plan?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
      if (params?.search) q.set('search', params.search);

      const res = await this.request<any>(`/api/v1/superadmin/seat-limits${q.toString() ? '?' + q.toString() : ''}`, { bypassCache: true });
      return res.data;
    },

    getSeatUsageAndAllocation: async (tenant?: string): Promise<any> => {
      const q = tenant ? `?tenant=${encodeURIComponent(tenant)}` : '';
      const res = await this.request<any>(`/api/v1/superadmin/seat-limits/usage${q}`, { bypassCache: true });
      return res.data;
    },

    getSeatPoliciesAndPlanDefaults: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/seat-limits/policies', { bypassCache: true });
      return res.data;
    },

    updateSeatPolicies: async (policies: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/seat-limits/policies', {
        method: 'PUT',
        body: JSON.stringify(policies),
      });
      return res.data;
    },

    listSeatOverrides: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/superadmin/seat-limits/overrides', { bypassCache: true });
      return res.data;
    },

    createSeatOverride: async (data: { organization_name: string; role: string; override_limit: number; valid_till_days?: number; reason?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/seat-limits/overrides', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    deleteSeatOverride: async (overrideId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/seat-limits/overrides/${encodeURIComponent(overrideId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    // Trials
    listTrials: async (params?: { status?: string; plan?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
      if (params?.search) q.set('search', params.search);

      const res = await this.request<any>(`/api/v1/superadmin/trials${q.toString() ? '?' + q.toString() : ''}`, { bypassCache: true });
      return res.data;
    },

    createTrial: async (data: { organization_name: string; plan_key?: string; duration_days?: number; auto_convert?: boolean; send_reminders?: boolean }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/trials', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    getTrialDetails: async (trialId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/trials/${encodeURIComponent(trialId)}`, { bypassCache: true });
      return res.data;
    },

    extendTrial: async (trialId: string, extensionDays: number = 14): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/trials/${encodeURIComponent(trialId)}/extend`, {
        method: 'POST',
        body: JSON.stringify({ extension_days: extensionDays }),
      });
      return res.data;
    },

    convertTrialToPaid: async (trialId: string, targetPlanKey: string = 'pro'): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/trials/${encodeURIComponent(trialId)}/convert`, {
        method: 'POST',
        body: JSON.stringify({ target_plan_key: targetPlanKey }),
      });
      return res.data;
    },

    cancelTrial: async (trialId: string, reason?: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/trials/${encodeURIComponent(trialId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return res.data;
    },

    getTrialHistory: async (params?: { timeframe?: string; plan?: string; search?: string }): Promise<any> => {
      const q = new URLSearchParams();
      if (params?.timeframe) q.set('timeframe', params.timeframe);
      if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
      if (params?.search) q.set('search', params.search);

      const res = await this.request<any>(`/api/v1/superadmin/trials/history${q.toString() ? '?' + q.toString() : ''}`, { bypassCache: true });
      return res.data;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLATFORM OPERATIONS & GOVERNANCE REALITY APIS
    // ─────────────────────────────────────────────────────────────────────────
    getAccessUsers: async (): Promise<{ summary: any; users: any[] }> => {
      const res = await this.request<any>('/api/v1/superadmin/access/users', { bypassCache: true });
      return res.data;
    },

    getInfrastructureStatus: async (): Promise<{ status: string; engines: any[]; persistence: any; background_workers: any }> => {
      const res = await this.request<any>('/api/v1/superadmin/infrastructure/status', { bypassCache: true });
      return res.data;
    },

    getBillingSummary: async (): Promise<{ mrr: number; total_organizations: number; active_subscriptions: number; gateway_status: string; invoices: any[] }> => {
      const res = await this.request<any>('/api/v1/superadmin/billing/summary', { bypassCache: true });
      return res.data;
    },

    getSecurityAuditEvents: async (limit: number = 50): Promise<{ total_retrieved: number; events: any[] }> => {
      const res = await this.request<any>(`/api/v1/superadmin/security/audit-events?limit=${limit}`, { bypassCache: true });
      return res.data;
    },

    getIntegrationsStatus: async (): Promise<{ integrations: any[] }> => {
      const res = await this.request<any>('/api/v1/superadmin/integrations/status', { bypassCache: true });
      return res.data;
    },

    getFeatureFlags: async (): Promise<{ flags: any[] }> => {
      const res = await this.request<any>('/api/v1/superadmin/flags', { bypassCache: true });
      return res.data;
    },

    toggleFeatureFlag: async (flagKey: string, isActive: boolean): Promise<any> => {
      const res = await this.request<any>(`/api/v1/superadmin/flags/${encodeURIComponent(flagKey)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
      this.invalidateCache('/api/v1/superadmin/flags');
      return res.data;
    },

    getInternalAccessRequests: async (): Promise<{ requests: any[] }> => {
      const res = await this.request<any>('/api/v1/superadmin/internal-access/requests', { bypassCache: true });
      return res.data;
    },

    requestBreakGlassAccess: async (data: { tenant_name: string; reason: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/superadmin/internal-access/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.invalidateCache('/api/v1/superadmin/internal-access/requests');
      return res.data;
    },
  };

  public dependencyScans = {
    getDashboard: async (params: { repository?: string; branch?: string; scan_type?: string; status?: string; search?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      if (params.scan_type) q.append('scan_type', params.scan_type);
      if (params.status) q.append('status', params.status);
      if (params.search) q.append('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/scans/dashboard${query}`, { ttlMs: 30000 });
      return res.data;
    },
    runScan: async (payload: { repository_name: string; branch?: string; scan_type?: string; engine?: string; depth?: string; fail_on?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/scans/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/scans');
      return res.data;
    },
    getDetail: async (jobId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/scans/${encodeURIComponent(jobId)}`);
      return res.data;
    },
    listSchedules: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/dependencies/scans/schedules/list', { ttlMs: 30000 });
      return res.data;
    },
    createSchedule: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/scans/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/scans/schedules');
      return res.data;
    },
    toggleSchedule: async (scheduleId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/scans/schedules/${encodeURIComponent(scheduleId)}/toggle`, {
        method: 'PATCH',
      });
      this.invalidateCache('/api/v1/dependencies/scans/schedules');
      return res.data;
    },
    deleteSchedule: async (scheduleId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/scans/schedules/${encodeURIComponent(scheduleId)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/dependencies/scans/schedules');
      return res.data;
    },
    getRepositories: async (): Promise<string[]> => {
      const res = await this.request<string[]>('/api/v1/dependencies/scans/repositories', { ttlMs: 30000 });
      return res.data || [];
    },
  };

  public dependencyReports = {
    getFilterOptions: async (): Promise<{ repositories: string[]; branches: string[]; timeframes: { id: string; label: string }[] }> => {
      const res = await this.request<any>('/api/v1/dependencies/reports/filter-options', { ttlMs: 30000 });
      return res.data || { repositories: [], branches: ['main'], timeframes: [] };
    },
    getOverview: async (params: { repository?: string; branch?: string; timeframe?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      if (params.timeframe) q.append('timeframe', params.timeframe);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/reports/overview${query}`, { ttlMs: 15000 });
      return res.data;
    },
    getVulnerabilities: async (params: { repository?: string; branch?: string; timeframe?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      if (params.timeframe) q.append('timeframe', params.timeframe);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/reports/vulnerabilities${query}`, { ttlMs: 15000 });
      return res.data;
    },
    getRemediation: async (params: { repository?: string; branch?: string; timeframe?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      if (params.timeframe) q.append('timeframe', params.timeframe);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/reports/remediation${query}`, { ttlMs: 15000 });
      return res.data;
    },
    getLicenses: async (params: { repository?: string; branch?: string; timeframe?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      if (params.timeframe) q.append('timeframe', params.timeframe);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/reports/licenses${query}`, { ttlMs: 15000 });
      return res.data;
    },
    getRepositories: async (params: { search?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/reports/repositories${query}`, { ttlMs: 15000 });
      return res.data;
    },
  };

  public dependencySettings = {
    getSettings: async (params: { repository?: string; branch?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.repository) q.append('repository', params.repository);
      if (params.branch) q.append('branch', params.branch);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/settings${query}`, { ttlMs: 10000 });
      return res.data;
    },
    updateSettings: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    resetSettings: async (repository?: string): Promise<any> => {
      const q = repository ? `?repository=${encodeURIComponent(repository)}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/settings/reset${q}`, {
        method: 'POST',
      });
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    getRegistries: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/dependencies/settings/registries', { ttlMs: 10000 });
      return res.data || [];
    },
    createRegistry: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/settings/registries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/settings/registries');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    testRegistry: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/registries/${encodeURIComponent(id)}/test`, {
        method: 'POST',
      });
      return res.data;
    },
    toggleRegistry: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/registries/${encodeURIComponent(id)}/toggle`, {
        method: 'PATCH',
      });
      this.invalidateCache('/api/v1/dependencies/settings/registries');
      return res.data;
    },
    deleteRegistry: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/registries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/dependencies/settings/registries');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    getScanners: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/dependencies/settings/scanners', { ttlMs: 10000 });
      return res.data || [];
    },
    updateScanner: async (scannerId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/scanners/${encodeURIComponent(scannerId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/settings/scanners');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    testScanner: async (scannerId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/scanners/${encodeURIComponent(scannerId)}/test`, {
        method: 'POST',
      });
      return res.data;
    },
    getAccessRules: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/dependencies/settings/access', { ttlMs: 10000 });
      return res.data || [];
    },
    createAccessRule: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/settings/access', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/settings/access');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    deleteAccessRule: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/access/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/dependencies/settings/access');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    getNotifications: async (): Promise<any[]> => {
      const res = await this.request<any[]>('/api/v1/dependencies/settings/notifications', { ttlMs: 10000 });
      return res.data || [];
    },
    createNotification: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/dependencies/settings/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/dependencies/settings/notifications');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    testNotification: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/notifications/${encodeURIComponent(id)}/test`, {
        method: 'POST',
      });
      return res.data;
    },
    deleteNotification: async (id: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/dependencies/settings/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/dependencies/settings/notifications');
      this.invalidateCache('/api/v1/dependencies/settings');
      return res.data;
    },
    getAuditLogs: async (params: { limit?: number; offset?: number; category?: string } = {}): Promise<any> => {
      const q = new URLSearchParams();
      if (params.limit) q.append('limit', String(params.limit));
      if (params.offset) q.append('offset', String(params.offset));
      if (params.category) q.append('category', params.category);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/dependencies/settings/audit${query}`, { ttlMs: 5000 });
      return res.data || { total: 0, logs: [] };
    },
  };

  public containerSecurity = {
    // Base Container Security
    summary: async (projectId?: string | null): Promise<ContainerSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ContainerSummaryResponse>(`/api/v1/containers/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    images: async (params: {
      projectId?: string | null;
      search?: string;
      registry?: string;
      status?: string;
      severity?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<ContainerImageListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.registry && params.registry !== 'All') q.append('registry', params.registry);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<ContainerImageListResponse>(`/api/v1/containers/images${query}`, { ttlMs: 5000 });
      return res.data;
    },
    imageDetail: async (imageId: string): Promise<ContainerImageDetailResponse> => {
      const res = await this.request<ContainerImageDetailResponse>(`/api/v1/containers/images/${encodeURIComponent(imageId)}`, { ttlMs: 10000 });
      return res.data;
    },
    registries: async (projectId?: string | null): Promise<ContainerRegistryListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ContainerRegistryListResponse>(`/api/v1/containers/registries${q}`, { ttlMs: 10000 });
      return res.data;
    },
    createRegistry: async (payload: any, projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/registries${q}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/registries');
      return res.data;
    },
    connectRegistry: async (regId: string, payload: any): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(regId)}/connect`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/registries');
      return res.data;
    },
    testRegistryConnection: async (regId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(regId)}/test`, {
        method: 'POST',
      });
      return res.data;
    },
    syncRegistry: async (regId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(regId)}/sync`, {
        method: 'POST',
      });
      this.invalidateCache('/api/v1/containers/registries');
      return res.data;
    },
    disconnectRegistry: async (regId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(regId)}/disconnect`, {
        method: 'POST',
      });
      this.invalidateCache('/api/v1/containers/registries');
      return res.data;
    },
    deleteRegistry: async (regId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/containers/registries/${encodeURIComponent(regId)}`, {
        method: 'DELETE',
      });
      this.invalidateCache('/api/v1/containers/registries');
      return res.data;
    },
    scan: async (payload: any): Promise<ContainerScanJobResponse> => {
      const res = await this.request<ContainerScanJobResponse>('/api/v1/containers/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    scanJob: async (jobId: string): Promise<ContainerScanJobResponse> => {
      const res = await this.request<ContainerScanJobResponse>(`/api/v1/containers/jobs/${encodeURIComponent(jobId)}`, { bypassCache: true });
      return res.data;
    },

    // Dockerfile Security
    dockerfilesSummary: async (projectId?: string | null): Promise<DockerfileSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<DockerfileSummaryResponse>(`/api/v1/containers/dockerfiles/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    dockerfilesCharts: async (projectId?: string | null): Promise<DockerfileChartDataResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<DockerfileChartDataResponse>(`/api/v1/containers/dockerfiles/charts${q}`, { ttlMs: 10000 });
      return res.data;
    },
    dockerfilesList: async (params: {
      projectId?: string | null;
      search?: string;
      repository?: string;
      severity?: string;
      build_type?: string;
      base_image?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<DockerfileListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.repository && params.repository !== 'All') q.append('repository', params.repository);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.build_type && params.build_type !== 'All') q.append('build_type', params.build_type);
      if (params.base_image && params.base_image !== 'All') q.append('base_image', params.base_image);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<DockerfileListResponse>(`/api/v1/containers/dockerfiles/list${query}`, { ttlMs: 5000 });
      return res.data;
    },
    dockerfilesFindings: async (params: {
      projectId?: string | null;
      dockerfileId?: string;
      severity?: string;
      category?: string;
    } = {}): Promise<DockerfileFindingDetail[]> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.dockerfileId) q.append('dockerfile_id', params.dockerfileId);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.category && params.category !== 'All') q.append('category', params.category);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<DockerfileFindingDetail[]>(`/api/v1/containers/dockerfiles/findings${query}`, { ttlMs: 5000 });
      return res.data;
    },
    dockerfilesRecommendations: async (projectId?: string | null): Promise<DockerfileRecommendationItem[]> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<DockerfileRecommendationItem[]>(`/api/v1/containers/dockerfiles/recommendations${q}`, { ttlMs: 10000 });
      return res.data;
    },
    scanDockerfile: async (payload: any): Promise<any> => {
      const res = await this.request<any>('/api/v1/containers/dockerfiles/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/dockerfiles');
      return res.data;
    },

    // Container Configuration & Hardening
    configurationSummary: async (projectId?: string | null): Promise<ContainerConfigSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ContainerConfigSummaryResponse>(`/api/v1/containers/configuration/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    configurationCharts: async (projectId?: string | null): Promise<ContainerConfigChartsResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ContainerConfigChartsResponse>(`/api/v1/containers/configuration/charts${q}`, { ttlMs: 10000 });
      return res.data;
    },
    configurationContainers: async (params: {
      projectId?: string | null;
      search?: string;
      cluster?: string;
      namespace?: string;
      status?: string;
      posture?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<ContainerConfigListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.cluster && params.cluster !== 'All') q.append('cluster', params.cluster);
      if (params.namespace && params.namespace !== 'All') q.append('namespace', params.namespace);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.posture && params.posture !== 'All') q.append('posture', params.posture);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<ContainerConfigListResponse>(`/api/v1/containers/configuration/containers${query}`, { ttlMs: 5000 });
      return res.data;
    },

    // Registry Integrations (Enhanced)
    registriesSummary: async (projectId?: string | null): Promise<RegistrySummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<RegistrySummaryResponse>(`/api/v1/containers/registries/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    registriesEnhanced: async (params: {
      projectId?: string | null;
      search?: string;
      provider?: string;
      status?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<RegistryEnhancedListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.provider && params.provider !== 'All') q.append('provider', params.provider);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.type && params.type !== 'All') q.append('type', params.type);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<RegistryEnhancedListResponse>(`/api/v1/containers/registries/enhanced${query}`, { ttlMs: 5000 });
      return res.data;
    },

    // ========================================================================
    // MODULE 07: IMAGE SCAN MANAGEMENT
    // ========================================================================
    imageScansSummary: async (projectId?: string | null): Promise<ImageScanSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ImageScanSummaryResponse>(`/api/v1/containers/scans/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    imageScansCharts: async (projectId?: string | null): Promise<ImageScanChartsResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ImageScanChartsResponse>(`/api/v1/containers/scans/charts${q}`, { ttlMs: 10000 });
      return res.data;
    },
    imageScansList: async (params: {
      projectId?: string | null;
      search?: string;
      registry?: string;
      scan_type?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<ImageScanListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.registry && params.registry !== 'All') q.append('registry', params.registry);
      if (params.scan_type && params.scan_type !== 'All') q.append('scan_type', params.scan_type);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<ImageScanListResponse>(`/api/v1/containers/scans/list${query}`, { ttlMs: 5000 });
      return res.data;
    },
    runImageScan: async (payload: RunNewScanRequest): Promise<ImageScanDetailResponse> => {
      const res = await this.request<ImageScanDetailResponse>('/api/v1/containers/scans/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/scans');
      return res.data;
    },
    imageScanDetail: async (scanId: string): Promise<ImageScanDetailResponse> => {
      const res = await this.request<ImageScanDetailResponse>(`/api/v1/containers/scans/${encodeURIComponent(scanId)}`, { ttlMs: 10000 });
      return res.data;
    },
    scanSchedules: async (projectId?: string | null): Promise<ScanScheduleListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<ScanScheduleListResponse>(`/api/v1/containers/scans/schedules${q}`, { ttlMs: 10000 });
      return res.data;
    },
    createScanSchedule: async (payload: CreateScheduleRequest): Promise<ScanScheduleItem> => {
      const res = await this.request<ScanScheduleItem>('/api/v1/containers/scans/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/scans/schedules');
      return res.data;
    },

    // ========================================================================
    // MODULE 08: KUBERNETES WORKLOADS
    // ========================================================================
    kubernetesOverview: async (projectId?: string | null): Promise<KubernetesOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<KubernetesOverviewResponse>(`/api/v1/containers/kubernetes/overview${q}`, { ttlMs: 5000 });
      return res.data;
    },
    topRiskyWorkloads: async (projectId?: string | null): Promise<TopRiskyWorkloadRow[]> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<TopRiskyWorkloadRow[]>(`/api/v1/containers/kubernetes/top-risky${q}`, { ttlMs: 5000 });
      return res.data;
    },
    kubernetesClustersSummary: async (projectId?: string | null): Promise<KubernetesClustersSummaryResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<KubernetesClustersSummaryResponse>(`/api/v1/containers/kubernetes/clusters/summary${q}`, { ttlMs: 5000 });
      return res.data;
    },
    kubernetesClusters: async (projectId?: string | null): Promise<KubernetesClusterListResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<KubernetesClusterListResponse>(`/api/v1/containers/kubernetes/clusters${q}`, { ttlMs: 10000 });
      return res.data;
    },
    kubernetesWorkloads: async (params: {
      projectId?: string | null;
      search?: string;
      cluster?: string;
      namespace?: string;
      status?: string;
      risk_level?: string;
      workload_type?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<KubernetesWorkloadListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.cluster && params.cluster !== 'All') q.append('cluster', params.cluster);
      if (params.namespace && params.namespace !== 'All') q.append('namespace', params.namespace);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.risk_level && params.risk_level !== 'All') q.append('risk_level', params.risk_level);
      if (params.workload_type && params.workload_type !== 'All') q.append('workload_type', params.workload_type);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<KubernetesWorkloadListResponse>(`/api/v1/containers/kubernetes/workloads${query}`, { ttlMs: 5000 });
      return res.data;
    },
    kubernetesWorkloadDetail: async (workloadId: string): Promise<KubernetesWorkloadDetailResponse> => {
      const res = await this.request<KubernetesWorkloadDetailResponse>(`/api/v1/containers/kubernetes/workloads/${encodeURIComponent(workloadId)}`, { ttlMs: 10000 });
      return res.data;
    },
    kubernetesFindings: async (params: {
      projectId?: string | null;
      severity?: string;
      category?: string;
      status?: string;
    } = {}): Promise<KubernetesFindingsListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.category && params.category !== 'All') q.append('category', params.category);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<KubernetesFindingsListResponse>(`/api/v1/containers/kubernetes/findings${query}`, { ttlMs: 5000 });
      return res.data;
    },

    // ========================================================================
    // MODULE 09: CONTAINER RUNTIME SECURITY
    // ========================================================================
    runtimeOverview: async (projectId?: string | null): Promise<RuntimeOverviewResponse> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<RuntimeOverviewResponse>(`/api/v1/containers/runtime/overview${q}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeAlerts: async (params: {
      projectId?: string | null;
      search?: string;
      status?: string;
      severity?: string;
      event_type?: string;
    } = {}): Promise<RuntimeAlertsListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.status && params.status !== 'All') q.append('status', params.status);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.event_type && params.event_type !== 'All') q.append('event_type', params.event_type);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<RuntimeAlertsListResponse>(`/api/v1/containers/runtime/alerts${query}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeEvents: async (params: {
      projectId?: string | null;
      search?: string;
      severity?: string;
      event_type?: string;
      workload?: string;
      namespace?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<RuntimeEventsListResponse> => {
      const q = new URLSearchParams();
      if (params.projectId) q.append('project_id', params.projectId);
      if (params.search) q.append('search', params.search);
      if (params.severity && params.severity !== 'All') q.append('severity', params.severity);
      if (params.event_type && params.event_type !== 'All') q.append('event_type', params.event_type);
      if (params.workload && params.workload !== 'All') q.append('workload', params.workload);
      if (params.namespace && params.namespace !== 'All') q.append('namespace', params.namespace);
      if (params.page) q.append('page', String(params.page));
      if (params.pageSize) q.append('page_size', String(params.pageSize));
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<RuntimeEventsListResponse>(`/api/v1/containers/runtime/events${query}`, { ttlMs: 5000 });
      return res.data;
    },
    runtimeEventDetail: async (eventId: string): Promise<RuntimeEventDetailResponse> => {
      const res = await this.request<RuntimeEventDetailResponse>(`/api/v1/containers/runtime/events/${encodeURIComponent(eventId)}`, { ttlMs: 10000 });
      return res.data;
    },
    runtimePolicies: async (projectId?: string | null, policyType?: string): Promise<RuntimePoliciesSummaryResponse> => {
      const q = new URLSearchParams();
      if (projectId) q.append('project_id', projectId);
      if (policyType && policyType !== 'All') q.append('policy_type', policyType);
      const query = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<RuntimePoliciesSummaryResponse>(`/api/v1/containers/runtime/policies${query}`, { ttlMs: 5000 });
      return res.data;
    },
    createRuntimePolicy: async (payload: CreateRuntimePolicyRequest): Promise<RuntimePolicyRow> => {
      const res = await this.request<RuntimePolicyRow>('/api/v1/containers/runtime/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.invalidateCache('/api/v1/containers/runtime/policies');
      return res.data;
    },
    vulnerabilityReachability: async (cveId: string, imageId?: string): Promise<{
      cve_id: string;
      target_file: string;
      step_indicator: string;
      is_reachable: boolean;
      status: string;
      reachability_label: string;
      call_chain: Array<{
        name: string;
        type: 'repository' | 'package';
        ecosystem?: string;
        version?: string;
        file?: string;
        usage_badge?: string;
        is_vulnerable?: boolean;
      }>;
      finding_age: string;
      reachability_evidence: string;
      resolution_advice: string;
    }> => {
      const q = imageId ? `?image_id=${encodeURIComponent(imageId)}` : '';
      const res = await this.request<any>(`/api/v1/containers/vulnerabilities/${encodeURIComponent(cveId)}/reachability${q}`, { ttlMs: 10000 });
      return res.data;
    },
  };

  // =========================================================================
  // KAVACH API SECURITY SUITE
  // =========================================================================
  public apiSecurity = {
    overview: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/api-security/overview${q}`);
      return res.data;
    },
    apis: async (params?: { projectId?: string | null; environment?: string; search?: string; limit?: number; offset?: number }): Promise<{ total: number; items: any[] }> => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.environment) q.set('environment', params.environment);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/api-security/apis${qs}`);
      return res.data;
    },
    importApi: async (payload: {
      name: string;
      version?: string;
      base_url: string;
      environment?: string;
      spec_type?: string;
      spec_content?: string;
      auth_type?: string;
      auth_config?: any;
      project_id?: string | null;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    getApi: async (apiId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}`);
      return res.data;
    },
    deleteApi: async (apiId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    getEndpoints: async (apiId: string, params?: { category?: string; method?: string; protocol?: string; lifecycle?: string; search?: string }): Promise<{ total: number; protocols?: Record<string, number>; lifecycle?: Record<string, number>; items: any[] }> => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.method) q.set('method', params.method);
      if (params?.protocol) q.set('protocol', params.protocol);
      if (params?.lifecycle) q.set('lifecycle', params.lifecycle);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/endpoints${qs}`);
      return res.data;
    },
    getZombieAnalysis: async (apiId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/zombie-analysis`);
      return res.data;
    },
    getAiAnalysis: async (apiId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/ai-analysis`);
      return res.data;
    },
    previewTestPlan: async (apiId: string, payload: {
      name?: string;
      selected_categories?: string[];
      configurations?: any;
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/test-plans/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    validateTarget: async (payload: { base_url: string; environment?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/apis/validate-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    createTestPlan: async (apiId: string, payload: {
      name?: string;
      selected_categories?: string[];
      configurations?: any;
      schedule?: string;
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/test-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    startScan: async (payload: { api_id: string; plan_id?: string; scan_config?: any }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 120000,
      });
      return res.data;
    },
    getScan: async (scanId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/scans/${encodeURIComponent(scanId)}`);
      return res.data;
    },
    stopScan: async (scanId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/scans/${encodeURIComponent(scanId)}/stop`, {
        method: 'POST',
      });
      return res.data;
    },
    rerunScan: async (scanId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/scans/${encodeURIComponent(scanId)}/rerun`, {
        method: 'POST',
      });
      return res.data;
    },
    getScanResults: async (scanId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/scans/${encodeURIComponent(scanId)}/results`);
      return res.data;
    },
    findings: async (params?: { apiId?: string; category?: string; severity?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<{ total: number; items: any[] }> => {
      const q = new URLSearchParams();
      if (params?.apiId) q.set('api_id', params.apiId);
      if (params?.category) q.set('category', params.category);
      if (params?.severity) q.set('severity', params.severity);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/api-security/findings${qs}`);
      return res.data;
    },
    getFinding: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/findings/${encodeURIComponent(findingId)}`);
      return res.data;
    },
    updateFindingStatus: async (findingId: string, status: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/findings/${encodeURIComponent(findingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.data;
    },
    attackPaths: async (apiId?: string): Promise<{ total: number; items: any[] }> => {
      const q = apiId ? `?api_id=${encodeURIComponent(apiId)}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/api-security/attack-paths${q}`);
      return res.data;
    },
    analystChat: async (payload: { prompt: string; api_id?: string; history?: any[] }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 60000,
      });
      return res.data;
    },
    generateReport: async (payload: { api_id: string; scan_id?: string; format?: string; include_sections?: string[] }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 90000,
      });
      return res.data;
    },
    listReports: async (apiId?: string): Promise<{ total: number; items: any[] }> => {
      const q = apiId ? `?api_id=${encodeURIComponent(apiId)}` : '';
      const res = await this.request<{ total: number; items: any[] }>(`/api/v1/api-security/reports${q}`);
      return res.data;
    },
    listIntegrations: async (): Promise<{ items: any[] }> => {
      const res = await this.request<{ items: any[] }>('/api/v1/api-security/integrations');
      return res.data;
    },
    connectIntegration: async (payload: { provider: string; token?: string; account_name?: string; instance_url?: string; webhook_url?: string; api_token?: string; channel?: string; secret?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    disconnectIntegration: async (payload: { provider: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    scanCode: async (payload: { files: Record<string, string>; name?: string; project_id?: string | null; branch?: string }): Promise<any> => {
      const res = await this.request<any>('/api/v1/api-security/code/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 180000,
      });
      return res.data;
    },
    analyzeRepository: async (repositoryId: string, branch?: string, repoData?: any): Promise<any> => {
      const q = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await this.request<any>(`/api/v1/api-security/repositories/${encodeURIComponent(repositoryId)}/analyze${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoData || {}),
        timeoutMs: 180000,
      });
      return res.data;
    },
    getDualInventoryCoverage: async (apiId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/coverage`, {
        timeoutMs: 30000,
      });
      return res.data;
    },
    applyFindingFix: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/findings/${encodeURIComponent(findingId)}/apply-fix`, {
        method: 'POST',
        timeoutMs: 120000,
      });
      return res.data;
    },
    verifyFindingFix: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/findings/${encodeURIComponent(findingId)}/verify-fix`, {
        method: 'POST',
        timeoutMs: 120000,
      });
      return res.data;
    },
    createFindingPr: async (findingId: string, payload?: { repo_name?: string; branch?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    crawlGraphqlSchema: async (apiId: string, payload?: { endpoint_url?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/graphql/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    fuzzWebsocket: async (apiId: string, payload?: { ws_url?: string; custom_origin?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/websocket/fuzz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    fuzzGrpc: async (apiId: string, payload?: { service?: string; method?: string }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/grpc/fuzz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    ingestRuntimeTraffic: async (apiId: string, payload?: { traffic_dumps?: any[] }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/traffic/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    runInteractiveSecurityTest: async (apiId: string, testType: string, payload?: { endpoint?: string; [key: string]: any }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/api-security/apis/${encodeURIComponent(apiId)}/tests/interactive/${encodeURIComponent(testType)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return res.data;
    },
    getPolicies: async (apiId?: string): Promise<{ status: string; policies: any[] }> => {
      const q = apiId ? `?api_id=${encodeURIComponent(apiId)}` : '';
      const res = await this.request<{ status: string; policies: any[] }>(`/api/v1/api-security/policies${q}`);
      return res.data;
    },
    savePolicies: async (policies: any[], apiId?: string): Promise<{ status: string; message: string; policies: any[] }> => {
      const res = await this.request<{ status: string; message: string; policies: any[] }>('/api/v1/api-security/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies, api_id: apiId }),
      });
      return res.data;
    },
  };


  assistant = {
    getOverview: async (projectId?: string | null, workspaceId?: string | null): Promise<any> => {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (workspaceId) params.set('workspace_id', workspaceId);
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await this.request<any>(`/api/v1/assistant/overview${q}`, { timeoutMs: 45000 });
      return res.data;
    },
    getLandingOverview: async (projectId?: string | null, workspaceId?: string | null): Promise<any> => {
      return this.assistant.getOverview(projectId, workspaceId);
    },
    chat: async (payload: {
      message: string;
      conversation_id?: string | null;
      project_id?: string | null;
      workspace_id?: string | null;
      repositories?: string[];
      branch?: string;
      attachments?: any[];
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 180000,
      });
      return res.data;
    },
    quickAction: async (payload: {
      action_key: string;
      project_id?: string | null;
      workspace_id?: string | null;
      repositories?: string[];
      branch?: string;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/quick-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 180000,
      });
      return res.data;
    },
    approveAction: async (actionId: string): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId }),
        timeoutMs: 60000,
      });
      return res.data;
    },
    listConversations: async (): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/conversations', { timeoutMs: 30000 });
      return res.data;
    },
    getConversation: async (conversationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/assistant/conversations/${encodeURIComponent(conversationId)}`, { timeoutMs: 30000 });
      return res.data;
    },
    deleteConversation: async (conversationId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/assistant/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'DELETE',
        timeoutMs: 30000,
      });
      return res.data;
    },
    triggerScan: async (payload: {
      project_id?: string | null;
      workspace_id?: string | null;
      repositories?: string[];
      branch?: string;
      modules?: string[];
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/scan/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 120000,
      });
      return res.data;
    },
    addRepoByUrl: async (url: string, projectId?: string | null): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/repositories/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, project_id: projectId || null }),
        timeoutMs: 45000,
      });
      return res.data;
    },
    getFindingDetail: async (findingId: string): Promise<any> => {
      const res = await this.request<any>(`/api/v1/assistant/findings/${encodeURIComponent(findingId)}`, { timeoutMs: 30000 });
      return res.data;
    },
    createPR: async (findingId: string, payload?: {
      repository?: string;
      branch?: string;
      title?: string;
      reviewers?: string[];
      labels?: string[];
    }): Promise<any> => {
      const res = await this.request<any>(`/api/v1/assistant/findings/${encodeURIComponent(findingId)}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        timeoutMs: 90000,
      });
      return res.data;
    },
    getLiveAgents: async (projectId?: string | null): Promise<any> => {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await this.request<any>(`/api/v1/assistant/agents/live${q}`);
      return res.data;
    },
    downloadReport: async (projectId?: string | null, repository?: string, branch?: string, format: string = 'pdf'): Promise<any> => {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (repository) params.set('repository', repository);
      if (branch) params.set('branch', branch);
      params.set('format', format);
      const token = getAuthToken();
      if (token) params.set('token', token);
      const res = await this.request<any>(`/api/v1/assistant/reports/download?${params.toString()}`);
      return res.data;
    },
    getReportDownloadUrl: (projectId?: string | null, repository?: string, branch?: string, format: string = 'pdf'): string => {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      if (repository) params.set('repository', repository);
      if (branch) params.set('branch', branch);
      params.set('format', format);
      const token = getAuthToken();
      if (token) params.set('token', token);
      return `/api/v1/assistant/reports/download?${params.toString()}`;
    },
    connectIntegration: async (
      payloadOrProvider:
        | string
        | {
            provider: string;
            workspace_name?: string;
            project_id?: string | null;
            [key: string]: any;
          },
      options?: {
        workspace_name?: string;
        project_id?: string | null;
        [key: string]: any;
      }
    ): Promise<any> => {
      const body =
        typeof payloadOrProvider === 'string'
          ? { provider: payloadOrProvider, ...(options || {}) }
          : payloadOrProvider;
      const res = await this.request<any>('/api/v1/assistant/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 60000,
      });
      return res.data;
    },
    createAndEnforcePolicy: async (payload: {
      policy_name?: string;
      enforcement_scope?: string;
      project_id?: string | null;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/policies/create-and-enforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 60000,
      });
      return res.data;
    },
    inviteMember: async (payload: {
      email: string;
      role?: string;
      project_id?: string | null;
    }): Promise<any> => {
      const res = await this.request<any>('/api/v1/assistant/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 60000,
      });
      return res.data;
    },
  };
}

export const api = new ThingApiClient();
export default api;



