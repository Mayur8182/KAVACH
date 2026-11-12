'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
  X,
  Play,
  Flame,
  ArrowRight,
  Code2,
  FileCode2,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export interface ScanFindingSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface LiveScanningHUDProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId?: string;
  repositoryName?: string;
  branch?: string;
  onScanComplete?: (summary: ScanFindingSummary) => void;
}

const STAGES = [
  { id: 'git', title: 'Workspace Initialization', desc: 'Cloning tree & verifying commit SHA integrity', engine: 'Git' },
  { id: 'secrets', title: 'Entropy Secrets Detection', desc: 'Gitleaks scanning 142 API key & token signatures', engine: 'Gitleaks v8.18' },
  { id: 'sast', title: 'Semantic AST Analysis', desc: 'Semgrep parsing syntactic taint flows & OWASP rules', engine: 'Semgrep Engine' },
  { id: 'sca', title: 'Dependency & Supply Chain', desc: 'Trivy / OSV auditing manifests against CVE database', engine: 'Trivy SCA' },
  { id: 'opa', title: 'Policy & Invariant Gate', desc: 'Evaluating Rego security blueprints & branch policies', engine: 'OPA Rego' },
  { id: 'evidence', title: 'Attestation & Ledger', desc: 'Cryptographic provenance recorded to PostgreSQL', engine: 'SLSA Ledger' },
];

