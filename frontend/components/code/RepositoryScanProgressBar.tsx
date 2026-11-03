'use client';

/**
 * RepositoryScanProgressBar — Real-Time Repository Scanning Progress Indicator
 *
 * Implements SecuLayer design system:
 * - Thin horizontal progress line with subtle blue accent (#2563EB)
 * - Real backend stages, elapsed time, and dynamic findings count
 * - Supports Queued, Running, Completed, Failed, and Cancelled states
 * - Handles percentage and indeterminate progress lines
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCw,
  ExternalLink,
  Shield,
  X,
  ArrowDown,
} from 'lucide-react';

export interface ScanJobProgress {
  id: string;
  repository_id?: string;
  repository_name?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  current_stage?: string | null;
  current_stage_index?: number | null;
  total_stages?: number | null;
  stage_progress?: number | null; // 0-100 percentage or null if indeterminate
  findings_count?: number | null;
  elapsed_seconds?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_str?: string | null;
  scan_id?: string | null;
}

export interface RepositoryScanProgressBarProps {
  job: ScanJobProgress;
  repositoryName: string;
  repositoryId?: string;
  viewFindingsHref?: string;
  onViewFindings?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export const RepositoryScanProgressBar: React.FC<RepositoryScanProgressBarProps> = ({
  job,
  repositoryName,
  repositoryId,
  viewFindingsHref,
  onViewFindings,
  onRetry,
  onCancel,
  onDismiss,
  compact = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live elapsed timer while job is queued or running
  useEffect(() => {
    const isLive = job.status === 'RUNNING' || job.status === 'QUEUED';
    if (!isLive) return;

    const computeElapsed = () => {
      if (job.started_at) {
        const start = new Date(job.started_at).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedSeconds(diff);
      } else {
        setElapsedSeconds((prev) => prev + 1);
      }
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [job.status, job.started_at]);

  const formatElapsed = (sec: number) => {
    if (!sec || isNaN(sec) || sec < 0) return '00:00';
    if (sec > 900) {
      return 'Timed out';
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isQueued = job.status === 'QUEUED';
  const isRunning = job.status === 'RUNNING';
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';
  const isCancelled = job.status === 'CANCELLED';

  const hasPercentage = typeof job.stage_progress === 'number' && job.stage_progress >= 0 && job.stage_progress <= 100;
  const progressPercent = hasPercentage ? job.stage_progress! : 0;

  const currentStageText = job.current_stage || (isQueued ? 'Waiting in queue...' : isRunning ? 'Scanning repository...' : 'Scan finished');
  const stageCounter = job.current_stage_index && job.total_stages
    ? `${job.current_stage_index} of ${job.total_stages} stages completed`
    : null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: compact ? '8px 12px' : '12px 16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      }}
    >
      {/* ── Top Header Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isQueued && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#D97706',
                backgroundColor: '#FEF3C7',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              <Clock size={11} /> Queued
            </span>
          )}

          {isRunning && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              <Loader2 size={11} style={{ animation: 'spin 1.2s linear infinite' }} /> Scanning
            </span>
          )}

          {isCompleted && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#16A34A',
                backgroundColor: '#DCFCE7',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              <CheckCircle2 size={11} /> Completed
            </span>
          )}

          {isFailed && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#DC2626',
                backgroundColor: '#FEE2E2',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              <AlertTriangle size={11} /> Failed
            </span>
          )}

          {isCancelled && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#F1F5F9',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              <XCircle size={11} /> Cancelled
            </span>
          )}

          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#0F172A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isCompleted ? repositoryName : `Scanning ${repositoryName}`}
          </span>
        </div>

        {/* Right Status Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {(isRunning || isQueued) && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={11} /> {formatElapsed(elapsedSeconds)}
            </span>
          )}

          {isRunning && hasPercentage && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
              {progressPercent}%
            </span>
          )}

          {isCompleted && (
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {job.duration_str ? `in ${job.duration_str}` : 'ready'}
            </span>
          )}

          {/* Action buttons */}
          {(isRunning || isQueued) && onCancel && (
            <button
              onClick={onCancel}
              title="Cancel scan"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <X size={14} />
            </button>
          )}

          {(isFailed || isCancelled) && onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCw size={11} /> Retry
            </button>
          )}

          {isCompleted && onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Progress Line ── */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#F1F5F9',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isQueued && (
          <div
            style={{
              width: '30%',
              height: '100%',
              backgroundColor: '#F59E0B',
              borderRadius: '9999px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {isRunning && hasPercentage && (
          <div
            style={{
              width: `${Math.max(5, progressPercent)}%`,
              height: '100%',
              backgroundColor: '#2563EB',
              borderRadius: '9999px',
              transition: 'width 0.4s ease-out',
            }}
          />
        )}

        {isRunning && !hasPercentage && (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #EFF6FF 0%, #2563EB 50%, #EFF6FF 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmerSlide 1.6s infinite linear',
            }}
          />
        )}

        {isCompleted && (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#16A34A',
              borderRadius: '9999px',
            }}
          />
        )}

        {isFailed && (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#DC2626',
              borderRadius: '9999px',
            }}
          />
        )}

        {isCancelled && (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#94A3B8',
              borderRadius: '9999px',
            }}
          />
        )}
      </div>

      {/* ── Subtitle Details ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748B',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span>{currentStageText}</span>
          {stageCounter && (
            <>
              <span>·</span>
              <span style={{ fontWeight: 500, color: '#475569' }}>{stageCounter}</span>
            </>
          )}
        </div>

        {/* Findings Count or Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {typeof job.findings_count === 'number' && (
            <span
              style={{
                fontWeight: 600,
                color: job.findings_count > 0 ? (isCompleted ? '#DC2626' : '#2563EB') : '#16A34A',
              }}
            >
              {job.findings_count === 0
                ? '0 findings'
                : `${job.findings_count} finding${job.findings_count === 1 ? '' : 's'}${isRunning ? ' so far' : ''}`}
            </span>
          )}

          {isCompleted && (
            onViewFindings ? (
              <button
                type="button"
                onClick={onViewFindings}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                View findings <ArrowDown size={11} />
              </button>
            ) : (viewFindingsHref || repositoryId || job.repository_id) ? (
              <Link
                href={viewFindingsHref || `/code/repositories/${repositoryId || job.repository_id}?tab=Security%20Findings`}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2563EB',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                View findings <ExternalLink size={10} />
              </Link>
            ) : null
          )}
        </div>
      </div>

      {/* ── Error Message Banner if Failed ── */}
      {isFailed && job.error_message && (
        <div
          style={{
            fontSize: '11px',
            color: '#B91C1C',
            backgroundColor: '#FEF2F2',
            padding: '4px 8px',
            borderRadius: '4px',
            lineHeight: 1.4,
          }}
        >
          {job.error_message}
        </div>
      )}

      {/* Inline styles for indeterminate sliding animation */}
      <style jsx>{`
        @keyframes shimmerSlide {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};
