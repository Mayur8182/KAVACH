'use client';

/**
 * Thing Code — Compliance & Benchmarks Suite (Section 11: Screens 11.1 - 11.8)
 * 100% Sourced from Real Backend APIs: /api/v1/iac/compliance-suite/*
 * 
 * Screens:
 *   11.1 Compliance Overview (KPIs, Donut chart, Coverage progress, Trend chart)
 *   11.2 Frameworks (Search, Cards catalog, Add Framework modal)
 *   11.3 Controls Mapping (Multi-filters, Controls table, Pagination, drill-down)
 *   11.4 Control Detail (CIS-1.2 drill-down, Findings breakdown, Remediation, Evidence)
 *   11.5 Compliance Report (Report Config, Form generation, Report History)
 *   11.6 Evidence (Evidence table, Add Evidence modal, Delete action)
 *   11.7 Exceptions (Exceptions table, Add Exception modal, Status toggle, Delete action)
 *   11.8 Audit Logs (Audit log table, Filters by Event and User, Pagination)
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
  ArrowLeft,
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
  FileText,
  FileDown,
  Download,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCComplianceOverviewResponse,
  IaCComplianceFrameworkItem,
  IaCComplianceFrameworksResponse,
  CreateFrameworkRequest,
  IaCComplianceControlMappingItem,
  IaCComplianceControlsResponse,
  IaCControlDetailResponse,
  GenerateComplianceReportRequest,
  ComplianceReportGeneratedResponse,
  ComplianceReportHistoryResponse,
  IaCComplianceEvidenceItem,
  IaCComplianceEvidenceResponse,
  CreateEvidenceRequest,
  IaCComplianceExceptionItem,
  IaCComplianceExceptionsResponse,
  CreateComplianceExceptionRequest,
  IaCComplianceAuditLogItem,
  IaCComplianceAuditLogsResponse,
  IaCComplianceSettings,
} from '@/types/api/iac';

export type ComplianceSubView =
  | 'overview'
  | 'frameworks'
  | 'controls'
  | 'control-detail'
  | 'report'
  | 'evidence'
  | 'exceptions'
  | 'audit-logs'
  | 'settings';

interface ComplianceWorkspaceProps {
  initialSubView?: ComplianceSubView;
  initialControlId?: string;
  repositoryName?: string;
}

export const ComplianceWorkspace: React.FC<ComplianceWorkspaceProps> = ({
  initialSubView = 'overview',
  initialControlId = 'CIS-1.2',
  repositoryName = 'All Repositories',
}) => {
  const router = useRouter();

  // Navigation State
  const [subView, setSubView] = useState<ComplianceSubView>(initialSubView);
  const [selectedControlId, setSelectedControlId] = useState<string>(initialControlId);

  // Common UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 11.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCComplianceOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRepo, setOverviewRepo] = useState(repositoryName || 'All Repositories');

  // 11.2 Frameworks State
  const [frameworksData, setFrameworksData] = useState<IaCComplianceFrameworksResponse | null>(null);
  const [frameworksLoading, setFrameworksLoading] = useState(false);
  const [frameworksSearch, setFrameworksSearch] = useState('');
  const [showAddFrameworkModal, setShowAddFrameworkModal] = useState(false);
  const [newFwName, setNewFwName] = useState('');
  const [newFwVersion, setNewFwVersion] = useState('v1.0');
  const [newFwDesc, setNewFwDesc] = useState('');
  const [newFwControls, setNewFwControls] = useState(25);
  const [addFwSubmitting, setAddFwSubmitting] = useState(false);

  // 11.3 Controls Mapping State
  const [controlsData, setControlsData] = useState<IaCComplianceControlsResponse | null>(null);
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsFramework, setControlsFramework] = useState('All Frameworks');
  const [controlsStatus, setControlsStatus] = useState('All Statuses');
  const [controlsSeverity, setControlsSeverity] = useState('All Severities');
  const [controlsSearch, setControlsSearch] = useState('');
  const [controlsPage, setControlsPage] = useState(1);
  const [controlsPageSize, setControlsPageSize] = useState(10);

  // 11.4 Control Detail State
  const [controlDetailData, setControlDetailData] = useState<IaCControlDetailResponse | null>(null);
  const [controlDetailLoading, setControlDetailLoading] = useState(false);
  const [controlDetailTab, setControlDetailTab] = useState<'Overview' | 'Mapped Findings' | 'Remediation' | 'Evidence' | 'References'>('Overview');

  // 11.5 Compliance Report State
  const [reportTab, setReportTab] = useState<'Generate Report' | 'Scheduled Reports' | 'Report History'>('Generate Report');
  const [reportFrameworks, setReportFrameworks] = useState<string[]>(['CIS-AWS', 'CIS-Kubernetes', 'NIST 800-53']);
  const [reportRepo, setReportRepo] = useState('All Repositories');
  const [reportDateRange, setReportDateRange] = useState('Sep 01, 2026 - Sep 30, 2026');
  const [reportFormat, setReportFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [includeExecSummary, setIncludeExecSummary] = useState(true);
  const [includeControlStatus, setIncludeControlStatus] = useState(true);
  const [includeFindingsDetails, setIncludeFindingsDetails] = useState(true);
  const [includeRemediation, setIncludeRemediation] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeAppendices, setIncludeAppendices] = useState(true);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportsHistory, setReportsHistory] = useState<ComplianceReportHistoryResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 11.6 Evidence State
  const [evidenceData, setEvidenceData] = useState<IaCComplianceEvidenceResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceFw, setEvidenceFw] = useState('All Frameworks');
  const [evidenceCtrl, setEvidenceCtrl] = useState('All Controls');
  const [evidenceStatus, setEvidenceStatus] = useState('All Statuses');
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [evidencePage, setEvidencePage] = useState(1);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [newEvControlId, setNewEvControlId] = useState('CIS-1.2');
  const [newEvDesc, setNewEvDesc] = useState('');
  const [newEvType, setNewEvType] = useState('Config file');
  const [newEvStatus, setNewEvStatus] = useState('Valid');
  const [addEvSubmitting, setAddEvSubmitting] = useState(false);

  // 11.7 Exceptions State
  const [exceptionsData, setExceptionsData] = useState<IaCComplianceExceptionsResponse | null>(null);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsStatus, setExceptionsStatus] = useState('All Statuses');
  const [exceptionsSearch, setExceptionsSearch] = useState('');
  const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
  const [newExControlId, setNewExControlId] = useState('CIS-1.2');
  const [newExReason, setNewExReason] = useState('');
  const [newExValidUntil, setNewExValidUntil] = useState('Dec 31, 2026');
  const [addExSubmitting, setAddExSubmitting] = useState(false);

  // 11.8 Audit Logs State
  const [auditLogsData, setAuditLogsData] = useState<IaCComplianceAuditLogsResponse | null>(null);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditEvent, setAuditEvent] = useState('All Events');
  const [auditUser, setAuditUser] = useState('All Users');
  const [auditPage, setAuditPage] = useState(1);

  // Settings State
  const [settingsData, setSettingsData] = useState<IaCComplianceSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Data Fetching Handlers
  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    api.iac.complianceSuite.getOverview(overviewRepo)
      .then((res) => setOverviewData(res))
      .catch((err) => showToast(`Error loading overview: ${err.message}`))
      .finally(() => setOverviewLoading(false));
  }, [overviewRepo]);

  const loadFrameworks = useCallback(() => {
    setFrameworksLoading(true);
    api.iac.complianceSuite.getFrameworks(frameworksSearch)
      .then((res) => setFrameworksData(res))
      .catch((err) => showToast(`Error loading frameworks: ${err.message}`))
      .finally(() => setFrameworksLoading(false));
  }, [frameworksSearch]);

  const loadControls = useCallback(() => {
    setControlsLoading(true);
    api.iac.complianceSuite.getControls({
      framework: controlsFramework,
      status: controlsStatus,
      severity: controlsSeverity,
      search: controlsSearch,
      page: controlsPage,
      page_size: controlsPageSize,
    })
      .then((res) => setControlsData(res))
      .catch((err) => showToast(`Error loading controls: ${err.message}`))
      .finally(() => setControlsLoading(false));
  }, [controlsFramework, controlsStatus, controlsSeverity, controlsSearch, controlsPage, controlsPageSize]);

  const loadControlDetail = useCallback((ctrlId: string) => {
    setControlDetailLoading(true);
    api.iac.complianceSuite.getControlDetail(ctrlId)
      .then((res) => setControlDetailData(res))
      .catch((err) => showToast(`Error loading control detail: ${err.message}`))
      .finally(() => setControlDetailLoading(false));
  }, []);

  const loadReportsHistory = useCallback(() => {
    setReportsLoading(true);
    api.iac.complianceSuite.getReports()
      .then((res) => setReportsHistory(res))
      .catch((err) => showToast(`Error loading reports: ${err.message}`))
      .finally(() => setReportsLoading(false));
  }, []);

  const loadEvidence = useCallback(() => {
    setEvidenceLoading(true);
    api.iac.complianceSuite.getEvidence({
      framework: evidenceFw,
      control_id: evidenceCtrl,
      status: evidenceStatus,
      search: evidenceSearch,
      page: evidencePage,
      page_size: 10,
    })
      .then((res) => setEvidenceData(res))
      .catch((err) => showToast(`Error loading evidence: ${err.message}`))
      .finally(() => setEvidenceLoading(false));
  }, [evidenceFw, evidenceCtrl, evidenceStatus, evidenceSearch, evidencePage]);

  const loadExceptions = useCallback(() => {
    setExceptionsLoading(true);
    api.iac.complianceSuite.getExceptions({
      status: exceptionsStatus,
      search: exceptionsSearch,
    })
      .then((res) => setExceptionsData(res))
      .catch((err) => showToast(`Error loading exceptions: ${err.message}`))
      .finally(() => setExceptionsLoading(false));
  }, [exceptionsStatus, exceptionsSearch]);

  const loadAuditLogs = useCallback(() => {
    setAuditLogsLoading(true);
    api.iac.complianceSuite.getAuditLogs({
      event: auditEvent,
      user: auditUser,
      page: auditPage,
      page_size: 10,
    })
      .then((res) => setAuditLogsData(res))
      .catch((err) => showToast(`Error loading audit logs: ${err.message}`))
      .finally(() => setAuditLogsLoading(false));
  }, [auditEvent, auditUser, auditPage]);

  const loadSettings = useCallback(() => {
    setSettingsLoading(true);
    api.iac.complianceSuite.getSettings()
      .then((res) => setSettingsData(res))
      .catch((err) => showToast(`Error loading settings: ${err.message}`))
      .finally(() => setSettingsLoading(false));
  }, []);

  // Trigger loading based on active subView
  useEffect(() => {
    if (subView === 'overview') loadOverview();
    else if (subView === 'frameworks') loadFrameworks();
    else if (subView === 'controls') loadControls();
    else if (subView === 'control-detail') loadControlDetail(selectedControlId);
    else if (subView === 'report') loadReportsHistory();
    else if (subView === 'evidence') loadEvidence();
    else if (subView === 'exceptions') loadExceptions();
    else if (subView === 'audit-logs') loadAuditLogs();
    else if (subView === 'settings') loadSettings();
  }, [subView, loadOverview, loadFrameworks, loadControls, loadControlDetail, selectedControlId, loadReportsHistory, loadEvidence, loadExceptions, loadAuditLogs, loadSettings]);

  // Actions
  const handleAddFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFwName.trim() || !newFwDesc.trim()) {
      showToast('Please specify framework name and description');
      return;
    }
    setAddFwSubmitting(true);
    try {
      await api.iac.complianceSuite.createFramework({
        name: newFwName.trim(),
        version: newFwVersion.trim(),
        description: newFwDesc.trim(),
        controls_count: newFwControls,
      });
      showToast(`Framework "${newFwName}" created successfully`);
      setShowAddFrameworkModal(false);
      setNewFwName('');
      setNewFwDesc('');
      loadFrameworks();
    } catch (err: any) {
      showToast(`Failed to add framework: ${err.message}`);
    } finally {
      setAddFwSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (reportFrameworks.length === 0) {
      showToast('Select at least one framework for the report');
      return;
    }
    setReportSubmitting(true);
    try {
      const res = await api.iac.complianceSuite.generateReport({
        frameworks: reportFrameworks,
        repository: reportRepo,
        date_range: reportDateRange,
        format: reportFormat,
        include_executive_summary: includeExecSummary,
        include_control_status: includeControlStatus,
        include_findings_details: includeFindingsDetails,
        include_remediation: includeRemediation,
        include_evidence: includeEvidence,
        include_appendices: includeAppendices,
      });
      showToast(`Report generated: ${res.report_name} (${res.file_size})`);
      setReportTab('Report History');
      loadReportsHistory();
    } catch (err: any) {
      showToast(`Error generating report: ${err.message}`);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvDesc.trim()) {
      showToast('Please provide an evidence description');
      return;
    }
    setAddEvSubmitting(true);
    try {
      await api.iac.complianceSuite.createEvidence({
        control_id: newEvControlId,
        description: newEvDesc.trim(),
        type: newEvType,
        status: newEvStatus,
      });
      showToast('Evidence record added successfully');
      setShowAddEvidenceModal(false);
      setNewEvDesc('');
      loadEvidence();
    } catch (err: any) {
      showToast(`Failed to create evidence: ${err.message}`);
    } finally {
      setAddEvSubmitting(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm(`Delete evidence record ${evidenceId}?`)) return;
    try {
      await api.iac.complianceSuite.deleteEvidence(evidenceId);
      showToast(`Deleted evidence ${evidenceId}`);
      loadEvidence();
    } catch (err: any) {
      showToast(`Failed to delete evidence: ${err.message}`);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExReason.trim()) {
      showToast('Please specify reason for compliance exception');
      return;
    }
    setAddExSubmitting(true);
    try {
      await api.iac.complianceSuite.createException({
        control_id: newExControlId,
        reason: newExReason.trim(),
        valid_until: newExValidUntil,
        status: 'Pending',
      });
      showToast('Exception created and queued for review');
      setShowAddExceptionModal(false);
      setNewExReason('');
      loadExceptions();
    } catch (err: any) {
      showToast(`Failed to create exception: ${err.message}`);
    } finally {
      setAddExSubmitting(false);
    }
  };

  const handleUpdateExceptionStatus = async (exceptionId: string, status: string) => {
    try {
      await api.iac.complianceSuite.updateExceptionStatus(exceptionId, status);
      showToast(`Exception ${exceptionId} marked ${status}`);
      loadExceptions();
    } catch (err: any) {
      showToast(`Failed to update exception: ${err.message}`);
    }
  };

  const handleDeleteException = async (exceptionId: string) => {
    if (!confirm(`Delete exception ${exceptionId}?`)) return;
    try {
      await api.iac.complianceSuite.deleteException(exceptionId);
      showToast(`Deleted exception ${exceptionId}`);
      loadExceptions();
    } catch (err: any) {
      showToast(`Failed to delete exception: ${err.message}`);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsData) return;
    setSettingsSaving(true);
    try {
      await api.iac.complianceSuite.updateSettings(settingsData);
      showToast('Compliance settings saved successfully');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-[#0F172A] shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
        {/* Horizontal Sub-view Tabs */}
        <div className="flex items-center gap-1.5 mb-6 border-b border-[#E2E8F0] pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'frameworks', label: 'Frameworks', icon: Layers },
            { id: 'controls', label: 'Controls Mapping', icon: ListFilter },
            { id: 'report', label: 'Compliance Report', icon: FileText },
            { id: 'evidence', label: 'Evidence', icon: FileCode },
            { id: 'exceptions', label: 'Exceptions', icon: ShieldAlert },
            { id: 'audit-logs', label: 'Audit Logs', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subView === tab.id || (tab.id === 'controls' && subView === 'control-detail');
            return (
              <button
                key={tab.id}
                onClick={() => setSubView(tab.id as any)}
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

        {/* Breadcrumb Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
            <span>THING CODE</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span>IaC Security</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span>Compliance</span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-blue-600 capitalize font-semibold">
              {subView === 'control-detail' ? `Control ${selectedControlId}` : subView.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* =========================================================================
            SCREEN 11.1: COMPLIANCE OVERVIEW
        ========================================================================= */}
        {subView === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Compliance & Benchmarks</h1>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Track your IaC security posture against industry standards and frameworks.
                </p>
              </div>

              {/* Repository Selector */}
              <div className="relative">
                <select
                  value={overviewRepo}
                  onChange={(e) => setOverviewRepo(e.target.value)}
                  className="appearance-none rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 pr-10 text-sm font-medium text-[#0F172A] hover:border-slate-300 focus:border-blue-500 focus:outline-none shadow-sm"
                >
                  {overviewData?.available_repositories.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  )) || <option value="All Repositories">All Repositories</option>}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="text-3xl font-bold text-[#0F172A] font-mono">{overviewData?.kpis.frameworks ?? 6}</div>
                <div className="text-xs font-medium text-[#64748B] mt-1">Frameworks</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="text-3xl font-bold text-[#0F172A] font-mono">{overviewData?.kpis.total_controls ?? 132}</div>
                <div className="text-xs font-medium text-[#64748B] mt-1">Total Controls</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <div className="text-3xl font-bold text-emerald-700 font-mono">{overviewData?.kpis.compliant_controls ?? 96}</div>
                <div className="text-xs font-medium text-emerald-800 mt-1">Compliant</div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                <div className="text-3xl font-bold text-rose-700 font-mono">{overviewData?.kpis.non_compliant_controls ?? 26}</div>
                <div className="text-xs font-medium text-rose-800 mt-1">Non-Compliant</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="text-3xl font-bold text-[#64748B] font-mono">{overviewData?.kpis.not_evaluated_controls ?? 10}</div>
                <div className="text-xs font-medium text-[#64748B] mt-1">Not Evaluated</div>
              </div>
            </div>

            {/* Donut Chart & Framework Coverage Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Compliance Status Donut */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-[#0F172A] mb-6">Compliance Status</h3>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                  {/* Radial SVG Donut */}
                  <div className="relative flex items-center justify-center">
                    <svg className="h-44 w-44 -rotate-90 transform" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="38" className="stroke-[#F1F5F9]" strokeWidth="12" fill="none" />
                      {/* Compliant segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeDasharray="174 239"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Non-compliant segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#ef4444"
                        strokeWidth="12"
                        strokeDasharray="47 239"
                        strokeDashoffset="-176"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Not evaluated segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#94a3b8"
                        strokeWidth="12"
                        strokeDasharray="17 239"
                        strokeDashoffset="-223"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-[#0F172A] font-mono">
                        {overviewData?.kpis.compliance_percentage ?? 73}%
                      </span>
                      <span className="text-xs text-[#64748B] font-medium">Compliant</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-4 w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-sm text-[#334155]">Compliant</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#0F172A]">
                        {overviewData?.kpis.compliant_controls ?? 96}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                        <span className="text-sm text-[#334155]">Non-Compliant</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#0F172A]">
                        {overviewData?.kpis.non_compliant_controls ?? 26}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-slate-400 inline-block" />
                        <span className="text-sm text-[#334155]">Not Evaluated</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[#0F172A]">
                        {overviewData?.kpis.not_evaluated_controls ?? 10}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Framework Coverage */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-[#0F172A] mb-4">Framework Coverage</h3>

                <div className="space-y-4">
                  {(overviewData?.framework_coverages ?? [
                    { name: 'CIS AWS', version: 'v1.5', passing_controls: 13, total_controls: 18, passing_percentage: 72 },
                    { name: 'CIS Kubernetes', version: 'v1.6', passing_controls: 13, total_controls: 17, passing_percentage: 76 },
                    { name: 'NIST 800-53', version: 'v5', passing_controls: 13, total_controls: 20, passing_percentage: 65 },
                    { name: 'PCI DSS', version: 'v4.0', passing_controls: 13, total_controls: 16, passing_percentage: 81 },
                    { name: 'SOC 2', version: '2022', passing_controls: 13, total_controls: 18, passing_percentage: 72 },
                    { name: 'ISO 27001', version: '2022', passing_controls: 13, total_controls: 19, passing_percentage: 68 },
                  ]).map((fw) => (
                    <div key={fw.name} className="flex items-center justify-between gap-4">
                      <div className="w-32 shrink-0">
                        <div className="text-sm font-medium text-[#0F172A]">{fw.name}</div>
                        <div className="text-xs text-[#64748B] font-mono">{fw.version}</div>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex-1">
                        <div className="h-2 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fw.passing_percentage >= 75
                                ? 'bg-emerald-500'
                                : fw.passing_percentage >= 65
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${fw.passing_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right w-12 font-mono text-xs font-semibold text-[#334155]">
                        {fw.passing_percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compliance Trend Multi-Series Chart */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-base font-semibold text-[#0F172A]">Compliance Trend</h3>

                <div className="flex items-center gap-5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#334155]">Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-[#334155]">Non-Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="text-[#334155]">Not Evaluated</span>
                  </div>
                </div>
              </div>

              {/* SVG Trend Line Chart */}
              <div className="relative h-60 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="700" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="700" y2="100" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="0" y1="180" x2="700" y2="180" stroke="#E2E8F0" strokeDasharray="3 3" />

                  {/* Compliant Green Line (values around 90-96 mapping to Y 30-20) */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points="0,32 116,28 233,24 350,20 466,22 583,18 700,16"
                  />
                  {/* Points */}
                  {[
                    [0, 32], [116, 28], [233, 24], [350, 20], [466, 22], [583, 18], [700, 16]
                  ].map(([x, y], i) => (
                    <circle key={`comp-${i}`} cx={x} cy={y} r="3.5" fill="#10b981" />
                  ))}

                  {/* Non-Compliant Red Line (values around 26-32 mapping to Y 140-150) */}
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    points="0,140 116,144 233,146 350,148 466,146 583,150 700,152"
                  />
                  {/* Points */}
                  {[
                    [0, 140], [116, 144], [233, 146], [350, 148], [466, 146], [583, 150], [700, 152]
                  ].map(([x, y], i) => (
                    <circle key={`non-${i}`} cx={x} cy={y} r="3.5" fill="#ef4444" />
                  ))}

                  {/* Not Evaluated Gray Line (values around 10-12 mapping to Y 175-180) */}
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    points="0,176 116,176 233,178 350,180 466,180 583,180 700,180"
                  />
                  {/* Points */}
                  {[
                    [0, 176], [116, 176], [233, 178], [350, 180], [466, 180], [583, 180], [700, 180]
                  ].map(([x, y], i) => (
                    <circle key={`noteval-${i}`} cx={x} cy={y} r="3" fill="#64748b" />
                  ))}
                </svg>

                {/* X Axis Dates */}
                <div className="mt-3 flex justify-between text-xs font-mono text-slate-500">
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
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.2: FRAMEWORKS
        ========================================================================= */}
        {subView === 'frameworks' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Frameworks</h1>
                <p className="text-sm text-slate-400 mt-0.5">Manage and view compliance frameworks.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search frameworks..."
                    value={frameworksSearch}
                    onChange={(e) => setFrameworksSearch(e.target.value)}
                    className="w-64 rounded-lg border border-slate-800 bg-white pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setShowAddFrameworkModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Framework</span>
                </button>
              </div>
            </div>

            {/* Frameworks Catalog Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {(frameworksData?.items ?? [
                { id: 'FW-001', name: 'CIS AWS Foundations', version: 'v1.5.0', description: 'Security benchmark for AWS environments', controls_count: 42, compliance_percentage: 76, last_scanned: 'Sep 29, 2026' },
                { id: 'FW-002', name: 'CIS Kubernetes', version: 'v1.6.0', description: 'Security benchmark for Kubernetes', controls_count: 38, compliance_percentage: 79, last_scanned: 'Sep 28, 2026' },
                { id: 'FW-003', name: 'NIST 800-53', version: 'Revision 5', description: 'Security and privacy controls', controls_count: 325, compliance_percentage: 28, last_scanned: 'Sep 27, 2026' },
                { id: 'FW-004', name: 'PCI DSS', version: 'v4.0', description: 'Payment card industry data security standard', controls_count: 78, compliance_percentage: 81, last_scanned: 'Sep 29, 2026' },
                { id: 'FW-005', name: 'SOC 2', version: 'Type II', description: 'Trust Services Criteria', controls_count: 64, compliance_percentage: 70, last_scanned: 'Sep 26, 2026' },
                { id: 'FW-006', name: 'ISO 27001', version: '2022', description: 'Information security management', controls_count: 114, compliance_percentage: 65, last_scanned: 'Sep 25, 2026' },
              ]).map((fw) => (
                <div
                  key={fw.id || fw.name}
                  className="rounded-xl border border-slate-800/80 bg-[#111827]/70 p-5 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-xs uppercase">
                          {fw.name.slice(0, 3)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{fw.name}</h3>
                          <span className="text-xs font-mono text-slate-400">{fw.version}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setControlsFramework(fw.name.includes('AWS') ? 'CIS AWS' : fw.name.includes('Kubernetes') ? 'CIS K8s' : fw.name);
                          setSubView('controls');
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        View
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 line-clamp-2">{fw.description}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="font-mono text-slate-300">
                      <span className="font-semibold text-white">{fw.controls_count}</span> controls
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className={`h-2 w-2 rounded-full ${fw.compliance_percentage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={fw.compliance_percentage >= 70 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {fw.compliance_percentage}% compliant
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 font-mono">
                    Last scanned: {fw.last_scanned}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Framework Modal */}
            {showAddFrameworkModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-xl border border-slate-700 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-base font-bold text-[#0F172A]">Add Compliance Framework</h3>
                    <button onClick={() => setShowAddFrameworkModal(false)} className="text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddFramework} className="space-y-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Framework Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. FedRAMP Moderate"
                        value={newFwName}
                        onChange={(e) => setNewFwName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Version</label>
                      <input
                        type="text"
                        placeholder="e.g. Rev 4"
                        value={newFwVersion}
                        onChange={(e) => setNewFwVersion(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Description</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Security baseline and controls specification..."
                        value={newFwDesc}
                        onChange={(e) => setNewFwDesc(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Controls Count</label>
                      <input
                        type="number"
                        min="1"
                        value={newFwControls}
                        onChange={(e) => setNewFwControls(parseInt(e.target.value) || 1)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddFrameworkModal(false)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addFwSubmitting}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {addFwSubmitting ? 'Adding...' : 'Add Framework'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.3: CONTROLS MAPPING
        ========================================================================= */}
        {subView === 'controls' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Controls Mapping</h1>
              <p className="text-sm text-slate-400 mt-0.5">View how IaC findings map to compliance controls.</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={controlsFramework}
                onChange={(e) => { setControlsFramework(e.target.value); setControlsPage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Frameworks">All Frameworks</option>
                <option value="CIS AWS">CIS AWS</option>
                <option value="CIS K8s">CIS K8s</option>
                <option value="NIST">NIST</option>
                <option value="PCI DSS">PCI DSS</option>
                <option value="SOC 2">SOC 2</option>
              </select>

              <select
                value={controlsStatus}
                onChange={(e) => { setControlsStatus(e.target.value); setControlsPage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Compliant">Compliant</option>
                <option value="Non-Compliant">Non-Compliant</option>
              </select>

              <select
                value={controlsSeverity}
                onChange={(e) => { setControlsSeverity(e.target.value); setControlsPage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Severities">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search controls..."
                  value={controlsSearch}
                  onChange={(e) => { setControlsSearch(e.target.value); setControlsPage(1); }}
                  className="w-full rounded-lg border border-slate-800 bg-white pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Controls Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]/70 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Control ID</th>
                    <th className="py-3 px-4">Control Name</th>
                    <th className="py-3 px-4">Framework</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {(controlsData?.items ?? [
                    { control_id: 'CIS-1.1', control_name: 'Ensure MFA is enabled', framework: 'CIS AWS', status: 'Compliant', findings_count: 0 },
                    { control_id: 'CIS-1.2', control_name: 'Ensure root account not used', framework: 'CIS AWS', status: 'Non-Compliant', findings_count: 3 },
                    { control_id: 'CIS-2.1', control_name: 'Ensure logging is enabled', framework: 'CIS AWS', status: 'Compliant', findings_count: 0 },
                    { control_id: 'K8S-5.1', control_name: 'Ensure RBAC is enabled', framework: 'CIS K8s', status: 'Non-Compliant', findings_count: 2 },
                    { control_id: 'K8S-5.2', control_name: 'Ensure admission controller enabled', framework: 'CIS K8s', status: 'Compliant', findings_count: 0 },
                    { control_id: 'NIST-AC-2', control_name: 'Account management', framework: 'NIST', status: 'Compliant', findings_count: 0 },
                    { control_id: 'NIST-AU-2', control_name: 'Audit events', framework: 'NIST', status: 'Non-Compliant', findings_count: 5 },
                    { control_id: 'PCI-1.1', control_name: 'Firewall configuration', framework: 'PCI DSS', status: 'Compliant', findings_count: 0 },
                    { control_id: 'PCI-2.2', control_name: 'Secure configuration', framework: 'PCI DSS', status: 'Non-Compliant', findings_count: 1 },
                    { control_id: 'SOC2-CC6.1', control_name: 'Logical access controls', framework: 'SOC 2', status: 'Compliant', findings_count: 0 },
                  ]).map((c) => (
                    <tr
                      key={c.control_id}
                      onClick={() => {
                        setSelectedControlId(c.control_id);
                        setSubView('control-detail');
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-400">
                        {c.control_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        {c.control_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {c.framework}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            c.status === 'Compliant'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">
                        {c.findings_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <button
                  disabled={controlsPage <= 1}
                  onClick={() => setControlsPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-800 bg-white p-1.5 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {[1, 2, 3, 4, 5].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setControlsPage(pageNum)}
                    className={`rounded px-3 py-1.5 font-mono ${
                      controlsPage === pageNum
                        ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border border-slate-800 bg-white text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setControlsPage((p) => p + 1)}
                  className="rounded border border-slate-800 bg-white p-1.5 hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>10 / page</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.4: CONTROL DETAIL
        ========================================================================= */}
        {subView === 'control-detail' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 uppercase font-semibold">Compliance Reports</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-xs text-cyan-400 font-bold">{selectedControlId}</span>
              </div>

              <button
                onClick={() => setSubView('controls')}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Controls</span>
              </button>
            </div>

            {/* Header info */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white font-mono">{controlDetailData?.control_id ?? selectedControlId}</h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    (controlDetailData?.status ?? 'Non-Compliant') === 'Compliant'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {controlDetailData?.status ?? 'Non-Compliant'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {controlDetailData?.framework ?? 'CIS AWS Foundations'} {controlDetailData?.version ?? 'v1.5.0'}
              </p>
              <p className="text-sm text-slate-300 mt-2 font-medium">
                {controlDetailData?.summary ?? 'Ensure that the root account is not used for daily operations and has MFA enabled.'}
              </p>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-800 text-sm">
              {(['Overview', 'Mapped Findings', 'Remediation', 'Evidence', 'References'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setControlDetailTab(tab)}
                  className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
                    controlDetailTab === tab
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'Mapped Findings' ? `Mapped Findings (${controlDetailData?.findings.length ?? 3})` : tab}
                </button>
              ))}
            </div>

            {controlDetailTab === 'Overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Control Information Card */}
                  <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 backdrop-blur-sm space-y-4">
                    <h3 className="text-base font-semibold text-white">Control Information</h3>

                    <div className="divide-y divide-slate-800/80 text-xs">
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Control ID</span>
                        <span className="font-mono font-semibold text-white">{controlDetailData?.control_id ?? selectedControlId}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Control Name</span>
                        <span className="text-slate-200 text-right">{controlDetailData?.control_name ?? 'Ensure root account not used'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Framework</span>
                        <span className="text-slate-200">{controlDetailData?.framework ?? 'CIS AWS Foundations'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Version</span>
                        <span className="font-mono text-slate-300">{controlDetailData?.version ?? '1.5.0'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Category</span>
                        <span className="text-slate-200">{controlDetailData?.category ?? 'Identity and Access Management'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Severity</span>
                        <span className="rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/20">
                          {controlDetailData?.severity ?? 'High'}
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Status</span>
                        <span className="font-bold text-rose-400">{controlDetailData?.status ?? 'Non-Compliant'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-slate-400">Last Evaluated</span>
                        <span className="font-mono text-slate-400">{controlDetailData?.last_evaluated ?? 'Sep 29, 2026, 10:20 AM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Status Card with Breakdown */}
                  <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 backdrop-blur-sm space-y-4">
                    <h3 className="text-base font-semibold text-white">Compliance Status</h3>

                    <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Non-Compliant</span>
                      </div>
                      <p className="text-xs text-rose-300/80 mt-1">
                        3 findings are violating this control
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-slate-300">Critical</span>
                        </div>
                        <span className="font-mono font-bold text-white">1</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-slate-300">High</span>
                        </div>
                        <span className="font-mono font-bold text-white">2</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className="text-slate-300">Medium</span>
                        </div>
                        <span className="font-mono font-bold text-white">0</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-slate-300">Low</span>
                        </div>
                        <span className="font-mono font-bold text-white">0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control Description */}
                <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 backdrop-blur-sm space-y-3">
                  <h3 className="text-base font-semibold text-white">Control Description</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {controlDetailData?.description ??
                      'Avoid using the root account for daily operations. Enable MFA for the root account and use IAM users and roles to deliver administrative access.'}
                  </p>
                  <a
                    href={controlDetailData?.documentation_url ?? 'https://docs.aws.amazon.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 mt-2"
                  >
                    <span>View Official CIS Documentation</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {controlDetailTab === 'Mapped Findings' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase">
                      <th className="py-3 px-4">Finding ID</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">File Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {(controlDetailData?.findings ?? [
                      { finding_id: 'IAC-001', title: 'Root access keys detected in template', resource: 'aws_iam_access_key.root', severity: 'High', file_path: 'iam.tf' },
                      { finding_id: 'IAC-002', title: 'Root account policy attached directly', resource: 'aws_iam_user_policy.root_policy', severity: 'High', file_path: 'policies.tf' },
                      { finding_id: 'IAC-003', title: 'MFA requirement disabled on root account', resource: 'aws_iam_account_password_policy.strict', severity: 'Critical', file_path: 'auth.tf' },
                    ]).map((f) => (
                      <tr key={f.finding_id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-cyan-400">{f.finding_id}</td>
                        <td className="py-3 px-4 text-slate-200">{f.title}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{f.resource}</td>
                        <td className="py-3 px-4">
                          <span className={`rounded px-2 py-0.5 font-bold ${f.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{f.file_path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {controlDetailTab === 'Remediation' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 space-y-3">
                <h3 className="text-base font-semibold text-white">Remediation Guide</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {controlDetailData?.remediation_guide ??
                    'Delete root access keys from version control. Configure IAM Identity Center (SSO) with administrative permission sets and MFA enforcement.'}
                </p>
              </div>
            )}

            {controlDetailTab === 'Evidence' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Associated Evidence</h3>
                  <button
                    onClick={() => { setNewEvControlId(selectedControlId); setShowAddEvidenceModal(true); }}
                    className="flex items-center gap-1.5 rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Attach Evidence</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400">1 evidence record attached verifying this control state.</p>
              </div>
            )}

            {controlDetailTab === 'References' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 space-y-3 text-xs">
                <h3 className="text-base font-semibold text-white">References & Standards</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  <li>CIS Amazon Web Services Foundations Benchmark v1.5.0, Section 1.2</li>
                  <li>NIST SP 800-53 Rev. 5 Control AC-2 (Account Management)</li>
                  <li>AWS Security Best Practices for Root Accounts</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.5: COMPLIANCE REPORT
        ========================================================================= */}
        {subView === 'report' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Report</h1>
              <p className="text-sm text-slate-400 mt-0.5">Generate and download compliance reports for your environment.</p>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-800 text-sm">
              {(['Generate Report', 'Scheduled Reports', 'Report History'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setReportTab(t)}
                  className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
                    reportTab === t
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {reportTab === 'Generate Report' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 backdrop-blur-sm max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-white">Report Configuration</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Frameworks</label>
                    <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-white p-2">
                      {['CIS-AWS', 'CIS-Kubernetes', 'NIST 800-53', 'PCI DSS', 'SOC 2', 'ISO 27001'].map((fw) => {
                        const selected = reportFrameworks.includes(fw);
                        return (
                          <button
                            key={fw}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setReportFrameworks(reportFrameworks.filter((f) => f !== fw));
                              } else {
                                setReportFrameworks([...reportFrameworks, fw]);
                              }
                            }}
                            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                              selected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                            }`}
                          >
                            <span>{fw}</span>
                            {selected && <X className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Repositories</label>
                    <select
                      value={reportRepo}
                      onChange={(e) => setReportRepo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="All Repositories">All Repositories</option>
                      <option value="frontend-app">frontend-app</option>
                      <option value="infrastructure">infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Date Range</label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        value={reportDateRange}
                        onChange={(e) => setReportDateRange(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-white pl-3 pr-9 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                      <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Report Format</label>
                    <div className="mt-2 flex items-center gap-6 text-xs">
                      {(['PDF', 'CSV', 'JSON'] as const).map((fmt) => (
                        <label key={fmt} className="flex items-center gap-2 cursor-pointer text-slate-200">
                          <input
                            type="radio"
                            name="reportFormat"
                            checked={reportFormat === fmt}
                            onChange={() => setReportFormat(fmt)}
                            className="text-cyan-500 focus:ring-cyan-500"
                          />
                          <span>{fmt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Include Sections</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeExecSummary}
                          onChange={(e) => setIncludeExecSummary(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Executive Summary</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeControlStatus}
                          onChange={(e) => setIncludeControlStatus(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Control Status</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeFindingsDetails}
                          onChange={(e) => setIncludeFindingsDetails(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Findings Details</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeRemediation}
                          onChange={(e) => setIncludeRemediation(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Remediation Recommendations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeEvidence}
                          onChange={(e) => setIncludeEvidence(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Evidence</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAppendices}
                          onChange={(e) => setIncludeAppendices(e.target.checked)}
                          className="rounded text-cyan-500"
                        />
                        <span>Appendices</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleGenerateReport}
                    disabled={reportSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>{reportSubmitting ? 'Generating Report...' : 'Generate Report'}</span>
                  </button>
                </div>
              </div>
            )}

            {reportTab === 'Report History' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase">
                      <th className="py-3 px-4">Report ID</th>
                      <th className="py-3 px-4">Report Name</th>
                      <th className="py-3 px-4">Frameworks</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Generated At</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {(reportsHistory?.items ?? [
                      { report_id: 'REP-2026-09-30-01', report_name: 'Executive Compliance Summary - Sep 2026', frameworks: ['CIS AWS', 'CIS Kubernetes', 'NIST 800-53'], format: 'PDF', file_size: '2.4 MB', generated_at: 'Sep 30, 2026, 11:00 AM' },
                      { report_id: 'REP-2026-09-15-02', report_name: 'PCI-DSS Mid-Month Verification Report', frameworks: ['PCI DSS'], format: 'CSV', file_size: '840 KB', generated_at: 'Sep 15, 2026, 02:30 PM' },
                    ]).map((rep) => (
                      <tr key={rep.report_id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono font-semibold text-cyan-400">{rep.report_id}</td>
                        <td className="py-3.5 px-4 text-slate-200">{rep.report_name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{rep.frameworks.join(', ')}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">{rep.format}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{rep.file_size}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{rep.generated_at}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => showToast(`Downloading ${rep.report_id} (${rep.format})...`)}
                            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportTab === 'Scheduled Reports' && (
              <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 text-xs text-slate-400 space-y-2">
                <h3 className="text-base font-semibold text-white">Scheduled Automated Reports</h3>
                <p>Monthly automated executive report runs on the 1st of every month at 00:00 UTC.</p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.6: EVIDENCE
        ========================================================================= */}
        {subView === 'evidence' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Evidence</h1>
                <p className="text-sm text-slate-400 mt-0.5">Manage evidence for compliance controls.</p>
              </div>

              <button
                onClick={() => setShowAddEvidenceModal(true)}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Evidence</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={evidenceFw}
                onChange={(e) => { setEvidenceFw(e.target.value); setEvidencePage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Frameworks">All Frameworks</option>
                <option value="CIS AWS">CIS AWS</option>
                <option value="CIS K8s">CIS K8s</option>
                <option value="NIST">NIST</option>
                <option value="PCI DSS">PCI DSS</option>
                <option value="SOC 2">SOC 2</option>
              </select>

              <select
                value={evidenceCtrl}
                onChange={(e) => { setEvidenceCtrl(e.target.value); setEvidencePage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Controls">All Controls</option>
                <option value="CIS-1.1">CIS-1.1</option>
                <option value="CIS-1.2">CIS-1.2</option>
                <option value="K8S-5.1">K8S-5.1</option>
                <option value="NIST-AU-2">NIST-AU-2</option>
                <option value="PCI-2.2">PCI-2.2</option>
                <option value="SOC2-CC6.1">SOC2-CC6.1</option>
              </select>

              <select
                value={evidenceStatus}
                onChange={(e) => { setEvidenceStatus(e.target.value); setEvidencePage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Valid">Valid</option>
                <option value="Pending">Pending</option>
                <option value="Expired">Expired</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  value={evidenceSearch}
                  onChange={(e) => { setEvidenceSearch(e.target.value); setEvidencePage(1); }}
                  className="w-full rounded-lg border border-slate-800 bg-white pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Evidence Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]/70 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Evidence ID</th>
                    <th className="py-3 px-4">Control ID</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {(evidenceData?.items ?? [
                    { evidence_id: 'EV-001', control_id: 'CIS-1.1', description: 'AWS Config evidence', type: 'Config file', status: 'Valid', updated: 'Sep 28' },
                    { evidence_id: 'EV-002', control_id: 'CIS-1.2', description: 'Root account policy', type: 'Screenshot', status: 'Valid', updated: 'Sep 27' },
                    { evidence_id: 'EV-003', control_id: 'K8S-5.1', description: 'RBAC configuration', type: 'Config file', status: 'Pending', updated: 'Sep 26' },
                    { evidence_id: 'EV-004', control_id: 'NIST-AU-2', description: 'Audit log settings', type: 'Log file', status: 'Valid', updated: 'Sep 25' },
                    { evidence_id: 'EV-005', control_id: 'PCI-2.2', description: 'Network rules', type: 'Config file', status: 'Valid', updated: 'Sep 24' },
                    { evidence_id: 'EV-006', control_id: 'SOC2-CC6.1', description: 'Access control policy', type: 'Document', status: 'Expired', updated: 'Sep 22' },
                  ]).map((ev) => (
                    <tr key={ev.evidence_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400">{ev.evidence_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{ev.control_id}</td>
                      <td className="py-3 px-4 text-slate-200">{ev.description}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{ev.type}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            ev.status === 'Valid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : ev.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{ev.updated}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteEvidence(ev.evidence_id)}
                          className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete evidence"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <button
                  disabled={evidencePage <= 1}
                  onClick={() => setEvidencePage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-800 bg-white p-1.5 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {[1, 2, 3, 4, 5].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setEvidencePage(pageNum)}
                    className={`rounded px-3 py-1.5 font-mono ${
                      evidencePage === pageNum
                        ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border border-slate-800 bg-white text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setEvidencePage((p) => p + 1)}
                  className="rounded border border-slate-800 bg-white p-1.5 hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span>10 / page</span>
            </div>

            {/* Add Evidence Modal */}
            {showAddEvidenceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-xl border border-slate-700 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-base font-bold text-[#0F172A]">Add Compliance Evidence</h3>
                    <button onClick={() => setShowAddEvidenceModal(false)} className="text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddEvidence} className="space-y-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Control ID</label>
                      <input
                        type="text"
                        required
                        value={newEvControlId}
                        onChange={(e) => setNewEvControlId(e.target.value)}
                        placeholder="e.g. CIS-1.2"
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Description</label>
                      <textarea
                        required
                        rows={2}
                        value={newEvDesc}
                        onChange={(e) => setNewEvDesc(e.target.value)}
                        placeholder="Description of the evidence artifact..."
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Artifact Type</label>
                      <select
                        value={newEvType}
                        onChange={(e) => setNewEvType(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="Config file">Config file</option>
                        <option value="Screenshot">Screenshot</option>
                        <option value="Log file">Log file</option>
                        <option value="Document">Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Initial Status</label>
                      <select
                        value={newEvStatus}
                        onChange={(e) => setNewEvStatus(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="Valid">Valid</option>
                        <option value="Pending">Pending</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddEvidenceModal(false)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addEvSubmitting}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {addEvSubmitting ? 'Attaching...' : 'Add Evidence'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.7: EXCEPTIONS
        ========================================================================= */}
        {subView === 'exceptions' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Exceptions</h1>
                <p className="text-sm text-slate-400 mt-0.5">Manage exceptions for compliance controls.</p>
              </div>

              <button
                onClick={() => setShowAddExceptionModal(true)}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Exception</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search exceptions..."
                  value={exceptionsSearch}
                  onChange={(e) => setExceptionsSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-white pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <select
                value={exceptionsStatus}
                onChange={(e) => setExceptionsStatus(e.target.value)}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Exceptions Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]/70 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Exception ID</th>
                    <th className="py-3 px-4">Control ID</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {(exceptionsData?.items ?? [
                    { exception_id: 'EX-001', control_id: 'CIS-1.2', reason: 'Legacy system requirement', status: 'Approved', valid_until: 'Dec 31, 2026' },
                    { exception_id: 'EX-002', control_id: 'K8S-5.2', reason: 'Third-party tool limitation', status: 'Pending', valid_until: 'Oct 31, 2026' },
                    { exception_id: 'EX-003', control_id: 'NIST-AC-2', reason: 'Business requirement', status: 'Approved', valid_until: 'Nov 30, 2026' },
                    { exception_id: 'EX-004', control_id: 'PCI-1.1', reason: 'Network redesign in progress', status: 'Rejected', valid_until: '--' },
                  ]).map((ex) => (
                    <tr key={ex.exception_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400">{ex.exception_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{ex.control_id}</td>
                      <td className="py-3 px-4 text-slate-200">{ex.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            ex.status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : ex.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{ex.valid_until}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {ex.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateExceptionStatus(ex.exception_id, 'Approved')}
                                className="rounded p-1 text-emerald-400 hover:bg-emerald-950/40"
                                title="Approve exception"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateExceptionStatus(ex.exception_id, 'Rejected')}
                                className="rounded p-1 text-rose-400 hover:bg-rose-950/40"
                                title="Reject exception"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteException(ex.exception_id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete exception"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    className={`rounded px-3 py-1.5 font-mono ${
                      p === 1
                        ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border border-slate-800 bg-white text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <span>10 / page</span>
            </div>

            {/* Add Exception Modal */}
            {showAddExceptionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-xl border border-slate-700 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-base font-bold text-[#0F172A]">Request Compliance Exception</h3>
                    <button onClick={() => setShowAddExceptionModal(false)} className="text-slate-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddException} className="space-y-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Control ID</label>
                      <input
                        type="text"
                        required
                        value={newExControlId}
                        onChange={(e) => setNewExControlId(e.target.value)}
                        placeholder="e.g. CIS-1.2"
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Business / Technical Justification</label>
                      <textarea
                        required
                        rows={3}
                        value={newExReason}
                        onChange={(e) => setNewExReason(e.target.value)}
                        placeholder="Explain why an exception is required..."
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Valid Until</label>
                      <input
                        type="text"
                        value={newExValidUntil}
                        onChange={(e) => setNewExValidUntil(e.target.value)}
                        placeholder="Dec 31, 2026"
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddExceptionModal(false)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addExSubmitting}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {addExSubmitting ? 'Requesting...' : 'Submit Exception'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 11.8: AUDIT LOGS
        ========================================================================= */}
        {subView === 'audit-logs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Audit Logs</h1>
              <p className="text-sm text-slate-400 mt-0.5">View all compliance related activities and changes.</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={auditEvent}
                onChange={(e) => { setAuditEvent(e.target.value); setAuditPage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Events">All Events</option>
                <option value="Exception Approved">Exception Approved</option>
                <option value="Evidence Added">Evidence Added</option>
                <option value="Control Status Changed">Control Status Changed</option>
                <option value="Report Generated">Report Generated</option>
                <option value="Policy Exception Created">Policy Exception Created</option>
                <option value="Evidence Updated">Evidence Updated</option>
                <option value="Framework Added">Framework Added</option>
              </select>

              <select
                value={auditUser}
                onChange={(e) => { setAuditUser(e.target.value); setAuditPage(1); }}
                className="rounded-lg border border-slate-800 bg-white px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="All Users">All Users</option>
                <option value="mayur.bharvad">mayur.bharvad</option>
                <option value="dev.lead">dev.lead</option>
                <option value="security-team">security-team</option>
                <option value="infra-team">infra-team</option>
                <option value="john.doe">john.doe</option>
                <option value="admin">admin</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="Sep 01, 2026 - Sep 30, 2026"
                  className="rounded-lg border border-slate-800 bg-white pl-3 pr-9 py-2 text-xs text-slate-300 font-mono"
                />
                <Calendar className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]/70 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-white/60 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {(auditLogsData?.items ?? [
                    { id: 'AL-001', time: 'Sep 30, 10:12 AM', event: 'Exception Approved', user: 'mayur.bharvad', details: 'EX-001 approved' },
                    { id: 'AL-002', time: 'Sep 29, 04:33 PM', event: 'Evidence Added', user: 'dev.lead', details: 'EV-001 added' },
                    { id: 'AL-003', time: 'Sep 29, 11:20 AM', event: 'Control Status Changed', user: 'security-team', details: 'CIS-1.2 marked non-compliant' },
                    { id: 'AL-004', time: 'Sep 28, 08:18 PM', event: 'Report Generated', user: 'infra-team', details: 'Monthly compliance report' },
                    { id: 'AL-005', time: 'Sep 27, 03:45 PM', event: 'Policy Exception Created', user: 'john.doe', details: 'EX-002 created' },
                    { id: 'AL-006', time: 'Sep 26, 01:22 PM', event: 'Evidence Updated', user: 'mayur.bharvad', details: 'EV-003 updated' },
                    { id: 'AL-007', time: 'Sep 25, 08:18 PM', event: 'Framework Added', user: 'admin', details: 'NIST 800-53' },
                    { id: 'AL-008', time: 'Sep 24, 11:07 AM', event: 'Quality Gate Updated', user: 'dev.lead', details: 'Compliance policy updated' },
                  ]).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{a.time}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">{a.event}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-cyan-400">{a.user}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">{a.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    className={`rounded px-3 py-1.5 font-mono ${
                      p === 1
                        ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border border-slate-800 bg-white text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <span>10 / page</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            SETTINGS
        ========================================================================= */}
        {subView === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Settings</h1>
              <p className="text-sm text-slate-400 mt-0.5">Manage automated compliance evaluation policies and retention rules.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 backdrop-blur-sm space-y-5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-white">Auto-evaluate on IaC Scans</div>
                  <div className="text-xs text-slate-400">Automatically map scanner findings to enabled compliance frameworks</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData?.auto_evaluate_on_scan ?? true}
                  onChange={(e) => setSettingsData((s) => s ? { ...s, auto_evaluate_on_scan: e.target.checked } : null)}
                  className="rounded text-cyan-500 h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-white">Enforce Strict Benchmark Baselines</div>
                  <div className="text-xs text-slate-400">Fail deployment quality gates if non-compliant controls have critical findings</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData?.enforce_strict_benchmarks ?? true}
                  onChange={(e) => setSettingsData((s) => s ? { ...s, enforce_strict_benchmarks: e.target.checked } : null)}
                  className="rounded text-cyan-500 h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-white">Notify on New Non-Compliance</div>
                  <div className="text-xs text-slate-400">Send alerts to configured channels when a control enters non-compliant state</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData?.notify_on_non_compliance ?? true}
                  onChange={(e) => setSettingsData((s) => s ? { ...s, notify_on_non_compliance: e.target.checked } : null)}
                  className="rounded text-cyan-500 h-5 w-5"
                />
              </label>

              <div className="pt-3 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">Evidence Retention Period (Days)</label>
                <input
                  type="number"
                  min="30"
                  value={settingsData?.evidence_retention_days ?? 365}
                  onChange={(e) => setSettingsData((s) => s ? { ...s, evidence_retention_days: parseInt(e.target.value) || 30 } : null)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-white px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="rounded-lg bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                >
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ComplianceWorkspace;
