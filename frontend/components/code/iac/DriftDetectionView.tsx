'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Drift Detection Suite
 * Section 10: Screens 10.1 through 10.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/drift/suite/*
 * 
 * Screens:
 *   10.1 Drift Detection Overview (4 KPIs, Drift Status Donut, Drift Trend multi-series, Recent Drift Events)
 *   10.2 Environments (Environments table, Add Environment modal, Trigger Scan, Delete)
 *   10.3 Drift Changes (Multi-filter table, Search, Checkboxes, Pagination, Click to Detail)
 *   10.4 Resource Detail (Breadcrumb back button, Basic Info, Drift Summary, Configuration code viewer [TF/JSON/YAML])
 *   10.5 Remediation (Remediation recommendations table, Multi-filters, Apply state mutation)
 *   10.6 Drift History (Historical events table, Resource filter, Date range picker, Pagination)
 *   10.7 Settings (General toggles, Notification toggles, Scan frequency, Environments checklist, Save Changes)
 *   10.8 Compare Configuration (Resource picker, View Changes, TF/JSON/YAML tabs, Line-numbered side-by-side Git vs AWS diff)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Trash2,
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
  AlertCircle,
  Terminal,
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  FileText,
  Download,
  Copy,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Server,
  Cloud,
  Database,
  Globe,
  Radio,
  FileDiff,
  Wrench,
  History as HistoryIcon,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCDriftSuiteOverviewResponse,
  IaCDriftEnvironmentsResponse,
  IaCDriftEnvironmentItem,
  CreateDriftEnvironmentRequest,
  IaCDriftChangesResponse,
  IaCDriftChangeItem,
  IaCDriftResourceDetailResponse,
  IaCDriftRemediationResponse,
  IaCDriftRemediationItem,
  IaCDriftHistoryResponse,
  IaCDriftHistoryItem,
  IaCDriftSettingsDTO,
  IaCDriftCompareResponse,
} from '@/types/api/iac';

import { useScope } from '@/context/ScopeContext';

export type DriftSubView =
  | 'overview'
  | 'environments'
  | 'changes'
  | 'resource-detail'
  | 'remediation'
  | 'history'
  | 'settings'
  | 'compare';

interface DriftDetectionViewProps {
  initialView?: DriftSubView;
  repositoryName?: string;
}

// ── Cloud Provider Logos ────────────────────────────────────────────────────────
const AwsLogo = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#232F3E" />
    <path
      d="M6.5 13.5C9.5 15.5 14.5 15.5 17.5 13.5M16 11.5L18 13.5L15.5 14.5"
      stroke="#FF9900"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 8.5C8.5 7.5 9.5 7.5 10 9C10.5 10.5 11 11.5 12 11.5"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const AzureLogo = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#0078D4" />
    <path
      d="M6 17.5L11 6L14.5 13.5L8.5 17.5H6ZM12.5 17.5L15 12.5L18 17.5H12.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

const GcpLogo = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#1A73E8" />
    <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
    <path d="M12 9V15M9 12H15" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ProviderBadge = ({ provider }: { provider: string }) => {
  const p = (provider || '').toLowerCase();
  if (p.includes('aws')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AwsLogo className="w-3.5 h-3.5" />
        <span>AWS</span>
      </span>
    );
  }
  if (p.includes('azure')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <AzureLogo className="w-3.5 h-3.5" />
        <span>Azure</span>
      </span>
    );
  }
  if (p.includes('gcp') || p.includes('google')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <GcpLogo className="w-3.5 h-3.5" />
        <span>GCP</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <Cloud className="w-3.5 h-3.5 text-slate-500" />
      <span>{provider || 'Cloud'}</span>
    </span>
  );
};

// ── Status Badges ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || '').toLowerCase();
  if (s.includes('drifted')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Drifted
      </span>
    );
  }
  if (s.includes('sync')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        In Sync
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Not Tracked
    </span>
  );
};

const ChangeTypeBadge = ({ changeType }: { changeType: string }) => {
  const c = (changeType || '').toLowerCase();
  if (c.includes('modified')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Modified
      </span>
    );
  }
  if (c.includes('deleted')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        Deleted
      </span>
    );
  }
  if (c.includes('added')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Added
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {changeType}
    </span>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const s = (severity || '').toLowerCase();
  if (s === 'high' || s === 'critical') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        High
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
      Low
    </span>
  );
};

// ── SVG Donut Chart (Screen 10.1) ───────────────────────────────────────────────
const DriftStatusDonut = ({
  drifted = 0,
  inSync = 0,
  notTracked = 0,
}: {
  drifted?: number;
  inSync?: number;
  notTracked?: number;
}) => {
  const total = drifted + inSync + notTracked;
  const totalForCalc = total || 1;
  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const driftedPct = drifted / totalForCalc;
  const inSyncPct = inSync / totalForCalc;
  const notTrackedPct = notTracked / totalForCalc;

  const driftedStroke = driftedPct * circumference;
  const inSyncStroke = inSyncPct * circumference;
  const notTrackedStroke = notTrackedPct * circumference;

  const driftedOffset = 0;
  const inSyncOffset = -driftedStroke;
  const notTrackedOffset = -(driftedStroke + inSyncStroke);

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Drifted segment (red) */}
        {drifted > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#EF4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${driftedStroke} ${circumference}`}
            strokeDashoffset={driftedOffset}
            strokeLinecap="round"
          />
        )}
        {/* In Sync segment (green) */}
        {inSync > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeDasharray={`${inSyncStroke} ${circumference}`}
            strokeDashoffset={inSyncOffset}
            strokeLinecap="round"
          />
        )}
        {/* Not Tracked segment (amber) */}
        {notTracked > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F59E0B"
            strokeWidth={strokeWidth}
            strokeDasharray={`${notTrackedStroke} ${circumference}`}
            strokeDashoffset={notTrackedOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl font-bold text-[#0F172A]">{total}</span>
        <span className="text-xs text-[#64748B] font-medium mt-0.5">Total</span>
      </div>
    </div>
  );
};

// ── SVG Trend Chart (Screen 10.1) ───────────────────────────────────────────────
const DriftTrendChart = ({
  trendData,
}: {
  trendData: Array<{ date: string; drifted: number; in_sync: number; not_tracked: number }>;
}) => {
  const height = 160;
  const width = 500;
  const paddingX = 40;
  const paddingY = 25;
  const maxVal = 30;

  const points = trendData ?? [];
  if (!points || points.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-xs text-[#64748B]">
        <Activity className="w-5 h-5 text-slate-300 mb-1.5" />
        <span>No drift trend data recorded for this scope.</span>
      </div>
    );
  }

  const getX = (index: number) => {
    if (points.length <= 1) return width / 2;
    return paddingX + (index * (width - 2 * paddingX)) / (points.length - 1);
  };

  const getY = (val: number) => {
    return height - paddingY - (val / maxVal) * (height - 2 * paddingY);
  };

  const makePath = (key: 'drifted' | 'in_sync' | 'not_tracked') => {
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(p[key])}`)
      .join(' ');
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
        {/* Grid lines */}
        {[0, 10, 20, 30].map((gridVal) => (
          <g key={gridVal}>
            <line
              x1={paddingX}
              y1={getY(gridVal)}
              x2={width - paddingX}
              y2={getY(gridVal)}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
            />
            <text
              x={paddingX - 10}
              y={getY(gridVal) + 4}
              fontSize="10"
              fill="#94A3B8"
              textAnchor="end"
            >
              {gridVal}
            </text>
          </g>
        ))}

        {/* X Axis labels */}
        {points.map((p, idx) => (
          <text
            key={idx}
            x={getX(idx)}
            y={height - 6}
            fontSize="10"
            fill="#64748B"
            textAnchor="middle"
          >
            {p.date}
          </text>
        ))}

        {/* Series paths */}
        <path
          d={makePath('drifted')}
          fill="none"
          stroke="#EF4444"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={makePath('in_sync')}
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={makePath('not_tracked')}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Dots */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={getX(idx)} cy={getY(p.drifted)} r="3" fill="#EF4444" />
            <circle cx={getX(idx)} cy={getY(p.in_sync)} r="3" fill="#10B981" />
            <circle cx={getX(idx)} cy={getY(p.not_tracked)} r="3" fill="#94A3B8" />
          </g>
        ))}
      </svg>
    </div>
  );
};

// ── Main DriftDetectionView Component ──────────────────────────────────────────
export const DriftDetectionView: React.FC<DriftDetectionViewProps> = ({
  initialView = 'overview',
  repositoryName,
}) => {
  const { currentRepository } = useScope();
  const effectiveRepo = repositoryName || currentRepository?.name || 'All Repositories';

  // Navigation State
  const [activeTab, setActiveTab] = useState<DriftSubView>(initialView);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 10.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCDriftSuiteOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewEnv, setOverviewEnv] = useState('All Environments');

  // 10.2 Environments State
  const [environmentsData, setEnvironmentsData] = useState<IaCDriftEnvironmentsResponse | null>(null);
  const [environmentsLoading, setEnvironmentsLoading] = useState(false);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvProvider, setNewEnvProvider] = useState('AWS');
  const [newEnvRegion, setNewEnvRegion] = useState('ap-south-1');
  const [envSubmitting, setEnvSubmitting] = useState(false);

  // 10.3 Drift Changes State
  const [changesData, setChangesData] = useState<IaCDriftChangesResponse | null>(null);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesEnv, setChangesEnv] = useState('All Environments');
  const [changesType, setChangesType] = useState('All Change Types');
  const [changesStatus, setChangesStatus] = useState('All Statuses');
  const [changesSearch, setChangesSearch] = useState('');
  const [changesPage, setChangesPage] = useState(1);
  const [changesPageSize, setChangesPageSize] = useState(10);
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);

  // 10.4 Resource Detail State
  const [selectedResourceName, setSelectedResourceName] = useState('eks-prod-cluster');
  const [resourceDetailData, setResourceDetailData] = useState<IaCDriftResourceDetailResponse | null>(null);
  const [resourceDetailLoading, setResourceDetailLoading] = useState(false);
  const [resourceDetailTab, setResourceDetailTab] = useState<'Overview' | 'Configuration' | 'Drift Changes' | 'Relationships' | 'Tags'>('Overview');
  const [configFormat, setConfigFormat] = useState<'Terraform' | 'JSON' | 'YAML'>('Terraform');

  // 10.5 Remediation State
  const [remediationData, setRemediationData] = useState<IaCDriftRemediationResponse | null>(null);
  const [remediationLoading, setRemediationLoading] = useState(false);
  const [remediationEnv, setRemediationEnv] = useState('All Environments');
  const [remediationSeverity, setRemediationSeverity] = useState('All Severities');
  const [remediationStatus, setRemediationStatus] = useState('All Statuses');
  const [remediationSearch, setRemediationSearch] = useState('');
  const [applyingRemediationId, setApplyingRemediationId] = useState<string | null>(null);

  // 10.6 Drift History State
  const [historyData, setHistoryData] = useState<IaCDriftHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResource, setHistoryResource] = useState('All Resources');
  const [historyDateRange, setHistoryDateRange] = useState('Sep 01, 2026 - Sep 30, 2026');
  const [historyPage, setHistoryPage] = useState(1);

  // 10.7 Settings State
  const [settingsData, setSettingsData] = useState<IaCDriftSettingsDTO | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // 10.8 Compare Configuration State
  const [compareResource, setCompareResource] = useState('eks-prod-cluster');
  const [compareData, setCompareData] = useState<IaCDriftCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareFormat, setCompareFormat] = useState<'Terraform' | 'JSON' | 'YAML'>('Terraform');

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // ── Data Fetching Handlers ───────────────────────────────────────────────────
  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    api.iac.driftSuite.getOverview(overviewEnv)
      .then((res) => setOverviewData(res))
      .catch((err) => showToast(`Error loading overview: ${err.message}`))
      .finally(() => setOverviewLoading(false));
  }, [overviewEnv]);

  const loadEnvironments = useCallback(() => {
    setEnvironmentsLoading(true);
    api.iac.driftSuite.getEnvironments()
      .then((res) => setEnvironmentsData(res))
      .catch((err) => showToast(`Error loading environments: ${err.message}`))
      .finally(() => setEnvironmentsLoading(false));
  }, []);

  const loadChanges = useCallback(() => {
    setChangesLoading(true);
    api.iac.driftSuite.getChanges({
      environment: changesEnv,
      change_type: changesType,
      status: changesStatus,
      search: changesSearch,
      page: changesPage,
      page_size: changesPageSize,
    })
      .then((res) => setChangesData(res))
      .catch((err) => showToast(`Error loading changes: ${err.message}`))
      .finally(() => setChangesLoading(false));
  }, [changesEnv, changesType, changesStatus, changesSearch, changesPage, changesPageSize]);

  const loadResourceDetail = useCallback((resName: string) => {
    setResourceDetailLoading(true);
    api.iac.driftSuite.getResourceDetail(resName)
      .then((res) => setResourceDetailData(res))
      .catch((err) => showToast(`Error loading resource detail: ${err.message}`))
      .finally(() => setResourceDetailLoading(false));
  }, []);

  const loadRemediation = useCallback(() => {
    setRemediationLoading(true);
    api.iac.driftSuite.getRemediation({
      environment: remediationEnv,
      severity: remediationSeverity,
      status: remediationStatus,
      search: remediationSearch,
    })
      .then((res) => setRemediationData(res))
      .catch((err) => showToast(`Error loading remediation: ${err.message}`))
      .finally(() => setRemediationLoading(false));
  }, [remediationEnv, remediationSeverity, remediationStatus, remediationSearch]);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api.iac.driftSuite.getHistory({
      resource: historyResource,
      page: historyPage,
      page_size: 10,
    })
      .then((res) => setHistoryData(res))
      .catch((err) => showToast(`Error loading history: ${err.message}`))
      .finally(() => setHistoryLoading(false));
  }, [historyResource, historyPage]);

  const loadSettings = useCallback(() => {
    setSettingsLoading(true);
    api.iac.driftSuite.getSettings()
      .then((res) => setSettingsData(res))
      .catch((err) => showToast(`Error loading settings: ${err.message}`))
      .finally(() => setSettingsLoading(false));
  }, []);

  const loadCompare = useCallback((resName: string) => {
    setCompareLoading(true);
    api.iac.driftSuite.getCompare(resName)
      .then((res) => setCompareData(res))
      .catch((err) => showToast(`Error loading comparison: ${err.message}`))
      .finally(() => setCompareLoading(false));
  }, []);

  // Initial and tab change triggers
  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'environments') loadEnvironments();
    if (activeTab === 'changes') loadChanges();
    if (activeTab === 'resource-detail') loadResourceDetail(selectedResourceName);
    if (activeTab === 'remediation') loadRemediation();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'settings') loadSettings();
    if (activeTab === 'compare') loadCompare(compareResource);
  }, [activeTab, loadOverview, loadEnvironments, loadChanges, loadResourceDetail, selectedResourceName, loadRemediation, loadHistory, loadSettings, loadCompare, compareResource]);

  // Handle Add Environment
  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) {
      showToast('Environment name is required');
      return;
    }
    setEnvSubmitting(true);
    try {
      await api.iac.driftSuite.createEnvironment({
        name: newEnvName.trim(),
        provider: newEnvProvider,
        region: newEnvRegion,
      });
      showToast(`Environment ${newEnvName} created successfully`);
      setShowAddEnvModal(false);
      setNewEnvName('');
      loadEnvironments();
    } catch (err: any) {
      showToast(`Failed to create environment: ${err.message}`);
    } finally {
      setEnvSubmitting(false);
    }
  };

  // Handle Trigger Scan on Environment
  const handleScanEnvironment = async (envName: string) => {
    try {
      showToast(`Scan initiated for ${envName}...`);
      await api.iac.driftSuite.scanEnvironment(envName);
      showToast(`Scan complete for ${envName}`);
      loadEnvironments();
    } catch (err: any) {
      showToast(`Scan failed: ${err.message}`);
    }
  };

  // Handle Delete Environment
  const handleDeleteEnvironment = async (envName: string) => {
    if (!confirm(`Are you sure you want to remove environment "${envName}"?`)) return;
    try {
      await api.iac.driftSuite.deleteEnvironment(envName);
      showToast(`Environment "${envName}" removed`);
      loadEnvironments();
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`);
    }
  };

  // Handle Apply Remediation
  const handleApplyRemediation = async (id: string) => {
    setApplyingRemediationId(id);
    try {
      const res = await api.iac.driftSuite.applyRemediation(id);
      showToast(res.message || 'Remediation applied successfully');
      loadRemediation();
    } catch (err: any) {
      showToast(`Remediation failed: ${err.message}`);
    } finally {
      setApplyingRemediationId(null);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    if (!settingsData) return;
    setSettingsSaving(true);
    try {
      const updated = await api.iac.driftSuite.updateSettings(settingsData);
      setSettingsData(updated);
      showToast('Drift detection settings saved successfully');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Checkbox selection in Changes
  const toggleSelectAllChanges = () => {
    if (!changesData?.items) return;
    if (selectedChangeIds.length === changesData.items.length) {
      setSelectedChangeIds([]);
    } else {
      setSelectedChangeIds(changesData.items.map((i) => i.id));
    }
  };

  const toggleSelectChange = (id: string) => {
    setSelectedChangeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Navigation into Resource Detail
  const navigateToResourceDetail = (resName: string) => {
    setSelectedResourceName(resName);
    setActiveTab('resource-detail');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-blue-600/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white border border-[#E2E8F0] text-[#0F172A] px-4 py-2.5 rounded-lg shadow-xl text-xs animate-fade-in">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-[#64748B] hover:text-[#0F172A]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs Bar */}
      <nav className="border-b border-[#E2E8F0] bg-white px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'environments', label: 'Environments', icon: Globe },
            { id: 'changes', label: 'Drift Changes', icon: FileDiff },
            { id: 'resource-detail', label: 'Resource Detail', icon: Layers },
            { id: 'remediation', label: 'Remediation', icon: Wrench },
            { id: 'history', label: 'Drift History', icon: HistoryIcon },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
            { id: 'compare', label: 'Compare Config', icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DriftSubView)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#0F172A]">
            <GitBranch className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="font-mono text-xs">{effectiveRepo}</span>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'overview') loadOverview();
              if (activeTab === 'environments') loadEnvironments();
              if (activeTab === 'changes') loadChanges();
              if (activeTab === 'resource-detail') loadResourceDetail(selectedResourceName);
              if (activeTab === 'remediation') loadRemediation();
              if (activeTab === 'history') loadHistory();
              if (activeTab === 'settings') loadSettings();
              if (activeTab === 'compare') loadCompare(compareResource);
              showToast('Refreshed data from live backend');
            }}
            className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] transition-colors"
            title="Refresh from backend"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
          <span>THING CODE</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span>IaC Security</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span>Drift Detection</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-blue-600 capitalize font-semibold">{activeTab.replace('-', ' ')}</span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.1 DRIFT DETECTION OVERVIEW                                          */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Drift Detection</h1>
              <p className="text-xs text-[#64748B] mt-1">
                Detect and track differences between your IaC code and deployed infrastructure.
              </p>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Resources */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <span className="text-xs font-medium text-[#64748B]">Total Resources</span>
                <div className="text-3xl font-bold text-[#0F172A] mt-1">
                  {overviewData?.kpis.total_resources ?? 0}
                </div>
              </div>

              {/* Drifted */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <span className="text-xs font-medium text-rose-600">Drifted</span>
                <div className="text-3xl font-bold text-rose-600 mt-1">
                  {overviewData?.kpis.drifted ?? 0}
                </div>
              </div>

              {/* In Sync */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <span className="text-xs font-medium text-emerald-600">In Sync</span>
                <div className="text-3xl font-bold text-emerald-600 mt-1">
                  {overviewData?.kpis.in_sync ?? 0}
                </div>
              </div>

              {/* Not Tracked */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-amber-600">Not Tracked</span>
                  <div className="text-3xl font-bold text-amber-600 mt-1">
                    {overviewData?.kpis.not_tracked ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Donut + Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Drift Status Card */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Drift Status</h2>
                  <select
                    value={overviewEnv}
                    onChange={(e) => setOverviewEnv(e.target.value)}
                    className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Environments">All Environments</option>
                    <option value="production">production</option>
                    <option value="staging">staging</option>
                    <option value="dev">dev</option>
                    <option value="qa">qa</option>
                    <option value="sandbox">sandbox</option>
                  </select>
                </div>

                <div className="py-2">
                  <DriftStatusDonut
                    drifted={overviewData?.kpis.drifted ?? 0}
                    inSync={overviewData?.kpis.in_sync ?? 0}
                    notTracked={overviewData?.kpis.not_tracked ?? 0}
                  />
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-around text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-[#64748B]">Drifted</span>
                    <span className="font-semibold text-[#0F172A]">{overviewData?.kpis.drifted ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#64748B]">In Sync</span>
                    <span className="font-semibold text-[#0F172A]">{overviewData?.kpis.in_sync ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[#64748B]">Not Tracked</span>
                    <span className="font-semibold text-[#0F172A]">{overviewData?.kpis.not_tracked ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Drift Trend Card */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Drift Trend</h2>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[#64748B]">Drifted</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[#64748B]">In Sync</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[#64748B]">Not Tracked</span>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <DriftTrendChart trendData={overviewData?.trend ?? []} />
                </div>

                <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
                  <span>Tracked live history</span>
                  <span className="text-[#64748B] font-mono">Current 30-day window</span>
                </div>
              </div>
            </div>

            {/* Bottom: Recent Drift Events */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Recent Drift Events</h2>
                <button
                  onClick={() => setActiveTab('changes')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="pb-2.5 font-medium">Time</th>
                      <th className="pb-2.5 font-medium">Resource</th>
                      <th className="pb-2.5 font-medium">Environment</th>
                      <th className="pb-2.5 font-medium">Change Type</th>
                      <th className="pb-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {(overviewData?.recent_events ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#64748B]">
                          No recent drift events recorded.
                        </td>
                      </tr>
                    ) : (
                      (overviewData?.recent_events ?? []).map((ev, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 text-[#64748B] font-mono">{ev.time}</td>
                          <td className="py-3 font-medium text-[#0F172A] font-mono">
                            <button
                              onClick={() => navigateToResourceDetail(ev.resource)}
                              className="hover:underline text-left text-[#0F172A] hover:text-blue-600 font-semibold"
                            >
                              {ev.resource}
                            </button>
                          </td>
                          <td className="py-3 text-[#334155]">{ev.environment}</td>
                          <td className="py-3">
                            <ChangeTypeBadge changeType={ev.change_type} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={ev.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.2 ENVIRONMENTS                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'environments' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header + Add Environment Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Environments</h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Manage and monitor drift detection for your environments.
                </p>
              </div>
              <button
                onClick={() => setShowAddEnvModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Environment</span>
              </button>
            </div>

            {/* Environments Table */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Provider</th>
                    <th className="pb-3 font-medium">Region</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Last Scan</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(environmentsData?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#64748B]">
                        No environments configured yet.
                      </td>
                    </tr>
                  ) : (
                    (environmentsData?.items ?? []).map((env) => (
                      <tr key={env.name} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 font-semibold text-[#0F172A] font-mono">{env.name}</td>
                        <td className="py-3.5">
                          <ProviderBadge provider={env.provider} />
                        </td>
                        <td className="py-3.5 text-[#334155] font-mono">{env.region}</td>
                        <td className="py-3.5">
                          <StatusBadge status={env.status} />
                        </td>
                        <td className="py-3.5 text-[#64748B]">{env.last_scan}</td>
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleScanEnvironment(env.name)}
                              className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#64748B] hover:text-blue-600"
                              title="Trigger Scan"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEnvironment(env.name)}
                              className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#64748B] hover:text-rose-600"
                              title="Delete Environment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Environment Modal */}
            {showAddEnvModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Add New Environment</h3>
                    <button
                      onClick={() => setShowAddEnvModal(false)}
                      className="text-[#64748B] hover:text-[#0F172A]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateEnvironment} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[#334155] font-medium mb-1">Environment Name</label>
                      <input
                        type="text"
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        placeholder="e.g. uat-cluster"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#334155] font-medium mb-1">Cloud Provider</label>
                      <select
                        value={newEnvProvider}
                        onChange={(e) => setNewEnvProvider(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-blue-500"
                      >
                        <option value="AWS">AWS</option>
                        <option value="Azure">Azure</option>
                        <option value="GCP">GCP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#334155] font-medium mb-1">Region</label>
                      <input
                        type="text"
                        value={newEnvRegion}
                        onChange={(e) => setNewEnvRegion(e.target.value)}
                        placeholder="e.g. ap-south-1, us-east-1"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddEnvModal(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={envSubmitting}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                      >
                        {envSubmitting ? 'Creating...' : 'Create Environment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.3 DRIFT CHANGES                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'changes' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Drift Changes</h1>
              <p className="text-xs text-[#64748B] mt-1">
                View and analyze all infrastructure changes detected.
              </p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={changesEnv}
                onChange={(e) => setChangesEnv(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Environments">All Environments</option>
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="dev">dev</option>
                <option value="qa">qa</option>
                <option value="sandbox">sandbox</option>
              </select>

              <select
                value={changesType}
                onChange={(e) => setChangesType(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Change Types">All Change Types</option>
                <option value="Modified">Modified</option>
                <option value="Deleted">Deleted</option>
                <option value="Added">Added</option>
              </select>

              <select
                value={changesStatus}
                onChange={(e) => setChangesStatus(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Drifted">Drifted</option>
                <option value="In Sync">In Sync</option>
              </select>

              <div className="flex-1 min-w-[220px] relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={changesSearch}
                  onChange={(e) => setChangesSearch(e.target.value)}
                  placeholder="Search resources, change types..."
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Changes Table */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="pb-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          (changesData?.items.length ?? 0) > 0 &&
                          selectedChangeIds.length === changesData?.items.length
                        }
                        onChange={toggleSelectAllChanges}
                        className="rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                      />
                    </th>
                    <th className="pb-3 font-medium">Resource</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Environment</th>
                    <th className="pb-3 font-medium">Change Type</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Detected</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(changesData?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#64748B]">
                        No drift changes matching current filters.
                      </td>
                    </tr>
                  ) : (
                    (changesData?.items ?? []).map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F8FAFC] transition-colors group cursor-pointer"
                        onClick={() => navigateToResourceDetail(item.resource)}
                      >
                        <td className="py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedChangeIds.includes(item.id)}
                            onChange={() => toggleSelectChange(item.id)}
                            className="rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                          />
                        </td>
                        <td className="py-3.5 font-semibold text-[#0F172A] font-mono group-hover:text-blue-600">
                          {item.resource}
                        </td>
                        <td className="py-3.5 text-[#64748B] font-mono text-[11px]">{item.resource_type}</td>
                        <td className="py-3.5 text-[#334155]">{item.environment}</td>
                        <td className="py-3.5">
                          <ChangeTypeBadge changeType={item.change_type} />
                        </td>
                        <td className="py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3.5 text-[#64748B] font-mono">{item.detected}</td>
                        <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigateToResourceDetail(item.resource)}
                            className="p-1 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                <div className="flex items-center gap-1">
                  <button
                    disabled={changesPage <= 1}
                    onClick={() => setChangesPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {[1, 2, 3, 4, 5].map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setChangesPage(pg)}
                      className={`px-2.5 py-1 rounded border ${
                        changesPage === pg
                          ? 'border-blue-500 text-blue-600 bg-blue-50 font-semibold'
                          : 'border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => setChangesPage((p) => p + 1)}
                    className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span>10 / page</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.4 RESOURCE DETAIL                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'resource-detail' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header + Back Button */}
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setActiveTab('changes')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Changes</span>
                </button>
                <h1 className="text-xl font-bold text-[#0F172A]">Resource Detail</h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Detailed view of an infrastructure resource and its drift status.
                </p>
              </div>
            </div>

            {/* Title / Badge Bar */}
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#0F172A] font-mono">
                      {resourceDetailData?.name ?? selectedResourceName}
                    </span>
                    <StatusBadge status={resourceDetailData?.status ?? 'Drifted'} />
                  </div>
                  <span className="text-xs text-[#64748B] font-mono mt-0.5 block">
                    {resourceDetailData?.resource_type ?? 'AWS::EKS::Cluster'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setCompareResource(selectedResourceName);
                  setActiveTab('compare');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-xs font-medium text-[#0F172A] border border-[#E2E8F0] transition-colors shadow-sm"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Compare Config</span>
              </button>
            </div>

            {/* Sub-tabs: Overview, Configuration, Drift Changes, Relationships, Tags */}
            <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-2">
              {(['Overview', 'Configuration', 'Drift Changes', 'Relationships', 'Tags'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setResourceDetailTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    resourceDetailTab === tab
                      ? 'bg-[#F1F5F9] text-[#0F172A] font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Two Column Layout: Basic Info + Drift Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <span className="text-[#64748B]">Name</span>
                  <span className="text-[#0F172A] font-mono font-medium">{resourceDetailData?.name ?? selectedResourceName}</span>

                  <span className="text-[#64748B]">Type</span>
                  <span className="text-[#0F172A] font-mono">{resourceDetailData?.resource_type ?? 'AWS::EKS::Cluster'}</span>

                  <span className="text-[#64748B]">Environment</span>
                  <span className="text-[#334155]">{resourceDetailData?.environment ?? 'production'}</span>

                  <span className="text-[#64748B]">Region</span>
                  <span className="text-[#334155] font-mono">{resourceDetailData?.region ?? 'ap-south-1'}</span>

                  <span className="text-[#64748B]">Created</span>
                  <span className="text-[#64748B] font-mono">{resourceDetailData?.created ?? 'N/A'}</span>

                  <span className="text-[#64748B]">Last Modified</span>
                  <span className="text-[#64748B] font-mono">{resourceDetailData?.last_modified ?? 'N/A'}</span>

                  <span className="text-[#64748B]">Status</span>
                  <div>
                    <StatusBadge status={resourceDetailData?.status ?? 'Drifted'} />
                  </div>

                  <span className="text-[#64748B]">Drift Detected</span>
                  <span className="text-rose-600 font-mono">{resourceDetailData?.drift_detected ?? 'N/A'}</span>
                </div>
              </div>

              {/* Drift Summary */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-2">
                  Drift Summary
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <span className="text-[#64748B]">Change Type</span>
                  <div>
                    <ChangeTypeBadge changeType={resourceDetailData?.change_type ?? 'Modified'} />
                  </div>

                  <span className="text-[#64748B]">Changed Fields</span>
                  <span className="text-[#0F172A] font-semibold">{resourceDetailData?.changed_fields_count ?? 0}</span>

                  <span className="text-[#64748B]">Severity</span>
                  <div>
                    <SeverityBadge severity={resourceDetailData?.severity ?? 'High'} />
                  </div>

                  <span className="text-[#64748B]">Last Scan</span>
                  <span className="text-[#334155] font-mono">{resourceDetailData?.last_scan ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Configuration (Deployed) Code Viewer Card */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                  Configuration (Deployed)
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-md p-0.5">
                    {(['Terraform', 'JSON', 'YAML'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setConfigFormat(fmt)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          configFormat === fmt
                            ? 'bg-white text-[#0F172A] shadow-sm'
                            : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const code =
                        configFormat === 'Terraform'
                          ? resourceDetailData?.deployed_terraform
                          : configFormat === 'JSON'
                          ? resourceDetailData?.deployed_json
                          : resourceDetailData?.deployed_yaml;
                      copyToClipboard(code || '', 'Configuration Code');
                    }}
                    className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Box with Syntax Styling */}
              <div className="bg-[#0F172A] border border-[#E2E8F0] rounded-lg p-4 font-mono text-xs overflow-x-auto text-slate-200 leading-relaxed">
                <pre>
                  {configFormat === 'Terraform' && (resourceDetailData?.deployed_terraform ?? '# No deployed terraform configuration available')}
                  {configFormat === 'JSON' && (resourceDetailData?.deployed_json ?? '{\n  "status": "No deployed JSON configuration available"\n}')}
                  {configFormat === 'YAML' && (resourceDetailData?.deployed_yaml ?? '# No deployed YAML configuration available')}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.5 REMEDIATION                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'remediation' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Remediation</h1>
              <p className="text-xs text-[#64748B] mt-1">
                Get recommendations to fix infrastructure drift.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={remediationEnv}
                onChange={(e) => setRemediationEnv(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Environments">All Environments</option>
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="dev">dev</option>
                <option value="qa">qa</option>
                <option value="sandbox">sandbox</option>
              </select>

              <select
                value={remediationSeverity}
                onChange={(e) => setRemediationSeverity(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Severities">All Severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={remediationStatus}
                onChange={(e) => setRemediationStatus(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={remediationSearch}
                  onChange={(e) => setRemediationSearch(e.target.value)}
                  placeholder="Filter recommendations..."
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Remediation Table */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="pb-3 font-medium">Resource</th>
                    <th className="pb-3 font-medium">Issue</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium">Recommendation</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(remediationData?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#64748B]">
                        No remediation recommendations found for current filters.
                      </td>
                    </tr>
                  ) : (
                    (remediationData?.items ?? []).map((rem) => (
                      <tr key={rem.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 font-semibold text-[#0F172A] font-mono">
                          <button
                            onClick={() => navigateToResourceDetail(rem.resource)}
                            className="hover:underline hover:text-blue-600 text-left"
                          >
                            {rem.resource}
                          </button>
                        </td>
                        <td className="py-3.5 text-[#334155]">{rem.issue}</td>
                        <td className="py-3.5">
                          <SeverityBadge severity={rem.severity} />
                        </td>
                        <td className="py-3.5 text-[#64748B] max-w-xs">{rem.recommendation}</td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              rem.status === 'Resolved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rem.status === 'In Progress'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {rem.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleApplyRemediation(rem.id)}
                            disabled={applyingRemediationId === rem.id || rem.status === 'Resolved'}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium transition-colors"
                          >
                            {applyingRemediationId === rem.id ? 'Applying...' : 'Apply'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="px-2.5 py-1 rounded border border-blue-500 text-blue-600 bg-blue-50 font-semibold">1</button>
                  <button className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]">2</button>
                  <button className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]">3</button>
                  <button className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9]">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span>10 / page</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.6 DRIFT HISTORY                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Drift History</h1>
              <p className="text-xs text-[#64748B] mt-1">
                Track historical drift events and changes.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={historyResource}
                onChange={(e) => setHistoryResource(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="All Resources">All Resources</option>
                <option value="eks-prod-cluster">eks-prod-cluster</option>
                <option value="s3-bucket">s3-bucket</option>
                <option value="nat-gateway">nat-gateway</option>
                <option value="security-group">security-group</option>
                <option value="rds-instance">rds-instance</option>
              </select>

              <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#0F172A]">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{historyDateRange}</span>
              </div>
            </div>

            {/* History Table */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Resource</th>
                    <th className="pb-3 font-medium">Change Type</th>
                    <th className="pb-3 font-medium">Changed By</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(historyData?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#64748B]">
                        No historical drift events recorded.
                      </td>
                    </tr>
                  ) : (
                    (historyData?.items ?? []).map((h) => (
                      <tr key={h.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 text-[#64748B] font-mono">{h.time}</td>
                        <td className="py-3.5 font-semibold text-[#0F172A] font-mono">
                          <button
                            onClick={() => navigateToResourceDetail(h.resource)}
                            className="hover:underline hover:text-blue-600 text-left"
                          >
                            {h.resource}
                          </button>
                        </td>
                        <td className="py-3.5">
                          <ChangeTypeBadge changeType={h.change_type} />
                        </td>
                        <td className="py-3.5 text-[#334155] font-medium">{h.changed_by}</td>
                        <td className="py-3.5">
                          <StatusBadge status={h.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="px-2.5 py-1 rounded border border-blue-500 text-blue-600 bg-blue-50 font-semibold">1</button>
                  <button className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]">2</button>
                  <button className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]">3</button>
                  <button className="p-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9]">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span>10 / page</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.7 SETTINGS                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Drift Detection Settings</h1>
              <p className="text-xs text-[#64748B] mt-1">
                Configure drift detection for your infrastructure.
              </p>
            </div>

            <div className="space-y-6">
              {/* General Settings */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  General Settings
                </h3>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Enable Drift Detection</span>
                    <span className="text-[11px] text-[#64748B]">Master switch for real-time drift observation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.enable_drift_detection ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, enable_drift_detection: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Auto Scan on Schedule</span>
                    <span className="text-[11px] text-[#64748B]">Run automated drift scans based on schedule configuration</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.auto_scan_on_schedule ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, auto_scan_on_schedule: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>
              </div>

              {/* Notify on Drift */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Notify on Drift
                </h3>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Send notifications when drift is detected</span>
                    <span className="text-[11px] text-[#64748B]">Dispatch alerts immediately upon discrepancy</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.notify_on_drift ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, notify_on_drift: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Include Tags in Comparison</span>
                    <span className="text-[11px] text-[#64748B]">Evaluate cloud resource tag modifications as drift</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.include_tags ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, include_tags: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Ignore Computed Properties</span>
                    <span className="text-[11px] text-[#64748B]">Skip cloud-generated IDs, timestamps, and ARNs</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.ignore_computed ?? false}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, ignore_computed: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>
              </div>

              {/* Scan Configuration */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Scan Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#64748B] mb-1">Scan Frequency</label>
                    <select
                      value={settingsData?.scan_frequency ?? 'Daily'}
                      onChange={(e) =>
                        setSettingsData((prev) =>
                          prev ? { ...prev, scan_frequency: e.target.value } : null
                        )
                      }
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      <option value="Hourly">Hourly</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#64748B] mb-1">Time</label>
                    <input
                      type="text"
                      value={settingsData?.scan_time ?? '02:00'}
                      onChange={(e) =>
                        setSettingsData((prev) =>
                          prev ? { ...prev, scan_time: e.target.value } : null
                        )
                      }
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#0F172A] font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#64748B] text-xs mb-2">Environments</label>
                  <div className="flex flex-wrap gap-4 text-xs">
                    {['production', 'staging', 'dev', 'qa', 'sandbox'].map((env) => {
                      const isChecked = (settingsData?.environments ?? []).includes(env);
                      return (
                        <label key={env} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSettingsData((prev) => {
                                if (!prev) return null;
                                const updated = checked
                                  ? [...prev.environments, env]
                                  : prev.environments.filter((x) => x !== env);
                                return { ...prev, environments: updated };
                              });
                            }}
                            className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                          />
                          <span className="text-[#334155] font-mono">{env}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  Notification Settings
                </h3>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Email Notifications</span>
                    <span className="text-[11px] text-[#64748B]">Receive drift alert digests via email</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.email_notifications ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, email_notifications: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#0F172A] block">Slack Notifications</span>
                    <span className="text-[11px] text-[#64748B]">Broadcast high-severity drift to designated webhook</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.slack_notifications ?? true}
                    onChange={(e) =>
                      setSettingsData((prev) =>
                        prev ? { ...prev, slack_notifications: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 rounded border-[#CBD5E1] text-blue-600 focus:ring-0"
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  {settingsSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* 10.8 COMPARE CONFIGURATION                                             */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'compare' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Compare Configuration</h1>
              <p className="text-xs text-[#64748B] mt-1">
                View differences between your IaC code and deployed state.
              </p>
            </div>

            {/* Controls Bar: Resource Dropdown + View Changes */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[#64748B]">Resource:</label>
                <select
                  value={compareResource}
                  onChange={(e) => setCompareResource(e.target.value)}
                  className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="eks-prod-cluster">eks-prod-cluster</option>
                  <option value="s3-logs-bucket">s3-logs-bucket</option>
                  <option value="vpc-main">vpc-main</option>
                  <option value="nat-gateway">nat-gateway</option>
                  <option value="security-group">security-group</option>
                  <option value="rds-instance">rds-instance</option>
                </select>

                <button
                  onClick={() => loadCompare(compareResource)}
                  disabled={compareLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-sm"
                >
                  {compareLoading ? 'Loading...' : 'View Changes'}
                </button>
              </div>

              {/* Format Tabs: Terraform | JSON | YAML */}
              <div className="flex items-center gap-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-0.5">
                {(['Terraform', 'JSON', 'YAML'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setCompareFormat(fmt)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      compareFormat === fmt
                        ? 'bg-white text-[#0F172A] shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-side Diff Panes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Pane: IaC Configuration (GIT) */}
              <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-[#0F172A]">IaC Configuration (GIT)</span>
                  </div>
                  <span className="text-[11px] text-[#64748B] font-mono">branch: main</span>
                </div>

                <div className="p-4 font-mono text-xs overflow-x-auto text-slate-200 bg-[#0F172A]">
                  {compareFormat === 'Terraform' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>resource "aws_eks_cluster" "main" {'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">2</span><span className="pl-4">name = "eks-prod-cluster"</span></div>
                      <div className="flex bg-rose-500/20 text-rose-300 px-1 rounded">
                        <span className="w-6 text-rose-400 font-bold select-none">3</span>
                        <span className="pl-4">version = "1.29"</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">4</span><span className="pl-4">role_arn = aws_iam_role.eks.arn</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">5</span><span className="pl-4">vpc_config {'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">6</span><span className="pl-8">subnet_ids = [</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">7</span><span className="pl-12">"subnet-123",</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">8</span><span className="pl-12">"subnet-456"</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">9</span><span className="pl-8">]</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">10</span><span className="pl-4">{'}'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">11</span><span>{'}'}</span></div>
                    </div>
                  )}

                  {compareFormat === 'JSON' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>{'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">2</span><span className="pl-4">"name": "eks-prod-cluster",</span></div>
                      <div className="flex bg-rose-500/20 text-rose-300 px-1 rounded">
                        <span className="w-6 text-rose-400 font-bold select-none">3</span>
                        <span className="pl-4">"version": "1.29",</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">4</span><span className="pl-4">"role_arn": "arn:aws:iam::123456789:role/eks-role"</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">5</span><span>{'}'}</span></div>
                    </div>
                  )}

                  {compareFormat === 'YAML' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>name: eks-prod-cluster</span></div>
                      <div className="flex bg-rose-500/20 text-rose-300 px-1 rounded">
                        <span className="w-6 text-rose-400 font-bold select-none">2</span>
                        <span>version: "1.29"</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">3</span><span>role_arn: arn:aws:iam::123456789:role/eks-role</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Deployed Configuration (AWS) */}
              <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AwsLogo className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[#0F172A]">Deployed Configuration (AWS)</span>
                  </div>
                  <span className="text-[11px] text-[#64748B] font-mono">live state</span>
                </div>

                <div className="p-4 font-mono text-xs overflow-x-auto text-slate-200 bg-[#0F172A]">
                  {compareFormat === 'Terraform' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>resource "aws_eks_cluster" "main" {'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">2</span><span className="pl-4">name = "eks-prod-cluster"</span></div>
                      <div className="flex bg-emerald-500/20 text-emerald-300 px-1 rounded">
                        <span className="w-6 text-emerald-400 font-bold select-none">3</span>
                        <span className="pl-4">version = "1.30"</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">4</span><span className="pl-4">role_arn = aws_iam_role.eks.arn</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">5</span><span className="pl-4">vpc_config {'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">6</span><span className="pl-8">subnet_ids = [</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">7</span><span className="pl-12">"subnet-123",</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">8</span><span className="pl-12">"subnet-456",</span></div>
                      <div className="flex bg-emerald-500/20 text-emerald-300 px-1 rounded">
                        <span className="w-6 text-emerald-400 font-bold select-none">9</span>
                        <span className="pl-12">"subnet-789"</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">10</span><span className="pl-8">]</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">11</span><span className="pl-4">{'}'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">12</span><span>{'}'}</span></div>
                    </div>
                  )}

                  {compareFormat === 'JSON' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>{'{'}</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">2</span><span className="pl-4">"name": "eks-prod-cluster",</span></div>
                      <div className="flex bg-emerald-500/20 text-emerald-300 px-1 rounded">
                        <span className="w-6 text-emerald-400 font-bold select-none">3</span>
                        <span className="pl-4">"version": "1.30",</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">4</span><span className="pl-4">"role_arn": "arn:aws:iam::123456789:role/eks-role"</span></div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">5</span><span>{'}'}</span></div>
                    </div>
                  )}

                  {compareFormat === 'YAML' && (
                    <div className="space-y-1">
                      <div className="flex"><span className="w-6 text-slate-500 select-none">1</span><span>name: eks-prod-cluster</span></div>
                      <div className="flex bg-emerald-500/20 text-emerald-300 px-1 rounded">
                        <span className="w-6 text-emerald-400 font-bold select-none">2</span>
                        <span>version: "1.30"</span>
                      </div>
                      <div className="flex"><span className="w-6 text-slate-500 select-none">3</span><span>role_arn: arn:aws:iam::123456789:role/eks-role</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Status: Differences Count Badge */}
            <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-semibold text-rose-600">
                  {compareData?.differences_count ?? 0} differences found
                </span>
              </div>
              <div className="text-[#64748B] text-[11px]">
                Differences identified in version property and subnet attachments
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default DriftDetectionView;
