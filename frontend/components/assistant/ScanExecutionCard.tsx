'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Play,
  Square,
  FileText,
  GitPullRequest,
  ArrowRight,
  ChevronRight,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';
import { EmptyState } from '@/components/ui/EmptyState';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export interface ScanPlanProps {
  repository: string;
  branch?: string;
  onRunScan: () => void;
  onCancel: () => void;
}

export function ScanPlanCard({ repository, branch = 'main', onRunScan, onCancel }: ScanPlanProps) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        padding: '20px 22px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginTop: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <KavachMark size={18} />
        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Scan plan for {repository}
        </h4>
        <span style={{ fontSize: 12, color: '#64748B', marginLeft: 'auto' }}>
          Branch: <strong>{branch}</strong>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {[
          { name: 'SAST (Source Code Analysis)', status: 'Enabled', badgeColor: '#DCFCE7', textColor: '#16A34A', icon: '🔍' },
          { name: 'Secrets Scanning', status: 'Enabled', badgeColor: '#DCFCE7', textColor: '#16A34A', icon: '🔑' },
          { name: 'Dependency Scan (SCA)', status: 'Enabled', badgeColor: '#DCFCE7', textColor: '#16A34A', icon: '📦' },
          { name: 'Container Security', status: 'Enabled', badgeColor: '#DCFCE7', textColor: '#16A34A', icon: '🐳' },
          { name: 'IaC Security', status: 'Enabled', badgeColor: '#DCFCE7', textColor: '#16A34A', icon: '🏗️' },
          { name: 'DAST (if configured)', status: 'Optional', badgeColor: '#F1F5F9', textColor: '#64748B', icon: '🌐' },
        ].map((mod, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid #F1F5F9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>{mod.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{mod.name}</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: mod.badgeColor,
                color: mod.textColor,
              }}
            >
              {mod.status}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            color: '#475569',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          id="run-scan-btn"
          onClick={onRunScan}
          style={{
            padding: '8px 20px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Play size={13} fill="#FFFFFF" />
          <span>Run Scan</span>
        </button>
      </div>
    </div>
  );
}

export interface ScanningInProgressProps {
  repository: string;
  branch?: string;
  projectId?: string | null;
  workspaceId?: string | null;
  onStop: () => void;
  onFinished: (results: any) => void;
}

export function ScanningInProgressCard({
  repository,
  branch = 'main',
  projectId,
  workspaceId,
  onStop,
  onFinished,
}: ScanningInProgressProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [percent, setPercent] = useState(15);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [terminalLog, setTerminalLog] = useState(
    `[INFO] Initializing security verification pipeline for ${repository}...\n> Resolving branch: ${branch}\n> Spawning deterministic scanner processes...`
  );

  const steps = [
    { name: 'Initializing environment', time: '1s' },
    { name: 'Scanning with Semgrep (SAST)', time: 'active' },
    { name: 'Scanning for secrets (Gitleaks)', time: 'active' },
    { name: 'Analyzing dependencies (OSV / SCA)', time: 'active' },
    { name: 'Checking IaC & container configuration', time: 'active' },
    { name: 'Evaluating deterministic policies', time: 'queued' },
    { name: 'Finalizing audit evidence', time: 'queued' },
  ];

  useEffect(() => {
    let isMounted = true;

    // Real elapsed timer
    const elapsedTimer = setInterval(() => {
      if (isMounted) setElapsedSecs((s) => s + 1);
    }, 1000);

    // Dynamic terminal updates
    const logTimer = setInterval(() => {
      setPercent((prev) => {
        if (prev < 85) {
          const next = prev + 8;
          if (next > 35 && currentStep < 2) {
            setCurrentStep(2);
            setTerminalLog((l) => l + '\n> Executing Semgrep engine against local repository AST...');
          }
          if (next > 60 && currentStep < 4) {
            setCurrentStep(4);
            setTerminalLog((l) => l + '\n> Inspecting secrets and dependency vulnerabilities via Gitleaks & OSV...');
          }
          return next;
        }
        return prev;
      });
    }, 900);

    // Call real backend scan API
    api.assistant
      .triggerScan({
        project_id: projectId || null,
        workspace_id: workspaceId || null,
        repositories: [repository],
        branch,
      })
      .then((res: any) => {
        if (!isMounted) return;
        const data = res?.structured_data || res;
        if (data?.status === 'FAILED' || res?.structured_data?.status === 'FAILED') {
          clearInterval(logTimer);
          const errDetail = data?.error || res?.message || 'Scan execution encountered an issue.';
          setScanError(errDetail);
          setTerminalLog((l) => l + `\n[ERROR] Deterministic scan execution failed: ${errDetail}`);
          return;
        }
        setPercent(100);
        setCurrentStep(steps.length);
        setTerminalLog((l) => l + '\n> Scan completed successfully! Writing evidence to database...');
        clearInterval(logTimer);
        setTimeout(() => {
          onFinished(data);
        }, 500);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        clearInterval(logTimer);
        console.error('Scan execution failed:', err);
        setScanError(err?.message || 'Security scan failed. Please check scanner availability or project configuration.');
        setTerminalLog((l) => l + `\n[ERROR] Scan execution terminated: ${err?.message || 'Unknown error'}`);
      });

    return () => {
      isMounted = false;
      clearInterval(elapsedTimer);
      clearInterval(logTimer);
    };
  }, [repository, branch, projectId, onFinished]);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        padding: '20px 22px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={18} className="animate-spin" color="#2563EB" />
          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Scanning repository: {repository}
          </h4>
          <span style={{ fontSize: 12, color: '#64748B' }}>({branch})</span>
        </div>
        <button
          type="button"
          onClick={onStop}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FECACA',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Square size={11} fill="#DC2626" />
          <span>Stop scan</span>
        </button>
      </div>

      {scanError && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <AlertTriangle size={18} color="#DC2626" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
              Scan Execution Issue
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
              {scanError}
            </div>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {steps.map((st, i) => {
          let statusText = 'Queued';
          let statusColor = '#94A3B8';
          let icon = <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />;

          if (i < currentStep) {
            statusText = 'Completed';
            statusColor = '#16A34A';
            icon = <CheckCircle2 size={16} color="#16A34A" />;
          } else if (i === currentStep) {
            statusText = 'In progress';
            statusColor = '#2563EB';
            icon = <Loader2 size={16} className="animate-spin" color="#2563EB" />;
          }

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon}
                <span
                  style={{
                    fontWeight: i === currentStep ? 700 : 500,
                    color: i <= currentStep ? '#0F172A' : '#64748B',
                  }}
                >
                  {st.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>
                  {statusText}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8', width: 28, textAlign: 'right' }}>
                  {i <= currentStep ? st.time : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal log box */}
      <div
        style={{
          backgroundColor: '#0F172A',
          color: '#38BDF8',
          fontFamily: 'monospace',
          fontSize: 11,
          lineHeight: 1.5,
          padding: '12px 14px',
          borderRadius: 8,
          marginBottom: 16,
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', marginBottom: 6, fontSize: 10 }}>
          <Terminal size={12} />
          <span>CONSOLE LOG</span>
        </div>
        {terminalLog}
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
          <span>Overall Progress</span>
          <span>{percent}%</span>
        </div>
        <div style={{ width: '100%', height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: '#2563EB',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export interface ScanResultsCardProps {
  repository: string;
  results?: any;
  onSelectFinding: (finding: any) => void;
  onShowReport: () => void;
  onCreatePRs: () => void;
}

export function ScanResultsCard({
  repository,
  results,
  onSelectFinding,
  onShowReport,
  onCreatePRs,
}: ScanResultsCardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'sast' | 'secrets' | 'sca' | 'container' | 'iac'>('all');

  const crit = results?.critical_count ?? 0;
  const high = results?.high_count ?? 0;
  const med = results?.medium_count ?? 0;
  const low = results?.low_count ?? 0;
  const total = results?.findings_count ?? (crit + high + med + low);

  const findingsList: any[] = results?.findings || [];

  const filtered = findingsList.filter((f: any) => {
    if (activeTab === 'all') return true;
    const mod = (f.module || '').toLowerCase();
    if (activeTab === 'sast') return mod.includes('sast');
    if (activeTab === 'secrets') return mod.includes('secret');
    if (activeTab === 'sca') return mod.includes('sca') || mod.includes('dep');
    if (activeTab === 'container') return mod.includes('container');
    if (activeTab === 'iac') return mod.includes('iac');
    return true;
  });

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        padding: '20px 22px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={18} />
        </div>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Scan completed!
          </h4>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            I analyzed all available modules and found {total} findings for <strong>{repository}</strong>.
          </span>
        </div>
      </div>

      {/* 4 Severity Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Critical', count: crit, bg: '#FEF2F2', text: '#DC2626', icon: '🚨' },
          { label: 'High', count: high, bg: '#FFF7ED', text: '#EA580C', icon: '⚠️' },
          { label: 'Medium', count: med, bg: '#FEFCE8', text: '#D97706', icon: '⚡' },
          { label: 'Low', count: low, bg: '#F1F5F9', text: '#475569', icon: 'ℹ️' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              backgroundColor: m.bg,
              border: `1px solid ${m.bg === '#FEF2F2' ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: 8,
              padding: '12px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: m.text, lineHeight: 1.1 }}>
              {m.count}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: m.text, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: 8,
          marginBottom: 14,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'all', label: `All (${findingsList.length})` },
          { key: 'sast', label: 'SAST' },
          { key: 'secrets', label: 'Secrets' },
          { key: 'sca', label: 'Dependencies' },
          { key: 'container', label: 'Container' },
          { key: 'iac', label: 'IaC' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              backgroundColor: activeTab === t.key ? '#0F172A' : '#F1F5F9',
              color: activeTab === t.key ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Findings Table or Clean State */}
      {findingsList.length === 0 ? (
        <div style={{ marginBottom: 18 }}>
          <EmptyState
            variant="no_vulnerabilities"
            title="Zero Vulnerabilities Detected"
            description={`All executed scanners (Semgrep, Gitleaks, OSV, Checkov) completed without detecting any vulnerabilities in ${repository}.`}
          />
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 2fr 1fr',
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>Title</span>
            <span>Module</span>
            <span>File</span>
            <span style={{ textAlign: 'right' }}>Severity</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px 16px' }}>
                <EmptyState
                  variant="no_filter_results"
                  title="No Filter Matches"
                  description={`No security findings match the ${activeTab.toUpperCase()} filter category.`}
                />
              </div>
            ) : (
              filtered.map((f: any, idx: number) => {
                const isCrit = (f.severity || '').toLowerCase() === 'critical';
                const isHigh = (f.severity || '').toLowerCase() === 'high';
                const isMed = (f.severity || '').toLowerCase() === 'medium';

                const badgeBg = isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FEFCE8' : '#F1F5F9';
                const badgeText = isCrit ? '#DC2626' : isHigh ? '#EA580C' : isMed ? '#D97706' : '#475569';

                return (
                  <div
                    key={f.id || idx}
                    onClick={() => onSelectFinding(f)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 2fr 1fr',
                      padding: '11px 14px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                      fontSize: 12,
                      alignItems: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.1s ease',
                    }}
                    className="hover:bg-slate-50"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0F172A' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.title}
                      </span>
                    </div>

                    <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>
                      {f.module || 'SAST'}
                    </span>

                    <span
                      style={{
                        color: '#64748B',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.file || f.file_path || 'src/app.py'}
                    </span>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: badgeBg,
                          color: badgeText,
                        }}
                      >
                        {f.severity}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          onClick={onShowReport}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileText size={14} color="#2563EB" />
          <span>Show detailed report</span>
        </button>

        <button
          type="button"
          onClick={onCreatePRs}
          style={{
            padding: '8px 18px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <GitPullRequest size={14} />
          <span>Create pull requests for fixes</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
