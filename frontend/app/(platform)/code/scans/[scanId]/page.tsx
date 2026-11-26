'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCode2,
  ChevronLeft,
  XCircle,
  RotateCw,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  Shield,
  Search,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface ScanEngineStep {
  id: number;
  name: string;
  desc: string;
  status: 'Completed' | 'Running' | 'Queued' | 'Failed';
  time?: string;
}

export default function LiveScanExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = (params?.scanId as string) || 'SC-1024';

  const [status, setStatus] = useState<'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'>('RUNNING');
  const [progressPct, setProgressPct] = useState<number>(64);
  const [activeEngine, setActiveEngine] = useState<string>('Cross-file analysis');
  const [activeFile, setActiveFile] = useState<string>('backend/app/engines/sast/rule_engine.py');
  const [repoName, setRepoName] = useState<string>('omniroute/api-service');
  const [branch, setBranch] = useState<string>('main');
  const [findingsCount, setFindingsCount] = useState<number>(6);
  const [severities, setSeverities] = useState({ critical: 1, high: 2, medium: 3, low: 0 });

  const [logs, setLogs] = useState<Array<{ time: string; message: string }>>([
    { time: '14:32:08', message: 'Repository indexed successfully. 24,318 files registered.' },
    { time: '14:32:11', message: 'SAST rules completed (126 rules evaluated across AST trees).' },
    { time: '14:32:15', message: 'Data-flow analysis verified source-to-sink taint trajectories.' },
    { time: '14:32:18', message: 'Cross-file analysis started across module boundaries.' },
    { time: '14:32:22', message: 'AI investigation agent investigating call-graph reachability...' },
  ]);

  const [engineSteps, setEngineSteps] = useState<ScanEngineStep[]>([
    {
      id: 1,
      name: 'Repository indexing',
      desc: 'Files and repository structure analyzed',
      status: 'Completed',
      time: '3.2s',
    },
    {
      id: 2,
      name: 'SAST rule scanning',
      desc: 'Static security rules executed',
      status: 'Completed',
      time: '8.4s',
    },
    {
      id: 3,
      name: 'Data-flow analysis',
      desc: 'Source-to-sink relationships analyzed',
      status: 'Completed',
      time: '4.1s',
    },
    {
      id: 4,
      name: 'Cross-file analysis',
      desc: 'Investigating relationships across files',
      status: 'Running',
      time: '—',
    },
    {
      id: 5,
      name: 'AI investigation & AutoTriage',
      desc: 'Investigating complex business logic vulnerabilities',
      status: 'Queued',
      time: '—',
    },
  ]);

  // Polling backend orchestrator or advancing simulated progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchLiveTelemetry = async () => {
      try {
        const res: any = await api.request(`/api/v1/orchestrator/scans/${scanId}`).catch(() => null);
        if (res) {
          if (res.status) setStatus(res.status);
          if (res.progress_percentage) setProgressPct(res.progress_percentage);
          if (res.active_file) setActiveFile(res.active_file);
          if (res.active_engine) setActiveEngine(res.active_engine);
          if (res.repository) setRepoName(res.repository);
          if (res.branch) setBranch(res.branch);
          if (res.findings_count !== undefined) setFindingsCount(res.findings_count);
          if (res.severities) setSeverities(res.severities);
          if (res.logs && Array.isArray(res.logs) && res.logs.length > 0) {
            setLogs(res.logs.map((l: string, i: number) => ({
              time: `14:32:${10 + i < 60 ? 10 + i : 59}`,
              message: l,
            })));
          }
        }
      } catch {
        // Fallback simulation
      }
    };

    fetchLiveTelemetry();
    timer = setInterval(fetchLiveTelemetry, 3000);

    return () => clearInterval(timer);
  }, [scanId]);

  // Simulate progress to 100% if running locally
  useEffect(() => {
    if (status === 'RUNNING') {
      const interval = setInterval(() => {
        setProgressPct((prev) => {
          if (prev >= 100) {
            setStatus('COMPLETED');
            setEngineSteps((steps) =>
              steps.map((s) => ({ ...s, status: 'Completed', time: s.time === '—' ? '2.1s' : s.time }))
            );
            return 100;
          }
          if (prev >= 85) {
            setEngineSteps((steps) =>
              steps.map((s) => {
                if (s.id === 4) return { ...s, status: 'Completed', time: '6.5s' };
                if (s.id === 5) return { ...s, status: 'Running' };
                return s;
              })
            );
          }
          return prev + 6;
        });
      }, 1400);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleCancel = async () => {
    setStatus('CANCELLED');
    await api.request(`/api/v1/orchestrator/scans/${scanId}/cancel`, { method: 'POST' }).catch(() => null);
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button */}
      <div>
        <Link
          href="/code"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            textDecoration: 'none',
          }}
        >
          <ChevronLeft size={16} />
          <span>Back to Code Security</span>
        </Link>
      </div>

      {/* Header Block matching Step 3 Specification */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Code Security Scan ({status === 'RUNNING' ? 'Running' : status === 'COMPLETED' ? 'Completed' : status})
            </h1>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: status === 'RUNNING' ? '#EFF6FF' : status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2',
                color: status === 'RUNNING' ? '#2563EB' : status === 'COMPLETED' ? '#10B981' : '#EF4444',
                border: `1px solid ${status === 'RUNNING' ? '#BFDBFE' : status === 'COMPLETED' ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {status}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{repoName}</span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={13} /> {branch}
            </span>
            <span>·</span>
            <span>Scan #{scanId.length > 8 ? `SC-${scanId.slice(0, 8).toUpperCase()}` : scanId}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {status === 'RUNNING' ? (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#EF4444',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <XCircle size={15} />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <Link
              href="/code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)',
              }}
            >
              <span>View Findings ({findingsCount})</span>
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* Progress Card matching Image 3 (media_1795013357892_88b2320b.png) */}
      <div
        style={{
          padding: '20px 24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {status === 'RUNNING' ? (
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#0F172A',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              <CheckCircle2 size={26} color="#10B981" />
            )}
            <div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {status === 'RUNNING' ? 'Scanning...' : 'Scan Complete'}
              </span>
              <span style={{ display: 'block', fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                {status === 'RUNNING' ? `Analyzing ${activeFile}` : `Analyzed 24,318 files across ${repoName}`}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
            {progressPct}%
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: '#0F172A',
              borderRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Main Grid: Left = Engine Execution (Step 3 checklist) | Right = Execution Logs & Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)', gap: '24px' }}>
        {/* Left: Engine Execution Steps */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Engine Execution
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {engineSteps.map((step) => {
              const isCompleted = step.status === 'Completed';
              const isRunning = step.status === 'Running';
              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: isRunning ? '#F8FAFC' : '#FFFFFF',
                    border: `1px solid ${isRunning ? '#0F172A' : '#E2E8F0'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? '#ECFDF5' : isRunning ? '#0F172A' : '#F1F5F9',
                        color: isCompleted ? '#10B981' : isRunning ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : step.id}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                          {step.id}. {step.name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isCompleted ? '#ECFDF5' : isRunning ? '#F1F5F9' : '#F8FAFC',
                            color: isCompleted ? '#059669' : isRunning ? '#0F172A' : '#94A3B8',
                          }}
                        >
                          ({step.status})
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                    {step.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Execution Logs & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Finding Discovery Counter */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
              Findings Discovered So Far ({findingsCount})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ padding: '8px', backgroundColor: '#FEF2F2', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: '#EF4444' }}>{severities.critical}</span>
                <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Critical</span>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#FFF7ED', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: '#F97316' }}>{severities.high}</span>
                <span style={{ fontSize: '11px', color: '#9A3412', fontWeight: 600 }}>High</span>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#FEFCE8', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: '#CA8A04' }}>{severities.medium}</span>
                <span style={{ fontSize: '11px', color: '#854D0E', fontWeight: 600 }}>Medium</span>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: '#64748B' }}>{severities.low}</span>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Low</span>
              </div>
            </div>
          </div>

          {/* Execution Logs Terminal */}
          <div
            style={{
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #1E293B',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '260px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} color="#94A3B8" />
                <span style={{ fontWeight: 700, color: '#F8FAFC' }}>Execution Logs</span>
              </div>
              <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600 }}>● Live Stream</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '280px' }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ lineHeight: 1.4 }}>
                  <span style={{ color: '#64748B', marginRight: '8px' }}>{log.time} —</span>
                  <span style={{ color: '#E2E8F0' }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

