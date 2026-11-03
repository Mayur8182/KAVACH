'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ChevronRight,
  MoreVertical,
  Shield,
  Box,
  Server,
  ExternalLink,
  Cpu,
  Activity,
  HardDrive,
  FileCode,
  ArrowUpRight,
  Info,
  X,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  KubernetesOverviewResponse,
  TopRiskyWorkloadRow,
  KubernetesClustersSummaryResponse,
  KubernetesClusterRow,
  KubernetesWorkloadRow,
  KubernetesWorkloadDetailResponse,
  KubernetesFindingRow,
} from '@/types/api/container';

interface KubernetesWorkloadsViewProps {
  projectId: string | null;
  initialTab?: 'overview' | 'clusters' | 'workloads' | 'findings' | 'detail';
  workloadId?: string;
  onNavigate?: (route: string) => void;
}

export const KubernetesWorkloadsView: React.FC<KubernetesWorkloadsViewProps> = ({
  projectId,
  initialTab = 'overview',
  workloadId,
  onNavigate,
}) => {
  // Current view
  const [currentView, setCurrentView] = useState<'overview' | 'clusters' | 'workloads' | 'findings' | 'detail'>(initialTab);
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<string | null>(workloadId || null);

  // Data states
  const [overview, setOverview] = useState<KubernetesOverviewResponse | null>(null);
  const [topRisky, setTopRisky] = useState<TopRiskyWorkloadRow[]>([]);
  const [clustersSummary, setClustersSummary] = useState<KubernetesClustersSummaryResponse | null>(null);
  const [clusters, setClusters] = useState<KubernetesClusterRow[]>([]);
  const [workloads, setWorkloads] = useState<KubernetesWorkloadRow[]>([]);
  const [totalWorkloads, setTotalWorkloads] = useState(0);
  const [findings, setFindings] = useState<KubernetesFindingRow[]>([]);
  const [workloadDetail, setWorkloadDetail] = useState<KubernetesWorkloadDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clusters screen state
  const [clusterSubTab, setClusterSubTab] = useState<'clusters' | 'namespaces'>('clusters');
  const [clusterSearch, setClusterSearch] = useState('');
  const [clusterStatusFilter, setClusterStatusFilter] = useState('All');
  const [clusterProviderFilter, setClusterProviderFilter] = useState('All');
  const [clusterEnvFilter, setClusterEnvFilter] = useState('All');
  const [isAddClusterOpen, setIsAddClusterOpen] = useState(false);
  const [newClusterForm, setNewClusterForm] = useState({
    name: '',
    provider: 'AWS',
    environment: 'Production',
    api_server: 'https://k8s-api.example.com',
  });

  // Workloads screen state
  const [workloadTypeFilter, setWorkloadTypeFilter] = useState('All Workloads');
  const [workloadSearch, setWorkloadSearch] = useState('');
  const [workloadClusterFilter, setWorkloadClusterFilter] = useState('All');
  const [workloadNamespaceFilter, setWorkloadNamespaceFilter] = useState('All');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState('All');
  const [workloadRiskFilter, setWorkloadRiskFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Findings screen state
  const [findingSeverityFilter, setFindingSeverityFilter] = useState('All');
  const [findingCategoryFilter, setFindingCategoryFilter] = useState('All');

  // Load Overview Data
  const loadOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, riskyData] = await Promise.all([
        api.containers.kubernetesOverview(projectId),
        api.containers.topRiskyWorkloads(projectId),
      ]);
      setOverview(overviewData);
      setTopRisky(riskyData);
    } catch (err: any) {
      console.error('Failed to load k8s overview:', err);
      setError(err?.message || 'Failed to load Kubernetes overview');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load Clusters Data
  const loadClustersData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, clustersRes] = await Promise.all([
        api.containers.kubernetesClustersSummary(projectId),
        api.containers.kubernetesClusters(projectId),
      ]);
      setClustersSummary(summaryRes);
      setClusters(clustersRes.items || []);
    } catch (err: any) {
      console.error('Failed to load clusters:', err);
      setError(err?.message || 'Failed to load Kubernetes clusters');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load Workloads Data
  const loadWorkloadsData = useCallback(async () => {
    try {
      setLoading(true);
      const typeParam = workloadTypeFilter === 'All Workloads' ? undefined : workloadTypeFilter;
      const res = await api.containers.kubernetesWorkloads({
        projectId,
        search: workloadSearch || undefined,
        cluster: workloadClusterFilter === 'All' ? undefined : workloadClusterFilter,
        namespace: workloadNamespaceFilter === 'All' ? undefined : workloadNamespaceFilter,
        status: workloadStatusFilter === 'All' ? undefined : workloadStatusFilter,
        risk_level: workloadRiskFilter === 'All' ? undefined : workloadRiskFilter,
        workload_type: typeParam,
        page,
        page_size: pageSize,
      });
      setWorkloads(res.items || []);
      setTotalWorkloads(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load workloads:', err);
      setError(err?.message || 'Failed to load Kubernetes workloads');
    } finally {
      setLoading(false);
    }
  }, [projectId, workloadSearch, workloadClusterFilter, workloadNamespaceFilter, workloadStatusFilter, workloadRiskFilter, workloadTypeFilter, page]);

  // Load Findings Data
  const loadFindingsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.containers.kubernetesFindings({
        projectId,
        severity: findingSeverityFilter === 'All' ? undefined : findingSeverityFilter,
        category: findingCategoryFilter === 'All' ? undefined : findingCategoryFilter,
      });
      setFindings(res.items || []);
    } catch (err: any) {
      console.error('Failed to load k8s findings:', err);
      setError(err?.message || 'Failed to load Kubernetes findings');
    } finally {
      setLoading(false);
    }
  }, [projectId, findingSeverityFilter, findingCategoryFilter]);

  // Load Detail Data
  const loadWorkloadDetail = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.containers.kubernetesWorkloadDetail(id);
      setWorkloadDetail(res);
    } catch (err: any) {
      console.error('Failed to load workload detail:', err);
      setError(err?.message || `Failed to load workload '${id}' detail`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Router dispatcher based on currentView
  useEffect(() => {
    if (currentView === 'overview') {
      loadOverviewData();
    } else if (currentView === 'clusters') {
      loadClustersData();
    } else if (currentView === 'workloads') {
      loadWorkloadsData();
    } else if (currentView === 'findings') {
      loadFindingsData();
    } else if (currentView === 'detail' && selectedWorkloadId) {
      loadWorkloadDetail(selectedWorkloadId);
    }
  }, [currentView, selectedWorkloadId, loadOverviewData, loadClustersData, loadWorkloadsData, loadFindingsData, loadWorkloadDetail]);

  const handleNavigate = (view: 'overview' | 'clusters' | 'workloads' | 'findings' | 'detail', id?: string) => {
    setCurrentView(view);
    if (id) setSelectedWorkloadId(id);
    if (onNavigate) {
      if (view === 'overview') onNavigate('/code/container-security/kubernetes');
      else if (view === 'clusters') onNavigate('/code/container-security/kubernetes/clusters');
      else if (view === 'workloads') onNavigate('/code/container-security/kubernetes/workloads');
      else if (view === 'findings') onNavigate('/code/container-security/kubernetes/findings');
      else if (view === 'detail' && id) onNavigate(`/code/container-security/kubernetes/workloads/${id}`);
    }
  };

  // Severity & Risk Badge helpers
  const getRiskBadge = (risk: string) => {
    const r = (risk || '').toLowerCase();
    if (r === 'critical') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Critical</span>;
    }
    if (r === 'high') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />High</span>;
    }
    if (r === 'medium') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Medium</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Low</span>;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'running' || s === 'healthy') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />{status}</span>;
    }
    if (s === 'unhealthy' || s === 'failed') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20"><XCircle className="w-3 h-3" />{status}</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><AlertTriangle className="w-3 h-3" />{status}</span>;
  };

  const getProviderIcon = (provider: string) => {
    const p = (provider || '').toLowerCase();
    if (p.includes('aws') || p.includes('eks')) {
      return (
        <span className="w-6 h-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-[10px] border border-amber-500/30">
          AWS
        </span>
      );
    }
    if (p.includes('azure') || p.includes('aks')) {
      return (
        <span className="w-6 h-6 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px] border border-blue-500/30">
          AZ
        </span>
      );
    }
    if (p.includes('gcp') || p.includes('gke')) {
      return (
        <span className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px] border border-emerald-500/30">
          GCP
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded bg-slate-500/10 text-slate-400 flex items-center justify-center font-bold text-[10px] border border-slate-500/30">
        K8S
      </span>
    );
  };

  // Donut chart math for Findings by Category
  const categoryDonutSlices = useMemo(() => {
    if (!overview?.categories || overview.categories.length === 0) return [];
    const total = overview.categories.reduce((acc, c) => acc + c.count, 0) || 1;
    let accumulatedAngle = 0;
    const colors: Record<string, string> = {
      'Misconfigurations': '#ef4444',
      'Vulnerable Images': '#f97316',
      'Privileged Containers': '#eab308',
      'Excessive Permissions': '#3b82f6',
      'Other': '#8b5cf6',
    };

    return overview.categories.map((item) => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const r = 38;
      const cx = 50;
      const cy = 50;
      const strokeDash = (percentage / 100) * (2 * Math.PI * r);
      const strokeDashoffset = -((startAngle / 360) * (2 * Math.PI * r));

      return {
        ...item,
        color: colors[item.category] || '#94a3b8',
        strokeDash,
        strokeDashoffset,
      };
    });
  }, [overview]);

  return (
    <div className="w-full min-h-screen bg-[#0b0f19] text-slate-100 p-6 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Code</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Container Security</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-blue-400 font-medium">Kubernetes</span>
            {currentView !== 'overview' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-200 capitalize">{currentView}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Server className="w-6 h-6 text-blue-400" />
            {currentView === 'overview' && 'Kubernetes Security Overview'}
            {currentView === 'clusters' && 'Clusters & Namespaces'}
            {currentView === 'workloads' && 'Workloads & Pods'}
            {currentView === 'findings' && 'Kubernetes Findings'}
            {currentView === 'detail' && 'Workload Security Detail'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentView === 'overview' && 'Monitor and secure your Kubernetes clusters, workloads and deployed containers.'}
            {currentView === 'clusters' && 'Manage Kubernetes clusters, namespaces, and configuration posture.'}
            {currentView === 'workloads' && 'View and analyze Kubernetes workloads, pods and their security posture.'}
            {currentView === 'findings' && 'Security misconfigurations, CVEs, and RBAC issues discovered across your clusters.'}
            {currentView === 'detail' && `Deep security posture, CVE breakdown, and manifest analysis for ${workloadDetail?.workload.name || selectedWorkloadId}.`}
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Module Navigation Tabs */}
          <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => handleNavigate('overview')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'overview'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleNavigate('clusters')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'clusters'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => handleNavigate('workloads')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'workloads'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Workloads
            </button>
            <button
              onClick={() => handleNavigate('findings')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'findings'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Findings
            </button>
          </div>

          <button
            onClick={() => setIsAddClusterOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Cluster
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              if (currentView === 'overview') loadOverviewData();
              if (currentView === 'clusters') loadClustersData();
              if (currentView === 'workloads') loadWorkloadsData();
            }}
            className="underline hover:text-rose-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 1: KUBERNETES OVERVIEW                                       */}
      {/* ==================================================================== */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* Top 5 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Clusters</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.clusters ?? 4}</span>
                <span className="text-xs font-medium text-slate-400">0%</span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Namespaces</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.namespaces ?? 28}</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  ↑ 12%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Workloads</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.workloads ?? 186}</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  ↑ 8%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Pods</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.pods ?? 512}</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  ↑ 6%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Security Findings</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.security_findings ?? 132}</span>
                <span className="text-xs font-medium text-rose-400 flex items-center gap-0.5">
                  ↑ 16%
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row: Findings by Category & Workload Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Findings by Category Donut Card */}
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Findings by Category</h3>
                <span className="text-xs text-slate-400">Real cluster telemetry</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#1e293b"
                      strokeWidth="10"
                      fill="none"
                    />
                    {categoryDonutSlices.map((slice, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        stroke={slice.color}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${slice.strokeDash} 300`}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-white leading-tight">
                      {overview?.summary.security_findings ?? 132}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Findings</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-2.5 w-full">
                  {(overview?.categories || [
                    { category: 'Misconfigurations', count: 48, percentage: 36 },
                    { category: 'Vulnerable Images', count: 32, percentage: 24 },
                    { category: 'Privileged Containers', count: 18, percentage: 14 },
                    { category: 'Excessive Permissions', count: 16, percentage: 12 },
                    { category: 'Other', count: 18, percentage: 14 },
                  ]).map((item, idx) => {
                    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: colors[idx % colors.length] }}
                          />
                          <span className="text-slate-300 font-medium">{item.category}</span>
                        </div>
                        <div className="text-slate-400 font-mono">
                          {item.count} ({item.percentage}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Workload Risk Distribution Card */}
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Workload Risk Distribution</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500" />Critical</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500" />High</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-yellow-500" />Medium</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500" />Low</span>
                </div>
              </div>

              {/* Stacked Bars by Workload Type */}
              <div className="h-44 flex items-end justify-between gap-6 px-4 pt-4 border-b border-slate-800">
                {(overview?.workload_risks || [
                  { workload_type: 'Deployments', critical: 18, high: 24, medium: 42, low: 26 },
                  { workload_type: 'StatefulSets', critical: 6, high: 12, medium: 16, low: 10 },
                  { workload_type: 'DaemonSets', critical: 4, high: 8, medium: 14, low: 6 },
                  { workload_type: 'Jobs', critical: 2, high: 5, medium: 8, low: 12 },
                ]).map((bar, i) => {
                  const total = bar.critical + bar.high + bar.medium + bar.low || 1;
                  const critH = (bar.critical / total) * 100;
                  const highH = (bar.high / total) * 100;
                  const medH = (bar.medium / total) * 100;
                  const lowH = (bar.low / total) * 100;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                      <div className="w-full max-w-[48px] h-32 flex flex-col-reverse rounded overflow-hidden">
                        <div style={{ height: `${critH}%` }} className="bg-rose-500 w-full" title={`Critical: ${bar.critical}`} />
                        <div style={{ height: `${highH}%` }} className="bg-amber-500 w-full" title={`High: ${bar.high}`} />
                        <div style={{ height: `${medH}%` }} className="bg-yellow-500 w-full" title={`Medium: ${bar.medium}`} />
                        <div style={{ height: `${lowH}%` }} className="bg-blue-500 w-full" title={`Low: ${bar.low}`} />
                      </div>
                      <span className="text-[11px] text-slate-400 mt-2 truncate max-w-[80px] text-center">
                        {bar.workload_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Table: Top Risky Workloads */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Top Risky Workloads</h3>
              <button
                onClick={() => handleNavigate('workloads')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                View all workloads <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Workload</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Cluster</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Findings</th>
                    <th className="py-3 px-4">Image</th>
                    <th className="py-3 px-4">Last Scanned</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {topRisky.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleNavigate('detail', row.id)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {row.name}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{row.namespace}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {row.workload_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{row.cluster_name}</td>
                      <td className="py-3 px-4">{getRiskBadge(row.risk_level)}</td>
                      <td className="py-3 px-4 font-semibold text-white">{row.findings_count}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-[160px]">
                        {row.image_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{row.last_scanned_at}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate('detail', row.id);
                          }}
                          className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {topRisky.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No risky workloads found across connected clusters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 2: CLUSTERS & NAMESPACES                                     */}
      {/* ==================================================================== */}
      {currentView === 'clusters' && (
        <div className="space-y-6">
          {/* Subtabs: Clusters | Namespaces */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
            <button
              onClick={() => setClusterSubTab('clusters')}
              className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                clusterSubTab === 'clusters'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => setClusterSubTab('namespaces')}
              className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                clusterSubTab === 'namespaces'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Namespaces
            </button>
          </div>

          {/* 4 Cluster Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Connected Clusters</span>
              <div className="text-2xl font-bold text-white mt-2">
                {clustersSummary?.connected_clusters ?? 4}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Healthy</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 mt-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                {clustersSummary?.healthy_clusters ?? 3}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Unhealthy</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-rose-400 mt-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                {clustersSummary?.unhealthy_clusters ?? 1}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Namespaces</span>
              <div className="text-2xl font-bold text-white mt-2">
                {clustersSummary?.total_namespaces ?? 28}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#111827]/60 border border-slate-800 rounded-lg p-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clusters..."
                value={clusterSearch}
                onChange={(e) => setClusterSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto text-xs">
              <select
                value={clusterStatusFilter}
                onChange={(e) => setClusterStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Status: All</option>
                <option value="Healthy">Healthy</option>
                <option value="Unhealthy">Unhealthy</option>
              </select>

              <select
                value={clusterProviderFilter}
                onChange={(e) => setClusterProviderFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Provider: All</option>
                <option value="AWS">AWS EKS</option>
                <option value="Azure">Azure AKS</option>
                <option value="On-prem">On-Premises</option>
              </select>

              <select
                value={clusterEnvFilter}
                onChange={(e) => setClusterEnvFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Environment: All</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
            </div>
          </div>

          {/* Clusters Table */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                  <th className="py-3 px-4">Cluster Name</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Nodes</th>
                  <th className="py-3 px-4">Namespaces</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clusters
                  .filter((c) => {
                    if (clusterSearch && !c.name.toLowerCase().includes(clusterSearch.toLowerCase())) return false;
                    if (clusterStatusFilter !== 'All' && c.health_status !== clusterStatusFilter) return false;
                    if (clusterProviderFilter !== 'All' && !c.provider.toLowerCase().includes(clusterProviderFilter.toLowerCase())) return false;
                    return true;
                  })
                  .map((cluster) => (
                    <tr key={cluster.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {getProviderIcon(cluster.provider)}
                          <span className="font-semibold text-white">{cluster.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{cluster.provider}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{cluster.version}</td>
                      <td className="py-3 px-4 text-slate-300">{cluster.nodes_count}</td>
                      <td className="py-3 px-4 text-slate-300">{cluster.namespaces_count}</td>
                      <td className="py-3 px-4">{getStatusBadge(cluster.health_status)}</td>
                      <td className="py-3 px-4 text-slate-400">{cluster.last_sync}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setWorkloadClusterFilter(cluster.name);
                            handleNavigate('workloads');
                          }}
                          className="px-2.5 py-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors"
                        >
                          View Workloads
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 3: WORKLOADS & PODS                                          */}
      {/* ==================================================================== */}
      {currentView === 'workloads' && (
        <div className="space-y-6">
          {/* Workload Type Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
            {['All Workloads', 'Deployments', 'StatefulSets', 'DaemonSets', 'Jobs', 'CronJobs'].map((typeTab) => (
              <button
                key={typeTab}
                onClick={() => setWorkloadTypeFilter(typeTab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  workloadTypeFilter === typeTab
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {typeTab}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#111827]/60 border border-slate-800 rounded-lg p-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workloads..."
                value={workloadSearch}
                onChange={(e) => setWorkloadSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <select
                value={workloadClusterFilter}
                onChange={(e) => setWorkloadClusterFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Cluster: All</option>
                <option value="prod-cluster">prod-cluster</option>
                <option value="staging-cluster">staging-cluster</option>
                <option value="dev-cluster">dev-cluster</option>
                <option value="infra-cluster">infra-cluster</option>
              </select>

              <select
                value={workloadNamespaceFilter}
                onChange={(e) => setWorkloadNamespaceFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Namespace: All</option>
                <option value="prod">prod</option>
                <option value="staging">staging</option>
                <option value="ml">ml</option>
                <option value="monitoring">monitoring</option>
                <option value="ingress">ingress</option>
              </select>

              <select
                value={workloadRiskFilter}
                onChange={(e) => setWorkloadRiskFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Risk Level: All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Workloads Table */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Workload Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">Cluster</th>
                    <th className="py-3 px-4">Pods</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Findings</th>
                    <th className="py-3 px-4">Image</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {workloads.map((wl) => (
                    <tr
                      key={wl.id}
                      onClick={() => handleNavigate('detail', wl.id)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-blue-400">
                        {wl.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {wl.workload_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{wl.namespace}</td>
                      <td className="py-3 px-4 text-slate-300">{wl.cluster_name}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{wl.pods_count}</td>
                      <td className="py-3 px-4">{getRiskBadge(wl.risk_level)}</td>
                      <td className="py-3 px-4 font-semibold text-white">{wl.findings_count}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-[160px]">
                        {wl.image_name}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(wl.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate('detail', wl.id);
                          }}
                          className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {workloads.length === 0 && !loading && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No Kubernetes workloads matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 4: KUBERNETES FINDINGS                                       */}
      {/* ==================================================================== */}
      {currentView === 'findings' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#111827]/60 border border-slate-800 rounded-lg p-3 text-xs">
            <div className="text-slate-300 font-medium">
              Filter cluster security findings
            </div>
            <div className="flex items-center gap-3">
              <select
                value={findingSeverityFilter}
                onChange={(e) => setFindingSeverityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="All">Severity: All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={findingCategoryFilter}
                onChange={(e) => setFindingCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="All">Category: All</option>
                <option value="Misconfigurations">Misconfigurations</option>
                <option value="Vulnerable Images">Vulnerable Images</option>
                <option value="Privileged Containers">Privileged Containers</option>
                <option value="Excessive Permissions">Excessive Permissions</option>
              </select>
            </div>
          </div>

          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                  <th className="py-3 px-4">Finding ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Cluster / Namespace</th>
                  <th className="py-3 px-4">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{f.id}</td>
                    <td className="py-3 px-4">{getRiskBadge(f.severity)}</td>
                    <td className="py-3 px-4 font-semibold text-white">{f.title}</td>
                    <td className="py-3 px-4 text-slate-300">{f.category}</td>
                    <td className="py-3 px-4 font-mono text-blue-400">{f.resource_name}</td>
                    <td className="py-3 px-4 text-slate-400">{f.cluster} / {f.namespace}</td>
                    <td className="py-3 px-4 text-slate-300 text-[11px] truncate max-w-xs">{f.remediation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 5: WORKLOAD DETAIL VIEW                                      */}
      {/* ==================================================================== */}
      {currentView === 'detail' && workloadDetail && (
        <div className="space-y-6">
          <button
            onClick={() => handleNavigate('workloads')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            ← Back to Workloads
          </button>

          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400">{workloadDetail.workload.workload_type} in {workloadDetail.workload.namespace}</span>
                <h2 className="text-xl font-bold text-white mt-1">{workloadDetail.workload.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Image: {workloadDetail.workload.image_name}</p>
              </div>
              <div className="flex items-center gap-3">
                {getRiskBadge(workloadDetail.workload.risk_level)}
                {getStatusBadge(workloadDetail.workload.status)}
              </div>
            </div>

            {/* Workload Security Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <span className="text-[11px] text-slate-400">Run as Non-Root</span>
                <div className="text-sm font-semibold text-rose-400 mt-1 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Disabled (Runs as root)
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <span className="text-[11px] text-slate-400">Read-Only Root FS</span>
                <div className="text-sm font-semibold text-rose-400 mt-1 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Disabled
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <span className="text-[11px] text-slate-400">Privilege Escalation</span>
                <div className="text-sm font-semibold text-amber-400 mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Allowed
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <span className="text-[11px] text-slate-400">Linux Capabilities</span>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  Default (SYS_CHROOT, NET_RAW)
                </div>
              </div>
            </div>

            {/* Findings associated with this workload */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Workload Security Findings ({workloadDetail.findings.length})
              </h4>
              <div className="space-y-2">
                {workloadDetail.findings.map((f) => (
                  <div key={f.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(f.severity)}
                        <span className="font-semibold text-white">{f.title}</span>
                      </div>
                      <p className="text-slate-400 mt-1">{f.remediation}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{f.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Cluster Modal */}
      {isAddClusterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                Connect Kubernetes Cluster
              </h3>
              <button
                onClick={() => setIsAddClusterOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide kubeconfig credentials or connect your managed EKS / AKS / GKE cluster through an authorized service account.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Cluster Name</label>
                <input
                  type="text"
                  placeholder="e.g. prod-primary-cluster"
                  value={newClusterForm.name}
                  onChange={(e) => setNewClusterForm({ ...newClusterForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Cloud Provider</label>
                <select
                  value={newClusterForm.provider}
                  onChange={(e) => setNewClusterForm({ ...newClusterForm, provider: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="AWS">AWS EKS</option>
                  <option value="Azure">Azure AKS</option>
                  <option value="GCP">Google GKE</option>
                  <option value="On-prem">On-Premises / Bare Metal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">API Server Endpoint</label>
                <input
                  type="text"
                  placeholder="https://k8s-api.example.com"
                  value={newClusterForm.api_server}
                  onChange={(e) => setNewClusterForm({ ...newClusterForm, api_server: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setIsAddClusterOpen(false)}
                className="px-4 py-2 rounded-md bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsAddClusterOpen(false);
                  loadClustersData();
                }}
                className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Verify & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KubernetesWorkloadsView;
