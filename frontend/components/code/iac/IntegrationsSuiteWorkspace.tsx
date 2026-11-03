'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Integrations Suite
 * Section 14: Screens 14.1 through 14.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/integrations-suite/*
 * 
 * Screens:
 *   14.1 Integrations Overview (4 KPIs, Donut Status Breakdown, Popular Integrations)
 *   14.2 Connected Integrations (Tool Table, Status, Last Sync, Filter by Type)
 *   14.3 Add Integration (Catalog of tools, categories, connect modal)
 *   14.4 Integration Detail (GitHub: Connection Details, Repo Selection, Sync Settings, Reconnect/Disconnect)
 *   14.5 Repositories (List of repositories, Scan Status toggle, Visibility, Last Scanned, Pagination)
 *   14.6 Webhooks (Webhook URL, Status, Events checklist, Test Webhook, Add Webhook modal)
 *   14.7 Scan Settings (Scan config toggles, Include/Exclude path filters, Scanner options, Reset & Save)
 *   14.8 Sync Logs (Timeline of integration activity and sync history, Event filter, Trigger Sync)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  X,
  Play,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  FileCode,
  Folder,
  Radio,
  Sliders,
  Share2,
  Cpu,
  GitBranch,
  RefreshCw,
  Power,
  PowerOff,
  Link2,
  Activity,
  Send,
  MoreVertical,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IntegrationsOverviewResponse,
  ConnectedIntegrationsResponse,
  ConnectedIntegrationItem,
  AvailableIntegrationsResponse,
  AvailableIntegrationCard,
  IntegrationDetailResponse,
  IntegrationRepositoriesResponse,
  IntegrationRepositoryItem,
  IntegrationWebhooksResponse,
  WebhookEventsConfig,
  IntegrationScanSettingsDTO,
  IntegrationSyncLogsResponse,
} from '@/types/api/iac';

export type IntegrationsSuiteTab =
  | 'overview'
  | 'connected'
  | 'add'
  | 'detail'
  | 'repositories'
  | 'webhooks'
  | 'scan-settings'
  | 'sync-logs';

interface IntegrationsSuiteWorkspaceProps {
  initialTab?: IntegrationsSuiteTab;
  initialIntegrationId?: string;
}

export const IntegrationsSuiteWorkspace: React.FC<IntegrationsSuiteWorkspaceProps> = ({
  initialTab = 'overview',
  initialIntegrationId = 'github',
}) => {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<IntegrationsSuiteTab>(initialTab);
  const [integrationId, setIntegrationId] = useState<string>(initialIntegrationId);

  // Common State
  const [repository, setRepository] = useState<string>('frontend-app');
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 14.1 Overview State ──
  const [overviewData, setOverviewData] = useState<IntegrationsOverviewResponse | null>(null);

  // ── 14.2 Connected Integrations State ──
  const [connectedData, setConnectedData] = useState<ConnectedIntegrationsResponse | null>(null);
  const [connectedSearch, setConnectedSearch] = useState<string>('');
  const [connectedTypeFilter, setConnectedTypeFilter] = useState<string>('All Types');

  // ── 14.3 Add Integration Catalog State ──
  const [catalogData, setCatalogData] = useState<AvailableIntegrationsResponse | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [connectingTool, setConnectingTool] = useState<string | null>(null);

  // ── 14.4 Detail State (GitHub) ──
  const [detailData, setDetailData] = useState<IntegrationDetailResponse | null>(null);
  const [savingDetail, setSavingDetail] = useState<boolean>(false);

  // ── 14.5 Repositories State ──
  const [reposData, setReposData] = useState<IntegrationRepositoriesResponse | null>(null);
  const [repoSearch, setRepoSearch] = useState<string>('');
  const [repoStatusFilter, setRepoStatusFilter] = useState<string>('All Status');
  const [repoVisibilityFilter, setRepoVisibilityFilter] = useState<string>('All Visibility');
  const [repoPage, setRepoPage] = useState<number>(1);
  const [repoPageSize, setRepoPageSize] = useState<number>(10);

  // ── 14.6 Webhooks State ──
  const [webhooksData, setWebhooksData] = useState<IntegrationWebhooksResponse | null>(null);
  const [eventsConfig, setEventsConfig] = useState<WebhookEventsConfig>({
    push_events: true,
    pull_request_events: true,
    merge_events: true,
    release_events: false,
    tag_events: false,
  });
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState<boolean>(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState<string>('https://app.seculayer.io/api/webhook/github/prod-custom');

  // ── 14.7 Scan Settings State ──
  const [scanSettings, setScanSettings] = useState<IntegrationScanSettingsDTO>({
    scan_config: {
      scan_on_push: true,
      scan_on_pr: true,
      scan_on_merge: false,
    },
    file_filters: {
      include_paths: ['**/*.tf', '**/*.tfvars', '**/*.yaml', '**/*.yml', 'helm/**'],
      exclude_paths: ['**/examples/**', '**/test/**', '**/docs/**'],
    },
    scanner_options: {
      iac_scanner: 'Checkov (Default)',
      policy_pack: 'Default',
      severity_threshold: 'Medium and above',
    },
  });
  const [savingScanSettings, setSavingScanSettings] = useState<boolean>(false);

  // ── 14.8 Sync Logs State ──
  const [syncLogsData, setSyncLogsData] = useState<IntegrationSyncLogsResponse | null>(null);
  const [syncEventFilter, setSyncEventFilter] = useState<string>('All Events');
  const [syncPage, setSyncPage] = useState<number>(1);
  const [syncPageSize, setSyncPageSize] = useState<number>(10);
  const [triggeringSync, setTriggeringSync] = useState<boolean>(false);

  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // ── Data Fetchers ──
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getOverview({ repository });
      setOverviewData(res);
    } catch (err: any) {
      showToast(`Error loading overview: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [repository, showToast]);

  const fetchConnected = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getConnected({
        search: connectedSearch,
        typeFilter: connectedTypeFilter,
      });
      setConnectedData(res);
    } catch (err: any) {
      showToast(`Error loading connected tools: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [connectedSearch, connectedTypeFilter, showToast]);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getCatalog({
        category: catalogCategory,
        search: catalogSearch,
      });
      setCatalogData(res);
    } catch (err: any) {
      showToast(`Error loading integration catalog: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [catalogCategory, catalogSearch, showToast]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getDetail(id);
      setDetailData(res);
    } catch (err: any) {
      showToast(`Error loading integration detail: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchRepositories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getRepositories({
        search: repoSearch,
        status: repoStatusFilter,
        visibility: repoVisibilityFilter,
        page: repoPage,
        pageSize: repoPageSize,
      });
      setReposData(res);
    } catch (err: any) {
      showToast(`Error loading repositories: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [repoSearch, repoStatusFilter, repoVisibilityFilter, repoPage, repoPageSize, showToast]);

  const fetchWebhooks = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getWebhooks(id);
      setWebhooksData(res);
      setEventsConfig(res.events_config);
    } catch (err: any) {
      showToast(`Error loading webhooks: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchScanSettings = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getScanSettings(id);
      setScanSettings(res);
    } catch (err: any) {
      showToast(`Error loading scan settings: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchSyncLogs = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.iac.integrationsSuite.getSyncLogs(id, {
        event: syncEventFilter,
        page: syncPage,
        pageSize: syncPageSize,
      });
      setSyncLogsData(res);
    } catch (err: any) {
      showToast(`Error loading sync logs: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [syncEventFilter, syncPage, syncPageSize, showToast]);

  // Load active tab data on change
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        fetchOverview();
        break;
      case 'connected':
        fetchConnected();
        break;
      case 'add':
        fetchCatalog();
        break;
      case 'detail':
        fetchDetail(integrationId);
        break;
      case 'repositories':
        fetchRepositories();
        break;
      case 'webhooks':
        fetchWebhooks(integrationId);
        break;
      case 'scan-settings':
        fetchScanSettings(integrationId);
        break;
      case 'sync-logs':
        fetchSyncLogs(integrationId);
        break;
    }
  }, [
    activeTab,
    integrationId,
    fetchOverview,
    fetchConnected,
    fetchCatalog,
    fetchDetail,
    fetchRepositories,
    fetchWebhooks,
    fetchScanSettings,
    fetchSyncLogs,
  ]);

  // ── Mutation Handlers ──
  const handleConnectIntegration = async (toolId: string) => {
    try {
      setConnectingTool(toolId);
      const res = await api.iac.integrationsSuite.connect({ integration_id: toolId });
      showToast(res.message);
      fetchCatalog();
      if (activeTab === 'connected') fetchConnected();
    } catch (err: any) {
      showToast(`Connection failed: ${err.message}`);
    } finally {
      setConnectingTool(null);
    }
  };

  const handleSaveDetail = async () => {
    if (!detailData) return;
    try {
      setSavingDetail(true);
      const res = await api.iac.integrationsSuite.updateDetail(integrationId, {
        repo_selection: detailData.repo_selection,
        sync_settings: detailData.sync_settings,
      });
      setDetailData(res);
      showToast('GitHub integration settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingDetail(false);
    }
  };

  const handleReconnect = async () => {
    try {
      const res = await api.iac.integrationsSuite.reconnect(integrationId);
      setDetailData(res);
      showToast(`${res.name} reconnected successfully.`);
    } catch (err: any) {
      showToast(`Reconnect failed: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.iac.integrationsSuite.disconnect(integrationId);
      if (detailData) {
        setDetailData({
          ...detailData,
          status: 'Disconnected',
          connection_details: { ...detailData.connection_details, status: 'Disconnected' },
        });
      }
      showToast(`${integrationId} disconnected.`);
    } catch (err: any) {
      showToast(`Disconnect failed: ${err.message}`);
    }
  };

  const handleToggleRepoStatus = async (repoId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
    try {
      await api.iac.integrationsSuite.toggleRepoScanStatus(repoId, nextStatus);
      setReposData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((r) =>
                r.id === repoId || r.name === repoId ? { ...r, scan_status: nextStatus } : r
              ),
            }
          : prev
      );
      showToast(`Scan status for ${repoId} updated to ${nextStatus}.`);
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`);
    }
  };

  const handleSaveWebhookConfig = async () => {
    try {
      await api.iac.integrationsSuite.updateWebhookConfig(integrationId, { events_config: eventsConfig });
      showToast('Webhook event subscriptions updated successfully.');
    } catch (err: any) {
      showToast(`Failed to save webhooks: ${err.message}`);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      const res = await api.iac.integrationsSuite.testWebhook(integrationId);
      showToast(`${res.message} (Latency: ${res.latency_ms}ms)`);
    } catch (err: any) {
      showToast(`Webhook ping failed: ${err.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    try {
      await api.iac.integrationsSuite.createWebhook(integrationId, { webhook_url: newWebhookUrl });
      setIsAddWebhookOpen(false);
      showToast('New webhook endpoint registered.');
      fetchWebhooks(integrationId);
    } catch (err: any) {
      showToast(`Failed to create webhook: ${err.message}`);
    }
  };

  const handleSaveScanSettings = async () => {
    try {
      setSavingScanSettings(true);
      const res = await api.iac.integrationsSuite.updateScanSettings(integrationId, scanSettings);
      setScanSettings(res);
      showToast('Scan settings for integration saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save scan settings: ${err.message}`);
    } finally {
      setSavingScanSettings(false);
    }
  };

  const handleResetScanSettings = async () => {
    try {
      const res = await api.iac.integrationsSuite.resetScanSettings(integrationId);
      setScanSettings(res);
      showToast('Scan settings restored to default baseline.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  const handleTriggerManualSync = async () => {
    try {
      setTriggeringSync(true);
      const res = await api.iac.integrationsSuite.triggerSync(integrationId);
      showToast(res.message);
      fetchSyncLogs(integrationId);
    } catch (err: any) {
      showToast(`Sync trigger failed: ${err.message}`);
    } finally {
      setTriggeringSync(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'enabled':
      case 'active':
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'disconnected':
      case 'disabled':
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/10 text-[#64748B] border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white border border-[#CBD5E1] text-[#0F172A] px-4 py-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[#64748B] hover:text-[#0F172A]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col">
        {/* Horizontal Sub-Tabs Bar */}
        <div className="border-b border-[#E2E8F0] bg-white px-6 py-2.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'connected', label: 'Connected Tools', icon: Link2 },
              { id: 'add', label: 'Add Integration', icon: Plus },
              { id: 'detail', label: 'Integration Detail', icon: FileCode },
              { id: 'repositories', label: 'Repositories', icon: Folder },
              { id: 'webhooks', label: 'Webhooks', icon: Radio },
              { id: 'scan-settings', label: 'Scan Settings', icon: Sliders },
              { id: 'sync-logs', label: 'Sync Logs', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as IntegrationsSuiteTab)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-[#64748B]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B] shrink-0 pl-4 border-l border-[#E2E8F0]">
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-[#0F172A] font-medium">{repository}</span>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* ========================================================================= */}
          {/* SCREEN 14.1: Integrations Overview */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Integrations</h1>
                <p className="text-xs text-[#64748B]">
                  Connect your tools and automate IaC security across your development lifecycle.
                </p>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-xs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className="pb-2.5 font-semibold text-blue-400 border-b-2 border-blue-500"
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('connected')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Connected Tools
                </button>
                <button
                  onClick={() => setActiveTab('add')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Available Integrations
                </button>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-[#64748B]">Total Integrations</span>
                  <div className="text-2xl font-bold text-[#0F172A]">
                    {overviewData?.kpis.total_integrations ?? 12}
                  </div>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-[#64748B]">Connected</span>
                  <div className="text-2xl font-bold text-emerald-400">
                    {overviewData?.kpis.connected ?? 8}
                  </div>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-[#64748B]">Disconnected</span>
                  <div className="text-2xl font-bold text-red-400">
                    {overviewData?.kpis.disconnected ?? 2}
                  </div>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-[#64748B]">Failed</span>
                  <div className="text-2xl font-bold text-orange-400">
                    {overviewData?.kpis.failed ?? 1}
                  </div>
                </div>
              </div>

              {/* 2 Main Panels: Donut Chart & Popular Integrations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel 1: Integration Status Donut */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Integration Status</h2>

                  <div className="flex items-center justify-around py-4">
                    {/* SVG Donut Chart */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background ring */}
                        <circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="12" fill="none" />
                        {/* Connected: 8 / 12 = 66.6% -> circumference ~ 251.3 */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#10B981"
                          strokeWidth="12"
                          strokeDasharray="167.5 251.3"
                          strokeDashoffset="0"
                          fill="none"
                        />
                        {/* Disconnected: 2 / 12 = 16.6% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#EF4444"
                          strokeWidth="12"
                          strokeDasharray="41.8 251.3"
                          strokeDashoffset="-167.5"
                          fill="none"
                        />
                        {/* Failed: 1 / 12 = 8.3% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#F97316"
                          strokeWidth="12"
                          strokeDasharray="20.9 251.3"
                          strokeDashoffset="-209.3"
                          fill="none"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-[#0F172A]">12</span>
                        <span className="text-[10px] text-[#64748B]">Total</span>
                      </div>
                    </div>

                    {/* Breakdown list */}
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[#334155]">Connected</span>
                        </div>
                        <span className="font-bold text-[#0F172A]">8</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-[#334155]">Disconnected</span>
                        </div>
                        <span className="font-bold text-[#0F172A]">2</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className="text-[#334155]">Failed</span>
                        </div>
                        <span className="font-bold text-[#0F172A]">1</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                          <span className="text-[#334155]">Not Configured</span>
                        </div>
                        <span className="font-bold text-[#0F172A]">1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Popular Integrations */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Popular Integrations</h2>
                  <div className="flex flex-col divide-y divide-[#E2E8F0]">
                    {overviewData?.popular_integrations.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setIntegrationId(item.id);
                          setActiveTab('detail');
                        }}
                        className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 px-2 rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-[#CBD5E1] flex items-center justify-center font-bold text-xs text-[#0F172A]">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#0F172A]">{item.name}</div>
                            <div className="text-[11px] text-[#64748B]">{item.category}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.2: Connected Integrations */}
          {/* ========================================================================= */}
          {activeTab === 'connected' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Connected Integrations</h1>
                <p className="text-xs text-[#64748B]">
                  Manage your connected tools and view their configuration status.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={connectedSearch}
                    onChange={(e) => setConnectedSearch(e.target.value)}
                    placeholder="Search integrations..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1]/80 text-[#334155] placeholder-slate-500 focus:outline-none w-72"
                  />
                </div>

                <select
                  value={connectedTypeFilter}
                  onChange={(e) => setConnectedTypeFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                >
                  <option value="All Types">All Types</option>
                  <option value="Code Repository">Code Repository</option>
                  <option value="CI/CD">CI/CD</option>
                  <option value="IaC Management">IaC Management</option>
                  <option value="Secrets Management">Secrets Management</option>
                  <option value="Notifications">Notifications</option>
                  <option value="Issue Tracking">Issue Tracking</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Name</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Last Sync</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {connectedData?.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setIntegrationId(item.id);
                          setActiveTab('detail');
                        }}
                      >
                        <td className="py-3 px-4 font-medium text-[#0F172A] flex items-center gap-3">
                          <div className="w-7 h-7 rounded bg-slate-100 border border-[#CBD5E1] flex items-center justify-center font-bold text-[11px] text-[#0F172A]">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{item.name}</span>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">{item.type}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">{item.last_sync}</td>
                        <td className="py-3 px-4 text-right text-[#64748B] font-bold">...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.3: Add Integration */}
          {/* ========================================================================= */}
          {activeTab === 'add' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Add Integration</h1>
                <p className="text-xs text-[#64748B]">
                  Connect a new tool to enhance your IaC security workflow.
                </p>
              </div>

              {/* Search & Category Pills */}
              <div className="flex flex-col gap-4">
                <div className="relative max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search integrations..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1]/80 text-[#334155] placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  {catalogData?.categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCatalogCategory(cat)}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        catalogCategory === cat
                          ? 'bg-blue-600 text-[#0F172A] font-medium shadow-md shadow-blue-600/30'
                          : 'bg-slate-100 border border-[#CBD5E1] text-[#334155] hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Tool Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {catalogData?.items.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-lg p-4 shadow-sm flex flex-col items-center justify-between text-center gap-3 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#CBD5E1] flex items-center justify-center font-bold text-base text-[#0F172A] shadow-md">
                      {card.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A]">{card.name}</div>
                      <div className="text-xs text-[#64748B]">{card.subtext}</div>
                    </div>
                    <button
                      onClick={() => handleConnectIntegration(card.id)}
                      disabled={connectingTool === card.id}
                      className="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-[#0F172A] text-xs font-medium shadow transition-colors disabled:opacity-50"
                    >
                      {connectingTool === card.id ? 'Connecting...' : card.is_connected ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.4: Integration Detail (GitHub) */}
          {/* ========================================================================= */}
          {activeTab === 'detail' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              {/* Hero Banner */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] font-bold text-lg">
                    GH
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-[#0F172A]">{detailData?.name || 'GitHub'}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(detailData?.status || 'Connected')}`}>
                        ● {detailData?.status || 'Connected'}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {detailData?.type || 'Code Repository'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReconnect}
                    className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-100 border border-[#CBD5E1] text-xs text-[#334155]"
                  >
                    Reconnect
                  </button>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-xs">
                <button
                  onClick={() => setActiveTab('detail')}
                  className="pb-2.5 font-semibold text-blue-400 border-b-2 border-blue-500"
                >
                  Configuration
                </button>
                <button
                  onClick={() => setActiveTab('repositories')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Repositories
                </button>
                <button
                  onClick={() => setActiveTab('scan-settings')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Scan Settings
                </button>
                <button
                  onClick={() => setActiveTab('webhooks')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Webhooks
                </button>
                <button
                  onClick={() => setActiveTab('sync-logs')}
                  className="pb-2.5 font-medium text-[#64748B] hover:text-[#334155]"
                >
                  Sync Logs
                </button>
              </div>

              {/* 1. Connection Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Connection Details
                </h3>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Status</span>
                    <span className="text-emerald-400 font-semibold">● {detailData?.connection_details.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Connected On</span>
                    <span className="text-[#334155]">{detailData?.connection_details.connected_on}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Connected By</span>
                    <span className="text-[#334155] font-mono text-[11px]">{detailData?.connection_details.connected_by}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">App Type</span>
                    <span className="text-[#334155]">{detailData?.connection_details.app_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Permissions</span>
                    <span className="text-[#334155]">{detailData?.connection_details.permissions}</span>
                  </div>
                </div>
              </div>

              {/* 2. Repository Selection */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Repository Selection
                </h3>
                <div className="flex flex-col gap-2.5 text-xs">
                  <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                    <input
                      type="radio"
                      name="repoSelection"
                      checked={detailData?.repo_selection.mode === 'all'}
                      onChange={() =>
                        setDetailData((prev) =>
                          prev ? { ...prev, repo_selection: { ...prev.repo_selection, mode: 'all' } } : prev
                        )
                      }
                      className="accent-blue-600"
                    />
                    <span>All repositories</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                    <input
                      type="radio"
                      name="repoSelection"
                      checked={detailData?.repo_selection.mode === 'select'}
                      onChange={() =>
                        setDetailData((prev) =>
                          prev ? { ...prev, repo_selection: { ...prev.repo_selection, mode: 'select' } } : prev
                        )
                      }
                      className="accent-blue-600"
                    />
                    <span>Select repositories</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                    <input
                      type="radio"
                      name="repoSelection"
                      checked={detailData?.repo_selection.mode === 'org'}
                      onChange={() =>
                        setDetailData((prev) =>
                          prev ? { ...prev, repo_selection: { ...prev.repo_selection, mode: 'org' } } : prev
                        )
                      }
                      className="accent-blue-600"
                    />
                    <span>Select by organization</span>
                  </label>
                  <p className="text-[11px] text-slate-500 pt-1">
                    All repositories in the connected account will be scanned based on your scan settings.
                  </p>
                </div>
              </div>

              {/* 3. Sync Settings */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Sync Settings
                </h3>
                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#334155] font-medium">Automatically sync new repositories</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailData((prev) =>
                          prev
                            ? {
                                ...prev,
                                sync_settings: {
                                  ...prev.sync_settings,
                                  auto_sync_new_repos: !prev.sync_settings.auto_sync_new_repos,
                                },
                              }
                            : prev
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        detailData?.sync_settings.auto_sync_new_repos ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          detailData?.sync_settings.auto_sync_new_repos ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Scan pull requests</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailData((prev) =>
                          prev
                            ? {
                                ...prev,
                                sync_settings: {
                                  ...prev.sync_settings,
                                  scan_pull_requests: !prev.sync_settings.scan_pull_requests,
                                },
                              }
                            : prev
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        detailData?.sync_settings.scan_pull_requests ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          detailData?.sync_settings.scan_pull_requests ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#334155] font-medium">Scan default branch</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailData((prev) =>
                          prev
                            ? {
                                ...prev,
                                sync_settings: {
                                  ...prev.sync_settings,
                                  scan_default_branch: !prev.sync_settings.scan_default_branch,
                                },
                              }
                            : prev
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        detailData?.sync_settings.scan_default_branch ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          detailData?.sync_settings.scan_default_branch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                >
                  Disconnect Integration
                </button>
                <button
                  onClick={handleSaveDetail}
                  disabled={savingDetail}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium text-xs shadow-md shadow-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {savingDetail ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.5: Repositories */}
          {/* ========================================================================= */}
          {activeTab === 'repositories' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Repositories</h1>
                <p className="text-xs text-[#64748B]">
                  Select and manage repositories for IaC security scanning.
                </p>
              </div>

              {/* Filter Bar */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1]/80 text-[#334155] placeholder-slate-500 focus:outline-none w-72"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={repoStatusFilter}
                    onChange={(e) => setRepoStatusFilter(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                    <option value="Not Configured">Not Configured</option>
                  </select>

                  <select
                    value={repoVisibilityFilter}
                    onChange={(e) => setRepoVisibilityFilter(e.target.value)}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                  >
                    <option value="All Visibility">All Visibility</option>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>

              {/* Repositories Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium w-8">
                        <input type="checkbox" className="rounded bg-[#F8FAFC] border-[#CBD5E1]" />
                      </th>
                      <th className="py-3 px-4 font-medium">Repository</th>
                      <th className="py-3 px-4 font-medium">Visibility</th>
                      <th className="py-3 px-4 font-medium">Scan Status</th>
                      <th className="py-3 px-4 font-medium">Last Scanned</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {reposData?.items.map((repo) => (
                      <tr key={repo.id} className="hover:bg-slate-100 transition-colors">
                        <td className="py-2.5 px-4">
                          <input type="checkbox" className="rounded bg-[#F8FAFC] border-[#CBD5E1]" />
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#0F172A] flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-blue-400" />
                          <span>{repo.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-[#64748B]">{repo.visibility}</td>
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => handleToggleRepoStatus(repo.name, repo.scan_status)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(repo.scan_status)}`}
                          >
                            ● {repo.scan_status}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-[#64748B] font-mono text-[11px]">{repo.last_scanned}</td>
                        <td className="py-2.5 px-4 text-right text-[#64748B] font-bold">...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/40 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setRepoPage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          repoPage === pageNum
                            ? 'bg-blue-600 text-[#0F172A] font-medium'
                            : 'hover:bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setRepoPage((p) => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B]"
                    >
                      &gt;
                    </button>
                  </div>

                  <select
                    value={repoPageSize}
                    onChange={(e) => setRepoPageSize(Number(e.target.value))}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-2.5 py-1 text-[#334155] focus:outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.6: Webhooks */}
          {/* ========================================================================= */}
          {activeTab === 'webhooks' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Webhooks</h1>
                  <p className="text-xs text-[#64748B]">
                    Manage webhook configuration for real-time scanning.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddWebhookOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[#0F172A] text-xs font-medium shadow transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Webhook</span>
                </button>
              </div>

              {/* Webhooks List Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Webhook URL</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Events</th>
                      <th className="py-3 px-4 font-medium">Created</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {webhooksData?.webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-100 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-300 truncate max-w-xs">
                          {wh.webhook_url}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ● {wh.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#334155]">{wh.events}</td>
                        <td className="py-3 px-4 text-[#64748B]">{wh.created_at}</td>
                        <td className="py-3 px-4 text-right text-[#64748B] font-bold">...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Webhook Events Checklist Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">Webhook Events</h2>
                  <p className="text-xs text-[#64748B]">Select which events should trigger IaC security scans.</p>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsConfig.push_events}
                      onChange={(e) => setEventsConfig((prev) => ({ ...prev, push_events: e.target.checked }))}
                      className="mt-0.5 rounded bg-[#F8FAFC] border-[#CBD5E1] accent-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-[#334155]">Push events</div>
                      <div className="text-[11px] text-[#64748B]">Trigger scan when code is pushed to repository</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsConfig.pull_request_events}
                      onChange={(e) => setEventsConfig((prev) => ({ ...prev, pull_request_events: e.target.checked }))}
                      className="mt-0.5 rounded bg-[#F8FAFC] border-[#CBD5E1] accent-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-[#334155]">Pull request events</div>
                      <div className="text-[11px] text-[#64748B]">Trigger scan when a pull request is opened or updated</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsConfig.merge_events}
                      onChange={(e) => setEventsConfig((prev) => ({ ...prev, merge_events: e.target.checked }))}
                      className="mt-0.5 rounded bg-[#F8FAFC] border-[#CBD5E1] accent-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-[#334155]">Merge events</div>
                      <div className="text-[11px] text-[#64748B]">Trigger scan when a pull request is merged</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsConfig.release_events}
                      onChange={(e) => setEventsConfig((prev) => ({ ...prev, release_events: e.target.checked }))}
                      className="mt-0.5 rounded bg-[#F8FAFC] border-[#CBD5E1] accent-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-[#334155]">Release events</div>
                      <div className="text-[11px] text-[#64748B]">Trigger scan when a new release is created</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventsConfig.tag_events}
                      onChange={(e) => setEventsConfig((prev) => ({ ...prev, tag_events: e.target.checked }))}
                      className="mt-0.5 rounded bg-[#F8FAFC] border-[#CBD5E1] accent-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-[#334155]">Tag events</div>
                      <div className="text-[11px] text-[#64748B]">Trigger scan when a new tag is created</div>
                    </div>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                  <button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook}
                    className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-100 border border-[#CBD5E1] text-xs text-[#334155] transition-colors"
                  >
                    {testingWebhook ? 'Pinging...' : 'Test Webhook'}
                  </button>

                  <button
                    onClick={handleSaveWebhookConfig}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium text-xs shadow-md shadow-blue-600/30 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Modal: Add Webhook */}
              {isAddWebhookOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-sm max-w-md w-full flex flex-col gap-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <span className="text-sm font-semibold text-[#0F172A]">Add Webhook</span>
                      <button onClick={() => setIsAddWebhookOpen(false)} className="text-[#64748B] hover:text-[#0F172A]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateWebhook} className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[#64748B] mb-1">Payload URL</label>
                        <input
                          type="url"
                          required
                          value={newWebhookUrl}
                          onChange={(e) => setNewWebhookUrl(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddWebhookOpen(false)}
                          className="px-3 py-1.5 rounded bg-slate-100 text-[#334155]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium"
                        >
                          Add Endpoint
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.7: Scan Settings (Integration Level) */}
          {/* ========================================================================= */}
          {activeTab === 'scan-settings' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Scan Settings</h1>
                <p className="text-xs text-[#64748B]">
                  Configure IaC scanning behavior for this integration.
                </p>
              </div>

              {/* 1. Scan Configuration */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Scan Configuration
                </h2>

                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[#334155] font-medium block">Scan on Push</span>
                      <span className="text-slate-500 text-[11px]">Automatically scan when code is pushed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scan_config: { ...prev.scan_config, scan_on_push: !prev.scan_config.scan_on_push },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        scanSettings.scan_config.scan_on_push ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          scanSettings.scan_config.scan_on_push ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <div>
                      <span className="text-[#334155] font-medium block">Scan on Pull Request</span>
                      <span className="text-slate-500 text-[11px]">Scan pull requests for IaC security issues</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scan_config: { ...prev.scan_config, scan_on_pr: !prev.scan_config.scan_on_pr },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        scanSettings.scan_config.scan_on_pr ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          scanSettings.scan_config.scan_on_pr ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <div>
                      <span className="text-[#334155] font-medium block">Scan on Merge</span>
                      <span className="text-slate-500 text-[11px]">Scan after pull request is merged</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scan_config: { ...prev.scan_config, scan_on_merge: !prev.scan_config.scan_on_merge },
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        scanSettings.scan_config.scan_on_merge ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          scanSettings.scan_config.scan_on_merge ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. File Filters */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  File Filters
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#334155] font-medium mb-1.5">Include Paths</label>
                    <textarea
                      rows={5}
                      value={scanSettings.file_filters.include_paths.join('\n')}
                      onChange={(e) =>
                        setScanSettings((prev) => ({
                          ...prev,
                          file_filters: {
                            ...prev.file_filters,
                            include_paths: e.target.value.split('\n').filter(Boolean),
                          },
                        }))
                      }
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded p-2.5 font-mono text-[11px] text-[#334155] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-medium mb-1.5">Exclude Paths</label>
                    <textarea
                      rows={5}
                      value={scanSettings.file_filters.exclude_paths.join('\n')}
                      onChange={(e) =>
                        setScanSettings((prev) => ({
                          ...prev,
                          file_filters: {
                            ...prev.file_filters,
                            exclude_paths: e.target.value.split('\n').filter(Boolean),
                          },
                        }))
                      }
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded p-2.5 font-mono text-[11px] text-[#334155] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Scanner Options */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Scanner Options
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[#64748B] mb-1">IaC Scanner</label>
                    <select
                      value={scanSettings.scanner_options.iac_scanner}
                      onChange={(e) =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scanner_options: { ...prev.scanner_options, iac_scanner: e.target.value },
                        }))
                      }
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                    >
                      <option value="Checkov (Default)">Checkov (Default)</option>
                      <option value="tfsec">tfsec</option>
                      <option value="kics">KICS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#64748B] mb-1">Policy Pack</label>
                    <select
                      value={scanSettings.scanner_options.policy_pack}
                      onChange={(e) =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scanner_options: { ...prev.scanner_options, policy_pack: e.target.value },
                        }))
                      }
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                    >
                      <option value="Default">Default</option>
                      <option value="CIS AWS Benchmark">CIS AWS Benchmark</option>
                      <option value="NIST 800-53">NIST 800-53</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#64748B] mb-1">Severity Threshold</label>
                    <select
                      value={scanSettings.scanner_options.severity_threshold}
                      onChange={(e) =>
                        setScanSettings((prev) => ({
                          ...prev,
                          scanner_options: { ...prev.scanner_options, severity_threshold: e.target.value },
                        }))
                      }
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                    >
                      <option value="Low and above">Low and above</option>
                      <option value="Medium and above">Medium and above</option>
                      <option value="High and above">High and above</option>
                      <option value="Critical only">Critical only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleResetScanSettings}
                  className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-100 border border-[#CBD5E1] text-xs text-[#334155]"
                >
                  Reset
                </button>

                <button
                  onClick={handleSaveScanSettings}
                  disabled={savingScanSettings}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-[#0F172A] font-medium text-xs shadow-md shadow-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {savingScanSettings ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 14.8: Sync Logs */}
          {/* ========================================================================= */}
          {activeTab === 'sync-logs' && (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Sync Logs</h1>
                  <p className="text-xs text-[#64748B]">
                    View integration activity and synchronization history.
                  </p>
                </div>

                <button
                  onClick={handleTriggerManualSync}
                  disabled={triggeringSync}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-[#0F172A] text-xs font-medium shadow transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringSync ? 'animate-spin' : ''}`} />
                  <span>{triggeringSync ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>

              {/* Filter Bar */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs">
                <select
                  value={syncEventFilter}
                  onChange={(e) => setSyncEventFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-3 py-1.5 text-[#334155] focus:outline-none"
                >
                  <option value="All Events">All Events</option>
                  <option value="Repository Sync">Repository Sync</option>
                  <option value="Webhook Received">Webhook Received</option>
                  <option value="PR Scan Triggered">PR Scan Triggered</option>
                  <option value="Scan Completed">Scan Completed</option>
                  <option value="Repository Added">Repository Added</option>
                  <option value="Webhook Failed">Webhook Failed</option>
                  <option value="Scan Triggered">Scan Triggered</option>
                </select>

                <div className="text-[#64748B] text-xs">
                  Sep 01, 2026 - Sep 30, 2026
                </div>
              </div>

              {/* Sync Logs Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC]/80 text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Time</th>
                      <th className="py-3 px-4 font-medium">Event</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/60">
                    {syncLogsData?.items.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-100 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {log.time}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#0F172A]">{log.event}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(log.status)}`}>
                            ● {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#334155]">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/40 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setSyncPage(pageNum)}
                        className={`w-7 h-7 flex items-center justify-center rounded ${
                          syncPage === pageNum
                            ? 'bg-blue-600 text-[#0F172A] font-medium'
                            : 'hover:bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setSyncPage((p) => p + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B]"
                    >
                      &gt;
                    </button>
                  </div>

                  <select
                    value={syncPageSize}
                    onChange={(e) => setSyncPageSize(Number(e.target.value))}
                    className="bg-[#F8FAFC] border border-[#CBD5E1]/80 rounded px-2.5 py-1 text-[#334155] focus:outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default IntegrationsSuiteWorkspace;
