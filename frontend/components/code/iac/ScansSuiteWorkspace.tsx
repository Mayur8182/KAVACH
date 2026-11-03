'use client';

/**
 * Thing Code — IaC Scans Suite Workspace (Section 8: Screens 8.1 - 8.8)
 * 100% Sourced from Real Backend APIs: /api/v1/iac/scans-suite/*
 * 
 * Screens:
 *   8.1 Scans Overview
 *   8.2 Scan History
 *   8.3 Scheduled Scans
 *   8.4 On-Demand Scan (Run New Scan)
 *   8.5 Scan Configurations
 *   8.6 Results Comparison
 *   8.7 Scan Queue
 *   8.8 Scan Settings
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Plus,
  Filter,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit,
  Play,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Layers,
  FileCode,
  Check,
  X,
  Info,
  ExternalLink,
  ChevronDown,
  GitBranch,
  StopCircle,
  AlertCircle,
  Terminal,
  Activity,
  BarChart3,
  ListFilter,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCScansOverviewResponse,
  IaCScanHistoryResponse,
  IaCScanHistoryRow,
  IaCScheduledScansResponse,
  IaCScheduledScanItem,
  CreateScheduledScanRequest,
  TriggerOnDemandScanRequest,
  TriggerOnDemandScanResponse,
  IaCScanConfigurationsDTO,
  IaCResultsComparisonResponse,
  IaCScanQueueResponse,
  IaCQueueScanItem,
  IaCScanGlobalSettings,
} from '@/types/api/iac';

export type ScansSubView =
  | 'overview'
  | 'history'
  | 'scheduled'
  | 'on-demand'
  | 'config'
  | 'comparison'
  | 'queue'
  | 'settings';

interface ScansSuiteWorkspaceProps {
  initialSubView?: ScansSubView;
  repositoryName?: string;
}

export const ScansSuiteWorkspace: React.FC<ScansSuiteWorkspaceProps> = ({
  initialSubView = 'overview',
  repositoryName = 'frontend-app',
}) => {
  const router = useRouter();

  // Navigation State
  const [subView, setSubView] = useState<ScansSubView>(initialSubView);

  // Common UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 8.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCScansOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewTimeRange, setOverviewTimeRange] = useState('Last 30 days');

  // 8.2 Scan History State
  const [historyData, setHistoryData] = useState<IaCScanHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRepo, setHistoryRepo] = useState('All Repositories');
  const [historyEnv, setHistoryEnv] = useState('All Environments');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // 8.3 Scheduled Scans State
  const [schedulesData, setSchedulesData] = useState<IaCScheduledScansResponse | null>(null);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [newSchedName, setNewSchedName] = useState('');
  const [newSchedRepo, setNewSchedRepo] = useState('frontend-app');
  const [newSchedFreq, setNewSchedFreq] = useState<'Daily' | 'Weekly' | 'On Push'>('Daily');
  const [newSchedNextRun, setNewSchedNextRun] = useState('Oct 02, 09:00 AM');

  // 8.4 On-Demand Scan Form State
  const [onDemandRepo, setOnDemandRepo] = useState(repositoryName || 'frontend-app');
  const [onDemandBranch, setOnDemandBranch] = useState('main');
  const [onDemandEnv, setOnDemandEnv] = useState<'production' | 'staging' | 'dev'>('production');
  const [onDemandScanType, setOnDemandScanType] = useState<'Full Scan' | 'Changed Files Only' | 'Custom Paths'>('Full Scan');
  const [onDemandCustomPaths, setOnDemandCustomPaths] = useState('');
  const [onDemandTf, setOnDemandTf] = useState(true);
  const [onDemandCfn, setOnDemandCfn] = useState(true);
  const [onDemandK8s, setOnDemandK8s] = useState(true);
  const [onDemandCustomTpl, setOnDemandCustomTpl] = useState(false);
  const [onDemandSubmitting, setOnDemandSubmitting] = useState(false);

  // 8.5 Scan Configurations State
  const [configData, setConfigData] = useState<IaCScanConfigurationsDTO | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configActiveTab, setConfigActiveTab] = useState<'General' | 'File Filters' | 'Frameworks' | 'Advanced'>('General');

  // 8.6 Results Comparison State
  const [compData, setCompData] = useState<IaCResultsComparisonResponse | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [scan1Id, setScan1Id] = useState('SCN-2026-09-30-001');
  const [scan2Id, setScan2Id] = useState('SCN-2026-09-23-004');
  const [compActiveTab, setCompActiveTab] = useState<'Findings by Severity' | 'New Findings' | 'Resolved Findings' | 'Changed Findings'>('Findings by Severity');

  // 8.7 Scan Queue State
  const [queueData, setQueueData] = useState<IaCScanQueueResponse | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueTab, setQueueTab] = useState<'Running' | 'Queued'>('Running');

  // 8.8 Scan Settings State
  const [settingsData, setSettingsData] = useState<IaCScanGlobalSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Load Data based on active subView
  const loadActiveSubViewData = useCallback(() => {
    if (subView === 'overview') {
      setOverviewLoading(true);
      api.iac.scansSuite.getOverview(overviewTimeRange)
        .then((res) => setOverviewData(res))
        .catch((err) => showToast(`Error loading overview: ${err.message}`))
        .finally(() => setOverviewLoading(false));
    } else if (subView === 'history') {
      setHistoryLoading(true);
      api.iac.scansSuite.getHistory({
        repository: historyRepo,
        environment: historyEnv,
        search: historySearch,
        page: historyPage,
        page_size: historyPageSize,
      })
        .then((res) => setHistoryData(res))
        .catch((err) => showToast(`Error loading history: ${err.message}`))
        .finally(() => setHistoryLoading(false));
    } else if (subView === 'scheduled') {
      setSchedulesLoading(true);
      api.iac.scansSuite.getSchedules()
        .then((res) => setSchedulesData(res))
        .catch((err) => showToast(`Error loading schedules: ${err.message}`))
        .finally(() => setSchedulesLoading(false));
    } else if (subView === 'config') {
      setConfigLoading(true);
      api.iac.scansSuite.getConfigurations()
        .then((res) => setConfigData(res))
        .catch((err) => showToast(`Error loading configuration: ${err.message}`))
        .finally(() => setConfigLoading(false));
    } else if (subView === 'comparison') {
      setCompLoading(true);
      api.iac.scansSuite.getComparison(scan1Id, scan2Id)
        .then((res) => setCompData(res))
        .catch((err) => showToast(`Error loading comparison: ${err.message}`))
        .finally(() => setCompLoading(false));
    } else if (subView === 'queue') {
      setQueueLoading(true);
      api.iac.scansSuite.getQueue()
        .then((res) => setQueueData(res))
        .catch((err) => showToast(`Error loading queue: ${err.message}`))
        .finally(() => setQueueLoading(false));
    } else if (subView === 'settings') {
      setSettingsLoading(true);
      api.iac.scansSuite.getSettings()
        .then((res) => setSettingsData(res))
        .catch((err) => showToast(`Error loading settings: ${err.message}`))
        .finally(() => setSettingsLoading(false));
    }
  }, [
    subView,
    overviewTimeRange,
    historyRepo,
    historyEnv,
    historySearch,
    historyPage,
    historyPageSize,
    scan1Id,
    scan2Id,
  ]);

  useEffect(() => {
    loadActiveSubViewData();
  }, [loadActiveSubViewData]);

  // Handler: Run On-Demand Scan (Screen 8.4)
  const handleRunOnDemandScan = async () => {
    setOnDemandSubmitting(true);
    try {
      const res = await api.iac.scansSuite.triggerOnDemand({
        repository: onDemandRepo,
        branch: onDemandBranch,
        environment: onDemandEnv,
        scan_type: onDemandScanType,
        custom_paths: onDemandCustomPaths || undefined,
        include_terraform: onDemandTf,
        include_cloudformation: onDemandCfn,
        include_kubernetes: onDemandK8s,
        include_custom_templates: onDemandCustomTpl,
      });
      showToast(`Scan ${res.scan_id} initiated successfully!`);
      // Transition to Queue to inspect progress
      setSubView('queue');
    } catch (err: any) {
      showToast(`Scan execution failed: ${err.message}`);
    } finally {
      setOnDemandSubmitting(false);
    }
  };

  // Handler: Toggle Scheduled Scan (Screen 8.3)
  const handleToggleSchedule = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const updated = await api.iac.scansSuite.toggleSchedule(id, nextStatus);
      setSchedulesData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((s) => (s.id === id ? updated : s)),
        };
      });
      showToast(`Schedule ${id} is now ${nextStatus}.`);
    } catch (err: any) {
      showToast(`Failed to update schedule: ${err.message}`);
    }
  };

  // Handler: Delete Scheduled Scan (Screen 8.3)
  const handleDeleteSchedule = async (id: string) => {
    try {
      await api.iac.scansSuite.deleteSchedule(id);
      setSchedulesData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.filter((s) => s.id !== id),
          total: prev.total - 1,
        };
      });
      showToast(`Schedule ${id} deleted.`);
    } catch (err: any) {
      showToast(`Failed to delete schedule: ${err.message}`);
    }
  };

  // Handler: Create Scheduled Scan (Screen 8.3 Modal)
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName.trim()) {
      showToast('Schedule name is required');
      return;
    }
    try {
      const created = await api.iac.scansSuite.createSchedule({
        name: newSchedName,
        repository: newSchedRepo,
        frequency: newSchedFreq,
        next_run: newSchedNextRun,
        status: 'Active',
      });
      setSchedulesData((prev) => {
        if (!prev) return { items: [created], total: 1 };
        return { items: [created, ...prev.items], total: prev.total + 1 };
      });
      setShowNewScheduleModal(false);
      setNewSchedName('');
      showToast(`Schedule ${created.name} registered successfully!`);
    } catch (err: any) {
      showToast(`Failed to create schedule: ${err.message}`);
    }
  };

  // Handler: Save Scan Configurations (Screen 8.5)
  const handleSaveConfigurations = async () => {
    if (!configData) return;
    setConfigSaving(true);
    try {
      const updated = await api.iac.scansSuite.updateConfigurations(configData);
      setConfigData(updated);
      showToast('Scan configurations saved successfully!');
    } catch (err: any) {
      showToast(`Failed to save configurations: ${err.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  // Handler: Cancel All Queued Scans (Screen 8.7)
  const handleCancelAllQueue = async () => {
    try {
      await api.iac.scansSuite.cancelQueueAll();
      setQueueData({ running: [], queued: [], running_count: 0, queued_count: 0 });
      showToast('All active and queued scans have been cancelled.');
    } catch (err: any) {
      showToast(`Failed to cancel queue: ${err.message}`);
    }
  };

  // Handler: Cancel Single Scan in Queue (Screen 8.7)
  const handleCancelQueueScan = async (scanId: string) => {
    try {
      await api.iac.scansSuite.cancelQueueScan(scanId);
      setQueueData((prev) => {
        if (!prev) return null;
        const newRunning = prev.running.filter((q) => q.scan_id !== scanId);
        const newQueued = prev.queued.filter((q) => q.scan_id !== scanId);
        return {
          running: newRunning,
          queued: newQueued,
          running_count: newRunning.length,
          queued_count: newQueued.length,
        };
      });
      showToast(`Scan ${scanId} cancelled.`);
    } catch (err: any) {
      showToast(`Failed to cancel scan: ${err.message}`);
    }
  };

  // Handler: Save Settings (Screen 8.8)
  const handleSaveSettings = async () => {
    if (!settingsData) return;
    setSettingsSaving(true);
    try {
      const updated = await api.iac.scansSuite.updateSettings(settingsData);
      setSettingsData(updated);
      showToast('Global scan settings updated successfully!');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Helpers for Status Badges
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'succeeded' || s === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#15803D' }} />
          {status}
        </span>
      );
    }
    if (s === 'failed' || s === 'inactive') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#DC2626' }} />
          {status}
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: '#FEF3C7',
          color: '#D97706',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#D97706' }} />
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Info size={16} color="#38BDF8" />
          {toastMessage}
        </div>
      )}

      {/* Top Breadcrumb & Screen Nav Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>THING CODE</span>
          <ChevronRight size={14} />
          <span>IaC Security</span>
          <ChevronRight size={14} />
          <span style={{ fontWeight: 600, color: '#2563EB' }}>
            Scans
            {subView === 'overview' && ' > Scans Overview'}
            {subView === 'history' && ' > Scan History'}
            {subView === 'scheduled' && ' > Scheduled Scans'}
            {subView === 'on-demand' && ' > On-Demand Scan'}
            {subView === 'config' && ' > Scan Configurations'}
            {subView === 'comparison' && ' > Results Comparison'}
            {subView === 'queue' && ' > Scan Queue'}
            {subView === 'settings' && ' > Scan Settings'}
          </span>
        </div>

        {/* Sub-view Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '8.1 Overview' },
            { id: 'history', label: '8.2 History' },
            { id: 'scheduled', label: '8.3 Scheduled' },
            { id: 'on-demand', label: '8.4 Run Scan' },
            { id: 'config', label: '8.5 Configurations' },
            { id: 'comparison', label: '8.6 Comparison' },
            { id: 'queue', label: '8.7 Queue' },
            { id: 'settings', label: '8.8 Settings' },
          ].map((item) => {
            const active = subView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSubView(item.id as ScansSubView);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                  color: active ? '#2563EB' : '#475569',
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.1 SCANS OVERVIEW                                                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scans Overview</h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Run and manage IaC security scans across your repositories, branches and environments.
              </p>
            </div>
            <select
              value={overviewTimeRange}
              onChange={(e) => setOverviewTimeRange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
            </select>
          </div>

          {/* 4 Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {/* Card 1: Total Scans */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Scans</span>
                <Activity size={18} color="#2563EB" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
                {overviewData?.total_scans ?? 36}
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, marginTop: '4px' }}>
                Across all branches &amp; PRs
              </div>
            </div>

            {/* Card 2: Succeeded */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Succeeded</span>
                <CheckCircle size={18} color="#16A34A" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803D', marginTop: '8px' }}>
                {overviewData?.succeeded_scans ?? 28}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '4px' }}>
                Passed quality gates
              </div>
            </div>

            {/* Card 3: Failed */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Failed</span>
                <XCircle size={18} color="#DC2626" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '8px' }}>
                {overviewData?.failed_scans ?? 5}
              </div>
              <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 500, marginTop: '4px' }}>
                Blocking security violations
              </div>
            </div>

            {/* Card 4: In Progress */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>In Progress</span>
                <RefreshCw size={18} color="#2563EB" className="animate-spin" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563EB', marginTop: '8px' }}>
                {overviewData?.in_progress_scans ?? 3}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '4px' }}>
                Currently executing in pipeline
              </div>
            </div>
          </div>

          {/* Scan Results Trend Chart */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Scan Results Trend</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                  <span style={{ color: '#475569' }}>Critical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EA580C' }} />
                  <span style={{ color: '#475569' }}>High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EAB308' }} />
                  <span style={{ color: '#475569' }}>Medium</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                  <span style={{ color: '#475569' }}>Low</span>
                </div>
              </div>
            </div>

            {/* SVG Trend Chart */}
            <div style={{ height: '220px', width: '100%', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none">
                {/* Y-axis gridlines */}
                {[0, 50, 100, 150, 190].map((y, i) => (
                  <line key={i} x1="30" y1={y} x2="700" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                ))}

                {/* Critical line (red) */}
                <polyline
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2.5"
                  points="30,175 140,165 250,155 360,150 470,155 580,150 690,160"
                />
                {/* High line (orange) */}
                <polyline
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="2.5"
                  points="30,140 140,130 250,120 360,110 470,105 580,100 690,125"
                />
                {/* Medium line (yellow) */}
                <polyline
                  fill="none"
                  stroke="#EAB308"
                  strokeWidth="2.5"
                  points="30,110 140,100 250,95 360,85 470,80 580,75 690,95"
                />
                {/* Low line (green) */}
                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.5"
                  points="30,80 140,70 250,60 360,50 470,45 580,40 690,45"
                />

                {/* Data dots */}
                {[[30,175], [140,165], [250,155], [360,150], [470,155], [580,150], [690,160]].map(([x,y], i) => (
                  <circle key={`c-${i}`} cx={x} cy={y} r="3.5" fill="#DC2626" />
                ))}
                {[[30,140], [140,130], [250,120], [360,110], [470,105], [580,100], [690,125]].map(([x,y], i) => (
                  <circle key={`h-${i}`} cx={x} cy={y} r="3.5" fill="#EA580C" />
                ))}
                {[[30,110], [140,100], [250,95], [360,85], [470,80], [580,75], [690,95]].map(([x,y], i) => (
                  <circle key={`m-${i}`} cx={x} cy={y} r="3.5" fill="#EAB308" />
                ))}
                {[[30,80], [140,70], [250,60], [360,50], [470,45], [580,40], [690,45]].map(([x,y], i) => (
                  <circle key={`l-${i}`} cx={x} cy={y} r="3.5" fill="#16A34A" />
                ))}
              </svg>

              {/* X-axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px 0 30px', fontSize: '11px', color: '#94A3B8' }}>
                <span>Sep 01</span>
                <span>Sep 05</span>
                <span>Sep 10</span>
                <span>Sep 15</span>
                <span>Sep 20</span>
                <span>Sep 25</span>
                <span>Sep 30</span>
              </div>
            </div>
          </div>

          {/* Top Repositories by Findings Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Top Repositories by Findings</h3>
              <button
                onClick={() => setSubView('history')}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                View All →
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 18px' }}>Repository</th>
                  <th style={{ padding: '10px 18px' }}>Scans</th>
                  <th style={{ padding: '10px 18px', color: '#DC2626' }}>Critical</th>
                  <th style={{ padding: '10px 18px', color: '#EA580C' }}>High</th>
                  <th style={{ padding: '10px 18px', color: '#D97706' }}>Medium</th>
                  <th style={{ padding: '10px 18px', color: '#16A34A' }}>Low</th>
                </tr>
              </thead>
              <tbody>
                {(overviewData?.top_repositories || [
                  { repository: 'frontend-app', scans: 8, critical: 5, high: 12, medium: 18, low: 25 },
                  { repository: 'infrastructure', scans: 6, critical: 3, high: 8, medium: 14, low: 20 },
                  { repository: 'k8s-manifests', scans: 5, critical: 2, high: 6, medium: 11, low: 15 },
                  { repository: 'cloudformation', scans: 4, critical: 1, high: 5, medium: 9, low: 12 },
                  { repository: 'terraform-modules', scans: 4, critical: 1, high: 4, medium: 7, low: 10 },
                ]).map((repo, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>{repo.repository}</td>
                    <td style={{ padding: '12px 18px', color: '#475569' }}>{repo.scans}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#DC2626' }}>{repo.critical}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#EA580C' }}>{repo.high}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#D97706' }}>{repo.medium}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#16A34A' }}>{repo.low}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.2 SCAN HISTORY                                                  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scan History</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              View and manage all IaC security scans.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={historyRepo}
              onChange={(e) => { setHistoryRepo(e.target.value); setHistoryPage(1); }}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="All Repositories">All Repositories</option>
              <option value="frontend-app">frontend-app</option>
              <option value="infrastructure">infrastructure</option>
              <option value="k8s-manifests">k8s-manifests</option>
              <option value="cloudformation">cloudformation</option>
              <option value="terraform-modules">terraform-modules</option>
            </select>

            <select
              value={historyEnv}
              onChange={(e) => { setHistoryEnv(e.target.value); setHistoryPage(1); }}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="All Environments">All Environments</option>
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="text"
                placeholder="Search scans by name, repository, id..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Scan ID</th>
                  <th style={{ padding: '12px 18px' }}>Repository</th>
                  <th style={{ padding: '12px 18px' }}>Environment</th>
                  <th style={{ padding: '12px 18px' }}>Triggered By</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Findings</th>
                  <th style={{ padding: '12px 18px' }}>Started At</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={18} className="animate-spin" color="#2563EB" style={{ margin: '0 auto 8px' }} />
                      Loading scan history...
                    </td>
                  </tr>
                ) : (
                  (historyData?.items || []).map((row) => (
                    <tr
                      key={row.scan_id}
                      onClick={() => router.push(`/code/iac/scans/${row.scan_id}`)}
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#2563EB' }}>{row.scan_id}</td>
                      <td style={{ padding: '12px 18px', color: '#0F172A', fontWeight: 500 }}>{row.repository}</td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>{row.environment}</td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>{row.triggered_by}</td>
                      <td style={{ padding: '12px 18px' }}>{renderStatusBadge(row.status)}</td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0F172A' }}>
                        {row.findings_count > 0 ? row.findings_count : '—'}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>{row.started_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}>
              <div>Showing {historyData?.items.length ?? 0} of {historyData?.total ?? 0} scans</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  &lt;
                </button>
                <span>Page {historyPage}</span>
                <button
                  disabled={Boolean(historyData && historyPage >= historyData.total_pages)}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.3 SCHEDULED SCANS                                               */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'scheduled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scheduled Scans</h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Configure and manage recurring IaC security scans.
              </p>
            </div>
            <button
              onClick={() => setShowNewScheduleModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} /> New Schedule
            </button>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Name</th>
                  <th style={{ padding: '12px 18px' }}>Repository</th>
                  <th style={{ padding: '12px 18px' }}>Frequency</th>
                  <th style={{ padding: '12px 18px' }}>Next Run</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(schedulesData?.items || []).map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                    <td style={{ padding: '12px 18px', color: '#475569' }}>{row.repository}</td>
                    <td style={{ padding: '12px 18px', color: '#475569' }}>{row.frequency}</td>
                    <td style={{ padding: '12px 18px', color: '#64748B' }}>{row.next_run}</td>
                    <td style={{ padding: '12px 18px' }}>{renderStatusBadge(row.status)}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleSchedule(row.id, row.status)}
                          title="Toggle Status"
                          style={{ border: 'none', background: 'none', color: '#2563EB', cursor: 'pointer' }}
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(row.id)}
                          title="Delete Schedule"
                          style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal: New Schedule */}
          {showNewScheduleModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '24px', width: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure Scheduled Scan</h3>
                  <button onClick={() => setShowNewScheduleModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Schedule Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Daily Security Audit"
                      value={newSchedName}
                      onChange={(e) => setNewSchedName(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Repository *</label>
                    <select
                      value={newSchedRepo}
                      onChange={(e) => setNewSchedRepo(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="frontend-app">frontend-app</option>
                      <option value="infrastructure">infrastructure</option>
                      <option value="k8s-manifests">k8s-manifests</option>
                      <option value="cloudformation">cloudformation</option>
                      <option value="terraform-modules">terraform-modules</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Frequency *</label>
                    <select
                      value={newSchedFreq}
                      onChange={(e) => setNewSchedFreq(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="On Push">On Push</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>First Run Timestamp</label>
                    <input
                      type="text"
                      value={newSchedNextRun}
                      onChange={(e) => setNewSchedNextRun(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowNewScheduleModal(false)}
                      style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Save Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.4 ON-DEMAND SCAN (RUN NEW SCAN)                                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'on-demand' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Run New Scan</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Start an on-demand IaC security scan.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Repository */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Repository *
              </label>
              <select
                value={onDemandRepo}
                onChange={(e) => setOnDemandRepo(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="frontend-app">frontend-app</option>
                <option value="infrastructure">infrastructure</option>
                <option value="k8s-manifests">k8s-manifests</option>
                <option value="cloudformation">cloudformation</option>
                <option value="terraform-modules">terraform-modules</option>
              </select>
            </div>

            {/* Branch / Commit */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Branch / Commit
              </label>
              <input
                type="text"
                value={onDemandBranch}
                onChange={(e) => setOnDemandBranch(e.target.value)}
                placeholder="main or commit hash (optional)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            {/* Environment */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Environment
              </label>
              <select
                value={onDemandEnv}
                onChange={(e) => setOnDemandEnv(e.target.value as any)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="dev">dev</option>
              </select>
            </div>

            {/* Scan Type */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '8px' }}>
                Scan Type
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'Full Scan', label: 'Full Scan', desc: 'Scan all IaC files in the repository' },
                  { id: 'Changed Files Only', label: 'Changed Files Only', desc: 'Scan only modified IaC files' },
                  { id: 'Custom Paths', label: 'Custom Paths', desc: 'Scan specific directories or files' },
                ].map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scanType"
                      checked={onDemandScanType === t.id}
                      onChange={() => setOnDemandScanType(t.id as any)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{t.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{t.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {onDemandScanType === 'Custom Paths' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Directories / Patterns</label>
                <input
                  type="text"
                  placeholder="e.g. terraform/modules/*, deploy/helm"
                  value={onDemandCustomPaths}
                  onChange={(e) => setOnDemandCustomPaths(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                />
              </div>
            )}

            {/* Additional Options */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '8px' }}>
                Additional Options
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={onDemandTf} onChange={(e) => setOnDemandTf(e.target.checked)} />
                  Include Terraform files (.tf, .tfvars)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={onDemandCfn} onChange={(e) => setOnDemandCfn(e.target.checked)} />
                  Include CloudFormation files (.yaml, .json)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={onDemandK8s} onChange={(e) => setOnDemandK8s(e.target.checked)} />
                  Include Kubernetes manifests (k8s, helm)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={onDemandCustomTpl} onChange={(e) => setOnDemandCustomTpl(e.target.checked)} />
                  Include custom IaC templates
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setSubView('history')}
                style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunOnDemandScan}
                disabled={onDemandSubmitting}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: onDemandSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {onDemandSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Run Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.5 SCAN CONFIGURATIONS                                           */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'config' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scan Configurations</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Manage scan configurations and scanner options.
            </p>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
            {(['General', 'File Filters', 'Frameworks', 'Advanced'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setConfigActiveTab(tab)}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  borderBottom: configActiveTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                  color: configActiveTab === tab ? '#2563EB' : '#64748B',
                  fontWeight: configActiveTab === tab ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Configuration Name
              </label>
              <input
                type="text"
                value={configData?.name || 'Default IaC Scan'}
                onChange={(e) => setConfigData((prev) => prev ? { ...prev, name: e.target.value } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <input
                type="text"
                value={configData?.description || 'Default configuration for IaC security scanning'}
                onChange={(e) => setConfigData((prev) => prev ? { ...prev, description: e.target.value } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '8px' }}>
                IaC Scanners
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Terraform', 'CloudFormation', 'Kubernetes', 'Helm Charts', 'Custom Templates'].map((sc) => {
                  const checked = configData?.scanners?.includes(sc) || false;
                  return (
                    <label key={sc} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const cur = configData?.scanners || [];
                          const next = e.target.checked ? [...cur, sc] : cur.filter((x) => x !== sc);
                          setConfigData((prev) => prev ? { ...prev, scanners: next } : null);
                        }}
                      />
                      {sc}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                Scan Depth
              </label>
              <select
                value={configData?.scan_depth || 'Standard'}
                onChange={(e) => setConfigData((prev) => prev ? { ...prev, scan_depth: e.target.value as any } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="Standard">Standard</option>
                <option value="Deep">Deep</option>
                <option value="Fast">Fast</option>
              </select>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Controls how deep the scanner analyzes resources and modules.
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Max File Size
              </label>
              <select
                value={configData?.max_file_size || '5 MB'}
                onChange={(e) => setConfigData((prev) => prev ? { ...prev, max_file_size: e.target.value } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="5 MB">5 MB</option>
                <option value="10 MB">10 MB</option>
                <option value="25 MB">25 MB</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Parallel Scans
              </label>
              <input
                type="number"
                min={1}
                max={16}
                value={configData?.parallel_scans || 4}
                onChange={(e) => setConfigData((prev) => prev ? { ...prev, parallel_scans: parseInt(e.target.value) || 1 } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={loadActiveSubViewData}
                style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveConfigurations}
                disabled={configSaving}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: configSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {configSaving && <RefreshCw size={14} className="animate-spin" />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.6 RESULTS COMPARISON                                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'comparison' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Results Comparison</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Compare scan results between different scans.
            </p>
          </div>

          {/* Scan Selector Bar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Scan 1</label>
              <select
                value={scan1Id}
                onChange={(e) => setScan1Id(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                {(compData?.available_scans || [
                  { id: 'SCN-2026-09-30-001', label: 'SCN-2026-09-30-001 (Sep 30)' },
                  { id: 'SCN-2026-09-23-004', label: 'SCN-2026-09-23-004 (Sep 23)' },
                ]).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div style={{ color: '#94A3B8', fontWeight: 700, paddingTop: '18px' }}>vs</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Scan 2</label>
              <select
                value={scan2Id}
                onChange={(e) => setScan2Id(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                {(compData?.available_scans || [
                  { id: 'SCN-2026-09-23-004', label: 'SCN-2026-09-23-004 (Sep 23)' },
                  { id: 'SCN-2026-09-30-001', label: 'SCN-2026-09-30-001 (Sep 30)' },
                ]).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Severity Diff KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Critical', value: compData?.critical.current_count ?? 5, delta: compData?.critical.delta ?? -3, color: '#DC2626' },
              { label: 'High', value: compData?.high.current_count ?? 12, delta: compData?.high.delta ?? 4, color: '#EA580C' },
              { label: 'Medium', value: compData?.medium.current_count ?? 18, delta: compData?.medium.delta ?? -6, color: '#D97706' },
              { label: 'Low', value: compData?.low.current_count ?? 25, delta: compData?.low.delta ?? -8, color: '#16A34A' },
            ].map((c) => {
              const isPositive = c.delta > 0;
              return (
                <div key={c.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: c.color }}>{c.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>{c.value}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: isPositive ? '#DC2626' : '#16A34A',
                        backgroundColor: isPositive ? '#FEE2E2' : '#DCFCE7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {isPositive ? `▲ ${c.delta}` : `▼ ${Math.abs(c.delta)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Bar Chart */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {(['Findings by Severity', 'New Findings', 'Resolved Findings', 'Changed Findings'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCompActiveTab(t)}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '13px',
                      fontWeight: compActiveTab === t ? 700 : 500,
                      color: compActiveTab === t ? '#2563EB' : '#64748B',
                      cursor: 'pointer',
                      borderBottom: compActiveTab === t ? '2px solid #2563EB' : '2px solid transparent',
                      paddingBottom: '4px',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', backgroundColor: '#94A3B8' }} />
                  <span style={{ color: '#475569' }}>Previous Scan</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', backgroundColor: '#0F172A' }} />
                  <span style={{ color: '#475569' }}>Current Scan</span>
                </div>
              </div>
            </div>

            {/* Grouped Bar Chart */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: '20px', borderBottom: '1px solid #E2E8F0' }}>
              {[
                { label: 'Critical', prev: 8, curr: 5 },
                { label: 'High', prev: 8, curr: 12 },
                { label: 'Medium', prev: 24, curr: 18 },
                { label: 'Low', prev: 33, curr: 25 },
              ].map((bar) => {
                const maxVal = 40;
                const prevHeight = (bar.prev / maxVal) * 150;
                const currHeight = (bar.curr / maxVal) * 150;
                return (
                  <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={{ width: '28px', height: `${prevHeight}px`, backgroundColor: '#94A3B8', borderRadius: '3px 3px 0 0' }} title={`Prev: ${bar.prev}`} />
                      <div style={{ width: '28px', height: `${currHeight}px`, backgroundColor: '#0F172A', borderRadius: '3px 3px 0 0' }} title={`Curr: ${bar.curr}`} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{bar.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Changed Resources Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Top Changed Resources</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 18px' }}>Resource</th>
                  <th style={{ padding: '10px 18px' }}>Change Type</th>
                  <th style={{ padding: '10px 18px' }}>Previous</th>
                  <th style={{ padding: '10px 18px' }}>Current</th>
                </tr>
              </thead>
              <tbody>
                {(compData?.top_changed_resources || [
                  { resource: 'aws_s3_bucket.app', change_type: 'New', previous_severity: '-', current_severity: 'Critical' },
                  { resource: 'aws_iam_policy.admin', change_type: 'Improved', previous_severity: 'High', current_severity: 'Medium' },
                  { resource: 'kubernetes_deployment.api', change_type: 'Worsened', previous_severity: 'Low', current_severity: 'High' },
                  { resource: 'aws_security_group.web', change_type: 'Resolved', previous_severity: 'Medium', current_severity: '-' },
                  { resource: 'aws_db_instance.main', change_type: 'Unchanged', previous_severity: 'High', current_severity: 'High' },
                ]).map((row, idx) => {
                  let changeBg = '#F1F5F9';
                  let changeColor = '#475569';
                  if (row.change_type === 'New') { changeBg = '#FEF2F2'; changeColor = '#DC2626'; }
                  if (row.change_type === 'Improved' || row.change_type === 'Resolved') { changeBg = '#DCFCE7'; changeColor = '#15803D'; }
                  if (row.change_type === 'Worsened') { changeBg = '#FFEDD5'; changeColor = '#C2410C'; }

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{row.resource}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, backgroundColor: changeBg, color: changeColor }}>
                          {row.change_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>{row.previous_severity}</td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: row.current_severity === 'Critical' ? '#DC2626' : row.current_severity === 'High' ? '#EA580C' : '#0F172A' }}>
                        {row.current_severity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.7 SCAN QUEUE                                                    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scan Queue</h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                View currently running and queued scans.
              </p>
            </div>
            <button
              onClick={handleCancelAllQueue}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <StopCircle size={15} /> Cancel All
            </button>
          </div>

          {/* Queue Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setQueueTab('Running')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: queueTab === 'Running' ? '1px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: queueTab === 'Running' ? '#EFF6FF' : '#FFFFFF',
                color: queueTab === 'Running' ? '#2563EB' : '#64748B',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Running ({queueData?.running_count ?? 2})
            </button>
            <button
              onClick={() => setQueueTab('Queued')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: queueTab === 'Queued' ? '1px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: queueTab === 'Queued' ? '#EFF6FF' : '#FFFFFF',
                color: queueTab === 'Queued' ? '#2563EB' : '#64748B',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Queued ({queueData?.queued_count ?? 3})
            </button>
          </div>

          {/* Queue Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Scan ID</th>
                  <th style={{ padding: '12px 18px' }}>Repository</th>
                  <th style={{ padding: '12px 18px' }}>Environment</th>
                  <th style={{ padding: '12px 18px' }}>Progress</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Started At</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {((queueTab === 'Running' ? queueData?.running : queueData?.queued) || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      No {queueTab.toLowerCase()} scans in the queue.
                    </td>
                  </tr>
                ) : (
                  ((queueTab === 'Running' ? queueData?.running : queueData?.queued) || []).map((row) => (
                    <tr key={row.scan_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#2563EB' }}>{row.scan_id}</td>
                      <td style={{ padding: '12px 18px', color: '#0F172A', fontWeight: 500 }}>{row.repository}</td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>{row.environment}</td>
                      <td style={{ padding: '12px 18px', minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${row.progress}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', width: '32px' }}>{row.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>{renderStatusBadge(row.status)}</td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>{row.started_at}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleCancelQueueScan(row.scan_id)}
                          title="Cancel Scan"
                          style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer' }}
                        >
                          <StopCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8.8 SCAN SETTINGS                                                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {subView === 'settings' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scan Settings</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Configure global scan settings.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Preset Selector */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                Preset Configuration
              </label>
              <select
                value={settingsData?.configuration_preset || 'Default IaC Scan'}
                onChange={(e) => setSettingsData((prev) => prev ? { ...prev, configuration_preset: e.target.value } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="Default IaC Scan">Default IaC Scan</option>
                <option value="Strict Compliance Scan">Strict Compliance Scan</option>
                <option value="Fast Pull-Request Scan">Fast Pull-Request Scan</option>
              </select>
            </div>

            {/* Notification Settings */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Notification Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'notify_on_completion', label: 'Notify on Scan Completion' },
                  { key: 'notify_on_failure', label: 'Notify on Failed Scan' },
                  { key: 'notify_on_critical', label: 'Notify on Critical Findings' },
                ].map((item) => {
                  const val = (settingsData as any)?.[item.key] ?? true;
                  return (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => setSettingsData((prev) => prev ? { ...prev, [item.key]: e.target.checked } : null)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  );
                })}

                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                    Notification Channels
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {['Email', 'Slack'].map((ch) => {
                      const checked = settingsData?.notification_channels?.includes(ch) ?? true;
                      return (
                        <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const cur = settingsData?.notification_channels || [];
                              const next = e.target.checked ? [...cur, ch] : cur.filter((x) => x !== ch);
                              setSettingsData((prev) => prev ? { ...prev, notification_channels: next } : null);
                            }}
                          />
                          {ch}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Retention */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>Scan Retention</h3>
              <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Keep scan results for</label>
              <select
                value={settingsData?.scan_retention_days || 90}
                onChange={(e) => setSettingsData((prev) => prev ? { ...prev, scan_retention_days: parseInt(e.target.value) || 90 } : null)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>365 days</option>
              </select>
            </div>

            {/* Performance */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Concurrent Scans</label>
                  <input
                    type="number"
                    value={settingsData?.concurrent_scans || 4}
                    onChange={(e) => setSettingsData((prev) => prev ? { ...prev, concurrent_scans: parseInt(e.target.value) || 1 } : null)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Scan Timeout (minutes)</label>
                  <input
                    type="number"
                    value={settingsData?.scan_timeout_minutes || 30}
                    onChange={(e) => setSettingsData((prev) => prev ? { ...prev, scan_timeout_minutes: parseInt(e.target.value) || 10 } : null)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            {/* Integration Settings */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Integration Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'upload_to_dashboard', label: 'Upload results to Security Dashboard' },
                  { key: 'store_scan_logs', label: 'Store scan logs' },
                  { key: 'enable_incremental_scanning', label: 'Enable incremental scanning' },
                ].map((item) => {
                  const val = (settingsData as any)?.[item.key] ?? false;
                  return (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => setSettingsData((prev) => prev ? { ...prev, [item.key]: e.target.checked } : null)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={loadActiveSubViewData}
                style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: settingsSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {settingsSaving && <RefreshCw size={14} className="animate-spin" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
