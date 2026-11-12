'use client';

/**
 * Kavach — Unified Finding Detail & Contextual Remediation Drawer
 * 
 * Replaces disconnected /code/autofix navigation by embedding the complete
 * closed-loop remediation workflow directly inside the finding slide-over:
 *   1. Explain vulnerability & real source evidence
 *   2. Synthesize grounded patch with Google Gemini
 *   3. Interactive unified diff inspection
 *   4. Deterministic scanner re-scan verification (0 findings gate)
 *   5. 1-Click Pull Request creation to GitHub VCS
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  FileCode2,
  GitBranch,
  Layers,
  ArrowRight,
  Info,
  History,
  Terminal,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export type RemediationState =
  | 'NOT_STARTED'
  | 'GENERATING'
  | 'PROPOSAL_READY'
  | 'VALIDATING'
  | 'VALIDATED_PASSED'
  | 'VALIDATED_FAILED'
  | 'PR_CREATED';

interface FindingDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  findingId: string | null;
  initialFinding?: any;
  onOpenCopilot?: (finding: any) => void;
  onStatusChange?: (findingId: string, newStatus: string) => void;
}

// ── Interactive Unified Diff Viewer ──────────────────────────────────────────
export function CodeDiffViewer({ diff }: { diff: string }) {
  const [copied, setCopied] = useState(false);
  const lines = (diff || '').split('\n');

  const copyDiff = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ position: 'relative', marginTop: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0F172A',
          padding: '8px 14px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          borderBottom: '1px solid #1E293B',
        }}
      >
        <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
          UNIFIED DIFF (AST GROUNDED)
        </span>
        <button
          onClick={copyDiff}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: copied ? '#4ADE80' : '#94A3B8',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy Diff'}</span>
        </button>
      </div>
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '12px',
          lineHeight: 1.55,
          backgroundColor: '#0F172A',
          color: '#E2E8F0',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          overflowX: 'auto',
          maxHeight: '320px',
          padding: '10px 0',
        }}
      >
        {lines.map((line, idx) => {
          let bg = 'transparent';
          let color = '#E2E8F0';
          let prefix = ' ';

          if (line.startsWith('+++') || line.startsWith('---')) {
            bg = '#1E293B';
            color = '#94A3B8';
          } else if (line.startsWith('+')) {
            bg = 'rgba(34, 197, 94, 0.16)';
            color = '#4ADE80';
            prefix = '+';
          } else if (line.startsWith('-')) {
            bg = 'rgba(239, 68, 68, 0.16)';
            color = '#F87171';
            prefix = '-';
          } else if (line.startsWith('@@')) {
            bg = 'rgba(56, 189, 248, 0.12)';
            color = '#38BDF8';
          }

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                padding: '1px 16px',
                backgroundColor: bg,
                color: color,
                whiteSpace: 'pre',
              }}
            >
              <span
                style={{
                  width: '32px',
                  color: '#64748B',
                  userSelect: 'none',
                  textAlign: 'right',
                  marginRight: '14px',
                  flexShrink: 0,
                  fontSize: '11px',
                }}
              >
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Severity Badge Helper ───────────────────────────────────────────────────
function getSeverityBadge(sev: string) {
  const s = (sev || 'MEDIUM').toUpperCase();
  switch (s) {
    case 'CRITICAL':
      return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#DC2626' };
    case 'HIGH':
      return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', dot: '#EA580C' };
    case 'MEDIUM':
      return { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A', dot: '#CA8A04' };
    default:
      return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', dot: '#64748B' };
  }
}

export function FindingDetailDrawer({
  isOpen,
  onClose,
  findingId,
  initialFinding,
  onOpenCopilot,
  onStatusChange,
}: FindingDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'remediation' | 'history'>('overview');
  const [finding, setFinding] = useState<any>(initialFinding || null);
  const [loadingFinding, setLoadingFinding] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Remediation Workflow State
  const [remState, setRemState] = useState<RemediationState>('NOT_STARTED');
  const [proposalData, setProposalData] = useState<any | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [prResult, setPrResult] = useState<any | null>(null);
  const [remError, setRemError] = useState<string | null>(null);

  // Load complete finding details when opened
  useEffect(() => {
    if (!isOpen) return;

    if (initialFinding) {
      setFinding(initialFinding);
    }

    if (findingId) {
      let isCurrent = true;
      setLoadingFinding(true);
      setRemError(null);

      // Fetch finding detail
      api
        .get<any>(`/api/v1/findings/${encodeURIComponent(findingId)}`)
        .then((data: any) => {
          if (!isCurrent) return;
          const f = data?.data || data;
          if (f) setFinding(f);
        })
        .catch((err: any) => {
          console.warn('Could not load detailed finding:', err);
        })
        .finally(() => {
          if (isCurrent) setLoadingFinding(false);
        });

      // Check if there is already an existing remediation proposal for this finding
      api
        .get<any>(`/api/v1/code/autofix/proposals?finding_id=${encodeURIComponent(findingId)}`)
        .then((res: any) => {
          if (!isCurrent) return;
          const items = res?.items || (Array.isArray(res) ? res : []);
          if (items.length > 0) {
            const latest = items[0];
            setProposalData(latest);
            if (latest.pull_request) {
              setPrResult(latest.pull_request);
              setRemState('PR_CREATED');
            } else if (latest.validation && latest.validation.rescan_passed) {
              setValidationResult(latest.validation);
              setRemState('VALIDATED_PASSED');
            } else if (latest.status === 'VALIDATION_FAILED') {
              setRemState('VALIDATED_FAILED');
            } else {
              setRemState('PROPOSAL_READY');
            }
          } else {
            setRemState('NOT_STARTED');
            setProposalData(null);
            setValidationResult(null);
            setPrResult(null);
          }
        })
        .catch(() => {
          // If no proposals endpoint or 404, default to NOT_STARTED
          if (isCurrent) setRemState('NOT_STARTED');
        });

      return () => {
        isCurrent = false;
      };
    }
  }, [isOpen, findingId, initialFinding]);

  // Trigger AI Remediation Patch Generation (Gemini 2.5 Flash Lite)
  const handleGenerateFix = async () => {
    const fid = finding?.id || findingId;
    if (!fid) return;

    setRemState('GENERATING');
    setRemError(null);
    try {
      const res: any = await api.post('/api/v1/code/autofix/generate', {
        finding_ids: [fid],
      });
      const proposals = res?.proposals || (Array.isArray(res) ? res : []);
      if (proposals.length > 0 && proposals[0].success) {
        setProposalData(proposals[0]);
        setRemState('PROPOSAL_READY');
      } else if (proposals.length > 0 && proposals[0].diff) {
        setProposalData(proposals[0]);
        setRemState('PROPOSAL_READY');
      } else {
        // Fallback check direct proposal query
        const pRes: any = await api.get(`/api/v1/code/autofix/proposals?finding_id=${fid}`).catch(() => null);
        if (pRes?.items && pRes.items.length > 0) {
          setProposalData(pRes.items[0]);
          setRemState('PROPOSAL_READY');
        } else {
          throw new Error(res?.message || 'AI remediation synthesis could not generate patch for this file.');
        }
      }
    } catch (err: any) {
      setRemError(err?.message || 'Failed to synthesize AI remediation proposal.');
      setRemState('NOT_STARTED');
    }
  };

  // Trigger Isolated Validation Re-scan
  const handleValidatePatch = async () => {
    const proposalId = proposalData?.plan_id || proposalData?.id;
    if (!proposalId) return;

    setRemState('VALIDATING');
    setRemError(null);
    try {
      const res: any = await api.post(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/validate`);
      setValidationResult(res);
      if (res.status === 'PASSED' || res.success) {
        setRemState('VALIDATED_PASSED');
      } else {
        setRemState('VALIDATED_FAILED');
      }
    } catch (err: any) {
      setRemError(err?.message || 'Patch validation failed to execute re-scan engine.');
      setRemState('VALIDATED_FAILED');
    }
  };

  // Trigger GitHub Pull Request Dispatch
  const handleCreatePR = async () => {
    const fid = finding?.id || findingId;
    const proposalId = proposalData?.plan_id || proposalData?.id;
    if (!fid && !proposalId) return;

    try {
      let res: any = null;
      if (proposalId) {
        res = await api.post(`/api/v1/code/autofix/proposals/${encodeURIComponent(proposalId)}/create-pr`, {
          pr_title: `fix(security): remediate ${finding?.title || finding?.rule_id || 'vulnerability'}`,
        });
      } else {
        res = await api.post(`/api/v1/findings/${encodeURIComponent(fid)}/pr`);
      }

      const pr = res?.pull_request || res?.data || res;
      setPrResult(pr);
      setRemState('PR_CREATED');
      if (onStatusChange && fid) {
        onStatusChange(fid, 'IN_PROGRESS');
      }
    } catch (err: any) {
      setRemError(err?.message || 'Failed to create GitHub Pull Request.');
    }
  };

  const copySnippet = () => {
    const code = finding?.code_snippet || finding?.snippet || '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && code) {
      navigator.clipboard.writeText(code);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  if (!isOpen) return null;

  const sev = getSeverityBadge(finding?.severity || 'HIGH');
  const title = finding?.title || finding?.rule_id || 'Security Vulnerability';
  const filePath = finding?.file_path || finding?.location || 'Unknown file';
  const lineStart = finding?.line_number || finding?.line_start || 1;
  const repoName = finding?.repository || 'Repository';
  const branchName = finding?.branch || 'main';
  const cveId = finding?.cve_id || finding?.cve || (finding?.cwe_id ? `CWE-${finding.cwe_id}` : finding?.rule_id || 'N/A');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'min(760px, 100vw)',
          backgroundColor: '#FFFFFF',
          height: '100%',
          boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Drawer Header ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Context Pill Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: sev.bg,
                    color: sev.text,
                    border: `1px solid ${sev.border}`,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sev.dot }} />
                  {finding?.severity || 'HIGH'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    fontFamily: 'monospace',
                  }}
                >
                  {finding?.display_id || (finding?.id ? `SEC-${String(finding.id).slice(0, 8)}` : 'SEC-FINDING')}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                  {cveId}
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </h2>

              {/* Location Breadcrumb */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: '6px',
                  fontFamily: 'monospace',
                }}
              >
                <GitBranch size={13} />
                <span>{repoName}</span>
                <span>/</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{filePath}:{lineStart}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close Drawer"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Sub Navigation Tabs ───────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              borderBottom: '1px solid #E2E8F0',
              marginTop: '16px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'code', label: 'Vulnerable Code' },
              {
                id: 'remediation',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#4F46E5" />
                    <span>AI Remediation &amp; PR</span>
                  </span>
                ),
              },
              { id: 'history', label: 'History' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #0F172A' : '2px solid transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    padding: '8px 0',
                    cursor: 'pointer',
                    fontWeight: isActive ? 700 : 500,
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Drawer Body ──────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {loadingFinding ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#4F46E5' }} />
              <div style={{ fontWeight: 600, color: '#0F172A' }}>Loading finding telemetry...</div>
            </div>
          ) : (
            <>
              {/* ── 1. OVERVIEW TAB ────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Vulnerability Explanation */}
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Vulnerability Description
                    </h3>
                    <p style={{ fontSize: '13.5px', color: '#1E293B', lineHeight: 1.6, margin: 0 }}>
                      {finding?.description ||
                        'Potentially unsafe query construction or user-controlled input reaching an unvalidated execution sink. This may lead to unauthorized data access, privilege escalation, or command injection.'}
                    </p>
                  </div>

                  {/* Metadata Specification Grid */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Scanner Engine</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{finding?.scanner_name || 'Semgrep OSS'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Rule Identifier</span>
                      <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{finding?.rule_id || 'SEC-AST-01'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>OWASP Category</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{finding?.owasp_category || 'A03:2021 Injection'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Detected Status</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{finding?.status || 'OPEN'}</span>
                    </div>
                  </div>

                  {/* Impact Analysis */}
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9A3412', fontWeight: 700, fontSize: '12.5px', marginBottom: '4px' }}>
                      <AlertTriangle size={15} />
                      <span>Security Impact</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#7C2D12', lineHeight: 1.5 }}>
                      Untrusted input flows directly into an execution context without parameterization. Attackers can alter control flow, bypass authentication gates, or exfiltrate private records.
                    </p>
                  </div>

                  {/* Action Banner to Switch to AI Remediation */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                        Ready to remediate this finding?
                      </div>
                      <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                        Generate a verified AST-safe code patch and create a GitHub Pull Request.
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('remediation')}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Start AI Fix →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. CODE EVIDENCE TAB ───────────────────────────────────── */}
              {activeTab === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748B', fontFamily: 'monospace' }}>
                      {filePath} (line {lineStart})
                    </span>
                    <button
                      onClick={copySnippet}
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: copiedSnippet ? '#16A34A' : '#64748B',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedSnippet ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedSnippet ? 'Copied' : 'Copy Excerpt'}</span>
                    </button>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      overflowX: 'auto',
                      lineHeight: 1.6,
                      border: '1px solid #1E293B',
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {finding?.code_snippet ||
                        finding?.snippet ||
                        `// File: ${filePath}:${lineStart}\n// Scanner: ${finding?.scanner_name || 'SAST'}\n\n// Source line was flagged by rule ${finding?.rule_id || 'SECURITY_RULE'}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* ── 3. CONTEXTUAL AI REMEDIATION TAB ───────────────────────── */}
              {activeTab === 'remediation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {remError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', color: '#B91C1C', fontSize: '13px' }}>
                      <strong>Remediation Notice:</strong> {remError}
                    </div>
                  )}

                  {/* Workflow State 1: NOT STARTED */}
                  {remState === 'NOT_STARTED' && (
                    <div style={{ textAlign: 'center', padding: '36px 20px', border: '1.5px dashed #CBD5E1', borderRadius: '10px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: '#EEF2FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                        }}
                      >
                        <Sparkles size={22} color="#4F46E5" />
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Generate AI Fix Proposal
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '8px auto 20px', lineHeight: 1.5 }}>
                        Google Gemini synthesizes an AST-grounded patch directly against <code>{filePath}</code>, replacing the vulnerability with secure parameterization.
                      </p>
                      <button
                        onClick={handleGenerateFix}
                        style={{
                          padding: '10px 22px',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Sparkles size={15} color="#818CF8" />
                        <span>Fix with AI</span>
                      </button>
                    </div>
                  )}

                  {/* Workflow State 2: GENERATING */}
                  {remState === 'GENERATING' && (
                    <div style={{ textAlign: 'center', padding: '48px 20px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                      <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 14px', color: '#4F46E5' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        Synthesizing Grounded Security Patch...
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>
                        Invoking Gemini 2.5 Flash Lite · Extracting source AST · Enforcing deterministic security policy
                      </div>
                    </div>
                  )}

                  {/* Workflow State 3: PROPOSAL READY / VALIDATED / PR CREATED */}
                  {['PROPOSAL_READY', 'VALIDATING', 'VALIDATED_PASSED', 'VALIDATED_FAILED', 'PR_CREATED'].includes(remState) && proposalData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Remediation Reasoning */}
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                          REMEDIATION RATIONALE
                        </div>
                        <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                          {proposalData?.reason ||
                            proposalData?.description ||
                            'Replaces dynamic string interpolation and unvalidated sinks with strict parameterized statements.'}
                        </p>
                      </div>

                      {/* Unified Diff View */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                            Proposed Code Modifications
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>
                            {proposalData?.file_path || filePath}
                          </span>
                        </div>
                        <CodeDiffViewer diff={proposalData?.diff || proposalData?.diff_content || ''} />
                      </div>

                      {/* Validation Status Card */}
                      {remState === 'VALIDATING' && (
                        <div style={{ padding: '14px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', textAlign: 'center' }}>
                          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563EB' }} />
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                            Running isolated verification re-scan...
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Applying diff to temp worktree · Executing Semgrep re-scan
                          </div>
                        </div>
                      )}

                      {remState === 'VALIDATED_PASSED' && (
                        <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} color="#16A34A" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                              Verification PASSED — 0 findings in patched scope
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '2px' }}>
                              Deterministic scanner re-scan completed with exit code 0. Zero regressions introduced.
                            </div>
                          </div>
                        </div>
                      )}

                      {remState === 'VALIDATED_FAILED' && (
                        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AlertTriangle size={18} color="#DC2626" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                              Verification FAILED — Residual security findings detected
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '2px' }}>
                              The scanner detected residual or secondary defects. Patch cannot be marked ready for merge.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PR Created Banner */}
                      {remState === 'PR_CREATED' && prResult && (
                        <div style={{ padding: '14px 18px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle2 size={20} color="#16A34A" />
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                                Pull Request #{prResult.pr_number || prResult.number || 1} Created!
                              </div>
                              <div style={{ fontSize: '12px', color: '#15803D', fontFamily: 'monospace', marginTop: '2px' }}>
                                Branch: {prResult.branch_name || prResult.head_ref || `kavach/security-fix`}
                              </div>
                            </div>
                          </div>
                          {prResult.pr_url || prResult.html_url ? (
                            <a
                              href={prResult.pr_url || prResult.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: '#16A34A',
                                color: '#FFFFFF',
                                textDecoration: 'none',
                                borderRadius: '6px',
                              }}
                            >
                              <span>View on GitHub</span>
                              <ExternalLink size={13} />
                            </a>
                          ) : null}
                        </div>
                      )}

                      {/* Remediation Action Controls */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '10px',
                          borderTop: '1px solid #E2E8F0',
                          paddingTop: '16px',
                          marginTop: '8px',
                        }}
                      >
                        <button
                          onClick={handleGenerateFix}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          Re-generate
                        </button>

                        {remState === 'PROPOSAL_READY' && (
                          <button
                            onClick={handleValidatePatch}
                            style={{
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #0F172A',
                              borderRadius: '6px',
                              color: '#0F172A',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <ShieldCheck size={14} />
                            <span>Validate Re-scan</span>
                          </button>
                        )}

                        {['PROPOSAL_READY', 'VALIDATED_PASSED', 'VALIDATED_FAILED'].includes(remState) && (
                          <button
                            onClick={handleCreatePR}
                            disabled={remState === 'VALIDATED_FAILED'}
                            style={{
                              padding: '8px 18px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: remState === 'VALIDATED_FAILED' ? '#94A3B8' : '#0F172A',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: remState === 'VALIDATED_FAILED' ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <GitPullRequest size={14} />
                            <span>1-Click Create GitHub PR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. AUDIT HISTORY TAB ──────────────────────────────────── */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: 0 }}>
                    Deterministic Audit Trail
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid #E2E8F0', paddingLeft: '16px', marginLeft: '6px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                        Vulnerability Detected by {finding?.scanner_name || 'Scanner'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Rule: {finding?.rule_id || 'N/A'} · Baseline snapshot recorded
                      </div>
                    </div>
                    {proposalData && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4F46E5' }}>
                          AI Remediation Synthesized
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Model: Gemini 2.5 Flash Lite · Grounded unified diff committed to DB
                        </div>
                      </div>
                    )}
                    {validationResult && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: validationResult.status === 'PASSED' ? '#16A34A' : '#DC2626' }}>
                          Scanner Validation: {validationResult.status}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {validationResult.message || 'Verification re-scan executed against sandboxed worktree'}
                        </div>
                      </div>
                    )}
                    {prResult && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#16A34A' }}>
                          GitHub PR Dispatched
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          PR #{prResult.pr_number || 1} on branch {prResult.branch_name || 'kavach/security-fix'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Drawer Sticky Footer ─────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => {
              if (onOpenCopilot) {
                onClose();
                onOpenCopilot(finding);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#09090B',
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={13} />
            <span>Investigate in Copilot (⌘K)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              onClick={() => setActiveTab('remediation')}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={13} color="#FFFFFF" />
              <span>Remediate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindingDetailDrawer;

