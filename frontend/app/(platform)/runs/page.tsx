'use client';

/**
 * Kavach — Unified Security Runs Hub (/runs)
 * 
 * Simple, concise execution overview with detailed live terminal logs on demand (/runs/[runId]).
 * Real database persistence · Zero fake runs · Explicit empty, loading, and error states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Play,
  RotateCcw,
  FolderGit2,
  GitBranch,
  GitCommit,
  Shield,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export default function RunsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get<any>('/api/v1/runs?limit=50');
      const data = res?.items || res?.runs || (Array.isArray(res) ? res : []);
      setRuns(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security pipeline runs.');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const filteredRuns = runs.filter((r) => {
    const repoStr = typeof r.repository === 'string' ? r.repository : (r.repository?.name || r.repo_name || '');
    const branchStr = typeof r.branch === 'string' ? r.branch : (r.branch_name || '');
    const runIdStr = r.display_id || String(r.id || '');
    const matchesSearch =
      repoStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branchStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runIdStr.toLowerCase().includes(searchQuery.toLowerCase());

    const rStatus = (r.status || '').toUpperCase();
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'RUNNING' && (rStatus === 'RUNNING' || rStatus === 'IN_PROGRESS')) ||
      (statusFilter === 'COMPLETED' && (rStatus === 'COMPLETED' || rStatus === 'SUCCESS')) ||
      (statusFilter === 'FAILED' && rStatus === 'FAILED');

    return matchesSearch && matchesStatus;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 32px',
        backgroundColor: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
              PIPELINE TELEMETRY
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Security Runs
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Inspect pipeline executions, scanner tool outputs, and real-time execution logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadRuns}
            aria-label="Refresh Runs"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <Link
            href="/runs/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Play size={13} fill="#FFFFFF" />
            <span>New Security Run</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Filter & Search Controls ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Status Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'all', label: 'All Runs' },
            { id: 'RUNNING', label: 'Running' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'FAILED', label: 'Failed' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: '6px',
                  border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search run ID, repo, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '12px',
              color: '#0F172A',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── 3. Error Banner ────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={loadRuns} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: '#991B1B', cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── 4. Main Table / States ─────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#4F46E5' }} />
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>Loading security runs telemetry...</div>
        </div>
      ) : filteredRuns.length === 0 ? (
        <div
          style={{
            padding: '56px 20px',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: '10px',
          }}
        >
          <Terminal size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            No security runs found
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 18px', maxWidth: '380px' }}>
            {runs.length === 0
              ? 'No security scans have been initiated yet. Trigger a run to inspect scanner output and findings.'
              : 'No runs matched the active search or status filter.'}
          </p>
          {runs.length === 0 && (
            <Link
              href="/runs/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              <Play size={12} fill="#FFFFFF" />
              <span>Start Security Scan</span>
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Run Identifier</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Repository &amp; Branch</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scanner Engine</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Findings</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run, idx) => {
                const rStatus = (run.status || 'PENDING').toUpperCase();
                const isRunning = rStatus === 'RUNNING' || rStatus === 'IN_PROGRESS';
                const isCompleted = rStatus === 'COMPLETED' || rStatus === 'SUCCESS';
                const isFailed = rStatus === 'FAILED';

                const repoName = typeof run.repository === 'string' ? run.repository : (run.repository?.name || run.repo_name || 'Repository');
                const branchName = typeof run.branch === 'string' ? run.branch : (run.branch_name || 'main');

                return (
                  <tr
                    key={run.id || idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background 120ms ease',
                    }}
                  >
                    {/* Identifier */}
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      <Link
                        href={`/runs/${run.id}`}
                        style={{ color: '#0F172A', textDecoration: 'none' }}
                      >
                        {run.display_id || `RUN-${String(run.id || '').slice(0, 8)}`}
                      </Link>
                    </td>

                    {/* Repository */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0F172A' }}>
                        <FolderGit2 size={13} color="#64748B" />
                        <span>{repoName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                        <GitBranch size={11} />
                        <span>{branchName}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isCompleted ? '#F0FDF4' : isFailed ? '#FEF2F2' : '#EFF6FF',
                          color: isCompleted ? '#166534' : isFailed ? '#991B1B' : '#1E40AF',
                          border: `1px solid ${isCompleted ? '#BBF7D0' : isFailed ? '#FECACA' : '#BFDBFE'}`,
                        }}
                      >
                        {isCompleted && <CheckCircle2 size={12} color="#16A34A" />}
                        {isFailed && <XCircle size={12} color="#DC2626" />}
                        {isRunning && <RefreshCw size={12} className="animate-spin" color="#2563EB" />}
                        <span>{rStatus}</span>
                      </span>
                    </td>

                    {/* Scanner */}
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>
                        {run.scanner_name || run.tool_name || run.scan_type || 'Semgrep & Gitleaks'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {run.agents_count ? `${run.agents_count} Engines` : 'Automated Scan'}
                      </div>
                    </td>

                    {/* Findings */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {run.findings_count ?? run.findingsCount ?? 0}
                        </span>
                        {(run.critical_count ?? run.criticalCount ?? 0) > 0 && (
                          <span style={{ fontSize: '10.5px', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {run.critical_count ?? run.criticalCount} crit
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: '14px 16px', color: '#64748B', fontFamily: 'monospace', fontSize: '12px' }}>
                      {run.elapsed || run.duration || '—'}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/runs/${run.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#4F46E5',
                          textDecoration: 'none',
                        }}
                      >
                        <span>Logs &amp; Telemetry</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
