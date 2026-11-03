'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle2,
  Activity,
  ChevronRight,
  ChevronDown,
  Lock,
  Key,
  Layers,
  Server,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Edit,
  Database,
  ShieldCheck,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sliders,
  FileText,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantLifecyclePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.tenantId;
  const router = useRouter();

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'status' | 'retention' | 'deletion' | 'audit'>('status');

  // Backend Data
  const [tenant, setTenant] = useState<any>(null);
  const [serviceHealth, setServiceHealth] = useState<any>({
    platform_services: { name: 'Platform Services', status: 'Healthy' },
    integrations: { name: 'Integrations', status: 'Healthy' },
    infrastructure: { name: 'Infrastructure', status: 'Healthy' },
    security_scanners: { name: 'Security Scanners', status: 'Degraded' },
    billing: { name: 'Billing', status: 'Healthy' },
  });
  const [retentionItems, setRetentionItems] = useState<any[]>([
    { id: 'ret-1', data_type: 'Logs (Platform)', period: '90 days', usage: '25 GB', status: 'Enabled' },
    { id: 'ret-2', data_type: 'Scan Results', period: '180 days', usage: '12 GB', status: 'Enabled' },
    { id: 'ret-3', data_type: 'Audit Logs', period: '365 days', usage: '8 GB', status: 'Enabled' },
    { id: 'ret-4', data_type: 'User Activity', period: '365 days', usage: '5 GB', status: 'Enabled' },
    { id: 'ret-5', data_type: 'Integrations Data', period: '180 days', usage: '3 GB', status: 'Enabled' },
    { id: 'ret-6', data_type: 'Build Artifacts (Metadata)', period: '90 days', usage: '1 GB', status: 'Enabled' },
    { id: 'ret-7', data_type: 'Support Tickets', period: '365 days', usage: '500 MB', status: 'Enabled' },
  ]);
  const [isArchiveEnabled, setIsArchiveEnabled] = useState(true);
  const [checklist, setChecklist] = useState<any[]>([
    { id: 'chk-1', title: 'Revoke all active sessions', subtitle: 'Terminate all user sessions and API tokens.', status: 'Pending' },
    { id: 'chk-2', title: 'Disconnect external integrations', subtitle: 'Remove connections to Git, cloud, CI/CD and other providers.', status: 'Pending' },
    { id: 'chk-3', title: 'Archive important data (optional)', subtitle: 'Download and archive data if required.', status: 'Optional' },
    { id: 'chk-4', title: 'Remove provisioned infrastructure', subtitle: 'Delete clusters, namespaces and cloud resources.', status: 'Pending' },
    { id: 'chk-5', title: 'Confirm tenant deletion', subtitle: 'Type tenant name to confirm deletion.', status: 'Pending' },
  ]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(124);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [userFilter, setUserFilter] = useState('All Users');
  const [timeFilter, setTimeFilter] = useState('Last 30 days');

  // Loading & Action State
  const [isLoading, setIsLoading] = useState(true);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isUpdatePlanModalOpen, setIsUpdatePlanModalOpen] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState('Enterprise');
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isReprovisionModalOpen, setIsReprovisionModalOpen] = useState(false);
  const [isEditRetentionModalOpen, setIsEditRetentionModalOpen] = useState(false);
  const [selectedRetentionItem, setSelectedRetentionItem] = useState<any>(null);
  const [newRetentionPeriod, setNewRetentionPeriod] = useState('90 days');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveBucket, setArchiveBucket] = useState('s3://antigravity-cold-archives/ten-techcorp');

  // Deletion Tab State
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [confirmTenantName, setConfirmTenantName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch Real Lifecycle & Activity Data
  // ─────────────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lifecycleRes, activityRes] = await Promise.allSettled([
        api.superadmin.getTenantLifecycle(tenantId),
        api.superadmin.getTenantActivity(tenantId),
      ]);

      if (lifecycleRes.status === 'fulfilled' && lifecycleRes.value) {
        const data = lifecycleRes.value;
        if (data.tenant) setTenant(data.tenant);
        if (data.service_health) setServiceHealth(data.service_health);
        if (data.retention_configuration) setRetentionItems(data.retention_configuration);
        if (data.archive_settings) setIsArchiveEnabled(data.archive_settings.enabled ?? true);
        if (data.checklist) setChecklist(data.checklist);
      } else {
        // Fallback to tenant details
        const detailsRes = await api.superadmin.getTenantDetails(tenantId).catch(() => null);
        if (detailsRes?.tenant) {
          setTenant({
            ...detailsRes.tenant,
            region: 'ap-south-1 (Mumbai)',
            environment: 'Production',
            tenant_id: `ten_${(detailsRes.tenant.id || '01HBJ3K9Z35').replace(/-/g, '').slice(0, 11).toUpperCase()}`,
            last_activity: '12 Oct 2024, 04:22 PM',
            created_at: '12 Jan 2024, 10:24 AM',
          });
        }
      }

      if (activityRes.status === 'fulfilled' && activityRes.value) {
        setAuditLogs(activityRes.value.items || activityRes.value.activities || []);
        if (activityRes.value.total) setAuditTotal(activityRes.value.total);
      }
    } catch (err: any) {
      console.error('Failed to load lifecycle info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTogglePause = async () => {
    setActionLoading(true);
    try {
      if (tenant?.status === 'Active' || tenant?.status === 'ACTIVE') {
        await api.superadmin.suspendTenant(tenantId, 'Paused via Lifecycle Quick Actions console');
        showToast('Tenant has been paused for maintenance.');
      } else {
        await api.superadmin.reinstateTenant(tenantId);
        showToast('Tenant has been reinstated to active operational status.');
      }
      setIsPauseModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Action failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    setActionLoading(true);
    try {
      await api.superadmin.updateTenantPlan(tenantId, { plan: selectedNewPlan.toUpperCase() });
      showToast(`Subscription plan updated to ${selectedNewPlan}.`);
      setIsUpdatePlanModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Plan update failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateSecrets = async () => {
    setActionLoading(true);
    try {
      await api.superadmin.rotateTenantSecrets(tenantId);
      showToast('All tenant cryptographic keys and database credentials rotated.');
      setIsRotateModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Secret rotation failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprovisionTenant = async () => {
    setActionLoading(true);
    try {
      await api.superadmin.reprovisionTenant(tenantId);
      showToast('Tenant infrastructure reprovisioning pipeline queued successfully.');
      setIsReprovisionModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Reprovisioning failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRetentionItem = async () => {
    if (!selectedRetentionItem) return;
    setActionLoading(true);
    try {
      await api.superadmin.updateRetentionItem(tenantId, selectedRetentionItem.id, newRetentionPeriod);
      showToast(`Retention period for ${selectedRetentionItem.data_type} set to ${newRetentionPeriod}.`);
      setIsEditRetentionModalOpen(false);
      setSelectedRetentionItem(null);
      await loadData();
    } catch (err: any) {
      alert(`Retention update failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    const nextVal = !isArchiveEnabled;
    setIsArchiveEnabled(nextVal);
    try {
      await api.superadmin.updateArchiveSettings(tenantId, nextVal);
      showToast(`Long-term archive storage ${nextVal ? 'enabled' : 'disabled'}.`);
      await loadData();
    } catch (err: any) {
      setIsArchiveEnabled(!nextVal);
      alert(`Failed to update archive settings: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleSaveArchiveSettings = async () => {
    setActionLoading(true);
    try {
      await api.superadmin.updateArchiveSettings(tenantId, isArchiveEnabled);
      showToast('Archival storage bucket and policy configuration saved.');
      setIsArchiveModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Archive configuration failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'Completed' ? (item.title.includes('optional') ? 'Optional' : 'Pending') : 'Completed';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleDeleteTenant = async () => {
    const expectedName = tenant?.name || 'TechCorp';
    if (confirmTenantName !== expectedName && confirmTenantName !== 'DELETE') {
      alert(`Please type "${expectedName}" or "DELETE" to confirm.`);
      return;
    }
    if (!confirm(`CRITICAL WARNING: Are you sure you want to permanently delete organization "${expectedName}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.superadmin.deleteTenant(tenantId, 'DELETE');
      showToast(`Organization ${expectedName} deleted successfully. Redirecting...`);
      setTimeout(() => {
        router.push('/superadmin/tenants');
      }, 1500);
    } catch (err: any) {
      alert(`Deletion failed: ${err?.message || 'Error occurred'}`);
      setIsDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Audit Logs
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((ev) => {
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchesAction = (ev.action || '').toLowerCase().includes(q);
        const matchesUser = (ev.user || '').toLowerCase().includes(q);
        const matchesDetails = (ev.details || '').toLowerCase().includes(q);
        const matchesResource = (ev.resource || '').toLowerCase().includes(q);
        if (!matchesAction && !matchesUser && !matchesDetails && !matchesResource) return false;
      }
      if (actionFilter !== 'All Actions') {
        if (!((ev.action || '').toLowerCase().includes(actionFilter.toLowerCase()))) return false;
      }
      if (userFilter !== 'All Users') {
        if (!((ev.user || '').toLowerCase().includes(userFilter.toLowerCase()))) return false;
      }
      return true;
    });
  }, [auditLogs, auditSearch, actionFilter, userFilter]);

  const pagedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * 10;
    return filteredAuditLogs.slice(start, start + 10);
  }, [filteredAuditLogs, auditPage]);

  // Dot color helper for audit actions
  const getActionDotColor = (color: string) => {
    switch (color) {
      case 'emerald':
      case 'green':
        return 'bg-emerald-500';
      case 'rose':
      case 'red':
        return 'bg-rose-500';
      case 'purple':
        return 'bg-purple-500';
      case 'amber':
      case 'yellow':
        return 'bg-amber-500';
      case 'blue':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6 pb-16 font-sans">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Top Header & Breadcrumb (Matches Screenshot Top)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
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
            <span className="text-slate-900 font-semibold">Lifecycle & Deletion</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Black Square Avatar with white letter */}
              <div className="w-11 h-11 rounded-lg bg-black flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'T'}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">
                    {tenant?.name || 'TechCorp'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {tenant?.status || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-medium">
                  <span className="text-slate-500">{tenant?.domain || 'techcorp.com'}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Enterprise Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsActionsDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <span>+ Actions</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isActionsDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs text-slate-700 animate-in fade-in-50 zoom-in-95">
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setIsPauseModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                    <span>{tenant?.status === 'Active' || tenant?.status === 'ACTIVE' ? 'Pause Tenant' : 'Resume Tenant'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setIsUpdatePlanModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Update Plan</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setIsRotateModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Key className="w-3.5 h-3.5 text-purple-500" />
                    <span>Rotate Secrets</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setIsReprovisionModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Server className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reprovision Tenant</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setActiveTab('retention');
                      setIsEditRetentionModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Retention Policy</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      setActiveTab('deletion');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Initiate Deletion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Navigation Subtabs Bar                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'status'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Status & Actions
            {activeTab === 'status' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('retention')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'retention'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Data Retention
            {activeTab === 'retention' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('deletion')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'deletion'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Deletion
            {activeTab === 'deletion' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'audit'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Audit Log
            {activeTab === 'audit' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PANEL 8.1: STATUS & ACTIONS                                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            {/* Top Row: Two Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Card: Tenant Status */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Tenant Status</h2>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {tenant?.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    This tenant is active and fully operational.
                  </p>
                </div>

                {/* 6 Key-Value Fields */}
                <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Created At</span>
                    <span className="text-slate-900 font-semibold">{tenant?.created_at || '12 Jan 2024, 10:24 AM'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Last Activity</span>
                    <span className="text-slate-900 font-semibold">{tenant?.last_activity || '12 Oct 2024, 04:22 PM'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Plan</span>
                    <span className="text-slate-900 font-semibold">{tenant?.plan || 'Enterprise'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Region</span>
                    <span className="text-slate-900 font-semibold">{tenant?.region || 'ap-south-1 (Mumbai)'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Environment</span>
                    <span className="text-slate-900 font-semibold">{tenant?.environment || 'Production'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tenant ID</span>
                    <span className="text-slate-900 font-mono font-medium">{tenant?.tenant_id || 'ten_01HBJ3K9Z35'}</span>
                  </div>
                </div>
              </div>

              {/* Right Card: Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>

                <div className="space-y-3.5">
                  {/* Action 1: Pause Tenant */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                        <Pause className="w-4 h-4 fill-amber-700 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Pause Tenant</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Temporarily suspend access and services.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPauseModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold shadow-xs transition-colors"
                    >
                      Pause
                    </button>
                  </div>

                  {/* Action 2: Update Plan */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                        <Layers className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Update Plan</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Modify plan, quotas or add-ons.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsUpdatePlanModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold shadow-xs transition-colors"
                    >
                      Update
                    </button>
                  </div>

                  {/* Action 3: Rotate Secrets */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0">
                        <Key className="w-4 h-4 text-purple-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Rotate Secrets</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Rotate all tenant-specific credentials.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsRotateModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold shadow-xs transition-colors"
                    >
                      Rotate
                    </button>
                  </div>

                  {/* Action 4: Reprovision Tenant */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                        <Server className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Reprovision Tenant</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Re-run provisioning for this tenant.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsReprovisionModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold shadow-xs transition-colors"
                    >
                      Reprovision
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card: Service Health */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
              <h2 className="text-sm font-bold text-slate-900">Service Health</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {/* 1. Platform Services */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium">Platform Services</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                  </div>
                </div>

                {/* 2. Integrations */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium">Integrations</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                  </div>
                </div>

                {/* 3. Infrastructure */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium">Infrastructure</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                  </div>
                </div>

                {/* 4. Security Scanners */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium">Security Scanners</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-semibold text-amber-700">Degraded</span>
                  </div>
                </div>

                {/* 5. Billing */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-medium">Billing</span>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PANEL 8.2: DATA RETENTION                                           */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            {/* Top Card: Retention Configuration Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Retention Configuration</h2>
                <button
                  onClick={() => {
                    setSelectedRetentionItem(retentionItems[0]);
                    setNewRetentionPeriod(retentionItems[0]?.period || '90 days');
                    setIsEditRetentionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Retention Policy</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-5">Data Type</th>
                      <th className="py-3 px-5">Retention Period</th>
                      <th className="py-3 px-5">Current Usage</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {retentionItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {item.data_type}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">{item.period}</td>
                        <td className="py-3.5 px-5 text-slate-600">{item.usage}</td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.status || 'Enabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => {
                              setSelectedRetentionItem(item);
                              setNewRetentionPeriod(item.period);
                              setIsEditRetentionModalOpen(true);
                            }}
                            className="px-3 py-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded text-xs font-semibold transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row: 2 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Card: Data Retention Policy */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Data Retention Policy</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Configure how long different types of data are retained for this tenant. After the retention period, data will be automatically archived or deleted based on the policy.
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <a
                    href="#docs-retention"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Opening Antigravity Retention and Compliance documentation...');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Learn more
                  </a>
                </div>
              </div>

              {/* Right Card: Archive Settings */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Archive Settings</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Enable archival storage for long-term retention of important data.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isArchiveEnabled}
                      onClick={handleToggleArchive}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isArchiveEnabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isArchiveEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-slate-800">
                      Enable Archive
                    </span>
                  </div>

                  <button
                    onClick={() => setIsArchiveModalOpen(true)}
                    className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded-md text-xs font-semibold transition-colors"
                  >
                    Configure Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PANEL 8.3: DELETION                                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'deletion' && (
          <div className="space-y-6">
            {/* Danger Zone Red Banner */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Danger Zone</h3>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  Tenant deletion will permanently remove all data, configurations, integrations and resources associated with this tenant.
                  <br />
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Two Column Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Card: Pre-Deletion Checklist */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pre-Deletion Checklist</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete all required steps before initiating tenant deletion.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {checklist.map((chk) => (
                    <div
                      key={chk.id}
                      onClick={() => handleToggleChecklistItem(chk.id)}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {chk.status === 'Completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{chk.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{chk.subtitle}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                          chk.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : chk.status === 'Optional'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            chk.status === 'Completed'
                              ? 'bg-emerald-500'
                              : chk.status === 'Optional'
                              ? 'bg-slate-400'
                              : 'bg-amber-500'
                          }`}
                        ></span>
                        {chk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Card: Deletion Options */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Deletion Options</h3>

                <div className="space-y-3 pt-1">
                  {/* Radio 1: Soft Delete (Recommended) */}
                  <label
                    onClick={() => setDeleteType('soft')}
                    className={`block p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      deleteType === 'soft'
                        ? 'border-blue-600 bg-blue-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="delete_type"
                        checked={deleteType === 'soft'}
                        onChange={() => setDeleteType('soft')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Soft Delete (Recommended)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Disables tenant access and retains data for a defined period (e.g., 30 days) before permanent deletion.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Radio 2: Hard Delete */}
                  <label
                    onClick={() => setDeleteType('hard')}
                    className={`block p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      deleteType === 'hard'
                        ? 'border-rose-600 bg-rose-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="delete_type"
                        checked={deleteType === 'hard'}
                        onChange={() => setDeleteType('hard')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Hard Delete
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Permanently delete all data immediately. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Confirm Name Input */}
                <div className="pt-2 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-rose-600">
                    Type tenant name to confirm
                  </label>
                  <input
                    type="text"
                    placeholder={tenant?.name || 'TechCorp'}
                    value={confirmTenantName}
                    onChange={(e) => setConfirmTenantName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-rose-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                {/* Submit Deletion Button */}
                <div className="pt-2">
                  <button
                    disabled={
                      isDeleting ||
                      (confirmTenantName !== (tenant?.name || 'TechCorp') && confirmTenantName !== 'DELETE')
                    }
                    onClick={handleDeleteTenant}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                  >
                    {isDeleting ? 'Initiating Deletion...' : 'Initiate Deletion'}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    This action will be logged and requires final confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PANEL 8.4: AUDIT LOG                                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
            {/* Top Search & Filter Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* All Actions */}
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="All Actions">All Actions</option>
                  <option value="Updated retention policy">Updated retention policy</option>
                  <option value="Paused tenant">Paused tenant</option>
                  <option value="Updated plan">Updated plan</option>
                  <option value="Rotated secrets">Rotated secrets</option>
                  <option value="Reprovisioned tenant">Reprovisioned tenant</option>
                  <option value="Updated integrations">Updated integrations</option>
                  <option value="Modified quota">Modified quota</option>
                  <option value="Enabled archive">Enabled archive</option>
                  <option value="Updated environment">Updated environment</option>
                  <option value="Auto cleanup">Auto cleanup</option>
                </select>

                {/* All Users */}
                <select
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="All Users">All Users</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Rahul Patel">Rahul Patel</option>
                  <option value="Priya Sharma">Priya Sharma</option>
                  <option value="Amit Singh">Amit Singh</option>
                  <option value="Neha Jain">Neha Jain</option>
                  <option value="Karan Mehta">Karan Mehta</option>
                  <option value="System">System</option>
                </select>

                {/* Time Range */}
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="All time">All time</option>
                </select>

                {/* Filter button */}
                <button
                  onClick={() => {
                    setAuditSearch('');
                    setActionFilter('All Actions');
                    setUserFilter('All Users');
                    setTimeFilter('Last 30 days');
                    setAuditPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">User</th>
                    <th className="py-3 px-5">Action</th>
                    <th className="py-3 px-5">Resource</th>
                    <th className="py-3 px-5">Details</th>
                    <th className="py-3 px-5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pagedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No audit events match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    pagedAuditLogs.map((ev, idx) => (
                      <tr key={ev.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {ev.timestamp || ev.time || '12 Oct 2024, 04:22 PM'}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                          {ev.user || 'Super Admin'}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getActionDotColor(
                                ev.dot_color || 'blue'
                              )}`}
                            />
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {ev.resource || 'Tenant'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 max-w-xs truncate">
                          {ev.details}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {ev.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing 1-10 of {auditTotal} audit logs
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  &lt;
                </button>
                {[1, 2, 3, 4, 5].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setAuditPage(pageNum)}
                    className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                      auditPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  disabled={auditPage >= 5}
                  onClick={() => setAuditPage((p) => Math.min(5, p + 1))}
                  className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODALS FOR QUICK ACTIONS & CONFIGURATIONS                           */}
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* 1. Pause Tenant Modal */}
        {isPauseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Pause className="w-4 h-4 fill-amber-600 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {tenant?.status === 'Active' || tenant?.status === 'ACTIVE' ? 'Pause Tenant' : 'Resume Tenant'}
                  </h3>
                </div>
                <button onClick={() => setIsPauseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {tenant?.status === 'Active' || tenant?.status === 'ACTIVE'
                  ? 'Pausing this tenant will immediately invalidate all active user sessions, suspend scheduled security scans, and temporarily disable inbound webhooks.'
                  : 'Resuming this tenant will restore full operational access, resume webhook ingress, and reinstate scheduled scanners.'}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsPauseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleTogglePause}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Processing...' : tenant?.status === 'Active' || tenant?.status === 'ACTIVE' ? 'Confirm Pause' : 'Confirm Resume'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Update Plan Modal */}
        {isUpdatePlanModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Update Subscription Plan</h3>
                </div>
                <button onClick={() => setIsUpdatePlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {['Starter', 'Team', 'Enterprise', 'Custom'].map((p) => (
                  <label
                    key={p}
                    onClick={() => setSelectedNewPlan(p)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNewPlan === p
                        ? 'border-blue-600 bg-blue-50/20 text-blue-950 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{p} Plan</span>
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedNewPlan === p}
                      onChange={() => setSelectedNewPlan(p)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsUpdatePlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleUpdatePlan}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Updating...' : 'Save Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Rotate Secrets Modal */}
        {isRotateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Key className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Rotate Tenant Credentials</h3>
                </div>
                <button onClick={() => setIsRotateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This will trigger key rotation for encryption keys, webhook secrets, and database credentials for{' '}
                <span className="font-bold text-slate-900">{tenant?.name || 'TechCorp'}</span>. Any active integrations using raw static tokens will need to receive updated credentials.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsRotateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleRotateSecrets}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Rotating...' : 'Rotate Secrets'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Reprovision Tenant Modal */}
        {isReprovisionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Server className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Reprovision Infrastructure</h3>
                </div>
                <button onClick={() => setIsReprovisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This will enqueue a background pipeline to verify Kubernetes namespace isolation, network policies, cloud storage buckets, and security scanner agents for{' '}
                <span className="font-bold text-slate-900">{tenant?.name || 'TechCorp'}</span>.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsReprovisionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleReprovisionTenant}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Queueing...' : 'Start Reprovisioning'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Edit Retention Item Modal */}
        {isEditRetentionModalOpen && selectedRetentionItem && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Edit className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit {selectedRetentionItem.data_type} Retention
                  </h3>
                </div>
                <button onClick={() => setIsEditRetentionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Retention Period
                  </label>
                  <select
                    value={newRetentionPeriod}
                    onChange={(e) => setNewRetentionPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="180 days">180 days</option>
                    <option value="365 days">365 days (1 Year)</option>
                    <option value="730 days">730 days (2 Years)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsEditRetentionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleSaveRetentionItem}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Configure Archive Modal */}
        {isArchiveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Database className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Configure Archival Storage</h3>
                </div>
                <button onClick={() => setIsArchiveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Destination S3 Bucket ARN
                  </label>
                  <input
                    type="text"
                    value={archiveBucket}
                    onChange={(e) => setArchiveBucket(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Storage Class
                  </label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800">
                    <option>S3 Glacier Flexible Retrieval</option>
                    <option>S3 Glacier Deep Archive</option>
                    <option>S3 Standard-Infrequent Access</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleSaveArchiveSettings}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
