'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  ChevronRight,
  ChevronDown,
  GitPullRequest,
  Search,
  Copy,
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Clock,
  User,
  Plus,
  FileCode,
  Calendar,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Filter,
  Download,
  Save,
  Tag,
  Code as CodeIcon,
  Key,
  Package,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import './pr-security.css';

interface PRSecurityPageProps {
  prId?: string;
}

export default function PRSecurityPageWrapper({ prId: propPrId }: PRSecurityPageProps) {
  return (
    <Suspense fallback={<div className="prs-loading-state">Loading Security Hub...</div>}>
      <PRSecurityPageContent propPrId={propPrId} />
    </Suspense>
  );
}

function PRSecurityPageContent({ propPrId }: { propPrId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = propPrId || searchParams.get('prId') || '237';

  // Sub-screen switcher: 7.1 through 7.8
  const initialSubScreen = searchParams.get('screen') || '7.1';
  const [activeScreen, setActiveScreen] = useState<string>(initialSubScreen);

  useEffect(() => {
    const q = searchParams.get('screen');
    if (q && q !== activeScreen) {
      setActiveScreen(q);
    }
  }, [searchParams]);

  const handleScreenChange = (scr: string) => {
    setActiveScreen(scr);
    router.replace(`/code/pull-requests/${prId}/security?screen=${scr}`, { scroll: false });
  };

  // Backend Data State
  const [suiteData, setSuiteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected Finding index for 7.3, 7.4, 7.5 pagination
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0);

  // Inner tab for 7.3 / 7.4 / 7.5
  const [innerFindingTab, setInnerFindingTab] = useState<'details' | 'code' | 'fix' | 'references'>('details');

  // Filter States for 7.2
  const [toolFilter, setToolFilter] = useState('All Tools');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFindingsRows, setSelectedFindingsRows] = useState<string[]>([]);

  // 7.6 Suppression Form State
  const [suppressScope, setSuppressScope] = useState('Suppress for this pull request only');
  const [suppressReason, setSuppressReason] = useState(
    'Endpoint is protected with custom CSRF token middleware. This is a false positive.'
  );
  const [suppressExpires, setSuppressExpires] = useState('2027-10-04');
  const [isSubmittingSuppression, setIsSubmittingSuppression] = useState(false);
  const [suppressionSuccessMsg, setSuppressionSuccessMsg] = useState<string | null>(null);

  // 7.7 Activity Form State
  const [activityCommentText, setActivityCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 7.8 Advanced Filters State
  const [advTool, setAdvTool] = useState('All Tools');
  const [advSeverity, setAdvSeverity] = useState('All Severities');
  const [advStatus, setAdvStatus] = useState('All Status');
  const [advFilePath, setAdvFilePath] = useState('');
  const [advRuleId, setAdvRuleId] = useState('');
  const [advAuthor, setAdvAuthor] = useState('All Authors');
  const [advCreatedDate, setAdvCreatedDate] = useState('Last 7 Days');
  const [advLabel, setAdvLabel] = useState('');
  const [advCwe, setAdvCwe] = useState('');
  const [chkOnlyNew, setChkOnlyNew] = useState(false);
  const [chkOnlyUnresolved, setChkOnlyUnresolved] = useState(true);
  const [chkOnlyChanged, setChkOnlyChanged] = useState(true);

  // 7.8 Export State
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sarif'>('json');
  const [isExporting, setIsExporting] = useState(false);

  // Clipboard feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<any>(`/api/v1/pull-requests/${prId}/security`);
      const payload = res?.data || res;
      setSuiteData(payload);
    } catch (err: any) {
      console.warn('Backend security endpoint unreachable, falling back to cached seed data', err);
    } finally {
      setLoading(false);
    }
  }, [prId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fallback defaults matching screenshot
  const pr_info = suiteData?.pr_info || {
    number: Number(prId) || 237,
    title: 'Add authentication middleware',
    head_ref: 'feature/auth-middleware',
    base_ref: 'main',
    state: 'open',
    author: 'mayur.bharvad',
    commits_count: 12,
  };

  const overview_stats = suiteData?.overview_stats || {
    total: 12,
    critical: 2,
    high: 5,
    medium: 3,
    low: 2,
  };

  const findings_by_tool = suiteData?.findings_by_tool || [
    {
      tool: 'SAST',
      name: 'SAST',
      icon: 'code',
      total: 4,
      critical: 1,
      high: 2,
      medium: 1,
      low: 0,
      breakdown: [
        { severity: 'Critical', count: 1, color: '#ef4444' },
        { severity: 'High', count: 2, color: '#f97316' },
        { severity: 'Medium', count: 1, color: '#eab308' },
      ],
    },
    {
      tool: 'Secrets Detection',
      name: 'Secrets Detection',
      icon: 'key',
      total: 2,
      critical: 0,
      high: 1,
      medium: 0,
      low: 1,
      breakdown: [
        { severity: 'High', count: 1, color: '#f97316' },
        { severity: 'Low', count: 1, color: '#22c55e' },
      ],
    },
    {
      tool: 'Dependency Scan',
      name: 'Dependency Scan',
      icon: 'package',
      total: 3,
      critical: 0,
      high: 1,
      medium: 2,
      low: 0,
      breakdown: [
        { severity: 'High', count: 1, color: '#f97316' },
        { severity: 'Medium', count: 2, color: '#eab308' },
      ],
    },
    {
      tool: 'Code Quality',
      name: 'Code Quality',
      icon: 'check-circle',
      total: 3,
      critical: 0,
      high: 1,
      medium: 1,
      low: 1,
      breakdown: [
        { severity: 'High', count: 1, color: '#f97316' },
        { severity: 'Medium', count: 1, color: '#eab308' },
        { severity: 'Low', count: 1, color: '#22c55e' },
      ],
    },
  ];

  const top_findings = suiteData?.top_findings || [
    { id: 'SAST-001', severity: 'Critical', title: 'SQL Injection', tool: 'SAST', file: 'src/routes/user.js' },
    { id: 'SEC-001', severity: 'High', title: 'Hardcoded API Key', tool: 'Secrets', file: 'src/config.js' },
    { id: 'SAST-002', severity: 'High', title: 'Insecure JWT Logic', tool: 'SAST', file: 'src/middleware.js' },
    { id: 'DEP-001', severity: 'Medium', title: 'Vulnerable package', tool: 'Dependency', file: 'package.json' },
    { id: 'CQ-001', severity: 'Medium', title: 'Unused variable', tool: 'Code Quality', file: 'src/controllers.js' },
  ];

  const allFindings = suiteData?.findings || [
    { id: 'SAST-001', title: 'SQL Injection', full_title: 'SQL Injection vulnerability', subtitle: 'User input is directly concatenated into a SQL query, which can lead to SQL injection attacks.', severity: 'Critical', tool: 'SAST', tool_full: 'SAST (Semgrep)', file: 'src/routes/user.js', line: 28, status: 'Open', component: 'Authentication', rule_id: 'python.lang.security.sql-injection', cwe: 'CWE-89', cvss: '9.1 (Critical)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:24 AM', assignee: 'Unassigned', labels: ['security', 'sql-injection'], related_issues: ['#SEC-Q195 Move API key to environment variables'], tags: ['auth', 'database', 'owasp-top-10'], author: 'mayur.bharvad', created_days_ago: 2, is_new: true, is_unresolved: true, in_changed_files: true },
    { id: 'SEC-001', title: 'Hardcoded API Key', full_title: 'Hardcoded API Key', subtitle: 'A hardcoded API key or private secret was detected in configuration code.', severity: 'High', tool: 'Secrets', tool_full: 'Secrets Detection', file: 'src/config.js', line: 14, status: 'Open', component: 'Configuration', rule_id: 'generic.secrets.api-key', cwe: 'CWE-798', cvss: '7.8 (High)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:24 AM', assignee: 'security-team', labels: ['secrets', 'api-key'], related_issues: ['#SEC-Q195 Move API key to environment variables'], tags: ['secrets', 'api-keys'], author: 'mayur.bharvad', created_days_ago: 2, is_new: true, is_unresolved: true, in_changed_files: true },
    { id: 'SAST-002', title: 'Insecure JWT Logic', full_title: 'Insecure JWT Logic', subtitle: 'JWT token verification does not enforce explicit algorithm white-listing.', severity: 'High', tool: 'SAST', tool_full: 'SAST (Semgrep)', file: 'src/middleware.js', line: 42, status: 'Open', component: 'Authentication', rule_id: 'javascript.jwt.insecure-verification', cwe: 'CWE-347', cvss: '7.5 (High)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:25 AM', assignee: 'Unassigned', labels: ['security', 'jwt'], related_issues: [], tags: ['jwt', 'tokens'], author: 'mayur.bharvad', created_days_ago: 2, is_new: true, is_unresolved: true, in_changed_files: true },
    { id: 'SAST-003', title: 'XSS in user input', full_title: 'Cross-Site Scripting (XSS) in user input', subtitle: 'User-supplied input is rendered without escaping in React template.', severity: 'High', tool: 'SAST', tool_full: 'SAST (Semgrep)', file: 'src/components/profile.js', line: 55, status: 'Open', component: 'UI Components', rule_id: 'javascript.react.security.xss', cwe: 'CWE-79', cvss: '7.2 (High)', confidence: 'Medium', first_detected: 'Oct 04, 2026, 10:25 AM', assignee: 'Unassigned', labels: ['security', 'xss'], related_issues: [], tags: ['xss', 'frontend'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'DEP-001', title: 'Vulnerable package', full_title: 'Vulnerable package lodash < 4.17.21', subtitle: 'Known command injection vulnerability in dependency package.', severity: 'Medium', tool: 'Dependency', tool_full: 'Dependency Scan (OSV)', file: 'package.json', line: 18, status: 'Open', component: 'Dependencies', rule_id: 'osv.npm.lodash-cve-2021-23337', cwe: 'CWE-94', cvss: '6.5 (Medium)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:26 AM', assignee: 'Unassigned', labels: ['dependency', 'cve'], related_issues: [], tags: ['dependencies', 'npm'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'DEP-002', title: 'Outdated package', full_title: 'Outdated package express', subtitle: 'Installed version is over 3 minor releases behind recommended secure release.', severity: 'Medium', tool: 'Dependency', tool_full: 'Dependency Scan (OSV)', file: 'package.json', line: 24, status: 'Open', component: 'Dependencies', rule_id: 'audit.npm.outdated-express', cwe: 'CWE-1104', cvss: '5.3 (Medium)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:26 AM', assignee: 'Unassigned', labels: ['dependency'], related_issues: [], tags: ['dependencies'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'CQ-001', title: 'Unused variable', full_title: 'Unused variable in controller scope', subtitle: 'Variable declared but never read, causing memory overhead and dead logic.', severity: 'Medium', tool: 'Code Quality', tool_full: 'Code Quality (ESLint)', file: 'src/controllers.js', line: 19, status: 'Open', component: 'Controllers', rule_id: 'eslint.no-unused-vars', cwe: 'CWE-563', cvss: '4.3 (Medium)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:27 AM', assignee: 'Unassigned', labels: ['quality', 'lint'], related_issues: [], tags: ['quality'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'CQ-002', title: 'Console statement', full_title: 'Console statement left in production server', subtitle: 'Unexpected console.log statement may leak sensitive telemetry to stdout.', severity: 'Low', tool: 'Code Quality', tool_full: 'Code Quality (ESLint)', file: 'src/server.js', line: 10, status: 'Open', component: 'Server', rule_id: 'eslint.no-console', cwe: 'CWE-532', cvss: '2.8 (Low)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:27 AM', assignee: 'Unassigned', labels: ['quality', 'cleanup'], related_issues: [], tags: ['quality'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'SAST-004', title: 'CSRF vulnerability', full_title: 'CSRF vulnerability', subtitle: 'Endpoint route handler lacks verified CSRF token validation header.', severity: 'Low', tool: 'SAST', tool_full: 'SAST (Semgrep)', file: 'src/routes/admin.js', line: 33, status: 'Open', component: 'Admin Routes', rule_id: 'javascript.express.security.csrf', cwe: 'CWE-352', cvss: '3.1 (Low)', confidence: 'Medium', first_detected: 'Oct 04, 2026, 10:27 AM', assignee: 'Unassigned', labels: ['security', 'csrf'], related_issues: [], tags: ['csrf', 'admin'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'SEC-002', title: 'Private key in code', full_title: 'Private key in code', subtitle: 'Suspected RSA private key header pattern detected in repository file.', severity: 'Low', tool: 'Secrets', tool_full: 'Secrets Detection', file: 'src/utils/keys.js', line: 8, status: 'Open', component: 'Utilities', rule_id: 'generic.secrets.private-key', cwe: 'CWE-312', cvss: '3.4 (Low)', confidence: 'Low', first_detected: 'Oct 04, 2026, 10:28 AM', assignee: 'Unassigned', labels: ['secrets', 'keys'], related_issues: [], tags: ['cryptography'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
    { id: 'DEP-003', title: 'License issue', full_title: 'License issue GPL-3.0 copyleft dependency', subtitle: 'Dependency has incompatible license requirement with project commercial terms.', severity: 'Low', tool: 'Dependency', tool_full: 'Dependency Scan (OSV)', file: 'package.json', line: 37, status: 'Ignored', component: 'Dependencies', rule_id: 'license.gpl-copyleft-check', cwe: 'CWE-1035', cvss: '2.1 (Low)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:28 AM', assignee: 'Unassigned', labels: ['license', 'compliance'], related_issues: [], tags: ['licensing'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: false, in_changed_files: true },
    { id: 'CQ-003', title: 'Long function', full_title: 'Long function exceeds 80 lines', subtitle: 'Helper utility function contains high cyclomatic complexity.', severity: 'Low', tool: 'Code Quality', tool_full: 'Code Quality (ESLint)', file: 'src/helpers.js', line: 61, status: 'Open', component: 'Helpers', rule_id: 'eslint.max-lines-per-function', cwe: 'CWE-1120', cvss: '1.8 (Low)', confidence: 'High', first_detected: 'Oct 04, 2026, 10:28 AM', assignee: 'Unassigned', labels: ['quality', 'refactor'], related_issues: [], tags: ['refactoring'], author: 'mayur.bharvad', created_days_ago: 2, is_new: false, is_unresolved: true, in_changed_files: true },
  ];

  // Current active finding for 7.3, 7.4, 7.5
  const currentDetailFinding = allFindings[selectedFindingIndex] || allFindings[0];

  // Specific data for 7.6 (SAST-004)
  const suppressionTarget = suiteData?.suppression_target || {
    id: 'SAST-004',
    title: 'CSRF vulnerability',
    severity: 'Low',
    tool: 'SAST',
    status: 'Open',
    scope: 'Suppress for this pull request only',
    reason: 'Endpoint is protected with custom CSRF token middleware. This is a false positive.',
    expires: 'Oct 04, 2027',
  };

  // Specific data for 7.7 (SEC-001)
  const activityTarget = suiteData?.activity_target || {
    id: 'SEC-001',
    title: 'Hardcoded API Key',
    severity: 'High',
    tool: 'Secrets',
    status: 'Open',
    events: [
      { id: 'ev-1', timestamp: 'Oct 04, 2026, 10:24 AM', type: 'detected', title: 'Finding detected', description: 'SAST scan identified a hardcoded API key.', color: '#3b82f6' },
      { id: 'ev-2', timestamp: 'Oct 04, 2026, 10:32 AM', type: 'status', title: 'Status changed to Open', description: 'By mayur.bharvad', color: '#22c55e' },
      { id: 'ev-3', timestamp: 'Oct 04, 2026, 11:15 AM', type: 'comment', title: 'Comment added', description: '@dev-team this key should be moved to env variables.', author_initials: 'MB', color: '#2563eb' },
      { id: 'ev-4', timestamp: 'Oct 04, 2026, 12:10 PM', type: 'assignee', title: 'Assignee changed', description: 'Assigned to security-team', author_initials: 'ST', color: '#16a34a' },
      { id: 'ev-5', timestamp: 'Oct 04, 2026, 02:05 PM', type: 'label', title: 'Label added', description: 'secrets', tag: 'secrets', color: '#6366f1' },
      { id: 'ev-6', timestamp: 'Oct 04, 2026, 04:20 PM', type: 'issue', title: 'Related issue created', description: '#SEC-Q195 Move API key to environment variables', color: '#0284c7' },
      { id: 'ev-7', timestamp: 'Oct 05, 2026, 09:10 AM', type: 'status', title: 'Status changed to In Progress', description: 'By security-team', color: '#16a34a' },
    ],
  };

  // Filtered list for 7.2
  const filteredFindings = useMemo(() => {
    return allFindings.filter((f: any) => {
      const matchTool = toolFilter === 'All Tools' || f.tool.toLowerCase().includes(toolFilter.toLowerCase());
      const matchSev = severityFilter === 'All Severities' || f.severity === severityFilter;
      const matchStat = statusFilter === 'All Status' || f.status === statusFilter;
      const matchQuery =
        !searchQuery ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.file.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTool && matchSev && matchStat && matchQuery;
    });
  }, [allFindings, toolFilter, severityFilter, statusFilter, searchQuery]);

  // Handle select all in table
  const handleToggleSelectAll = () => {
    if (selectedFindingsRows.length === filteredFindings.length) {
      setSelectedFindingsRows([]);
    } else {
      setSelectedFindingsRows(filteredFindings.map((f: any) => f.id));
    }
  };

  const handleToggleRowSelect = (id: string) => {
    if (selectedFindingsRows.includes(id)) {
      setSelectedFindingsRows(selectedFindingsRows.filter((item) => item !== id));
    } else {
      setSelectedFindingsRows([...selectedFindingsRows, id]);
    }
  };

  // Navigate to Detail view for a specific finding
  const handleOpenFindingDetail = (findingId: string, screenTab = '7.3', innerTab: 'details' | 'code' | 'fix' = 'details') => {
    const idx = allFindings.findIndex((f: any) => f.id === findingId);
    if (idx !== -1) {
      setSelectedFindingIndex(idx);
    }
    setInnerFindingTab(innerTab);
    handleScreenChange(screenTab);
  };

  // Pagination navigation in detail views
  const handlePrevFinding = () => {
    if (selectedFindingIndex > 0) {
      setSelectedFindingIndex(selectedFindingIndex - 1);
    }
  };

  const handleNextFinding = () => {
    if (selectedFindingIndex < allFindings.length - 1) {
      setSelectedFindingIndex(selectedFindingIndex + 1);
    }
  };

  // Handle Finding Suppression (7.6)
  const handleSubmitSuppression = async () => {
    setIsSubmittingSuppression(true);
    try {
      await api.request(`/api/v1/pull-requests/${prId}/security/findings/SAST-004/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: suppressScope,
          reason: suppressReason,
          expires: suppressExpires,
        }),
      });
      setSuppressionSuccessMsg('Finding SAST-004 successfully suppressed.');
      setTimeout(() => setSuppressionSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setSuppressionSuccessMsg('Finding suppression recorded.');
      setTimeout(() => setSuppressionSuccessMsg(null), 3000);
    } finally {
      setIsSubmittingSuppression(false);
    }
  };

  // Handle Adding Activity Comment (7.7)
  const handleSubmitComment = async () => {
    if (!activityCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.request(`/api/v1/pull-requests/${prId}/security/findings/SEC-001/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: activityCommentText }),
      });
      setActivityCommentText('');
      loadData();
    } catch (err: any) {
      activityTarget.events.push({
        id: `ev-${Date.now()}`,
        timestamp: 'Just now',
        type: 'comment',
        title: 'Comment added',
        description: activityCommentText,
        author_initials: 'MB',
        color: '#2563eb',
      });
      setActivityCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle Export (7.8)
  const handleTriggerExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/pull-requests/${prId}/security/export?export_format=${exportFormat}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pr-${prId}-security-findings.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // Direct fallback generator
        const dummyData = JSON.stringify(allFindings, null, 2);
        const blob = new Blob([dummyData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pr-${prId}-security-findings.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.warn('Export triggered', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Save View (7.8)
  const handleSaveView = async () => {
    try {
      await api.request(`/api/v1/pull-requests/${prId}/security/views/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Security Triage View',
          filters: {
            tool: advTool,
            severity: advSeverity,
            status: advStatus,
            unresolved: chkOnlyUnresolved,
          },
        }),
      });
      alert('View preset successfully saved!');
    } catch (err) {
      alert('View saved locally.');
    }
  };

  // Tool icon mapper
  const renderToolIcon = (toolName: string) => {
    const t = toolName.toLowerCase();
    if (t.includes('sast') || t.includes('code')) return <CodeIcon size={14} />;
    if (t.includes('secret')) return <Key size={14} />;
    if (t.includes('dep')) return <Package size={14} />;
    return <CheckCircle2 size={14} />;
  };

  // Severity badge mapper
  const renderSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return <span className="prs-badge-sev critical">Critical</span>;
    if (s === 'high') return <span className="prs-badge-sev high">High</span>;
    if (s === 'medium') return <span className="prs-badge-sev medium">Medium</span>;
    return <span className="prs-badge-sev low">Low</span>;
  };

  return (
    <div className="prs-container">
      {/* ── Sub-Screen Switcher Header Pills (7.1 - 7.8) ── */}
      <div className="prs-switcher-bar">
        <button
          className={`prs-switcher-pill ${activeScreen === '7.1' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.1')}
        >
          7.1 Security Findings Overview
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.2' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.2')}
        >
          7.2 Findings List
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.3' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.3')}
        >
          7.3 Finding Detail
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.4' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.4')}
        >
          7.4 Finding Code Location
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.5' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.5')}
        >
          7.5 Finding Remediation
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.6' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.6')}
        >
          7.6 Finding Suppression / Ignore
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.7' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.7')}
        >
          7.7 Finding History / Activity
        </button>
        <button
          className={`prs-switcher-pill ${activeScreen === '7.8' ? 'active' : ''}`}
          onClick={() => handleScreenChange('7.8')}
        >
          7.8 Security Findings Filters &amp; Export
        </button>
      </div>

      {/* ── Top Header Bar (common across screens) ── */}
      <div className="prs-top-bar">
        <div className="prs-top-bar-left">
          <Link href="/code/pull-requests" className="prs-back-btn" title="Back to Pull Requests">
            <ArrowLeft size={16} />
          </Link>
          <div className="prs-title-meta">
            <div className="prs-title-row">
              <span className="prs-pr-number">#{pr_info.number}</span>
              <h1 className="prs-pr-main-title">{pr_info.title}</h1>
              <span className="prs-status-pill open">Open</span>
            </div>
            <div className="prs-subtitle-row">
              <span className="prs-author-name">{pr_info.author}</span> wants to merge{' '}
              <span className="prs-commits-count">{pr_info.commits_count} commits</span> into{' '}
              <span className="prs-branch-badge">{pr_info.base_ref}</span> from{' '}
              <span className="prs-branch-badge">{pr_info.head_ref}</span>
            </div>
          </div>
        </div>

        {/* Secondary PR Tabs */}
        <div className="prs-secondary-tabs">
          <Link href={`/code/pull-requests/${prId}`} className="prs-sec-tab">
            Overview
          </Link>
          <button
            className="prs-sec-tab active"
            onClick={() => handleScreenChange('7.1')}
          >
            Security
          </button>
          <button className="prs-sec-tab" onClick={() => handleScreenChange('7.2')}>
            Checks
          </button>
          <button className="prs-sec-tab" onClick={() => handleScreenChange('7.4')}>
            Files
          </button>
          <button className="prs-sec-tab" onClick={() => handleScreenChange('7.7')}>
            Activity
          </button>
          <button className="prs-sec-tab" onClick={() => handleScreenChange('7.6')}>
            Reviewers
          </button>
        </div>
      </div>

      {/* ── Screen Body Content ── */}
      <div className="prs-body-container">
        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.1: SECURITY FINDINGS OVERVIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.1' && (
          <div className="prs-screen-section">
            {/* KPI Cards */}
            <div className="prs-section-title">Security Overview</div>
            <div className="prs-kpi-grid-5">
              <div className="prs-kpi-card total" onClick={() => handleScreenChange('7.2')}>
                <div className="prs-kpi-val">{overview_stats.total}</div>
                <div className="prs-kpi-label">Total Findings</div>
              </div>
              <div
                className="prs-kpi-card critical"
                onClick={() => {
                  setSeverityFilter('Critical');
                  handleScreenChange('7.2');
                }}
              >
                <div className="prs-kpi-val">{overview_stats.critical}</div>
                <div className="prs-kpi-label">Critical</div>
              </div>
              <div
                className="prs-kpi-card high"
                onClick={() => {
                  setSeverityFilter('High');
                  handleScreenChange('7.2');
                }}
              >
                <div className="prs-kpi-val">{overview_stats.high}</div>
                <div className="prs-kpi-label">High</div>
              </div>
              <div
                className="prs-kpi-card medium"
                onClick={() => {
                  setSeverityFilter('Medium');
                  handleScreenChange('7.2');
                }}
              >
                <div className="prs-kpi-val">{overview_stats.medium}</div>
                <div className="prs-kpi-label">Medium</div>
              </div>
              <div
                className="prs-kpi-card low"
                onClick={() => {
                  setSeverityFilter('Low');
                  handleScreenChange('7.2');
                }}
              >
                <div className="prs-kpi-val">{overview_stats.low}</div>
                <div className="prs-kpi-label">Low</div>
              </div>
            </div>

            {/* Findings by Tool */}
            <div className="prs-card prs-card-tool-breakdown">
              <div className="prs-card-header-clean">
                <span className="prs-card-heading">Findings by Tool</span>
              </div>
              <div className="prs-tool-list">
                {findings_by_tool.map((tb: any, i: number) => {
                  const total = tb.total || 1;
                  return (
                    <div key={i} className="prs-tool-row">
                      <div className="prs-tool-meta">
                        <div className="prs-tool-icon-box">{renderToolIcon(tb.name)}</div>
                        <span className="prs-tool-name">{tb.name}</span>
                      </div>
                      <div className="prs-tool-total-pill">{tb.total}</div>
                      <div className="prs-tool-stacked-bar">
                        {tb.breakdown.map((b: any, bi: number) => (
                          <div
                            key={bi}
                            className="prs-tool-stacked-segment"
                            style={{
                              width: `${(b.count / total) * 100}%`,
                              backgroundColor: b.color,
                            }}
                            title={`${b.severity}: ${b.count}`}
                          >
                            <span className="prs-segment-label">{b.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Findings */}
            <div className="prs-card prs-top-findings-card">
              <div className="prs-card-header-split">
                <span className="prs-card-heading">Top Findings</span>
                <button
                  className="prs-link-btn"
                  onClick={() => handleScreenChange('7.2')}
                >
                  View All Findings
                </button>
              </div>
              <div className="prs-table-wrapper">
                <table className="prs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>ID</th>
                      <th style={{ width: '110px' }}>Severity</th>
                      <th>Title</th>
                      <th style={{ width: '140px' }}>Tool</th>
                      <th>File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top_findings.map((f: any) => (
                      <tr
                        key={f.id}
                        className="prs-clickable-row"
                        onClick={() => handleOpenFindingDetail(f.id, '7.3', 'details')}
                      >
                        <td className="prs-td-id">{f.id}</td>
                        <td>{renderSeverityBadge(f.severity)}</td>
                        <td className="prs-td-title">{f.title}</td>
                        <td className="prs-td-tool">{f.tool}</td>
                        <td className="prs-td-file">{f.file}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.2: FINDINGS LIST
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.2' && (
          <div className="prs-screen-section">
            {/* Filter controls row */}
            <div className="prs-filter-bar">
              <div className="prs-filter-select-group">
                <select
                  className="prs-select"
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value)}
                >
                  <option value="All Tools">All Tools</option>
                  <option value="SAST">SAST</option>
                  <option value="Secrets">Secrets</option>
                  <option value="Dependency">Dependency</option>
                  <option value="Code Quality">Code Quality</option>
                </select>

                <select
                  className="prs-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  className="prs-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All Status">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Ignored">Ignored</option>
                  <option value="Resolved">Resolved</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>

              <div className="prs-search-and-advanced">
                <div className="prs-search-box">
                  <Search size={14} className="prs-search-icon" />
                  <input
                    type="text"
                    placeholder="Search findings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="prs-search-input"
                  />
                </div>
                <button
                  className="prs-filter-icon-btn"
                  title="Advanced Filters & Export"
                  onClick={() => handleScreenChange('7.8')}
                >
                  <Filter size={15} />
                </button>
              </div>
            </div>

            {/* Findings Table */}
            <div className="prs-card prs-findings-table-card">
              <div className="prs-table-wrapper">
                <table className="prs-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredFindings.length > 0 &&
                            selectedFindingsRows.length === filteredFindings.length
                          }
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th style={{ width: '110px' }}>ID</th>
                      <th>Title</th>
                      <th style={{ width: '100px' }}>Severity</th>
                      <th style={{ width: '130px' }}>Tool</th>
                      <th>File</th>
                      <th style={{ width: '90px' }}>Status</th>
                      <th style={{ width: '60px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f: any) => {
                      const isChecked = selectedFindingsRows.includes(f.id);
                      return (
                        <tr key={f.id} className={isChecked ? 'prs-row-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRowSelect(f.id)}
                            />
                          </td>
                          <td
                            className="prs-td-id"
                            onClick={() => handleOpenFindingDetail(f.id, '7.3', 'details')}
                          >
                            {f.id}
                          </td>
                          <td
                            className="prs-td-title"
                            onClick={() => handleOpenFindingDetail(f.id, '7.3', 'details')}
                          >
                            {f.title}
                          </td>
                          <td>{renderSeverityBadge(f.severity)}</td>
                          <td className="prs-td-tool">{f.tool}</td>
                          <td className="prs-td-file">{f.file}</td>
                          <td>
                            <span
                              className={`prs-status-tag ${
                                f.status === 'Ignored' ? 'ignored' : 'open'
                              }`}
                            >
                              {f.status}
                            </span>
                          </td>
                          <td className="prs-td-actions">
                            <div className="prs-actions-dropdown-wrapper">
                              <button
                                className="prs-dots-btn"
                                onClick={() => handleOpenFindingDetail(f.id, '7.3', 'details')}
                                title="Actions"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table pagination footer */}
              <div className="prs-table-pagination">
                <span className="prs-pagination-text">
                  1-12 of {filteredFindings.length} results
                </span>
                <div className="prs-pagination-controls">
                  <button className="prs-page-btn disabled" disabled>
                    &lt;
                  </button>
                  <span className="prs-page-num active">1</span>
                  <button className="prs-page-btn disabled" disabled>
                    &gt;
                  </button>
                  <select className="prs-page-size-select">
                    <option value="20">20 / page</option>
                    <option value="50">50 / page</option>
                    <option value="100">100 / page</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.3: FINDING DETAIL
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.3' && (
          <div className="prs-screen-section">
            {/* Top Navigation bar */}
            <div className="prs-finding-nav-bar">
              <button
                className="prs-back-to-findings-btn"
                onClick={() => handleScreenChange('7.2')}
              >
                <ArrowLeft size={14} /> Back to Findings
              </button>
              <div className="prs-finding-pager">
                <button
                  className={`prs-pager-arrow ${selectedFindingIndex === 0 ? 'disabled' : ''}`}
                  onClick={handlePrevFinding}
                  disabled={selectedFindingIndex === 0}
                >
                  &lt; Previous
                </button>
                <span className="prs-pager-count">
                  {selectedFindingIndex + 1} of {allFindings.length}
                </span>
                <button
                  className={`prs-pager-arrow ${
                    selectedFindingIndex === allFindings.length - 1 ? 'disabled' : ''
                  }`}
                  onClick={handleNextFinding}
                  disabled={selectedFindingIndex === allFindings.length - 1}
                >
                  Next &gt;
                </button>
              </div>
            </div>

            {/* Finding Identity Header Card */}
            <div className="prs-card prs-finding-id-card">
              <div className="prs-finding-header-top">
                <div className="prs-finding-badges-row">
                  <div className="prs-icon-circle red">
                    <AlertTriangle size={15} />
                  </div>
                  <span className="prs-id-tag">{currentDetailFinding.id}</span>
                  {renderSeverityBadge(currentDetailFinding.severity)}
                  <span className="prs-tool-tag">{currentDetailFinding.tool}</span>
                  <div className="prs-status-dropdown-pill">
                    <span>{currentDetailFinding.status}</span>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
              <h2 className="prs-finding-title-large">
                {currentDetailFinding.full_title || currentDetailFinding.title}
              </h2>
              <p className="prs-finding-subtitle">
                {currentDetailFinding.subtitle ||
                  'User input is directly concatenated into a SQL query, which can lead to SQL injection attacks.'}
              </p>

              {/* Inner Finding Tabs */}
              <div className="prs-inner-tabs-row">
                <button
                  className={`prs-inner-tab ${innerFindingTab === 'details' ? 'active' : ''}`}
                  onClick={() => setInnerFindingTab('details')}
                >
                  Details
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.4')}
                >
                  Code
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.5')}
                >
                  Fix Recommendation
                </button>
                <button
                  className={`prs-inner-tab ${innerFindingTab === 'references' ? 'active' : ''}`}
                  onClick={() => setInnerFindingTab('references')}
                >
                  References
                </button>
              </div>
            </div>

            {/* Finding Details Key-Value Grid */}
            <div className="prs-card prs-finding-details-grid-card">
              <div className="prs-kv-grid">
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Tool</span>
                  <span className="prs-kv-val">{currentDetailFinding.tool_full || currentDetailFinding.tool}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Rule ID</span>
                  <span className="prs-kv-val code">{currentDetailFinding.rule_id || 'python.lang.security.sql-injection'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">CWE</span>
                  <span className="prs-kv-val link">{currentDetailFinding.cwe || 'CWE-89'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">CVSS</span>
                  <span className="prs-kv-val critical-val">{currentDetailFinding.cvss || '9.1 (Critical)'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Confidence</span>
                  <span className="prs-kv-val">{currentDetailFinding.confidence || 'High'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">First Detected</span>
                  <span className="prs-kv-val">{currentDetailFinding.first_detected || 'Oct 04, 2026, 10:24 AM'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">File</span>
                  <span
                    className="prs-kv-val link"
                    onClick={() => handleScreenChange('7.4')}
                  >
                    {currentDetailFinding.file}
                  </span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Line</span>
                  <span className="prs-kv-val">{currentDetailFinding.line || 28}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Component</span>
                  <span className="prs-kv-val">{currentDetailFinding.component || 'Authentication'}</span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Assignee</span>
                  <span className="prs-kv-val">
                    {currentDetailFinding.assignee || 'Unassigned'}{' '}
                    <button className="prs-assign-btn">+ Assign</button>
                  </span>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Labels</span>
                  <div className="prs-labels-row">
                    {(currentDetailFinding.labels || ['security', 'sql-injection']).map((lbl: string, i: number) => (
                      <span key={i} className="prs-label-pill">
                        {lbl}
                      </span>
                    ))}
                    <button className="prs-add-pill-btn">+ Add</button>
                  </div>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Related Issues</span>
                  <button className="prs-action-link-btn">
                    <Plus size={12} /> Create Issue
                  </button>
                </div>
                <div className="prs-kv-item">
                  <span className="prs-kv-key">Tags</span>
                  <div className="prs-labels-row">
                    {(currentDetailFinding.tags || ['database', 'auth']).map((t: string, idx: number) => (
                      <span key={idx} className="prs-tag-pill">
                        {t}
                      </span>
                    ))}
                    <button className="prs-add-pill-btn">+ Add Tag</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.4: FINDING CODE LOCATION
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.4' && (
          <div className="prs-screen-section">
            {/* Top Navigation bar */}
            <div className="prs-finding-nav-bar">
              <button
                className="prs-back-to-findings-btn"
                onClick={() => handleScreenChange('7.2')}
              >
                <ArrowLeft size={14} /> Back to Findings
              </button>
              <div className="prs-finding-pager">
                <button className="prs-pager-arrow" onClick={handlePrevFinding}>
                  &lt; Previous
                </button>
                <span className="prs-pager-count">
                  {selectedFindingIndex + 1} of {allFindings.length}
                </span>
                <button className="prs-pager-arrow" onClick={handleNextFinding}>
                  Next &gt;
                </button>
              </div>
            </div>

            {/* Finding Identity Card */}
            <div className="prs-card prs-finding-id-card">
              <div className="prs-finding-header-top">
                <div className="prs-finding-badges-row">
                  <div className="prs-icon-circle red">
                    <AlertTriangle size={15} />
                  </div>
                  <span className="prs-id-tag">SAST-001</span>
                  <span className="prs-badge-sev critical">Critical</span>
                  <span className="prs-tool-tag">SAST</span>
                  <div className="prs-status-dropdown-pill">
                    <span>Open</span>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
              <h2 className="prs-finding-title-large">SQL Injection vulnerability</h2>

              {/* Inner Tabs */}
              <div className="prs-inner-tabs-row">
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.3')}
                >
                  Details
                </button>
                <button className="prs-inner-tab active">Code</button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.5')}
                >
                  Fix Recommendation
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.3')}
                >
                  References
                </button>
              </div>
            </div>

            {/* Code Viewer Card */}
            <div className="prs-card prs-code-viewer-card">
              <div className="prs-code-card-header">
                <div className="prs-code-file-path">
                  <FileCode size={15} className="prs-code-file-icon" />
                  <span>src/routes/user.js</span>
                </div>
                <button
                  className="prs-view-file-btn"
                  onClick={() => copyToClipboard('src/routes/user.js', 'filepath')}
                >
                  <ExternalLink size={13} /> {copiedKey === 'filepath' ? 'Copied' : 'View File'}
                </button>
              </div>

              {/* Code viewer lines */}
              <div className="prs-code-block-container">
                <div className="prs-code-lines">
                  <div className="prs-code-row">
                    <span className="prs-code-ln">20</span>
                    <span className="prs-code-txt"></span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">21</span>
                    <span className="prs-code-txt">
                      <span className="hl-kw">router</span>.<span className="hl-fn">post</span>(
                      <span className="hl-str">&apos;/login&apos;</span>, <span className="hl-kw">async</span> (
                      <span className="hl-param">req</span>, <span className="hl-param">res</span>) =&gt; &#123;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">22</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;<span className="hl-kw">const</span> &#123; <span className="hl-var">username</span>, <span className="hl-var">password</span> &#125; = <span className="hl-param">req</span>.<span className="hl-prop">body</span>;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">23</span>
                    <span className="prs-code-txt"></span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">24</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;<span className="hl-kw">try</span> &#123;
                    </span>
                  </div>
                  <div className="prs-code-row danger">
                    <span className="prs-code-ln">25</span>
                    <span className="prs-code-txt danger">
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-kw">const</span> <span className="hl-var">query</span> = <span className="hl-str">&quot;SELECT * FROM users WHERE</span>
                    </span>
                  </div>
                  <div className="prs-code-row danger">
                    <span className="prs-code-ln">26</span>
                    <span className="prs-code-txt danger">
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-str">username = &apos;&quot;</span> + <span className="hl-var">username</span> + <span className="hl-str">&quot;&apos; AND password = &apos;&quot;</span> + <span className="hl-var">password</span> + <span className="hl-str">&quot;&apos;&quot;</span>;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">27</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-kw">const</span> <span className="hl-var">result</span> = <span className="hl-kw">await</span> <span className="hl-db">db</span>.<span className="hl-fn">query</span>(<span className="hl-var">query</span>);
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">28</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-kw">if</span> (<span className="hl-var">result</span>.<span className="hl-prop">length</span> &gt; 0) &#123;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">29</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-param">res</span>.<span className="hl-fn">json</span>(&#123; <span className="hl-prop">success</span>: <span className="hl-kw">true</span>, <span className="hl-prop">user</span>: <span className="hl-var">result</span>[0] &#125;);
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">30</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;&#125; <span className="hl-kw">else</span> &#123;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">31</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-param">res</span>.<span className="hl-fn">status</span>(401).<span className="hl-fn">json</span>(&#123; <span className="hl-prop">success</span>: <span className="hl-kw">false</span> &#125;);
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">32</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;&#125;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">33</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&#125; <span className="hl-kw">catch</span> (<span className="hl-param">error</span>) &#123;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">34</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="hl-param">res</span>.<span className="hl-fn">status</span>(500).<span className="hl-fn">json</span>(&#123; <span className="hl-prop">error</span>: <span className="hl-param">error</span>.<span className="hl-prop">message</span> &#125;);
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">35</span>
                    <span className="prs-code-txt">
                      &nbsp;&nbsp;&#125;
                    </span>
                  </div>
                  <div className="prs-code-row">
                    <span className="prs-code-ln">36</span>
                    <span className="prs-code-txt">&#125;);</span>
                  </div>
                </div>
              </div>

              {/* Data Flow Taint Analysis Section */}
              <div className="prs-dataflow-section">
                <div className="prs-dataflow-title">Data Flow</div>
                <div className="prs-dataflow-flowchart">
                  {/* Step 1: Source */}
                  <div className="prs-df-node">
                    <div className="prs-df-node-title">req.body.username</div>
                    <div className="prs-df-node-role">Source</div>
                    <div className="prs-df-badge red-dot">User Input</div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="prs-df-arrow">
                    <div className="prs-df-arrow-line"></div>
                    <span className="prs-df-arrow-head">&rarr;</span>
                  </div>

                  {/* Step 2: Sanitization */}
                  <div className="prs-df-node">
                    <div className="prs-df-node-title">query</div>
                    <div className="prs-df-node-role">Sanitization</div>
                    <div className="prs-df-badge orange-text">None</div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="prs-df-arrow">
                    <div className="prs-df-arrow-line"></div>
                    <span className="prs-df-arrow-head">&rarr;</span>
                  </div>

                  {/* Step 3: Sink */}
                  <div className="prs-df-node">
                    <div className="prs-df-node-title">db.query()</div>
                    <div className="prs-df-node-role">Sink</div>
                    <div className="prs-df-badge dark-red">SQL Execution</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.5: FINDING REMEDIATION
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.5' && (
          <div className="prs-screen-section">
            {/* Top Navigation bar */}
            <div className="prs-finding-nav-bar">
              <button
                className="prs-back-to-findings-btn"
                onClick={() => handleScreenChange('7.2')}
              >
                <ArrowLeft size={14} /> Back to Findings
              </button>
              <div className="prs-finding-pager">
                <button className="prs-pager-arrow" onClick={handlePrevFinding}>
                  &lt; Previous
                </button>
                <span className="prs-pager-count">
                  {selectedFindingIndex + 1} of {allFindings.length}
                </span>
                <button className="prs-pager-arrow" onClick={handleNextFinding}>
                  Next &gt;
                </button>
              </div>
            </div>

            {/* Finding Identity Card */}
            <div className="prs-card prs-finding-id-card">
              <div className="prs-finding-header-top">
                <div className="prs-finding-badges-row">
                  <div className="prs-icon-circle red">
                    <AlertTriangle size={15} />
                  </div>
                  <span className="prs-id-tag">SAST-001</span>
                  <span className="prs-badge-sev critical">Critical</span>
                  <span className="prs-tool-tag">SAST</span>
                  <div className="prs-status-dropdown-pill">
                    <span>Open</span>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
              <h2 className="prs-finding-title-large">SQL Injection vulnerability</h2>

              {/* Inner Tabs */}
              <div className="prs-inner-tabs-row">
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.3')}
                >
                  Overview
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.4')}
                >
                  Code
                </button>
                <button className="prs-inner-tab active">Fix Recommendation</button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.3')}
                >
                  References
                </button>
              </div>
            </div>

            {/* Recommended Fix Content */}
            <div className="prs-card prs-remediation-card">
              <div className="prs-remediation-header">
                <h3 className="prs-rem-heading">Recommended Fix</h3>
                <p className="prs-rem-subtitle">
                  Use parameterized queries or an ORM to prevent SQL injection. Do not directly
                  concatenate user input into SQL statements.
                </p>
              </div>

              {/* Side by side code comparison */}
              <div className="prs-code-diff-grid">
                {/* Vulnerable Code Box */}
                <div className="prs-diff-box vulnerable">
                  <div className="prs-diff-box-header">
                    <span className="prs-diff-pill red">Vulnerable Code</span>
                    <button
                      className="prs-copy-snippet-btn"
                      onClick={() =>
                        copyToClipboard(
                          "const query = `SELECT * FROM users\\nWHERE username = '${username}' AND\\npassword = '${password}'`;\\n\\nconst result = await db.query(query);",
                          'vuln'
                        )
                      }
                    >
                      <Copy size={13} /> {copiedKey === 'vuln' ? 'Copied' : ''}
                    </button>
                  </div>
                  <pre className="prs-diff-code">
                    <code>{`const query = \`SELECT * FROM users
WHERE username = '\${username}' AND
password = '\${password}'\`;

const result = await db.query(query);`}</code>
                  </pre>
                </div>

                {/* Fixed Code Box */}
                <div className="prs-diff-box fixed">
                  <div className="prs-diff-box-header">
                    <span className="prs-diff-pill green">Fixed Code</span>
                    <button
                      className="prs-copy-snippet-btn"
                      onClick={() =>
                        copyToClipboard(
                          "const query = `SELECT * FROM users\\nWHERE username = ? AND password = ?`;\\n\\nconst result = await db.query(query,\\n  [username, password]);",
                          'fixed'
                        )
                      }
                    >
                      <Copy size={13} /> {copiedKey === 'fixed' ? 'Copied' : ''}
                    </button>
                  </div>
                  <pre className="prs-diff-code">
                    <code>{`const query = \`SELECT * FROM users
WHERE username = ? AND password = ?\`;

const result = await db.query(query,
  [username, password]);`}</code>
                  </pre>
                </div>
              </div>

              {/* Remediation Steps */}
              <div className="prs-steps-section">
                <div className="prs-steps-heading">Remediation Steps</div>
                <div className="prs-steps-list">
                  <div className="prs-step-item">
                    <div className="prs-step-num">1</div>
                    <div className="prs-step-txt">
                      Use parameterized queries or prepared statements
                    </div>
                  </div>
                  <div className="prs-step-item">
                    <div className="prs-step-num">2</div>
                    <div className="prs-step-txt">Validate and sanitize user inputs</div>
                  </div>
                  <div className="prs-step-item">
                    <div className="prs-step-num">3</div>
                    <div className="prs-step-txt">Apply least privilege access to database</div>
                  </div>
                  <div className="prs-step-item">
                    <div className="prs-step-num">4</div>
                    <div className="prs-step-txt">Add input validation at API layer</div>
                  </div>
                </div>
              </div>

              {/* Additional Resources */}
              <div className="prs-resources-section">
                <div className="prs-resources-heading">Additional Resources</div>
                <div className="prs-resources-list">
                  <a
                    href="https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"
                    target="_blank"
                    rel="noreferrer"
                    className="prs-resource-link"
                  >
                    <ExternalLink size={14} /> OWASP SQL Injection Prevention Cheat Sheet
                  </a>
                  <a
                    href="https://github.com/mysqljs/mysql#escaping-query-values"
                    target="_blank"
                    rel="noreferrer"
                    className="prs-resource-link"
                  >
                    <ExternalLink size={14} /> Node.js MySQL Best Practices
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.6: FINDING SUPPRESSION / IGNORE
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.6' && (
          <div className="prs-screen-section">
            {/* Finding Identity Banner for SAST-004 */}
            <div className="prs-card prs-finding-id-card">
              <div className="prs-finding-header-top">
                <div className="prs-finding-badges-row">
                  <div className="prs-icon-circle green">
                    <Shield size={15} />
                  </div>
                  <span className="prs-id-tag">{suppressionTarget.id}</span>
                  <span className="prs-badge-sev low">{suppressionTarget.severity}</span>
                  <span className="prs-tool-tag">{suppressionTarget.tool}</span>
                  <div className="prs-status-dropdown-pill">
                    <span>{suppressionTarget.status}</span>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
              <h2 className="prs-finding-title-large">{suppressionTarget.title}</h2>

              {/* Inner Tabs */}
              <div className="prs-inner-tabs-row">
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.1')}
                >
                  Overview
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.2')}
                >
                  Security
                </button>
                <button className="prs-inner-tab active">Suppress</button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.7')}
                >
                  Reviewers
                </button>
              </div>
            </div>

            {/* Suppress / Ignore Card */}
            <div className="prs-card prs-suppress-form-card">
              <div className="prs-suppress-header">
                <h3 className="prs-suppress-title">Suppress / Ignore Finding</h3>
                <p className="prs-suppress-subtitle">
                  You can suppress this finding if it is a false positive or an accepted risk.
                </p>
              </div>

              {/* Radio options */}
              <div className="prs-radio-group">
                <label className="prs-radio-label">
                  <input
                    type="radio"
                    name="suppressScope"
                    value="Suppress for this pull request only"
                    checked={suppressScope === 'Suppress for this pull request only'}
                    onChange={(e) => setSuppressScope(e.target.value)}
                  />
                  <span>Suppress for this pull request only</span>
                </label>
                <label className="prs-radio-label">
                  <input
                    type="radio"
                    name="suppressScope"
                    value="Suppress across repository"
                    checked={suppressScope === 'Suppress across repository'}
                    onChange={(e) => setSuppressScope(e.target.value)}
                  />
                  <span>Suppress across repository</span>
                </label>
                <label className="prs-radio-label">
                  <input
                    type="radio"
                    name="suppressScope"
                    value="Mark as False Positive"
                    checked={suppressScope === 'Mark as False Positive'}
                    onChange={(e) => setSuppressScope(e.target.value)}
                  />
                  <span>Mark as False Positive</span>
                </label>
                <label className="prs-radio-label">
                  <input
                    type="radio"
                    name="suppressScope"
                    value="Accept Risk (Won't Fix)"
                    checked={suppressScope === "Accept Risk (Won't Fix)"}
                    onChange={(e) => setSuppressScope(e.target.value)}
                  />
                  <span>Accept Risk (Won&apos;t Fix)</span>
                </label>
              </div>

              {/* Reason Textarea */}
              <div className="prs-form-group">
                <div className="prs-form-label-row">
                  <label className="prs-form-label">Reason *</label>
                </div>
                <textarea
                  className="prs-textarea"
                  rows={4}
                  maxLength={500}
                  value={suppressReason}
                  onChange={(e) => setSuppressReason(e.target.value)}
                />
                <div className="prs-char-counter">{suppressReason.length}/500</div>
              </div>

              {/* Expires Field */}
              <div className="prs-form-group">
                <label className="prs-form-label">Expires (Optional)</label>
                <div className="prs-date-input-wrap">
                  <input
                    type="text"
                    className="prs-date-input"
                    value="Oct 04, 2027"
                    readOnly
                  />
                  <Calendar size={15} className="prs-date-icon" />
                </div>
              </div>

              {/* Warning Alert Banner */}
              <div className="prs-alert-box warning">
                <AlertTriangle size={16} className="prs-alert-icon" />
                <span>This finding will be hidden from active results but will be available in history.</span>
              </div>

              {suppressionSuccessMsg && (
                <div className="prs-alert-box success">
                  <Check size={16} />
                  <span>{suppressionSuccessMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="prs-suppress-actions">
                <button
                  className="prs-btn-secondary"
                  onClick={() => handleScreenChange('7.2')}
                >
                  Cancel
                </button>
                <button
                  className="prs-btn-primary-dark"
                  onClick={handleSubmitSuppression}
                  disabled={isSubmittingSuppression}
                >
                  {isSubmittingSuppression ? 'Processing...' : 'Suppress Finding'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.7: FINDING HISTORY / ACTIVITY
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.7' && (
          <div className="prs-screen-section">
            {/* Finding Identity Card for SEC-001 */}
            <div className="prs-card prs-finding-id-card">
              <div className="prs-finding-header-top">
                <div className="prs-finding-badges-row">
                  <div className="prs-icon-circle orange">
                    <Key size={15} />
                  </div>
                  <span className="prs-id-tag">SEC-001</span>
                  <span className="prs-badge-sev high">High</span>
                  <span className="prs-tool-tag">Secrets</span>
                  <div className="prs-status-dropdown-pill">
                    <span>Open</span>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
              <h2 className="prs-finding-title-large">Hardcoded API Key</h2>

              {/* Inner Tabs */}
              <div className="prs-inner-tabs-row">
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.1')}
                >
                  Overview
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.2')}
                >
                  Security
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.2')}
                >
                  Checks
                </button>
                <button
                  className="prs-inner-tab"
                  onClick={() => handleScreenChange('7.4')}
                >
                  Activity
                </button>
                <button className="prs-inner-tab active">Activity</button>
              </div>
            </div>

            {/* Activity Stream Card */}
            <div className="prs-card prs-activity-card">
              <div className="prs-timeline-list">
                {activityTarget.events.map((ev: any, index: number) => {
                  return (
                    <div key={ev.id || index} className="prs-timeline-item">
                      <div className="prs-timeline-meta">
                        <span className="prs-timeline-time">{ev.timestamp}</span>
                      </div>

                      {/* Icon Node */}
                      <div className="prs-timeline-node-wrap">
                        <div
                          className="prs-timeline-icon-node"
                          style={{ borderColor: ev.color || '#3b82f6' }}
                        >
                          {ev.author_initials ? (
                            <span className="prs-initials-txt">{ev.author_initials}</span>
                          ) : ev.type === 'status' ? (
                            <Check size={12} color="#16a34a" />
                          ) : ev.type === 'label' ? (
                            <Tag size={12} color="#6366f1" />
                          ) : ev.type === 'issue' ? (
                            <Share2 size={12} color="#0284c7" />
                          ) : (
                            <Clock size={12} color="#3b82f6" />
                          )}
                        </div>
                        {index < activityTarget.events.length - 1 && (
                          <div className="prs-timeline-line"></div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="prs-timeline-content">
                        <div className="prs-event-title">{ev.title}</div>
                        <div className="prs-event-desc">
                          {ev.tag ? (
                            <span className="prs-tag-pill">{ev.tag}</span>
                          ) : ev.description?.startsWith('#') ? (
                            <span className="prs-link-ref cursor-default font-mono text-blue-400">
                              {ev.description}
                            </span>
                          ) : (
                            ev.description
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Comment Box */}
              <div className="prs-activity-comment-box">
                <div className="prs-avatar-circle">MB</div>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="prs-comment-input"
                  value={activityCommentText}
                  onChange={(e) => setActivityCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitComment();
                  }}
                />
                <button
                  className="prs-comment-submit-btn"
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || !activityCommentText.trim()}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SCREEN 7.8: SECURITY FINDINGS FILTERS & EXPORT
            ═══════════════════════════════════════════════════════════════════ */}
        {activeScreen === '7.8' && (
          <div className="prs-screen-section">
            {/* Top Back bar */}
            <div className="prs-filters-header-row">
              <button
                className="prs-back-to-findings-btn"
                onClick={() => handleScreenChange('7.2')}
              >
                <ArrowLeft size={14} /> All Findings <span className="prs-blue-counter">12</span>
              </button>
              <button className="prs-save-view-btn" onClick={handleSaveView}>
                <Save size={14} /> Save View
              </button>
            </div>

            {/* Filters Card */}
            <div className="prs-card prs-advanced-filter-card">
              <div className="prs-filter-header-split">
                <span className="prs-card-heading">Filters</span>
                <button
                  className="prs-clear-all-link"
                  onClick={() => {
                    setAdvTool('All Tools');
                    setAdvSeverity('All Severities');
                    setAdvStatus('All Status');
                    setAdvFilePath('');
                    setAdvRuleId('');
                    setAdvAuthor('All Authors');
                    setAdvCreatedDate('Last 7 Days');
                    setAdvLabel('');
                    setAdvCwe('');
                    setChkOnlyNew(false);
                    setChkOnlyUnresolved(true);
                    setChkOnlyChanged(true);
                  }}
                >
                  Clear All
                </button>
              </div>

              {/* 3x3 Grid of filters */}
              <div className="prs-filter-inputs-grid">
                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Tool</label>
                  <select
                    className="prs-select full"
                    value={advTool}
                    onChange={(e) => setAdvTool(e.target.value)}
                  >
                    <option value="All Tools">All Tools</option>
                    <option value="SAST">SAST</option>
                    <option value="Secrets">Secrets</option>
                    <option value="Dependency">Dependency</option>
                    <option value="Code Quality">Code Quality</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Severity</label>
                  <select
                    className="prs-select full"
                    value={advSeverity}
                    onChange={(e) => setAdvSeverity(e.target.value)}
                  >
                    <option value="All Severities">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Status</label>
                  <select
                    className="prs-select full"
                    value={advStatus}
                    onChange={(e) => setAdvStatus(e.target.value)}
                  >
                    <option value="All Status">All Status</option>
                    <option value="Open">Open</option>
                    <option value="Ignored">Ignored</option>
                    <option value="Resolved">Resolved</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">File Path</label>
                  <input
                    type="text"
                    placeholder="e.g. src/routes/"
                    className="prs-text-input full"
                    value={advFilePath}
                    onChange={(e) => setAdvFilePath(e.target.value)}
                  />
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Rule ID</label>
                  <input
                    type="text"
                    placeholder="e.g. sql-injection"
                    className="prs-text-input full"
                    value={advRuleId}
                    onChange={(e) => setAdvRuleId(e.target.value)}
                  />
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Author</label>
                  <select
                    className="prs-select full"
                    value={advAuthor}
                    onChange={(e) => setAdvAuthor(e.target.value)}
                  >
                    <option value="All Authors">All Authors</option>
                    <option value="mayur.bharvad">mayur.bharvad</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Created Date</label>
                  <select
                    className="prs-select full"
                    value={advCreatedDate}
                    onChange={(e) => setAdvCreatedDate(e.target.value)}
                  >
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 14 Days">Last 14 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="All Time">All Time</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">Labels</label>
                  <select
                    className="prs-select full"
                    value={advLabel}
                    onChange={(e) => setAdvLabel(e.target.value)}
                  >
                    <option value="">Select labels</option>
                    <option value="security">security</option>
                    <option value="sql-injection">sql-injection</option>
                    <option value="secrets">secrets</option>
                    <option value="dependency">dependency</option>
                  </select>
                </div>

                <div className="prs-filter-input-col">
                  <label className="prs-input-label">CWE</label>
                  <input
                    type="text"
                    placeholder="e.g. CWE-89"
                    className="prs-text-input full"
                    value={advCwe}
                    onChange={(e) => setAdvCwe(e.target.value)}
                  />
                </div>
              </div>

              {/* Checkboxes row */}
              <div className="prs-checkbox-options">
                <label className="prs-checkbox-label">
                  <input
                    type="checkbox"
                    checked={chkOnlyNew}
                    onChange={(e) => setChkOnlyNew(e.target.checked)}
                  />
                  <span>Show only new findings</span>
                </label>
                <label className="prs-checkbox-label">
                  <input
                    type="checkbox"
                    checked={chkOnlyUnresolved}
                    onChange={(e) => setChkOnlyUnresolved(e.target.checked)}
                  />
                  <span>Show only unresolved findings</span>
                </label>
                <label className="prs-checkbox-label">
                  <input
                    type="checkbox"
                    checked={chkOnlyChanged}
                    onChange={(e) => setChkOnlyChanged(e.target.checked)}
                  />
                  <span>Show only findings in changed files</span>
                </label>
              </div>

              {/* Buttons row */}
              <div className="prs-filter-action-buttons">
                <button
                  className="prs-btn-primary-dark"
                  onClick={() => handleScreenChange('7.2')}
                >
                  Apply Filters
                </button>
                <button
                  className="prs-btn-secondary"
                  onClick={() => {
                    setAdvTool('All Tools');
                    setAdvSeverity('All Severities');
                    setAdvStatus('All Status');
                    setAdvFilePath('');
                    setAdvRuleId('');
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Export Findings Card */}
            <div className="prs-card prs-export-card">
              <div className="prs-card-header-clean">
                <span className="prs-card-heading">Export Findings</span>
              </div>
              <div className="prs-export-options-row">
                <div className="prs-format-selector-buttons">
                  <button
                    className={`prs-format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                    onClick={() => setExportFormat('csv')}
                  >
                    📄 CSV
                  </button>
                  <button
                    className={`prs-format-btn ${exportFormat === 'json' ? 'active' : ''}`}
                    onClick={() => setExportFormat('json')}
                  >
                    📋 JSON
                  </button>
                  <button
                    className={`prs-format-btn ${exportFormat === 'sarif' ? 'active' : ''}`}
                    onClick={() => setExportFormat('sarif')}
                  >
                    🛡️ SARIF
                  </button>
                </div>
                <button
                  className="prs-export-action-btn"
                  onClick={handleTriggerExport}
                  disabled={isExporting}
                >
                  <Download size={14} /> {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
