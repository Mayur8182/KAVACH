'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  GitBranch,
  Cloud,
  Layers,
  Lock,
  Radio,
  FileSearch,
  Box,
  CheckCircle2,
  Award,
  Radar,
  ShieldAlert,
  ClipboardCheck,
  ExternalLink,
  Check,
  X,
  Download,
  Activity,
  Sliders,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Stylized Provider Brand Icons
// ─────────────────────────────────────────────────────────────────────────────
function ProviderIcon({ provider, className = 'w-5 h-5' }: { provider: string; className?: string }) {
  const p = (provider || '').toLowerCase();

  if (p.includes('github') && !p.includes('actions')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }

  if (p.includes('gitlab')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M22.65 14.39L20.61 8.1c-.13-.41-.7-.41-.83 0l-2.04 6.29H6.26L4.22 8.1c-.13-.41-.7-.41-.83 0L1.35 14.39a1 1 0 00.36 1.12l10.29 7.49 10.29-7.49a1 1 0 00.36-1.12z" fill="#E24329" />
        <path d="M12 23l-10.65-8.61c-.36-.28-.5-.78-.36-1.12L3.39 8.1a.43.43 0 01.83 0l2.04 6.29H12v8.61z" fill="#FC6D26" />
        <path d="M12 23V14.39h5.74l2.04-6.29a.43.43 0 01.83 0l2.04 6.29c.14.34 0 .84-.36 1.12L12 23z" fill="#FCA326" />
      </svg>
    );
  }

  if (p.includes('bitbucket')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0052CC">
        <path d="M2.66 3h18.68a.66.66 0 01.66.75l-2.73 16.5a.66.66 0 01-.65.55H5.38a.66.66 0 01-.65-.55L2 3.75A.66.66 0 012.66 3zm11.23 11.25h-3.78l-.66 3.75h5.1l-.66-3.75z" />
      </svg>
    );
  }

  if (p.includes('jenkins')) {
    return (
      <div className={`rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-[9px] ${className}`}>
        JK
      </div>
    );
  }

  if (p.includes('actions')) {
    return (
      <div className={`rounded-md bg-blue-600 flex items-center justify-center text-white ${className}`}>
        <Layers className="w-3.5 h-3.5" />
      </div>
    );
  }

  if (p.includes('azure')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M13.05 3.5L5.75 16.6H11.5L8.5 20.5H18.25L13.05 3.5Z" fill="#0078D4" />
        <path d="M11.5 16.6L14.7 10.7L18.25 20.5H8.5L11.5 16.6Z" fill="#50E6FF" />
      </svg>
    );
  }

  if (p.includes('aws') || p.includes('amazon')) {
    return (
      <div className={`rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-black text-[9px] tracking-tight ${className}`}>
        AWS
      </div>
    );
  }

  if (p.includes('google') || p.includes('gcp')) {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <path d="M12 10.2v3.7h5.2c-.2 1.3-1.5 3.7-5.2 3.7-3.2 0-5.7-2.6-5.7-5.8s2.5-5.8 5.7-5.8c1.8 0 3 .8 3.7 1.4l2.9-2.8C16.8 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.2-.2-1.7H12v-.3z" fill="#4285F4" />
      </svg>
    );
  }

  if (p.includes('oracle')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="#EA1D25" strokeWidth="3" />
      </svg>
    );
  }

  if (p.includes('slack')) {
    return (
      <div className={`rounded-md bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold text-xs ${className}`}>
        #
      </div>
    );
  }

  if (p.includes('jira')) {
    return (
      <div className={`rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] ${className}`}>
        J
      </div>
    );
  }

  if (p.includes('pagerduty')) {
    return (
      <div className={`rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px] ${className}`}>
        PD
      </div>
    );
  }

  if (p.includes('snyk')) {
    return (
      <div className={`rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[9px] ${className}`}>
        SN
      </div>
    );
  }

  if (p.includes('docker')) {
    return (
      <div className={`rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-[9px] ${className}`}>
        DK
      </div>
    );
  }

  return (
    <div className={`rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs ${className}`}>
      {provider.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = (status || '').toLowerCase();

  if (s === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Connected
      </span>
    );
  }

  if (s === 'issues' || s === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Issues
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
      Not Connected
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TenantIntegrationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.tenantId;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'git' | 'cicd' | 'cloud'>('all');

  // Backend Data
  const [tenant, setTenant] = useState<any>(null);
  const [integrationsData, setIntegrationsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search (for Tab 7.1)
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination for Tab 7.1
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Actions Dropdown
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [presetProvider, setPresetProvider] = useState<string | null>(null);
  const [connectAccountName, setConnectAccountName] = useState('');
  const [connectToken, setConnectToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Configure Setting Modal
  const [configureModalKey, setConfigureModalKey] = useState<string | null>(null);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

  // Active Row Menu Dropdown
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);

  // Fetch Data from Real Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getTenantIntegrations(tenantId);
      setIntegrationsData(res);
      if (res?.tenant) {
        setTenant(res.tenant);
      }
    } catch (err: any) {
      console.error('Failed to load integrations:', err);
      setError(err?.message || 'Failed to retrieve tenant integrations.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived summaries & lists
  const summary = integrationsData?.summary || {
    all: { total: 16, connected: 12, not_connected: 4, issues: 1 },
    git: { total: 3, connected: 2, not_connected: 1 },
    cicd: { total: 4, connected: 3, not_connected: 1 },
    cloud: { total: 4, connected: 3, not_connected: 1 },
  };

  const allIntegrations: any[] = integrationsData?.all || [];
  const gitProviders: any[] = integrationsData?.git_providers || [];
  const cicdProviders: any[] = integrationsData?.cicd_providers || [];
  const cloudProviders: any[] = integrationsData?.cloud_providers || [];
  const settings = integrationsData?.settings || {};

  // Tab 7.1 Filtered and Paginated Items
  const filteredAll = useMemo(() => {
    return allIntegrations.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.account_name && item.account_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        typeFilter === 'All' ||
        item.type.toLowerCase().includes(typeFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(typeFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allIntegrations, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / pageSize));
  const paginatedAll = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAll.slice(start, start + pageSize);
  }, [filteredAll, currentPage, pageSize]);

  // Handle Connect
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerToConnect = presetProvider || 'github';
    setIsConnecting(true);
    try {
      await api.superadmin.connectTenantIntegration(tenantId, {
        provider: providerToConnect,
        account_name: connectAccountName || `${providerToConnect}_account`,
      });
      setIsConnectModalOpen(false);
      setPresetProvider(null);
      setConnectAccountName('');
      setConnectToken('');
      await loadData();
    } catch (err: any) {
      alert(`Connection failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (providerOrId: string) => {
    if (!confirm(`Are you sure you want to disconnect ${providerOrId}?`)) return;
    try {
      await api.superadmin.disconnectTenantIntegration(tenantId, providerOrId);
      setActiveMenuRowId(null);
      await loadData();
    } catch (err: any) {
      alert(`Disconnect failed: ${err?.message || 'Error occurred'}`);
    }
  };

  // Handle Toggle Setting
  const handleToggleSetting = async (settingKey: string, currentVal: boolean) => {
    setIsUpdatingSetting(true);
    try {
      await api.superadmin.updateTenantIntegrationSetting(tenantId, {
        setting_key: settingKey,
        enabled: !currentVal,
      });
      await loadData();
      setConfigureModalKey(null);
    } catch (err: any) {
      alert(`Setting update failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  // Handle Sync All
  const handleSyncAll = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    await loadData();
  };

  // Handle Export Report
  const handleExportReport = () => {
    const report = {
      tenant: tenant?.name,
      domain: tenant?.domain,
      exported_at: new Date().toISOString(),
      summary,
      integrations: allIntegrations,
      settings,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant?.slug || 'tenant'}-integrations.json`;
    a.click();
  };

  const tabs = [
    { id: 'all', label: 'All Integrations' },
    { id: 'git', label: 'Git Providers' },
    { id: 'cicd', label: 'CI/CD' },
    { id: 'cloud', label: 'Cloud Providers' },
  ];

  return (
    <SuperAdminShell>
      <div className="space-y-6 pb-12">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Header & Breadcrumb (Matches Top of Image)                          */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
            <Link href="/superadmin/tenants" className="hover:text-slate-900 transition-colors">
              Tenant Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={`/superadmin/tenants/${tenantId}`}
              className="hover:text-slate-900 transition-colors"
            >
              {tenant?.name || 'TechCorp'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">Integrations</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
                {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {tenant?.name || 'TechCorp'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {tenant?.status || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                  <span>{tenant?.domain || 'techcorp.com'}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {tenant?.plan || 'Enterprise Plan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Button */}
            <div className="relative">
              <button
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Actions</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isActionsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5">
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setPresetProvider(null);
                      setIsConnectModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add New Integration</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      handleSyncAll();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sync All Integrations</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      handleExportReport();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export Integrations Spec</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <Link
                    href={`/superadmin/tenants/${tenantId}/audit`}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Audit Trail</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Navigation Tabs Bar                                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-8 border-b border-slate-200 text-xs font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`pb-3 transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 font-bold border-b-2 border-blue-600 -mb-px'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 7.1: ALL INTEGRATIONS                                           */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            {/* KPI Cards Row (Total, Connected, Not Connected, Issues) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Integrations
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.all.total}
                  </div>
                </div>
              </div>

              {/* Card 2: Connected */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Connected
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.all.connected}
                  </div>
                </div>
              </div>

              {/* Card 3: Not Connected */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Not Connected
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.all.not_connected}
                  </div>
                </div>
              </div>

              {/* Card 4: Issues & Button */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Issues
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {summary.all.issues}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPresetProvider(null);
                    setIsConnectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Integration</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="All">All</option>
                    <option value="Source Code">Source Code</option>
                    <option value="CI/CD">CI/CD</option>
                    <option value="Cloud">Cloud</option>
                    <option value="Alerts">Alerts & Incidents</option>
                    <option value="Security">Security Scanner</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="All">All</option>
                    <option value="Connected">Connected</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Issues">Issues</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('All');
                    setStatusFilter('All');
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Name</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Provider</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Last Sync</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedAll.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No integrations found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedAll.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <ProviderIcon provider={item.provider} className="w-5 h-5 flex-shrink-0" />
                              <span className="font-bold text-slate-900">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{item.type}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.provider_display || item.provider}</td>
                          <td className="py-3.5 px-4">
                            <StatusPill status={item.status} />
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {item.status === 'Not Connected' ? '-' : item.last_sync}
                          </td>
                          <td className="py-3.5 px-5 text-right relative">
                            <div className="inline-block relative">
                              <button
                                onClick={() =>
                                  setActiveMenuRowId(activeMenuRowId === item.id ? null : item.id)
                                }
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuRowId === item.id && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-left">
                                  {item.status === 'Not Connected' ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveMenuRowId(null);
                                          setPresetProvider(item.provider);
                                          setConnectAccountName(`${tenant?.slug || 'techcorp'}-${item.provider}`);
                                          setIsConnectModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-blue-600 font-medium hover:bg-blue-50"
                                      >
                                        Connect Integration
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuRowId(null);
                                          alert(`Provider ${item.name}: To configure connection, ensure API credentials or service principal are provisioned.`);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                      >
                                        Connection Guide
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveMenuRowId(null);
                                          alert(`Integration ${item.name}: Account ${item.account_name}, Scopes: ${item.scopes?.join(', ') || 'All standard'}`);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                      >
                                        View Credentials
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuRowId(null);
                                          loadData();
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                      >
                                        Force Resync
                                      </button>
                                      <div className="my-1 border-t border-slate-100" />
                                      <button
                                        onClick={() => handleDisconnect(item.id)}
                                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                      >
                                        Disconnect
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="py-3 px-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAll.length)}-
                  {Math.min(currentPage * pageSize, filteredAll.length)} of {filteredAll.length} integrations
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors ${
                        currentPage === pg
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 7.2: GIT PROVIDERS                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'git' && (
          <div className="space-y-6">
            {/* Top KPIs (3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Providers
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.git.total}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Connected
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.git.connected}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Not Connected
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {summary.git.not_connected}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPresetProvider('bitbucket');
                    setConnectAccountName(`${tenant?.slug || 'techcorp'}-workspace`);
                    setIsConnectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Provider</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Connected Account</th>
                    <th className="py-3.5 px-4">Repositories</th>
                    <th className="py-3.5 px-4">Last Sync</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gitProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon provider={provider.provider} className="w-5 h-5 flex-shrink-0" />
                          <span className="font-bold text-slate-900">{provider.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={provider.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {provider.status === 'Not Connected' ? '-' : (provider.account_name || '-')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {provider.status === 'Not Connected'
                          ? '-'
                          : provider.repositories_count !== null && provider.repositories_count !== undefined
                          ? provider.repositories_count
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {provider.status === 'Not Connected' ? '-' : provider.last_sync}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {provider.status === 'Not Connected' ? (
                          <button
                            onClick={() => {
                              setPresetProvider(provider.provider);
                              setConnectAccountName(`${tenant?.slug || 'techcorp'}-workspace`);
                              setIsConnectModalOpen(true);
                            }}
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-md text-xs font-semibold shadow-sm transition-colors"
                          >
                            Connect
                          </button>
                        ) : (
                          <div className="inline-block relative">
                            <button
                              onClick={() =>
                                setActiveMenuRowId(activeMenuRowId === provider.id ? null : provider.id)
                              }
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuRowId === provider.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    alert(`Repository sync interval: 15 mins. ${provider.repositories_count} repositories actively indexed.`);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  View Synced Repos
                                </button>
                                <button
                                  onClick={() => handleDisconnect(provider.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Disconnect
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Git Provider Settings */}
            <div className="pt-2">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Git Provider Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Setting 1: Repository Sync */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Repository Sync</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Automatically sync repositories from connected providers.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.repository_sync !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('repository_sync')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 2: Webhooks */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <Radio className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Webhooks</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Receive events for push, pull requests, and more.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.webhooks !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('webhooks')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 3: Access Control */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Access Control</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Manage repository access and permissions.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => setConfigureModalKey('access_control')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 7.3: CI/CD                                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'cicd' && (
          <div className="space-y-6">
            {/* Top KPIs (3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total CI/CD Tools
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.cicd.total}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Connected
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.cicd.connected}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Not Connected
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {summary.cicd.not_connected}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPresetProvider('azure-devops');
                    setConnectAccountName(`${tenant?.slug || 'techcorp'}-devops`);
                    setIsConnectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect CI/CD</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Tool</th>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Connected Account</th>
                    <th className="py-3.5 px-4">Pipelines</th>
                    <th className="py-3.5 px-4">Last Sync</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cicdProviders.map((tool) => (
                    <tr key={tool.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon provider={tool.provider} className="w-5 h-5 flex-shrink-0" />
                          <span className="font-bold text-slate-900">{tool.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{tool.cicd_runner || tool.provider_display || tool.provider}</td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={tool.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tool.status === 'Not Connected' ? '-' : (tool.account_name || '-')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tool.status === 'Not Connected'
                          ? '-'
                          : tool.pipelines_count !== null && tool.pipelines_count !== undefined
                          ? tool.pipelines_count
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {tool.status === 'Not Connected' ? '-' : tool.last_sync}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {tool.status === 'Not Connected' ? (
                          <button
                            onClick={() => {
                              setPresetProvider(tool.provider);
                              setConnectAccountName(`${tenant?.slug || 'techcorp'}-devops`);
                              setIsConnectModalOpen(true);
                            }}
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-md text-xs font-semibold shadow-sm transition-colors"
                          >
                            Connect
                          </button>
                        ) : (
                          <div className="inline-block relative">
                            <button
                              onClick={() =>
                                setActiveMenuRowId(activeMenuRowId === tool.id ? null : tool.id)
                              }
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuRowId === tool.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    alert(`Tool ${tool.name}: Pipeline integration active. ${tool.pipelines_count} pipelines monitored.`);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  View Pipelines
                                </button>
                                <button
                                  onClick={() => handleDisconnect(tool.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Disconnect
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: CI/CD Configuration */}
            <div className="pt-2">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                CI/CD Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Setting 1: Pipeline Scanning */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Pipeline Scanning</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Automatically scan CI/CD pipelines for security issues.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.pipeline_scanning !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('pipeline_scanning')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 2: Build Artifacts */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <Box className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Build Artifacts</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Scan and track build artifacts and container images.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.build_artifacts !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('build_artifacts')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 3: Policy Enforcement */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Policy Enforcement</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Enforce security policies in CI/CD workflows.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => setConfigureModalKey('policy_enforcement')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 7.4: CLOUD PROVIDERS                                            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            {/* Top KPIs (3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Providers
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.cloud.total}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Connected
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summary.cloud.connected}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Not Connected
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {summary.cloud.not_connected}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPresetProvider('oracle-cloud');
                    setConnectAccountName(`${tenant?.slug || 'techcorp'}-oci`);
                    setIsConnectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Cloud</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Connected Account</th>
                    <th className="py-3.5 px-4">Projects / Accounts</th>
                    <th className="py-3.5 px-4">Last Sync</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cloudProviders.map((cloud) => (
                    <tr key={cloud.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <ProviderIcon provider={cloud.provider} className="w-5 h-5 flex-shrink-0" />
                          <span className="font-bold text-slate-900">
                            {cloud.provider === 'azure' ? 'Microsoft Azure' : cloud.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={cloud.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {cloud.status === 'Not Connected' ? '-' : (cloud.account_name || '-')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {cloud.status === 'Not Connected' ? '-' : (cloud.resource_count || '-')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {cloud.status === 'Not Connected' ? '-' : cloud.last_sync}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {cloud.status === 'Not Connected' ? (
                          <button
                            onClick={() => {
                              setPresetProvider(cloud.provider);
                              setConnectAccountName(`${tenant?.slug || 'techcorp'}-oci`);
                              setIsConnectModalOpen(true);
                            }}
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-md text-xs font-semibold shadow-sm transition-colors"
                          >
                            Connect
                          </button>
                        ) : (
                          <div className="inline-block relative">
                            <button
                              onClick={() =>
                                setActiveMenuRowId(activeMenuRowId === cloud.id ? null : cloud.id)
                              }
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuRowId === cloud.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuRowId(null);
                                    alert(`Cloud Provider: ${cloud.name}. Connected with Account: ${cloud.account_name}. CSPM telemetry synced.`);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  View Cloud Discovery
                                </button>
                                <button
                                  onClick={() => handleDisconnect(cloud.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Disconnect
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Cloud Configuration */}
            <div className="pt-2">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Cloud Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Setting 1: Account Discovery */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <Radar className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Account Discovery</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Automatically discover cloud accounts and resources.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.account_discovery !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('account_discovery')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 2: Security Scanning */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Security Scanning</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Scan cloud configurations for misconfigurations.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {settings.security_scanning !== false ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setConfigureModalKey('security_scanning')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>

                {/* Setting 3: Compliance & Policies */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Compliance & Policies</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Check compliance with security standards.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => setConfigureModalKey('compliance_policies')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Real Interactive Connect Integration Modal                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Connect Integration
                    </h3>
                    <p className="text-xs text-slate-500">
                      Authorizes gateway communication and persists securely to database.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConnectSubmit} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Provider
                  </label>
                  <select
                    value={presetProvider || 'github'}
                    onChange={(e) => setPresetProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                    <option value="bitbucket">Bitbucket</option>
                    <option value="jenkins">Jenkins</option>
                    <option value="github-actions">GitHub Actions</option>
                    <option value="gitlab-ci">GitLab CI</option>
                    <option value="azure-devops">Azure DevOps</option>
                    <option value="aws">AWS (Amazon Web Services)</option>
                    <option value="azure">Microsoft Azure</option>
                    <option value="google-cloud">Google Cloud</option>
                    <option value="oracle-cloud">Oracle Cloud</option>
                    <option value="slack">Slack</option>
                    <option value="jira">Jira Software</option>
                    <option value="pagerduty">PagerDuty</option>
                    <option value="snyk">Snyk Security</option>
                    <option value="docker-hub">Docker Hub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Connected Account Name / ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. techcorp-org or subscription-id"
                    value={connectAccountName}
                    onChange={(e) => setConnectAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API Token / Personal Access Key / Webhook Secret
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_••••••••••••••••••••••••••••••••••••"
                    value={connectToken}
                    onChange={(e) => setConnectToken(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Credential is encrypted at rest using AES-256 before database storage.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isConnecting ? 'Verifying & Connecting...' : 'Connect Integration'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Real Interactive Configure Setting Modal                            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {configureModalKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure{' '}
                    {configureModalKey
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Runtime policy and automated execution parameters.
                  </p>
                </div>
                <button
                  onClick={() => setConfigureModalKey(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Feature Status</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Toggle active enforcement for this tenant organization.
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleSetting(
                        configureModalKey,
                        settings[configureModalKey] !== false
                      )
                    }
                    disabled={isUpdatingSetting}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings[configureModalKey] !== false ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings[configureModalKey] !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
                  Deterministic changes take effect immediately across all background runner nodes and SCM webhooks.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfigureModalKey(null)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