export const LiveScanningHUD: React.FC<LiveScanningHUDProps> = ({
  isOpen,
  onClose,
  repositoryId,
  repositoryName = 'Repository',
  branch = 'main',
  onScanComplete,
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [findingsSummary, setFindingsSummary] = useState<ScanFindingSummary>({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  });
  const [filesScanned, setFilesScanned] = useState(0);
  const [rulesEvaluated, setRulesEvaluated] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleAbortScan = async () => {
    setLogs((prev) => [...prev, `[CANCEL] Dispatched abort signal for scan job.`]);
    if (activeJobId) {
      try {
        await api.code.cancelScanJob(activeJobId);
      } catch {
        // Best-effort cancellation
      }
    }
    onClose();
  };

  // Real asynchronous scanner executor and status poller
  useEffect(() => {
    if (!isOpen) {
      setCurrentStageIndex(0);
      setProgress(5);
      setIsCompleted(false);
      setIsMinimized(false);
      setLogs([]);
      setFilesScanned(0);
      setRulesEvaluated(0);
      setActiveJobId(null);
      return;
    }

    let isMounted = true;

    const runLiveScan = async () => {
      try {
        setLogs([
          `[00:00] Initializing Kavach Security Unified Verification Engine...`,
          `[00:00] Target: ${repositoryName} (Branch: ${branch})`,
        ]);

        let targetJobId: string | null = null;

        if (repositoryId) {
          // Check for existing active scan job or trigger a new one
          const activeScan = await api.code.getActiveScan(repositoryId).catch(() => null);
          if (activeScan && (activeScan.status === 'QUEUED' || activeScan.status === 'RUNNING')) {
            targetJobId = activeScan.id;
          } else {
            const scanJob = await api.code.triggerRepositoryScan(repositoryId, branch || 'main').catch(() => null);
            targetJobId = scanJob?.id || scanJob?.scan_job_id || null;
          }

          if (isMounted && targetJobId) {
            setActiveJobId(targetJobId);
          }
        }

        if (!targetJobId) {
          setLogs((prev) => [...prev, `[WARNING] No active scan job identifier registered for repository.`]);
          return;
        }

        // Poll real backend scan job
        let lastStage = '';
        while (isMounted) {
          const jobData = await api.code.getScanJob(targetJobId).catch(() => null);
          if (!isMounted) break;

          if (jobData) {
            if (jobData.current_stage && jobData.current_stage !== lastStage) {
              lastStage = jobData.current_stage;
              setLogs((prev) => [
                ...prev,
                `[${jobData.elapsed_seconds ?? 0}s] [STAGE ${jobData.current_stage_index || 1}/${jobData.total_stages || 6}] ${jobData.current_stage}`,
              ]);
            }

            setCurrentStageIndex(Math.max(0, (jobData.current_stage_index || 1) - 1));
            setProgress(jobData.stage_progress || 15);
            if (jobData.files_scanned) setFilesScanned(jobData.files_scanned);
            if (jobData.rules_evaluated) setRulesEvaluated(jobData.rules_evaluated);

            if (jobData.status === 'COMPLETED') {
              setIsCompleted(true);
              setProgress(100);

              // Query real findings from database
              let finalSummary: ScanFindingSummary = {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                total: jobData.findings_count || 0,
              };

              if (repositoryId) {
                try {
                  const findingsRes = await api.code.findings({ repositoryId, limit: 100 });
                  const items = findingsRes?.items || [];
                  finalSummary = {
                    critical: items.filter((f: any) => (f.severity || '').toLowerCase() === 'critical').length,
                    high: items.filter((f: any) => (f.severity || '').toLowerCase() === 'high').length,
                    medium: items.filter((f: any) => (f.severity || '').toLowerCase() === 'medium').length,
                    low: items.filter((f: any) => (f.severity || '').toLowerCase() === 'low').length,
                    total: items.length,
                  };
                } catch {
                  // Keep default
                }
              }

              setFindingsSummary(finalSummary);
              setLogs((prev) => [
                ...prev,
                `[COMPLETED] Scan pipeline executed successfully. ${finalSummary.total} findings persisted to database.`,
              ]);
              if (onScanComplete) {
                onScanComplete(finalSummary);
              }
              break;
            } else if (jobData.status === 'FAILED') {
              setLogs((prev) => [
                ...prev,
                `[ERROR] Scan failed: ${jobData.error_message || 'Pipeline encountered a scanner failure.'}`,
              ]);
              break;
            } else if (jobData.status === 'CANCELLED') {
              setLogs((prev) => [...prev, `[CANCELLED] Scan execution was cancelled by user.`]);
              break;
            }
          }

          await new Promise((r) => setTimeout(r, 1200));
        }
      } catch (err: any) {
        if (!isMounted) return;
        setLogs((prev) => [
          ...prev,
          `[ERROR] Scan polling encountered an issue: ${err?.message || 'Network error'}`,
        ]);
      }
    };

    runLiveScan();

    return () => {
      isMounted = false;
    };
  }, [isOpen, repositoryId, repositoryName, branch]);

  if (!isOpen) return null;

  // Minimized floating banner
  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
        }}
        onClick={() => setIsMinimized(false)}
      >
        <div style={{ position: 'relative', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${isCompleted ? '#10B981' : '#3B82F6'}`,
              borderTopColor: 'transparent',
              animation: isCompleted ? 'none' : 'spin 1s linear infinite',
            }}
          />
          {isCompleted ? <ShieldCheck size={16} color="#10B981" /> : <Activity size={14} color="#3B82F6" />}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {isCompleted ? 'Scan Completed' : `Scanning: ${repositoryName}`}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            {isCompleted ? `${findingsSummary.total} findings detected · Click to view` : `${progress}% · ${STAGES[currentStageIndex]?.engine}`}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 8, 17, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          backgroundColor: '#0A0F1D',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 99, 235, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        {/* Header with Cyber Tactical Badge */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#0F172A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                border: `1px solid ${isCompleted ? '#10B981' : '#3B82F6'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCompleted ? <ShieldCheck size={20} color="#10B981" /> : <Activity size={20} color="#3B82F6" className="animate-pulse" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: isCompleted ? '#34D399' : '#60A5FA',
                    fontFamily: 'monospace',
                  }}
                >
                  {isCompleted ? 'VERIFICATION COMPLETE' : 'MULTI-ENGINE SCAN RUNNING'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>//</span>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {repositoryName} : {branch}
                </span>
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '2px 0 0' }}>
                {isCompleted ? 'Security Verification Finished' : 'Deterministic Security Pipeline'}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              title="Minimize scanner"
            >
              <Minimize2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              title="Close window"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar & Telemetry Stats */}
        <div style={{ padding: '20px 24px', backgroundColor: '#0B132B', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
              Execution Progress: <strong style={{ color: '#F8FAFC' }}>{progress}%</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94A3B8' }}>
              <span>Files: <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{filesScanned}</strong></span>
              <span>Rules: <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{rulesEvaluated}</strong></span>
              <span>Findings: <strong style={{ color: isCompleted ? '#F87171' : '#FBBF24', fontFamily: 'monospace' }}>{findingsSummary.total}</strong></span>
            </div>
          </div>

          <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: isCompleted ? '#10B981' : '#3B82F6',
                borderRadius: '3px',
                transition: 'width 0.4s ease-out, background-color 0.3s ease',
                backgroundImage: isCompleted ? 'none' : 'linear-gradient(90deg, #2563EB, #60A5FA, #2563EB)',
              }}
            />
          </div>
        </div>

        {/* Main Body: Stages Grid & Terminal Stream */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.4fr)',
            gap: '20px',
            flex: 1,
          }}
        >
          {/* Left: Stages Step Tracker */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B', marginBottom: '12px' }}>
              Execution Pipeline Stages
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIndex || isCompleted;
                const isCurrent = idx === currentStageIndex && !isCompleted;
                return (
                  <div
                    key={stage.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isCurrent ? 'rgba(37, 99, 235, 0.12)' : isPassed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCurrent ? '#3B82F6' : isPassed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {isPassed ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : isCurrent ? (
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: '2px solid #3B82F6',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                      ) : (
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #475569' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: isPassed ? '#F8FAFC' : isCurrent ? '#60A5FA' : '#94A3B8' }}>
                          {stage.title}
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: isPassed ? '#34D399' : '#64748B' }}>
                          {stage.engine}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: 1.3 }}>
                        {stage.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Terminal Log Feed */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>
                <Terminal size={13} color="#3B82F6" />
                Live Engine Telemetry Stream
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#10B981' }}>● LIVE TTY</span>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: '260px',
                backgroundColor: '#050811',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#CBD5E1',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                lineHeight: 1.5,
              }}
            >
              {logs.map((log, i) => (
                <div key={i} style={{ wordBreak: 'break-word', color: log.includes('✅') ? '#34D399' : log.includes('match') || log.includes('detected') ? '#FBBF24' : '#CBD5E1' }}>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Footer Summary / Action CTA */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#0F172A',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {isCompleted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Findings:</span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                {findingsSummary.critical} Critical
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#FB923C', border: '1px solid rgba(249, 115, 22, 0.4)' }}>
                {findingsSummary.high} High
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#FDE047', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
                {findingsSummary.medium} Medium
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6', animation: 'pulse 1.5s infinite' }} />
              <span>Deterministic scanners evaluating ASTs & secrets in memory...</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isCompleted && (
              <button
                type="button"
                onClick={handleAbortScan}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#F87171',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Abort Scan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                color: '#CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCompleted ? 'Dismiss' : 'Run in Background'}
            </button>
            {isCompleted && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
              >
                <span>View Findings & Diffs</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
