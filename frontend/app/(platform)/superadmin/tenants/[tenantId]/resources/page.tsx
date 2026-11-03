'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Cpu,
  Layers,
  Shield,
  Server,
  Database,
  HardDrive,
  Network,
  Lock,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sliders,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Folder,
  Activity,
  ExternalLink,
  Users,
  GitBranch,
  CreditCard,
  Key,
  Globe,
  Settings,
  Download,
  Trash2,
  MoreHorizontal,
  Edit2,
  Cloud,
  CheckCircle,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();

  if (s === 'healthy' || s === 'active' || s === 'enabled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {status}
      </span>
    );
  }

  if (s === 'warning' || s === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
      {status}
    </span>
  );
}

// Environment Pill Badge
function EnvBadge({ env }: { env: string }) {
  const e = (env || '').toLowerCase();
  if (e === 'production') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Production
      </span>
    );
  }
  if (e === 'staging') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Staging
      </span>
    );
  }
  if (e === 'all') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        All
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      {env}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Tenant Resources & Isolation Page
// ─────────────────────────────────────────────────────────────────────────────
export default function TenantResourcesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.tenantId;

  // Level 2 Subtab under Resources (5.1 -> 5.5)
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'infrastructure' | 'quotas' | 'isolation' | 'environment'
  >('overview');

  // Backend Data
  const [tenant, setTenant] = useState<any>(null);
  const [resourcesData, setResourcesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeframe selector for 5.1 chart
  const [timeframe, setTimeframe] = useState('Last 30 days');

  // Top Actions dropdown menu
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Modals
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    max_repositories: 500,
    max_scan_minutes: 100000,
    max_storage_gb: 10240,
    max_api_calls: 500000,
    max_runner_nodes: 50,
  });
  const [isUpdatingQuotas, setIsUpdatingQuotas] = useState(false);

  // Add Environment modal
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [envForm, setEnvForm] = useState({
    name: '',
    type: 'Production',
    cluster: 'techcorp-prod',
    url: '',
    scan_schedule: 'Continuous',
  });
  const [isAddingEnv, setIsAddingEnv] = useState(false);

  // Add Variable modal
  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [varForm, setVarForm] = useState({
    key: '',
    value: '',
    environment: 'Production',
  });
  const [isAddingVar, setIsAddingVar] = useState(false);

  // Add Secret modal
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretForm, setSecretForm] = useState({
    name: '',
    environment: 'Production',
    type: 'Database',
  });
  const [isAddingSecret, setIsAddingSecret] = useState(false);

  // Manage Secret modal
  const [managedSecret, setManagedSecret] = useState<any>(null);

  // Configure Isolation modal
  const [isolationConfigModal, setIsolationConfigModal] = useState<any>(null);
  const [isUpdatingIsolation, setIsUpdatingIsolation] = useState(false);

  // View modal for cluster / details
  const [viewItemModal, setViewItemModal] = useState<any>(null);

  // Load Data from Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getTenantResources(tenantId);
      setTenant(res.tenant || res.organization);
      setResourcesData(res);

      if (res?.quotas?.kpis) {
        setQuotaForm({
          max_repositories: res.quotas.kpis.repositories?.limit || 500,
          max_scan_minutes: res.quotas.kpis.scan_credits?.limit || 100000,
          max_storage_gb: 10240,
          max_api_calls: 500000,
          max_runner_nodes: 50,
        });
      }
    } catch (err: any) {
      console.error('Failed to load resources:', err);
      setError(err?.message || 'Failed to retrieve tenant resources & isolation telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Quota Form Save
  const handleSaveQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingQuotas(true);
    try {
      await api.superadmin.updateTenantQuotas(tenantId, quotaForm);
      setIsQuotaModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Quota update failed: ${err?.message}`);
    } finally {
      setIsUpdatingQuotas(false);
    }
  };

  // Handle Add Environment
  const handleAddEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envForm.name.trim()) return;
    setIsAddingEnv(true);
    try {
      await api.superadmin.addTenantEnvironment(tenantId, {
        name: envForm.name.trim(),
        slug: envForm.name.toLowerCase().replace(/\s+/g, '-'),
        scan_schedule: envForm.scan_schedule,
      });
      setIsEnvModalOpen(false);
      setEnvForm({ name: '', type: 'Production', cluster: 'techcorp-prod', url: '', scan_schedule: 'Continuous' });
      await loadData();
    } catch (err: any) {
      alert(`Add environment failed: ${err?.message}`);
    } finally {
      setIsAddingEnv(false);
    }
  };

  // Handle Add Environment Variable
  const handleAddVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varForm.key.trim()) return;
    setIsAddingVar(true);
    try {
      await api.superadmin.addTenantEnvVariable(tenantId, {
        key: varForm.key.trim(),
        value: varForm.value.trim(),
        environment: varForm.environment,
      });
      setIsVarModalOpen(false);
      setVarForm({ key: '', value: '', environment: 'Production' });
      await loadData();
    } catch (err: any) {
      alert(`Add variable failed: ${err?.message}`);
    } finally {
      setIsAddingVar(false);
    }
  };

  // Handle Delete Environment Variable
  const handleDeleteVariable = async (key: string) => {
    if (!confirm(`Delete environment variable "${key}"?`)) return;
    try {
      await api.superadmin.deleteTenantEnvVariable(tenantId, key);
      await loadData();
    } catch (err: any) {
      alert(`Delete variable failed: ${err?.message}`);
    }
  };

  // Handle Add Secret
  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretForm.name.trim()) return;
    setIsAddingSecret(true);
    try {
      await api.superadmin.addTenantSecret(tenantId, {
        name: secretForm.name.trim(),
        environment: secretForm.environment,
        type: secretForm.type,
      });
      setIsSecretModalOpen(false);
      setSecretForm({ name: '', environment: 'Production', type: 'Database' });
      await loadData();
    } catch (err: any) {
      alert(`Add secret failed: ${err?.message}`);
    } finally {
      setIsAddingSecret(false);
    }
  };

  // Handle Delete Secret
  const handleDeleteSecret = async (name: string) => {
    if (!confirm(`Delete secret reference "${name}"?`)) return;
    try {
      await api.superadmin.deleteTenantSecret(tenantId, name);
      setManagedSecret(null);
      await loadData();
    } catch (err: any) {
      alert(`Delete secret failed: ${err?.message}`);
    }
  };

  // Handle Isolation Configure Save
  const handleSaveIsolationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isolationConfigModal) return;
    setIsUpdatingIsolation(true);
    try {
      await api.superadmin.configureTenantIsolation(tenantId, {
        isolation_type: isolationConfigModal.type || isolationConfigModal.name,
        status: isolationConfigModal.status || 'Enabled',
        description: isolationConfigModal.description || '',
      });
      setIsolationConfigModal(null);
      await loadData();
    } catch (err: any) {
      alert(`Configure isolation failed: ${err?.message}`);
    } finally {
      setIsUpdatingIsolation(false);
    }
  };

  // Primary Level 1 Navigation Tabs
  const primaryTabs = [
    { id: 'overview', label: 'Overview', href: `/superadmin/tenants/${tenantId}` },
    { id: 'members', label: 'Members', href: `/superadmin/tenants/${tenantId}?tab=members` },
    { id: 'repositories', label: 'Repositories', href: `/superadmin/tenants/${tenantId}?tab=repositories` },
    { id: 'integrations', label: 'Integrations', href: `/superadmin/tenants/${tenantId}/integrations` },
    { id: 'resources', label: 'Resources', href: `/superadmin/tenants/${tenantId}/resources`, active: true },
    { id: 'billing', label: 'Billing', href: `/superadmin/tenants/${tenantId}?tab=billing` },
    { id: 'activity', label: 'Activity', href: `/superadmin/tenants/${tenantId}?tab=activity` },
  ];

  // Secondary Level 2 Sub-tabs under Resources (5.1 to 5.5)
  const secondaryTabs = [
    { id: 'overview', label: 'Resources Overview' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'quotas', label: 'Quotas' },
    { id: 'isolation', label: 'Isolation' },
    { id: 'environment', label: 'Environment' },
  ];

  const overview = resourcesData?.resources_overview || {};
  const infra = resourcesData?.infrastructure || {};
  const quotas = resourcesData?.quotas || {};
  const isolation = resourcesData?.isolation || {};
  const envs = resourcesData?.environments || {};

  return (
    <SuperAdminShell>
      <div className="space-y-6 pb-12">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Top Header Card & Breadcrumb (TechCorp)                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {/* Breadcrumb */}
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
            <span className="text-slate-900 font-semibold">Resources &amp; Isolation</span>
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
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setIsQuotaModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Update Quotas</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setIsEnvModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Environment</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setIsVarModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    <span>Add Environment Variable</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setIsSecretModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Add Secret Reference</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      loadData();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh Telemetry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Primary Level-1 Navigation Tabs Bar                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-8 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
          {primaryTabs.map((tab) => {
            const isTabActive = tab.id === 'resources';
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-3 transition-colors relative whitespace-nowrap ${
                  isTabActive
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600 -mb-px'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Secondary Level-2 Sub-tabs Bar (Overview, Infrastructure, Quotas...) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium overflow-x-auto">
          {secondaryTabs.map((subTab) => {
            const isSubActive = activeSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={`pb-2.5 transition-colors relative whitespace-nowrap ${
                  isSubActive
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600 -mb-px'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {subTab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 5.1: RESOURCES OVERVIEW                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            {/* 5 KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Resources */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Resources</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {overview?.kpis?.total_resources ?? 248}
                  </div>
                </div>
              </div>

              {/* Card 2: Compute */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Compute</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {overview?.kpis?.compute ?? 48}
                  </div>
                </div>
              </div>

              {/* Card 3: Storage */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Storage</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {overview?.kpis?.storage ?? '12 TB'}
                  </div>
                </div>
              </div>

              {/* Card 4: Network */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Network</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {overview?.kpis?.network ?? 6}
                  </div>
                </div>
              </div>

              {/* Card 5: Databases */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Databases</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {overview?.kpis?.databases ?? 8}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row: Resource Usage & Resource Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Resource Usage Chart Card (8 cols) */}
              <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Resource Usage</h3>
                  <div className="relative">
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white shadow-sm"
                    >
                      <option value="Last 30 days">Last 30 days</option>
                      <option value="Last 7 days">Last 7 days</option>
                      <option value="Last 90 days">Last 90 days</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* SVG Area Wave Chart */}
                <div className="w-full h-48 relative flex">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between text-[10px] text-slate-400 font-mono pr-2 pb-5 select-none text-right w-10">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  <div className="flex-1 relative pb-5">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="0" x2="500" y2="0" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="160" x2="500" y2="160" stroke="#F1F5F9" strokeWidth="1" />

                      {/* Area Curves */}
                      {/* Storage Wave */}
                      <path
                        d="M 0 135 C 70 130, 140 120, 210 125 C 280 130, 350 115, 420 120 L 500 110 L 500 160 L 0 160 Z"
                        fill="url(#storageGrad)"
                      />
                      <path
                        d="M 0 135 C 70 130, 140 120, 210 125 C 280 130, 350 115, 420 120 L 500 110"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                      />

                      {/* Memory Wave */}
                      <path
                        d="M 0 110 C 75 90, 150 105, 225 80 C 300 95, 375 75, 450 70 L 500 60 L 500 160 L 0 160 Z"
                        fill="url(#memGrad)"
                      />
                      <path
                        d="M 0 110 C 75 90, 150 105, 225 80 C 300 95, 375 75, 450 70 L 500 60"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2"
                      />

                      {/* CPU Wave */}
                      <path
                        d="M 0 85 C 80 50, 160 70, 240 45 C 320 60, 400 40, 470 30 L 500 25 L 500 160 L 0 160 Z"
                        fill="url(#cpuGrad)"
                      />
                      <path
                        d="M 0 85 C 80 50, 160 70, 240 45 C 320 60, 400 40, 470 30 L 500 25"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between pl-10 pr-2 text-[11px] text-slate-400 font-medium">
                  <span>Oct 01</span>
                  <span>Oct 05</span>
                  <span>Oct 10</span>
                  <span>Oct 15</span>
                  <span>Oct 20</span>
                  <span>Oct 25</span>
                  <span>Oct 30</span>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Memory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Storage</span>
                  </div>
                </div>
              </div>

              {/* Resource Distribution Donut Card (4 cols) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Resource Distribution</h3>

                <div className="flex items-center justify-between gap-4 my-auto">
                  {/* Donut Chart */}
                  <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="14" fill="none" />
                      {/* Storage (39%) - #0EA5E9 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#0EA5E9"
                        strokeWidth="14"
                        strokeDasharray="93 239"
                        strokeDashoffset="0"
                        fill="none"
                      />
                      {/* Compute (19%) - #3B82F6 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#3B82F6"
                        strokeWidth="14"
                        strokeDasharray="45 239"
                        strokeDashoffset="-93"
                        fill="none"
                      />
                      {/* Databases (13%) - #8B5CF6 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#8B5CF6"
                        strokeWidth="14"
                        strokeDasharray="31 239"
                        strokeDashoffset="-138"
                        fill="none"
                      />
                      {/* Network (10%) - #10B981 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#10B981"
                        strokeWidth="14"
                        strokeDasharray="24 239"
                        strokeDashoffset="-169"
                        fill="none"
                      />
                      {/* Others (19%) - #64748B */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#64748B"
                        strokeWidth="14"
                        strokeDasharray="46 239"
                        strokeDashoffset="-193"
                        fill="none"
                      />
                    </svg>
                    {/* Donut Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-extrabold text-slate-900 leading-none">248</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-slate-600 font-medium">Compute</span>
                      </div>
                      <span className="font-semibold text-slate-900">48 (19%)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="text-slate-600 font-medium">Storage</span>
                      </div>
                      <span className="font-semibold text-slate-900">96 (39%)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-slate-600 font-medium">Databases</span>
                      </div>
                      <span className="font-semibold text-slate-900">32 (13%)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600 font-medium">Network</span>
                      </div>
                      <span className="font-semibold text-slate-900">24 (10%)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span className="text-slate-600 font-medium">Others</span>
                      </div>
                      <span className="font-semibold text-slate-900">48 (19%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Top Resource Consumers & Key Information */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Resource Consumers Table (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900">Top Resource Consumers</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Resource</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Usage</th>
                      <th className="py-3 px-4">Limit</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(overview?.top_consumers || []).map((row: any) => {
                      let Icon = Server;
                      let iconBox = 'bg-blue-50 text-blue-600';
                      if (row.type === 'Database') {
                        Icon = Database;
                        iconBox = 'bg-purple-50 text-purple-600';
                      } else if (row.type === 'Compute') {
                        Icon = Cpu;
                        iconBox = 'bg-blue-50 text-blue-600';
                      } else if (row.type === 'Storage') {
                        Icon = Folder;
                        iconBox = 'bg-sky-50 text-sky-600';
                      } else if (row.type === 'Network') {
                        Icon = Network;
                        iconBox = 'bg-slate-100 text-slate-600';
                      }

                      return (
                        <tr key={row.resource} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg ${iconBox} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-slate-900">{row.resource}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{row.type}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{row.usage}</td>
                          <td className="py-3 px-4 text-slate-500">{row.limit}</td>
                          <td className="py-3 px-5 text-right">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Key Information Card (4 cols) */}
              <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Key Information</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Region</span>
                    <span className="font-semibold text-slate-900">
                      {overview?.key_information?.region || 'ap-south-1 (Mumbai)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Total Nodes</span>
                    <span className="font-semibold text-slate-900">
                      {overview?.key_information?.total_nodes ?? 12}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Namespaces</span>
                    <span className="font-semibold text-slate-900">
                      {overview?.key_information?.namespaces ?? 8}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Storage Classes</span>
                    <span className="font-semibold text-slate-900">
                      {overview?.key_information?.storage_classes ?? 3}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Network Policies</span>
                    <span className="font-semibold text-slate-900">
                      {overview?.key_information?.network_policies ?? 6}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="font-mono text-slate-700">
                      {overview?.key_information?.last_updated || '12 Mar 2024, 10:24 AM'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 5.2: INFRASTRUCTURE                                          */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'infrastructure' && (
          <div className="space-y-6">
            {/* 5 KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Clusters</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {infra?.kpis?.clusters ?? 2}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Nodes</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {infra?.kpis?.nodes ?? 12}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">CPU Capacity</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {infra?.kpis?.cpu_capacity ?? '96 vCPU'}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Memory Capacity</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {infra?.kpis?.memory_capacity ?? '384 GB'}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Storage Capacity</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {infra?.kpis?.storage_capacity ?? '12 TB'}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Kubernetes Clusters & Node Groups Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table 1: Kubernetes Clusters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900">Kubernetes Clusters</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Version</th>
                      <th className="py-3 px-4">Nodes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(infra?.kubernetes_clusters || []).map((cluster: any) => (
                      <tr key={cluster.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-5 font-semibold text-slate-900">{cluster.name}</td>
                        <td className="py-3 px-4 text-slate-600">{cluster.region}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{cluster.version}</td>
                        <td className="py-3 px-4 text-slate-600">{cluster.nodes}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={cluster.status} />
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => setViewItemModal({ title: `Cluster: ${cluster.name}`, data: cluster })}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table 2: Node Groups */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900">Node Groups</h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3 px-4">Instance Type</th>
                      <th className="py-3 px-4">Nodes</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(infra?.node_groups || []).map((ng: any) => (
                      <tr key={ng.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-5 font-semibold text-slate-900">{ng.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{ng.instance_type}</td>
                        <td className="py-3 px-4 text-slate-600">{ng.nodes}</td>
                        <td className="py-3 px-5 text-right">
                          <StatusBadge status={ng.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Infrastructure Components */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-3">Infrastructure Components</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Component 1: Compute */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Compute</h3>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    <p>12 Nodes</p>
                    <p>96 vCPU</p>
                    <p>384 GB RAM</p>
                  </div>
                </div>

                {/* Component 2: Storage */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Folder className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Storage</h3>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    <p>3 Storage Classes</p>
                    <p>12 TB Total</p>
                    <p>6 PVs</p>
                  </div>
                </div>

                {/* Component 3: Networking */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Network className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Networking</h3>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    <p>2 VPCs</p>
                    <p>6 Subnets</p>
                    <p>6 Network Policies</p>
                  </div>
                </div>

                {/* Component 4: Databases */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Databases</h3>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    <p>3 Instances</p>
                    <p>8 TB Total</p>
                    <p>Automated Backups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 5.3: QUOTAS                                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'quotas' && (
          <div className="space-y-6">
            {/* 5 KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Repositories */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Repositories</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {quotas?.kpis?.repositories?.limit ?? 500}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {quotas?.kpis?.repositories?.label || '128 used (26%)'}
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Members</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {quotas?.kpis?.members?.limit ?? 100}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {quotas?.kpis?.members?.label || '48 used (48%)'}
                  </div>
                </div>
              </div>

              {/* Scan Credits */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Scan Credits</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {quotas?.kpis?.scan_credits?.limit_display || '100,000'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {quotas?.kpis?.scan_credits?.label || '68,000 used (68%)'}
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Storage</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {quotas?.kpis?.storage?.limit || '10 TB'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {quotas?.kpis?.storage?.label || '2.7 TB used (27%)'}
                  </div>
                </div>
              </div>

              {/* Compute */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Compute (vCPU)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {quotas?.kpis?.compute?.limit || '50 vCPU'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {quotas?.kpis?.compute?.label || '22 used (44%)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Table: Resource Quotas */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Resource Quotas</h3>
                <button
                  onClick={() => setIsQuotaModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Update Quotas</span>
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Resource</th>
                    <th className="py-3 px-4">Used</th>
                    <th className="py-3 px-4">Limit</th>
                    <th className="py-3 px-4 w-72">Usage</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(quotas?.table || []).map((row: any) => {
                    const isWarning = row.status === 'Warning';
                    return (
                      <tr key={row.resource} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-900">{row.resource}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">{row.used}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">{row.limit}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-right font-semibold text-slate-700">
                              {row.usage_percent}%
                            </span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isWarning ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, row.usage_percent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 5.4: ISOLATION                                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'isolation' && (
          <div className="space-y-6">
            {/* Top Section: Isolation Status Cards (2x3 Grid matching panel 5.4) */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">Isolation Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isolation?.status_cards || [
                  { id: 'iso-namespace', name: 'Namespace Isolation', icon: 'Layers', color: 'purple', status: 'Enabled' },
                  { id: 'iso-resource', name: 'Resource Isolation', icon: 'Cpu', color: 'emerald', status: 'Enabled' },
                  { id: 'iso-storage', name: 'Storage Isolation', icon: 'HardDrive', color: 'amber', status: 'Enabled' },
                  { id: 'iso-secrets', name: 'Secrets Isolation', icon: 'Lock', color: 'teal', status: 'Enabled' },
                  { id: 'iso-database', name: 'Database Isolation', icon: 'Database', color: 'blue', status: 'Enabled' },
                  { id: 'iso-network', name: 'Network Isolation', icon: 'Network', color: 'indigo', status: 'Enabled' },
                ]).map((card: any) => {
                  let Icon = Layers;
                  if (card.icon === 'Cpu') Icon = Cpu;
                  if (card.icon === 'HardDrive') Icon = HardDrive;
                  if (card.icon === 'Lock') Icon = Lock;
                  if (card.icon === 'Database') Icon = Database;
                  if (card.icon === 'Network') Icon = Network;

                  let colorStyle = 'bg-purple-50 text-purple-600';
                  if (card.color === 'emerald') colorStyle = 'bg-emerald-50 text-emerald-600';
                  if (card.color === 'amber') colorStyle = 'bg-amber-50 text-amber-600';
                  if (card.color === 'teal') colorStyle = 'bg-teal-50 text-teal-600';
                  if (card.color === 'blue') colorStyle = 'bg-blue-50 text-blue-600';
                  if (card.color === 'indigo') colorStyle = 'bg-indigo-50 text-indigo-600';

                  return (
                    <div
                      key={card.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-lg ${colorStyle} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900">{card.name}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {card.status || 'Enabled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Section: Isolation Configuration Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900">Isolation Configuration</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Isolation Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(isolation?.configurations || []).map((row: any) => (
                    <tr key={row.id || row.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {row.type || row.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {row.status || 'Enabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{row.description}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setIsolationConfigModal(row)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 5.5: ENVIRONMENT                                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'environment' && (
          <div className="space-y-6">
            {/* Top Table: Environments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Environments</h3>
                <button
                  onClick={() => setIsEnvModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Environment</span>
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Cluster</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">URL</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(envs?.environments || []).map((envItem: any) => (
                    <tr key={envItem.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{envItem.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{envItem.type}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{envItem.cluster}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {envItem.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={envItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-mono text-[11px]"
                        >
                          {envItem.url}
                        </a>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={envItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                          >
                            Open
                          </a>
                          <button
                            onClick={() => setViewItemModal({ title: `Environment: ${envItem.name}`, data: envItem })}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Side-by-Side Tables (Variables & Secrets) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Table: Environment Variables */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Environment Variables</h3>
                    <button
                      onClick={() => setIsVarModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Key</th>
                        <th className="py-3 px-4">Value</th>
                        <th className="py-3 px-4">Environment</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {(envs?.variables || []).map((v: any) => (
                        <tr key={v.id || v.key} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-5 font-semibold text-slate-900">{v.key}</td>
                          <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">{v.value}</td>
                          <td className="py-3 px-4 font-sans">
                            <EnvBadge env={v.environment} />
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setVarForm({ key: v.key, value: v.value, environment: v.environment });
                                  setIsVarModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                                title="Edit Variable"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVariable(v.key)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                title="Delete Variable"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Table: Secrets (References) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Secrets (References)</h3>
                    <button
                      onClick={() => setIsSecretModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Secret</span>
                    </button>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-4">Environment</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(envs?.secrets || [
                        { id: 'sec-1', name: 'DB_PASSWORD', environment: 'Production', type: 'Database' },
                        { id: 'sec-2', name: 'API_KEY', environment: 'All', type: 'API' },
                        { id: 'sec-3', name: 'AWS_CREDENTIALS', environment: 'Production', type: 'Cloud' },
                        { id: 'sec-4', name: 'SLACK_WEBHOOK', environment: 'Staging', type: 'Integration' },
                      ]).map((sec: any) => (
                        <tr key={sec.id || sec.name} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">{sec.name}</td>
                          <td className="py-3.5 px-4">
                            <EnvBadge env={sec.environment} />
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{sec.type}</td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setManagedSecret(sec)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded text-xs font-semibold shadow-sm transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Update Quotas                                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isQuotaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Update Resource Quotas</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust resource allocations and limits for {tenant?.name || 'TechCorp'}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuotaModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuotas} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Repositories</label>
                  <input
                    type="number"
                    value={quotaForm.max_repositories}
                    onChange={(e) => setQuotaForm({ ...quotaForm, max_repositories: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Scan Minutes</label>
                  <input
                    type="number"
                    value={quotaForm.max_scan_minutes}
                    onChange={(e) => setQuotaForm({ ...quotaForm, max_scan_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Storage (GB)</label>
                  <input
                    type="number"
                    value={quotaForm.max_storage_gb}
                    onChange={(e) => setQuotaForm({ ...quotaForm, max_storage_gb: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuotaModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingQuotas}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isUpdatingQuotas ? 'Updating...' : 'Save Quotas'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Add Environment                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isEnvModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add Environment</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provision a new isolated runtime environment for this tenant.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEnvModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddEnvironment} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Environment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sandbox, QA, Staging-2"
                    value={envForm.name}
                    onChange={(e) => setEnvForm({ ...envForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scan Schedule</label>
                  <select
                    value={envForm.scan_schedule}
                    onChange={(e) => setEnvForm({ ...envForm, scan_schedule: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Continuous">Continuous (Default)</option>
                    <option value="Daily">Daily Scheduled</option>
                    <option value="On Push">On Push / Commit</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEnvModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingEnv}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isAddingEnv ? 'Creating...' : 'Create Environment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Add Environment Variable                                     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isVarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add Environment Variable</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Define a key-value pair for this tenant's execution context.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVarModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddVariable} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Variable Key</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. API_URL, LOG_LEVEL"
                    value={varForm.key}
                    onChange={(e) => setVarForm({ ...varForm, key: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Variable Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://api.techcorp.com, info"
                    value={varForm.value}
                    onChange={(e) => setVarForm({ ...varForm, value: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Environment</label>
                  <select
                    value={varForm.environment}
                    onChange={(e) => setVarForm({ ...varForm, environment: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Production">Production Only</option>
                    <option value="Staging">Staging Only</option>
                    <option value="Development">Development Only</option>
                    <option value="All">All Environments</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsVarModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingVar}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isAddingVar ? 'Saving...' : 'Save Variable'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Add Secret Reference                                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isSecretModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add Secret Reference</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Register an encrypted reference (vault pointer) for secure runtime execution.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSecretModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSecret} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Secret Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DB_PASSWORD, API_KEY, AWS_CREDENTIALS"
                    value={secretForm.name}
                    onChange={(e) => setSecretForm({ ...secretForm, name: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Environment</label>
                  <select
                    value={secretForm.environment}
                    onChange={(e) => setSecretForm({ ...secretForm, environment: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                    <option value="All">All</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Secret Type</label>
                  <select
                    value={secretForm.type}
                    onChange={(e) => setSecretForm({ ...secretForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Database">Database</option>
                    <option value="API">API</option>
                    <option value="Cloud">Cloud</option>
                    <option value="Integration">Integration</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSecretModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingSecret}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isAddingSecret ? 'Saving...' : 'Add Secret'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Manage Secret Reference                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {managedSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{managedSecret.name}</h3>
                    <p className="text-[11px] text-slate-500">Secret Reference Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setManagedSecret(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Name</span>
                  <span className="font-mono font-semibold text-slate-900">{managedSecret.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Environment</span>
                  <EnvBadge env={managedSecret.environment} />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Type</span>
                  <span className="font-semibold text-slate-900">{managedSecret.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">KMS Key</span>
                  <span className="font-mono text-slate-700">arn:aws:kms:ap-south-1:tenant-vault</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Synchronized
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleDeleteSecret(managedSecret.name)}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                >
                  Revoke Secret
                </button>
                <button
                  onClick={() => setManagedSecret(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: Configure Isolation                                          */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isolationConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Configure {isolationConfigModal.type || isolationConfigModal.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deterministic isolation parameters for {tenant?.name || 'TechCorp'}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsolationConfigModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveIsolationConfig} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Isolation Status</label>
                  <select
                    value={isolationConfigModal.status || 'Enabled'}
                    onChange={(e) =>
                      setIsolationConfigModal({ ...isolationConfigModal, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Enabled">Enabled (Strictly Enforced)</option>
                    <option value="Permissive">Permissive (Audit Mode)</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description / Policy Rule</label>
                  <textarea
                    rows={3}
                    value={isolationConfigModal.description || ''}
                    onChange={(e) =>
                      setIsolationConfigModal({ ...isolationConfigModal, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Compliance &amp; OPA Directives:</p>
                  <p>• Cross-tenant traffic is blocked at the network interface.</p>
                  <p>• Dedicated encryption keys with automated KMS rotation.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsolationConfigModal(null)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingIsolation}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isUpdatingIsolation ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Modal: View Item Details                                            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {viewItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{viewItemModal.title}</h3>
                <button
                  onClick={() => setViewItemModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-2 text-xs">
                {Object.entries(viewItemModal.data || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-semibold text-slate-900">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewItemModal(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
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
