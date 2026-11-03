'use client';

/**
 * Thing Attack — HQ Overview Page (/attack)
 * Real offensive security headquarters connecting to GET /api/v1/attack/overview.
 * No hardcoded metrics or fake counts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  MetricCard,
  SeverityBadge,
  ExploitabilityBadge,
  AttackStatusBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackOverviewResponse } from '@/types/api/attack';
import {
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Flame,
  Globe2,
  FileCode2,
  Server,
  Cloud,
  Box,
  Layers,
  Clock,
  Play,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export default function AttackOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<AttackOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.overview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to Thing Attack engine');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = data?.metrics;
  const breakdown = data?.attack_surface_breakdown;

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
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{error}</span>
            <button
              onClick={load}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Top Metric Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <MetricCard
            label="Exposed Assets"
            value={loading ? '–' : (metrics?.exposed_assets ?? 0)}
            sublabel="Reachable targets"
            loading={loading}
          />
          <MetricCard
            label="Tested Assets"
            value={loading ? '–' : (metrics?.tested_assets ?? 0)}
            sublabel="With ≥1 verified scan"
            loading={loading}
          />
          <MetricCard
            label="Verified Issues"
            value={loading ? '–' : (metrics?.verified_issues ?? 0)}
            sublabel="Confirmed exploitable"
            color={metrics && metrics.verified_issues > 0 ? '#ef4444' : undefined}
            loading={loading}
          />
          <MetricCard
            label="Attack Paths"
            value={loading ? '–' : (metrics?.attack_paths ?? 0)}
            sublabel="Multi-hop chains"
            color={metrics && metrics.attack_paths > 0 ? '#f97316' : undefined}
            loading={loading}
          />
        </div>

        {/* ── If no targets configured ── */}
        {!loading && data && !data.has_targets && (
          <EmptyAttackState
            title="NO ATTACK TARGETS CONFIGURED"
            description="Connect an API endpoint, web service, domain, or cloud workload to begin adversarial surface testing."
            actionLabel="Register First Target"
            onAction={() => router.push('/attack/surface')}
          />
        )}

        {/* ── Critical Exploitability Row ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={15} color="#ef4444" />
                Critical Exploitability
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Confirmed exploitable findings backed by deterministic evidence
              </p>
            </div>

            <Link
              href="/attack/findings"
              style={{
                fontSize: '11px',
                color: '#ef4444',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              View all findings <ArrowRight size={11} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data?.critical_exploitability && data.critical_exploitability.length > 0 ? (
              data.critical_exploitability.map((f) => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/attack/findings/${f.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SeverityBadge severity={f.severity} size="sm" />
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {f.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>{f.target}</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>•</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>{f.attack_type}</span>
                        {f.has_evidence && (
                          <>
                            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>•</span>
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                              ✓ Verifiable Evidence
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ExploitabilityBadge status={f.exploitability} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{f.detected_at}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No active critical exploitable findings recorded.
              </div>
            )}
          </div>
        </div>

        {/* ── Attack Surface Breakdown & Recent Tests ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Surface Breakdown */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Attack Surface Distribution
              </h3>
              <Link href="/attack/surface" style={{ fontSize: '11px', color: '#ef4444', textDecoration: 'none' }}>
                Manage assets →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Globe2 size={16} color="#3b82f6" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Domains</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.domains ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <FileCode2 size={16} color="#ef4444" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>APIs</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.apis ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Server size={16} color="#10b981" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Services</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.services ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Cloud size={16} color="#8b5cf6" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Cloud Assets</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.cloud_assets ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Box size={16} color="#f97316" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Containers</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.containers ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Layers size={16} color="#06b6d4" />
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Kubernetes</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {breakdown?.kubernetes ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tests */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Recent Security Tests
              </h3>
              <Link href="/attack/dast" style={{ fontSize: '11px', color: '#ef4444', textDecoration: 'none' }}>
                All test runs →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data?.recent_tests && data.recent_tests.length > 0 ? (
                data.recent_tests.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: t.test_type === 'DAST' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                            color: t.test_type === 'DAST' ? '#ef4444' : '#f97316',
                          }}
                        >
                          {t.test_type}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {t.target}
                        </span>
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                        {t.started_at || 'Recently'} • {t.findings_count} findings
                      </span>
                    </div>

                    <AttackStatusBadge status={t.status} />
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No recent tests executed.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Attack Activity ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Recent Offensive &amp; Verification Activity
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Real runtime &amp; test telemetry</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data?.recent_activity && data.recent_activity.length > 0 ? (
              data.recent_activity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {act.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({act.target})</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{act.timestamp}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No recent activity logged.
              </div>
            )}
          </div>
        </div>
      </div>
    </AttackWorkshell>
  );
}
