'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Rule Detail Suite
 * Section 7: Screens 7.1 through 7.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/rule-detail-suite/*
 * 
 * Screens:
 *   7.1 Rule Detail – Overview (Header, 4 KPIs, Rule Info Card, Edit Rule & Run Scan actions)
 *   7.2 Rule Definition (Details tab: Title, Description, Rationale, Impact, Recommendation, References, Labels)
 *   7.3 Rule Logic (Detection Logic AST, Framework switchers: Terraform Checkov, CloudFormation, Crossplane, Others, Non-compliant test resource)
 *   7.4 Severity & Risk (Risk details, CVSS, Risk factors checklist, 6-Month Risk Trend SVG chart)
 *   7.5 Framework Mappings (Compliance Framework Mappings table, CIS AWS, NIST 800-53, PCI DSS, ISO 27001, SOC 2, Related requirement card)
 *   7.6 Affected Resources (4 KPIs, multi-filters: Status, Env, Region, Search; Paginated table: 10 resources)
 *   7.7 Exceptions (3 KPIs, Search, + Add Exception modal, Active/Expired table, working Revoke & Edit)
 *   7.8 Rule History (Version history timeline table: v2.3.0 through v1.0.0)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Play,
  RotateCcw,
  RefreshCw,
  FileCode,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  Calendar,
  Lock,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  CheckSquare,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  RuleDetailOverviewResponse,
  RuleDefinitionResponse,
  RuleLogicResponse,
  RuleRiskDetailsResponse,
  RuleFrameworkMappingsResponse,
  AffectedResourcesPageResponse,
  RuleExceptionsPageResponse,
  RuleExceptionItem,
  RuleHistoryResponse,
} from '@/types/api/iac';

export type RuleDetailTab =
  | 'overview'
  | 'details'
  | 'logic'
  | 'risk'
  | 'mappings'
  | 'resources'
  | 'exceptions'
  | 'history';

interface RuleDetailSuiteWorkspaceProps {
  initialRuleId?: string;
  initialTab?: RuleDetailTab;
}

export const RuleDetailSuiteWorkspace: React.FC<RuleDetailSuiteWorkspaceProps> = ({
  initialRuleId = 'IAC-AWS-001',
  initialTab = 'overview',
}) => {
  // Navigation & Tab State
  const [ruleId, setRuleId] = useState<string>(initialRuleId);
  const [activeTab, setActiveTab] = useState<RuleDetailTab>(initialTab);

  // Global loading and toast notification
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 7.1 Overview State ──
  const [overviewData, setOverviewData] = useState<RuleDetailOverviewResponse | null>(null);

  // ── 7.2 Definition State ──
  const [definitionData, setDefinitionData] = useState<RuleDefinitionResponse | null>(null);

  // ── 7.3 Logic State ──
  const [logicData, setLogicData] = useState<RuleLogicResponse | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string>('terraform_checkov');
  const [copiedLogic, setCopiedLogic] = useState<boolean>(false);
  const [copiedTest, setCopiedTest] = useState<boolean>(false);

  // ── 7.4 Severity & Risk State ──
  const [riskData, setRiskData] = useState<RuleRiskDetailsResponse | null>(null);

  // ── 7.5 Framework Mappings State ──
  const [mappingsData, setMappingsData] = useState<RuleFrameworkMappingsResponse | null>(null);

  // ── 7.6 Affected Resources State ──
  const [resourcesData, setResourcesData] = useState<AffectedResourcesPageResponse | null>(null);
  const [resStatusFilter, setResStatusFilter] = useState<string>('All Statuses');
  const [resEnvFilter, setResEnvFilter] = useState<string>('All Environments');
  const [resRegionFilter, setResRegionFilter] = useState<string>('All Regions');
  const [resSearch, setResSearch] = useState<string>('');
  const [resPage, setResPage] = useState<number>(1);
  const [resPageSize, setResPageSize] = useState<number>(10);

  // ── 7.7 Exceptions State ──
  const [exceptionsData, setExceptionsData] = useState<RuleExceptionsPageResponse | null>(null);
  const [excSearch, setExcSearch] = useState<string>('');
  const [excStatusFilter, setExcStatusFilter] = useState<string>('All Statuses');
  const [isAddExceptionOpen, setIsAddExceptionOpen] = useState<boolean>(false);
  const [newResourceName, setNewResourceName] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('Oct 15, 2026');
  const [savingException, setSavingException] = useState<boolean>(false);

  // ── 7.8 Rule History State ──
  const [historyData, setHistoryData] = useState<RuleHistoryResponse | null>(null);

  // ── Scan Action State ──
  const [scanRunning, setScanRunning] = useState<boolean>(false);

  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // ── Data Fetching per Tab ──
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getOverview(ruleId);
      setOverviewData(res);
    } catch (err: any) {
      showToast(`Error loading rule overview: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  const fetchDefinition = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getDefinition(ruleId);
      setDefinitionData(res);
    } catch (err: any) {
      showToast(`Error loading definition: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  const fetchLogic = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getLogic(ruleId);
      setLogicData(res);
    } catch (err: any) {
      showToast(`Error loading logic: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  const fetchRisk = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getRisk(ruleId);
      setRiskData(res);
    } catch (err: any) {
      showToast(`Error loading risk details: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getMappings(ruleId);
      setMappingsData(res);
    } catch (err: any) {
      showToast(`Error loading framework mappings: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getResources(ruleId, {
        status: resStatusFilter === 'All Statuses' ? undefined : resStatusFilter,
        environment: resEnvFilter === 'All Environments' ? undefined : resEnvFilter,
        region: resRegionFilter === 'All Regions' ? undefined : resRegionFilter,
        search: resSearch.trim() || undefined,
        page: resPage,
        page_size: resPageSize,
      });
      setResourcesData(res);
    } catch (err: any) {
      showToast(`Error loading affected resources: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, resStatusFilter, resEnvFilter, resRegionFilter, resSearch, resPage, resPageSize, showToast]);

  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getExceptions(ruleId, {
        status: excStatusFilter === 'All Statuses' ? undefined : excStatusFilter,
        search: excSearch.trim() || undefined,
      });
      setExceptionsData(res);
    } catch (err: any) {
      showToast(`Error loading exceptions: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, excStatusFilter, excSearch, showToast]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.iac.ruleDetailSuite.getHistory(ruleId);
      setHistoryData(res);
    } catch (err: any) {
      showToast(`Error loading history: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [ruleId, showToast]);

  // Load active tab data on change
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        fetchOverview();
        break;
      case 'details':
        fetchDefinition();
        break;
      case 'logic':
        fetchLogic();
        break;
      case 'risk':
        fetchRisk();
        break;
      case 'mappings':
        fetchMappings();
        break;
      case 'resources':
        fetchResources();
        break;
      case 'exceptions':
        fetchExceptions();
        break;
      case 'history':
        fetchHistory();
        break;
    }
  }, [
    activeTab,
    fetchOverview,
    fetchDefinition,
    fetchLogic,
    fetchRisk,
    fetchMappings,
    fetchResources,
    fetchExceptions,
    fetchHistory,
  ]);

  // ── Action: Run Scan ──
  const handleRunScan = async () => {
    try {
      setScanRunning(true);
      const res = await api.iac.ruleDetailSuite.triggerScan(ruleId);
      showToast(`Scan initiated: ${res.message} (Job ${res.scan_job_id})`);
      if (activeTab === 'overview') await fetchOverview();
      if (activeTab === 'resources') await fetchResources();
    } catch (err: any) {
      showToast(`Failed to trigger scan: ${err.message || 'Network error'}`);
    } finally {
      setScanRunning(false);
    }
  };

  // ── Action: Create Exception ──
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceName || !newReason) return;
    try {
      setSavingException(true);
      await api.iac.ruleDetailSuite.createException(ruleId, {
        resource: newResourceName,
        reason: newReason,
        expires_at: newExpiresAt,
      });
      showToast(`Policy exception added for ${newResourceName}.`);
      setIsAddExceptionOpen(false);
      setNewResourceName('');
      setNewReason('');
      await fetchExceptions();
    } catch (err: any) {
      showToast(`Failed to add exception: ${err.message || 'Network error'}`);
    } finally {
      setSavingException(false);
    }
  };

  // ── Action: Revoke Exception ──
  const handleRevokeException = async (excId: string, resName: string) => {
    try {
      const res = await api.iac.ruleDetailSuite.deleteException(ruleId, excId);
      if (res.success) {
        showToast(`Exception for ${resName} revoked.`);
        await fetchExceptions();
      } else {
        showToast(`Revocation notice: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Failed to revoke exception: ${err.message || 'Network error'}`);
    }
  };

  // ── Copy snippet helpers ──
  const handleCopyLogic = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLogic(true);
    setTimeout(() => setCopiedLogic(false), 2000);
  };

  const handleCopyTest = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTest(true);
    setTimeout(() => setCopiedTest(false), 2000);
  };

  // Active logic engine selection
  const currentEngineSpec = useMemo(() => {
    if (!logicData?.engines) return null;
    return (
      logicData.engines.find((e) => e.engine_id === selectedEngine) ||
      logicData.engines[0]
    );
  }, [logicData, selectedEngine]);

  const severityBadgeClass = (sev?: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-blue-600/20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white border border-blue-200 text-slate-800 px-4 py-2.5 rounded-lg shadow-xl animate-fade-in text-sm backdrop-blur-md">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Code</span>
          <span>&gt;</span>
          <Link href="/code/iac" className="hover:text-blue-600 transition-colors">
            IaC Security
          </Link>
          <span>&gt;</span>
          <Link href="/code/iac/rules" className="hover:text-blue-600 transition-colors">
            Rules
          </Link>
          <span>&gt;</span>
          <span className="text-slate-900 font-mono font-medium">{ruleId}</span>
        </div>

        {/* Rule Master Header (Screens 7.1 - 7.8 Top Section) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  {overviewData?.rule_id || ruleId}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${severityBadgeClass(
                    overviewData?.severity || 'Critical'
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {overviewData?.severity || 'Critical'}
                </span>
              </div>
              <h2 className="text-lg font-medium text-slate-800">
                {overviewData?.rule_name || 'IaC Security Rule'}
              </h2>
              <p className="text-sm text-slate-500 max-w-3xl">
                {overviewData?.description ||
                  'Evaluates infrastructure as code templates against platform security benchmarks.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <button
                onClick={() => setActiveTab('details')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                Edit Rule
              </button>
              <button
                onClick={handleRunScan}
                disabled={scanRunning}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${scanRunning ? 'animate-pulse' : ''}`} />
                {scanRunning ? 'Scanning...' : 'Run Scan'}
              </button>
            </div>
          </div>

          {/* Sub-navigation Tabs (Screens 7.1 to 7.8) */}
          <div className="flex items-center gap-1 border-b border-slate-200 mt-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Details' },
              { id: 'logic', label: 'Logic' },
              { id: 'risk', label: 'Severity & Risk' },
              { id: 'mappings', label: 'Mappings' },
              { id: 'resources', label: 'Affected Resources' },
              { id: 'exceptions', label: 'Exceptions' },
              { id: 'history', label: 'Rule History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as RuleDetailTab)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.1: RULE DETAIL – OVERVIEW
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* 4 KPIs Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-slate-900">
                  {overviewData?.kpis.total_findings ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Total Findings</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-rose-600">
                  {overviewData?.kpis.open_findings ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Open</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-emerald-600">
                  {overviewData?.kpis.resolved_findings ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Resolved</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-sky-600">
                  {overviewData?.kpis.suppressed_findings ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Suppressed</span>
              </div>
            </div>

            {/* Rule Information Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Rule Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Rule ID</span>
                  <span className="font-mono text-slate-900 font-medium">
                    {overviewData?.rule_info.rule_id ?? ruleId}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Rule Name</span>
                  <span className="text-slate-900 text-right font-medium">
                    {overviewData?.rule_info.rule_name ?? 'IaC Rule'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Category</span>
                  <span className="text-slate-800">
                    {overviewData?.rule_info.category ?? 'Storage'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Provider</span>
                  <span className="text-slate-800 font-medium">
                    {overviewData?.rule_info.provider ?? 'AWS'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Service</span>
                  <span className="text-slate-800">
                    {overviewData?.rule_info.service ?? 'S3'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Severity</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${severityBadgeClass(
                      overviewData?.rule_info.severity ?? 'Critical'
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {overviewData?.rule_info.severity ?? 'Critical'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-800">
                    {overviewData?.rule_info.rule_type ?? 'Misconfiguration'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Frameworks</span>
                  <span className="text-slate-800">
                    {overviewData?.rule_info.frameworks?.join(', ') || 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {overviewData?.rule_info.status ?? 'Enabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="text-slate-800">
                    {overviewData?.rule_info.last_updated ?? 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 md:border-b-0">
                  <span className="text-slate-500">Version</span>
                  <span className="font-mono text-slate-800">
                    {overviewData?.rule_info.version ?? 'v1.0.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.2: RULE DEFINITION (Tab Details)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Rule Definition</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs border-b border-slate-100 pb-6">
              <span className="text-slate-500 font-medium">Title</span>
              <span className="md:col-span-3 text-slate-900 font-medium text-sm">
                {definitionData?.title || 'IaC Rule Definition'}
              </span>

              <span className="text-slate-500 font-medium">Description</span>
              <span className="md:col-span-3 text-slate-700 leading-relaxed">
                {definitionData?.description ||
                  'No description provided for this rule.'}
              </span>

              <span className="text-slate-500 font-medium">Rationale</span>
              <span className="md:col-span-3 text-slate-700 leading-relaxed">
                {definitionData?.rationale ||
                  'No rationale provided for this rule.'}
              </span>

              <span className="text-slate-500 font-medium">Impact</span>
              <span className="md:col-span-3 text-slate-700 leading-relaxed">
                {definitionData?.impact ||
                  'Potential security risk or compliance non-conformance.'}
              </span>

              <span className="text-slate-500 font-medium">Recommendation</span>
              <span className="md:col-span-3 text-slate-700 leading-relaxed">
                {definitionData?.recommendation ||
                  'Review and modify configuration templates according to secure architecture guidelines.'}
              </span>
            </div>

            {/* References Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs border-b border-slate-100 pb-6">
              <span className="text-slate-500 font-medium">References</span>
              <div className="md:col-span-3 flex flex-col gap-2">
                {definitionData?.references && definitionData.references.length > 0 ? (
                  definitionData.references.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline transition-colors w-fit"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>{ref.title}</span>
                    </a>
                  ))
                ) : (
                  <span className="text-slate-400">No external references linked.</span>
                )}
              </div>
            </div>

            {/* Labels Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs items-center">
              <span className="text-slate-500 font-medium">Labels</span>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                {definitionData?.labels && definitionData.labels.length > 0 ? (
                  definitionData.labels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium ${
                        lbl === 'critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {lbl}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 font-mono text-[11px]">No labels defined</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.3: RULE LOGIC (Tab Logic)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'logic' && (
          <div className="flex flex-col gap-6">
            {/* Detection Logic AST Editor */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Detection Logic</h3>

              {/* Engine Switcher Pills */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'terraform_checkov', label: 'Terraform (Checkov)' },
                    { id: 'cloudformation', label: 'CloudFormation' },
                    { id: 'kubernetes_crossplane', label: 'Kubernetes (Crossplane)' },
                    { id: 'others', label: 'Others' },
                  ].map((eng) => (
                    <button
                      key={eng.id}
                      onClick={() => setSelectedEngine(eng.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedEngine === eng.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">
                    YAML ▾
                  </span>
                  <button
                    onClick={() =>
                      handleCopyLogic(currentEngineSpec?.ast_code || '')
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-xs"
                  >
                    {copiedLogic ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* YAML Code Viewer */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                <pre className="text-slate-200">
                  {currentEngineSpec?.ast_code || 'Loading AST logic...'}
                </pre>
              </div>
            </div>

            {/* Test Resource (Non-compliant) Section */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Test Resource (Non-compliant)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">
                    {currentEngineSpec?.test_resource_type || 'Terraform'} ▾
                  </span>
                  <button
                    onClick={() =>
                      handleCopyTest(currentEngineSpec?.test_resource_code || '')
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-xs"
                  >
                    {copiedTest ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                <pre className="text-emerald-400">
                  {currentEngineSpec?.test_resource_code || 'Loading test resource snippet...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.4: SEVERITY & RISK
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="flex flex-col gap-6">
            {/* Severity Callout Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col gap-2 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Severity</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${severityBadgeClass(
                    riskData?.severity || 'Critical'
                  )}`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {riskData?.severity || 'Critical'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {riskData?.severity_description ||
                  'This misconfiguration can expose sensitive infrastructure resources or violate security policy.'}
              </p>
            </div>

            {/* Risk Details Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Likelihood</span>
                  <span className="font-semibold text-rose-600">
                    {riskData?.likelihood || 'High'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Impact</span>
                  <span className="font-semibold text-rose-600">
                    {riskData?.impact || 'High'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Risk Score</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {riskData?.risk_score ?? 0} / 10
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">CVSS (approx.)</span>
                  <span className="font-semibold text-rose-600">
                    {riskData?.cvss_score ?? 0} ({riskData?.cvss_rating ?? 'Unrated'})
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Data Sensitivity</span>
                  <span className="text-slate-800">
                    {riskData?.data_sensitivity || 'Standard'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Business Impact</span>
                  <span className="text-slate-800 text-right">
                    {riskData?.business_impact || 'Potential non-compliance or breach exposure'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 md:border-b-0">
                  <span className="text-slate-500">Exploitability</span>
                  <span className="text-slate-800">
                    {riskData?.exploitability || 'Standard network attack surface'}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Factors Checklist */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Factors</h3>
              <div className="flex flex-col gap-2.5">
                {riskData?.risk_factors && riskData.risk_factors.length > 0 ? (
                  riskData.risk_factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No specific risk factors cataloged.</span>
                )}
              </div>
            </div>

            {/* Risk Trend (Last 6 Months) SVG Chart */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Risk Trend (Last 6 Months)
              </h3>
              {riskData?.risk_trend && riskData.risk_trend.length > 0 ? (
                <div className="h-44 w-full flex flex-col justify-end">
                  {(() => {
                    const trend = riskData.risk_trend;
                    const maxVal = Math.max(...trend.map((t) => t.value), 10);
                    const width = 600;
                    const height = 100;
                    const step = trend.length > 1 ? (width - 100) / (trend.length - 1) : 0;
                    const points = trend.map((t, i) => {
                      const cx = 50 + i * step;
                      const cy = 10 + (1 - t.value / maxVal) * (height - 20);
                      return { cx, cy, val: t.value, month: t.month };
                    });
                    const polyPoints = [
                      `50,${height}`,
                      ...points.map((p) => `${p.cx},${p.cy}`),
                      `${50 + (trend.length - 1) * step},${height}`,
                    ].join(' ');
                    const linePoints = points.map((p) => `${p.cx},${p.cy}`).join(' ');

                    return (
                      <>
                        <svg className="w-full h-36 overflow-visible" viewBox="0 0 600 120">
                          <defs>
                            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal grid lines */}
                          <line x1="0" y1="20" x2="600" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="0" y1="60" x2="600" y2="60" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <line x1="0" y1="100" x2="600" y2="100" stroke="#CBD5E1" />

                          {/* Area fill */}
                          <polygon points={polyPoints} fill="url(#riskGrad)" />

                          {/* Line */}
                          <polyline
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="2.5"
                            points={linePoints}
                          />

                          {/* Points */}
                          {points.map((pt, i) => (
                            <g key={i}>
                              <circle cx={pt.cx} cy={pt.cy} r="4" fill="#f43f5e" />
                              <circle cx={pt.cx} cy={pt.cy} r="2" fill="#fff" />
                            </g>
                          ))}
                        </svg>

                        {/* X-axis Month Labels */}
                        <div className="flex justify-between px-6 text-[11px] text-slate-500 mt-2 font-mono">
                          {points.map((p, i) => (
                            <span key={i}>{p.month}</span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                  No historical risk trend data available for this rule.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.5: FRAMEWORK MAPPINGS (Tab Mappings)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'mappings' && (
          <div className="flex flex-col gap-6">
            {/* Compliance Framework Mappings Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Compliance Framework Mappings
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                      <th className="py-2.5 px-3 font-medium">Framework</th>
                      <th className="py-2.5 px-3 font-medium">Control ID</th>
                      <th className="py-2.5 px-3 font-medium">Control Name</th>
                      <th className="py-2.5 px-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(mappingsData?.mappings || []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-blue-600">
                          {row.framework}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800">
                          {row.control_id}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {row.control_name}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Related Framework Requirements Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Related Framework Requirements
              </h3>

              <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    {mappingsData?.related_requirement.framework ||
                      'Compliance Benchmark'}
                  </span>
                </div>
                <h4 className="text-xs font-medium text-slate-800 mt-1">
                  {mappingsData?.related_requirement.control_id} {mappingsData?.related_requirement.title || ''}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {mappingsData?.related_requirement.description ||
                    'Infrastructure configuration templates must adhere to applicable compliance requirements.'}
                </p>
                {mappingsData?.related_requirement.requirement_url && (
                  <a
                    href={mappingsData.related_requirement.requirement_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium w-fit"
                  >
                    <span>View Requirement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.6: AFFECTED RESOURCES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'resources' && (
          <div className="flex flex-col gap-6">
            {/* 4 KPIs Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-slate-900">
                  {resourcesData?.kpis.total_resources ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Total Resources</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-rose-600">
                  {resourcesData?.kpis.non_compliant ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Non-Compliant</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-emerald-600">
                  {resourcesData?.kpis.compliant ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Compliant</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-sky-600">
                  {resourcesData?.kpis.suppressed ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Suppressed</span>
              </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
              {/* Status filter */}
              <select
                value={resStatusFilter}
                onChange={(e) => setResStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Failed">Failed</option>
                <option value="Passed">Passed</option>
              </select>

              {/* Environment filter */}
              <select
                value={resEnvFilter}
                onChange={(e) => setResEnvFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All Environments">All Environments</option>
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="dev">dev</option>
                <option value="qa">qa</option>
              </select>

              {/* Region filter */}
              <select
                value={resRegionFilter}
                onChange={(e) => setResRegionFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All Regions">All Regions</option>
                <option value="ap-south-1">ap-south-1</option>
                <option value="us-east-1">us-east-1</option>
                <option value="us-west-2">us-west-2</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={resSearch}
                  onChange={(e) => setResSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Paginated Resources Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-medium">Resource</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Environment</th>
                      <th className="py-3 px-4 font-medium">Region</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(resourcesData?.items || []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-blue-600 font-medium">
                          {row.resource}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {row.resource_type}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans">
                          {row.environment}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.region}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              row.status === 'Failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-sans">
                          {row.last_seen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => setResPage(p)}
                      className={`w-7 h-7 rounded flex items-center justify-center font-mono ${
                        resPage === p
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setResPage((prev) => Math.min(5, prev + 1))}
                    className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
                  >
                    &gt;
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span>10 / page ▾</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.7: EXCEPTIONS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'exceptions' && (
          <div className="flex flex-col gap-6">
            {/* 3 KPIs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-slate-900">
                  {exceptionsData?.kpis.active_exceptions ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Active Exceptions</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-rose-600">
                  {exceptionsData?.kpis.expired ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Expired</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-2xl font-bold text-slate-700">
                  {exceptionsData?.kpis.pending_review ?? 0}
                </span>
                <span className="text-xs text-slate-500 mt-1">Pending Review</span>
              </div>
            </div>

            {/* Filter Bar & Add Exception */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search exceptions..."
                  value={excSearch}
                  onChange={(e) => setExcSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => setIsAddExceptionOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Exception
              </button>
            </div>

            {/* Exceptions Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Resource</th>
                    <th className="py-3 px-4 font-medium">Reason</th>
                    <th className="py-3 px-4 font-medium">Expires At</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(exceptionsData?.items || []).map((exc) => (
                    <tr key={exc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-blue-600 font-medium">
                        {exc.resource}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {exc.reason}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {exc.expires_at}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            exc.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {exc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setNewResourceName(exc.resource);
                              setNewReason(exc.reason);
                              setNewExpiresAt(exc.expires_at);
                              setIsAddExceptionOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeException(exc.id, exc.resource)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Revoke Exception"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal: Add Exception */}
            {isAddExceptionOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900">Add Policy Exception</h3>
                    <button
                      onClick={() => setIsAddExceptionOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateException} className="flex flex-col gap-4 mt-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Resource Identifier
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. logs-bucket, website-content"
                        value={newResourceName}
                        onChange={(e) => setNewResourceName(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Reason & Justification
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Explain why public access or exception is required..."
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Expires At
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Oct 15, 2026"
                        value={newExpiresAt}
                        onChange={(e) => setNewExpiresAt(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsAddExceptionOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingException}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {savingException ? 'Saving...' : 'Save Exception'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCREEN 7.8: RULE HISTORY
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Rule History</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-3 font-medium">Version</th>
                    <th className="py-2.5 px-3 font-medium">Date</th>
                    <th className="py-2.5 px-3 font-medium">Changes</th>
                    <th className="py-2.5 px-3 font-medium text-right">Updated By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(historyData?.items || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-blue-600">
                        {row.version}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-sans">
                        {row.date}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-sans max-w-md">
                        {row.changes}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {row.updated_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RuleDetailSuiteWorkspace;
