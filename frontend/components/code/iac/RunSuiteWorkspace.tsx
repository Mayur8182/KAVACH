'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Run Suite
 * Section 7: Screens 7.1 through 7.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/run-suite/*
 * 
 * Screens:
 *   7.1 Run Overview (4 KPIs, Stacked Runtime Activity Bar Chart, Recent Runtime Events)
 *   7.2 Workloads (Multi-filter workloads table, pods count, actions)
 *   7.3 Containers (Running containers state, CPU, Memory metrics, pod mapping)
 *   7.4 Kubernetes (Cluster posture, Node statuses, Core components health)
 *   7.5 Runtime Threats (Threat events, severity, blocked/detected status, triage)
 *   7.6 Runtime Vulnerabilities (Running container CVEs, package, severity, status)
 *   7.7 Network Activity (Flow logs, protocols, ports, Allow/Block actions, bytes)
 *   7.8 Policies & Runtime Security (Policies catalog, create, status toggle, delete)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Server,
  Box,
  Cpu,
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
  FileCode,
  Radio,
  Sliders,
  Share2,
  GitBranch,
  RefreshCw,
  Power,
  PowerOff,
  Link2,
  Activity,
  Send,
  MoreVertical,
  Terminal,
  Database,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  RunOverviewResponse,
  WorkloadsResponse,
  WorkloadItem,
  ContainersResponse,
  ContainerItem,
  KubernetesClusterResponse,
  RuntimeThreatsResponse,
  RuntimeThreatItem,
  RuntimeVulnerabilitiesResponse,
  RuntimeVulnerabilityItem,
  NetworkActivityResponse,
  NetworkFlowLogItem,
  RuntimePoliciesResponse,
  RuntimePolicyItem,
  CreateRuntimePolicyRequest,
} from '@/types/api/iac';

export type RunSuiteTab =
  | 'overview'
  | 'workloads'
  | 'containers'
  | 'kubernetes'
  | 'threats'
  | 'vulnerabilities'
  | 'network'
  | 'policies';

interface RunSuiteWorkspaceProps {
  initialTab?: RunSuiteTab;
  initialClusterId?: string;
}

const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 animate-pulse">
    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-100 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const EmptyTableState: React.FC<{ message: string; onReset?: () => void }> = ({ message, onReset }) => (
  <div className="text-center py-12 px-4 space-y-3">
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-[#CBD5E1] mx-auto flex items-center justify-center text-[#64748B]">
      <Filter className="w-5 h-5" />
    </div>
    <div className="text-sm font-medium text-[#334155]">{message}</div>
    <div className="text-xs text-slate-500 max-w-sm mx-auto">
      No records match your active query or filters. Try adjusting your search or clearing active filters.
    </div>
    {onReset && (
      <button
        onClick={onReset}
        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium hover:bg-blue-600/30 transition focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Clear Filters
      </button>
    )}
  </div>
);

export const RunSuiteWorkspace: React.FC<RunSuiteWorkspaceProps> = ({
  initialTab = 'overview',
  initialClusterId = '',
}) => {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<RunSuiteTab>(initialTab);
  const [clusterId, setClusterId] = useState<string>(initialClusterId);

  // Common Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 7.1 Overview State
  const [overviewData, setOverviewData] = useState<RunOverviewResponse | null>(null);
  const [timeRange, setTimeRange] = useState<string>('Last 24 hours');

  // 7.2 Workloads State
  const [workloadsData, setWorkloadsData] = useState<WorkloadsResponse | null>(null);
  const [workloadCluster, setWorkloadCluster] = useState<string>('All Clusters');
  const [workloadNamespace, setWorkloadNamespace] = useState<string>('All Namespaces');
  const [workloadSearch, setWorkloadSearch] = useState<string>('');
  const [workloadPage, setWorkloadPage] = useState<number>(1);

  // 7.3 Containers State
  const [containersData, setContainersData] = useState<ContainersResponse | null>(null);
  const [containerCluster, setContainerCluster] = useState<string>('All Clusters');
  const [containerNamespace, setContainerNamespace] = useState<string>('All Namespaces');
  const [containerStatus, setContainerStatus] = useState<string>('All Statuses');
  const [containerSearch, setContainerSearch] = useState<string>('');
  const [containerPage, setContainerPage] = useState<number>(1);

  // 7.4 Kubernetes State
  const [k8sData, setK8sData] = useState<KubernetesClusterResponse | null>(null);
  const [k8sSubTab, setK8sSubTab] = useState<string>('Overview');

  // 7.5 Runtime Threats State
  const [threatsData, setThreatsData] = useState<RuntimeThreatsResponse | null>(null);
  const [threatCluster, setThreatCluster] = useState<string>('All Clusters');
  const [threatSeverity, setThreatSeverity] = useState<string>('All Severities');
  const [threatSearch, setThreatSearch] = useState<string>('');
  const [threatPage, setThreatPage] = useState<number>(1);
  const [selectedThreat, setSelectedThreat] = useState<RuntimeThreatItem | null>(null);

  // 7.6 Runtime Vulnerabilities State
  const [vulnsData, setVulnsData] = useState<RuntimeVulnerabilitiesResponse | null>(null);
  const [vulnCluster, setVulnCluster] = useState<string>('All Clusters');
  const [vulnSeverity, setVulnSeverity] = useState<string>('All Severities');
  const [vulnStatus, setVulnStatus] = useState<string>('All Statuses');
  const [vulnSearch, setVulnSearch] = useState<string>('');
  const [vulnPage, setVulnPage] = useState<number>(1);
  const [selectedVuln, setSelectedVuln] = useState<RuntimeVulnerabilityItem | null>(null);

  // 7.7 Network Activity State
  const [networkData, setNetworkData] = useState<NetworkActivityResponse | null>(null);
  const [networkCluster, setNetworkCluster] = useState<string>('All Clusters');
  const [networkNamespace, setNetworkNamespace] = useState<string>('All Namespaces');
  const [networkSearch, setNetworkSearch] = useState<string>('');
  const [networkPage, setNetworkPage] = useState<number>(1);
  const [networkSubTab, setNetworkSubTab] = useState<string>('Flow Logs');

  // 7.8 Runtime Policies State
  const [policiesData, setPoliciesData] = useState<RuntimePoliciesResponse | null>(null);
  const [policyPage, setPolicyPage] = useState<number>(1);
  const [policySubTab, setPolicySubTab] = useState<string>('Policies');
  const [showAddPolicyModal, setShowAddPolicyModal] = useState<boolean>(false);
  const [newPolicyName, setNewPolicyName] = useState<string>('');
  const [newPolicyType, setNewPolicyType] = useState<string>('Runtime');
  const [newPolicyScope, setNewPolicyScope] = useState<string>('Cluster');
  const [newPolicyDesc, setNewPolicyDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [policyToDelete, setPolicyToDelete] = useState<RuntimePolicyItem | null>(null);

  // Auto-dismiss alert
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Keyboard accessibility: Escape closes any open modal (Mistake #57, #67)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddPolicyModal) setShowAddPolicyModal(false);
        if (selectedThreat) setSelectedThreat(null);
        if (policyToDelete) setPolicyToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddPolicyModal, selectedThreat, policyToDelete]);

  // Data Fetching per Tab
  const fetchTabData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const res = await api.iac.runSuite.getOverview(timeRange);
        setOverviewData(res);
      } else if (activeTab === 'workloads') {
        const res = await api.iac.runSuite.getWorkloads({
          cluster: workloadCluster,
          namespace: workloadNamespace,
          search: workloadSearch,
          page: workloadPage,
          pageSize: 10,
        });
        setWorkloadsData(res);
      } else if (activeTab === 'containers') {
        const res = await api.iac.runSuite.getContainers({
          cluster: containerCluster,
          namespace: containerNamespace,
          status: containerStatus,
          search: containerSearch,
          page: containerPage,
          pageSize: 10,
        });
        setContainersData(res);
      } else if (activeTab === 'kubernetes') {
        const res = await api.iac.runSuite.getKubernetesCluster(clusterId);
        setK8sData(res);
      } else if (activeTab === 'threats') {
        const res = await api.iac.runSuite.getThreats({
          cluster: threatCluster,
          severity: threatSeverity,
          search: threatSearch,
          page: threatPage,
          pageSize: 10,
        });
        setThreatsData(res);
      } else if (activeTab === 'vulnerabilities') {
        const res = await api.iac.runSuite.getVulnerabilities({
          cluster: vulnCluster,
          severity: vulnSeverity,
          status: vulnStatus,
          search: vulnSearch,
          page: vulnPage,
          pageSize: 10,
        });
        setVulnsData(res);
      } else if (activeTab === 'network') {
        const res = await api.iac.runSuite.getNetworkActivity({
          cluster: networkCluster,
          namespace: networkNamespace,
          search: networkSearch,
          page: networkPage,
          pageSize: 10,
        });
        setNetworkData(res);
      } else if (activeTab === 'policies') {
        const res = await api.iac.runSuite.getPolicies(policyPage, 10);
        setPoliciesData(res);
      }
    } catch (err: any) {
      console.error('Failed to load Run suite data:', err);
      setError(err?.message || 'Failed to fetch runtime security data from backend.');
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    timeRange,
    workloadCluster,
    workloadNamespace,
    workloadSearch,
    workloadPage,
    containerCluster,
    containerNamespace,
    containerStatus,
    containerSearch,
    containerPage,
    clusterId,
    threatCluster,
    threatSeverity,
    threatSearch,
    threatPage,
    vulnCluster,
    vulnSeverity,
    vulnStatus,
    vulnSearch,
    vulnPage,
    networkCluster,
    networkNamespace,
    networkSearch,
    networkPage,
    policyPage,
  ]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Mutations
  const handleUpdateThreatStatus = async (threatId: string, newStatus: string) => {
    try {
      await api.iac.runSuite.updateThreatStatus(threatId, newStatus);
      setActionSuccess(`Threat status updated to ${newStatus}`);
      setSelectedThreat(null);
      fetchTabData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update threat status.');
    }
  };

  const handleUpdateVulnStatus = async (vulnId: string, newStatus: string) => {
    try {
      await api.iac.runSuite.updateVulnerabilityStatus(vulnId, newStatus);
      setActionSuccess(`Vulnerability status updated to ${newStatus}`);
      setSelectedVuln(null);
      fetchTabData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update vulnerability status.');
    }
  };

  const handleTogglePolicyStatus = async (policyId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
      await api.iac.runSuite.togglePolicyStatus(policyId, nextStatus);
      setActionSuccess(`Policy status toggled to ${nextStatus}`);
      fetchTabData();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle policy status.');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.iac.runSuite.createPolicy({
        name: newPolicyName.trim(),
        type: newPolicyType,
        scope: newPolicyScope,
        status: 'Enabled',
        description: newPolicyDesc.trim() || undefined,
      });
      setActionSuccess(`Runtime policy "${newPolicyName}" successfully created`);
      setShowAddPolicyModal(false);
      setNewPolicyName('');
      setNewPolicyDesc('');
      fetchTabData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create runtime policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePolicy = async () => {
    if (!policyToDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.iac.runSuite.deletePolicy(policyToDelete.id);
      setActionSuccess(`Policy "${policyToDelete.name}" successfully deleted`);
      setPolicyToDelete(null);
      fetchTabData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper Badge Colors
  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'ready':
      case 'healthy':
      case 'allowed':
      case 'enabled':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'blocked':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'detected':
      case 'open':
      case 'investigating':
      case 'degraded':
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'resolved':
      case 'in progress':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-[#64748B] border border-slate-500/20';
    }
  };

  const isTabLoading =
    loading &&
    ((activeTab === 'overview' && !overviewData) ||
      (activeTab === 'workloads' && !workloadsData) ||
      (activeTab === 'containers' && !containersData) ||
      (activeTab === 'kubernetes' && !k8sData) ||
      (activeTab === 'threats' && !threatsData) ||
      (activeTab === 'vulnerabilities' && !vulnsData) ||
      (activeTab === 'network' && !networkData) ||
      (activeTab === 'policies' && !policiesData));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      {/* Top Banner & Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-700 px-6 py-2.5 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-700 px-6 py-2.5 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Suite Container */}
      <div className="flex-1 flex flex-col">
        {/* Horizontal Sub-Tabs Bar */}
        <div className="border-b border-[#E2E8F0] bg-white px-6 py-2.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'overview', label: 'Overview', icon: Activity, num: '7.1' },
              { id: 'workloads', label: 'Workloads', icon: Layers, num: '7.2' },
              { id: 'containers', label: 'Containers', icon: Box, num: '7.3' },
              { id: 'kubernetes', label: 'Kubernetes', icon: Server, num: '7.4' },
              { id: 'threats', label: 'Runtime Threats', icon: ShieldAlert, num: '7.5' },
              { id: 'vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle, num: '7.6' },
              { id: 'network', label: 'Network Activity', icon: Network, num: '7.7' },
              { id: 'policies', label: 'Policies', icon: ShieldCheck, num: '7.8' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as RunSuiteTab)}
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

          <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-[#E2E8F0]">
            <button
              onClick={fetchTabData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#334155] rounded-lg text-xs font-medium border border-[#CBD5E1] transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {/* Breadcrumb Bar */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
              <span className="text-[#334155] font-semibold">THING CODE</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span>IaC Security</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Run</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-blue-400 font-semibold capitalize">
                {activeTab === 'threats'
                  ? 'Runtime Threats'
                  : activeTab === 'vulnerabilities'
                  ? 'Runtime Vulnerabilities'
                  : activeTab === 'network'
                  ? 'Network Activity'
                  : activeTab}
              </span>
            </div>

            {/* Global Refresh button */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTabData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-[#334155] rounded text-xs font-medium border border-[#CBD5E1] transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Skeletons when initial data loading */}
          {isTabLoading && <TableSkeleton rows={6} cols={5} />}

          {!isTabLoading && (
            <>
              {/* 7.1 RUN OVERVIEW SCREEN */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Run Overview
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.1
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Monitor and protect your workloads, containers and runtime environments.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-white border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Last 24 hours">Last 24 hours</option>
                    <option value="Last 7 days">Last 7 days</option>
                    <option value="Last 30 days">Last 30 days</option>
                  </select>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Workloads</div>
                  <div className="text-3xl font-bold text-[#0F172A] mt-2">
                    {overviewData?.kpis?.workloads_count ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Active container workloads</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Runtime Threats</div>
                  <div className="text-3xl font-bold text-red-400 mt-2">
                    {overviewData?.kpis?.runtime_threats_count ?? 0}
                  </div>
                  <div className="text-[11px] text-red-400/80 mt-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    <span>Active anomalies intercepted</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Vulnerabilities</div>
                  <div className="text-3xl font-bold text-amber-400 mt-2">
                    {overviewData?.kpis?.vulnerabilities_count ?? 0}
                  </div>
                  <div className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>In running containers</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Uptime</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-2">
                    {overviewData?.kpis?.uptime_percentage !== undefined ? `${overviewData.kpis.uptime_percentage}%` : '100%'}
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cluster health baseline</span>
                  </div>
                </div>
              </div>

              {/* Runtime Activity Stacked Bar Chart */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Runtime Activity</h2>
                    <p className="text-xs text-[#64748B]">Real-time breakdown of event activities over the last 24 hours</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[#334155]">Normal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="text-[#334155]">Suspicious</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span className="text-[#334155]">Blocked</span>
                    </div>
                  </div>
                </div>

                {/* Bars Visual */}
                <div className="pt-6">
                  <div className="h-48 flex items-end justify-between gap-3 px-2">
                    {overviewData?.activity_chart.map((point) => {
                      const total = point.normal + point.suspicious + point.blocked;
                      const maxTotal = 150;
                      const barHeight = Math.min(100, Math.max(15, (total / maxTotal) * 100));

                      const normalPct = total > 0 ? (point.normal / total) * 100 : 80;
                      const suspiciousPct = total > 0 ? (point.suspicious / total) * 100 : 15;
                      const blockedPct = total > 0 ? (point.blocked / total) * 100 : 5;

                      return (
                        <div key={point.hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-14 bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-[10px] px-2.5 py-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            <div className="font-semibold text-blue-400">{point.hour}</div>
                            <div>Normal: {point.normal} | Suspicious: {point.suspicious} | Blocked: {point.blocked}</div>
                          </div>

                          {/* Stacked Bar */}
                          <div
                            className="w-full max-w-[42px] rounded-t flex flex-col justify-end overflow-hidden bg-slate-100"
                            style={{ height: `${barHeight}%` }}
                          >
                            <div style={{ height: `${blockedPct}%` }} className="w-full bg-red-500" />
                            <div style={{ height: `${suspiciousPct}%` }} className="w-full bg-amber-500" />
                            <div style={{ height: `${normalPct}%` }} className="w-full bg-emerald-500" />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 group-hover:text-[#334155] transition-colors">
                            {point.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Runtime Events Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Recent Runtime Events</h2>
                    <p className="text-xs text-[#64748B]">Latest intercepted syscalls, anomalies and executions</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('threats')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Time</th>
                        <th className="py-3 px-5">Event</th>
                        <th className="py-3 px-5">Resource</th>
                        <th className="py-3 px-5">Severity</th>
                        <th className="py-3 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {overviewData?.recent_events.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-100 transition">
                          <td className="py-3.5 px-5 font-mono text-[#64748B]">{evt.time}</td>
                          <td className="py-3.5 px-5 font-medium text-[#334155]">{evt.event}</td>
                          <td className="py-3.5 px-5 font-mono text-blue-400">{evt.resource}</td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getSeverityBadge(evt.severity)}`}>
                              {evt.severity}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(evt.status)}`}>
                              {evt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7.2 WORKLOADS SCREEN */}
          {activeTab === 'workloads' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Workloads
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.2
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    View and manage your runtime workloads across clusters.
                  </p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Cluster Dropdown */}
                  <select
                    value={workloadCluster}
                    onChange={(e) => {
                      setWorkloadCluster(e.target.value);
                      setWorkloadPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Clusters">All Clusters</option>
                    <option value="eks-prod-cluster">eks-prod-cluster</option>
                    <option value="gke-staging-cluster">gke-staging-cluster</option>
                    <option value="aks-dev-cluster">aks-dev-cluster</option>
                  </select>

                  {/* Namespace Dropdown */}
                  <select
                    value={workloadNamespace}
                    onChange={(e) => {
                      setWorkloadNamespace(e.target.value);
                      setWorkloadPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Namespaces">All Namespaces</option>
                    <option value="production">production</option>
                    <option value="ingress">ingress</option>
                    <option value="monitoring">monitoring</option>
                    <option value="kube-system">kube-system</option>
                  </select>

                  {/* Search input */}
                  <div className="relative min-w-[240px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search workloads..."
                      value={workloadSearch}
                      onChange={(e) => {
                        setWorkloadSearch(e.target.value);
                        setWorkloadPage(1);
                      }}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setWorkloadCluster('All Clusters');
                    setWorkloadNamespace('All Namespaces');
                    setWorkloadSearch('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-[#0F172A] rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter</span>
                </button>
              </div>

              {/* Workloads Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-5">Type</th>
                        <th className="py-3 px-5">Namespace</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5">Pods</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {workloadsData?.items && workloadsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyTableState
                              message="No workloads found"
                              onReset={() => {
                                setWorkloadCluster('All Clusters');
                                setWorkloadNamespace('All Namespaces');
                                setWorkloadSearch('');
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        workloadsData?.items.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-medium text-slate-100 flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-blue-400" />
                              <span>{w.name}</span>
                            </td>
                            <td className="py-3.5 px-5 text-[#64748B] font-mono text-[11px]">{w.type}</td>
                            <td className="py-3.5 px-5 text-[#334155]">{w.namespace}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(w.status)}`}>
                                {w.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-[#334155]">
                              {w.pods_ready}/{w.pods_total}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => setActionSuccess(`Workload ${w.name} inspected`)}
                                className="p-1 hover:bg-slate-100 rounded text-[#64748B] hover:text-[#334155] transition focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={workloadPage <= 1}
                      onClick={() => setWorkloadPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {workloadPage}
                    </span>
                    <button
                      disabled={workloadPage * 10 >= (workloadsData?.total ?? 10)}
                      onClick={() => setWorkloadPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {workloadsData?.total ?? 12}</div>
                </div>
              </div>
            </div>
          )}

          {/* 7.3 CONTAINERS SCREEN */}
          {activeTab === 'containers' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Containers
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.3
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Monitor container runtime state and security.
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
                <select
                  value={containerCluster}
                  onChange={(e) => {
                    setContainerCluster(e.target.value);
                    setContainerPage(1);
                  }}
                  className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="All Clusters">All Clusters</option>
                  <option value="eks-prod-cluster">eks-prod-cluster</option>
                  <option value="gke-staging-cluster">gke-staging-cluster</option>
                </select>

                <select
                  value={containerNamespace}
                  onChange={(e) => {
                    setContainerNamespace(e.target.value);
                    setContainerPage(1);
                  }}
                  className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="All Namespaces">All Namespaces</option>
                  <option value="production">production</option>
                  <option value="ingress">ingress</option>
                  <option value="monitoring">monitoring</option>
                  <option value="kube-system">kube-system</option>
                </select>

                <select
                  value={containerStatus}
                  onChange={(e) => {
                    setContainerStatus(e.target.value);
                    setContainerPage(1);
                  }}
                  className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Running">Running</option>
                  <option value="Pending">Pending</option>
                  <option value="Terminated">Terminated</option>
                </select>

                <div className="relative min-w-[240px] flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={containerSearch}
                    onChange={(e) => {
                      setContainerSearch(e.target.value);
                      setContainerPage(1);
                    }}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Containers Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Container</th>
                        <th className="py-3 px-5">Image</th>
                        <th className="py-3 px-5">Pod</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5">CPU</th>
                        <th className="py-3 px-5">Memory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {containersData?.items && containersData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyTableState
                              message="No containers found"
                              onReset={() => {
                                setContainerCluster('All Clusters');
                                setContainerNamespace('All Namespaces');
                                setContainerStatus('All Statuses');
                                setContainerSearch('');
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        containersData?.items.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-medium text-[#334155] flex items-center gap-2">
                              <Box className="w-3.5 h-3.5 text-blue-400" />
                              <span>{c.container}</span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-[11px] text-[#64748B]">{c.image}</td>
                            <td className="py-3.5 px-5 font-mono text-[11px] text-blue-400">{c.pod}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(c.status)}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-emerald-400">{c.cpu}</td>
                            <td className="py-3.5 px-5 font-mono text-[#334155]">{c.memory}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={containerPage <= 1}
                      onClick={() => setContainerPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {containerPage}
                    </span>
                    <button
                      disabled={containerPage * 10 >= (containersData?.total ?? 10)}
                      onClick={() => setContainerPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {containersData?.total ?? 10}</div>
                </div>
              </div>
            </div>
          )}

          {/* 7.4 KUBERNETES SCREEN */}
          {activeTab === 'kubernetes' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Kubernetes
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.4
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Cluster health, security posture and configuration.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={clusterId}
                    onChange={(e) => setClusterId(e.target.value)}
                    className="bg-white border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    {k8sData?.available_clusters.map((c) => (
                      <option key={c} value={c.split(' ')[0]}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setActionSuccess('Viewing cluster in AWS console...')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-[#334155] border border-[#CBD5E1] rounded text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <span>View in Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Overview, Nodes, Namespaces, Resources, RBAC, Network Policies */}
              <div className="border-b border-[#E2E8F0] flex gap-6 text-xs font-medium">
                {['Overview', 'Nodes', 'Namespaces', 'Resources', 'RBAC', 'Network Policies'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setK8sSubTab(tab)}
                    className={`pb-3 transition-colors relative ${
                      k8sSubTab === tab ? 'text-blue-400 font-semibold' : 'text-[#64748B] hover:text-[#334155]'
                    }`}
                  >
                    {tab}
                    {k8sSubTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Nodes</div>
                  <div className="text-3xl font-bold text-[#0F172A] mt-2">{k8sData?.nodes_count ?? 3}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Active worker instances</div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Pods</div>
                  <div className="text-3xl font-bold text-[#0F172A] mt-2">{k8sData?.pods_count ?? 42}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Healthy running pods</div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Namespaces</div>
                  <div className="text-3xl font-bold text-[#0F172A] mt-2">{k8sData?.namespaces_count ?? 6}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Isolated boundary scopes</div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <div className="text-xs font-medium text-[#64748B]">Cluster Health</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-2">
                    {k8sData?.cluster_health ?? 99.9}%
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-1">Control plane normal</div>
                </div>
              </div>

              {/* Node Status & Cluster Components Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Table: Node Status */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#0F172A]">Node Status</h2>
                    <button
                      onClick={() => setK8sSubTab('Nodes')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2.5 px-4">Name</th>
                          <th className="py-2.5 px-4">Instance Type</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">CPU</th>
                          <th className="py-2.5 px-4">Memory</th>
                          <th className="py-2.5 px-4">Pods</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/60">
                        {k8sData?.nodes.map((n) => (
                          <tr key={n.name} className="hover:bg-slate-100 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-[#334155]">{n.name}</td>
                            <td className="py-3 px-4 font-mono text-[#64748B]">{n.instance_type}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(n.status)}`}>
                                {n.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-400">{n.cpu}</td>
                            <td className="py-3 px-4 font-mono text-[#334155]">{n.memory}</td>
                            <td className="py-3 px-4 font-mono text-[#334155]">{n.pods}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Table: Cluster Components */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#E2E8F0]">
                    <h2 className="text-sm font-semibold text-[#0F172A]">Cluster Components</h2>
                    <p className="text-xs text-[#64748B]">Kubernetes master control plane health</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2.5 px-4">Component</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Version</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/60">
                        {k8sData?.components.map((c) => (
                          <tr key={c.component} className="hover:bg-slate-100 transition">
                            <td className="py-3 px-4 font-medium text-[#334155] flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-blue-400" />
                              <span>{c.component}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(c.status)}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[#64748B]">{c.version}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7.5 RUNTIME THREATS SCREEN */}
          {activeTab === 'threats' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Runtime Threats
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.5
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Detect and investigate runtime threats and anomalous behavior.
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <select
                    value={threatCluster}
                    onChange={(e) => {
                      setThreatCluster(e.target.value);
                      setThreatPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Clusters">All Clusters</option>
                    <option value="eks-prod-cluster">eks-prod-cluster</option>
                    <option value="gke-staging-cluster">gke-staging-cluster</option>
                  </select>

                  <select
                    value={threatSeverity}
                    onChange={(e) => {
                      setThreatSeverity(e.target.value);
                      setThreatPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Severities">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <div className="relative min-w-[240px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search threats..."
                      value={threatSearch}
                      onChange={(e) => {
                        setThreatSearch(e.target.value);
                        setThreatPage(1);
                      }}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setThreatCluster('All Clusters');
                    setThreatSeverity('All Severities');
                    setThreatSearch('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-[#0F172A] rounded text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter</span>
                </button>
              </div>

              {/* Threats Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Time</th>
                        <th className="py-3 px-5">Threat</th>
                        <th className="py-3 px-5">Resource</th>
                        <th className="py-3 px-5">Severity</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {threatsData?.items && threatsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyTableState
                              message="No runtime threats found"
                              onReset={() => {
                                setThreatCluster('All Clusters');
                                setThreatSeverity('All Severities');
                                setThreatSearch('');
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        threatsData?.items.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-mono text-[#64748B]">{t.time}</td>
                            <td className="py-3.5 px-5 font-medium text-slate-100 flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>{t.threat}</span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-blue-400">{t.resource}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getSeverityBadge(t.severity)}`}>
                                {t.severity}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(t.status)}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => setSelectedThreat(t)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-100 text-[#334155] rounded text-xs font-medium border border-[#CBD5E1] transition focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                Investigate
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={threatPage <= 1}
                      onClick={() => setThreatPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {threatPage}
                    </span>
                    <button
                      disabled={threatPage * 10 >= (threatsData?.total ?? 10)}
                      onClick={() => setThreatPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {threatsData?.total ?? 10}</div>
                </div>
              </div>

              {/* Threat Investigation Drawer / Modal */}
              {selectedThreat && (
                <div
                  onClick={() => setSelectedThreat(null)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        <span>Threat Investigation</span>
                      </div>
                      <button onClick={() => setSelectedThreat(null)} className="text-[#64748B] hover:text-[#0F172A]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[#64748B]">Threat:</span>{' '}
                        <span className="text-[#0F172A] font-semibold">{selectedThreat.threat}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Resource:</span>{' '}
                        <span className="font-mono text-blue-400">{selectedThreat.resource}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Detection Details:</span>
                        <p className="mt-1 p-3 bg-[#F8FAFC] rounded font-mono text-[#334155] border border-[#E2E8F0]">
                          {selectedThreat.details || 'Intercepted anomaly pattern detected in workload syscall logs.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdateThreatStatus(selectedThreat.id, 'Dismissed')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-[#334155] rounded text-xs transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleUpdateThreatStatus(selectedThreat.id, 'Blocked')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-[#0F172A] rounded text-xs font-semibold transition"
                      >
                        Enforce Block
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7.6 RUNTIME VULNERABILITIES SCREEN */}
          {activeTab === 'vulnerabilities' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Runtime Vulnerabilities
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.6
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Vulnerabilities detected in running containers and workloads.
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <select
                    value={vulnCluster}
                    onChange={(e) => {
                      setVulnCluster(e.target.value);
                      setVulnPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Clusters">All Clusters</option>
                    <option value="eks-prod-cluster">eks-prod-cluster</option>
                  </select>

                  <select
                    value={vulnSeverity}
                    onChange={(e) => {
                      setVulnSeverity(e.target.value);
                      setVulnPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Severities">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select
                    value={vulnStatus}
                    onChange={(e) => {
                      setVulnStatus(e.target.value);
                      setVulnPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>

                  <div className="relative min-w-[240px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search vulnerabilities..."
                      value={vulnSearch}
                      onChange={(e) => {
                        setVulnSearch(e.target.value);
                        setVulnPage(1);
                      }}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setVulnCluster('All Clusters');
                    setVulnSeverity('All Severities');
                    setVulnStatus('All Statuses');
                    setVulnSearch('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-[#0F172A] rounded text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter</span>
                </button>
              </div>

              {/* Vulnerabilities Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Vulnerability</th>
                        <th className="py-3 px-5">Package / Component</th>
                        <th className="py-3 px-5">Severity</th>
                        <th className="py-3 px-5">Resource</th>
                        <th className="py-3 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {vulnsData?.items && vulnsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <EmptyTableState
                              message="No runtime vulnerabilities found"
                              onReset={() => {
                                setVulnCluster('All Clusters');
                                setVulnSeverity('All Severities');
                                setVulnStatus('All Statuses');
                                setVulnSearch('');
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        vulnsData?.items.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-mono font-medium text-blue-400 hover:underline cursor-pointer">
                              {v.cve}
                            </td>
                            <td className="py-3.5 px-5 font-medium text-[#334155]">{v.package}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getSeverityBadge(v.severity)}`}>
                                {v.severity}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-[#64748B]">{v.resource}</td>
                            <td className="py-3.5 px-5">
                              <button
                                onClick={() => {
                                  const next = v.status === 'Open' ? 'In Progress' : v.status === 'In Progress' ? 'Resolved' : 'Open';
                                  handleUpdateVulnStatus(v.id, next);
                                }}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${getStatusBadge(v.status)} hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500`}
                              >
                                {v.status}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={vulnPage <= 1}
                      onClick={() => setVulnPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {vulnPage}
                    </span>
                    <button
                      disabled={vulnPage * 10 >= (vulnsData?.total ?? 10)}
                      onClick={() => setVulnPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {vulnsData?.total ?? 10}</div>
                </div>
              </div>
            </div>
          )}

          {/* 7.7 NETWORK ACTIVITY SCREEN */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Network Activity
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.7
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Monitor and analyze network traffic between workloads.
                  </p>
                </div>
              </div>

              {/* Sub-Tabs: Flow Logs, Policies, External Connections */}
              <div className="border-b border-[#E2E8F0] flex gap-6 text-xs font-medium">
                {['Flow Logs', 'Policies', 'External Connections'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setNetworkSubTab(tab)}
                    className={`pb-3 transition-colors relative ${
                      networkSubTab === tab ? 'text-blue-400 font-semibold' : 'text-[#64748B] hover:text-[#334155]'
                    }`}
                  >
                    {tab}
                    {networkSubTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <select
                    value={networkCluster}
                    onChange={(e) => {
                      setNetworkCluster(e.target.value);
                      setNetworkPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Clusters">All Clusters</option>
                    <option value="eks-prod-cluster">eks-prod-cluster</option>
                  </select>

                  <select
                    value={networkNamespace}
                    onChange={(e) => {
                      setNetworkNamespace(e.target.value);
                      setNetworkPage(1);
                    }}
                    className="bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Namespaces">All Namespaces</option>
                    <option value="production">production</option>
                    <option value="monitoring">monitoring</option>
                  </select>

                  <div className="relative min-w-[260px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by source, destination..."
                      value={networkSearch}
                      onChange={(e) => {
                        setNetworkSearch(e.target.value);
                        setNetworkPage(1);
                      }}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] rounded pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNetworkCluster('All Clusters');
                    setNetworkNamespace('All Namespaces');
                    setNetworkSearch('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-[#0F172A] rounded text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter</span>
                </button>
              </div>

              {/* Flow Logs Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Source</th>
                        <th className="py-3 px-5">Destination</th>
                        <th className="py-3 px-5">Protocol</th>
                        <th className="py-3 px-5">Port</th>
                        <th className="py-3 px-5">Action</th>
                        <th className="py-3 px-5">Bytes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {networkData?.items && networkData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyTableState
                              message="No network flow logs found"
                              onReset={() => {
                                setNetworkCluster('All Clusters');
                                setNetworkNamespace('All Namespaces');
                                setNetworkSearch('');
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        networkData?.items.map((flow) => (
                          <tr key={flow.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-mono text-[#334155]">{flow.source}</td>
                            <td className="py-3.5 px-5 font-mono text-blue-400">{flow.destination}</td>
                            <td className="py-3.5 px-5 font-mono text-[#64748B]">{flow.protocol}</td>
                            <td className="py-3.5 px-5 font-mono text-[#334155]">{flow.port}</td>
                            <td className="py-3.5 px-5">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  flow.action === 'Allow'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                              >
                                {flow.action}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-mono text-[#334155]">{flow.bytes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={networkPage <= 1}
                      onClick={() => setNetworkPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {networkPage}
                    </span>
                    <button
                      disabled={networkPage * 10 >= (networkData?.total ?? 10)}
                      onClick={() => setNetworkPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {networkData?.total ?? 10}</div>
                </div>
              </div>
            </div>
          )}

          {/* 7.8 POLICIES & RUNTIME SECURITY SCREEN */}
          {activeTab === 'policies' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
                    Runtime Security Policies
                    <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Screen 7.8
                    </span>
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Manage runtime security policies and enforcement.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddPolicyModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-[#0F172A] rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Policy</span>
                </button>
              </div>

              {/* Sub-Tabs: Policies, Admission Controls, Runtime Rules */}
              <div className="border-b border-[#E2E8F0] flex gap-6 text-xs font-medium">
                {['Policies', 'Admission Controls', 'Runtime Rules'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPolicySubTab(tab)}
                    className={`pb-3 transition-colors relative ${
                      policySubTab === tab ? 'text-blue-400 font-semibold' : 'text-[#64748B] hover:text-[#334155]'
                    }`}
                  >
                    {tab}
                    {policySubTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Policies Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]/60 text-[#64748B] font-medium uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-5">Type</th>
                        <th className="py-3 px-5">Scope</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/60">
                      {policiesData?.items && policiesData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <EmptyTableState
                              message="No runtime security policies found"
                              onReset={() => {
                                setShowAddPolicyModal(true);
                              }}
                            />
                          </td>
                        </tr>
                      ) : (
                        policiesData?.items.map((pol) => (
                          <tr key={pol.id} className="hover:bg-slate-100 transition">
                            <td className="py-3.5 px-5 font-medium text-slate-100 flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{pol.name}</span>
                            </td>
                            <td className="py-3.5 px-5 text-[#64748B] font-mono text-[11px]">{pol.type}</td>
                            <td className="py-3.5 px-5 text-[#334155] font-mono text-[11px]">{pol.scope}</td>
                            <td className="py-3.5 px-5">
                              <button
                                onClick={() => handleTogglePolicyStatus(pol.id, pol.status)}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                                  pol.status === 'Enabled'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-slate-500/10 text-[#64748B] border border-slate-500/20 hover:bg-slate-500/20'
                                }`}
                              >
                                {pol.status}
                              </button>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => setPolicyToDelete(pol)}
                                className="p-1.5 hover:bg-red-500/10 rounded text-[#64748B] hover:text-red-400 transition focus-visible:ring-2 focus-visible:ring-red-500"
                                title="Delete Policy"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={policyPage <= 1}
                      onClick={() => setPolicyPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-semibold">
                      {policyPage}
                    </span>
                    <button
                      disabled={policyPage * 10 >= (policiesData?.total ?? 10)}
                      onClick={() => setPolicyPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="text-slate-500 font-mono">10 / page &bull; Total: {policiesData?.total ?? 10}</div>
                </div>
              </div>

              {/* Add Policy Modal */}
              {showAddPolicyModal && (
                <div
                  onClick={() => setShowAddPolicyModal(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                        <Plus className="w-4 h-4 text-blue-400" />
                        <span>Create Runtime Security Policy</span>
                      </div>
                      <button onClick={() => setShowAddPolicyModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[#334155] font-medium mb-1">Policy Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Disallow Host IPC"
                          value={newPolicyName}
                          onChange={(e) => setNewPolicyName(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-2 text-[#334155] focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[#334155] font-medium mb-1">Type</label>
                          <select
                            value={newPolicyType}
                            onChange={(e) => setNewPolicyType(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-2 text-[#334155] focus:outline-none focus:border-blue-500"
                          >
                            <option value="Runtime">Runtime</option>
                            <option value="Network">Network</option>
                            <option value="Admission">Admission</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#334155] font-medium mb-1">Scope</label>
                          <select
                            value={newPolicyScope}
                            onChange={(e) => setNewPolicyScope(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-2 text-[#334155] focus:outline-none focus:border-blue-500"
                          >
                            <option value="Cluster">Cluster</option>
                            <option value="Namespace">Namespace</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#334155] font-medium mb-1">Description</label>
                        <textarea
                          placeholder="Policy objective and enforcement rules..."
                          rows={3}
                          value={newPolicyDesc}
                          onChange={(e) => setNewPolicyDesc(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded px-3 py-2 text-[#334155] focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setShowAddPolicyModal(false)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-[#334155] rounded text-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !newPolicyName.trim()}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[#0F172A] rounded text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <span>Create Policy</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Policy Confirmation Modal (Mistake #61, #62) */}
              {policyToDelete && (
                <div
                  onClick={() => setPolicyToDelete(null)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border border-[#E2E8F0] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
                  >
                    <div className="flex items-center gap-3 text-red-400">
                      <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A]">Delete Security Policy</h3>
                        <p className="text-xs text-[#64748B]">This action is irreversible.</p>
                      </div>
                    </div>

                    <p className="text-xs text-[#334155]">
                      Are you sure you want to permanently delete{' '}
                      <span className="font-semibold text-[#0F172A]">"{policyToDelete.name}"</span>? Runtime enforcement will be immediately revoked.
                    </p>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setPolicyToDelete(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-[#334155] rounded text-xs font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={confirmDeletePolicy}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-[#0F172A] rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <span>Delete Policy</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
export default RunSuiteWorkspace;
