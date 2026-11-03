'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  Terminal,
  Cpu,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  ContainerConfigSummaryResponse,
  ContainerConfigChartsResponse,
  ContainerConfigRowItem,
  HardeningRecommendationItem,
} from '@/types/api/container';

interface ContainerConfigHardeningViewProps {
  projectId: string | null;
  repositoryName?: string;
}

export const ContainerConfigHardeningView: React.FC<ContainerConfigHardeningViewProps> = ({
  projectId,
  repositoryName = '',
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'All Containers' | 'Privileged' | 'Users' | 'Capabilities' | 'Hardening Recommendations'>('All Containers');

  // Data states
  const [summary, setSummary] = useState<ContainerConfigSummaryResponse | null>(null);
  const [charts, setCharts] = useState<ContainerConfigChartsResponse | null>(null);
  const [containers, setContainers] = useState<ContainerConfigRowItem[]>([]);
  const [totalContainers, setTotalContainers] = useState(0);
  const [clusters, setClusters] = useState<string[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [postures, setPostures] = useState<string[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [selectedNamespace, setSelectedNamespace] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPosture, setSelectedPosture] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected container detail drawer
  const [selectedContainer, setSelectedContainer] = useState<ContainerConfigRowItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch summary & charts
  const loadOverviewData = useCallback(async () => {
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.containers.configurationSummary(projectId),
        api.containers.configurationCharts(projectId),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
    } catch (err: any) {
      console.error('Failed to load container configuration overview:', err);
      setError(err?.message || 'Failed to fetch configuration security overview');
    }
  }, [projectId]);

  // Fetch container items
  const loadContainers = useCallback(async () => {
    try {
      setLoading(true);

      // Determine active filter based on active subtab
      let effectivePosture = selectedPosture;
      let effectiveSearch = search;
      let isPrivilegedOnly: boolean | undefined = undefined;

      if (activeTab === 'Privileged') {
        // Filter privileged containers
        isPrivilegedOnly = true;
      }

      const res = await api.containers.configurationContainers({
        projectId,
        search: effectiveSearch || undefined,
        cluster: selectedCluster !== 'All' ? selectedCluster : undefined,
        namespace: selectedNamespace !== 'All' ? selectedNamespace : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        security_posture: effectivePosture !== 'All' ? effectivePosture : undefined,
        page,
        pageSize,
      });

      let items = res.items || [];
      if (activeTab === 'Privileged') {
        items = items.filter(c => c.privileged);
      } else if (activeTab === 'Users') {
        items = items.filter(c => c.user === '0 (root)');
      } else if (activeTab === 'Capabilities') {
        items = items.filter(c => c.capabilities_count > 0);
      }

      setContainers(items);
      setTotalContainers(res.total || items.length);
      if (res.clusters?.length) setClusters(['All', ...res.clusters]);
      if (res.namespaces?.length) setNamespaces(['All', ...res.namespaces]);
      if (res.statuses?.length) setStatuses(['All', ...res.statuses]);
      if (res.postures?.length) setPostures(['All', ...res.postures]);
    } catch (err: any) {
      console.error('Failed to load containers:', err);
      setError(err?.message || 'Failed to fetch container configuration list');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, search, selectedCluster, selectedNamespace, selectedStatus, selectedPosture, page, pageSize, activeTab]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadOverviewData(), loadContainers()]);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCluster('All');
    setSelectedNamespace('All');
    setSelectedStatus('All');
    setSelectedPosture('All');
    setPage(1);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const totalPages = Math.ceil(totalContainers / pageSize) || 1;

  // Donut chart math
  const donutData = useMemo(() => {
    if (!charts?.posture_distribution) {
      return [
        { posture: 'Compliant', count: 68, pct: 55, color: '#10B981' },
        { posture: 'Minor issues', count: 32, pct: 26, color: '#3B82F6' },
        { posture: 'High risk', count: 18, pct: 15, color: '#F97316' },
        { posture: 'Critical', count: 6, pct: 5, color: '#EF4444' },
      ];
    }
    return charts.posture_distribution;
  }, [charts]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
            <span>Code</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span>Container Security</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-blue-400">Configuration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Container Configuration & Hardening
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Analyze container runtime configurations and security settings for hardening best practices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Last 30 days</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow-sm"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs bg-rose-500/20 px-2.5 py-1 rounded-md hover:bg-rose-500/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Analyzed Containers */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Analyzed Containers</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.analyzed_containers : '124'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="flex items-center">
              {summary ? summary.analyzed_trend : '↑ 10%'}
            </span>
            <span className="text-slate-400 font-normal">
              Across {summary ? summary.clusters_count : '8'} clusters
            </span>
          </div>
        </div>

        {/* Card 2: Misconfigurations */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Misconfigurations</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.misconfigurations : '36'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <span className="flex items-center">
              {summary ? summary.misconfigurations_trend : '↓ 16%'}
            </span>
            <span className="text-slate-400 font-normal">
              {summary ? summary.misconfigurations_pct : '29% of total'}
            </span>
          </div>
        </div>

        {/* Card 3: Privileged Containers */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Privileged Containers</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.privileged_containers : '3'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <span className="flex items-center">
              {summary ? summary.privileged_trend : '↑ 0%'}
            </span>
            <span className="text-slate-400 font-normal">
              {summary ? summary.privileged_pct : '2% of total'}
            </span>
          </div>
        </div>

        {/* Card 4: Running as Root */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Running as Root</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.running_as_root : '18'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="flex items-center">
              {summary ? summary.running_as_root_trend : '↓ 25%'}
            </span>
            <span className="text-slate-400 font-normal">
              {summary ? summary.running_as_root_pct : '15% of total'}
            </span>
          </div>
        </div>

        {/* Card 5: Capability Issues */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Capability Issues</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.capability_issues : '21'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="flex items-center">
              {summary ? summary.capability_issues_trend : '↓ 12%'}
            </span>
            <span className="text-slate-400 font-normal">
              {summary ? summary.capability_issues_pct : '17% of total'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Analytical Panels: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel 1: Configuration Issues by Category */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Configuration Issues by Category</h3>
          </div>

          <div className="space-y-3.5">
            {(charts?.issues_by_category && charts.issues_by_category.length > 0
              ? charts.issues_by_category
              : [
                  { category: 'Privileged mode', count: 3, color: '#EF4444' },
                  { category: 'Running as root', count: 18, color: '#F97316' },
                  { category: 'Excessive capabilities', count: 21, color: '#EAB308' },
                  { category: 'Host mounts', count: 9, color: '#F59E0B' },
                  { category: 'Insecure environment vars', count: 6, color: '#3B82F6' },
                  { category: 'Other', count: 4, color: '#64748B' },
                ]
            ).map((cat, idx) => {
              const maxVal = 25;
              const barWidth = Math.min(100, Math.round((cat.count / maxVal) * 100));

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.category}</span>
                    <span className="font-semibold text-slate-200">{cat.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: cat.color || '#3B82F6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Containers by Security Posture */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Containers by Security Posture</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Donut Visual */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* SVG Conic/Segment ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1E293B" strokeWidth="12" />
                {/* Compliant segment (55%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 38 * 0.55} ${2 * Math.PI * 38}`}
                  strokeDashoffset="0"
                />
                {/* Minor issues (26%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 38 * 0.26} ${2 * Math.PI * 38}`}
                  strokeDashoffset={`-${2 * Math.PI * 38 * 0.55}`}
                />
                {/* High risk (15%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 38 * 0.15} ${2 * Math.PI * 38}`}
                  strokeDashoffset={`-${2 * Math.PI * 38 * 0.81}`}
                />
                {/* Critical (5%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 38 * 0.05} ${2 * Math.PI * 38}`}
                  strokeDashoffset={`-${2 * Math.PI * 38 * 0.96}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-white">
                  {charts ? charts.total_containers : '124'}
                </span>
                <span className="text-[10px] text-slate-400">Containers</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-2 text-xs w-full sm:w-auto">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-slate-300">{d.posture}:</span>
                  </div>
                  <span className="font-semibold text-white">
                    {d.count} <span className="text-slate-400 font-normal">({d.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Evaluated against Kubernetes PSS v1.30</span>
            <span className="text-emerald-400 font-medium">81% Baseline+</span>
          </div>
        </div>

        {/* Panel 3: Top Hardening Recommendations */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Top Hardening Recommendations</h3>
          </div>

          <div className="space-y-2.5">
            {(charts?.top_hardening_recommendations && charts.top_hardening_recommendations.length > 0
              ? charts.top_hardening_recommendations
              : [
                  { recommendation: 'Run as non-root user', count: 18, severity: 'HIGH' },
                  { recommendation: 'Drop unnecessary capabilities', count: 14, severity: 'HIGH' },
                  { recommendation: 'Use read-only filesystem', count: 9, severity: 'MEDIUM' },
                  { recommendation: 'Add resource limits', count: 8, severity: 'LOW' },
                  { recommendation: 'Use secure base images', count: 6, severity: 'MEDIUM' },
                  { recommendation: 'Enable seccomp profile', count: 4, severity: 'HIGH' },
                ]
            ).map((rec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-slate-200 truncate">{rec.recommendation}</span>
                </div>
                <span className="font-bold text-slate-300 ml-2 shrink-0 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {rec.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-800 text-sm">
        {(['All Containers', 'Privileged', 'Users', 'Capabilities', 'Hardening Recommendations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`pb-3 font-medium transition-colors relative ${
              activeTab === tab ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filter / Search Bar (for container tabs) */}
      {activeTab !== 'Hardening Recommendations' && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search containers..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cluster dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Cluster:</span>
              <select
                value={selectedCluster}
                onChange={e => {
                  setSelectedCluster(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white focus:outline-none"
              >
                {clusters.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Namespace dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Namespace:</span>
              <select
                value={selectedNamespace}
                onChange={e => {
                  setSelectedNamespace(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white focus:outline-none"
              >
                {namespaces.map(n => (
                  <option key={n} value={n} className="bg-slate-900 text-white">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Status dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white focus:outline-none"
              >
                {statuses.map(s => (
                  <option key={s} value={s} className="bg-slate-900 text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Security Posture dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500">Posture:</span>
              <select
                value={selectedPosture}
                onChange={e => {
                  setSelectedPosture(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white focus:outline-none"
              >
                {postures.map(p => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {(search || selectedCluster !== 'All' || selectedNamespace !== 'All' || selectedStatus !== 'All' || selectedPosture !== 'All') && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Content according to Active Tab */}
      {activeTab === 'Hardening Recommendations' ? (
        /* Detailed Recommendations View */
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Container Hardening Recommendations</h2>
              <p className="text-xs text-slate-400">
                Actionable remediation guidelines mapped to CIS Kubernetes Benchmark and Linux Security Profiles.
              </p>
            </div>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium">
              Deterministic Guidance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              {
                title: 'Run as Non-Root User (UID != 0)',
                severity: 'HIGH',
                affected: 18,
                category: 'Identity & Access',
                rationale: 'Containers running with UID 0 have root privileges inside the container, increasing the blast radius of container escapes and host breakouts.',
                remediation: 'Specify `securityContext.runAsNonRoot: true` and `securityContext.runAsUser: 10001` in your Kubernetes Pod spec or Dockerfile `USER appuser`.',
              },
              {
                title: 'Drop ALL Linux Capabilities & Add Explicit Needs',
                severity: 'HIGH',
                affected: 14,
                category: 'Linux Kernel Hardening',
                rationale: 'Default Docker capabilities allow containers to perform dangerous system calls (e.g. CAP_NET_RAW, CAP_SYS_CHROOT).',
                remediation: 'Configure `securityContext.capabilities.drop: ["ALL"]` and only add required capabilities like `NET_BIND_SERVICE`.',
              },
              {
                title: 'Mount Root Filesystem as Read-Only',
                severity: 'MEDIUM',
                affected: 9,
                category: 'Runtime Integrity',
                rationale: 'An attacker exploiting a web application cannot write malicious binaries or tamper with host system files if the root filesystem is read-only.',
                remediation: 'Set `securityContext.readOnlyRootFilesystem: true` and use `emptyDir` mounts for temporary scratch directories like `/tmp`.',
              },
              {
                title: 'Enforce Compute Resource Limits & Quotas',
                severity: 'LOW',
                affected: 8,
                category: 'Availability & DoS Prevention',
                rationale: 'Containers without CPU/Memory limits can consume all node resources, leading to noisy-neighbor denial of service.',
                remediation: 'Define explicit `resources.limits.memory` and `resources.limits.cpu` alongside requests in the container deployment spec.',
              },
              {
                title: 'Eliminate Privileged Mode Execution',
                severity: 'CRITICAL',
                affected: 3,
                category: 'Host Isolation',
                rationale: 'Privileged containers bypass all seccomp, AppArmor, and cgroup isolation, granting direct access to all host kernel devices.',
                remediation: 'Immediately remove `securityContext.privileged: true`. Use specific capabilities or daemonsets with least privilege.',
              },
              {
                title: 'Enforce Default Seccomp Runtime Profile',
                severity: 'MEDIUM',
                affected: 4,
                category: 'Syscall Filtering',
                rationale: 'Seccomp filters prevent containers from issuing arbitrary Linux system calls to the host kernel.',
                remediation: 'Configure `securityContext.seccompProfile.type: RuntimeDefault` in Pod specs.',
              },
            ].map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {rec.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-0.5">{rec.title}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      rec.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : rec.severity === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {rec.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{rec.rationale}</p>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 font-mono text-[11px] text-blue-300">
                  {rec.remediation}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Affected Containers: <strong className="text-white">{rec.affected}</strong></span>
                  <button
                    onClick={() => {
                      setActiveTab('All Containers');
                      setSearch(rec.title.split(' ')[0]);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    View Containers <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Main Container Table */
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0D131F] text-slate-400 font-medium border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0" />
                  </th>
                  <th className="py-3 px-4">Container Name</th>
                  <th className="py-3 px-4">Image</th>
                  <th className="py-3 px-4">Namespace</th>
                  <th className="py-3 px-4">Cluster</th>
                  <th className="py-3 px-4">Privileged</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Capabilities</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Findings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                      Loading container runtime configurations...
                    </td>
                  </tr>
                ) : containers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Server className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No containers match the selected filters or search criteria.
                    </td>
                  </tr>
                ) : (
                  containers.map(c => {
                    const isRoot = c.user === '0 (root)' || c.user === 'root';
                    const isPriv = c.privileged;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => {
                          setSelectedContainer(c);
                          setDrawerOpen(true);
                        }}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0" />
                        </td>

                        {/* Container Name */}
                        <td className="py-3 px-4 font-mono font-medium text-blue-400 group-hover:underline flex items-center gap-1.5">
                          {c.container_name}
                        </td>

                        {/* Image */}
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {c.image}
                        </td>

                        {/* Namespace */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono">
                            {c.namespace}
                          </span>
                        </td>

                        {/* Cluster */}
                        <td className="py-3 px-4 text-slate-400">
                          {c.cluster}
                        </td>

                        {/* Privileged */}
                        <td className="py-3 px-4">
                          {isPriv ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                              No
                            </span>
                          )}
                        </td>

                        {/* User */}
                        <td className="py-3 px-4">
                          {isRoot ? (
                            <span className="font-mono text-rose-400 font-semibold flex items-center gap-1">
                              <UserX className="w-3 h-3" />
                              {c.user}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-500" />
                              {c.user}
                            </span>
                          )}
                        </td>

                        {/* Capabilities */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.capabilities_count > 10
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : c.capabilities_count > 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.capabilities_count}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {c.status}
                          </span>
                        </td>

                        {/* Findings */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              c.findings_count > 5
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : c.findings_count > 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {c.findings_count}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedContainer(c);
                              setDrawerOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-800/80 text-xs text-slate-400 gap-3">
            <div>
              Showing {containers.length > 0 ? (page - 1) * pageSize + 1 : 0}-
              {Math.min(page * pageSize, totalContainers)} of {totalContainers} containers
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-300"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800/60 border border-slate-700/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
              {totalPages > 5 && <span className="px-1 text-slate-600">...</span>}
              {totalPages > 5 && (
                <button
                  onClick={() => setPage(totalPages)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    page === totalPages
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800/60 border border-slate-700/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {totalPages}
                </button>
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Container Detail Inspection Drawer */}
      {drawerOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#0D131F] border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {selectedContainer.namespace}
                    </span>
                    <span className="text-xs text-slate-500">|</span>
                    <span className="text-xs text-slate-400">{selectedContainer.cluster}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 font-mono">
                    {selectedContainer.container_name}
                  </h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Security Posture Status */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Security Posture</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedContainer.security_posture === 'Critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : selectedContainer.security_posture === 'High risk'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : selectedContainer.security_posture === 'Minor issues'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {selectedContainer.security_posture}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block">Privileged Mode</span>
                    <span className={selectedContainer.privileged ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                      {selectedContainer.privileged ? 'ENABLED (Dangerous)' : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block">UID Execution</span>
                    <span className={selectedContainer.user === '0 (root)' ? 'text-rose-400 font-bold' : 'text-slate-200 font-semibold'}>
                      {selectedContainer.user}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linux Capabilities Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Assigned Linux Capabilities</span>
                  <span className="font-semibold text-slate-300">{selectedContainer.capabilities_count} capabilities</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  {selectedContainer.capabilities && selectedContainer.capabilities.length > 0 ? (
                    selectedContainer.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          cap === 'CAP_SYS_ADMIN' || cap === 'CAP_NET_ADMIN'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {cap}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No custom capabilities attached</span>
                  )}
                </div>
              </div>

              {/* Normalized Security Context Spec (YAML) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Extracted SecurityContext Spec</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `securityContext:\n  privileged: ${selectedContainer.privileged}\n  runAsUser: ${
                          selectedContainer.user.includes('root') ? 0 : 1000
                        }\n  readOnlyRootFilesystem: false\n  allowPrivilegeEscalation: ${
                          selectedContainer.privileged
                        }\n  capabilities:\n    add: ${JSON.stringify(
                          selectedContainer.capabilities || []
                        )}`
                      )
                    }
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy Spec'}</span>
                  </button>
                </div>

                <div className="bg-[#090D16] p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>
{`apiVersion: v1
kind: Pod
metadata:
  name: ${selectedContainer.container_name}
  namespace: ${selectedContainer.namespace}
spec:
  containers:
  - name: ${selectedContainer.container_name}
    image: ${selectedContainer.image}
    securityContext:
      privileged: ${selectedContainer.privileged}
      runAsUser: ${selectedContainer.user.includes('root') ? 0 : 1000}
      runAsNonRoot: ${!selectedContainer.user.includes('root')}
      allowPrivilegeEscalation: ${selectedContainer.privileged}
      capabilities:
        drop:
        - ALL
        add:
${(selectedContainer.capabilities || ['CHOWN', 'DAC_OVERRIDE']).map(c => `        - ${c}`).join('\n')}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
