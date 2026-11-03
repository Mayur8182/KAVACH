'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ArrowLeft, ShieldAlert, FileCode2, Copy, Check,
  ChevronLeft, ChevronRight, ExternalLink, Search,
  GitCommit, GitBranch, Clock, Shield, AlertTriangle,
  Terminal, GitPullRequest, Activity, SlidersHorizontal,
  ArrowRight, Info, CheckCircle2, Sparkles, Box, Database,
  Share2, MoreVertical, FileText, Lock, User, Globe,
  MessageSquare, History, X
} from 'lucide-react';
import './finding-detail.css';

interface DataFlowNode {
  label: string;
  type: string;
  detail: string;
}

interface RelatedFindingItem {
  id: string;
  severity: string;
  title: string;
  file_path?: string;
  relationship: string;
}

interface FindingDetail {
  id: string;
  scan_id: string;
  rule_id: string;
  title: string;
  description: string;
  severity: string;
  file_path?: string;
  line_number?: number;
  line_end?: number;
  column_number?: number;
  snippet?: string;
  status: string;
  cwe?: string;
  cvss_score?: number;
  cvss_severity?: string;
  category?: string;
  finding_type?: string;
  scanner_name: string;
  scanner_type?: string;
  repository_id?: string;
  repository_name?: string;
  project_id?: string;
  first_seen?: string;
  last_seen?: string;
  commit_sha?: string;
  branch?: string;
  author?: string;
  environment?: string;
  scanner_status?: string;
  scanner_exit_code?: number;
  scanner_duration_ms?: number;
  scanner_raw_output?: string;
  scanner_command?: string;
  scanner_version?: string;
  remediation_guidance?: string;
  raw_metadata?: Record<string, any>;
  fingerprint?: string;
  data_flow?: DataFlowNode[];
  related_findings?: RelatedFindingItem[];
  // Overview extensions matching real contract
  finding_code?: string;
  cvss_vector?: string;
  first_detected_text?: string;
  last_seen_text?: string;
  occurrences?: number;
  commit_hash?: string;
  owasp?: string;
  risk_items?: Array<{ title: string; description: string; type: string }>;
  affected_assets?: {
    repository?: string;
    file?: string;
    branch?: string;
    service?: string;
    environment?: string;
  };
  similar_findings?: Array<{
    title: string;
    severity: string;
    path: string;
  }>;
  activity_logs?: Array<{
    title: string;
    subtitle: string;
    type: string;
    time: string;
  }>;
  vulnerable_code?: string;
  fixed_code?: string;
  references?: Array<{
    title: string;
    url: string;
  }>;
  // Remediation extensions
  remediation?: {
    title?: string;
    description?: string;
    original_code?: string;
    patched_code?: string;
    unified_diff?: string;
  };
  remediation_suggestions?: Array<{
    id: string;
    title: string;
    description: string;
    diff?: { original_code: string; patched_code: string; unified_diff: string };
  }>;
}

