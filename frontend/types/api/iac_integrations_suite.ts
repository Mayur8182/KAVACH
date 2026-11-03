/**
 * TypeScript interfaces for IaC Security Integrations Suite — Section 14 (Screens 14.1 through 14.8)
 */

// ============================================================================
// 14.1 Integrations Overview
// ============================================================================

export interface IntegrationOverviewKpis {
  total_integrations: number;
  connected: number;
  disconnected: number;
  failed: number;
  not_configured: number;
}

export interface IntegrationStatusBreakdown {
  connected: number;
  disconnected: number;
  failed: number;
  not_configured: number;
}

export interface PopularIntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'Connected' | 'Disconnected' | 'Failed' | 'Not Configured' | string;
  icon: string;
}

export interface IntegrationsOverviewResponse {
  repository: string;
  kpis: IntegrationOverviewKpis;
  status_breakdown: IntegrationStatusBreakdown;
  popular_integrations: PopularIntegrationItem[];
}

// ============================================================================
// 14.2 Connected Integrations
// ============================================================================

export interface ConnectedIntegrationItem {
  id: string;
  name: string;
  type: string;
  status: 'Connected' | 'Disconnected' | 'Not Configured' | string;
  last_sync: string;
  icon: string;
  details?: Record<string, any>;
}

export interface ConnectedIntegrationsResponse {
  items: ConnectedIntegrationItem[];
  total: number;
  available_types: string[];
}

// ============================================================================
// 14.3 Add Integration (Catalog)
// ============================================================================

export interface AvailableIntegrationCard {
  id: string;
  name: string;
  category: string;
  subtext: string;
  icon: string;
  is_connected: boolean;
}

export interface AvailableIntegrationsResponse {
  items: AvailableIntegrationCard[];
  categories: string[];
}

export interface ConnectIntegrationRequest {
  integration_id: string;
  auth_type?: string;
  credentials?: Record<string, string>;
}

export interface ConnectIntegrationResponse {
  success: boolean;
  message: string;
  integration_id: string;
}

// ============================================================================
// 14.4 Integration Detail (GitHub)
// ============================================================================

export interface IntegrationConnectionDetails {
  status: string;
  connected_on: string;
  connected_by: string;
  app_type: string;
  permissions: string;
}

export interface IntegrationRepoSelection {
  mode: 'all' | 'select' | 'org' | string;
  selected_repos: string[];
}

export interface IntegrationSyncSettings {
  auto_sync_new_repos: boolean;
  scan_pull_requests: boolean;
  scan_default_branch: boolean;
}

export interface IntegrationDetailResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  connection_details: IntegrationConnectionDetails;
  repo_selection: IntegrationRepoSelection;
  sync_settings: IntegrationSyncSettings;
}

export interface UpdateIntegrationDetailRequest {
  repo_selection?: IntegrationRepoSelection;
  sync_settings?: IntegrationSyncSettings;
}

// ============================================================================
// 14.5 Repositories
// ============================================================================

export interface IntegrationRepositoryItem {
  id: string;
  name: string;
  visibility: 'Public' | 'Private' | string;
  scan_status: 'Enabled' | 'Disabled' | 'Not Configured' | string;
  last_scanned: string;
}

export interface IntegrationRepositoriesResponse {
  items: IntegrationRepositoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_statuses: string[];
  available_visibilities: string[];
}

export interface ToggleRepoScanStatusRequest {
  scan_status: 'Enabled' | 'Disabled' | string;
}

// ============================================================================
// 14.6 Webhooks
// ============================================================================

export interface IntegrationWebhookItem {
  id: string;
  webhook_url: string;
  status: 'Active' | 'Inactive' | 'Failed' | string;
  events: string;
  created_at: string;
}

export interface WebhookEventsConfig {
  push_events: boolean;
  pull_request_events: boolean;
  merge_events: boolean;
  release_events: boolean;
  tag_events: boolean;
}

export interface IntegrationWebhooksResponse {
  webhooks: IntegrationWebhookItem[];
  events_config: WebhookEventsConfig;
}

export interface UpdateWebhookConfigRequest {
  events_config: WebhookEventsConfig;
}

export interface CreateWebhookRequest {
  webhook_url: string;
  events?: string;
}

export interface TestWebhookResponse {
  success: boolean;
  status_code: number;
  latency_ms: number;
  message: string;
}

// ============================================================================
// 14.7 Scan Settings (Integration Level)
// ============================================================================

export interface IntegrationScanConfig {
  scan_on_push: boolean;
  scan_on_pr: boolean;
  scan_on_merge: boolean;
}

export interface IntegrationFileFilters {
  include_paths: string[];
  exclude_paths: string[];
}

export interface IntegrationScannerOptions {
  iac_scanner: string;
  policy_pack: string;
  severity_threshold: string;
}

export interface IntegrationScanSettingsDTO {
  scan_config: IntegrationScanConfig;
  file_filters: IntegrationFileFilters;
  scanner_options: IntegrationScannerOptions;
}

// ============================================================================
// 14.8 Sync Logs
// ============================================================================

export interface IntegrationSyncLogItem {
  id: string;
  time: string;
  event: string;
  status: 'Success' | 'Failed' | string;
  message: string;
}

export interface IntegrationSyncLogsResponse {
  items: IntegrationSyncLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_events: string[];
}

export interface TriggerSyncResponse {
  success: boolean;
  message: string;
  synced_at: string;
}
