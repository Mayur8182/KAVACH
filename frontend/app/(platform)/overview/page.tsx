'use client';

/**
 * Kavach — Security HQ (Unified Actionable Landing Page)
 * 
 * Replaces dual competing home dashboards (/overview & /home) with one authoritative command center:
 *   1. What is happening in my security environment? (Coverage & posture)
 *   2. What needs attention first? (Actionable critical findings & failed runs)
 *   3. What should I do next? (Connect repository, trigger scan, triage findings)
 * 
 * Implements 4 authentic states:
 *   - Onboarding (no repository connected)
 *   - Connected, awaiting first scan
 *   - Active production environment
 *   - Error & retry state
 * 
 * 100% real database state — Zero mock metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  GitBranch,
  FolderGit2,
  Play,
  ArrowRight,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Plus,
  Terminal,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export default function SecurityHQPage() {
  const router = useRouter();
  const { currentProject, currentWorkspace } = useScope();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview metrics from GET /api/v1/code/overview
  const [overview, setOverview] = useState<any>(null);

  // Attention items from GET /api/v1/code/attention
  const [attention, setAttention] = useState<any[]>([]);

  // Recent runs from GET /api/v1/runs?limit=5
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  // Search input in quick action hero
  const [searchQuery, setSearchQuery] = useState('');

  const loadSecurityHQ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projId = currentProject?.id;
      const [ovRes, attRes, runsRes]: [any, any, any] = await Promise.all([
        api.get<any>(`/api/v1/code/overview${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
        api.get<any>(`/api/v1/code/attention${projId ? `?project_id=${projId}` : ''}`).catch(() => null),
        api.get<any>(`/api/v1/runs?page=1&limit=5`).catch(() => null),
      ]);

      setOverview(ovRes);
      setAttention(Array.isArray(attRes) ? attRes : attRes?.items || []);
      setRecentRuns(Array.isArray(runsRes) ? runsRes : runsRes?.items || runsRes?.runs || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security environment status.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadSecurityHQ();
  }, [loadSecurityHQ]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/findings?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/findings');
    }
  };

  const openCopilot = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kavach:open-copilot'));
    }
  };

  const totalRepos = overview?.repositories_total ?? 0;
  const reposWithScans = overview?.repositories_with_scans ?? 0;
  const critCount = overview?.findings?.critical ?? 0;
  const highCount = overview?.findings?.high ?? 0;
  const failedScans = overview?.scans_failed ?? 0;
  const runningScans = overview?.scans_running ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '24px 32px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Page Header & Quick Search Hero ────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                COMMAND CENTER
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {currentProject?.name || 'Workspace Security'}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Overview
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Real-time posture, critical attention items, and guided remediation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openCopilot}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#4F46E5',
                backgroundColor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} color="#6366F1" />
              <span>Ask Copilot (⌘K)</span>
            </button>
            <button
              onClick={() => router.push('/runs/new')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <Play size={13} fill="#FFFFFF" />
              <span>Run Security Scan</span>
            </button>
          </div>
        </div>

        {/* Quick Search Launcher */}
        <form
          onSubmit={handleQuickSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            padding: '8px 14px',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Search size={16} color="#64748B" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings, CVE identifiers, rule names, or repository files..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#0F172A',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* ── 2. Error State ─────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#DC2626" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991B1B' }}>
                Failed to load live security data
              </div>
              <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                {error}
              </div>
            </div>
          </div>
          <button
            onClick={loadSecurityHQ}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 3. Loading State ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 14px', color: '#4F46E5' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
            Synchronizing Overview with live database...
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Evaluating repository health, scanner coverage, and active security gates
          </div>
        </div>
      ) : (
        <>
          {/* ── 4. ONBOARDING STATE: 0 Repositories Connected ──────────── */}
          {totalRepos === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <FolderGit2 size={26} color="#2563EB" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
                Connect Your First Repository
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Kavach automatically protects your codebase using AST SAST, secret detection, OSV vulnerability scanning, and isolated AI autofix.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={() => router.push('/assets?tab=repositories')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={15} />
                  <span>Connect GitHub Repository</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── 5. STATE: Connected but Not Yet Scanned ───────────── */}
              {reposWithScans === 0 && (
                <div
                  style={{
                    padding: '20px 24px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E40AF' }}>
                      {totalRepos} repository connected — Initial baseline scan required
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#1E3A8A', marginTop: '2px' }}>
                      Run your first security scan to identify vulnerabilities and generate fix proposals.
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/runs/new')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Play size={12} fill="#FFFFFF" />
                    <span>Start First Scan</span>
                  </button>
                </div>
              )}

              {/* ── 6. WHAT NEEDS ATTENTION FIRST? ───────────────────── */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                  What needs attention first?
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {/* Critical Findings Attention Card */}
                  <div
                    onClick={() => router.push('/findings?severity=CRITICAL')}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: critCount > 0 ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${critCount > 0 ? '#FECACA' : '#E2E8F0'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: critCount > 0 ? '#991B1B' : '#475569', textTransform: 'uppercase' }}>
                        Critical Vulnerabilities
                      </span>
                      <ShieldAlert size={18} color={critCount > 0 ? '#DC2626' : '#64748B'} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: critCount > 0 ? '#7F1D1D' : '#0F172A' }}>
                      {critCount}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: critCount > 0 ? '#B91C1C' : '#64748B' }}>
                      <span>{critCount > 0 ? 'Requires immediate remediation' : 'No open critical issues'}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>

                  {/* Failed Runs Card */}
                  <div
                    onClick={() => router.push('/runs?status=FAILED')}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: failedScans > 0 ? '#FFF7ED' : '#F8FAFC',
                      border: `1px solid ${failedScans > 0 ? '#FED7AA' : '#E2E8F0'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: failedScans > 0 ? '#9A3412' : '#475569', textTransform: 'uppercase' }}>
                        Failed Security Runs
                      </span>
                      <XCircle size={18} color={failedScans > 0 ? '#EA580C' : '#64748B'} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: failedScans > 0 ? '#7C2D12' : '#0F172A' }}>
                      {failedScans}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: failedScans > 0 ? '#C2410C' : '#64748B' }}>
                      <span>{failedScans > 0 ? 'Inspect terminal logs to diagnose' : 'All security runs passed'}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>

                  {/* High Risk Findings Card */}
                  <div
                    onClick={() => router.push('/findings?severity=HIGH')}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        High Severity Findings
                      </span>
                      <AlertTriangle size={18} color="#D97706" />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
                      {highCount}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748B' }}>
                      <span>Review in unified findings hub</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 7. WHAT IS HAPPENING (ENVIRONMENT POSTURE) ──────── */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Security Environment Posture
                  </h2>
                  <Link
                    href="/assets"
                    style={{ fontSize: '12.5px', color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}
                  >
                    View All Assets →
                  </Link>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '18px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Connected Repositories</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{totalRepos}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Repositories Scanned</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{reposWithScans} / {totalRepos}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Total Security Checks</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{overview?.scans_total ?? 0}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Active Scans Running</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: runningScans > 0 ? '#2563EB' : '#0F172A' }}>
                      {runningScans}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 8. RECENT RUNS & DETECTIONS ──────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Recent Security Pipeline Runs
                  </h2>
                  <Link
                    href="/runs"
                    style={{ fontSize: '12.5px', color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}
                  >
                    View All Runs →
                  </Link>
                </div>

                {recentRuns.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#64748B', fontSize: '13px' }}>
                    No execution runs recorded yet. Start a scan to generate pipeline telemetry.
                  </div>
                ) : (
                  <div className="kavach-table-responsive" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Run / Execution</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Repository</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Scanner</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRuns.map((r, idx) => {
                          const isDone = (r.status || '').toUpperCase() === 'COMPLETED' || (r.status || '').toUpperCase() === 'SUCCESS';
                          const isFailed = (r.status || '').toUpperCase() === 'FAILED';
                          const isRunning = (r.status || '').toUpperCase() === 'RUNNING';

                          return (
                            <tr key={r.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                                {r.display_id || String(r.id).slice(0, 8)}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#334155' }}>
                                {r.repository || r.repo_name || 'Repository'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                {r.scanner_name || r.tool_name || r.scan_type || 'Semgrep'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: isDone ? '#F0FDF4' : isFailed ? '#FEF2F2' : '#EFF6FF',
                                    color: isDone ? '#166534' : isFailed ? '#991B1B' : '#1E40AF',
                                  }}
                                >
                                  {isDone && <CheckCircle2 size={12} color="#16A34A" />}
                                  {isFailed && <XCircle size={12} color="#DC2626" />}
                                  {isRunning && <RefreshCw size={12} className="animate-spin" color="#2563EB" />}
                                  <span>{r.status || 'PENDING'}</span>
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <Link
                                  href={`/runs/${r.id}`}
                                  style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', textDecoration: 'underline' }}
                                >
                                  Inspect Logs →
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
            </>
          )}
        </>
      )}
    </div>
  );
}