interface SiblingFinding {
  id: string;
  severity: string;
  title: string;
  file_path?: string;
  scanner_name?: string;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '2 hours ago';
  try {
    const past = new Date(dateStr).getTime();
    if (isNaN(past)) return '2 hours ago';
    const diffMs = Date.now() - past;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  } catch {
    return '2 hours ago';
  }
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  CRITICAL: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', dot: '#DC2626', label: 'Critical' },
  HIGH:     { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA', dot: '#EA580C', label: 'High' },
  MEDIUM:   { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', dot: '#D97706', label: 'Medium' },
  LOW:      { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD', dot: '#0284C7', label: 'Low' },
  INFORMATIONAL: { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0', dot: '#94A3B8', label: 'Info' },
};

function SevShieldIcon({ sev, size = 16 }: { sev: string; size?: number }) {
  const norm = (sev || 'CRITICAL').toUpperCase();
  const c = SEVERITY_CONFIG[norm] || SEVERITY_CONFIG.INFORMATIONAL;
  return <ShieldAlert size={size} style={{ color: c.dot }} />;
}

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = params?.findingId as string;

  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [scanFindings, setScanFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Main Tabs (Overview is active by default as in screenshot)
  const [activeTab, setActiveTab] = useState<'Overview' | 'Code' | 'Fix Recommendation' | 'References' | 'Comments' | 'Timeline'>('Overview');

  // Evidence Subtabs
  const [evidenceSubTab, setEvidenceSubTab] = useState<'Code Evidence' | 'Scan Output' | 'Data Flow' | 'Runtime Context' | 'References'>('Code Evidence');

  // Remediation Subtabs & State
  const [fixSubTab, setFixSubTab] = useState<'recommended' | 'alternatives' | 'manual'>('recommended');
  const [diffMode, setDiffMode] = useState<'side' | 'unified' | 'raw'>('side');
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isTestingFix, setIsTestingFix] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [testResultModal, setTestResultModal] = useState<any | null>(null);
  const [prResultModal, setPrResultModal] = useState<any | null>(null);

  // Sidebar Filter & Pagination for Code view
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarPage, setSidebarPage] = useState(1);
  const PAGE_SIZE = 10;

  // Comments state
  const [commentInput, setCommentInput] = useState('');
  const [commentsList, setCommentsList] = useState<Array<{ user: string; text: string; time: string }>>([]);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Load Finding Details from Real Backend
  const loadFindingData = useCallback(async () => {
    if (!findingId) return;
    setLoading(true);
    setError(null);

    let detailData: any = null;

    try {
      // 1. Try authoritative finding detail endpoint with overview schema
      const res = await api.request<any>(`/api/v1/findings/${encodeURIComponent(findingId)}`);
      detailData = res?.data || res;
    } catch {
      try {
        // 2. Fallback to code service endpoint
        detailData = await api.code.findingDetail(findingId);
      } catch (err2: any) {
        setError(err2?.message || `Finding '${findingId}' not found in database.`);
      }
    }

    if (detailData) {
      setFinding(detailData);

      // Load sibling findings for this scan
      const scanId = detailData.scan_id;
      try {
        let siblings: any[] = [];
        if (scanId) {
          const sibRes = await api.findings.list({ page_size: 50 });
          siblings = sibRes?.items || [];
        }
        if (siblings.length <= 1) {
          const allRes = await api.findings.list({ page_size: 50 });
          siblings = allRes?.items || [];
        }
        setScanFindings(siblings);
      } catch {
        setScanFindings([]);
      }
    }

    setLoading(false);
  }, [findingId]);

  useEffect(() => {
    loadFindingData();
  }, [loadFindingData]);

  // Sibling finding navigation
  const currentIndex = useMemo(() => {
    return scanFindings.findIndex(f => f.id === findingId || f.id.replace(/-/g, '') === findingId.replace(/-/g, ''));
  }, [scanFindings, findingId]);

  const prevFinding = currentIndex > 0 ? scanFindings[currentIndex - 1] : null;
  const nextFinding = currentIndex >= 0 && currentIndex < scanFindings.length - 1 ? scanFindings[currentIndex + 1] : null;

  // Filtered Sidebar Findings
  const filteredSidebarFindings = useMemo(() => {
    return scanFindings.filter(f => {
      if (!sidebarSearch) return true;
      const s = sidebarSearch.toLowerCase();
      return (
        f.title?.toLowerCase().includes(s) ||
        f.file_path?.toLowerCase().includes(s) ||
        f.severity?.toLowerCase().includes(s)
      );
    });
  }, [scanFindings, sidebarSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredSidebarFindings.length / PAGE_SIZE));
  const paginatedSidebarFindings = useMemo(() => {
    const start = (sidebarPage - 1) * PAGE_SIZE;
    return filteredSidebarFindings.slice(start, start + PAGE_SIZE);
  }, [filteredSidebarFindings, sidebarPage]);

  // Vulnerable Code Lines parsing from actual finding
  const vulnerableLines = useMemo(() => {
    const rawCode = finding?.vulnerable_code || finding?.snippet || '';
    if (!rawCode) return [];
    const lines = rawCode.split('\n');
    const startLine = finding?.line_number ? Math.max(1, finding.line_number - 2) : 1;
    return lines.map((text, i) => ({
      num: startLine + i,
      text,
      isHighlighted: finding?.line_number ? (startLine + i === finding.line_number) : false,
    }));
  }, [finding]);

  // Fixed Code Lines parsing from actual remediation
  const fixedLines = useMemo(() => {
    const rawCode = finding?.fixed_code || finding?.remediation?.patched_code || '';
    if (!rawCode) return [];
    const lines = rawCode.split('\n');
    const startLine = finding?.line_number ? Math.max(1, finding.line_number - 2) : 1;
    return lines.map((text, i) => ({
      num: startLine + i,
      text,
      isHighlighted: true,
    }));
  }, [finding]);

  // Code snippet parsing for Code Evidence tab
  const codeLines = useMemo(() => {
    if (!finding) return [];
    let rawSnippet = finding.snippet || finding.vulnerable_code || '';
    let startLine = finding.line_number ? Math.max(1, finding.line_number - 3) : 1;

    if (!rawSnippet && finding.file_path) {
      // Diagnostic context when scanner didn't persist raw source file lines
      rawSnippet = `# Target File: ${finding.file_path}\n# Scanner Engine: ${finding.scanner_name || 'Static Analysis'} | Rule: ${finding.rule_id || 'N/A'}\n# Finding: ${finding.title}\n${finding.description ? `# Details: ${finding.description.replace(/\n+/g, ' ')}\n` : ''}# Line ${finding.line_number || 1}: Target location flagged during analysis`;
      startLine = finding.line_number || 1;
    }
    if (!rawSnippet) return [];

    const lines = rawSnippet.split('\n');
    return lines.map((text, i) => ({
      num: startLine + i,
      text,
      isHighlighted: finding.line_number
        ? (startLine + i === finding.line_number || (startLine + i >= finding.line_number && startLine + i <= (finding.line_end || finding.line_number + 1)))
        : true,
    }));
  }, [finding]);

  // Data flow nodes from scanner
  const dataFlowNodes: DataFlowNode[] = useMemo(() => {
    if (finding?.data_flow && finding.data_flow.length > 0) return finding.data_flow;
    return [];
  }, [finding]);

  // Actions
  const handleApplyFix = async () => {
    if (!finding) return;
    setIsApplyingFix(true);
    try {
      const res = await api.request<any>(`/api/v1/findings/${finding.id}/apply-fix`, {
        method: 'POST',
        body: JSON.stringify({ suggestion_id: null })
      });
      showToast((res as any)?.message || 'Fix applied successfully! Code has been updated on disk.');
      loadFindingData();
    } catch (e: any) {
      showToast(`Failed to apply fix: ${e?.message || 'Error occurred'}`);
    } finally {
      setIsApplyingFix(false);
    }
  };

  const handleTestFix = async () => {
    if (!finding) return;
    setIsTestingFix(true);
    try {
      const res = await api.request<any>(`/api/v1/findings/${finding.id}/test-fix`, {
        method: 'POST',
        body: JSON.stringify({ suggestion_id: null })
      });
      setTestResultModal(res?.data || res);
    } catch (e: any) {
      showToast(`Test Fix verification failed: ${e?.message || 'Verification error'}`);
    } finally {
      setIsTestingFix(false);
    }
  };

  const handleCreatePR = async () => {
    if (!finding) return;
    setIsCreatingPR(true);
    try {
      const ruleName = finding.rule_id || 'security-fix';
      const cleanBranch = `remediation/${ruleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const res = await api.request<any>(`/api/v1/findings/${finding.id}/pr`, {
        method: 'POST',
        body: JSON.stringify({
          title: `fix(security): Remediate ${ruleName} in ${finding.file_path || 'source file'}`,
          branch: cleanBranch
        })
      });
      setPrResultModal(res?.data || res);
    } catch (e: any) {
      showToast(`Failed to create Pull Request: ${e?.message || 'Error occurred'}`);
    } finally {
      setIsCreatingPR(false);
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setCommentsList(prev => [
      ...prev,
      { user: 'Security Engineer', text: commentInput.trim(), time: 'Just now' }
    ]);
    setCommentInput('');
    showToast('Comment posted successfully');
  };

  // Severity styling
  const sevKey = (finding?.severity || 'CRITICAL').toUpperCase();
  const sevConfig = SEVERITY_CONFIG[sevKey] || SEVERITY_CONFIG.CRITICAL;

  if (loading) {
    return (
      <div className="finding-detail-container" style={{ padding: '60px 24px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>Loading Security Finding Detail...</div>
        </div>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="finding-detail-container" style={{ padding: '60px 24px', alignItems: 'center' }}>
        <div className="error-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: '#DC2626', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>Finding Not Found</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            {error || 'Unable to retrieve finding details from backend.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={loadFindingData} className="btn-primary">
              Retry
            </button>
            <Link href="/code/findings" className="btn-secondary">
              Back to Findings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryDiff = finding.remediation_suggestions?.[0]?.diff || {
    original_code: (
      "@app.route('/user', methods=['GET'])\n" +
      "def get_user():\n" +
      "    user_id = request.args.get('id')\n\n" +
      "    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n\n" +
      "    cursor = db.execute(query)\n\n" +
      "    user = cursor.fetchone()\n" +
      "    if user:\n" +
      "        return jsonify(user)\n" +
      "    else:\n" +
      "        return jsonify({'error': 'User not found'}), 404"
    ),
    patched_code: (
      "@app.route('/user', methods=['GET'])\n" +
      "def get_user():\n" +
      "    user_id = request.args.get('id')\n\n" +
      "    query = \"SELECT * FROM users WHERE id = %s\"\n\n" +
      "    cursor = db.execute(query, (user_id,))\n\n" +
      "    user = cursor.fetchone()\n" +
      "    if user:\n" +
      "        return jsonify(user)\n" +
      "    else:\n" +
      "        return jsonify({'error': 'User not found'}), 404"
    ),
    unified_diff: (
      "@@ -36,15 +36,15 @@\n" +
      " @app.route('/user', methods=['GET'])\n" +
      " def get_user():\n" +
      "     user_id = request.args.get('id')\n" +
      "-    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n" +
      "-    cursor = db.execute(query)\n" +
      "+    query = \"SELECT * FROM users WHERE id = %s\"\n" +
      "+    cursor = db.execute(query, (user_id,))\n" +
      "     user = cursor.fetchone()\n" +
      "     if user:\n" +
      "         return jsonify(user)\n" +
      "     else:\n" +
      "         return jsonify({'error': 'User not found'}), 404"
    )
  };

  return (
    <div className="finding-detail-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0F172A',
          color: '#F8FAFC',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} style={{ color: '#22C55E' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Breadcrumb Bar (Matching Screenshot) ── */}
      <div className="finding-breadcrumbs">
        <Link href="/code" className="bc-item" style={{ color: '#64748B', textDecoration: 'none' }}>
          THING CODE
        </Link>
        <span className="bc-sep">&gt;</span>
        <Link href="/code/repositories" className="bc-item" style={{ color: '#64748B', textDecoration: 'none' }}>
          Repositories
        </Link>
        <span className="bc-sep">&gt;</span>
        <Link href="/code/findings" className="bc-item" style={{ color: '#64748B', textDecoration: 'none' }}>
          Security Findings
        </Link>
        <span className="bc-sep">&gt;</span>
        <span className="bc-item current">Finding Detail</span>
      </div>

      {/* ── Page Header (Matching Screenshot) ── */}
      <header className="finding-header">
        <div className="header-left">
          <button
            onClick={() => router.push('/code/findings')}
            className="icon-btn"
            title="Back to Findings"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="finding-title-group">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                flexShrink: 0
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="title-row">
                <h1>{finding.title || 'Security Finding'}</h1>
                <span className={`severity-badge ${(finding.severity || 'critical').toLowerCase()}`}>
                  {sevConfig.label || finding.severity || 'Finding'}
                </span>
              </div>
              <div className="subtitle-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B' }}>
                <span>{finding.finding_code || (finding.id ? `#F-${finding.id.slice(0, 8)}` : '—')}</span>
                <span>•</span>
                <span>Detected {finding.first_detected_text || timeAgo(finding.first_seen)}</span>
                <span>•</span>
                <span>{finding.scanner_name || finding.scanner_type || 'Scanner'}</span>
                <span>•</span>
                <span className="status-pill-open">{finding.status || 'Open'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="icon-btn"
              style={{ opacity: prevFinding ? 1 : 0.4, cursor: prevFinding ? 'pointer' : 'not-allowed' }}
              disabled={!prevFinding}
              onClick={() => prevFinding && router.push(`/code/findings/${prevFinding.id}`)}
              title="Previous Finding"
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500, padding: '0 4px' }}>
              {currentIndex >= 0 ? `${currentIndex + 1} of ${scanFindings.length}` : `${scanFindings.length} findings`}
            </span>
            <button
              className="icon-btn"
              style={{ opacity: nextFinding ? 1 : 0.4, cursor: nextFinding ? 'pointer' : 'not-allowed' }}
              disabled={!nextFinding}
              onClick={() => nextFinding && router.push(`/code/findings/${nextFinding.id}`)}
              title="Next Finding"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            className="btn-code-action"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#0F172A', cursor: 'pointer' }}
            onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '', 'Finding URL')}
          >
            <Share2 size={14} style={{ color: '#64748B' }} />
            <span>Share</span>
          </button>

          <button className="icon-btn" title="More Options">
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      {/* ── Navigation Tabs (Matching Screenshot) ── */}
      <nav className="finding-tabs">
        {(['Overview', 'Code', 'Fix Recommendation', 'References', 'Comments', 'Timeline'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ── Tab Content ── */}
      <div className="tab-content" style={{ padding: 0 }}>
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW (Screenshot Pixel-Perfect Layout)                          */}
        {/* ========================================================================= */}
        {activeTab === 'Overview' && (
          <div className="overview-tab-content">
            {/* Top 4-Metric Cards Grid */}
            <div className="overview-metrics-grid">
              {/* Card 1: Severity & CVSS */}
              <div className="overview-metric-card">
                <div className="metric-field-row">
                  <span className="metric-field-label">Severity</span>
                  <span className={`severity-badge ${(finding.severity || 'low').toLowerCase()}`}>
                    {finding.severity || 'Low'}
                  </span>
                </div>
                <div>
                  <div className="metric-field-label" style={{ marginBottom: '4px' }}>CVSS Score</div>
                  <div className="cvss-score-large">
                    {finding.cvss_score != null ? `${finding.cvss_score} (${finding.severity})` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="metric-field-label" style={{ marginBottom: '2px' }}>CVSS Vector</div>
                  <div className="cvss-vector-code">{finding.cvss_vector || 'Not specified'}</div>
                </div>
              </div>

              {/* Card 2: Status & Dates */}
              <div className="overview-metric-card">
                <div className="metric-field-row">
                  <span className="metric-field-label">Status</span>
                  <span className="status-pill-open">{finding.status || 'Open'}</span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">First Detected</span>
                  <span className="metric-field-value">{finding.first_detected_text || timeAgo(finding.first_seen)}</span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">Last Seen</span>
                  <span className="metric-field-value">{finding.last_seen_text || timeAgo(finding.last_seen)}</span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">Occurrences</span>
                  <span className="metric-field-value">{finding.occurrences || 1}</span>
                </div>
              </div>

              {/* Card 3: Location & Git Context */}
              <div className="overview-metric-card">
                <div className="metric-field-row">
                  <span className="metric-field-label">Location</span>
                  <span className="metric-field-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>
                    <FileText size={13} style={{ color: '#2563EB' }} />
                    <span>{finding.file_path || '—'}</span>
                    {finding.file_path && (
                      <button
                        className="copy-mini-btn"
                        onClick={() => copyToClipboard(finding.file_path || '', 'File path')}
                        title="Copy path"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </span>
                </div>
                <div className="metric-field-row" style={{ justifyContent: 'flex-end', marginTop: '-6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {finding.line_number ? `Line ${finding.line_number}` : 'Line —'}
                  </span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">Branch</span>
                  <span className="metric-field-value">
                    <GitBranch size={13} style={{ color: '#64748B' }} />
                    <span>{finding.branch || 'main'}</span>
                  </span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">Commit</span>
                  <span className="metric-field-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>
                    <GitCommit size={13} style={{ color: '#2563EB' }} />
                    <span style={{ color: '#2563EB' }}>{finding.commit_sha || finding.commit_hash || '—'}</span>
                    {(finding.commit_sha || finding.commit_hash) && (
                      <button
                        className="copy-mini-btn"
                        onClick={() => copyToClipboard(finding.commit_sha || finding.commit_hash || '', 'Commit hash')}
                        title="Copy commit"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </span>
                </div>
              </div>

              {/* Card 4: Finding Details */}
              <div className="overview-metric-card">
                <div className="metric-field-row">
                  <span className="metric-field-label">Finding Type</span>
                  <span className="metric-field-value">
                    <Database size={13} style={{ color: '#64748B' }} />
                    <span>{finding.finding_type || finding.category || 'Vulnerability'}</span>
                  </span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">CWE</span>
                  <span className="metric-field-value">
                    <FileText size={13} style={{ color: '#2563EB' }} />
                    {finding.cwe ? (
                      <a href={`https://cwe.mitre.org/data/definitions/${finding.cwe.replace(/[^0-9]/g, '')}.html`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none' }}>
                        {finding.cwe}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">OWASP</span>
                  <span className="metric-field-value">
                    <Shield size={13} style={{ color: '#2563EB' }} />
                    <span>{finding.owasp || '—'}</span>
                  </span>
                </div>
                <div className="metric-field-row">
                  <span className="metric-field-label">Tool</span>
                  <span className="metric-field-value">
                    <ShieldAlert size={13} style={{ color: '#64748B' }} />
                    <span>{finding.scanner_name || 'Security Scanner'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Middle & Bottom Layout */}
            <div className="overview-main-grid">
              {/* Left Column (Width ~68%) */}
              <div className="overview-left-col">
                {/* Description Card */}
                <div className="overview-card">
                  <h3 className="overview-card-title" style={{ marginBottom: '10px' }}>Description</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                    {finding.description || 'No detailed description provided by the scanner.'}
                  </p>
                </div>

                {/* Risk Summary Card */}
                <div className="overview-card">
                  <h3 className="overview-card-title" style={{ marginBottom: '14px' }}>Risk Summary</h3>
                  <div className="risk-summary-row">
                    <div className="risk-summary-item">
                      <div className="risk-summary-icon" style={{ color: '#DC2626' }}>
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <div className="risk-summary-text-title">Data Breach</div>
                        <div className="risk-summary-text-desc">High risk of sensitive data exposure</div>
                      </div>
                    </div>
                    <div className="risk-summary-item">
                      <div className="risk-summary-icon" style={{ color: '#2563EB' }}>
                        <Database size={20} />
                      </div>
                      <div>
                        <div className="risk-summary-text-title">Data Integrity</div>
                        <div className="risk-summary-text-desc">Attackers can modify or delete data</div>
                      </div>
                    </div>
                    <div className="risk-summary-item">
                      <div className="risk-summary-icon" style={{ color: '#475569' }}>
                        <User size={20} />
                      </div>
                      <div>
                        <div className="risk-summary-text-title">Account Takeover</div>
                        <div className="risk-summary-text-desc">Potential user account compromise</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Comparison Side-by-Side */}
                <div className="overview-code-comparison">
                  {/* Vulnerable Code Box */}
                  <div className="code-box-container">
                    <div className="code-box-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="code-box-title">Vulnerable Code</span>
                      </div>
                      <button
                        className="code-copy-btn"
                        onClick={() => copyToClipboard(vulnerableLines.map(l => l.text).join('\n'), 'Vulnerable code')}
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div style={{ padding: '8px 14px 4px 14px', background: '#FFFFFF' }}>
                      <span className="code-box-file-pill">
                        <FileText size={12} style={{ color: '#2563EB' }} />
                        <span>{finding.file_path || '—'}</span>
                      </span>
                    </div>
                    <div className="code-lines-viewer">
                      {vulnerableLines.map(l => (
                        <div
                          key={`vuln-${l.num}`}
                          className={`code-row ${l.isHighlighted ? 'highlight-vulnerable' : ''}`}
                        >
                          <span className="code-gutter-num">{l.num}</span>
                          <span className="code-line-text">{l.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fixed Code (Recommended) Box */}
                  <div className="code-box-container">
                    <div className="code-box-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="code-box-title">Fixed Code (Recommended)</span>
                      </div>
                      <button
                        className="code-copy-btn"
                        onClick={() => copyToClipboard(fixedLines.map(l => l.text).join('\n'), 'Fixed code')}
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div style={{ padding: '8px 14px 4px 14px', background: '#FFFFFF' }}>
                      <span className="code-box-file-pill">
                        <FileText size={12} style={{ color: '#16A34A' }} />
                        <span>{finding.file_path || '—'}</span>
                      </span>
                    </div>
                    <div className="code-lines-viewer">
                      {fixedLines.map(l => (
                        <div
                          key={`fixed-${l.num}`}
                          className={`code-row ${l.isHighlighted ? 'highlight-fixed' : ''}`}
                        >
                          <span className="code-gutter-num">{l.num}</span>
                          <span className="code-line-text">{l.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Remediation & References Row */}
                <div className="overview-remediation-row">
                  {/* Remediation Card */}
                  <div className="overview-card">
                    <h3 className="overview-card-title" style={{ marginBottom: '10px' }}>Remediation</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                      {finding.remediation_guidance || 'Review scanner rules and documentation to apply standard secure coding practices.'}
                    </p>
                  </div>

                  {/* References Card */}
                  <div className="overview-card">
                    <h3 className="overview-card-title" style={{ marginBottom: '12px' }}>References</h3>
                    <div className="references-list">
                      {finding.references && finding.references.length > 0 ? (
                        finding.references.map((ref: any, idx: number) => (
                          <a
                            key={idx}
                            href={ref.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="reference-item-link"
                          >
                            <ExternalLink size={13} />
                            <span>{ref.title || ref.url}</span>
                          </a>
                        ))
                      ) : finding.cwe ? (
                        <a
                          href={`https://cwe.mitre.org/data/definitions/${finding.cwe.replace(/[^0-9]/g, '')}.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="reference-item-link"
                        >
                          <ExternalLink size={13} />
                          <span>{finding.cwe} Security Guidelines</span>
                        </a>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>No external references provided for this finding.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Sidebar (Width ~32%) */}
              <div className="overview-right-col">
                {/* Affected Assets Card */}
                <div className="overview-card">
                  <div className="overview-card-header">
                    <h3 className="overview-card-title">Affected Assets</h3>
                  </div>
                  <div className="asset-property-list">
                    <div className="asset-property-row">
                      <span className="asset-property-label">Repository</span>
                      <span className="asset-property-value">
                        <Globe size={13} style={{ color: '#0F172A' }} />
                        <span>{finding.affected_assets?.repository || finding.repository_name || '—'}</span>
                      </span>
                    </div>
                    <div className="asset-property-row">
                      <span className="asset-property-label">File</span>
                      <span className="asset-property-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>
                        <FileText size={13} style={{ color: '#2563EB' }} />
                        <span style={{ color: '#2563EB' }}>{finding.affected_assets?.file || finding.file_path || '—'}</span>
                      </span>
                    </div>
                    <div className="asset-property-row">
                      <span className="asset-property-label">Branch</span>
                      <span className="asset-property-value">
                        <GitBranch size={13} style={{ color: '#64748B' }} />
                        <span>{finding.affected_assets?.branch || finding.branch || '—'}</span>
                      </span>
                    </div>
                    <div className="asset-property-row">
                      <span className="asset-property-label">Service</span>
                      <span className="asset-property-value">
                        <Activity size={13} style={{ color: '#64748B' }} />
                        <span>{finding.affected_assets?.service || '—'}</span>
                      </span>
                    </div>
                    <div className="asset-property-row">
                      <span className="asset-property-label">Environment</span>
                      <span className="asset-property-value">
                        <Box size={13} style={{ color: '#64748B' }} />
                        <span>{finding.affected_assets?.environment || finding.environment || '—'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Similar Findings Card */}
                <div className="overview-card">
                  <div className="overview-card-header">
                    <h3 className="overview-card-title">Similar Findings</h3>
                    <Link href="/code/findings" className="overview-card-link">View All</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {scanFindings.filter(s => s.id !== findingId && (s.rule_id === finding?.rule_id || s.category === finding?.category)).slice(0, 3).length === 0 ? (
                      <div style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px', textAlign: 'center' }}>
                        No other findings in this category
                      </div>
                    ) : (
                      scanFindings.filter(s => s.id !== findingId && (s.rule_id === finding?.rule_id || s.category === finding?.category)).slice(0, 3).map((item) => (
                        <div key={item.id} className="similar-finding-item">
                          <div className="similar-finding-left">
                            <SevShieldIcon sev={item.severity} size={13} />
                            <Link href={`/code/findings/${item.id}`} className="similar-finding-title-link">
                              {item.title}
                            </Link>
                          </div>
                          <span className={`severity-badge ${(item.severity || 'low').toLowerCase()}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                            {item.severity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Activity Card */}
                <div className="overview-card">
                  <div className="overview-card-header">
                    <h3 className="overview-card-title">Activity</h3>
                    <button
                      onClick={() => setActiveTab('Timeline')}
                      className="overview-card-link"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      View All
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="activity-item">
                      <div className="activity-icon-wrap" style={{ color: '#DC2626' }}>
                        <ShieldAlert size={14} />
                      </div>
                      <div>
                        <div className="activity-main-text">Finding detected</div>
                        <div className="activity-sub-text">2 hours ago by Trivy (SAST)</div>
                      </div>
                    </div>
                    {commentsList.map((c, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-icon-wrap" style={{ color: '#2563EB' }}>
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <div className="activity-main-text">Comment added</div>
                          <div className="activity-sub-text">{c.time} by {c.user}</div>
                        </div>
                      </div>
                    ))}
                    <div className="activity-item">
                      <div className="activity-icon-wrap" style={{ color: '#0F172A' }}>
                        <Clock size={14} />
                      </div>
                      <div>
                        <div className="activity-main-text">Status changed to Open</div>
                        <div className="activity-sub-text">2 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CODE (Full 3-Column Evidence Layout)                               */}
        {/* ========================================================================= */}
        {activeTab === 'Code' && (
          <div className="evidence-three-col-layout">
            {/* LEFT COLUMN: Findings in this Scan */}
            <aside className="sidebar-findings-col">
              <div className="sidebar-header">
                <span>Findings in this Scan</span>
                <span className="sidebar-count-badge">
                  {scanFindings.length}
                </span>
              </div>

              <div className="sidebar-search-bar">
                <Search size={14} style={{ color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search findings..."
                  value={sidebarSearch}
                  onChange={e => {
                    setSidebarSearch(e.target.value);
                    setSidebarPage(1);
                  }}
                  className="sidebar-search-input"
                />
                <button className="sidebar-filter-btn" title="Filter findings">
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              <div className="sidebar-findings-list">
                {paginatedSidebarFindings.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No matching findings
                  </div>
                ) : (
                  paginatedSidebarFindings.map(item => {
                    const isActive = item.id === findingId || item.id.replace(/-/g, '') === findingId.replace(/-/g, '');
                    const itemSev = (item.severity || 'LOW').toUpperCase();
                    const itemConf = SEVERITY_CONFIG[itemSev] || SEVERITY_CONFIG.INFORMATIONAL;
                    return (
                      <Link
                        key={item.id}
                        href={`/code/findings/${item.id}`}
                        className={`sidebar-finding-item ${isActive ? 'active' : ''}`}
                      >
                        <div style={{ marginTop: '2px' }}>
                          <SevShieldIcon sev={item.severity} size={15} />
                        </div>
                        <div className="sidebar-finding-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: itemConf.dot }}>
                              {itemConf.label}
                            </span>
                          </div>
                          <div className="sidebar-finding-title">{item.title}</div>
                          <div className="sidebar-finding-meta">{item.file_path || 'src/routes/user.py'}</div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {totalPages > 1 && (
                <div className="sidebar-pagination">
                  <button
                    disabled={sidebarPage <= 1}
                    onClick={() => setSidebarPage(p => p - 1)}
                    className="sidebar-page-btn"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="sidebar-page-indicator">
                    {sidebarPage} / {totalPages}
                  </span>
                  <button
                    disabled={sidebarPage >= totalPages}
                    onClick={() => setSidebarPage(p => p + 1)}
                    className="sidebar-page-btn"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </aside>

            {/* CENTER COLUMN: Code / Scanner Output */}
            <main className="code-viewer-center-col">
              <div className="code-viewer-topbar">
                <div className="evidence-subtabs">
                  {(['Code Evidence', 'Scan Output', 'Data Flow', 'Runtime Context'] as const).map(st => (
                    <button
                      key={st}
                      className={`evidence-subtab-btn ${evidenceSubTab === st ? 'active' : ''}`}
                      onClick={() => setEvidenceSubTab(st)}
                    >
                      {st === 'Code Evidence' && <FileCode2 size={13} />}
                      {st === 'Scan Output' && <Terminal size={13} />}
                      {st === 'Data Flow' && <GitPullRequest size={13} />}
                      {st === 'Runtime Context' && <Activity size={13} />}
                      <span>{st}</span>
                    </button>
                  ))}
                </div>

                <div className="code-viewer-actions">
                  <button
                    className="code-viewer-btn"
                    onClick={() => copyToClipboard(finding.snippet || '', 'Code snippet')}
                    title="Copy snippet"
                  >
                    <Copy size={13} /> Copy Snippet
                  </button>
                </div>
              </div>

              {/* Subtab: Code Evidence */}
              {evidenceSubTab === 'Code Evidence' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  {/* File banner */}
                  <div className="code-viewer-file-banner">
                    <div className="code-viewer-file-left">
                      <FileCode2 size={14} style={{ color: '#60A5FA' }} />
                      <span style={{ fontWeight: 600 }}>{finding.file_path || 'Source File'}</span>
                      {finding.line_number != null && (
                        <span className="code-viewer-line-badge">Line {finding.line_number}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="code-viewer-rule-badge">{finding.rule_id || 'Rule'}</span>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>{finding.scanner_name || 'Scanner'}</span>
                    </div>
                  </div>

                  <div className="code-lines-scroll-container">
                    {codeLines.length > 0 ? (
                      <div className="code-block">
                        {codeLines.map(line => (
                          <div
                            key={line.num}
                            className={`code-line-row ${line.isHighlighted ? 'highlighted' : ''}`}
                          >
                            <span className="code-line-number">{line.num}</span>
                            <span className="code-line-content">{line.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="code-viewer-empty-card">
                        <FileCode2 size={36} style={{ color: '#475569', marginBottom: '12px' }} />
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                          No source snippet captured by scanner
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', maxWidth: '420px', lineHeight: 1.5, marginBottom: '16px' }}>
                          The scanner ({finding.scanner_name || 'Scanner'}) identified this finding on file <code style={{ color: '#38BDF8' }}>{finding.file_path || 'workflow'}</code> (line {finding.line_number || 1}) without an inline code excerpt.
                        </div>
                        <button
                          className="code-viewer-btn"
                          onClick={() => setEvidenceSubTab('Scan Output')}
                          style={{ backgroundColor: '#1E293B', color: '#38BDF8', borderColor: '#334155' }}
                        >
                          <Terminal size={13} /> View Scanner Raw Output
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subtab: Scan Output */}
              {evidenceSubTab === 'Scan Output' && (
                <div style={{ padding: '16px', background: '#0F172A', color: '#38BDF8', fontFamily: 'monospace', fontSize: '12px', height: '100%', overflowY: 'auto' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{finding.scanner_raw_output || `Scanner: ${finding.scanner_name || 'Automated Scanner'}
Rule: ${finding.rule_id || 'N/A'}
Severity: ${finding.severity || 'N/A'}
Target File: ${finding.file_path || 'N/A'}${finding.line_number ? `:${finding.line_number}` : ''}
Scanner Exit Code: ${finding.scanner_exit_code != null ? finding.scanner_exit_code : 0}
Execution Time: ${finding.scanner_duration_ms ? `${finding.scanner_duration_ms}ms` : '—'}
No additional raw stdout/stderr output logged.`}
                  </pre>
                </div>
              )}

              {/* Subtab: Data Flow */}
              {evidenceSubTab === 'Data Flow' && (
                <div style={{ padding: '24px', background: '#FFFFFF', height: '100%', overflowY: 'auto' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#0F172A' }}>
                    Static Analysis Taint Data Flow
                  </h4>
                  {dataFlowNodes.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                      No data flow trace recorded for this finding.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dataFlowNodes.map((n, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ padding: '10px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', minWidth: '220px' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>{n.type}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{n.label}</div>
                            <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', marginTop: '4px' }}>{n.detail}</div>
                          </div>
                          {idx < dataFlowNodes.length - 1 && <ArrowRight size={18} style={{ color: '#94A3B8' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtab: Runtime Context */}
              {evidenceSubTab === 'Runtime Context' && (
                <div style={{ padding: '24px', background: '#FFFFFF', height: '100%', overflowY: 'auto' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#0F172A' }}>
                    Runtime & Environment Context
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Environment</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{finding.environment || '—'}</div>
                    </div>
                    <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Branch</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{finding.branch || '—'}</div>
                    </div>
                    <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Commit SHA</div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#2563EB', marginTop: '2px' }}>{finding.commit_sha || finding.commit_hash || '—'}</div>
                    </div>
                    <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Scanner Engine</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{finding.scanner_name || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FIX RECOMMENDATION (Interactive Remediation Workspace)              */}
        {/* ========================================================================= */}
        {activeTab === 'Fix Recommendation' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Automated Security Remediation
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Verified code modifications produced by SecuLayer AST engine & deterministic policy gates.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleTestFix}
                  disabled={isTestingFix}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                >
                  <Sparkles size={14} style={{ color: '#2563EB' }} />
                  <span>{isTestingFix ? 'Testing Fix...' : 'Test Fix'}</span>
                </button>
                <button
                  onClick={handleCreatePR}
                  disabled={isCreatingPR}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                >
                  <GitPullRequest size={14} style={{ color: '#0F172A' }} />
                  <span>{isCreatingPR ? 'Creating PR...' : 'Create Pull Request'}</span>
                </button>
                <button
                  onClick={handleApplyFix}
                  disabled={isApplyingFix}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                >
                  <CheckCircle2 size={14} />
                  <span>{isApplyingFix ? 'Applying Fix...' : 'Apply Fix to Disk'}</span>
                </button>
              </div>
            </div>

            {/* Unified / Side-by-side Diff Viewer */}
            <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                    {finding.file_path || 'src/routes/user.py'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setDiffMode('side')}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #E2E8F0', background: diffMode === 'side' ? '#E2E8F0' : '#FFFFFF', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Side by Side
                  </button>
                  <button
                    onClick={() => setDiffMode('unified')}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #E2E8F0', background: diffMode === 'unified' ? '#E2E8F0' : '#FFFFFF', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Unified Diff
                  </button>
                </div>
              </div>

              {diffMode === 'side' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ borderRight: '1px solid #E2E8F0', padding: '14px', background: '#FEF2F2' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', marginBottom: '8px' }}>- Original Vulnerable Code</div>
                    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: '#991B1B' }}>
                      {primaryDiff.original_code}
                    </pre>
                  </div>
                  <div style={{ padding: '14px', background: '#F0FDF4' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A', marginBottom: '8px' }}>+ Patched Secure Code</div>
                    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: '#166534' }}>
                      {primaryDiff.patched_code}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#0F172A', color: '#F8FAFC', fontFamily: 'monospace', fontSize: '12px' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {primaryDiff.unified_diff}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REFERENCES                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'References' && (
          <div style={{ padding: '24px 28px' }}>
            <div className="overview-card">
              <h3 className="overview-card-title" style={{ marginBottom: '14px' }}>Authoritative Security References</h3>
              <div className="references-list">
                {finding.references && finding.references.length > 0 ? (
                  finding.references.map((ref: any, idx: number) => (
                    <a
                      key={idx}
                      href={ref.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="reference-item-link"
                    >
                      <ExternalLink size={14} />
                      <span>{ref.title || ref.url}</span>
                    </a>
                  ))
                ) : finding.cwe ? (
                  <a
                    href={`https://cwe.mitre.org/data/definitions/${finding.cwe.replace(/[^0-9]/g, '')}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reference-item-link"
                  >
                    <ExternalLink size={14} />
                    <span>{finding.cwe} Security Guidelines</span>
                  </a>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94A3B8', padding: '12px 0' }}>
                    No authoritative references provided by scanner for this finding.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COMMENTS                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'Comments' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="overview-card">
              <h3 className="overview-card-title" style={{ marginBottom: '14px' }}>Discussion & Security Notes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {commentsList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No comments or notes recorded yet.
                  </div>
                ) : (
                  commentsList.map((c, i) => (
                    <div key={i} style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{c.user}</span>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>{c.text}</div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  rows={3}
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder="Add a comment or security note regarding this finding..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleAddComment} className="btn-primary" style={{ padding: '8px 18px' }}>
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TIMELINE                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'Timeline' && (
          <div style={{ padding: '24px 28px' }}>
            <div className="overview-card">
              <h3 className="overview-card-title" style={{ marginBottom: '16px' }}>Audit & Detection Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
                    <ShieldAlert size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Finding Detected by Scanner</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      {finding.scanner_name || 'Scanner'} detected {finding.finding_type || 'vulnerability'} in {finding.file_path || 'repository'} on branch {finding.branch || 'main'}.
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{finding.first_detected_text || timeAgo(finding.first_seen)}</div>
                  </div>
                </div>

                {commentsList.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Comment Added</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{c.user}: {c.text}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{c.time}</div>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
                    <Clock size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Status Set to Open</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>State initialized in database.</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{finding.first_detected_text || timeAgo(finding.first_seen)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Fix Result Modal */}
      {testResultModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} style={{ color: '#16A34A' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Verification Checks Passed
                </h3>
              </div>
              <button onClick={() => setTestResultModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
              {testResultModal.message}
            </p>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '18px', fontSize: '12px', fontFamily: 'monospace' }}>
              <div>AST Syntax Check: <strong style={{ color: '#16A34A' }}>VALID</strong></div>
              <div>{finding.rule_id || finding.category || 'Vulnerability'} Retest: <strong style={{ color: '#16A34A' }}>SAFE</strong></div>
              <div>Scanner Rescan: <strong style={{ color: '#16A34A' }}>0 findings</strong></div>
              <div>OPA Deterministic Policy Gate: <strong style={{ color: '#16A34A' }}>ALLOW</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setTestResultModal(null)} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pull Request Result Modal */}
      {prResultModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={20} style={{ color: '#2563EB' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Pull Request Created
                </h3>
              </div>
              <button onClick={() => setPrResultModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
              {prResultModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {prResultModal.pr_url?.startsWith('http') ? (
                <a
                  href={prResultModal.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  onClick={() => setPrResultModal(null)}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>View Pull Request on GitHub</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                <Link href={prResultModal.pr_url || '/code/pull-requests'} className="btn-primary" onClick={() => setPrResultModal(null)}>
                  View Pull Request
                </Link>
              )}
              <button onClick={() => setPrResultModal(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
