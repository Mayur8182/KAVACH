'use client';

/**
 * Kavach Centralized Integration Management System (CIMS)
 * /integrations/hubspot — Dedicated HubSpot CRM Integration & Lifecycle Governance.
 * 
 * Production-ready interface:
 * - Real connection status, portal details, and authentication
 * - Authoritative synchronization health & failure metrics
 * - Bidirectional data mappings (Contacts, Companies, Deals, Tickets)
 * - Automated event integration toggles
 * - Persistent synchronization audit logs with live retry capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Key,
  SlidersHorizontal,
  Activity,
  Play,
  RotateCw,
  ExternalLink,
  Users,
  Building2,
  DollarSign,
  LifeBuoy,
  Check,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type {
  HubspotStatusResponse,
  HubspotSyncLogItem,
  HubspotSettingsResponse,
} from '@/types/api/integrations';

type TabType = 'Connection' | 'Sync Health' | 'Data Mapping' | 'Event Configuration' | 'Sync Logs';

export default function HubspotIntegrationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Connection');
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<HubspotStatusResponse | null>(null);
  const [settingsData, setSettingsData] = useState<HubspotSettingsResponse | null>(null);
  const [logs, setLogs] = useState<HubspotSyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState('ALL');
  const [logFilterEntity, setLogFilterEntity] = useState('ALL');

  // Connection form state
  const [tokenInput, setTokenInput] = useState('');
  const [portalInput, setPortalInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Selected log detail modal
  const [selectedLog, setSelectedLog] = useState<HubspotSyncLogItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, settingsRes, logsRes] = await Promise.all([
        api.integrations.hubspot.getStatus().catch(() => null),
        api.integrations.hubspot.getSettings().catch(() => null),
        api.integrations.hubspot.getLogs({ limit: 50 }).catch(() => []),
      ]);

      if (statusRes) {
        setStatusData(statusRes);
        if (statusRes.portal_id) {
          setPortalInput(statusRes.portal_id);
        }
      }
      if (settingsRes) {
        setSettingsData(settingsRes);
      }
      setLogs(logsRes || []);
    } catch (err: any) {
      console.error('Failed to load HubSpot integration data:', err);
      toast.error('Failed to load HubSpot configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await api.integrations.hubspot.test();
      if (res.connected) {
        toast.success(res.message || 'Live connection to HubSpot verified.');
      } else {
        toast.error(res.message || 'HubSpot connection test failed.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error executing HubSpot connection test.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error('Please enter a valid Private App Access Token or Service Key.');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await api.integrations.hubspot.connect({
        access_token: tokenInput.trim(),
        portal_id: portalInput.trim() || undefined,
        event_settings: settingsData?.event_settings,
      });
      toast.success(res.message || 'HubSpot connected successfully.');
      setTokenInput('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to authenticate with HubSpot.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect HubSpot CRM? Outbound event synchronization will pause.')) {
      return;
    }
    try {
      await api.integrations.hubspot.disconnect();
      toast.info('HubSpot CRM disconnected.');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disconnect HubSpot.');
    }
  };

  const handleToggleEvent = async (eventKey: keyof HubspotSettingsResponse['event_settings']) => {
    if (!settingsData) return;
    const currentVal = settingsData.event_settings[eventKey];
    const updated = {
      ...settingsData.event_settings,
      [eventKey]: !currentVal,
    };

    setSettingsData({
      ...settingsData,
      event_settings: updated,
    });

    setIsSavingSettings(true);
    try {
      await api.integrations.hubspot.updateSettings({
        event_settings: updated,
      });
      toast.success('Event synchronization setting saved.');
    } catch (err: any) {
      toast.error('Failed to update event setting.');
      // Revert
      setSettingsData({
        ...settingsData,
        event_settings: {
          ...settingsData.event_settings,
          [eventKey]: currentVal,
        },
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await api.integrations.hubspot.retryLog(logId);
      if (res.success) {
        toast.success(res.message || 'Operation retried successfully.');
        const updatedLogs = await api.integrations.hubspot.getLogs({
          limit: 50,
          status: logFilterStatus,
          entity: logFilterEntity,
        });
        setLogs(updatedLogs);
      } else {
        toast.error(res.message || 'Retry operation failed.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error retrying sync operation.');
    } finally {
      setRetryingLogId(null);
    }
  };

  const filterLogs = async (status: string, entity: string) => {
    setLogFilterStatus(status);
    setLogFilterEntity(entity);
    setLogsLoading(true);
    try {
      const res = await api.integrations.hubspot.getLogs({
        limit: 50,
        status: status === 'ALL' ? undefined : status,
        entity: entity === 'ALL' ? undefined : entity,
      });
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const isConnected = statusData?.connected ?? false;
  const portalId = statusData?.portal_id;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Breadcrumb & Top Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <Link href="/integrations" className="hover:text-slate-900 flex items-center gap-1">
              <ArrowLeft size={13} />
              Integrations Registry
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-900">HubSpot CRM</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#ff7a59] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                HS
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">HubSpot CRM</h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    CRM & Customer Lifecycle
                  </span>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      CONNECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      NOT CONFIGURED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    Portal ID: <strong className="text-slate-700">{portalId || 'Unconnected'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Sync Health:{' '}
                    <strong
                      className={
                        statusData?.health === 'HEALTHY'
                          ? 'text-emerald-600'
                          : statusData?.health === 'DEGRADED'
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }
                    >
                      {statusData?.health || 'UNKNOWN'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Last Synced:{' '}
                    <strong className="text-slate-700">
                      {statusData?.last_synced_at
                        ? new Date(statusData.last_synced_at).toLocaleString()
                        : 'Never'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              {isConnected && (
                <>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play size={13} className={isTesting ? 'animate-pulse text-amber-500' : ''} />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 -mb-[1px] border-b border-slate-200">
            {(['Connection', 'Sync Health', 'Data Mapping', 'Event Configuration', 'Sync Logs'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
                {tab === 'Sync Logs' && logs.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                    {logs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: CONNECTION & OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'Connection' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Connection Credentials Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">HubSpot Authentication</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect Kavach to your HubSpot account using a Private App Access Token or Service Key.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Key size={16} />
                </div>
              </div>

              {isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold">HubSpot Account Connected</h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Kavach is actively synchronizing leads, users, organizations, subscriptions, and demo requests into HubSpot Portal{' '}
                          <strong>{portalId}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500">Connected Portal:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{portalId || 'Production Portal'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Authentication Method:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">Private App Token (Bearer)</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Sync Pipeline:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">Asynchronous Non-Blocking Engine</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Credential Storage:</span>
                      <p className="font-semibold text-emerald-700 mt-0.5">AES-256 Encrypted at Rest</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2 cursor-pointer"
                    >
                      <Play size={13} />
                      {isTesting ? 'Verifying...' : 'Verify Live Access'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-transparent rounded-lg cursor-pointer"
                    >
                      Disconnect Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnect} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Private App Access Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Created under HubSpot Settings → Integrations → Private Apps. Requires scopes:{' '}
                      <code className="text-slate-700 font-mono">crm.objects.contacts.write</code>,{' '}
                      <code className="text-slate-700 font-mono">crm.objects.companies.write</code>,{' '}
                      <code className="text-slate-700 font-mono">crm.objects.deals.write</code>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      HubSpot Portal ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={portalInput}
                      onChange={(e) => setPortalInput(e.target.value)}
                      placeholder="e.g. 14592031"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Auto-discovered during connection verification if left empty.
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Authenticating with HubSpot...
                        </>
                      ) : (
                        'Save & Connect HubSpot'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Architecture & Security Guardrails Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} className="text-slate-700" />
                Security & Data Boundary
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                HubSpot CRM is integrated as a business relationship and lifecycle engine. Kavach maintains strict data minimization:
              </p>
              <ul className="text-xs text-slate-600 space-y-2.5 pt-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Only business identities (names, emails, company domains, plan tiers) are synced.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Never sends passwords, authentication tokens, or repository credentials.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Never sends raw vulnerability findings or sensitive AST scan outputs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Failsafe design: HubSpot unavailability never blocks login, signup, or scanning.</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-100">
                <a
                  href="https://developers.hubspot.com/docs/api/crm/overview"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  HubSpot CRM API Documentation
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SYNC HEALTH & TELEMETRY */}
        {/* ========================================================================= */}
        {activeTab === 'Sync Health' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <span className="text-xs font-medium text-slate-500">Total Sync Operations</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {statusData?.total_operations ?? 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">Lifetime recorded in audit log</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <span className="text-xs font-medium text-slate-500">Successful Syncs</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {statusData?.successful_operations ?? 0}
                </p>
                <span className="text-[11px] text-emerald-600/80 mt-1 block">100% verified by HubSpot API</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <span className="text-xs font-medium text-slate-500">Failed Operations</span>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {statusData?.failed_operations ?? 0}
                </p>
                <span className="text-[11px] text-rose-600/80 mt-1 block">Available for instant manual retry</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <span className="text-xs font-medium text-slate-500">Pending Background Queue</span>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {statusData?.pending_operations ?? 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">Scheduled for dispatch</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Sync Telemetry & Operational Health</h3>
              <p className="text-xs text-slate-500 mb-6">
                Real-time health evaluation derived from actual database logs and API responses.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Activity size={16} className="text-slate-600" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Health Assessment</h4>
                      <p className="text-[11px] text-slate-500">
                        {statusData?.health === 'HEALTHY'
                          ? 'Zero persistent synchronization errors detected.'
                          : statusData?.health === 'DEGRADED'
                          ? 'Some outbound operations failed and are queued for retry.'
                          : 'HubSpot token not yet configured.'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      statusData?.health === 'HEALTHY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : statusData?.health === 'DEGRADED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {statusData?.health || 'NOT_CONFIGURED'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-slate-600" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Last Telemetry Heartbeat</h4>
                      <p className="text-[11px] text-slate-500">Timestamp of most recent outbound API event</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-700">
                    {statusData?.last_synced_at
                      ? new Date(statusData.last_synced_at).toLocaleString()
                      : 'No sync events recorded yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DATA MAPPING */}
        {/* ========================================================================= */}
        {activeTab === 'Data Mapping' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">CRM Entity Property Mappings</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-6">
                Authoritative mapping of Kavach application entities to standard and custom HubSpot CRM properties.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contacts Mapping */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Contacts (Users & Leads)</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(settingsData?.mappings?.contacts || []).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                        <span className="font-mono text-slate-700">{m.kavach_field}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono text-slate-900 font-semibold">{m.hubspot_property}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Companies Mapping */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Companies (Organizations)</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(settingsData?.mappings?.companies || []).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                        <span className="font-mono text-slate-700">{m.kavach_field}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono text-slate-900 font-semibold">{m.hubspot_property}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deals Mapping */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Deals (Enterprise Pipeline)</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(settingsData?.mappings?.deals || []).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                        <span className="font-mono text-slate-700">{m.kavach_field}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono text-slate-900 font-semibold">{m.hubspot_property}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tickets Mapping */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <LifeBuoy size={16} className="text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Tickets (Customer Support)</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(settingsData?.mappings?.tickets || []).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                        <span className="font-mono text-slate-700">{m.kavach_field}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono text-slate-900 font-semibold">{m.hubspot_property}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EVENT CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'Event Configuration' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Automated Event Synchronization</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable automated CRM dispatch triggers across core Kavach SaaS lifecycle workflows.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Event 1: Website Inquiries */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Website & Contact Inquiries</h4>
                  <p className="text-xs text-slate-500">
                    Captures submissions from <code className="font-mono text-slate-700">/contact</code> and creates CRM Contacts with inquiry notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_leads')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_leads ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_leads ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event 2: User Registration */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">User Registration & Signups</h4>
                  <p className="text-xs text-slate-500">
                    Creates or updates HubSpot Contact with signup provider, plan tier, and onboarding status upon account creation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_users')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_users ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_users ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event 3: Organization Creation */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Organization Creation</h4>
                  <p className="text-xs text-slate-500">
                    Creates HubSpot Company record with industry, team size, and links the organization owner contact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_organizations')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_organizations ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_organizations ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event 4: Stripe Billing */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Stripe Billing & Subscriptions</h4>
                  <p className="text-xs text-slate-500">
                    Reflects plan upgrades (Pro/Team) into HubSpot, updates MRR/ARR, and marks Deals as Closed Won. Updates status on cancellation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_billing')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_billing ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_billing ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event 5: Demo Requests */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Demo Bookings & Enterprise Inquiries</h4>
                  <p className="text-xs text-slate-500">
                    Creates an Enterprise Sales Deal in the HubSpot pipeline at stage <code className="font-mono text-slate-700">appointmentscheduled</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_demos')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_demos ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_demos ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Event 6: Support Tickets */}
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Customer Support Inquiries</h4>
                  <p className="text-xs text-slate-500">
                    Dispatches support inquiries into HubSpot Service Hub as priority tickets associated with the customer contact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleEvent('sync_support')}
                  disabled={isSavingSettings}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settingsData?.event_settings?.sync_support ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settingsData?.event_settings?.sync_support ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SYNC LOGS & AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'Sync Logs' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Synchronization Audit Logs</h3>
                <p className="text-xs text-slate-500">Real outbound event records persisted in database</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={logFilterEntity}
                  onChange={(e) => filterLogs(logFilterStatus, e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="ALL">All Entities</option>
                  <option value="CONTACT">Contacts</option>
                  <option value="COMPANY">Companies</option>
                  <option value="DEAL">Deals</option>
                  <option value="TICKET">Tickets</option>
                </select>

                <select
                  value={logFilterStatus}
                  onChange={(e) => filterLogs(e.target.value, logFilterEntity)}
                  className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>

                <button
                  onClick={() => filterLogs(logFilterStatus, logFilterEntity)}
                  disabled={logsLoading}
                  className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Operation</th>
                    <th className="py-2.5 px-4">Internal ID</th>
                    <th className="py-2.5 px-4">HubSpot ID</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No synchronization audit logs found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-800">{log.entity_type}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{log.operation}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 truncate max-w-[150px]">
                          {log.internal_id}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800">
                          {log.hubspot_id || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          {log.status === 'SUCCESS' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> SUCCESS
                            </span>
                          )}
                          {log.status === 'FAILED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle size={11} /> FAILED
                            </span>
                          )}
                          {log.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              <Clock size={11} /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
                            >
                              Inspect
                            </button>
                            {log.status === 'FAILED' && (
                              <button
                                onClick={() => handleRetryLog(log.id)}
                                disabled={retryingLogId === log.id}
                                className="px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50 border border-rose-200 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <RotateCw size={10} className={retryingLogId === log.id ? 'animate-spin' : ''} />
                                Retry
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-slate-700" />
                Sync Audit Record Detail
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Record ID:</span>
                  <span className="text-slate-900 font-semibold">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Entity Type:</span>
                  <span className="text-slate-900 font-semibold">{selectedLog.entity_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Operation:</span>
                  <span className="text-slate-900 font-semibold">{selectedLog.operation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span
                    className={`font-semibold ${
                      selectedLog.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Internal ID:</span>
                  <span className="text-slate-900">{selectedLog.internal_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">HubSpot Object ID:</span>
                  <span className="text-slate-900">{selectedLog.hubspot_id || 'Not Assigned'}</span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <span className="font-semibold block mb-0.5 text-[11px] text-rose-900 flex items-center gap-1">
                    <AlertTriangle size={12} /> Error Details:
                  </span>
                  <p className="font-mono text-[11px]">{selectedLog.error_message}</p>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Payload Snapshot:</span>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono max-h-48">
                  {JSON.stringify(selectedLog.payload_snapshot || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

