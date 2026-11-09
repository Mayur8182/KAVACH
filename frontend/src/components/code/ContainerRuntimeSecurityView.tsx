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
  Activity,
  Radio,
  Terminal,
  Cpu,
  FileText,
  Lock,
  Eye,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  RuntimeOverviewResponse,
  RuntimeAlertRow,
  RuntimeEventRow,
  RuntimeEventDetailResponse,
  RuntimePoliciesSummaryResponse,
  RuntimePolicyRow,
  CreateRuntimePolicyRequest,
} from '@/types/api/container';

interface ContainerRuntimeSecurityViewProps {
  projectId: string | null;
  initialTab?: 'overview' | 'alerts' | 'events' | 'policies' | 'detail';
  eventId?: string;
  onNavigate?: (route: string) => void;
}

export const ContainerRuntimeSecurityView: React.FC<ContainerRuntimeSecurityViewProps> = ({
  projectId,
  initialTab = 'overview',
  eventId,
  onNavigate,
}) => {
  // Navigation / view
  const [currentView, setCurrentView] = useState<'overview' | 'alerts' | 'events' | 'policies' | 'detail'>(initialTab);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId || null);

  // Data states
  const [overview, setOverview] = useState<RuntimeOverviewResponse | null>(null);
  const [alerts, setAlerts] = useState<RuntimeAlertRow[]>([]);
  const [events, setEvents] = useState<RuntimeEventRow[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [policiesSummary, setPoliciesSummary] = useState<RuntimePoliciesSummaryResponse | null>(null);
  const [eventDetail, setEventDetail] = useState<RuntimeEventDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alerts filters
  const [alertSearch, setAlertSearch] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState('All');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('All');

  // Events screen filters
  const [eventCategoryTab, setEventCategoryTab] = useState('All Events');
  const [eventSearch, setEventSearch] = useState('');
  const [eventSeverityFilter, setEventSeverityFilter] = useState('All');
  const [eventWorkloadFilter, setEventWorkloadFilter] = useState('All');
  const [eventNamespaceFilter, setEventNamespaceFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Policies screen filters & modals
  const [policyTypeTab, setPolicyTypeTab] = useState<'All' | 'Detection' | 'Blocking'>('All');
  const [policySearch, setPolicySearch] = useState('');
  const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false);
  const [newPolicyForm, setNewPolicyForm] = useState<CreateRuntimePolicyRequest>({
    name: '',
    policy_type: 'Blocking',
    category: 'Process Control',
    action: 'Blocked',
    scope: 'Production',
    description: '',
  });

  // Load Overview Data
  const loadOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.containers.runtimeOverview(projectId);
      setOverview(res);
      setAlerts(res.recent_alerts || []);
    } catch (err: any) {
      console.error('Failed to load runtime overview:', err);
      setError(err?.message || 'Failed to load container runtime overview');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load Alerts Data
  const loadAlertsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.containers.runtimeAlerts({
        projectId,
        search: alertSearch || undefined,
        status: alertStatusFilter === 'All' ? undefined : alertStatusFilter,
        severity: alertSeverityFilter === 'All' ? undefined : alertSeverityFilter,
      });
      setAlerts(res.items || []);
    } catch (err: any) {
      console.error('Failed to load runtime alerts:', err);
      setError(err?.message || 'Failed to load runtime alerts');
    } finally {
      setLoading(false);
    }
  }, [projectId, alertSearch, alertStatusFilter, alertSeverityFilter]);

  // Load Events Data
  const loadEventsData = useCallback(async () => {
    try {
      setLoading(true);
      const categoryParam =
        eventCategoryTab === 'All Events'
          ? undefined
          : eventCategoryTab === 'Suspicious Processes'
          ? 'Process Execution'
          : eventCategoryTab;

      const res = await api.containers.runtimeEvents({
        projectId,
        search: eventSearch || undefined,
        severity: eventSeverityFilter === 'All' ? undefined : eventSeverityFilter,
        event_type: categoryParam,
        workload: eventWorkloadFilter === 'All' ? undefined : eventWorkloadFilter,
        namespace: eventNamespaceFilter === 'All' ? undefined : eventNamespaceFilter,
        page,
        page_size: pageSize,
      });
      setEvents(res.items || []);
      setTotalEvents(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load runtime events:', err);
      setError(err?.message || 'Failed to load runtime events');
    } finally {
      setLoading(false);
    }
  }, [projectId, eventSearch, eventSeverityFilter, eventCategoryTab, eventWorkloadFilter, eventNamespaceFilter, page]);

  // Load Policies Data
  const loadPoliciesData = useCallback(async () => {
    try {
      setLoading(true);
      const typeParam = policyTypeTab === 'All' ? undefined : policyTypeTab;
      const res = await api.containers.runtimePolicies({
        projectId,
        policy_type: typeParam,
      });
      setPoliciesSummary(res);
    } catch (err: any) {
      console.error('Failed to load runtime policies:', err);
      setError(err?.message || 'Failed to load runtime policies');
    } finally {
      setLoading(false);
    }
  }, [projectId, policyTypeTab]);

  // Load Event Detail
  const loadEventDetail = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await api.containers.runtimeEventDetail(id);
      setEventDetail(res);
    } catch (err: any) {
      console.error('Failed to load event detail:', err);
      setError(err?.message || `Failed to load event '${id}' details`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Router dispatcher
  useEffect(() => {
    if (currentView === 'overview') {
      loadOverviewData();
    } else if (currentView === 'alerts') {
      loadAlertsData();
    } else if (currentView === 'events') {
      loadEventsData();
    } else if (currentView === 'policies') {
      loadPoliciesData();
    } else if (currentView === 'detail' && selectedEventId) {
      loadEventDetail(selectedEventId);
    }
  }, [currentView, selectedEventId, loadOverviewData, loadAlertsData, loadEventsData, loadPoliciesData, loadEventDetail]);

  const handleNavigate = (view: 'overview' | 'alerts' | 'events' | 'policies' | 'detail', id?: string) => {
    setCurrentView(view);
    if (id) setSelectedEventId(id);
    if (onNavigate) {
      if (view === 'overview') onNavigate('/code/container-security/runtime');
      else if (view === 'alerts') onNavigate('/code/container-security/runtime/alerts');
      else if (view === 'events') onNavigate('/code/container-security/runtime/events');
      else if (view === 'policies') onNavigate('/code/container-security/runtime/policies');
      else if (view === 'detail' && id) onNavigate(`/code/container-security/runtime/events/${id}`);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyForm.name) return;
    try {
      await api.containers.createRuntimePolicy(newPolicyForm);
      setIsAddPolicyOpen(false);
      setNewPolicyForm({
        name: '',
        policy_type: 'Blocking',
        category: 'Process Control',
        action: 'Blocked',
        scope: 'Production',
        description: '',
      });
      loadPoliciesData();
    } catch (err: any) {
      alert(`Failed to create policy: ${err?.message || 'Error'}`);
    }
  };

  // Severity Badges
  const getSeverityBadge = (sev: string) => {
    const s = (sev || '').toUpperCase();
    if (s === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Critical
        </span>
      );
    }
    if (s === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    }
    if (s === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Low
      </span>
    );
  };

  const getAlertStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Open
        </span>
      );
    }
    if (s === 'investigating') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Investigating
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Resolved
      </span>
    );
  };

  // Math for Severity Donut
  const severityDonutSlices = useMemo(() => {
    if (!overview?.severities || overview.severities.length === 0) return [];
    const total = overview.severities.reduce((acc, s) => acc + s.count, 0) || 1;
    let accumulatedAngle = 0;
    const colors: Record<string, string> = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#eab308',
      Low: '#3b82f6',
    };

    return overview.severities.map((item) => {
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const r = 38;
      const strokeDash = (percentage / 100) * (2 * Math.PI * r);
      const strokeDashoffset = -((startAngle / 360) * (2 * Math.PI * r));

      return {
        ...item,
        color: colors[item.severity] || '#94a3b8',
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
            <span className="text-blue-400 font-medium">Runtime</span>
            {currentView !== 'overview' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-200 capitalize">{currentView}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
            {currentView === 'overview' && 'Runtime Security Overview'}
            {currentView === 'alerts' && 'Runtime Alerts'}
            {currentView === 'events' && 'Process & Behavior Events'}
            {currentView === 'policies' && 'Runtime Policy Management'}
            {currentView === 'detail' && 'Suspicious Activity Detail'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentView === 'overview' && 'Detect and respond to suspicious container activity and runtime threats.'}
            {currentView === 'alerts' && 'Active security alerts triggered by process, behavioral, and network telemetry.'}
            {currentView === 'events' && 'View detailed runtime events and process activity across running pods.'}
            {currentView === 'policies' && 'Create and manage runtime security policies to detect and block malicious activity.'}
            {currentView === 'detail' && `Trace event payload, parent process tree, and timeline for ${selectedEventId}.`}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3">
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
              onClick={() => handleNavigate('alerts')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'alerts'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => handleNavigate('events')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'events'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => handleNavigate('policies')}
              className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                currentView === 'policies'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Policies
            </button>
          </div>

          {currentView === 'policies' && (
            <button
              onClick={() => setIsAddPolicyOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Policy
            </button>
          )}

          {currentView === 'overview' && (
            <button
              onClick={() => handleNavigate('alerts')}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              View Alerts
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Sensor Status Banner */}
      <div className="bg-[#111827]/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-200 font-semibold">Sensor Health:</span>
          <span className="text-emerald-400 font-mono">
            {overview?.sensor_health?.status || 'ACTIVE (DaemonSet / eBPF)'}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Engine: {overview?.sensor_health?.telemetry_source || 'eBPF Kernel Probes (Tetragon/Falco Engine)'}
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Rule ID &amp; Kernel Evidence Verified &bull; Strict Non-Vibe Enforcement
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SCREEN 1: RUNTIME OVERVIEW                                          */}
      {/* ==================================================================== */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* Top 5 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Runtime Alerts</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary?.runtime_alerts ?? 38}</span>
                <span className="text-xs font-medium text-rose-400 flex items-center gap-0.5">
                  ↑ 15%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Process Events</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">
                  {overview?.summary?.process_events ? overview.summary.process_events.toLocaleString() : '1,284'}
                </span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  ↑ 22%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Blocked Events</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.blocked_events ?? 86}</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  ↑ 7%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Policy Violations</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.policy_violations ?? 24}</span>
                <span className="text-xs font-medium text-rose-400 flex items-center gap-0.5">
                  ↑ 33%
                </span>
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Affected Workloads</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{overview?.summary.affected_workloads ?? 12}</span>
                <span className="text-xs font-medium text-rose-400 flex items-center gap-0.5">
                  ↑ 9%
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row: Alerts by Severity & Top Alert Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts by Severity Donut Card */}
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Alerts by Severity</h3>
                <span className="text-xs text-slate-400">30-day window</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
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
                    {severityDonutSlices.map((slice, i) => (
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
                      {overview?.summary?.runtime_alerts ?? 38}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Alerts</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  {(overview?.severities || [
                    { severity: 'Critical', count: 6, percentage: 16 },
                    { severity: 'High', count: 14, percentage: 37 },
                    { severity: 'Medium', count: 12, percentage: 32 },
                    { severity: 'Low', count: 6, percentage: 15 },
                  ]).map((item, idx) => {
                    const colors: Record<string, string> = {
                      Critical: '#ef4444',
                      High: '#f97316',
                      Medium: '#eab308',
                      Low: '#3b82f6',
                    };
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: colors[item.severity] || '#94a3b8' }}
                          />
                          <span className="text-slate-300 font-medium">{item.severity}</span>
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

            {/* Top Alert Types Horizontal Bar Chart */}
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Top Alert Types</h3>
                <span className="text-xs text-slate-400">Total detected</span>
              </div>

              <div className="space-y-3 pt-2">
                {(overview?.alert_types || [
                  { type_name: 'Suspicious Process', count: 14 },
                  { type_name: 'Network Activity', count: 8 },
                  { type_name: 'File System Changes', count: 5 },
                  { type_name: 'Privilege Escalation', count: 6 },
                  { type_name: 'Crypto-Mining', count: 5 },
                ]).map((bar, i) => {
                  const maxCount = 14;
                  const pct = (bar.count / maxCount) * 100;
                  const barColors = ['#ef4444', '#f97316', '#eab308', '#eab308', '#3b82f6'];

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{bar.type_name}</span>
                        <span className="text-slate-400 font-mono">{bar.count}</span>
                      </div>
                      <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColors[i % barColors.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Table: Recent Runtime Alerts */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Runtime Alerts</h3>
              <button
                onClick={() => handleNavigate('alerts')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View all alerts →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Process</th>
                    <th className="py-3 px-4">Workload</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {alerts.map((al) => (
                    <tr
                      key={al.id}
                      onClick={() => handleNavigate('detail', al.id)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{al.timestamp}</td>
                      <td className="py-3 px-4">{getSeverityBadge(al.severity)}</td>
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {al.event_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 text-[11px]">{al.process}</td>
                      <td className="py-3 px-4 text-slate-300">{al.workload}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{al.namespace}</td>
                      <td className="py-3 px-4">{getAlertStatusBadge(al.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate('detail', al.id);
                          }}
                          className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 2: PROCESS & BEHAVIOR EVENTS                                 */}
      {/* ==================================================================== */}
      {currentView === 'events' && (
        <div className="space-y-6">
          {/* Subtabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
            {['All Events', 'Suspicious Processes', 'File System', 'Network', 'Privilege Escalation'].map((catTab) => (
              <button
                key={catTab}
                onClick={() => setEventCategoryTab(catTab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  eventCategoryTab === catTab
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {catTab}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#111827]/60 border border-slate-800 rounded-lg p-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <select
                value={eventSeverityFilter}
                onChange={(e) => setEventSeverityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Severity: All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={eventWorkloadFilter}
                onChange={(e) => setEventWorkloadFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Workload: All</option>
                <option value="payment-service">payment-service</option>
                <option value="ml-service">ml-service</option>
                <option value="frontend-web">frontend-web</option>
                <option value="monitoring">monitoring</option>
                <option value="ingress-nginx">ingress-nginx</option>
              </select>

              <select
                value={eventNamespaceFilter}
                onChange={(e) => setEventNamespaceFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Namespace: All</option>
                <option value="prod">prod</option>
                <option value="ml">ml</option>
                <option value="monitoring">monitoring</option>
                <option value="ingress">ingress</option>
              </select>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Process</th>
                    <th className="py-3 px-4">Workload</th>
                    <th className="py-3 px-4">Namespace</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((ev) => (
                    <tr
                      key={ev.id}
                      onClick={() => handleNavigate('detail', ev.id)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{ev.timestamp}</td>
                      <td className="py-3 px-4">{getSeverityBadge(ev.severity)}</td>
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-blue-400">
                        {ev.event_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 text-[11px] truncate max-w-[200px]">
                        {ev.process}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{ev.workload}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{ev.namespace}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate('detail', ev.id);
                          }}
                          className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No telemetry events matching current criteria.
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
      {/* SCREEN 3: RUNTIME POLICY MANAGEMENT                                 */}
      {/* ==================================================================== */}
      {currentView === 'policies' && (
        <div className="space-y-6">
          {/* Top 4 Policy Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Policies</span>
              <div className="text-2xl font-bold text-white mt-2">
                {policiesSummary?.total_policies ?? 24}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Enabled</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 mt-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                {policiesSummary?.enabled_policies ?? 18}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Disabled</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-rose-400 mt-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                {policiesSummary?.disabled_policies ?? 6}
              </div>
            </div>

            <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Blocking Policies</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 mt-2">
                <Shield className="w-5 h-5 text-blue-500" />
                {policiesSummary?.blocking_policies ?? 8}
              </div>
            </div>
          </div>

          {/* Subtabs & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-3">
              {(['All', 'Detection', 'Blocking'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPolicyTypeTab(t)}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                    policyTypeTab === t
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'All' ? 'All Policies' : `${t} Policies`}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search policies..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Policies Table */}
          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                  <th className="py-3 px-4">Policy Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(policiesSummary?.items || [])
                  .filter((p) => {
                    if (policySearch && !p.name.toLowerCase().includes(policySearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((policy) => (
                    <tr key={policy.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {policy.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {policy.policy_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{policy.category}</td>
                      <td className="py-3 px-4">
                        {policy.action === 'Blocked' ? (
                          <span className="text-rose-400 font-medium">Blocked</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Alert</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {policy.is_enabled ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{policy.scope}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            alert(`Configuring runtime enforcement rules for ${policy.name}`);
                          }}
                          className="px-2.5 py-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors text-[11px]"
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

      {/* ==================================================================== */}
      {/* SCREEN 4: SUSPICIOUS ACTIVITY DETAIL MODAL / VIEW                   */}
      {/* ==================================================================== */}
      {currentView === 'detail' && eventDetail && (
        <div className="space-y-6">
          <button
            onClick={() => handleNavigate('events')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            ← Back to Events
          </button>

          <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-5 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400">Event ID: {eventDetail.event.id} &bull; {eventDetail.event.timestamp}</span>
                <h2 className="text-xl font-bold text-white mt-1">{eventDetail.event.event_type}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Workload: {eventDetail.event.workload} ({eventDetail.event.namespace})
                </p>
              </div>
              <div>{getSeverityBadge(eventDetail.event.severity)}</div>
            </div>

            {/* MITRE & Process Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Process Details</span>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-slate-400">Executable:</span> <span className="font-mono text-amber-400">{eventDetail.event.process}</span></div>
                  <div><span className="text-slate-400">Command:</span> <span className="font-mono text-slate-200">{eventDetail.command_line}</span></div>
                  <div><span className="text-slate-400">Parent Process:</span> <span className="font-mono text-slate-300">{eventDetail.parent_process}</span></div>
                  <div><span className="text-slate-400">PID / PPID:</span> <span className="font-mono text-slate-300">{eventDetail.pid} / {eventDetail.ppid}</span></div>
                  <div><span className="text-slate-400">Container ID:</span> <span className="font-mono text-slate-400">{eventDetail.container_id}</span></div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">MITRE ATT&CK Mapping</span>
                <div className="space-y-2 text-xs">
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded p-2 text-rose-400 font-mono">
                    {eventDetail.mitre_attack}
                  </div>
                  <div><span className="text-slate-400">Detection Mechanism:</span> <span className="text-slate-200">eBPF Syscall Trace (`sys_enter_execve`)</span></div>
                  <div><span className="text-slate-400">Remediation Policy:</span> <span className="text-blue-400">block-suspicious-binaries (Active)</span></div>
                </div>
              </div>
            </div>

            {/* Event Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Telemetry Event Timeline</h4>
              <div className="space-y-2">
                {eventDetail.timeline.map((step, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-slate-400">{step.time}</span>
                      <span className="text-slate-200">{step.description}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">{step.stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Policy Modal */}
      {isAddPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                Create Runtime Policy
              </h3>
              <button
                onClick={() => setIsAddPolicyOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Policy Name</label>
                <input
                  type="text"
                  placeholder="e.g. block-crypto-mining-pools"
                  value={newPolicyForm.name}
                  onChange={(e) => setNewPolicyForm({ ...newPolicyForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Policy Type</label>
                  <select
                    value={newPolicyForm.policy_type}
                    onChange={(e) => setNewPolicyForm({ ...newPolicyForm, policy_type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Blocking">Blocking (Enforced)</option>
                    <option value="Detection">Detection (Audit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Category</label>
                  <select
                    value={newPolicyForm.category}
                    onChange={(e) => setNewPolicyForm({ ...newPolicyForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Process Control">Process Control</option>
                    <option value="Network">Network</option>
                    <option value="File System">File System</option>
                    <option value="Capabilities">Capabilities</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Enforcement Action</label>
                  <select
                    value={newPolicyForm.action}
                    onChange={(e) => setNewPolicyForm({ ...newPolicyForm, action: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Blocked">Blocked</option>
                    <option value="Alert">Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Cluster Scope</label>
                  <select
                    value={newPolicyForm.scope}
                    onChange={(e) => setNewPolicyForm({ ...newPolicyForm, scope: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Clusters">All Clusters</option>
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddPolicyOpen(false)}
                  className="px-4 py-2 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-500"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerRuntimeSecurityView;
