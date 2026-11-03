'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  Building2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  Layers,
  BarChart3,
  Check,
  X,
  MoreHorizontal,
  Server,
  Cpu,
  Shield,
  Eye,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantProvisioningPage() {
  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'jobs' | 'in_progress' | 'completed' | 'failed'>('jobs');

  // Backend Data
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    all: 86,
    total: 86,
    in_progress: 12,
    completed: 68,
    failed: 6,
    in_progress_stats: {
      in_progress: 12,
      queued: 4,
      running: 6,
      waiting: 2,
    },
    completed_stats: {
      completed: 68,
      avg_duration: '6m 24s',
      success_rate: '92%',
      this_week: 24,
    },
    failed_stats: {
      failed: 6,
      failure_rate: '8%',
      avg_time_to_fail: '4m 18s',
      retry_available: 4,
    },
  });

  // Filters for Tab 1 (Provisioning Jobs)
  const [jobSearch, setJobSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [jobTypeFilter, setJobTypeFilter] = useState('All Job Types');
  const [timeFilter, setTimeFilter] = useState('Last 30 days');
  const [pageJobs, setPageJobs] = useState(1);

  // Filters for Tab 2 (In Progress)
  const [pageInProgress, setPageInProgress] = useState(1);

  // Filters for Tab 3 (Completed Tasks)
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedTypeFilter, setCompletedTypeFilter] = useState('All Job Types');
  const [completedTenantFilter, setCompletedTenantFilter] = useState('All Tenants');
  const [completedTimeFilter, setCompletedTimeFilter] = useState('Last 30 days');
  const [pageCompleted, setPageCompleted] = useState(1);

  // Filters for Tab 4 (Failed Tasks)
  const [failedSearch, setFailedSearch] = useState('');
  const [failureReasonFilter, setFailureReasonFilter] = useState('All Failure Reasons');
  const [failedTenantFilter, setFailedTenantFilter] = useState('All Tenants');
  const [failedTimeFilter, setFailedTimeFilter] = useState('Last 30 days');
  const [pageFailed, setPageFailed] = useState(1);

  // Loading & State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('TechCorp');
  const [newJobType, setNewJobType] = useState('Full Provisioning');
  const [newPriority, setNewPriority] = useState('Normal');

  const [inspectJob, setInspectJob] = useState<any | null>(null);
  const [retryTargetJob, setRetryTargetJob] = useState<any | null>(null);

  // Row Action Menu Open ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Load Jobs from Real Backend API
  // ─────────────────────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.superadmin.listProvisioningJobs({
        page_size: 100,
      });
      if (res) {
        setJobs(res.items || res.jobs || []);
        if (res.stats) {
          setStats((prev: any) => ({
            ...prev,
            ...res.stats,
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load provisioning jobs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadJobs();
    showToast('Provisioning task queue refreshed.');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateJob = async () => {
    if (!newTenantName.trim()) {
      alert('Please enter a tenant name.');
      return;
    }
    setActionInProgress('create');
    try {
      await api.superadmin.createProvisioningJob({
        tenant_name: newTenantName.trim(),
        job_type: newJobType,
      });
      showToast(`Provisioning job queued for ${newTenantName}.`);
      setIsNewJobModalOpen(false);
      await loadJobs();
    } catch (err: any) {
      alert(`Job creation failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionInProgress(jobId);
    try {
      await api.superadmin.retryProvisioningJob(jobId);
      showToast(`Job ${jobId} re-queued for execution.`);
      setRetryTargetJob(null);
      await loadJobs();
    } catch (err: any) {
      alert(`Retry failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm(`Are you sure you want to cancel job ${jobId}?`)) return;
    setActionInProgress(jobId);
    try {
      await api.superadmin.cancelProvisioningJob(jobId);
      showToast(`Job ${jobId} execution cancelled.`);
      await loadJobs();
    } catch (err: any) {
      alert(`Cancellation failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExportData = (tabName: string, data: any[]) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antigravity-provisioning-${tabName}.json`;
    a.click();
    showToast(`Exported ${data.length} records to JSON.`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Lists for Each Tab
  // ─────────────────────────────────────────────────────────────────────────────

  // Tab 1: All Provisioning Jobs
  const filteredAllJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (jobSearch.trim()) {
        const q = jobSearch.toLowerCase();
        const matchesName = (j.tenant_name || '').toLowerCase().includes(q);
        const matchesId = (j.id || '').toLowerCase().includes(q) || (j.friendly_id || '').toLowerCase().includes(q);
        const matchesType = (j.job_type || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesType) return false;
      }
      if (statusFilter !== 'All Statuses') {
        if ((j.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      if (jobTypeFilter !== 'All Job Types') {
        if ((j.job_type || '').toLowerCase() !== jobTypeFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [jobs, jobSearch, statusFilter, jobTypeFilter]);

  const pagedAllJobs = useMemo(() => {
    const start = (pageJobs - 1) * 8;
    return filteredAllJobs.slice(start, start + 8);
  }, [filteredAllJobs, pageJobs]);

  // Tab 2: In Progress Jobs
  const inProgressJobs = useMemo(() => {
    return jobs.filter((j) => {
      const s = (j.status_raw || j.status || '').toUpperCase();
      return s === 'RUNNING' || s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'QUEUED';
    });
  }, [jobs]);

  const pagedInProgressJobs = useMemo(() => {
    const start = (pageInProgress - 1) * 6;
    return inProgressJobs.slice(start, start + 6);
  }, [inProgressJobs, pageInProgress]);

  // Tab 3: Completed Tasks
  const completedTasks = useMemo(() => {
    return jobs.filter((j) => {
      const s = (j.status_raw || j.status || '').toUpperCase();
      if (s !== 'COMPLETED' && s !== 'SUCCESS') return false;

      if (completedSearch.trim()) {
        const q = completedSearch.toLowerCase();
        const matchesName = (j.tenant_name || '').toLowerCase().includes(q);
        const matchesId = (j.id || '').toLowerCase().includes(q) || (j.friendly_id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }
      if (completedTypeFilter !== 'All Job Types') {
        if ((j.job_type || '').toLowerCase() !== completedTypeFilter.toLowerCase()) return false;
      }
      if (completedTenantFilter !== 'All Tenants') {
        if ((j.tenant_name || '').toLowerCase() !== completedTenantFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [jobs, completedSearch, completedTypeFilter, completedTenantFilter]);

  const pagedCompletedTasks = useMemo(() => {
    const start = (pageCompleted - 1) * 8;
    return completedTasks.slice(start, start + 8);
  }, [completedTasks, pageCompleted]);

  // Tab 4: Failed Tasks
  const failedTasks = useMemo(() => {
    return jobs.filter((j) => {
      const s = (j.status_raw || j.status || '').toUpperCase();
      if (s !== 'FAILED' && s !== 'ERROR') return false;

      if (failedSearch.trim()) {
        const q = failedSearch.toLowerCase();
        const matchesName = (j.tenant_name || '').toLowerCase().includes(q);
        const matchesId = (j.id || '').toLowerCase().includes(q) || (j.friendly_id || '').toLowerCase().includes(q);
        const matchesReason = (j.failure_reason || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesReason) return false;
      }
      if (failureReasonFilter !== 'All Failure Reasons') {
        if ((j.failure_reason || '').toLowerCase() !== failureReasonFilter.toLowerCase()) return false;
      }
      if (failedTenantFilter !== 'All Tenants') {
        if ((j.tenant_name || '').toLowerCase() !== failedTenantFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [jobs, failedSearch, failureReasonFilter, failedTenantFilter]);

  const pagedFailedTasks = useMemo(() => {
    const start = (pageFailed - 1) * 6;
    return failedTasks.slice(start, start + 6);
  }, [failedTasks, pageFailed]);

  // Helper for stylized tenant logo letter / color
  const getTenantAvatar = (name: string, logo?: string) => {
    const letter = logo || (name || 'T')[0].toUpperCase();
    const n = (name || '').toLowerCase();
    if (n.includes('techcorp')) return { bg: 'bg-black text-white', letter: 'T' };
    if (n.includes('acme')) return { bg: 'bg-blue-600 text-white', letter: 'A' };
    if (n.includes('globex')) return { bg: 'bg-emerald-700 text-white', letter: 'G' };
    if (n.includes('initech')) return { bg: 'bg-purple-600 text-white', letter: 'I' };
    if (n.includes('umbrella')) return { bg: 'bg-rose-600 text-white', letter: 'U' };
    if (n.includes('hooli')) return { bg: 'bg-cyan-600 text-white', letter: 'H' };
    if (n.includes('stark')) return { bg: 'bg-slate-900 text-white', letter: 'S' };
    if (n.includes('wayne')) return { bg: 'bg-zinc-900 text-white', letter: 'W' };
    if (n.includes('cyberdyne')) return { bg: 'bg-indigo-600 text-white', letter: 'C' };
    if (n.includes('massive')) return { bg: 'bg-violet-600 text-white', letter: 'M' };
    if (n.includes('wonka')) return { bg: 'bg-amber-600 text-white', letter: 'W' };
    if (n.includes('tyrell')) return { bg: 'bg-teal-700 text-white', letter: 'T' };
    if (n.includes('daily')) return { bg: 'bg-sky-600 text-white', letter: 'D' };
    if (n.includes('oscorp')) return { bg: 'bg-emerald-600 text-white', letter: 'O' };
    if (n.includes('soylent')) return { bg: 'bg-lime-700 text-white', letter: 'S' };
    if (n.includes('lexcorp')) return { bg: 'bg-fuchsia-700 text-white', letter: 'L' };
    if (n.includes('aperture')) return { bg: 'bg-orange-600 text-white', letter: 'A' };
    if (n.includes('black mesa')) return { bg: 'bg-stone-800 text-white', letter: 'B' };
    return { bg: 'bg-slate-800 text-white', letter };
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
        {/* Header & Breadcrumb                                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
            <Link href="/superadmin/tenants" className="hover:text-slate-900 transition-colors">
              Tenant Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">Provisioning Status</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">
                Provisioning Status
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track and manage tenant provisioning jobs and tasks across the platform.
              </p>
            </div>

            {/* Header Right Action Button */}
            <div>
              {activeTab === 'jobs' && (
                <button
                  onClick={() => setIsNewJobModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Provisioning Job</span>
                </button>
              )}

              {activeTab === 'in_progress' && (
                <button
                  onClick={handleManualRefresh}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4 Main Subtabs Bar                                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'jobs'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Provisioning Jobs
            {activeTab === 'jobs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'in_progress'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            In Progress
            {activeTab === 'in_progress' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'completed'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Completed Tasks
            {activeTab === 'completed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('failed')}
            className={`pb-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'failed'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Failed Tasks
            {activeTab === 'failed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: PROVISIONING JOBS (All Jobs)                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <div className="space-y-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search jobs, tenant name, ID..."
                  value={jobSearch}
                  onChange={(e) => {
                    setJobSearch(e.target.value);
                    setPageJobs(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPageJobs(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Failed">Failed</option>
                </select>

                <select
                  value={jobTypeFilter}
                  onChange={(e) => {
                    setJobTypeFilter(e.target.value);
                    setPageJobs(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Job Types">All Job Types</option>
                  <option value="Full Provisioning">Full Provisioning</option>
                  <option value="Update Configuration">Update Configuration</option>
                  <option value="Add Integration">Add Integration</option>
                  <option value="Scale Resources">Scale Resources</option>
                  <option value="Update Plan">Update Plan</option>
                </select>

                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="All time">All time</option>
                </select>

                <button
                  onClick={handleManualRefresh}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs transition-colors"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Total Jobs */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Jobs</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.total || 86}
                  </p>
                </div>
              </div>

              {/* Card 2: In Progress */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">In Progress</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.in_progress || 12}
                  </p>
                </div>
              </div>

              {/* Card 3: Completed */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Completed</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.completed || 68}
                  </p>
                </div>
              </div>

              {/* Card 4: Failed */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Failed</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.failed || 6}
                  </p>
                </div>
              </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-5">Job ID</th>
                      <th className="py-3 px-5">Tenant / Organization</th>
                      <th className="py-3 px-5">Job Type</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Started At</th>
                      <th className="py-3 px-5">Duration</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pagedAllJobs.map((j) => {
                      const avatar = getTenantAvatar(j.tenant_name, j.tenant_logo);
                      const isCompleted = j.status === 'Completed' || j.status_raw === 'COMPLETED';
                      const isInProgress = j.status === 'In Progress' || j.status_raw === 'RUNNING';
                      const isFailed = j.status === 'Failed' || j.status_raw === 'FAILED';

                      return (
                        <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-slate-600 whitespace-nowrap">
                            {j.friendly_id || j.id}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-2xs ${avatar.bg}`}
                              >
                                {avatar.letter}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {j.tenant_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                            {j.job_type}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Completed
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                In Progress
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                            {j.started_at}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                            {j.duration}
                          </td>
                          <td className="py-3.5 px-5 text-right relative">
                            <button
                              onClick={() => setInspectJob(j)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Inspect Task"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing 1-8 of {stats.total || 86} jobs
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pageJobs <= 1}
                    onClick={() => setPageJobs((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPageJobs(num)}
                      className={`w-7 h-7 rounded text-xs font-semibold ${
                        pageJobs === num
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={pageJobs >= 5}
                    onClick={() => setPageJobs((p) => Math.min(5, p + 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: IN PROGRESS                                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'in_progress' && (
          <div className="space-y-5">
            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: In Progress */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">In Progress</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.in_progress_stats?.in_progress || 12}
                  </p>
                </div>
              </div>

              {/* Card 2: Queued */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Queued</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.in_progress_stats?.queued || 4}
                  </p>
                </div>
              </div>

              {/* Card 3: Running */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Running</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.in_progress_stats?.running || 6}
                  </p>
                </div>
              </div>

              {/* Card 4: Waiting */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Waiting</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.in_progress_stats?.waiting || 2}
                  </p>
                </div>
              </div>
            </div>

            {/* In Progress Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-5">Job ID</th>
                      <th className="py-3 px-5">Tenant / Organization</th>
                      <th className="py-3 px-5">Current Step</th>
                      <th className="py-3 px-5 w-44">Progress</th>
                      <th className="py-3 px-5">Started At</th>
                      <th className="py-3 px-5">Elapsed Time</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pagedInProgressJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-slate-600 whitespace-nowrap">
                          {j.friendly_id || j.id}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                          {j.tenant_name}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                          {j.current_step}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden flex-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${j.progress || 50}%` }}
                              />
                            </div>
                            <span className="text-slate-600 font-medium text-[11px] w-8">
                              {j.progress || 50}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {j.started_at}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {j.elapsed_time || j.duration}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => setInspectJob(j)}
                            className="px-3.5 py-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded text-xs font-semibold shadow-2xs transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing 1-6 of {stats.in_progress || 12} in-progress jobs
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pageInProgress <= 1}
                    onClick={() => setPageInProgress((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  {[1, 2].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPageInProgress(num)}
                      className={`w-7 h-7 rounded text-xs font-semibold ${
                        pageInProgress === num
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={pageInProgress >= 2}
                    onClick={() => setPageInProgress((p) => Math.min(2, p + 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: COMPLETED TASKS                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'completed' && (
          <div className="space-y-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search completed tasks..."
                  value={completedSearch}
                  onChange={(e) => {
                    setCompletedSearch(e.target.value);
                    setPageCompleted(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={completedTypeFilter}
                  onChange={(e) => {
                    setCompletedTypeFilter(e.target.value);
                    setPageCompleted(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Job Types">All Job Types</option>
                  <option value="Full Provisioning">Full Provisioning</option>
                  <option value="Scale Resources">Scale Resources</option>
                  <option value="Add Integration">Add Integration</option>
                  <option value="Update Configuration">Update Configuration</option>
                  <option value="Update Plan">Update Plan</option>
                </select>

                <select
                  value={completedTenantFilter}
                  onChange={(e) => {
                    setCompletedTenantFilter(e.target.value);
                    setPageCompleted(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Tenants">All Tenants</option>
                  <option value="TechCorp">TechCorp</option>
                  <option value="Initech">Initech</option>
                  <option value="Stark Industries">Stark Industries</option>
                  <option value="Daily Planet">Daily Planet</option>
                  <option value="Oscorp">Oscorp</option>
                  <option value="Soylent Corp">Soylent Corp</option>
                  <option value="Cyberdyne Systems">Cyberdyne Systems</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                </select>

                <select
                  value={completedTimeFilter}
                  onChange={(e) => setCompletedTimeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="All time">All time</option>
                </select>

                <button
                  onClick={() => handleExportData('completed', completedTasks)}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs transition-colors"
                  title="Export to JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Completed Tasks */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Completed Tasks</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.completed_stats?.completed || 68}
                  </p>
                </div>
              </div>

              {/* Card 2: Avg. Duration */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Avg. Duration</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.completed_stats?.avg_duration || '6m 24s'}
                  </p>
                </div>
              </div>

              {/* Card 3: Success Rate */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Success Rate</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.completed_stats?.success_rate || '92%'}
                  </p>
                </div>
              </div>

              {/* Card 4: This Week */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">This Week</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.completed_stats?.this_week || 24}
                  </p>
                </div>
              </div>
            </div>

            {/* Completed Tasks Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-5">Task ID</th>
                      <th className="py-3 px-5">Tenant / Organization</th>
                      <th className="py-3 px-5">Job Type</th>
                      <th className="py-3 px-5">Completed At</th>
                      <th className="py-3 px-5">Duration</th>
                      <th className="py-3 px-5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pagedCompletedTasks.map((t) => {
                      const avatar = getTenantAvatar(t.tenant_name, t.tenant_logo);

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-slate-600 whitespace-nowrap">
                            {t.friendly_id || t.id}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-2xs ${avatar.bg}`}
                              >
                                {avatar.letter}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {t.tenant_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                            {t.job_type}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                            {t.completed_at || '12 Mar 2024, 10:30 AM'}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                            {t.duration}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setInspectJob(t)}
                              className="px-3.5 py-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded text-xs font-semibold shadow-2xs transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing 1-8 of {stats.completed || 68} completed tasks
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pageCompleted <= 1}
                    onClick={() => setPageCompleted((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPageCompleted(num)}
                      className={`w-7 h-7 rounded text-xs font-semibold ${
                        pageCompleted === num
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    disabled={pageCompleted >= 5}
                    onClick={() => setPageCompleted((p) => Math.min(5, p + 1))}
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 4: FAILED TASKS                                                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'failed' && (
          <div className="space-y-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search failed tasks..."
                  value={failedSearch}
                  onChange={(e) => {
                    setFailedSearch(e.target.value);
                    setPageFailed(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={failureReasonFilter}
                  onChange={(e) => {
                    setFailureReasonFilter(e.target.value);
                    setPageFailed(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Failure Reasons">All Failure Reasons</option>
                  <option value="Invalid API credentials">Invalid API credentials</option>
                  <option value="Resource limit exceeded">Resource limit exceeded</option>
                  <option value="Network timeout">Network timeout</option>
                  <option value="Cluster provisioning failed">Cluster provisioning failed</option>
                  <option value="Database initialization failed">Database initialization failed</option>
                  <option value="Unsupported provider version">Unsupported provider version</option>
                </select>

                <select
                  value={failedTenantFilter}
                  onChange={(e) => {
                    setFailedTenantFilter(e.target.value);
                    setPageFailed(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="All Tenants">All Tenants</option>
                  <option value="Globex">Globex</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                  <option value="LexCorp">LexCorp</option>
                  <option value="Aperture Science">Aperture Science</option>
                  <option value="Black Mesa">Black Mesa</option>
                  <option value="Stark Industries">Stark Industries</option>
                </select>

                <select
                  value={failedTimeFilter}
                  onChange={(e) => setFailedTimeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="All time">All time</option>
                </select>

                <button
                  onClick={() => handleExportData('failed', failedTasks)}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs transition-colors"
                  title="Export to JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Failed Tasks */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Failed Tasks</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.failed_stats?.failed || 6}
                  </p>
                </div>
              </div>

              {/* Card 2: Failure Rate */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Failure Rate</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.failed_stats?.failure_rate || '8%'}
                  </p>
                </div>
              </div>

              {/* Card 3: Avg. Time to Fail */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Avg. Time to Fail</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.failed_stats?.avg_time_to_fail || '4m 18s'}
                  </p>
                </div>
              </div>

              {/* Card 4: Retry Available */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Retry Available</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                    {stats.failed_stats?.retry_available || 4}
                  </p>
                </div>
              </div>
            </div>

            {/* Failed Tasks Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-5">Task ID</th>
                      <th className="py-3 px-5">Tenant / Organization</th>
                      <th className="py-3 px-5">Job Type</th>
                      <th className="py-3 px-5">Failure Reason</th>
                      <th className="py-3 px-5">Failed At</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pagedFailedTasks.map((t) => {
                      const avatar = getTenantAvatar(t.tenant_name, t.tenant_logo);

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-slate-600 whitespace-nowrap">
                            {t.friendly_id || t.id}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-2xs ${avatar.bg}`}
                              >
                                {avatar.letter}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {t.tenant_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                            {t.job_type}
                          </td>
                          <td className="py-3.5 px-5 text-rose-600 font-medium whitespace-nowrap">
                            {t.failure_reason}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                            {t.failed_at || t.started_at}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={actionInProgress === (t.friendly_id || t.id)}
                                onClick={() => handleRetryJob(t.friendly_id || t.id)}
                                className="px-3.5 py-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50/60 rounded text-xs font-semibold shadow-2xs transition-colors disabled:opacity-40"
                              >
                                {actionInProgress === (t.friendly_id || t.id) ? 'Retrying...' : 'Retry'}
                              </button>
                              <button
                                onClick={() => setInspectJob(t)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title="Inspect Task"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing 1-6 of {stats.failed || 6} failed tasks
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  <button className="w-7 h-7 rounded text-xs font-semibold bg-blue-600 text-white">
                    1
                  </button>
                  <button
                    disabled
                    className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODAL 1: NEW PROVISIONING JOB                                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isNewJobModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Queue Provisioning Job</h3>
                </div>
                <button onClick={() => setIsNewJobModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Organization
                  </label>
                  <input
                    type="text"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="e.g. Acme Inc., TechCorp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Provisioning Job Type
                  </label>
                  <select
                    value={newJobType}
                    onChange={(e) => setNewJobType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="Full Provisioning">Full Provisioning</option>
                    <option value="Update Configuration">Update Configuration</option>
                    <option value="Add Integration">Add Integration</option>
                    <option value="Scale Resources">Scale Resources</option>
                    <option value="Update Plan">Update Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Execution Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  >
                    <option value="Normal">Normal (Background Queue)</option>
                    <option value="High">High (Immediate Worker Dispatch)</option>
                    <option value="Urgent">Urgent (Preempt Other Tasks)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionInProgress === 'create'}
                  onClick={handleCreateJob}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  {actionInProgress === 'create' ? 'Dispatching...' : 'Start Job'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODAL 2: INSPECT TASK (View Details)                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {inspectJob && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Task Details: {inspectJob.friendly_id || inspectJob.id}
                    </h3>
                    <p className="text-[11px] text-slate-500">{inspectJob.tenant_name}</p>
                  </div>
                </div>
                <button onClick={() => setInspectJob(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs border-y border-slate-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Job Type</span>
                  <span className="font-semibold text-slate-900">{inspectJob.job_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="font-semibold text-slate-900">{inspectJob.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Step</span>
                  <span className="font-medium text-slate-700">{inspectJob.current_step}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Started At</span>
                  <span className="text-slate-700">{inspectJob.started_at}</span>
                </div>
                {inspectJob.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Duration</span>
                    <span className="text-slate-700">{inspectJob.duration}</span>
                  </div>
                )}
                {inspectJob.failure_reason && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-rose-600 font-semibold">Failure Diagnostic</span>
                    <span className="text-rose-700 font-mono text-[11px] text-right">
                      {inspectJob.failure_reason}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  {(inspectJob.status === 'Failed' || inspectJob.status_raw === 'FAILED') && (
                    <button
                      onClick={() => {
                        const id = inspectJob.friendly_id || inspectJob.id;
                        setInspectJob(null);
                        handleRetryJob(id);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Retry Task
                    </button>
                  )}
                  {(inspectJob.status === 'In Progress' || inspectJob.status_raw === 'RUNNING') && (
                    <button
                      onClick={() => {
                        const id = inspectJob.friendly_id || inspectJob.id;
                        setInspectJob(null);
                        handleCancelJob(id);
                      }}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      Cancel Execution
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setInspectJob(null)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
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
