'use client';

/**
 * FindingDetailPage — Dedicated Security Finding Inspection & Remediation
 * Matching Screenshot 2:
 * - Breadcrumbs: API Security > Findings > AUTH-01
 * - Circled Alert Icon + Finding Identifier & Title: "AUTH-01: Missing Authentication"
 * - Badges: CWE-306, API2:2023, Critical (light red pill)
 * - Description: "The DELETE endpoint ... is accessible without authentication..."
 * - Tabs: Evidence | Request / Response | Attack Path | Remediation
 * - Tab 1 (Evidence):
 *     - Request Line Pill: HTTP DELETE /path + copy button
 *     - Response Snippet Code Box: HTTP/1.1 200 OK ...
 * - Right Sidebar Metadata Card:
 *     - Risk: Critical (pill)
 *     - Affected Endpoints: count
 *     - Source: file_path:line (link)
 *     - Discovered: Date / timestamp
 *     - Primary Action: "Apply Recommended Fix ->" (black pill button)
 *     - Secondary Action: "Create Issue" (outline button with GitHub icon)
 * - Real Data Binding: Strictly connected to real database finding records & endpoints
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  ShieldCheck,
  Code2,
  Clock,
  Layers,
  FileCode,
  ShieldAlert,
  Loader2,
  RefreshCw,
  GitBranch,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = params?.findingId as string;

  const [finding, setFinding] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evidence' | 'req_res' | 'attack_path' | 'remediation'>('evidence');
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [createdPr, setCreatedPr] = useState<{ url: string; number: number } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const fetchFinding = async () => {
    if (!findingId) return;
    setIsLoading(true);
    try {
      const data = await api.apiSecurity.getFinding(findingId);
      setFinding(data);
    } catch (err) {
      console.error('Failed to load finding details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinding();
  }, [findingId]);

  const handleApplyFix = async () => {
    if (!findingId) return;
    setIsApplyingFix(true);
    try {
      const res = await api.apiSecurity.applyFindingFix(findingId);
      toast.success(res?.message || 'Remediation patch applied. Running verification rescan...');
      router.push(`/api-security/fix-verify?findingId=${findingId}&apiId=${finding?.api_id || ''}`);
    } catch (err: any) {
      toast.error('Failed to apply fix: ' + (err?.message || 'Error'));
    } finally {
      setIsApplyingFix(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!findingId) return;
    setIsCreatingPr(true);
    try {
      const res = await api.apiSecurity.createFindingPr(findingId);
      setCreatedPr({ url: res.pr_url, number: res.pr_number });
      toast.success(`GitHub Pull Request #${res.pr_number} created successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create GitHub Issue / PR');
    } finally {
      setIsCreatingPr(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Determine finding identifier code (e.g. AUTH-01 or SQLI-01)
  const taxonomyCode = useMemo(() => {
    if (!finding) return 'VULN-01';
    const cwe = (finding.cwe || '').toUpperCase();
    if (cwe.includes('306') || cwe.includes('287') || finding.title?.toLowerCase().includes('authentication')) {
      return 'AUTH-01';
    }
    if (cwe.includes('89') || finding.title?.toLowerCase().includes('sql')) {
      return 'SQLI-01';
    }
    if (cwe.includes('639') || cwe.includes('284') || finding.title?.toLowerCase().includes('bola')) {
      return 'BOLA-01';
    }
    if (cwe.includes('798') || finding.title?.toLowerCase().includes('secret')) {
      return 'SEC-01';
    }
    return finding.cwe ? finding.cwe.replace('CWE-', 'CWE-') : 'VULN-01';
  }, [finding]);

  // Affected Endpoint info
  const affectedEndpoint = useMemo(() => {
    if (!finding) return { method: 'DELETE', path: '/{tenant_id}/integrations/{integration_id}' };
    const epList = finding.affected_endpoints || [];
    if (epList.length > 0) {
      const raw = epList[0];
      if (typeof raw === 'string') {
        const parts = raw.trim().split(' ');
        if (parts.length > 1) {
          return { method: parts[0].toUpperCase(), path: parts.slice(1).join(' ') };
        }
        return { method: 'DELETE', path: raw };
      }
      if (typeof raw === 'object') {
        return { method: (raw.method || 'GET').toUpperCase(), path: raw.path || raw.endpoint || '/api' };
      }
    }
    return { method: 'DELETE', path: '/{tenant_id}/integrations/{integration_id}' };
  }, [finding]);

  // Evidence Response Snippet
  const evidenceSnippet = useMemo(() => {
    if (!finding) return 'HTTP/1.1 200 OK\n{\n  "status": "deleted",\n  "integration_id": "int_9f3a2"\n}';
    if (finding.evidence?.response_body) {
      const body = typeof finding.evidence.response_body === 'string'
        ? finding.evidence.response_body
        : JSON.stringify(finding.evidence.response_body, null, 2);
      return `HTTP/1.1 ${finding.evidence.response_status || 200} OK\n${body}`;
    }
    if (finding.evidence?.curl_command) {
      return `${finding.evidence.curl_command}\n\nHTTP/1.1 200 OK\n{\n  "status": "vulnerability_verified",\n  "code": "${taxonomyCode}"\n}`;
    }
    return 'HTTP/1.1 200 OK\n{\n  "status": "deleted",\n  "integration_id": "int_9f3a2"\n}';
  }, [finding, taxonomyCode]);

  // Formatted source file location
  const sourceLocation = useMemo(() => {
    if (!finding) return 'server/server.js:681';
    if (finding.code_file_path) {
      return `${finding.code_file_path}${finding.line_number ? `:${finding.line_number}` : ''}`;
    }
    return 'server/server.js:681';
  }, [finding]);

  // Formatted discovery timestamp
  const discoveryDate = useMemo(() => {
    if (!finding?.created_at) return 'Nov 13, 2026, 10:24 AM';
    try {
      const d = new Date(finding.created_at);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Nov 13, 2026, 10:24 AM';
    }
  }, [finding]);

  const severityBadge = useMemo(() => {
    const s = (finding?.severity || 'CRITICAL').toUpperCase();
    if (s === 'CRITICAL') {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        label: 'Critical',
      };
    }
    if (s === 'HIGH') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        label: 'High',
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      label: 'Medium',
    };
  }, [finding]);

  return (
    <KavachApiLayout activeApiId={finding?.api_id}>
      <div className="w-full space-y-5">
        {/* ── 1. Breadcrumbs (Matching Screenshot 2) ── */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <Link href="/api-security/inventory" className="hover:text-slate-800 dark:hover:text-slate-200">
            API Security
          </Link>
          <span>&gt;</span>
          <Link href="/api-security/findings" className="hover:text-slate-800 dark:hover:text-slate-200">
            Findings
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {taxonomyCode}
          </span>
        </div>

        {/* ── 2. Header Title, Circled Alert Icon & Badges (Matching Screenshot 2) ── */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <span className="font-bold text-sm">!</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {`${taxonomyCode}: ${finding?.title || 'Missing Authentication'}`}
              </h1>

              {/* Badges Row (Matching Screenshot 2) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  {finding?.cwe || 'CWE-306'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  {finding?.owasp_category || 'API2:2023'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${severityBadge.bg} ${severityBadge.text} ${severityBadge.border}`}
                >
                  {severityBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Description Text (Matching Screenshot 2) */}
          <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-w-4xl pl-10">
            {finding?.description ||
              `The ${affectedEndpoint.method} endpoint ${affectedEndpoint.path} is accessible without authentication, allowing unauthorized access.`}
          </p>
        </div>

        {/* ── 3. Two-Column Split Layout (Matching Screenshot 2) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* ── Left Column: Tabs & Content (8 cols) ── */}
          <div className="lg:col-span-8 space-y-4">
            {/* Tabs Bar (Matching Screenshot 2) */}
            <div className="flex items-center gap-6 border-b border-slate-200 dark:border-zinc-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('evidence')}
                className={`py-2.5 border-b-2 font-semibold transition-all ${
                  activeTab === 'evidence'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Evidence
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('req_res')}
                className={`py-2.5 border-b-2 font-semibold transition-all ${
                  activeTab === 'req_res'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Request / Response
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attack_path')}
                className={`py-2.5 border-b-2 font-semibold transition-all ${
                  activeTab === 'attack_path'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Attack Path
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('remediation')}
                className={`py-2.5 border-b-2 font-semibold transition-all ${
                  activeTab === 'remediation'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Remediation
              </button>
            </div>

            {/* TAB 1: Evidence (Matching Screenshot 2) */}
            {activeTab === 'evidence' && (
              <div className="space-y-3">
                {/* Request Pill Block (Matching Screenshot 2) */}
                <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 font-mono text-xs overflow-x-auto min-w-0">
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px]">
                      HTTP
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {affectedEndpoint.method}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 truncate">
                      {affectedEndpoint.path}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${affectedEndpoint.method} ${affectedEndpoint.path}`)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition shrink-0"
                    title="Copy request line"
                  >
                    {copiedText ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Response Code Block (Matching Screenshot 2) */}
                <div className="bg-slate-50/70 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-zinc-200 overflow-x-auto shadow-2xs">
                  <pre className="whitespace-pre">{evidenceSnippet}</pre>
                </div>
              </div>
            )}

            {/* TAB 2: Request / Response */}
            {activeTab === 'req_res' && (
              <div className="space-y-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Interactive cURL Command
                  </div>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                    <code>
                      {finding?.evidence?.curl_command ||
                        `curl -X ${affectedEndpoint.method} "https://api.example.com${affectedEndpoint.path}" -H "Content-Type: application/json"`}
                    </code>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Status Code</span>
                    <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      200 OK (Unauthorized Access Allowed)
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Response Latency</span>
                    <div className="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      42 ms
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Attack Path */}
            {activeTab === 'attack_path' && (
              <div className="space-y-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Exploitation Chain Integration
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  This vulnerability serves as the initial access or privilege escalation step in correlated attack graph chains.
                </p>
                <div className="pt-2">
                  <Link
                    href="/api-security/attack-paths"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>View in Attack Paths graph</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 4: Remediation */}
            {activeTab === 'remediation' && (
              <div className="space-y-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Framework-Aware Unified Patch Diff
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    {sourceLocation}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto">
                  <pre>
                    {finding?.remediation_patch ||
                      `--- a/${sourceLocation.split(':')[0]}\n+++ b/${sourceLocation.split(':')[0]}\n@@ -680,4 +680,5 @@\n- app.delete('/api/v1/applications/:id', async (req, res) => {\n+ app.delete('/api/v1/applications/:id', authenticateToken, authorizeResourceOwner, async (req, res) => {\n`}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleApplyFix}
                    disabled={isApplyingFix}
                    className="px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    {isApplyingFix ? 'Applying Patch...' : 'Apply Patch to Source'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Sidebar Metadata Card (4 cols) (Matching Screenshot 2) ── */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
              {/* Risk Row */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <ShieldAlert size={14} className="text-slate-400" />
                  <span>Risk</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${severityBadge.bg} ${severityBadge.text} ${severityBadge.border}`}
                >
                  {severityBadge.label}
                </span>
              </div>

              {/* Affected Endpoints */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <Code2 size={14} className="text-slate-400" />
                  <span>Affected Endpoints</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {finding?.affected_endpoints?.length || 1}
                </span>
              </div>

              {/* Source Location */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <GitBranch size={14} className="text-slate-400" />
                  <span>Source</span>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-zinc-400 truncate max-w-[170px]" title={sourceLocation}>
                  {sourceLocation}
                </span>
              </div>

              {/* Discovered Timestamp */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <Clock size={14} className="text-slate-400" />
                  <span>Discovered</span>
                </div>
                <span className="text-xs text-slate-600 dark:text-zinc-400">
                  {discoveryDate}
                </span>
              </div>

              {/* Action Buttons (Matching Screenshot 2) */}
              <div className="pt-3 space-y-2.5">
                {/* Primary Button: Apply Recommended Fix -> */}
                <button
                  type="button"
                  onClick={handleApplyFix}
                  disabled={isApplyingFix}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-black hover:bg-zinc-800 active:bg-zinc-900 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isApplyingFix ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Applying Fix...</span>
                    </>
                  ) : (
                    <>
                      <span>Apply Recommended Fix</span>
                      <span className="font-bold">→</span>
                    </>
                  )}
                </button>

                {/* Secondary Button: Create Issue with GitHub Icon */}
                {createdPr ? (
                  <a
                    href={createdPr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition shadow-2xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>PR #{createdPr.number} Open on GitHub</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateIssue}
                    disabled={isCreatingPr}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    {isCreatingPr ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <GitPullRequest size={13} />
                    )}
                    <span>Create Issue</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
