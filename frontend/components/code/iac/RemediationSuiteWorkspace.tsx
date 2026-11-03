'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Remediation Suite
 * Section 5: Screens 5.1 through 5.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/remediation-suite/*
 * 
 * Screens:
 *   5.1 Remediation Overview (KPIs, Status stacked bar chart, Top categories table)
 *   5.2 Fix Recommendations (Matrix table, severity/framework/provider filters, search, pagination)
 *   5.3 Remediation Detail (Side-by-side diff viewer, step-by-step guide, code examples)
 *   5.4 Auto-Fix (AI-assisted remediation, batch/single fix, + Generate PR modal)
 *   5.5 PR Integration (PR list, PR detail drawer, branch rules, live status)
 *   5.6 Suppressed Findings (Active/history tabs, + Edit/Revoke waiver modal)
 *   5.7 Remediation Activity (Audit trail timeline table, filters)
 *   5.8 Remediation Settings (Auto-fix toggles, PR config, notifications)
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitPullRequest,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
  FileCode,
  Sliders,
  Settings,
  History,
  Info,
  X,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Activity,
  User,
  ShieldAlert,
  Server,
  Cloud,
  Database,
  Lock,
  GitBranch,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import type {
  IaCRemediationOverviewSuiteResponse,
  FixRecommendationsPageResponse,
  FixRecommendationItem,
  RemediationDetailResponse,
  AutoFixListResponse,
  AutoFixItem,
  RemediationPRsPageResponse,
  RemediationPRItem,
  SuppressedFindingsPageResponse,
  SuppressedFindingItem,
  RemediationActivityPageResponse,
  RemediationSettingsDTO,
} from '@/types/api/iac';

export type RemediationSubView =
  | 'overview'
  | 'recommendations'
  | 'detail'
  | 'autofix'
  | 'prs'
  | 'suppressed'
  | 'activity'
  | 'settings';

interface RemediationSuiteWorkspaceProps {
  initialView?: RemediationSubView;
  findingId?: string;
  initialFindingId?: string;
  repositoryName?: string;
}

export const RemediationSuiteWorkspace: React.FC<RemediationSuiteWorkspaceProps> = ({
  initialView = 'overview',
  findingId,
  initialFindingId = 'IAC-001',
  repositoryName,
}) => {
  const effectiveFindingId = findingId || initialFindingId;
  const { currentRepository, repositories } = useScope();
  const effectiveRepoName = currentRepository?.name || repositoryName || 'All Repositories';

  // Current Active Sub-View
  const [currentView, setCurrentView] = useState<RemediationSubView>(initialView);

  // Global Toast & Loading
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // ── 5.1 OVERVIEW STATE ──
  const [overviewData, setOverviewData] = useState<IaCRemediationOverviewSuiteResponse | null>(null);
  const [overviewTimeRange, setOverviewTimeRange] = useState('Last 30 days');

  // ── 5.2 RECOMMENDATIONS STATE ──
  const [recommendationsData, setRecommendationsData] = useState<FixRecommendationsPageResponse | null>(null);
  const [recSeverity, setRecSeverity] = useState('All Severities');
  const [recFramework, setRecFramework] = useState('All Frameworks');
  const [recProvider, setRecProvider] = useState('All Providers');
  const [recSearch, setRecSearch] = useState('');
  const [recPage, setRecPage] = useState(1);
  const [recPageSize] = useState(10);

  // ── 5.3 REMEDIATION DETAIL STATE ──
  const [selectedFindingId, setSelectedFindingId] = useState<string>(effectiveFindingId);
  const [detailData, setDetailData] = useState<RemediationDetailResponse | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'steps' | 'code' | 'references'>('code');
  const [selectedCodeFramework, setSelectedCodeFramework] = useState<'terraform' | 'cloudformation' | 'kubernetes'>('terraform');
  const [copiedType, setCopiedType] = useState<'vuln' | 'rem' | null>(null);

  // ── 5.4 AUTO-FIX STATE ──
  const [autoFixData, setAutoFixData] = useState<AutoFixListResponse | null>(null);
  const [afSeverity, setAfSeverity] = useState('All Severities');
  const [afProvider, setAfProvider] = useState('All Providers');
  const [afFramework, setAfFramework] = useState('All Frameworks');
  const [afPage, setAfPage] = useState(1);
  const [isGeneratePRModalOpen, setIsGeneratePRModalOpen] = useState(false);
  const [selectedAutoFixItem, setSelectedAutoFixItem] = useState<AutoFixItem | null>(null);
  const [prCustomTitle, setPrCustomTitle] = useState('');
  const [prTargetBranch, setPrTargetBranch] = useState('main');
  const [prReviewers, setPrReviewers] = useState('secops-team');
  const [prIncludeContext, setPrIncludeContext] = useState(true);
  const [generatingPR, setGeneratingPR] = useState(false);

  // ── 5.5 PR INTEGRATION STATE ──
  const [prsData, setPrsData] = useState<RemediationPRsPageResponse | null>(null);
  const [prSubTab, setPrSubTab] = useState<'pull-requests' | 'settings' | 'branch-rules'>('pull-requests');
  const [prStatusFilter, setPrStatusFilter] = useState('All Statuses');
  const [prRepoFilter, setPrRepoFilter] = useState('All Repositories');
  const [prSearch, setPrSearch] = useState('');
  const [prPage, setPrPage] = useState(1);
  const [selectedPRDrawer, setSelectedPRDrawer] = useState<RemediationPRItem | null>(null);

  // ── 5.6 SUPPRESSED FINDINGS STATE ──
  const [suppressedData, setSuppressedData] = useState<SuppressedFindingsPageResponse | null>(null);
  const [suppSubTab, setSuppSubTab] = useState<'active' | 'history'>('active');
  const [suppReasonFilter, setSuppReasonFilter] = useState('All Reasons');
  const [suppResourceFilter, setSuppResourceFilter] = useState('All Resources');
  const [suppSearch, setSuppSearch] = useState('');
  const [suppPage, setSuppPage] = useState(1);
  const [editingSuppression, setEditingSuppression] = useState<SuppressedFindingItem | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [savingSuppression, setSavingSuppression] = useState(false);

  // ── 5.7 REMEDIATION ACTIVITY STATE ──
  const [activityData, setActivityData] = useState<RemediationActivityPageResponse | null>(null);
  const [actActionFilter, setActActionFilter] = useState('All Actions');
  const [actUserFilter, setActUserFilter] = useState('All Users');
  const [actSearch, setActSearch] = useState('');
  const [actPage, setActPage] = useState(1);

  // ── 5.8 REMEDIATION SETTINGS STATE ──
  const [settings, setSettings] = useState<RemediationSettingsDTO>({
    enable_ai_remediation: true,
    auto_create_prs: true,
    require_manual_approval_critical: true,
    include_test_validation: true,
    git_provider: 'GitHub',
    repository: effectiveRepoName,
    base_branch: 'main',
    auto_assign_reviewers: 'secops-team',
    include_security_context: true,
    auto_close_on_merge: true,
    notify_pr_creation: true,
    notify_pr_merge: true,
    notify_failed_autofix: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // ── API LOADERS ──
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getOverview(overviewTimeRange);
      setOverviewData(res);
    } catch (err: any) {
      showToast(`Failed to load remediation overview: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [overviewTimeRange, showToast]);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getRecommendations({
        severity: recSeverity === 'All Severities' ? undefined : recSeverity,
        framework: recFramework === 'All Frameworks' ? undefined : recFramework,
        provider: recProvider === 'All Providers' ? undefined : recProvider,
        search: recSearch.trim() || undefined,
        page: recPage,
        page_size: recPageSize,
      });
      setRecommendationsData(res);
    } catch (err: any) {
      showToast(`Failed to load recommendations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [recSeverity, recFramework, recProvider, recSearch, recPage, recPageSize, showToast]);

  const loadDetail = useCallback(async (fId: string) => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getDetail(fId);
      setDetailData(res);
    } catch (err: any) {
      showToast(`Failed to load remediation detail: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadAutoFix = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getAutoFixList({
        severity: afSeverity === 'All Severities' ? undefined : afSeverity,
        provider: afProvider === 'All Providers' ? undefined : afProvider,
        framework: afFramework === 'All Frameworks' ? undefined : afFramework,
        page: afPage,
      });
      setAutoFixData(res);
    } catch (err: any) {
      showToast(`Failed to load auto-fix items: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [afSeverity, afProvider, afFramework, afPage, showToast]);

  const loadPRs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getPRs({
        status: prStatusFilter === 'All Statuses' ? undefined : prStatusFilter,
        repository: prRepoFilter === 'All Repositories' ? undefined : prRepoFilter,
        search: prSearch.trim() || undefined,
        page: prPage,
      });
      setPrsData(res);
    } catch (err: any) {
      showToast(`Failed to load remediation PRs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [prStatusFilter, prRepoFilter, prSearch, prPage, showToast]);

  const loadSuppressions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getSuppressions({
        reason: suppReasonFilter === 'All Reasons' ? undefined : suppReasonFilter,
        resource: suppResourceFilter === 'All Resources' ? undefined : suppResourceFilter,
        search: suppSearch.trim() || undefined,
        page: suppPage,
      });
      setSuppressedData(res);
    } catch (err: any) {
      showToast(`Failed to load suppressed findings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [suppSubTab, suppReasonFilter, suppResourceFilter, suppSearch, suppPage, showToast]);

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getActivity({
        action: actActionFilter === 'All Actions' ? undefined : actActionFilter,
        user: actUserFilter === 'All Users' ? undefined : actUserFilter,
        search: actSearch.trim() || undefined,
        page: actPage,
      });
      setActivityData(res);
    } catch (err: any) {
      showToast(`Failed to load remediation activity: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [actActionFilter, actUserFilter, actSearch, actPage, showToast]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.remediationSuite.getSettings();
      setSettings(res);
    } catch (err: any) {
      showToast(`Failed to load remediation settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Master Route Switching Effect
  useEffect(() => {
    switch (currentView) {
      case 'overview':
        loadOverview();
        break;
      case 'recommendations':
        loadRecommendations();
        break;
      case 'detail':
        loadDetail(selectedFindingId);
        break;
      case 'autofix':
        loadAutoFix();
        break;
      case 'prs':
        loadPRs();
        break;
      case 'suppressed':
        loadSuppressions();
        break;
      case 'activity':
        loadActivity();
        break;
      case 'settings':
        loadSettings();
        break;
    }
  }, [
    currentView,
    selectedFindingId,
    loadOverview,
    loadRecommendations,
    loadDetail,
    loadAutoFix,
    loadPRs,
    loadSuppressions,
    loadActivity,
    loadSettings,
  ]);

  // Copy code helper
  const handleCopyCode = (code: string, type: 'vuln' | 'rem') => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    showToast('Code snippet copied to clipboard');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Open detail view for recommendation item
  const handleViewDetail = (item: FixRecommendationItem) => {
    setSelectedFindingId(item.id);
    setCurrentView('detail');
  };

  // Open Generate PR modal
  const handleOpenGeneratePR = (item: AutoFixItem) => {
    setSelectedAutoFixItem(item);
    setPrCustomTitle(`fix(iac): remediate ${item.finding} on ${item.resource}`);
    setIsGeneratePRModalOpen(true);
  };

  // Submit PR generation
  const handleSubmitGeneratePR = async () => {
    if (!selectedAutoFixItem) return;
    setGeneratingPR(true);
    try {
      const res = await api.iac.remediationSuite.generatePR({
        finding_id: selectedAutoFixItem.id,
        target_branch: prTargetBranch,
        custom_title: prCustomTitle,
        auto_assign_reviewers: prReviewers,
        include_security_context: prIncludeContext,
      });
      showToast(`PR #${res.pr_number} created successfully: ${res.pr_id}`);
      setIsGeneratePRModalOpen(false);
      loadAutoFix();
    } catch (err: any) {
      showToast(`Failed to generate PR: ${err.message}`);
    } finally {
      setGeneratingPR(false);
    }
  };

  // Open edit waiver modal
  const handleOpenEditSuppression = (item: SuppressedFindingItem) => {
    setEditingSuppression(item);
    setEditReason(item.reason);
    setEditExpiresAt(item.expires_at);
  };

  // Save updated suppression or revoke
  const handleSaveSuppression = async (revoke = false) => {
    if (!editingSuppression) return;
    setSavingSuppression(true);
    try {
      if (revoke) {
        await api.iac.remediationSuite.updateSuppression(editingSuppression.id, { status: 'Revoked' });
        showToast(`Suppression waiver revoked for ${editingSuppression.finding}`);
      } else {
        await api.iac.remediationSuite.updateSuppression(editingSuppression.id, {
          reason: editReason,
          expires_at: editExpiresAt,
        });
        showToast(`Suppression waiver updated for ${editingSuppression.finding}`);
      }
      setEditingSuppression(null);
      loadSuppressions();
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`);
    } finally {
      setSavingSuppression(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.iac.remediationSuite.saveSettings(settings);
      setSettings(res);
      showToast('Remediation settings saved successfully');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Reset Settings
  const handleResetSettings = async () => {
    try {
      const res = await api.iac.remediationSuite.resetSettings();
      setSettings(res);
      showToast('Remediation settings restored to defaults');
    } catch (err: any) {
      showToast(`Failed to reset settings: ${err.message}`);
    }
  };

  // Sub-Navigation Tabs metadata
  const subNavTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'recommendations', label: 'Fix Recommendations', icon: Wrench },
    { id: 'autofix', label: 'Auto-Fix', icon: Sparkles },
    { id: 'prs', label: 'PR Integration', icon: GitPullRequest },
    { id: 'suppressed', label: 'Suppressed', icon: ShieldAlert },
    { id: 'activity', label: 'Activity', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Critical</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">Medium</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Low</span>;
    }
  };

  const getResourceIcon = (resName: string) => {
    if (resName.includes('s3') || resName.includes('bucket')) return <Database size={13} className="text-amber-600" />;
    if (resName.includes('security_group') || resName.includes('firewall')) return <Lock size={13} className="text-purple-600" />;
    if (resName.includes('k8s') || resName.includes('pod') || resName.includes('deployment')) return <Server size={13} className="text-blue-600" />;
    return <Cloud size={13} className="text-sky-600" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-blue-600/20">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-blue-200 text-[#0F172A] px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in text-xs">
          <Info size={16} className="text-blue-600" />
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
        {/* Horizontal Sub-view Tabs */}
        <div className="flex items-center gap-1.5 mb-6 border-b border-[#E2E8F0] pb-3 overflow-x-auto">
          {subNavTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id || (tab.id === 'recommendations' && currentView === 'detail');
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as RemediationSubView)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            5.1 REMEDIATION OVERVIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'overview' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Remediation Overview</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Track and fix IaC security issues with guided and automated remediation.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={overviewTimeRange}
                  onChange={(e) => setOverviewTimeRange(e.target.value)}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-blue-500"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                </select>

                <button
                  onClick={loadOverview}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                  title="Refresh data"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Open Issues */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="text-3xl font-extrabold text-rose-600">
                  {overviewData?.open_issues ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Open Issues</div>
              </div>

              {/* 2. Fix Available */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {overviewData?.fix_available ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Fix Available</div>
              </div>

              {/* 3. Auto-Fixable */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="text-3xl font-extrabold text-purple-600">
                  {overviewData?.auto_fixable ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Auto-Fixable</div>
              </div>

              {/* 4. In Progress */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="text-3xl font-extrabold text-blue-600">
                  {overviewData?.in_progress ?? 0}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">In Progress</div>
              </div>
            </div>

            {/* Remediation Status Stacked Bar Chart */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">Remediation Status Trend</h3>

                {/* Legend */}
                <div className="flex items-center gap-5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600">Open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-600">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Fixed</span>
                  </div>
                </div>
              </div>

              {overviewData?.status_trend && overviewData.status_trend.length > 0 ? (
                <div className="h-64 w-full flex items-end gap-6 sm:gap-10 pt-4 px-2 border-b border-slate-200 relative">
                  {/* Bars */}
                  {overviewData.status_trend.map((point) => {
                    const maxVal = Math.max(
                      ...overviewData.status_trend.map((p) => p.open_count + p.in_progress_count + p.fixed_count),
                      10
                    );
                    const hFixed = (point.fixed_count / maxVal) * 100;
                    const hProg = (point.in_progress_count / maxVal) * 100;
                    const hOpen = (point.open_count / maxVal) * 100;

                    return (
                      <div key={point.date} className="flex-1 flex flex-col items-center h-full justify-end group z-10">
                        {/* Stack */}
                        <div className="w-6 sm:w-8 rounded-t overflow-hidden flex flex-col-reverse shadow-xs transition-all group-hover:opacity-90">
                          {/* Fixed - Green */}
                          <div style={{ height: `${hFixed}%` }} className="bg-emerald-500" title={`Fixed: ${point.fixed_count}`} />
                          {/* In Progress - Amber */}
                          <div style={{ height: `${hProg}%` }} className="bg-amber-400" title={`In Progress: ${point.in_progress_count}`} />
                          {/* Open - Red */}
                          <div style={{ height: `${hOpen}%` }} className="bg-rose-500" title={`Open: ${point.open_count}`} />
                        </div>
                        {/* X-axis label */}
                        <span className="text-[11px] text-slate-500 mt-2 whitespace-nowrap">{point.date}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                  No status trend metrics recorded for the selected time range.
                </div>
              )}
            </div>

            {/* Top Remediation Categories Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">Top Remediation Categories</h3>
                <button
                  onClick={() => setCurrentView('recommendations')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Category</th>
                      <th className="py-3 px-5">Open</th>
                      <th className="py-3 px-5">In Progress</th>
                      <th className="py-3 px-5">Fixed</th>
                      <th className="py-3 px-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {overviewData?.top_categories && overviewData.top_categories.length > 0 ? (
                      overviewData.top_categories.map((cat) => (
                        <tr key={cat.category} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5 text-slate-900 font-semibold flex items-center gap-2">
                            <Shield size={14} className="text-blue-600" />
                            {cat.category}
                          </td>
                          <td className="py-3.5 px-5 text-rose-600 font-bold">{cat.open_count}</td>
                          <td className="py-3.5 px-5 text-amber-600 font-bold">{cat.in_progress_count}</td>
                          <td className="py-3.5 px-5 text-emerald-600 font-bold">{cat.fixed_count}</td>
                          <td className="py-3.5 px-5 text-right text-slate-900 font-bold">{cat.total_count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                          No category distribution data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5.2 FIX RECOMMENDATIONS
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'recommendations' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fix Recommendations</h1>
              <p className="text-xs text-slate-500 mt-1">
                Deterministic and AI-guided remediation guidance for IaC security findings.
              </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={recSeverity}
                  onChange={(e) => {
                    setRecSeverity(e.target.value);
                    setRecPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={recFramework}
                  onChange={(e) => {
                    setRecFramework(e.target.value);
                    setRecPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All Frameworks">All Frameworks</option>
                  <option value="Terraform">Terraform</option>
                  <option value="CloudFormation">CloudFormation</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Helm">Helm</option>
                </select>

                <select
                  value={recProvider}
                  onChange={(e) => {
                    setRecProvider(e.target.value);
                    setRecPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All Providers">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Azure">Azure</option>
                  <option value="GCP">GCP</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search findings, resources..."
                    value={recSearch}
                    onChange={(e) => {
                      setRecSearch(e.target.value);
                      setRecPage(1);
                    }}
                    className="w-full bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={loadRecommendations}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Finding</th>
                      <th className="py-3 px-5">Resource</th>
                      <th className="py-3 px-5">Severity</th>
                      <th className="py-3 px-5">Fix Recommendation</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(recommendationsData?.items || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                          {getResourceIcon(item.resource)}
                          {item.finding}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600">{item.resource}</td>
                        <td className="py-3.5 px-5">{getSeverityBadge(item.severity)}</td>
                        <td className="py-3.5 px-5 max-w-md truncate text-slate-500">{item.recommendation}</td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-semibold"
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
                <span>
                  Showing {recommendationsData?.items?.length ?? 0} of {recommendationsData?.total ?? 0} recommendations
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={recPage <= 1}
                    onClick={() => setRecPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {recPage} of {recommendationsData?.total_pages ?? 1}</span>
                  <button
                    disabled={recPage >= (recommendationsData?.total_pages ?? 1)}
                    onClick={() => setRecPage((p) => p + 1)}
                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5.3 REMEDIATION DETAIL
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'detail' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentView('recommendations')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Fix Recommendations</span>
            </button>

            {/* Title & Header */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {detailData?.title || 'Remediation Detail'}
                </h1>
                {getSeverityBadge(detailData?.severity || 'Medium')}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {detailData?.status || 'Open'}
                </span>
              </div>

              <div className="text-xs text-slate-500 font-mono mt-2">
                <span>{detailData?.finding_id || selectedFindingId}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-700">{detailData?.resource || 'Infrastructure Resource'}</span>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-6 mt-6 border-b border-slate-200 text-xs font-semibold">
                {(['overview', 'steps', 'code', 'references'] as const).map((tKey) => {
                  const label =
                    tKey === 'overview'
                      ? 'Overview'
                      : tKey === 'steps'
                      ? 'Fix Steps'
                      : tKey === 'code'
                      ? 'Code Examples'
                      : 'References';
                  return (
                    <button
                      key={tKey}
                      onClick={() => setDetailTab(tKey)}
                      className={`pb-3 transition-colors ${
                        detailTab === tKey
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Content */}
            {detailTab === 'code' && (
              <div className="space-y-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended Fix</h3>
                  <p className="text-sm text-slate-800 mt-1">
                    {detailData?.description || 'Modify template configuration to remediate the identified misconfiguration.'}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    {(['terraform', 'cloudformation', 'kubernetes'] as const).map((fw) => {
                      const name =
                        fw === 'terraform' ? 'Terraform' : fw === 'cloudformation' ? 'CloudFormation' : 'Kubernetes (Helm)';
                      return (
                        <button
                          key={fw}
                          onClick={() => setSelectedCodeFramework(fw)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            selectedCodeFramework === fw
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Side-by-side Diff Viewer */}
                {(() => {
                  const snippet = detailData?.code_examples?.[selectedCodeFramework] || {
                    framework: 'Terraform',
                    vulnerable_code: '# Vulnerable configuration',
                    remediated_code: '# Secure configuration',
                  };

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Current (Vulnerable) */}
                      <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-700">Current (Vulnerable)</span>
                          <button
                            onClick={() => handleCopyCode(snippet.vulnerable_code, 'vuln')}
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            {copiedType === 'vuln' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            <span>{copiedType === 'vuln' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-4 font-mono text-xs leading-relaxed text-rose-300 bg-slate-950 flex-1 overflow-x-auto">
                          <pre className="whitespace-pre">
                            {snippet.vulnerable_code.split('\n').map((line, idx) => (
                              <div key={idx} className="flex gap-4">
                                <span className="text-slate-600 select-none w-6 text-right">{idx + 1}</span>
                                <span className="text-rose-300">- {line}</span>
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>

                      {/* Remediated (Secure) */}
                      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700">Remediated (Secure)</span>
                          <button
                            onClick={() => handleCopyCode(snippet.remediated_code, 'rem')}
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            {copiedType === 'rem' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            <span>{copiedType === 'rem' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-4 font-mono text-xs leading-relaxed text-emerald-300 bg-slate-950 flex-1 overflow-x-auto">
                          <pre className="whitespace-pre">
                            {snippet.remediated_code.split('\n').map((line, idx) => (
                              <div key={idx} className="flex gap-4">
                                <span className="text-slate-600 select-none w-6 text-right">{idx + 1}</span>
                                <span className="text-emerald-300">+ {line}</span>
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {detailTab === 'overview' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Impact & Threat Description</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {detailData?.impact || 'Detailed security risk profile evaluated from benchmark rules.'}
                </p>
              </div>
            )}

            {detailTab === 'steps' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Step-by-Step Fix Guide</h3>
                <div className="space-y-3">
                  {(detailData?.fix_steps || []).map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'references' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Compliance & Security Standards</h3>
                <div className="divide-y divide-slate-100">
                  {(detailData?.references || []).map((ref, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-blue-600">{ref.framework}</span>
                        <span className="text-slate-500 ml-2">({ref.control_id})</span>
                        <p className="text-slate-700 text-xs mt-0.5">{ref.title}</p>
                      </div>
                      {ref.url && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Docs</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5.4 AUTO-FIX (AI REMEDIATION)
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'autofix' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Auto-Fix</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Verified Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Deterministic policy verification paired with automated Git PR creation for safe fixes.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-800 shadow-xs">
              <Sparkles size={16} className="text-blue-600 shrink-0" />
              <span>Automated pull requests with isolated diff tests can be generated for verified findings.</span>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={afSeverity}
                  onChange={(e) => {
                    setAfSeverity(e.target.value);
                    setAfPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={afProvider}
                  onChange={(e) => {
                    setAfProvider(e.target.value);
                    setAfPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Providers">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Kubernetes">Kubernetes</option>
                </select>

                <select
                  value={afFramework}
                  onChange={(e) => {
                    setAfFramework(e.target.value);
                    setAfPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Frameworks">All Frameworks</option>
                  <option value="Terraform">Terraform</option>
                  <option value="Kubernetes">Kubernetes</option>
                </select>
              </div>

              <button
                onClick={loadAutoFix}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Auto-Fix Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Finding</th>
                      <th className="py-3 px-5">Resource</th>
                      <th className="py-3 px-5">Severity</th>
                      <th className="py-3 px-5">Auto-Fix</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(autoFixData?.items || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                          {getResourceIcon(item.resource)}
                          {item.finding}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600">{item.resource}</td>
                        <td className="py-3.5 px-5">{getSeverityBadge(item.severity)}</td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleOpenGeneratePR(item)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                          >
                            Generate PR
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

        {/* ══════════════════════════════════════════════════════════════════════
            5.5 PULL REQUEST INTEGRATION
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'prs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PR Integration</h1>
              <p className="text-xs text-slate-500 mt-1">
                Integrate with your Git provider to create, track, and merge remediation pull requests.
              </p>
            </div>

            {/* Sub-tabs: Pull Requests, Branch Rules */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setPrSubTab('pull-requests')}
                className={`pb-3 transition-colors ${
                  prSubTab === 'pull-requests'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pull Requests
              </button>
              <button
                onClick={() => setPrSubTab('branch-rules')}
                className={`pb-3 transition-colors ${
                  prSubTab === 'branch-rules'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Branch Rules
              </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={prStatusFilter}
                  onChange={(e) => {
                    setPrStatusFilter(e.target.value);
                    setPrPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Merged">Merged</option>
                  <option value="Closed">Closed</option>
                </select>

                <select
                  value={prRepoFilter}
                  onChange={(e) => {
                    setPrRepoFilter(e.target.value);
                    setPrPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Repositories">All Repositories</option>
                  {repositories && repositories.length > 0 ? (
                    repositories.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)
                  ) : (
                    <>
                      <option value="infra">infra</option>
                      <option value="k8s-manifests">k8s-manifests</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search pull requests..."
                    value={prSearch}
                    onChange={(e) => {
                      setPrSearch(e.target.value);
                      setPrPage(1);
                    }}
                    className="w-full bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={loadPRs}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* PRs Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">PR #</th>
                      <th className="py-3 px-5">Title</th>
                      <th className="py-3 px-5">Repository</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Created At</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(prsData?.items || []).map((pr) => {
                      const isMerged = pr.status.toLowerCase() === 'merged';
                      const isOpen = pr.status.toLowerCase() === 'open';

                      return (
                        <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-blue-600 font-bold">#{pr.pr_number}</td>
                          <td className="py-3.5 px-5 font-medium text-slate-900">{pr.title}</td>
                          <td className="py-3.5 px-5 font-mono text-slate-600">{pr.repository}</td>
                          <td className="py-3.5 px-5">
                            {isOpen && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Open
                              </span>
                            )}
                            {isMerged && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Merged
                              </span>
                            )}
                            {!isOpen && !isMerged && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Closed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500">{pr.created_at}</td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setSelectedPRDrawer(pr)}
                              className="px-3 py-1 bg-white hover:bg-slate-50 text-blue-600 rounded-md text-xs font-semibold border border-slate-200 shadow-xs"
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
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5.6 SUPPRESSED FINDINGS
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'suppressed' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppressed Findings</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage deterministic and audited policy waivers and finding suppressions.
              </p>
            </div>

            {/* Sub-tabs: Active Suppressions, History */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSuppSubTab('active')}
                className={`pb-3 transition-colors ${
                  suppSubTab === 'active'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Active Suppressions
              </button>
              <button
                onClick={() => setSuppSubTab('history')}
                className={`pb-3 transition-colors ${
                  suppSubTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Suppression History
              </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={suppReasonFilter}
                  onChange={(e) => {
                    setSuppReasonFilter(e.target.value);
                    setSuppPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Reasons">All Reasons</option>
                  <option value="Accepted risk (Legacy)">Accepted risk (Legacy)</option>
                  <option value="Development environment">Development environment</option>
                  <option value="Low risk">Low risk</option>
                  <option value="Internal application">Internal application</option>
                </select>

                <select
                  value={suppResourceFilter}
                  onChange={(e) => {
                    setSuppResourceFilter(e.target.value);
                    setSuppPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Resources">All Resources</option>
                  {(suppressedData?.resources || []).filter((r) => r !== 'All Resources').map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search suppressed findings..."
                    value={suppSearch}
                    onChange={(e) => {
                      setSuppSearch(e.target.value);
                      setSuppPage(1);
                    }}
                    className="w-full bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={loadSuppressions}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Suppressed Findings Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Finding</th>
                      <th className="py-3 px-5">Resource</th>
                      <th className="py-3 px-5">Reason</th>
                      <th className="py-3 px-5">Expires At</th>
                      <th className="py-3 px-5">Suppressed By</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(suppressedData?.items || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                          {getResourceIcon(item.resource)}
                          {item.finding}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600">{item.resource}</td>
                        <td className="py-3.5 px-5 text-slate-700 font-medium">{item.reason}</td>
                        <td className="py-3.5 px-5 text-slate-500">{item.expires_at}</td>
                        <td className="py-3.5 px-5 font-mono text-slate-500">{item.suppressed_by}</td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleOpenEditSuppression(item)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-semibold flex items-center gap-1.5 ml-auto"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
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

        {/* ══════════════════════════════════════════════════════════════════════
            5.7 REMEDIATION ACTIVITY
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'activity' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Remediation Activity</h1>
              <p className="text-xs text-slate-500 mt-1">
                Audit trail and historical execution logs of all remediation actions.
              </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={actActionFilter}
                  onChange={(e) => {
                    setActActionFilter(e.target.value);
                    setActPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Actions">All Actions</option>
                  <option value="Auto-fix PR">Auto-fix PR</option>
                  <option value="PR merged">PR merged</option>
                  <option value="Manual fix">Manual fix</option>
                  <option value="Closed PR">Closed PR</option>
                  <option value="Suppressed">Suppressed</option>
                  <option value="PR created">PR created</option>
                </select>

                <select
                  value={actUserFilter}
                  onChange={(e) => {
                    setActUserFilter(e.target.value);
                    setActPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="All Users">All Users</option>
                  <option value="secops-lead">secops-lead</option>
                  <option value="devops-team">devops-team</option>
                  <option value="system-agent">system-agent</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search remediation activities..."
                    value={actSearch}
                    onChange={(e) => {
                      setActSearch(e.target.value);
                      setActPage(1);
                    }}
                    className="w-full bg-white border border-[#CBD5E1] text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={loadActivity}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-5">Action</th>
                      <th className="py-3 px-5">Finding</th>
                      <th className="py-3 px-5">Resource</th>
                      <th className="py-3 px-5">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(activityData?.items || []).map((item) => {
                      const isAutoFix = item.action === 'Auto-fix PR';
                      const isMerged = item.action === 'PR merged';
                      const isManual = item.action === 'Manual fix';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">{item.timestamp}</td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isAutoFix
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : isMerged
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isManual
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-medium text-slate-900">{item.finding}</td>
                          <td className="py-3.5 px-5 font-mono text-slate-600">{item.resource}</td>
                          <td className="py-3.5 px-5 font-mono text-slate-600 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            {item.user}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            5.8 REMEDIATION SETTINGS
        ══════════════════════════════════════════════════════════════════════ */}
        {currentView === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Remediation Settings</h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure automated pull requests, approval gates, and notification options.
              </p>
            </div>

            {/* 1. Auto-Fix Settings Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide border-b border-slate-100 pb-3">
                Auto-Fix Automation
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Enable AI-assisted remediation suggestions</div>
                    <div className="text-[11px] text-slate-500">Generate deterministic code patches against security rules</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable_ai_remediation}
                    onChange={(e) => setSettings({ ...settings, enable_ai_remediation: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Auto-create pull requests</div>
                    <div className="text-[11px] text-slate-500">Automatically open PRs for high-confidence non-breaking patches</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_create_prs}
                    onChange={(e) => setSettings({ ...settings, auto_create_prs: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Require manual approval for Critical severity</div>
                    <div className="text-[11px] text-slate-500">Enforce human-in-the-loop signoff before modifying critical resources</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_manual_approval_critical}
                    onChange={(e) => setSettings({ ...settings, require_manual_approval_critical: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Include test validation</div>
                    <div className="text-[11px] text-slate-500">Execute validation scanners against proposed diff before proposing PR</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.include_test_validation}
                    onChange={(e) => setSettings({ ...settings, include_test_validation: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2. PR Integration Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide border-b border-slate-100 pb-3">
                Git Provider Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Git Provider</label>
                  <select
                    value={settings.git_provider}
                    onChange={(e) => setSettings({ ...settings, git_provider: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="GitHub">GitHub</option>
                    <option value="GitLab">GitLab</option>
                    <option value="Bitbucket">Bitbucket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Repository</label>
                  <input
                    type="text"
                    value={settings.repository}
                    onChange={(e) => setSettings({ ...settings, repository: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Base Branch</label>
                  <input
                    type="text"
                    value={settings.base_branch}
                    onChange={(e) => setSettings({ ...settings, base_branch: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-assign Reviewers</label>
                  <input
                    type="text"
                    value={settings.auto_assign_reviewers}
                    onChange={(e) => setSettings({ ...settings, auto_assign_reviewers: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Include security context in PR description</div>
                    <div className="text-[11px] text-slate-500">Attach finding metadata, policy rationale, and framework compliance mappings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.include_security_context}
                    onChange={(e) => setSettings({ ...settings, include_security_context: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Auto-close findings on merge</div>
                    <div className="text-[11px] text-slate-500">Automatically mark finding status as Resolved once the remediation PR is merged</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_close_on_merge}
                    onChange={(e) => setSettings({ ...settings, auto_close_on_merge: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 3. Notifications Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide border-b border-slate-100 pb-3">
                Remediation Notifications
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_pr_creation}
                    onChange={(e) => setSettings({ ...settings, notify_pr_creation: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Notify SecOps channel on PR creation</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_pr_merge}
                    onChange={(e) => setSettings({ ...settings, notify_pr_merge: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Notify SecOps channel on PR merge</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notify_failed_autofix}
                    onChange={(e) => setSettings({ ...settings, notify_failed_autofix: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Notify on failed auto-fix test validation</span>
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={savingSettings}
                onClick={handleResetSettings}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all shadow-xs"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={savingSettings}
                onClick={handleSaveSettings}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                {savingSettings && <RefreshCw size={13} className="animate-spin" />}
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: GENERATE PR ── */}
      {isGeneratePRModalOpen && selectedAutoFixItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sparkles size={16} className="text-purple-600" />
                <span>Generate Remediation Pull Request</span>
              </div>
              <button
                onClick={() => setIsGeneratePRModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Target Finding</label>
                <div className="font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedAutoFixItem.finding} ({selectedAutoFixItem.resource})
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">PR Title</label>
                <input
                  type="text"
                  value={prCustomTitle}
                  onChange={(e) => setPrCustomTitle(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Target Branch</label>
                <input
                  type="text"
                  value={prTargetBranch}
                  onChange={(e) => setPrTargetBranch(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Reviewers</label>
                <input
                  type="text"
                  value={prReviewers}
                  onChange={(e) => setPrReviewers(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prIncludeContext}
                  onChange={(e) => setPrIncludeContext(e.target.checked)}
                  className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600"
                />
                <span>Include security context and compliance evidence in PR body</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                disabled={generatingPR}
                onClick={() => setIsGeneratePRModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={generatingPR}
                onClick={handleSubmitGeneratePR}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2"
              >
                {generatingPR && <RefreshCw size={13} className="animate-spin" />}
                <span>Create Pull Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT SUPPRESSION ── */}
      {editingSuppression && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Edit2 size={16} className="text-blue-600" />
                <span>Edit Finding Suppression</span>
              </div>
              <button
                onClick={() => setEditingSuppression(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Finding & Resource</label>
                <div className="font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {editingSuppression.finding} ({editingSuppression.resource})
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Suppression Reason</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Expires At</label>
                <input
                  type="text"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                disabled={savingSuppression}
                onClick={() => handleSaveSuppression(true)}
                className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold"
              >
                Revoke Waiver (Unsuppress)
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={savingSuppression}
                  onClick={() => setEditingSuppression(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={savingSuppression}
                  onClick={() => handleSaveSuppression(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2"
                >
                  {savingSuppression && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PR DETAIL ── */}
      {selectedPRDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <GitPullRequest size={16} className="text-blue-600" />
                <span>Pull Request #{selectedPRDrawer.pr_number}: {selectedPRDrawer.title}</span>
              </div>
              <button
                onClick={() => setSelectedPRDrawer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">Repository:</span>{' '}
                  <span className="font-mono text-slate-900 font-semibold">{selectedPRDrawer.repository}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <span className="font-semibold text-emerald-700">{selectedPRDrawer.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Branch:</span>{' '}
                  <span className="font-mono text-slate-700">{selectedPRDrawer.branch}</span>
                </div>
                <div>
                  <span className="text-slate-500">Checks:</span>{' '}
                  <span className="text-emerald-700 font-semibold">{selectedPRDrawer.checks_status}</span>
                </div>
              </div>

              {selectedPRDrawer.diff_preview && (
                <div>
                  <div className="text-slate-600 font-semibold mb-1">Patch Diff Preview</div>
                  <pre className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 whitespace-pre overflow-x-auto">
                    {selectedPRDrawer.diff_preview}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedPRDrawer(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
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

export default RemediationSuiteWorkspace;
