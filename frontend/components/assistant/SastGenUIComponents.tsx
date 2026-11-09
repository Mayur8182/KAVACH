'use client';

/**
 * Kavach SAST — Generative UI Assistant Components
 * 
 * Interactive schema-driven components rendered inline during AI chat workflows:
 * 1. SastScanExecutionCard — Scan progress, branch, engine, exit status
 * 2. SastCriticalFindingsCard — Ranked high-danger vulnerabilities
 * 3. SastFindingDetailCard — Deep dive with CWE taxonomy & source-sink flow
 * 4. SastRemediationPatchCard — Interactive code diff with Rescan & PR actions
 * 5. SastScanTelemetryCard — Subprocess diagnostics & stdout/stderr stream
 * 
 * Strict adherence to AGENTS.md & GEMINI.md:
 * "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Bug,
  Clock,
  Play,
  Terminal,
  FileCode2,
  GitBranch,
  GitPullRequest,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Check,
  RotateCw,
  FolderGit2,
} from 'lucide-react';

// ── 1. SAST SCAN EXECUTION CARD ──────────────────────────────────────────────
export interface SastScanExecutionProps {
  scanId: string;
  repository: string;
  branch: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  exitCode?: number;
  duration?: string;
  findingsCount: number;
  engine?: string;
  onViewTelemetry?: (scanId: string) => void;
  onViewFindings?: (scanId: string) => void;
}

export function SastScanExecutionCard({
  scanId,
  repository,
  branch,
  status,
  exitCode = 0,
  duration = '18s',
  findingsCount,
  engine = 'Semgrep AST v1.52.0',
  onViewTelemetry,
  onViewFindings,
}: SastScanExecutionProps) {
  const isRunning = status === 'RUNNING';
  const isFailed = status === 'FAILED';
  const isCompleted = status === 'COMPLETED';

  return (
    <div
      style={{
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginTop: '8px',
        maxWidth: '600px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: isCompleted ? '#DCFCE7' : isRunning ? '#EFF6FF' : '#FEF2F2',
              color: isCompleted ? '#16A34A' : isRunning ? '#2563EB' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCompleted ? <CheckCircle2 size={16} /> : isRunning ? <RefreshCw size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              SAST Analysis: {repository}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={11} />
              <span>{branch}</span> &bull; <span>{engine}</span>
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: isCompleted ? '#F0FDF4' : isRunning ? '#EFF6FF' : '#FEF2F2',
            color: isCompleted ? '#16A34A' : isRunning ? '#1D4ED8' : '#DC2626',
            border: `1px solid ${isCompleted ? '#BBF7D0' : isRunning ? '#BFDBFE' : '#FECACA'}`,
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '12px 0', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px' }}>
        <div>
          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Exit Status</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: exitCode === 0 ? '#16A34A' : exitCode === 1 ? '#EA580C' : '#DC2626', marginTop: '2px' }}>
            Code {exitCode} {exitCode === 1 ? '(Flaws)' : exitCode === 0 ? '(Clean)' : '(Error)'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Vulnerabilities</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: findingsCount > 0 ? '#DC2626' : '#16A34A', marginTop: '2px' }}>
            {findingsCount} detected
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Duration</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
            {duration}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
        <Link
          href={`/code/sast/scans`}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            fontSize: '11.5px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Telemetry Stream</span>
          <ExternalLink size={11} />
        </Link>
        <Link
          href="/code/sast/findings"
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '11.5px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>View Findings</span>
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ── 2. CRITICAL FINDINGS CARD ────────────────────────────────────────────────
export interface SastFindingItem {
  id: string;
  title: string;
  severity: string;
  file_path: string;
  line_number?: number;
  cwe?: string;
  rule_id: string;
}

export interface SastCriticalFindingsProps {
  findings: SastFindingItem[];
  repository: string;
  onFixFinding?: (findingId: string) => void;
  onInspectFinding?: (finding: SastFindingItem) => void;
}

export function SastCriticalFindingsCard({
  findings,
  repository,
  onFixFinding,
  onInspectFinding,
}: SastCriticalFindingsProps) {
  return (
    <div
      style={{
        border: '1px solid #FECACA',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.06)',
        marginTop: '8px',
        maxWidth: '650px',
      }}
    >
      <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="#DC2626" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
            High-Danger Code Vulnerabilities ({findings.length})
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 600 }}>
          Repository: {repository}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', divideY: '1px solid #F1F5F9' }}>
        {findings.slice(0, 4).map((f, idx) => (
          <div
            key={f.id || idx}
            style={{
              padding: '12px 16px',
              borderBottom: idx < findings.length - 1 ? '1px solid #F1F5F9' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: f.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED',
                    color: f.severity === 'CRITICAL' ? '#DC2626' : '#EA580C',
                    border: `1px solid ${f.severity === 'CRITICAL' ? '#FECACA' : '#FFEDD5'}`,
                  }}
                >
                  {f.severity}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.title}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: 'monospace' }}>{f.file_path}:{f.line_number || 1}</span>
                {f.cwe && <span>&bull; {f.cwe}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {onInspectFinding && (
                <button
                  type="button"
                  onClick={() => onInspectFinding(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Inspect
                </button>
              )}
              {onFixFinding && (
                <button
                  type="button"
                  onClick={() => onFixFinding(f.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={11} color="#38BDF8" />
                  <span>Fix with AI</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 16px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
        <Link
          href="/code/sast/findings"
          style={{ fontSize: '11.5px', color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span>Open Full Findings Hub</span>
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ── 3. FINDING DETAIL & TAINT FLOW CARD ───────────────────────────────────────
export interface SastFindingDetailProps {
  finding: {
    id: string;
    title: string;
    severity: string;
    rule_id: string;
    file_path: string;
    line_number?: number;
    cwe: string;
    cwe_title?: string;
    owasp?: string;
    confidence?: string;
    reachability?: string;
    source_sink_flow?: Array<{ step: string; location: string; description: string }>;
    remediation_advice?: string;
  };
}

export function SastFindingDetailCard({ finding }: SastFindingDetailProps) {
  return (
    <div
      style={{
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        marginTop: '8px',
        maxWidth: '650px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            {finding.severity}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
            {finding.rule_id}
          </span>
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563EB' }}>
          {finding.cwe_title || finding.cwe}
        </span>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '4px 0 8px 0' }}>
        {finding.title}
      </h3>

      <div style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
        Location: {finding.file_path}:{finding.line_number || 1}
      </div>

      {/* Taint Flow Path */}
      {finding.source_sink_flow && finding.source_sink_flow.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
            Data Flow & Taint Path (Source to Sink)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {finding.source_sink_flow.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontWeight: 700, color: idx === 0 ? '#16A34A' : idx === finding.source_sink_flow!.length - 1 ? '#DC2626' : '#2563EB' }}>
                  {step.step}:
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{step.description}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#64748B' }}>{step.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {finding.remediation_advice && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>Deterministic Remediation:</div>
          <div>{finding.remediation_advice}</div>
        </div>
      )}
    </div>
  );
}

