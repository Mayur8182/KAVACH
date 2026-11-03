'use client';

/**
 * Module 13 — Dependency Scans & Jobs: Scan History & Logs
 * Route: /code/dependencies/scans/history
 * Comprehensive chronological audit of all scanner executions and interactive live terminal log viewer.
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Copy,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Shield,
  Layers,
  Cpu,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyScansSubnav } from '@/components/dependencies/DependencyScansSubnav';

export default function DependencyScanHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Repository & Branch filter
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await api.dependencyScans.getDashboard({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      });
      const items = res?.items || [];
      setRuns(items);
      if (items.length > 0 && !selectedRunId) {
        setSelectedRunId(items[0].job_id);
      }
    } catch (err) {
      console.warn('Failed to load scan history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [selectedRepo, selectedBranch]);

  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRunId) return;
    let mounted = true;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const detail = await api.dependencyScans.getDetail(selectedRunId);
        if (mounted) {
          setSelectedRunDetail(detail);
          setDetailError(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.warn('Failed to fetch detail for run', selectedRunId, err);
          setDetailError(err?.message || `Failed to load execution details for ${selectedRunId}`);
        }
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    };
    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [selectedRunId]);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (statusFilter !== 'ALL' && (r.status || '').toUpperCase() !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesJob = (r.job_id || '').toLowerCase().includes(q);
        const matchesRepo = (r.repository || '').toLowerCase().includes(q);
        const matchesType = (r.scan_type || '').toLowerCase().includes(q);
        if (!matchesJob && !matchesRepo && !matchesType) return false;
      }
      return true;
    });
  }, [runs, statusFilter, search]);

  const filteredLogs = useMemo(() => {
    if (!selectedRunDetail?.logs) return [];
    if (logLevelFilter === 'ALL') return selectedRunDetail.logs;
    return selectedRunDetail.logs.filter((l: any) => (l.level || '').toUpperCase() === logLevelFilter);
  }, [selectedRunDetail, logLevelFilter]);

  const handleCopyLogs = () => {
    if (!selectedRunDetail?.logs) return;
    const text = selectedRunDetail.logs.map((l: any) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleDownloadLogs = () => {
    if (!selectedRunDetail) return;
    const text = (selectedRunDetail.logs || []).map((l: any) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRunDetail.job_id || 'scan'}-execution.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1600px', margin: '0 auto', width: '100%', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      <DependencyScansSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={(r) => setSelectedRepo(r)}
        selectedBranch={selectedBranch}
        onSelectBranch={(b) => setSelectedBranch(b)}
      />

      {/* ── Filters & Search Bar ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Scan ID, repo, or engine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status:</span>
            {['ALL', 'COMPLETED', 'RUNNING', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: statusFilter === st ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: statusFilter === st ? '#EFF6FF' : '#FFFFFF',
                  color: statusFilter === st ? '#2563EB' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchRuns}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* ── Two-Column Layout: Execution List & Live Log Terminal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: '24px' }}>
        {/* Left Column: Executed Runs List */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '700px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Execution Runs ({filteredRuns.length})
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Click to view console</span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredRuns.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No scan execution runs match your criteria.
              </div>
            ) : (
              filteredRuns.map((r) => {
                const isSelected = selectedRunId === r.job_id;
                const isCompleted = r.status === 'COMPLETED';
                const isRunning = r.status === 'RUNNING';

                return (
                  <div
                    key={r.id || r.job_id}
                    onClick={() => setSelectedRunId(r.job_id)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background-color 100ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#1E40AF' : '#0F172A', fontFamily: 'monospace' }}>
                        {r.job_id}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: isCompleted ? '#ECFDF5' : isRunning ? '#FFFBEB' : '#FEF2F2',
                          color: isCompleted ? '#059669' : isRunning ? '#D97706' : '#DC2626',
                        }}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                      <FolderGit2 size={13} color="#64748B" />
                      <span style={{ fontWeight: 500 }}>{r.repository}</span>
                      <span>•</span>
                      <GitBranch size={13} color="#64748B" />
                      <span>{r.branch}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                      <span>{r.scan_type} ({r.duration})</span>
                      <span>{r.vulnerabilities || 0} CVEs</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Terminal Viewer */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '700px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {/* Terminal Title Bar */}
          <div style={{ padding: '12px 18px', backgroundColor: '#1E293B', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', fontFamily: 'monospace' }}>
                {selectedRunId ? `console: ${selectedRunId}` : 'Terminal Console'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Filter Log Level */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0F172A', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', color: '#94A3B8' }}>
                <Filter size={11} />
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#F1F5F9', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="ALL">All Levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="SUCCESS">SUCCESS</option>
                </select>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#334155',
                  border: 'none',
                  color: copiedLogs ? '#4ADE80' : '#E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedLogs ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Download Button */}
              <button
                onClick={handleDownloadLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#334155',
                  border: 'none',
                  color: '#E2E8F0',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={12} />
                <span>Save</span>
              </button>

              {selectedRunId && (
                <Link
                  href={`/code/dependencies/scans/${selectedRunId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span>Open Detail</span>
                  <ExternalLink size={11} />
                </Link>
              )}
            </div>
          </div>

          {/* Terminal Body */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.8, color: '#E2E8F0' }}>
            {loadingDetail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8' }}>
                <Clock size={14} className="animate-spin" />
                <span>Connecting to log stream...</span>
              </div>
            ) : detailError ? (
              <div style={{ color: '#F87171', backgroundColor: '#450A0A', padding: '12px 16px', borderRadius: '6px', border: '1px solid #7F1D1D' }}>
                {detailError}
              </div>
            ) : !selectedRunDetail ? (
              <div style={{ color: '#64748B' }}>Select an execution run from the left panel to inspect output.</div>
            ) : (
              <>
                <div style={{ color: '#64748B', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '12px' }}>
                  Execution command: {selectedRunDetail.command || 'trivy fs --scanners vuln .'}
                  <br />
                  Target: {selectedRunDetail.repository}@{selectedRunDetail.branch} • Engine: {selectedRunDetail.engine}
                </div>

                {filteredLogs.length === 0 ? (
                  <div style={{ color: '#64748B' }}>No log messages found for level: {logLevelFilter}</div>
                ) : (
                  filteredLogs.map((log: any, idx: number) => {
                    const lvl = (log.level || 'INFO').toUpperCase();
                    const color = lvl === 'SUCCESS' ? '#4ADE80' : lvl === 'WARN' ? '#FBBF24' : lvl === 'ERROR' ? '#F87171' : '#60A5FA';
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: '#475569', userSelect: 'none' }}>
                          {log.timestamp ? log.timestamp.split('T')[1]?.substring(0, 8) : '00:00:00'}
                        </span>
                        <span style={{ color, fontWeight: 700, width: '68px' }}>[{lvl}]</span>
                        <span style={{ color: '#F1F5F9', flex: 1, wordBreak: 'break-word' }}>{log.message}</span>
                      </div>
                    );
                  })
                )}

                {selectedRunDetail.stdout_summary && (
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1E293B', color: '#94A3B8' }}>
                    <span style={{ color: '#38BDF8', fontWeight: 600 }}>summary:</span> {selectedRunDetail.stdout_summary}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
