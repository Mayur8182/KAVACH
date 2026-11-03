/**
 * Centralized Integration Management System (CIMS) Types
 * Single authoritative type definitions for Kavach platform integrations.
 */

export type ProviderCategory = 'scm' | 'cloud' | 'cicd' | 'registry' | 'alerts';

export interface ProviderCatalogItem {
  provider: string;
  name: string;
  category: ProviderCategory;
  category_label: string;
  description: string;
  connected: boolean;
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR' | 'SYNCING';
  health: 'HEALTHY' | 'DEGRADED' | 'NOT_CONFIGURED' | 'SYNCING';
  connection_id?: string | null;
  account_name?: string | null;
  organization_name?: string | null;
  last_synced_at?: string | null;
  resources_count: number;
  supported_capabilities: string[];
  config_fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    placeholder: string;
    options?: string[];
  }>;
}

export interface CentralResourceCapabilityItem {
  id: string;
  connection_id: string;
  resource_type: 'repository' | 'cloud_account' | 'pipeline' | 'cluster';
  name: string;
  external_id: string;
  full_name: string;
  url?: string | null;
  default_branch?: string;
  private: boolean;
  capabilities: Record<string, string>; // e.g. { sast: 'ENABLED', sca: 'ENABLED', iac: 'ENABLED', secrets: 'ENABLED', container: 'ENABLED' }
  scan_on_push: boolean;
  scan_on_pr: boolean;
  last_scan_status?: string;
  last_scan_at?: string | null;
}

export interface UpdateCapabilitiesPayload {
  resource_id: string;
  capabilities: Record<string, string>;
  scan_on_push?: boolean;
  scan_on_pr?: boolean;
}

export interface CentralConnectPayload {
  provider: string;
  account_name?: string;
  organization_name?: string;
  token?: string;
  role_arn?: string;
  external_id?: string;
  client_id?: string;
  client_secret?: string;
  tenant_id?: string;
  project_id?: string;
  instance_url?: string;
  webhook_url?: string;
  channel?: string;
  jira_domain?: string;
  user_email?: string;
  scopes?: string[];
  credentials?: Record<string, any>;
}

export interface IntegrationHealthResponse {
  connection_id: string;
  provider: string;
  status: string;
  healthy: boolean;
  latency_ms: number;
  last_checked_at: string;
  message: string;
  permissions: string[];
  resource_count: number;
}