// ── 4. REMEDIATION PATCH CARD ────────────────────────────────────────────────
export interface SastRemediationPatchProps {
  proposalId: string;
  findingTitle: string;
  filePath: string;
  diff: string;
  explanation: string;
  validationStatus?: 'PASSED' | 'FAILED' | 'PENDING';
  prUrl?: string;
  onValidate?: (proposalId: string) => void;
  onCreatePR?: (proposalId: string) => void;
}

export function SastRemediationPatchCard({
  proposalId,
  findingTitle,
  filePath,
  diff,
  explanation,
  validationStatus = 'PENDING',
  prUrl,
  onValidate,
  onCreatePR,
}: SastRemediationPatchProps) {
  const [validating, setValidating] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);

  return (
    <div
      style={{
        border: '1.5px solid #BBF7D0',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
        marginTop: '8px',
        maxWidth: '650px',
      }}
    >
      <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#16A34A" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#14532D' }}>
            Remediation Patch Proposed · {filePath}
          </span>
        </div>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: validationStatus === 'PASSED' ? '#DCFCE7' : '#EFF6FF',
            color: validationStatus === 'PASSED' ? '#15803D' : '#1D4ED8',
          }}
        >
          {validationStatus === 'PASSED' ? 'VERIFIED 0 REGRESSIONS' : 'RESCAN PENDING'}
        </span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
          {explanation}
        </p>

        {/* Syntax Diff Box */}
        <pre
          style={{
            margin: 0,
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            fontFamily: 'monospace',
            fontSize: '11.5px',
            lineHeight: '1.45',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {diff}
        </pre>
      </div>

      <div style={{ padding: '10px 16px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '11px', color: '#64748B' }}>
          Merge Policy: Direct merge disabled. Requires branch PR.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onValidate && validationStatus !== 'PASSED' && (
            <button
              type="button"
              onClick={async () => {
                setValidating(true);
                await onValidate(proposalId);
                setValidating(false);
              }}
              disabled={validating}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: validating ? 'wait' : 'pointer',
              }}
            >
              {validating ? 'Verifying...' : 'Validate Rescan'}
            </button>
          )}

          {onCreatePR && (
            <button
              type="button"
              onClick={async () => {
                setCreatingPR(true);
                await onCreatePR(proposalId);
                setCreatingPR(false);
              }}
              disabled={creatingPR || !!prUrl}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: prUrl ? '#DCFCE7' : '#2563EB',
                color: prUrl ? '#15803D' : '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: creatingPR ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <GitPullRequest size={12} />
              <span>{prUrl ? 'PR Active' : creatingPR ? 'Submitting...' : 'Create Branch PR'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 5. SCAN TELEMETRY CARD ───────────────────────────────────────────────────
export interface SastScanTelemetryProps {
  scanId: string;
  exitCode: number;
  filesScanned: number;
  filesSkipped: number;
  stdoutSnippet: string;
  stderrSnippet?: string;
  onRetry?: (scanId: string) => void;
}

export function SastScanTelemetryCard({
  scanId,
  exitCode,
  filesScanned,
  filesSkipped,
  stdoutSnippet,
  stderrSnippet,
  onRetry,
}: SastScanTelemetryProps) {
  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginTop: '8px',
        maxWidth: '650px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={15} color="#2563EB" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
            Scanner CLI Process Telemetry #{scanId.slice(0, 8)}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: exitCode === 0 ? '#F0FDF4' : exitCode === 1 ? '#FFF7ED' : '#FEF2F2',
            color: exitCode === 0 ? '#16A34A' : exitCode === 1 ? '#EA580C' : '#DC2626',
          }}
        >
          Exit Code {exitCode}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
        Files Scanned: <strong style={{ color: '#0F172A' }}>{filesScanned}</strong> &bull; Skipped: <strong style={{ color: '#0F172A' }}>{filesSkipped}</strong>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#0F172A',
          color: stderrSnippet ? '#FCA5A5' : '#A5F3FC',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.4',
          maxHeight: '180px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {stderrSnippet || stdoutSnippet}
      </pre>

      {onRetry && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => onRetry(scanId)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCw size={12} />
            <span>Re-run Scan</span>
          </button>
        </div>
      )}
    </div>
  );
}
