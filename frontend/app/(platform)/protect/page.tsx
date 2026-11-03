'use client';

/**
 * Thing Protect — Overview Control Center (/protect)
 * Active defense headquarters connecting to GET /api/v1/protect/overview.
 * Uses native design system tokens for seamless aesthetic consistency.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Cpu,
  Bot,
  Lock,
  ChevronRight,
  Server,
  Zap,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ProtectionStateBadge,
  EnforcementDecisionBadge,
  EvidenceDrawer,
  EmptyProtectState,
  MetricCard,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionEvidence } from '@/types/api/protect';

export default function ProtectOverviewPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.protect.overview();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load Protect Overview:', err);
      setError(err?.message || 'Failed to communicate with THING Protect API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Keyboard accessibility: Escape key closes evidence drawer (Mistake #57, #67)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && evidenceDrawerOpen) {
        setEvidenceDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evidenceDrawerOpen]);

  const handleInspectEvidence = async (evidenceId?: string) => {
    if (!evidenceId) return;
    try {
      const ev = await api.protect.evidenceDetail(evidenceId);
      setSelectedEvidence(ev);
      setEvidenceDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch evidence trace:', err);
    }
  };

  // Safe normalized values
  const activeThreatsList = Array.isArray(data?.active_threats) ? data.active_threats : [];
  const enforcementFailuresList = Array.isArray(data?.enforcement_failures) ? data.enforcement_failures : [];
  const recentEventsList = Array.isArray(data?.recent_events) ? data.recent_events : [];

  const activeControlsCount =
    data?.metrics?.active_controls ?? data?.active_controls_count ?? 0;
  const blockedDecisionsCount =
    data?.metrics?.blocked_today ?? data?.blocked_decisions_count ?? 0;
  const pendingApprovalsCount =
    data?.metrics?.pending_approvals ?? data?.pending_approvals_count ?? 0;
  const unprotectedServicesCount =
    data?.metrics?.unprotected_services ?? data?.unprotected_services_count ?? 0;

  const allowsCount =
    data?.enforcement_activity?.allows ?? data?.enforcement_breakdown?.ALLOW ?? 0;
  const blocksCount =
    data?.enforcement_activity?.blocks ?? data?.enforcement_breakdown?.BLOCK ?? 0;
  const challengesCount =
    data?.enforcement_activity?.challenges ?? data?.enforcement_breakdown?.CHALLENGE ?? 0;
  const approvalsCount =
    data?.enforcement_activity?.approvals ?? data?.enforcement_breakdown?.REQUIRE_APPROVAL ?? 0;
  const rateLimitsCount =
    data?.enforcement_activity?.rate_limits ?? data?.enforcement_breakdown?.RATE_LIMIT ?? 0;

  const totalDecisionsCount =
    allowsCount + blocksCount + challengesCount + approvalsCount + rateLimitsCount;

  const parseRatio = (ratioStr?: string, fallbackNum = 2, fallbackDen = 2) => {
    if (!ratioStr || typeof ratioStr !== 'string') {
      return { num: fallbackNum, den: fallbackDen };
    }
    const parts = ratioStr.split('/').map((s) => parseInt(s.trim(), 10));
    return {
      num: isNaN(parts[0]) ? fallbackNum : parts[0],
      den: isNaN(parts[1]) ? fallbackDen : parts[1],
    };
  };

  const servicesRatio = parseRatio(
    data?.runtime_coverage?.protected_services,
    data?.coverage_summary?.protected_services || 0,
    data?.coverage_summary?.total_services || 0
  );
  const apisRatio = parseRatio(
    data?.runtime_coverage?.protected_apis,
    data?.coverage_summary?.protected_apis || 0,
    data?.coverage_summary?.total_apis || 0
  );
  const agentsRatio = parseRatio(
    data?.runtime_coverage?.protected_agents,
    data?.coverage_summary?.protected_agents || 0,
    data?.coverage_summary?.total_agents || 0
  );
  const mcpRatio = parseRatio(
    data?.runtime_coverage?.mcp_gateways,
    data?.coverage_summary?.protected_mcp_servers || 0,
    data?.coverage_summary?.total_mcp_servers || 0
  );
  const k8sRatio = parseRatio(
    data?.runtime_coverage?.network_controls,
    data?.coverage_summary?.protected_k8s_workloads || 0,
    data?.coverage_summary?.total_k8s_workloads || 0
  );

  return (
    <ProtectWorkshell
      activeCount={{
        approvals: pendingApprovalsCount,
        threats: activeThreatsList.length,
        enforcementFailures: enforcementFailuresList.length,
      }}
      actions={
        <button
          onClick={fetchOverview}
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
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Error Banner */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchOverview}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Top Metric Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          <MetricCard
            title="Protection Engine"
            value={data?.protection_state || 'ACTIVE'}
            subtitle={`Fail Mode: ${data?.fail_mode || 'FAIL_CLOSED'}`}
            accent="#10b981"
            badge={<ProtectionStateBadge state={data?.protection_state || 'ACTIVE'} />}
          />

          <MetricCard
            title="Active Controls"
            value={activeControlsCount}
            subtitle="Evaluating 100% of ingress"
            accent="#34d399"
          />

          <MetricCard
            title="Blocked Decisions"
            value={blockedDecisionsCount}
            subtitle={`Total Decisions: ${totalDecisionsCount}`}
            accent="#f87171"
          />

          <MetricCard
            title="Protected Runtimes"
            value={`${servicesRatio.num} / ${servicesRatio.den}`}
            subtitle={unprotectedServicesCount > 0 ? `${unprotectedServicesCount} Unprotected Gaps` : 'All Runtimes Enforced'}
            accent="var(--color-text-primary)"
          />

          <MetricCard
            title="Pending Approvals"
            value={pendingApprovalsCount}
            subtitle="Waiting for human review"
            accent="#fbbf24"
            badge={
              <Link href="/protect/approvals" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none' }}>
                Queue →
              </Link>
            }
          />
        </div>

        {/* ── Critical Attention Banner if any enforcement failure ── */}
        {enforcementFailuresList.length > 0 && (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>
              <ShieldAlert size={16} />
              <span>CRITICAL: ENFORCEMENT FAILURES DETECTED</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Security controls failed to enforce on {enforcementFailuresList.length} target(s). In Fail-{data?.fail_mode || 'CLOSED'} mode, traffic may be dropped.
            </p>
          </div>
        )}

        {/* ── Mid Section: Decisions Breakdown & Inventory Coverage ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Left Column: Enforcement Activity & Threat Signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Decisions breakdown */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={15} color="#10b981" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                    ENFORCEMENT ACTIVITY (LAST 24 HOURS)
                  </span>
                </div>
                <Link
                  href="/protect/enforcement"
                  style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  View Decisions Log <ChevronRight size={12} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>ALLOW</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{allowsCount}</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>BLOCK</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>{blocksCount}</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>CHALLENGE</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>{challengesCount}</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>APPROVAL</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{approvalsCount}</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>RATE LIMIT</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fb923c', fontFamily: 'var(--font-mono)' }}>{rateLimitsCount}</span>
                </div>
              </div>
            </div>

            {/* Active Threats */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} color="#f87171" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                    ACTIVE THREAT SIGNALS &amp; RUNTIME DETECTIONS
                  </span>
                </div>
                <Link
                  href="/protect/threats"
                  style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  View All Threats <ChevronRight size={12} />
                </Link>
              </div>

              {activeThreatsList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  0 Active Threat Signals Recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeThreatsList.map((threat: any) => (
                    <div
                      key={threat.id}
                      style={{
                        padding: '12px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {threat.threat_name}
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            {threat.severity}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Source: {threat.source} → Target: {threat.target_resource || threat.target || 'Workload'} (Actor: {threat.actor || 'unauthorized'})
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <EnforcementDecisionBadge decision={threat.action_taken || 'BLOCK'} />
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {threat.detected_at}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Runtime Inventory Coverage */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={15} color="#10b981" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                    RUNTIME INVENTORY COVERAGE
                  </span>
                </div>
                <Link href="/protect/coverage" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none' }}>
                  Details
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Protected Services &amp; Apps</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{servicesRatio.num} / {servicesRatio.den}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${servicesRatio.den > 0 ? (servicesRatio.num / servicesRatio.den) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Protected APIs</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{apisRatio.num} / {apisRatio.den}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${apisRatio.den > 0 ? (apisRatio.num / apisRatio.den) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Protected AI Agents</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{agentsRatio.num} / {agentsRatio.den}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${agentsRatio.den > 0 ? (agentsRatio.num / agentsRatio.den) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>MCP Security Gateways</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{mcpRatio.num} / {mcpRatio.den}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${mcpRatio.den > 0 ? (mcpRatio.num / mcpRatio.den) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Kubernetes &amp; Network Controls</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{k8sRatio.num} / {k8sRatio.den}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${k8sRatio.den > 0 ? (k8sRatio.num / k8sRatio.den) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Unprotected Services:</span>
              <span style={{ fontWeight: 700, color: '#fbbf24' }}>{unprotectedServicesCount}</span>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Recent Protection Events ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck2 size={15} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                RECENT PROTECTION DECISIONS &amp; ENFORCEMENTS
              </span>
            </div>
            <Link
              href="/protect/enforcement"
              style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Full Enforcement Log <ArrowRight size={11} />
            </Link>
          </div>

          {recentEventsList.length === 0 ? (
            <EmptyProtectState
              title="NO PROTECTION EVENTS"
              description="No runtime decisions have been recorded for the selected scope."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px 16px' }}>ACTOR</th>
                  <th style={{ padding: '10px 16px' }}>ACTION &amp; TARGET</th>
                  <th style={{ padding: '10px 16px' }}>POLICY / EVENT</th>
                  <th style={{ padding: '10px 16px' }}>DECISION</th>
                  <th style={{ padding: '10px 16px' }}>DETAILS</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>EVIDENCE</th>
                </tr>
              </thead>
              <tbody>
                {recentEventsList.map((evt: any) => (
                  <tr
                    key={evt.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {evt.timestamp}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {evt.actor || 'system'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                      <span>{evt.event_type || evt.action || 'INVOKE'}</span>
                      <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>→</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {evt.resource || 'gateway'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {evt.title || evt.policy_name || 'Baseline'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <EnforcementDecisionBadge decision={evt.decision || 'ALLOW'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                      {evt.reason || evt.title || 'Policy evaluated'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {evt.evidence_id ? (
                        <button
                          onClick={() => handleInspectEvidence(evt.evidence_id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          PROOF
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
      />
    </ProtectWorkshell>
  );
}
