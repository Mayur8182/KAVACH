'use client';

/**
 * Thing Attack — DAST Workspace (/attack/dast)
 * Real Dynamic Application Security Testing (DAST) execution lifecycle.
 * Strict adherence to Safety Controls (Rate limits, Destructive policy, Production approval).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  AttackStatusBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackDastRunItem, StartDastRunRequest } from '@/types/api/attack';
import {
  Flame,
  Play,
  XOctagon,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sliders,
  Terminal,
  Layers,
} from 'lucide-react';

export default function DastPage() {
  const [runs, setRuns] = useState<AttackDastRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [targetUrl, setTargetUrl] = useState('https://api.production.internal');
  const [environment, setEnvironment] = useState('production');
  const [testProfile, setTestProfile] = useState('OWASP_API_SECURITY_TOP_10');
  const [rateLimit, setRateLimit] = useState(30);
  const [destructiveTest, setDestructiveTest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Safety confirmation modal for production
  const [showProdWarning, setShowProdWarning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.dastRuns();
      setRuns(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load DAST execution runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    if (environment === 'production') {
      setShowProdWarning(true);
      return;
    }
    executeDastRun();
  };

  const executeDastRun = async () => {
    setSubmitting(true);
    setShowProdWarning(false);
    try {
      await api.attack.startDast({
        target_url: targetUrl,
        environment,
        test_profile: testProfile,
        safety_policy: {
          max_rate_limit: rateLimit,
          destructive_testing: destructiveTest,
        },
      });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to launch DAST run');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (runId: string) => {
    if (!confirm('Cancel active DAST execution job?')) return;
    try {
      await api.attack.cancelDast(runId);
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel DAST job');
    }
  };

  return (
    <AttackWorkshell
      actions={
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Start DAST Form */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Flame size={18} color="#ef4444" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Configure &amp; Launch DAST Scan
            </h2>
          </div>
          <p style={{ margin: '0 0 20px 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Real dynamic application security testing against live HTTP and API services with deterministic payload evaluation.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Target Base URL *
                </label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: environment === 'production' ? '#f87171' : 'var(--color-text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    fontWeight: 600,
                  }}
                >
                  <option value="production">Production (Guarded)</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Test Profile
                </label>
                <select
                  value={testProfile}
                  onChange={(e) => setTestProfile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                >
                  <option value="OWASP_API_SECURITY_TOP_10">OWASP API Security Top 10</option>
                  <option value="OWASP_WEB_TOP_10">OWASP Web Top 10</option>
                  <option value="LIGHTWEIGHT_PASSIVE">Passive Discovery Only</option>
                  <option value="FULL_AUDIT">Full Penetration Audit</option>
                </select>
              </div>
            </div>

            {/* Safety Controls Panel (Section 15) */}
            <div
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color="#f59e0b" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Active Safety Controls &amp; Invariants
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '11.5px' }}>
                <div>
                  <label style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    Rate Limit (Req/sec max)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    style={{
                      width: '100px',
                      padding: '4px 8px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="destructive_check"
                    checked={destructiveTest}
                    onChange={(e) => setDestructiveTest(e.target.checked)}
                    disabled
                  />
                  <label htmlFor="destructive_check" style={{ color: 'var(--color-text-muted)' }}>
                    Destructive Tests (Hard-Locked OFF by Policy Engine)
                  </label>
                </div>

                <div style={{ color: 'var(--color-text-muted)' }}>
                  Production Safety: <strong style={{ color: '#10b981' }}>Enforced</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                <Play size={13} />
                {submitting ? 'Initializing Job...' : 'Start DAST'}
              </button>
            </div>
          </form>
        </div>

        {/* Active & Historical DAST Runs */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              DAST Test Runs ({runs.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Real execution worker states
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {runs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No DAST test runs executed yet. Launch a test above to begin.
              </div>
            ) : (
              runs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                          {r.target_url}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: r.environment === 'production' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: r.environment === 'production' ? '#f87171' : '#60a5fa',
                          }}
                        >
                          {r.environment.toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                        Profile: {r.test_profile} • Discovered: {r.endpoints_discovered} • Tested: {r.endpoints_tested} • Findings: {r.findings_count}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AttackStatusBadge status={r.status} />
                      {r.status === 'RUNNING' && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#ef4444',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <XOctagon size={11} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                      <span>Progress</span>
                      <span>{r.progress_percentage}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--color-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${r.progress_percentage}%`,
                          background: r.status === 'COMPLETED' ? '#10b981' : '#ef4444',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Execution Logs Drawer */}
                  {r.raw_logs && r.raw_logs.length > 0 && (
                    <div
                      style={{
                        background: '#0d1117',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#8b949e',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                      }}
                    >
                      {r.raw_logs.map((log, idx) => (
                        <div key={idx} style={{ color: log.includes('[WARN]') ? '#f87171' : log.includes('[SECURITY]') ? '#eab308' : '#8b949e' }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Production Safety Warning Modal (Section 15) */}
        {showProdWarning && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setShowProdWarning(false)}
          >
            <div
              style={{
                width: '460px',
                maxWidth: '90vw',
                background: 'var(--color-surface)',
                border: '1px solid #ef4444',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 12px 32px rgba(239, 68, 68, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Production Target Detected
                </h3>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                This test target is marked as <strong>Production</strong> ({targetUrl}).
                <br /><br />
                Executing tests will generate live offensive security traffic. Destructive modules are strictly prohibited by the OPA Policy Engine.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowProdWarning(false)}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDastRun}
                  style={{
                    padding: '8px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Authorize &amp; Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
