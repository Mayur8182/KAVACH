'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useOverview } from '../OverviewContext';
import { api } from '@/lib/api/client';
import {
  Play,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  ShieldAlert,
  RefreshCw,
  FolderGit2,
  X,
  Terminal,
  FileCode,
} from 'lucide-react';

interface ScanItem {
  id: string;
  scan_id_display: string;
  repository: string;
  repository_id?: string;
  branch: string;
  commit_sha?: string;
  status: string;
  progress: number;
  findings_count: number;
  started_at?: string;
  completed_at?: string;
  duration?: string;
  error_message?: string;
  trigger: string;
}

interface ScanCounts {
  all: number;
  running: number;
  completed: number;
  failed: number;
  scheduled: number;
}

export default function ScanStatusPage() {
  const { refreshKey, triggerRefresh, setIsStartScanOpen } = useOverview();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [counts, setCounts] = useState<ScanCounts>({
    all: 0,
    running: 0,
    completed: 0,
    failed: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [busyScanId, setBusyScanId] = useState<string | null>(null);

  // Scan Detail Drawer / Modal
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'executions' | 'findings' | 'logs'>('executions');

  useEffect(() => {
    if (!selectedScanId) {
      setDetailData(null);
      return;
    }
    setLoadingDetail(true);
    api.sast.scanDetail(selectedScanId)
      .then((data) => setDetailData(data))
      .catch((err: any) => {
        alert(`Could not load scan details: ${err?.message || 'Error communicating with backend'}`);
        setSelectedScanId(null);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedScanId]);

  const loadScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.scans({
        status: activeTab !== 'all' ? activeTab : undefined,
      });
      setScans(res?.items ?? []);
      setCounts(res?.counts ?? { all: 0, running: 0, completed: 0, failed: 0, scheduled: 0 });
    } catch (err: any) {
      setError(err?.message || 'Unable to load scan status.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadScans();
  }, [loadScans, refreshKey]);

  // Polling every 5s if there are running scans
  useEffect(() => {
    if (counts.running > 0) {
      const interval = setInterval(() => {
        loadScans();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [counts.running, loadScans]);

  const handleCancelScan = async (scanId: string) => {
    setBusyScanId(scanId);
    setActionMenuId(null);
    try {
      await api.sast.cancelScan(scanId);
      triggerRefresh();
      await loadScans();
    } catch (err: any) {
      alert(`Cancel failed: ${err?.message || 'Unable to cancel scan.'}`);
    } finally {
      setBusyScanId(null);
    }
  };

  const handleRetryScan = async (scanId: string) => {
    setBusyScanId(scanId);
    setActionMenuId(null);
    try {
      await api.sast.retryScan(scanId);
      triggerRefresh();
      await loadScans();
    } catch (err: any) {
      alert(`Retry failed: ${err?.message || 'Unable to retry scan.'}`);
    } finally {
      setBusyScanId(null);
    }
  };

  const statusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s === 'running') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} /> Running
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
          <CheckCircle2 size={13} color="#16A34A" /> Completed
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
          <XCircle size={13} color="#DC2626" /> Failed
        </span>
      );
    }
    if (s === 'scheduled') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#0D9488' }}>
          <Clock size={13} color="#0D9488" /> Scheduled
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
        <Clock size={13} color="#64748B" /> Queued
      </span>
    );
  };

  const tabs = [
    { id: 'all', label: `All Scans (${counts.all})` },
    { id: 'running', label: `Running (${counts.running})` },
    { id: 'completed', label: `Completed (${counts.completed})` },
    { id: 'failed', label: `Failed (${counts.failed})` },
    { id: 'scheduled', label: `Scheduled (${counts.scheduled})` },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
            Scan Status
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Monitor the status of security scans across your repositories.
          </p>
        </div>

        {/* Start Scan Button */}
        <button
          onClick={() => setIsStartScanOpen(true)}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#2563EB',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Play size={14} /> Start Scan
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#DC2626', marginBottom: '12px' }}>{error}</p>
            <button
              onClick={() => loadScans()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : loading && scans.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            Loading scans...
          </div>
        ) : scans.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
            <FolderGit2 size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
              No scans found
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94A3B8' }}>
              No scans match the current tab filter.
            </p>
            <button
              onClick={() => setIsStartScanOpen(true)}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Start New Scan
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: '110px', fontWeight: 600 }}>Scan ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Repository</th>
                  <th style={{ padding: '12px 16px', width: '110px', fontWeight: 600 }}>Branch</th>
                  <th style={{ padding: '12px 16px', width: '120px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', width: '140px', fontWeight: 600 }}>Progress</th>
                  <th style={{ padding: '12px 16px', width: '90px', fontWeight: 600 }}>Findings</th>
                  <th style={{ padding: '12px 16px', width: '190px', fontWeight: 600 }}>Started At</th>
                  <th style={{ padding: '12px 16px', width: '90px', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '12px 16px', width: '60px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => {
                  const isRunning = s.status.toLowerCase() === 'running';
                  const isFailed = s.status.toLowerCase() === 'failed';
                  const isCompleted = s.status.toLowerCase() === 'completed';

                  const progressColor = isRunning ? '#2563EB' : isFailed ? '#DC2626' : '#16A34A';

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Scan ID */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setSelectedScanId(s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#2563EB',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '13px',
                          }}
                          title="View Scan Details"
                        >
                          {s.scan_id_display}
                        </button>
                      </td>

                      {/* Repository */}
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0F172A' }}>
                        {s.repository}
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {s.branch}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {statusBadge(s.status)}
                      </td>

                      {/* Progress Bar */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${s.progress}%`,
                                height: '100%',
                                backgroundColor: progressColor,
                                borderRadius: '3px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                            {s.progress}%
                          </span>
                        </div>
                      </td>

                      {/* Findings */}
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: s.findings_count > 0 ? '#DC2626' : '#16A34A' }}>
                        {s.findings_count}
                      </td>

                      {/* Started At */}
                      <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {s.started_at || '—'}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {s.duration || '—'}
                      </td>

                      {/* Actions Menu */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={() => setActionMenuId(actionMenuId === s.id ? null : s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                          }}
                          aria-label="Actions menu"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {actionMenuId === s.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '16px',
                              top: '36px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              zIndex: 100,
                              minWidth: '150px',
                              padding: '4px 0',
                              textAlign: 'left',
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelectedScanId(s.id);
                                setActionMenuId(null);
                              }}
                              style={menuItemStyle}
                            >
                              Scan Details
                            </button>
                            <Link
                              href="/code/findings"
                              style={menuItemStyle}
                            >
                              View Findings
                            </Link>

                            {isRunning && (
                              <button
                                onClick={() => handleCancelScan(s.id)}
                                disabled={busyScanId === s.id}
                                style={{ ...menuItemStyle, color: '#DC2626' }}
                              >
                                <XCircle size={13} /> Cancel Scan
                              </button>
                            )}

                            {(isCompleted || isFailed) && (
                              <button
                                onClick={() => handleRetryScan(s.id)}
                                disabled={busyScanId === s.id}
                                style={menuItemStyle}
                              >
                                <RotateCcw size={13} /> Retry Scan
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}>
          <span>Showing 1-{scans.length} of {scans.length} scans</span>
        </div>
      </div>

      {/* Scan Detail Modal */}
      {selectedScanId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedScanId(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                    {detailData?.scan_id_display || 'Scan Details'}
                  </h2>
                  {detailData && statusBadge(detailData.status)}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Repository: <strong>{detailData?.repository || '—'}</strong> | Branch: <strong>{detailData?.branch || '—'}</strong> | Trigger: {detailData?.trigger || 'manual'}
                </p>
              </div>

              <button
                onClick={() => setSelectedScanId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Loading scan details and engine verification...</p>
              </div>
            ) : detailData ? (
              <>
                {/* Metrics ribbon */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Duration</span>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>{detailData.duration || '—'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Started At</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detailData.started_at || '—'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Findings Count</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: detailData.findings_count > 0 ? '#DC2626' : '#16A34A', marginTop: '2px' }}>{detailData.findings_count}</div>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Scanner Engines</span>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#2563EB', marginTop: '2px' }}>{detailData.executions?.length || 1}</div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '16px', padding: '0 24px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                  <button
                    onClick={() => setDetailTab('executions')}
                    style={{
                      padding: '10px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: detailTab === 'executions' ? 600 : 500,
                      color: detailTab === 'executions' ? '#2563EB' : '#64748B',
                      borderBottom: detailTab === 'executions' ? '2px solid #2563EB' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Scanner Executions ({detailData.executions?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('findings')}
                    style={{
                      padding: '10px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: detailTab === 'findings' ? 600 : 500,
                      color: detailTab === 'findings' ? '#2563EB' : '#64748B',
                      borderBottom: detailTab === 'findings' ? '2px solid #2563EB' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Findings ({detailData.findings?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab('logs')}
                    style={{
                      padding: '10px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: detailTab === 'logs' ? 600 : 500,
                      color: detailTab === 'logs' ? '#2563EB' : '#64748B',
                      borderBottom: detailTab === 'logs' ? '2px solid #2563EB' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Engine Logs ({detailData.logs?.length || 0})
                  </button>
                </div>

                {/* Tab Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC' }}>
                  {detailTab === 'executions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(!detailData.executions || detailData.executions.length === 0) ? (
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>No scanner execution records available.</p>
                      ) : (
                        detailData.executions.map((e: any) => (
                          <div key={e.id} style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', textTransform: 'capitalize' }}>{e.scanner_name} ({e.scanner_type})</span>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, backgroundColor: e.status === 'COMPLETED' ? '#DCFCE7' : '#EFF6FF', color: e.status === 'COMPLETED' ? '#16A34A' : '#2563EB' }}>{e.status}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginBottom: '6px' }}>{e.command || 'semgrep scan --quiet'}</div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569' }}>
                              <span>Findings detected: <strong>{e.finding_count}</strong></span>
                              <span>Duration: <strong>{e.duration_ms ? `${e.duration_ms}ms` : '—'}</strong></span>
                              <span>Exit code: <strong>{e.exit_code !== undefined ? e.exit_code : 0}</strong></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'findings' && (
                    <div>
                      {(!detailData.findings || detailData.findings.length === 0) ? (
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>No security vulnerabilities detected in this scan.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailData.findings.map((f: any) => (
                            <div key={f.id} style={{ backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Link href={`/code/findings/${encodeURIComponent(f.id)}`} style={{ fontWeight: 600, fontSize: '13px', color: '#2563EB', textDecoration: 'none' }}>
                                    {f.title}
                                  </Link>
                                  <span style={{ fontSize: '11px', color: '#64748B' }}>{f.category}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px' }}>
                                  {f.file_path}:{f.line_number || f.line_start}
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: f.severity === 'CRITICAL' ? '#DC2626' : f.severity === 'HIGH' ? '#EA580C' : '#CA8A04' }}>
                                {f.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'logs' && (
                    <div style={{ backgroundColor: '#0F172A', color: '#38BDF8', padding: '16px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                      {(!detailData.logs || detailData.logs.length === 0) ? (
                        <div style={{ color: '#94A3B8' }}>No raw execution logs recorded.</div>
                      ) : (
                        detailData.logs.map((log: string, idx: number) => (
                          <div key={idx} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {/* Modal Footer */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedScanId(null)}
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#334155',
  backgroundColor: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  textDecoration: 'none',
  boxSizing: 'border-box',
};
