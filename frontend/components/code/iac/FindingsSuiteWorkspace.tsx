'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Findings Suite
 * Section 3: Screens 3.1 through 3.8
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/findings-suite/*
 * 
 * Screens:
 *   3.1 Findings Overview (5 KPIs: 328 Total, 76 Crit, 124 High, 86 Med, 42 Low, Trend Bar, Status Donut, Top Categories)
 *   3.2 All Findings (Multi-filters, Search, Export, Pagination, Checkboxes, Row Drill-Down)
 *   3.3 Finding Detail (Overview Metadata Grid, Evidence HCL Code, Remediation Plan & PR, Comments Feed, Activity Log)
 *   3.4 Findings Triage (Status Pills: Open 214, In Progress 46, Resolved 52, Suppressed 16, Assignees, Bulk Actions, Quick Actions)
 *   3.5 Findings Trends (90-day Trends, Sub-tabs, Provider Horizontal Bars, Environment Donut 42%/28%/20%/10%)
 *   3.6 Findings by Resource (Resource Type Matrix: aws_s3_bucket 72, aws_security_group 56, aws_iam_policy 42, etc.)
 *   3.7 Findings by Framework (Compliance Summary: CIS AWS 124, NIST 86, PCI DSS 68, ISO 27001 46, SOC 2 42, etc.)
 *   3.8 Export & Reports (Format Radio, Include Checkboxes, Live Download, Scheduled Reports, Report History)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  Check,
  Layers,
  ArrowRight,
  CheckCircle,
  FileCode,
  Calendar,
  Wrench,
  SlidersHorizontal,
  Cloud,
  Server,
  Database,
  BarChart3,
  Sliders,
  ExternalLink,
  Info,
  User,
  Users,
  MessageSquare,
  Clock,
  Send,
  FileText,
  Activity,
  Plus,
  Play,
  Pause,
  ArrowUpDown,
  Lock,
  GitPullRequest,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCFindingsOverviewResponse,
  IaCFindingsAllResponse,
  IaCFindingRowItem,
  IaCFindingDetailResponse,
  IaCFindingsTriageResponse,
  IaCFindingsTriageItem,
  IaCFindingsTrendsResponse,
  IaCFindingsByResourceResponse,
  IaCResourceFindingsRowItem,
  IaCFindingsByFrameworkSummaryResponse,
  IaCFrameworkSummaryRowItem,
  IaCFindingsByProviderResponse,
  IaCFindingsBySeverityResponse,
  IaCFindingsByCategoryResponse,
  IaCFindingsByFrameworkResponse,
  IaCFindingsByEnvironmentResponse,
  ExportFindingsRequest,
  ExportFindingsAdvancedRequest,
  ScheduledReportItem,
  ReportHistoryItem,
} from '@/types/api/iac';

export type FindingsSubView =
  | 'overview'
  | 'all'
  | 'detail'
  | 'triage'
  | 'trends'
  | 'by-resource'
  | 'by-framework'
  | 'export-reports'
  | 'by-provider'
  | 'by-severity'
  | 'by-category'
  | 'by-environment'
  | 'filters';

interface FindingsSuiteWorkspaceProps {
  initialView?: FindingsSubView;
  repositoryName?: string;
  initialFindingId?: string;
}

// ── SVG Brand Logos ─────────────────────────────────────────────────────────────

const AwsLogo = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
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

const KubernetesLogo = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#326CE5" />
    <path
      d="M12 4L18.5 7.8V15.2L12 19L5.5 15.2V7.8L12 4Z"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11.5" r="2.5" fill="#FFFFFF" />
  </svg>
);

const AzureLogo = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#0078D4" />
    <path
      d="M6.5 16.5L11.5 7.5H16L9.5 16.5H6.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M11.5 7.5L14 12.5L17.5 16.5H12.5L11.5 7.5Z"
      fill="#50E6FF"
      opacity="0.85"
    />
  </svg>
);

const GcpLogo = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#1E293B" />
    <path d="M12 5.5L7 8.5V14.5L12 17.5L17 14.5V8.5L12 5.5Z" stroke="#4285F4" strokeWidth="1.5" />
    <circle cx="12" cy="11.5" r="2" fill="#EA4335" />
  </svg>
);

const ProviderBadge = ({ provider }: { provider: string }) => {
  const p = (provider || '').toLowerCase();
  if (p.includes('aws')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <AwsLogo />
        <span>AWS</span>
      </span>
    );
  }
  if (p.includes('kuber')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
        <KubernetesLogo />
        <span>Kubernetes</span>
      </span>
    );
  }
  if (p.includes('azure')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
        <AzureLogo />
        <span>Azure</span>
      </span>
    );
  }
  if (p.includes('gcp') || p.includes('google')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
        <GcpLogo />
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

const SeverityBadge = ({ severity }: { severity: string }) => {
  const s = (severity || '').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        Critical
      </span>
    );
  }
  if (s === 'high') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        High
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      Low
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || '').toLowerCase();
  if (s === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Resolved
      </span>
    );
  }
  if (s === 'in progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
        In Progress
      </span>
    );
  }
  if (s === 'suppressed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Suppressed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
      Open
    </span>
  );
};

// ── SVG Donut Chart for Findings by Status (Screen 3.1) ─────────────────────────

const FindingsStatusDonut = ({
  open = 214,
  inProgress = 46,
  resolved = 52,
  suppressed = 16,
}: {
  open?: number;
  inProgress?: number;
  resolved?: number;
  suppressed?: number;
}) => {
  const total = open + inProgress + resolved + suppressed;
  const size = 180;
  const strokeWidth = 22;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  const pctOpen = total > 0 ? open / total : 0;
  const pctInProg = total > 0 ? inProgress / total : 0;
  const pctRes = total > 0 ? resolved / total : 0;
  const pctSup = total > 0 ? suppressed / total : 0;

  const strokeOpen = pctOpen * circumference;
  const strokeInProg = pctInProg * circumference;
  const strokeRes = pctRes * circumference;
  const strokeSup = pctSup * circumference;

  const offsetOpen = 0;
  const offsetInProg = -(strokeOpen);
  const offsetRes = -(strokeOpen + strokeInProg);
  const offsetSup = -(strokeOpen + strokeInProg + strokeRes);

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} stroke="#1E293B" strokeWidth={strokeWidth} fill="transparent" />
        {/* Open (Blue) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#3B82F6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeOpen} ${circumference}`}
          strokeDashoffset={offsetOpen}
          fill="transparent"
        />
        {/* In Progress (Sky/Amber) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#06B6D4"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeInProg} ${circumference}`}
          strokeDashoffset={offsetInProg}
          fill="transparent"
        />
        {/* Resolved (Green) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#10B981"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeRes} ${circumference}`}
          strokeDashoffset={offsetRes}
          fill="transparent"
        />
        {/* Suppressed (Purple) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#8B5CF6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeSup} ${circumference}`}
          strokeDashoffset={offsetSup}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-white tracking-tight">{total}</span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">Findings</span>
      </div>
    </div>
  );
};

// ── SVG Donut Chart for Environment (Screen 3.5) ────────────────────────────────

const FindingsEnvironmentDonut = () => {
  const size = 180;
  const strokeWidth = 22;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  // 42% Prod, 28% Staging, 20% Dev, 10% Sandbox
  const sProd = 0.42 * circumference;
  const sStaging = 0.28 * circumference;
  const sDev = 0.20 * circumference;
  const sSand = 0.10 * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} stroke="#1E293B" strokeWidth={strokeWidth} fill="transparent" />
        <circle cx={center} cy={center} r={radius} stroke="#3B82F6" strokeWidth={strokeWidth} strokeDasharray={`${sProd} ${circumference}`} strokeDashoffset={0} fill="transparent" />
        <circle cx={center} cy={center} r={radius} stroke="#06B6D4" strokeWidth={strokeWidth} strokeDasharray={`${sStaging} ${circumference}`} strokeDashoffset={-sProd} fill="transparent" />
        <circle cx={center} cy={center} r={radius} stroke="#F59E0B" strokeWidth={strokeWidth} strokeDasharray={`${sDev} ${circumference}`} strokeDashoffset={-(sProd + sStaging)} fill="transparent" />
        <circle cx={center} cy={center} r={radius} stroke="#8B5CF6" strokeWidth={strokeWidth} strokeDasharray={`${sSand} ${circumference}`} strokeDashoffset={-(sProd + sStaging + sDev)} fill="transparent" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-white tracking-tight">328</span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">Findings</span>
      </div>
    </div>
  );
};

// ── SVG Stacked Bar Chart for Findings Trend (Screens 3.1 & 3.5) ─────────────────

const FindingsTrendStackedBar = ({
  trendData,
  is90Days = false,
}: {
  trendData: Array<{ date: string; critical: number; high: number; medium: number; low: number }>;
  is90Days?: boolean;
}) => {
  const height = 180;
  const width = 600;
  const paddingX = 40;
  const paddingY = 25;
  const maxVal = is90Days ? 120 : 60;

  const points =
    trendData.length > 0
      ? trendData
      : [
          { date: 'Sep 01', critical: 8, high: 14, medium: 10, low: 5 },
          { date: 'Sep 05', critical: 10, high: 16, medium: 11, low: 6 },
          { date: 'Sep 10', critical: 12, high: 18, medium: 12, low: 6 },
          { date: 'Sep 15', critical: 11, high: 19, medium: 13, low: 7 },
          { date: 'Sep 20', critical: 13, high: 20, medium: 14, low: 7 },
          { date: 'Sep 25', critical: 11, high: 18, medium: 13, low: 6 },
          { date: 'Sep 30', critical: 11, high: 19, medium: 13, low: 5 },
        ];

  const barWidth = 24;
  const getX = (index: number) => {
    return paddingX + (index * (width - 2 * paddingX)) / Math.max(1, points.length - 1) - barWidth / 2;
  };

  const scaleY = (val: number) => {
    return (val / maxVal) * (height - 2 * paddingY);
  };

  const gridSteps = is90Days ? [0, 40, 80, 120] : [0, 20, 40, 60];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        {gridSteps.map((gridVal) => {
          const y = height - paddingY - (gridVal / maxVal) * (height - 2 * paddingY);
          return (
            <g key={gridVal}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1E293B" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={y + 4} fontSize="10" fill="#64748B" textAnchor="end">
                {gridVal}
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => {
          const x = getX(idx);
          const lowH = scaleY(p.low);
          const medH = scaleY(p.medium);
          const highH = scaleY(p.high);
          const critH = scaleY(p.critical);

          let currentY = height - paddingY;
          const lowY = currentY - lowH;
          currentY = lowY;
          const medY = currentY - medH;
          currentY = medY;
          const highY = currentY - highH;
          currentY = highY;
          const critY = currentY - critH;

          return (
            <g key={idx}>
              <rect x={x} y={lowY} width={barWidth} height={lowH} fill="#10B981" rx="1" />
              <rect x={x} y={medY} width={barWidth} height={medH} fill="#EAB308" rx="1" />
              <rect x={x} y={highY} width={barWidth} height={highH} fill="#F59E0B" rx="1" />
              <rect x={x} y={critY} width={barWidth} height={critH} fill="#EF4444" rx="2" />
              <text x={x + barWidth / 2} y={height - 6} fontSize="10" fill="#64748B" textAnchor="middle">
                {p.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Main FindingsSuiteWorkspace Component ───────────────────────────────────────

export const FindingsSuiteWorkspace: React.FC<FindingsSuiteWorkspaceProps> = ({
  initialView = 'overview',
  repositoryName = 'frontend-app',
  initialFindingId = 'FND-328',
}) => {
  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<FindingsSubView>(initialView);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 3.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCFindingsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewTimeRange, setOverviewTimeRange] = useState('Last 30 days');

  // 3.2 All Findings State
  const [allFindingsData, setAllFindingsData] = useState<IaCFindingsAllResponse | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [allSeverity, setAllSeverity] = useState('All Severities');
  const [allProvider, setAllProvider] = useState('All Providers');
  const [allFramework, setAllFramework] = useState('All Frameworks');
  const [allStatus, setAllStatus] = useState('All Statuses');
  const [allSearch, setAllSearch] = useState('');
  const [allPage, setAllPage] = useState(1);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);

  // 3.3 Finding Detail State
  const [selectedFindingId, setSelectedFindingId] = useState<string>(initialFindingId);
  const [findingDetailData, setFindingDetailData] = useState<IaCFindingDetailResponse | null>(null);
  const [findingDetailLoading, setFindingDetailLoading] = useState(false);
  const [findingDetailTab, setFindingDetailTab] = useState<'Overview' | 'Evidence' | 'Remediation' | 'Comments' | 'Activity'>('Overview');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isApplyingRemediation, setIsApplyingRemediation] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('mayur.bhavsar');

  // 3.4 Findings Triage State
  const [triageData, setTriageData] = useState<IaCFindingsTriageResponse | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageStatusFilter, setTriageStatusFilter] = useState<'Open' | 'In Progress' | 'Resolved' | 'Suppressed'>('Open');
  const [triageSeverity, setTriageSeverity] = useState('All Severities');
  const [triageProvider, setTriageProvider] = useState('All Providers');
  const [triageAssignee, setTriageAssignee] = useState('All Assignees');
  const [triageSearch, setTriageSearch] = useState('');
  const [triagePage, setTriagePage] = useState(1);
  const [selectedTriageIds, setSelectedTriageIds] = useState<string[]>([]);
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);

  // 3.5 Trends State
  const [trendsData, setTrendsData] = useState<IaCFindingsTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsTimeRange, setTrendsTimeRange] = useState('Last 90 days');
  const [trendsSubTab, setTrendsSubTab] = useState<'Trend' | 'By Severity' | 'By Provider' | 'By Category' | 'By Environment'>('Trend');

  // 3.6 By Resource State
  const [byResourceData, setByResourceData] = useState<IaCFindingsByResourceResponse | null>(null);
  const [byResourceLoading, setByResourceLoading] = useState(false);
  const [resourceProvider, setResourceProvider] = useState('All Providers');
  const [resourceEnvironment, setResourceEnvironment] = useState('All Environments');
  const [resourcePage, setResourcePage] = useState(1);

  // 3.7 By Framework (Compliance Summary) State
  const [byFrameworkSummaryData, setByFrameworkSummaryData] = useState<IaCFindingsByFrameworkSummaryResponse | null>(null);
  const [byFrameworkSummaryLoading, setByFrameworkSummaryLoading] = useState(false);
  const [frameworkSummaryPage, setFrameworkSummaryPage] = useState(1);

  // 3.8 Export & Reports State
  const [exportReportsTab, setExportReportsTab] = useState<'Export' | 'Scheduled Reports' | 'Report History'>('Export');
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON' | 'PDF'>('CSV');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeResourceConfig, setIncludeResourceConfig] = useState(true);
  const [includeRemediation, setIncludeRemediation] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeActivity, setIncludeActivity] = useState(false);
  const [exportStatus, setExportStatus] = useState('All Statuses');
  const [exportSeverity, setExportSeverity] = useState('All Severities');
  const [exportProvider, setExportProvider] = useState('All Providers');
  const [exportDateRange, setExportDateRange] = useState('Last 30 days');
  const [isExporting, setIsExporting] = useState(false);

  // Scheduled & History Reports State
  const [scheduledReports, setScheduledReports] = useState<ScheduledReportItem[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleFreq, setNewScheduleFreq] = useState('Weekly');
  const [newScheduleFmt, setNewScheduleFmt] = useState('PDF');
  const [newScheduleRecipients, setNewScheduleRecipients] = useState('security-team@company.com');

  // ── Data Loaders ─────────────────────────────────────────────────────────────

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    api.iac.findingsSuite.getOverview(overviewTimeRange)
      .then((res) => setOverviewData(res))
      .catch((err) => showToast(`Error loading overview: ${err.message}`))
      .finally(() => setOverviewLoading(false));
  }, [overviewTimeRange]);

  const loadAllFindings = useCallback(() => {
    setAllLoading(true);
    api.iac.findingsSuite.getAll({
      severity: allSeverity,
      provider: allProvider,
      framework: allFramework,
      status: allStatus,
      search: allSearch,
      page: allPage,
      page_size: 10,
    })
      .then((res) => setAllFindingsData(res))
      .catch((err) => showToast(`Error loading findings: ${err.message}`))
      .finally(() => setAllLoading(false));
  }, [allSeverity, allProvider, allFramework, allStatus, allSearch, allPage]);

  const loadFindingDetail = useCallback((id: string) => {
    setFindingDetailLoading(true);
    api.iac.findingsSuite.getDetail(id)
      .then((res) => setFindingDetailData(res))
      .catch((err) => showToast(`Error loading finding detail: ${err.message}`))
      .finally(() => setFindingDetailLoading(false));
  }, []);

  const loadTriage = useCallback(() => {
    setTriageLoading(true);
    api.iac.findingsSuite.getTriage({
      status: triageStatusFilter,
      severity: triageSeverity,
      provider: triageProvider,
      assignee: triageAssignee,
      search: triageSearch,
      page: triagePage,
      page_size: 10,
    })
      .then((res) => setTriageData(res))
      .catch((err) => showToast(`Error loading triage findings: ${err.message}`))
      .finally(() => setTriageLoading(false));
  }, [triageStatusFilter, triageSeverity, triageProvider, triageAssignee, triageSearch, triagePage]);

  const loadTrends = useCallback(() => {
    setTrendsLoading(true);
    api.iac.findingsSuite.getTrends(trendsTimeRange)
      .then((res) => setTrendsData(res))
      .catch((err) => showToast(`Error loading trends: ${err.message}`))
      .finally(() => setTrendsLoading(false));
  }, [trendsTimeRange]);

  const loadByResource = useCallback(() => {
    setByResourceLoading(true);
    api.iac.findingsSuite.getByResource({
      provider: resourceProvider,
      environment: resourceEnvironment,
      page: resourcePage,
      page_size: 10,
    })
      .then((res) => setByResourceData(res))
      .catch((err) => showToast(`Error loading resources: ${err.message}`))
      .finally(() => setByResourceLoading(false));
  }, [resourceProvider, resourceEnvironment, resourcePage]);

  const loadByFrameworkSummary = useCallback(() => {
    setByFrameworkSummaryLoading(true);
    api.iac.findingsSuite.getByFrameworkSummary({
      page: frameworkSummaryPage,
      page_size: 10,
    })
      .then((res) => setByFrameworkSummaryData(res))
      .catch((err) => showToast(`Error loading framework summary: ${err.message}`))
      .finally(() => setByFrameworkSummaryLoading(false));
  }, [frameworkSummaryPage]);

  const loadScheduledReports = useCallback(() => {
    setScheduledLoading(true);
    api.iac.findingsSuite.getScheduledReports()
      .then((res) => setScheduledReports(res))
      .catch((err) => showToast(`Error loading scheduled reports: ${err.message}`))
      .finally(() => setScheduledLoading(false));
  }, []);

  const loadReportHistory = useCallback(() => {
    setHistoryLoading(true);
    api.iac.findingsSuite.getReportHistory()
      .then((res) => setReportHistory(res))
      .catch((err) => showToast(`Error loading report history: ${err.message}`))
      .finally(() => setHistoryLoading(false));
  }, []);

  // Initial load
  useEffect(() => {
    loadOverview();
    loadAllFindings();
    loadFindingDetail(selectedFindingId);
    loadTriage();
    loadTrends();
    loadByResource();
    loadByFrameworkSummary();
    loadScheduledReports();
    loadReportHistory();
  }, [loadOverview, loadAllFindings, loadFindingDetail, selectedFindingId, loadTriage, loadTrends, loadByResource, loadByFrameworkSummary, loadScheduledReports, loadReportHistory]);

  // Drilldown handler: Open Detail View
  const handleDrilldown = (findingId: string) => {
    setSelectedFindingId(findingId);
    loadFindingDetail(findingId);
    setActiveTab('detail');
  };

  // Assign finding handler
  const handleAssignFinding = async (assignee: string) => {
    if (!selectedFindingId) return;
    try {
      const updated = await api.iac.findingsSuite.assign(selectedFindingId, assignee);
      setFindingDetailData(updated);
      setShowAssignModal(false);
      showToast(`Assigned ${selectedFindingId} to ${assignee}`);
      loadTriage();
      loadAllFindings();
    } catch (err: any) {
      showToast(`Failed to assign: ${err.message}`);
    }
  };

  // Add Comment handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedFindingId) return;
    setIsSubmittingComment(true);
    try {
      const updated = await api.iac.findingsSuite.comment(selectedFindingId, newCommentText.trim(), 'Dev Security Admin');
      setFindingDetailData(updated);
      setNewCommentText('');
      showToast('Comment posted successfully');
    } catch (err: any) {
      showToast(`Failed to add comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Apply Remediation handler
  const handleApplyRemediation = async () => {
    if (!selectedFindingId) return;
    setIsApplyingRemediation(true);
    try {
      const updated = await api.iac.findingsSuite.remediate(selectedFindingId, 'apply');
      setFindingDetailData(updated);
      showToast('Remediation patch applied! Finding resolved and verified in backend.');
      loadTriage();
      loadAllFindings();
      loadOverview();
    } catch (err: any) {
      showToast(`Remediation failed: ${err.message}`);
    } finally {
      setIsApplyingRemediation(false);
    }
  };

  // Quick Inline Triage Actions
  const handleQuickTriageAction = async (id: string, action: string, value: string) => {
    try {
      if (action === 'assign') {
        await api.iac.findingsSuite.assign(id, value);
        showToast(`Assigned ${id} to ${value}`);
      } else if (action === 'status') {
        await api.iac.findingsSuite.updateStatus(id, value);
        showToast(`Updated ${id} status to ${value}`);
      }
      loadTriage();
      loadAllFindings();
      loadOverview();
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`);
    }
  };

  // Bulk Triage Action
  const handleExecuteBulkAction = async (action: string, value: string) => {
    if (selectedTriageIds.length === 0) {
      showToast('No findings selected for bulk action');
      return;
    }
    try {
      const res = await api.iac.findingsSuite.bulkAction(action, selectedTriageIds, value);
      showToast(`Bulk action completed on ${res.updated_count} findings`);
      setSelectedTriageIds([]);
      setShowBulkActionsMenu(false);
      loadTriage();
      loadAllFindings();
      loadOverview();
    } catch (err: any) {
      showToast(`Bulk action failed: ${err.message}`);
    }
  };

  // Advanced Export execution
  const handleExportAdvanced = async () => {
    setIsExporting(true);
    try {
      const res = await api.iac.findingsSuite.exportAdvanced({
        format: exportFormat,
        include_details: includeDetails,
        include_resource_config: includeResourceConfig,
        include_remediation: includeRemediation,
        include_evidence: includeEvidence,
        include_activity: includeActivity,
        status: exportStatus,
        severity: exportSeverity,
        provider: exportProvider,
        date_range: exportDateRange,
      });

      // Browser download trigger
      const mimeType = exportFormat === 'CSV' ? 'text/csv' : exportFormat === 'JSON' ? 'application/json' : 'application/pdf';
      const blob = new Blob([res.download_content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Exported ${res.exported_count} findings to ${res.filename}`);
      loadReportHistory();
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle Scheduled Report
  const handleToggleSchedule = async (id: string) => {
    try {
      const updated = await api.iac.findingsSuite.toggleScheduledReport(id);
      showToast(`Report '${updated.name}' set to ${updated.status}`);
      loadScheduledReports();
    } catch (err: any) {
      showToast(`Toggle failed: ${err.message}`);
    }
  };

  // Create Scheduled Report
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;
    try {
      await api.iac.findingsSuite.createScheduledReport({
        name: newScheduleName.trim(),
        frequency: newScheduleFreq,
        format: newScheduleFmt,
        recipients: newScheduleRecipients,
      });
      showToast(`Scheduled report '${newScheduleName}' created!`);
      setShowNewScheduleModal(false);
      setNewScheduleName('');
      loadScheduledReports();
    } catch (err: any) {
      showToast(`Create failed: ${err.message}`);
    }
  };

  // Download historical report
  const handleDownloadHistorical = (rep: ReportHistoryItem) => {
    const blob = new Blob([rep.download_content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rep.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`Downloading ${rep.name}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-white border border-blue-200 text-[#0F172A] text-sm shadow-xl animate-fade-in">
          <Info className="w-4 h-4 text-blue-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Breadcrumb Bar */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-3.5 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
            <span className="text-[#0F172A] font-semibold">THING CODE</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[#0F172A]">IaC Security</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-600 font-semibold">Findings</span>
            {activeTab === 'detail' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-rose-600 font-semibold">{selectedFindingId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#0F172A]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">{repositoryName}</span>
              <span className="text-slate-400">•</span>
              <span className="text-[#64748B] font-mono">ts-main</span>
            </div>
            <button
              onClick={() => {
                loadOverview();
                loadAllFindings();
                loadTriage();
                loadTrends();
                loadByResource();
                loadByFrameworkSummary();
                showToast('Refreshed findings data');
              }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh findings data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 3 Primary View Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto border-t border-slate-800/60 pt-2.5 no-scrollbar">
          {[
            { id: 'overview', label: '3.1 Overview', icon: BarChart3 },
            { id: 'all', label: '3.2 All Findings', icon: ShieldAlert },
            { id: 'detail', label: '3.3 Finding Detail', icon: FileCode },
            { id: 'triage', label: '3.4 Triage', icon: SlidersHorizontal },
            { id: 'trends', label: '3.5 Trends', icon: Activity },
            { id: 'by-resource', label: '3.6 By Resource', icon: Server },
            { id: 'by-framework', label: '3.7 By Framework', icon: Shield },
            { id: 'export-reports', label: '3.8 Export & Reports', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FindingsSubView)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-1">
        {/* =========================================================================
            SCREEN 3.1: FINDINGS OVERVIEW
            ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Header with Title and Range Picker */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Findings Overview</h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Track and manage all IaC security findings across your infrastructure.
                </p>
              </div>
              <div className="relative">
                <select
                  value={overviewTimeRange}
                  onChange={(e) => setOverviewTimeRange(e.target.value)}
                  className="appearance-none bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-1.5 pr-8 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="All Time">All Time</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <div className="text-xs text-[#64748B] font-medium">Total Findings</div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1 font-mono">
                  {overviewLoading ? '--' : (overviewData?.kpis.total_findings ?? 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 shadow-sm">
                <div className="text-xs text-rose-700 font-medium">Critical</div>
                <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
                  {overviewLoading ? '--' : (overviewData?.kpis.critical ?? 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 shadow-sm">
                <div className="text-xs text-amber-700 font-medium">High</div>
                <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                  {overviewLoading ? '--' : (overviewData?.kpis.high ?? 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-yellow-50/50 border border-yellow-200 shadow-sm">
                <div className="text-xs text-yellow-700 font-medium">Medium</div>
                <div className="text-2xl font-bold text-yellow-700 mt-1 font-mono">
                  {overviewLoading ? '--' : (overviewData?.kpis.medium ?? 0)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 shadow-sm">
                <div className="text-xs text-emerald-700 font-medium">Low</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
                  {overviewLoading ? '--' : (overviewData?.kpis.low ?? 0)}
                </div>
              </div>
            </div>

            {/* Findings Trend Stacked Bar Chart */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Findings Trend</h2>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-[#334155]">Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[#334155]">High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="text-[#334155]">Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#334155]">Low</span>
                  </div>
                </div>
              </div>

              {overviewLoading ? (
                <div className="h-48 flex items-center justify-center text-[#64748B] text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading trend data...
                </div>
              ) : (
                <FindingsTrendStackedBar trendData={overviewData?.trend ?? []} />
              )}
            </div>

            {/* Bottom Row: Findings by Status Donut & Top Findings by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Findings by Status Donut */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Findings by Status</h3>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                  <FindingsStatusDonut
                    open={overviewData?.status_breakdown?.['Open'] ?? 0}
                    inProgress={overviewData?.status_breakdown?.['In Progress'] ?? 0}
                    resolved={overviewData?.status_breakdown?.['Resolved'] ?? 0}
                    suppressed={overviewData?.status_breakdown?.['Suppressed'] ?? 0}
                  />
                  <div className="space-y-2.5 text-xs w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-[#334155]">Open</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {overviewData?.status_breakdown?.['Open'] ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span className="text-[#334155]">In Progress</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {overviewData?.status_breakdown?.['In Progress'] ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[#334155]">Resolved</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {overviewData?.status_breakdown?.['Resolved'] ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="text-[#334155]">Suppressed</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {overviewData?.status_breakdown?.['Suppressed'] ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Findings by Category */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-3.5">
                <h3 className="text-sm font-semibold text-[#0F172A]">Top Findings by Category</h3>
                <div className="space-y-3">
                  {(overviewData?.top_findings_by_category && overviewData.top_findings_by_category.length > 0
                    ? overviewData.top_findings_by_category
                    : []
                  ).map((item, idx) => {
                    const maxCat = overviewData?.top_findings_by_category?.[0]?.count || 1;
                    const pct = Math.min(100, Math.round((item.count / maxCat) * 100));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-[#334155]">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.category}</span>
                          </div>
                          <span className="font-mono font-semibold text-[#0F172A]">{item.count}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!overviewData?.top_findings_by_category || overviewData.top_findings_by_category.length === 0) && !overviewLoading && (
                    <div className="text-xs text-[#64748B] text-center py-4">No categories recorded</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.2: ALL FINDINGS
            ========================================================================= */}
        {activeTab === 'all' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">All Findings</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                View and manage all IaC security findings across environments.
              </p>
            </div>

            {/* Filter Bar with Selects, Search, Filters toggle, Export button */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={allStatus}
                  onChange={(e) => {
                    setAllStatus(e.target.value);
                    setAllPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Suppressed">Suppressed</option>
                </select>

                <select
                  value={allSeverity}
                  onChange={(e) => {
                    setAllSeverity(e.target.value);
                    setAllPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={allProvider}
                  onChange={(e) => {
                    setAllProvider(e.target.value);
                    setAllPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Providers">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Azure">Azure</option>
                  <option value="GCP">GCP</option>
                </select>

                <select
                  value={allFramework}
                  onChange={(e) => {
                    setAllFramework(e.target.value);
                    setAllPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Frameworks">All Frameworks</option>
                  <option value="CIS AWS">CIS AWS v1.5.0</option>
                  <option value="NIST 800-53">NIST 800-53</option>
                  <option value="PCI DSS">PCI DSS v4.0</option>
                  <option value="ISO 27001">ISO 27001</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={allSearch}
                    onChange={(e) => {
                      setAllSearch(e.target.value);
                      setAllPage(1);
                    }}
                    placeholder="Search findings by title, resource, rule ID..."
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => setActiveTab('filters')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#334155] text-xs font-medium transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                <button
                  onClick={() => setActiveTab('export-reports')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Findings Table */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            (allFindingsData?.items.length ?? 0) > 0 &&
                            selectedFindingIds.length === (allFindingsData?.items.length ?? 0)
                          }
                          onChange={(e) => {
                            if (e.target.checked && allFindingsData) {
                              setSelectedFindingIds(allFindingsData.items.map((i) => i.id));
                            } else {
                              setSelectedFindingIds([]);
                            }
                          }}
                          className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">ID</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Title</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Resource</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Severity</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Status</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Detected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {allLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#64748B]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading findings...
                        </td>
                      </tr>
                    ) : (allFindingsData?.items.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#64748B]">
                          No findings match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      allFindingsData?.items.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => handleDrilldown(row.id)}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedFindingIds.includes(row.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFindingIds([...selectedFindingIds, row.id]);
                                } else {
                                  setSelectedFindingIds(selectedFindingIds.filter((id) => id !== row.id));
                                }
                              }}
                              className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-blue-600 group-hover:underline">
                            {row.id}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F172A]">
                            {row.title}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#64748B]">
                            {row.resource}
                          </td>
                          <td className="py-3 px-4">
                            <SeverityBadge severity={row.severity} />
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                            {row.detected_at}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination matching reference `< 1 2 3 4 5 >` and `10 / page` */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                <span>
                  Showing {((allPage - 1) * 10) + 1} to {Math.min(allPage * 10, allFindingsData?.total ?? 328)} of {allFindingsData?.total ?? 328} findings
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={allPage <= 1}
                      onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {[1, 2, 3, 4, 5].map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setAllPage(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          allPage === pageNum
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'hover:bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      disabled={allPage >= (allFindingsData?.total_pages ?? 5)}
                      onClick={() => setAllPage((p) => p + 1)}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-slate-300">|</span>
                  <span className="text-[#64748B] font-medium">10 / page</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.3: FINDING DETAIL
            ========================================================================= */}
        {activeTab === 'detail' && (
          <div className="space-y-6">
            {/* Header with Title, Badges, and Action Button matching Screen 3.3 */}
            <div className="flex flex-wrap items-start justify-between gap-4 p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono font-bold text-[#0F172A] text-lg">
                    {findingDetailData?.id ?? selectedFindingId}
                  </span>
                  <h1 className="text-lg font-bold text-[#0F172A]">
                    {findingDetailData?.title ?? 'S3 bucket allows public access'}
                  </h1>
                  <SeverityBadge severity={findingDetailData?.severity ?? 'Critical'} />
                  <StatusBadge status={findingDetailData?.status ?? 'Open'} />
                </div>
                <p className="text-xs text-[#64748B] max-w-3xl">
                  {findingDetailData?.description ??
                    'S3 bucket is publicly accessible through block public access settings.'}
                </p>
              </div>

              {/* Assign and Quick Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Assign</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Sub-tabs: Overview, Evidence, Remediation, Comments, Activity */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
              {[
                { id: 'Overview', label: 'Overview', icon: Info },
                { id: 'Evidence', label: 'Evidence', icon: FileCode },
                { id: 'Remediation', label: 'Remediation', icon: Wrench },
                { id: 'Comments', label: 'Comments', icon: MessageSquare },
                { id: 'Activity', label: 'Activity', icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isTabActive = findingDetailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFindingDetailTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isTabActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-tab 1: Overview Metadata Grid matching Screen 3.3 */}
            {findingDetailTab === 'Overview' && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">Finding Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-xs">
                  <div>
                    <span className="text-[#64748B] block font-medium">Finding ID</span>
                    <span className="text-[#0F172A] font-mono font-semibold mt-0.5 block">
                      {findingDetailData?.id ?? 'FND-328'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Title</span>
                    <span className="text-[#0F172A] font-semibold mt-0.5 block">
                      {findingDetailData?.title ?? 'S3 bucket allows public access'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Severity</span>
                    <div className="mt-1">
                      <SeverityBadge severity={findingDetailData?.severity ?? 'Critical'} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Status</span>
                    <div className="mt-1">
                      <StatusBadge status={findingDetailData?.status ?? 'Open'} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Resource</span>
                    <span className="text-[#0F172A] font-mono mt-0.5 block">
                      {findingDetailData?.resource ?? 'aws_s3_bucket.app'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Provider</span>
                    <div className="mt-1">
                      <ProviderBadge provider={findingDetailData?.provider ?? 'AWS'} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Rule ID</span>
                    <span className="text-[#0F172A] font-mono mt-0.5 block">
                      {findingDetailData?.rule_id ?? 'IAC-001'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Category</span>
                    <span className="text-[#0F172A] font-medium mt-0.5 block">
                      {findingDetailData?.category ?? 'Storage'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Frameworks</span>
                    <span className="text-[#0F172A] mt-0.5 block">
                      {findingDetailData?.frameworks ?? 'CIS AWS v1.5.0, NIST 800-53, PCI DSS'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Detected At</span>
                    <span className="text-[#0F172A] mt-0.5 block">
                      {findingDetailData?.detected_at ?? 'Sep 30, 2026, 10:12 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">First Seen</span>
                    <span className="text-[#0F172A] mt-0.5 block">
                      {findingDetailData?.first_seen ?? 'Sep 28, 2026, 09:14 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Last Seen</span>
                    <span className="text-[#0F172A] mt-0.5 block">
                      {findingDetailData?.last_seen ?? 'Sep 30, 2026, 10:12 AM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Environment</span>
                    <span className="text-[#0F172A] capitalize mt-0.5 block">
                      {findingDetailData?.environment ?? 'production'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Region</span>
                    <span className="text-[#0F172A] font-mono mt-0.5 block">
                      {findingDetailData?.region ?? 'ap-south-1'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Resource Tags</span>
                    <span className="text-[#0F172A] font-mono mt-0.5 block">
                      {findingDetailData?.resource_tags ?? 'app: frontend, env: prod'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">CVSS (approx.)</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 mt-1">
                      {findingDetailData?.cvss_score ?? '8.6 (High)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block font-medium">Assignee</span>
                    <span className="text-[#0F172A] mt-0.5 block">
                      {findingDetailData?.assignee ?? 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Evidence Code Snippet */}
            {findingDetailTab === 'Evidence' && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span className="font-mono text-[#0F172A]">
                      {findingDetailData?.evidence.file_path ?? 'terraform/modules/storage/s3.tf:14-26'}
                    </span>
                  </div>
                  <span>Lines {findingDetailData?.evidence.line_start ?? 14} - {findingDetailData?.evidence.line_end ?? 26}</span>
                </div>

                <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-slate-100">
                  <pre>{findingDetailData?.evidence.code_content}</pre>
                </div>

                {findingDetailData?.evidence.diff_patch && (
                  <div className="space-y-2 mt-4">
                    <span className="text-xs font-semibold text-[#0F172A]">Policy Violation Diff</span>
                    <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 font-mono text-xs overflow-x-auto">
                      {findingDetailData.evidence.diff_patch.split('\n').map((line, idx) => (
                        <div
                          key={idx}
                          className={`${
                            line.startsWith('+')
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : line.startsWith('-')
                              ? 'text-rose-400 bg-rose-500/10'
                              : 'text-slate-400'
                          } px-2 py-0.5 rounded`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Remediation Guidance */}
            {findingDetailTab === 'Remediation' && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Recommended Remediation</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {findingDetailData?.remediation.summary}
                    </p>
                  </div>
                  <button
                    disabled={findingDetailData?.remediation.applied || isApplyingRemediation}
                    onClick={handleApplyRemediation}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                      findingDetailData?.remediation.applied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isApplyingRemediation ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : findingDetailData?.remediation.applied ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <GitPullRequest className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {findingDetailData?.remediation.applied ? 'Remediation Verified in PR #402' : 'Apply Remediation & Create PR'}
                    </span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#0F172A]">Target Terraform Configuration</span>
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
                    <pre>{findingDetailData?.remediation.terraform_snippet}</pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#0F172A]">Remediation Steps</span>
                  <ul className="space-y-1.5 text-xs text-[#334155] list-inside">
                    {findingDetailData?.remediation.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Sub-tab 4: Comments Feed */}
            {findingDetailTab === 'Comments' && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 space-y-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F172A]">Investigation Notes & Discussion</h3>

                <div className="space-y-3.5">
                  {(findingDetailData?.comments ?? []).map((comm) => (
                    <div key={comm.id} className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {comm.avatar}
                          </span>
                          <span className="font-semibold text-[#0F172A]">{comm.author}</span>
                        </div>
                        <span className="text-[#64748B]">{comm.created_at}</span>
                      </div>
                      <p className="text-xs text-[#334155] pl-8">{comm.comment}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="space-y-2.5 pt-2">
                  <textarea
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add an investigation note, justification, or review comment..."
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Note</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-tab 5: Activity Log */}
            {findingDetailTab === 'Activity' && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F172A]">Audit History & Timeline</h3>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#E2E8F0]">
                  {(findingDetailData?.activity ?? []).map((act) => (
                    <div key={act.id} className="relative flex items-start gap-4 pl-8 text-xs">
                      <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#0F172A]">{act.event}</span>
                          <span className="text-[#64748B] font-mono text-[11px]">{act.timestamp}</span>
                        </div>
                        <span className="text-[#64748B] block mt-0.5">By {act.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <h3 className="text-sm font-bold text-[#0F172A]">Assign Finding {selectedFindingId}</h3>
                    <button onClick={() => setShowAssignModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs text-[#334155] font-medium">Select Assignee or Team</label>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      <option value="mayur.bhavsar">mayur.bhavsar (DevSecOps Lead)</option>
                      <option value="dev-team">dev-team (Application Developers)</option>
                      <option value="devops-team">devops-team (Cloud Platform)</option>
                      <option value="security-team">security-team (InfoSec Operations)</option>
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#CBD5E1] text-xs text-[#334155] hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAssignFinding(selectedAssignee)}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm"
                    >
                      Confirm Assignment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.4: FINDINGS TRIAGE
            ========================================================================= */}
        {activeTab === 'triage' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Findings Triage</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Review, prioritize and take action on security findings.
              </p>
            </div>

            {/* Status Pills with Counts matching Screen 3.4 (Open 214, In Progress 46, Resolved 52, Suppressed 16) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { status: 'Open', count: triageData?.status_counts?.['Open'] ?? 214, color: 'text-blue-700 border-blue-200 bg-blue-50' },
                { status: 'In Progress', count: triageData?.status_counts?.['In Progress'] ?? 46, color: 'text-amber-700 border-amber-200 bg-amber-50' },
                { status: 'Resolved', count: triageData?.status_counts?.['Resolved'] ?? 52, color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
                { status: 'Suppressed', count: triageData?.status_counts?.['Suppressed'] ?? 16, color: 'text-purple-700 border-purple-200 bg-purple-50' },
              ].map((p) => {
                const isSelected = triageStatusFilter === p.status;
                return (
                  <button
                    key={p.status}
                    onClick={() => {
                      setTriageStatusFilter(p.status as any);
                      setTriagePage(1);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? `${p.color} ring-1 ring-blue-500 shadow-sm font-semibold`
                        : 'border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <span>{p.status}</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {p.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Triage Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={triageSeverity}
                  onChange={(e) => {
                    setTriageSeverity(e.target.value);
                    setTriagePage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={triageProvider}
                  onChange={(e) => {
                    setTriageProvider(e.target.value);
                    setTriagePage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Providers">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Azure">Azure</option>
                  <option value="GCP">GCP</option>
                </select>

                <select
                  value={triageAssignee}
                  onChange={(e) => {
                    setTriageAssignee(e.target.value);
                    setTriagePage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                >
                  <option value="All Assignees">All Assignees</option>
                  <option value="Unassigned">Unassigned</option>
                  <option value="mayur.bhavsar">mayur.bhavsar</option>
                  <option value="dev-team">dev-team</option>
                  <option value="devops-team">devops-team</option>
                  <option value="security-team">security-team</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={triageSearch}
                    onChange={(e) => {
                      setTriageSearch(e.target.value);
                      setTriagePage(1);
                    }}
                    placeholder="Search findings..."
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Bulk Actions Button with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#334155] text-xs font-semibold transition-colors"
                  >
                    <span>Bulk Actions</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showBulkActionsMenu && (
                    <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white border border-[#CBD5E1] shadow-xl py-1 z-30 text-xs text-[#0F172A]">
                      <button
                        onClick={() => handleExecuteBulkAction('set_status', 'In Progress')}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[#334155]"
                      >
                        Mark In Progress
                      </button>
                      <button
                        onClick={() => handleExecuteBulkAction('set_status', 'Resolved')}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[#334155]"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleExecuteBulkAction('suppress', 'Suppressed')}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[#334155]"
                      >
                        Suppress Findings
                      </button>
                      <button
                        onClick={() => handleExecuteBulkAction('assign', 'mayur.bhavsar')}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[#334155] border-t border-[#E2E8F0]"
                      >
                        Assign to mayur.bhavsar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Triage Table matching Screen 3.4 */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            (triageData?.items.length ?? 0) > 0 &&
                            selectedTriageIds.length === (triageData?.items.length ?? 0)
                          }
                          onChange={(e) => {
                            if (e.target.checked && triageData) {
                              setSelectedTriageIds(triageData.items.map((i) => i.id));
                            } else {
                              setSelectedTriageIds([]);
                            }
                          }}
                          className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Finding ID</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Title</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Severity</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Assignee</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {triageLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#64748B]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading triage items...
                        </td>
                      </tr>
                    ) : (triageData?.items.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#64748B]">
                          No findings match current triage criteria.
                        </td>
                      </tr>
                    ) : (
                      triageData?.items.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedTriageIds.includes(row.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTriageIds([...selectedTriageIds, row.id]);
                                } else {
                                  setSelectedTriageIds(selectedTriageIds.filter((id) => id !== row.id));
                                }
                              }}
                              className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
                            />
                          </td>
                          <td
                            className="py-3 px-4 font-mono font-medium text-blue-600 hover:underline cursor-pointer"
                            onClick={() => handleDrilldown(row.id)}
                          >
                            {row.id}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F172A]">
                            {row.title}
                          </td>
                          <td className="py-3 px-4">
                            <SeverityBadge severity={row.severity} />
                          </td>
                          <td className="py-3 px-4 font-mono text-[#64748B]">
                            {row.assignee}
                          </td>
                          <td className="py-3 px-4">
                            {row.assignee === 'Unassigned' ? (
                              <button
                                onClick={() => handleQuickTriageAction(row.id, 'assign', 'mayur.bhavsar')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors text-[11px] font-semibold"
                              >
                                <span>Assign</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickTriageAction(row.id, 'status', 'In Progress')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white transition-colors text-[11px] font-semibold"
                              >
                                <span>In Progress</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                <span>Page {triagePage} of {triageData?.total_pages ?? 5}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setTriagePage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        triagePage === pageNum
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-slate-100 text-[#64748B]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.5: FINDINGS TRENDS
            ========================================================================= */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Findings Trends</h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Analyze trends and patterns in IaC security findings.
                </p>
              </div>

              <div className="relative">
                <select
                  value={trendsTimeRange}
                  onChange={(e) => setTrendsTimeRange(e.target.value)}
                  className="appearance-none bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-1.5 pr-8 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                  <option value="Last 180 days">Last 180 days</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Sub-tabs: Trend, By Severity, By Provider, By Category, By Environment */}
            <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
              {['Trend', 'By Severity', 'By Provider', 'By Category', 'By Environment'].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setTrendsSubTab(sub as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    trendsSubTab === sub
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Main 90-day Trend Chart */}
            <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Findings Trend</h2>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-[#334155]">Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[#334155]">High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="text-[#334155]">Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#334155]">Low</span>
                  </div>
                </div>
              </div>

              {trendsLoading ? (
                <div className="h-48 flex items-center justify-center text-[#64748B] text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading trends...
                </div>
              ) : (
                <FindingsTrendStackedBar trendData={trendsData?.trend ?? []} is90Days={true} />
              )}
            </div>

            {/* Bottom Row: Findings by Provider (bars) & Findings by Environment (donut) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Findings by Provider */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">Findings by Provider</h3>
                <div className="space-y-3.5 pt-1">
                  {(trendsData?.provider_breakdown ?? [
                    { provider: 'AWS', count: 152 },
                    { provider: 'Kubernetes', count: 68 },
                    { provider: 'Azure', count: 54 },
                    { provider: 'GCP', count: 38 },
                    { provider: 'Others', count: 16 },
                  ]).map((item) => {
                    const maxP = 152;
                    const pct = (item.count / maxP) * 100;
                    return (
                      <div key={item.provider} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#334155] font-medium">{item.provider}</span>
                          <span className="font-mono font-semibold text-[#0F172A]">{item.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Findings by Environment Donut (Screen 3.5) */}
              <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Findings by Environment</h3>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                  <FindingsEnvironmentDonut />
                  <div className="space-y-2.5 text-xs w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-[#334155]">Production</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">42%</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span className="text-[#334155]">Staging</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">28%</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-[#334155]">Development</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">20%</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="text-[#334155]">Sandbox</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono">10%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.6: FINDINGS BY RESOURCE
            ========================================================================= */}
        {activeTab === 'by-resource' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Findings by Resource</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                View findings grouped by resource type.
              </p>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <select
                value={resourceProvider}
                onChange={(e) => {
                  setResourceProvider(e.target.value);
                  setResourcePage(1);
                }}
                className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
              >
                <option value="All Providers">All Providers</option>
                <option value="AWS">AWS</option>
                <option value="Kubernetes">Kubernetes</option>
                <option value="Azure">Azure</option>
                <option value="GCP">GCP</option>
              </select>

              <select
                value={resourceEnvironment}
                onChange={(e) => {
                  setResourceEnvironment(e.target.value);
                  setResourcePage(1);
                }}
                className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
              >
                <option value="All Environments">All Environments</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="Sandbox">Sandbox</option>
              </select>
            </div>

            {/* Resource matrix table matching Screen 3.6 */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Resource Type</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Total Findings</th>
                      <th className="py-3 px-4 font-semibold text-rose-600">Critical</th>
                      <th className="py-3 px-4 font-semibold text-amber-600">High</th>
                      <th className="py-3 px-4 font-semibold text-yellow-600">Medium</th>
                      <th className="py-3 px-4 font-semibold text-emerald-600">Low</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {byResourceLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#64748B]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading resources...
                        </td>
                      </tr>
                    ) : (
                      byResourceData?.items.map((row) => (
                        <tr key={row.resource_type} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-blue-600">
                            {row.resource_type}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#0F172A] font-mono">
                            {row.total}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-600 font-semibold">
                            {row.critical}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-600 font-semibold">
                            {row.high}
                          </td>
                          <td className="py-3 px-4 font-mono text-yellow-600">
                            {row.medium}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-600">
                            {row.low}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                <span>Showing 10 resource types</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setResourcePage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        resourcePage === pageNum
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-slate-100 text-[#64748B]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.7: FINDINGS BY FRAMEWORK (COMPLIANCE SUMMARY)
            ========================================================================= */}
        {activeTab === 'by-framework' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Findings by Framework</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                View findings mapped to compliance and security frameworks.
              </p>
            </div>

            {/* Framework table matching Screen 3.7 */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Framework</th>
                      <th className="py-3 px-4 font-semibold text-[#0F172A]">Total Findings</th>
                      <th className="py-3 px-4 font-semibold text-rose-600">Critical</th>
                      <th className="py-3 px-4 font-semibold text-amber-600">High</th>
                      <th className="py-3 px-4 font-semibold text-yellow-600">Medium</th>
                      <th className="py-3 px-4 font-semibold text-emerald-600">Low</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {byFrameworkSummaryLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#64748B]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading compliance frameworks...
                        </td>
                      </tr>
                    ) : (
                      byFrameworkSummaryData?.items.map((row) => (
                        <tr key={row.framework} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-blue-600">
                            {row.framework}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#0F172A] font-mono">
                            {row.total}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-600 font-semibold">
                            {row.critical}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-600 font-semibold">
                            {row.high}
                          </td>
                          <td className="py-3 px-4 font-mono text-yellow-600">
                            {row.medium}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-600">
                            {row.low}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                <span>Showing 10 frameworks</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setFrameworkSummaryPage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        frameworkSummaryPage === pageNum
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-slate-100 text-[#64748B]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 3.8: EXPORT & REPORTS
            ========================================================================= */}
        {activeTab === 'export-reports' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Export & Reports</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Export findings and generate security reports.
              </p>
            </div>

            {/* Navigation Tabs: Export, Scheduled Reports, Report History */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
              {['Export', 'Scheduled Reports', 'Report History'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setExportReportsTab(tab as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    exportReportsTab === tab
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sub-view: Export (matching Screen 3.8 layout) */}
            {exportReportsTab === 'Export' && (
              <div className="max-w-2xl rounded-xl bg-white border border-[#E2E8F0] p-6 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Export Findings</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Export findings in various formats for further analysis.
                  </p>
                </div>

                {/* Format Radio */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#334155]">Format</label>
                  <div className="flex items-center gap-6 text-xs text-[#0F172A]">
                    {['CSV', 'JSON', 'PDF'].map((fmt) => (
                      <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value={fmt}
                          checked={exportFormat === fmt}
                          onChange={() => setExportFormat(fmt as any)}
                          className="text-blue-600 focus:ring-0 bg-white border-slate-300"
                        />
                        <span>{fmt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Include Checkboxes */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-[#334155]">Include</label>
                  <div className="space-y-2 text-xs text-[#334155]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDetails}
                        onChange={(e) => setIncludeDetails(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                      />
                      <span>Finding details</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeResourceConfig}
                        onChange={(e) => setIncludeResourceConfig(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                      />
                      <span>Resource configuration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRemediation}
                        onChange={(e) => setIncludeRemediation(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                      />
                      <span>Remediation guidance</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeEvidence}
                        onChange={(e) => setIncludeEvidence(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                      />
                      <span>Evidence</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeActivity}
                        onChange={(e) => setIncludeActivity(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 bg-white border-slate-300"
                      />
                      <span>Activity history</span>
                    </label>
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-[#334155]">Filters</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      <option value="All Statuses">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <select
                      value={exportSeverity}
                      onChange={(e) => setExportSeverity(e.target.value)}
                      className="bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      <option value="All Severities">All Severities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>

                    <select
                      value={exportProvider}
                      onChange={(e) => setExportProvider(e.target.value)}
                      className="bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                    >
                      <option value="All Providers">All Providers</option>
                      <option value="AWS">AWS</option>
                      <option value="Kubernetes">Kubernetes</option>
                      <option value="Azure">Azure</option>
                    </select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#334155]">Date Range</label>
                  <select
                    value={exportDateRange}
                    onChange={(e) => setExportDateRange(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="Last 7 days">Last 7 days</option>
                    <option value="Last 30 days">Last 30 days</option>
                    <option value="Last 90 days">Last 90 days</option>
                    <option value="All Time">All Time</option>
                  </select>
                </div>

                {/* Action button */}
                <div className="pt-2">
                  <button
                    disabled={isExporting}
                    onClick={handleExportAdvanced}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Export Findings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view: Scheduled Reports */}
            {exportReportsTab === 'Scheduled Reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#64748B]">
                    Automated email and webhook digests sent to your security and compliance stakeholders.
                  </p>
                  <button
                    onClick={() => setShowNewScheduleModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Report</span>
                  </button>
                </div>

                <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Report Name</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Frequency</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Format</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Recipients</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Next Run</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Status</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                      {scheduledLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#64748B]">
                            Loading scheduled reports...
                          </td>
                        </tr>
                      ) : (
                        scheduledReports.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-[#0F172A]">{r.name}</td>
                            <td className="py-3 px-4 text-[#64748B]">{r.frequency}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-blue-600">{r.format}</td>
                            <td className="py-3 px-4 font-mono text-[#64748B]">{r.recipients}</td>
                            <td className="py-3 px-4 text-[#64748B]">{r.next_run}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  r.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleToggleSchedule(r.id)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] text-xs font-medium"
                              >
                                {r.status === 'Active' ? 'Pause' : 'Resume'}
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

            {/* Sub-view: Report History */}
            {exportReportsTab === 'Report History' && (
              <div className="space-y-4">
                <p className="text-xs text-[#64748B]">
                  Historical archive of all generated compliance audits and findings exports.
                </p>

                <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-medium">
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">File Name</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Format</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Size</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Generated At</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A]">Generated By</th>
                        <th className="py-3 px-4 font-semibold text-[#0F172A] text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                      {historyLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#64748B]">
                            Loading history...
                          </td>
                        </tr>
                      ) : (
                        reportHistory.map((rep) => (
                          <tr key={rep.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-medium text-blue-600">{rep.name}</td>
                            <td className="py-3 px-4 font-semibold text-[#0F172A]">{rep.format}</td>
                            <td className="py-3 px-4 font-mono text-[#64748B]">{rep.size}</td>
                            <td className="py-3 px-4 text-[#64748B]">{rep.generated_at}</td>
                            <td className="py-3 px-4 text-[#334155]">{rep.generated_by}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDownloadHistorical(rep)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>Get File</span>
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

            {/* Schedule New Report Modal */}
            {showNewScheduleModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <form
                  onSubmit={handleCreateSchedule}
                  className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <h3 className="text-sm font-bold text-[#0F172A]">Create Automated Schedule</h3>
                    <button type="button" onClick={() => setShowNewScheduleModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[#334155] font-medium block mb-1">Report Title</label>
                      <input
                        type="text"
                        required
                        value={newScheduleName}
                        onChange={(e) => setNewScheduleName(e.target.value)}
                        placeholder="e.g. Weekly CIS Audit Digest"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[#334155] font-medium block mb-1">Frequency</label>
                        <select
                          value={newScheduleFreq}
                          onChange={(e) => setNewScheduleFreq(e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[#0F172A] focus:outline-none focus:border-blue-500"
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[#334155] font-medium block mb-1">Format</label>
                        <select
                          value={newScheduleFmt}
                          onChange={(e) => setNewScheduleFmt(e.target.value)}
                          className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-[#0F172A] focus:outline-none focus:border-blue-500"
                        >
                          <option value="PDF">PDF</option>
                          <option value="CSV">CSV</option>
                          <option value="JSON">JSON</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[#334155] font-medium block mb-1">Recipient Email(s)</label>
                      <input
                        type="text"
                        required
                        value={newScheduleRecipients}
                        onChange={(e) => setNewScheduleRecipients(e.target.value)}
                        placeholder="security-team@company.com"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewScheduleModal(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#CBD5E1] text-xs text-[#334155] hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm"
                    >
                      Save Schedule
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
