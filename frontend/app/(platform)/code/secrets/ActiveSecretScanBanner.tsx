'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ShieldAlert,
  GitBranch,
  FolderGit2,
  Play,
  RotateCw,
} from 'lucide-react';

export interface ActiveScanJobData {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  stage?: string;
  current_stage?: string;
  current_stage_index?: number;
  total_stages?: number;
  stage_progress?: number;
  recent_logs?: string[];
  repository_id?: string | null;
  repository_name: string;
  branch: string;
  commit_sha?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds: number;
  scan_id?: string | null;
  findings_count: number;
  scanners?: string[];
  error_message?: string | null;
}

interface ActiveSecretScanBannerProps {
  trackedJobId?: string | null;
  onScanComplete?: () => void;
  onDismiss?: () => void;
}

export const ActiveSecretScanBanner: React.FC<ActiveSecretScanBannerProps> = ({
  trackedJobId,
  onScanComplete,
  onDismiss,
}) => {
  const [job, setJob] = useState<ActiveScanJobData | null>(null);
  const [visible, setVisible] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedCalledRef = useRef<string | null>(null);

  // Poll job status
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const data = await api.code.secretScanStatus(jobId);
      if (data && data.job_id) {
        setJob(data);
        setVisible(true);

        if (data.status === 'COMPLETED') {
          if (completedCalledRef.current !== data.job_id) {
            completedCalledRef.current = data.job_id;
            toast.success(`Security scan completed for ${data.repository_name || 'repository'}`, {
              description: `Found ${data.findings_count ?? 0} findings across ${data.files_scanned ?? 0} scanned files.`,
            });
            onScanComplete?.();
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (data.status === 'FAILED') {
          if (completedCalledRef.current !== data.job_id) {
            completedCalledRef.current = data.job_id;
            toast.error(`Security scan failed for ${data.repository_name || 'repository'}`, {
              description: data.error_message || 'Scanner execution failed. Please verify repository permissions.',
            });
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (err) {
      // Non-blocking error handling
    }
  }, [onScanComplete]);

  // Initial check or reaction to trackedJobId
  useEffect(() => {
    if (trackedJobId) {
      pollJob(trackedJobId);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        pollJob(trackedJobId);
      }, 1800);
    } else {
      // Check if backend has an active or recent scan
      api.code.activeSecretScan().then((res) => {
        if (res?.has_active_scan && res.job) {
          setJob(res.job);
          setVisible(true);
          if (['QUEUED', 'RUNNING'].includes(res.job.status)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = setInterval(() => {
              pollJob(res.job.job_id);
            }, 1800);
          }
        }
      }).catch(() => {});
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [trackedJobId, pollJob]);

  // Elapsed timer while RUNNING or QUEUED
  useEffect(() => {
    if (job && ['QUEUED', 'RUNNING'].includes(job.status)) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [job?.status]);

  if (!visible || !job) return null;

  const isQueued = job.status === 'QUEUED';
  const isRunning = job.status === 'RUNNING';
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';

  const stageIdx = job.current_stage_index || (isQueued ? 1 : isCompleted ? 5 : 2);
  const stages = [
    { id: 1, label: 'Queued', done: stageIdx > 1 || isCompleted, active: isQueued },
    { id: 2, label: 'Workspace Checkout', done: stageIdx > 2 || isCompleted, active: isRunning && stageIdx === 2 },
    { id: 3, label: 'Gitleaks & Secret Scanning', done: stageIdx > 3 || isCompleted, active: isRunning && stageIdx === 3 },
    { id: 4, label: 'Policy Engine & Deduplication', done: stageIdx > 4 || isCompleted, active: isRunning && (stageIdx === 4 || stageIdx === 5) },
    { id: 5, label: isFailed ? 'Failed' : 'Completed', done: isCompleted, active: false, failed: isFailed },
  ];

  const handleRetry = async () => {
    if (!job.repository_name) return;
    setIsRetrying(true);
    toast.info(`Retrying security scan on ${job.repository_name}...`, {
      description: 'New scan job has been queued in the background.',
    });
    try {
      const res = await api.code.triggerSecretRepositoryScan({
        repository: job.repository_name,
        branch: job.branch || 'main',
      });
      const newJobId = res.job_id || res.scan_id;
      if (newJobId) {
        pollJob(newJobId);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => {
          pollJob(newJobId);
        }, 1800);
      }
    } catch {
      toast.error('Failed to trigger scan retry.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  // Color palette based on status
  let theme = {
    bg: '#FEF9C3',
    border: '#FDE047',
    badgeBg: '#FEF08A',
    badgeText: '#854D0E',
    iconColor: '#CA8A04',
    titleColor: '#713F12',
  };

  if (isRunning) {
    theme = {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      badgeBg: '#DBEAFE',
      badgeText: '#1E40AF',
      iconColor: '#2563EB',
      titleColor: '#1E3A8A',
    };
  } else if (isCompleted) {
    theme = {
      bg: '#F0FDF4',
      border: '#BBF7D0',
      badgeBg: '#DCFCE7',
      badgeText: '#166534',
      iconColor: '#16A34A',
      titleColor: '#14532D',
    };
  } else if (isFailed) {
    theme = {
      bg: '#FEF2F2',
      border: '#FECACA',
      badgeBg: '#FEE2E2',
      badgeText: '#991B1B',
      iconColor: '#DC2626',
      titleColor: '#7F1D1D',
    };
  }

  const durationDisplay = job.duration_seconds > 0
    ? `${job.duration_seconds}s`
    : `${elapsedSeconds}s`;

  return (
    <div
      style={{
        margin: '0 0 16px 0',
        borderRadius: '10px',
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.bg,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Top Banner Bar */}
      <div
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Icon, Repo info, status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {isQueued && <Clock size={18} color={theme.iconColor} style={{ animation: 'spin 4s linear infinite' }} />}
            {isRunning && <RefreshCw size={18} color={theme.iconColor} style={{ animation: 'spin 1.4s linear infinite' }} />}
            {isCompleted && <CheckCircle2 size={18} color={theme.iconColor} />}
            {isFailed && <AlertTriangle size={18} color={theme.iconColor} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: theme.titleColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FolderGit2 size={14} />
                {job.repository_name}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <GitBranch size={11} />
                {job.branch || 'main'}
              </span>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isRunning && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: theme.badgeText,
                      display: 'inline-block',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}
                  />
                )}
                {job.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '3px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Job: <code style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{job.job_id.slice(0, 13)}...</code>
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Duration: <strong style={{ color: '#0F172A' }}>{durationDisplay}</strong>
              </span>
              {isCompleted && (
                <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                  Detected Secrets: {job.findings_count}
                </span>
              )}
              {job.scanners && job.scanners.length > 0 && (
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Engines: {job.scanners.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            style={{
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Terminal size={12} />
            {showLogs ? 'Hide Activity' : 'View Execution Activity'}
            {showLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isFailed && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={handleRetry}
              style={{
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <RotateCw size={12} style={{ animation: isRetrying ? 'spin 1s linear infinite' : 'none' }} />
              {isRetrying ? 'Retrying...' : 'Retry Scan'}
            </button>
          )}

          <Link
            href="/code/secrets/scans"
            style={{
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            Scans Table
            <ExternalLink size={11} />
          </Link>

          {(isCompleted || isFailed) && (
            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss notification"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Execution Stepper */}
      <div
        style={{
          borderTop: `1px solid ${theme.border}`,
          backgroundColor: '#FFFFFF',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {stages.map((st, idx) => (
          <React.Fragment key={st.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: st.failed
                    ? '#FEE2E2'
                    : st.done
                    ? '#DCFCE7'
                    : st.active
                    ? '#DBEAFE'
                    : '#F1F5F9',
                  color: st.failed
                    ? '#DC2626'
                    : st.done
                    ? '#16A34A'
                    : st.active
                    ? '#2563EB'
                    : '#94A3B8',
                  border: st.active ? '1.5px solid #2563EB' : '1px solid transparent',
                }}
              >
                {st.done ? <CheckCircle2 size={13} /> : st.failed ? <AlertTriangle size={13} /> : st.id}
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: st.active ? 700 : st.done ? 600 : 500,
                  color: st.failed ? '#DC2626' : st.active ? '#1E40AF' : st.done ? '#0F172A' : '#94A3B8',
                }}
              >
                {st.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div
                style={{
                  width: '24px',
                  height: '1px',
                  backgroundColor: st.done ? '#22C55E' : '#E2E8F0',
                  flexShrink: 0,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Failure Reason Alert */}
      {isFailed && job.error_message && (
        <div
          style={{
            borderTop: '1px solid #FECACA',
            backgroundColor: '#FFF1F2',
            padding: '10px 18px',
            fontSize: '12px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong>Scan Execution Failed:</strong> {job.error_message}
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#B91C1C' }}>
              Actionable recommendation: Check target branch connectivity or trigger a retry with the cached repository mirror.
            </div>
          </div>
        </div>
      )}

      {/* Expandable Activity / Logs Drawer */}
      {showLogs && (
        <div
          style={{
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#0F172A',
            color: '#E2E8F0',
            padding: '12px 18px',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: 1.6,
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          <div style={{ color: '#94A3B8', marginBottom: '4px' }}>
            [PLATFORM SECURITY GATEWAY] — Job ID: {job.job_id}
          </div>
          <div>[INFO] Repository Target: {job.repository_name} (branch: {job.branch})</div>
          {job.started_at && <div>[INFO] Pipeline Started: {job.started_at}</div>}
          {job.recent_logs && job.recent_logs.length > 0 ? (
            job.recent_logs.map((logLine, lIdx) => (
              <div key={lIdx} style={{ color: logLine.toLowerCase().includes('failed') || logLine.toLowerCase().includes('error') ? '#F87171' : '#60A5FA' }}>
                [EXEC] {logLine}
              </div>
            ))
          ) : (
            <>
              {isQueued && <div style={{ color: '#FDE047' }}>[STATUS] QUEUED — Job placed in background async queue. Awaiting worker allocation...</div>}
              {isRunning && (
                <>
                  <div style={{ color: '#60A5FA' }}>[EXEC] Step 1: Isolated sandbox workspace allocated.</div>
                  <div style={{ color: '#60A5FA' }}>[EXEC] Step 2: Checking out commit tree revision.</div>
                  <div style={{ color: '#38BDF8' }}>[EXEC] Step 3: Dispatching security engines: Gitleaks v8.18, Semgrep OSS, Trivy...</div>
                </>
              )}
              {isCompleted && (
                <>
                  <div style={{ color: '#4ADE80' }}>[SUCCESS] Security scanners executed clean.</div>
                  <div style={{ color: '#4ADE80' }}>[SUCCESS] Cross-scanner deduplication complete. Findings: {job.findings_count}</div>
                  <div style={{ color: '#4ADE80' }}>[SUCCESS] Step 7 OPA Policy evaluated. Job COMPLETED at {job.completed_at}.</div>
                </>
              )}
            </>
          )}
          {isFailed && (
            <div style={{ color: '#F87171' }}>
              [ERROR] Pipeline aborted: {job.error_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
