'use client';

/**
 * THING AGENT — Overview Dashboard
 * Real data from /api/v1/agent/overview
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  MetricCard, AttentionBanner, StatusBadge, RiskBadge,
  AgentLoading, AgentError, SectionHeader,
} from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  Bot, Shield, Activity, GitBranch, Clock, Eye,
  CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react';
import { AgentCockpitLauncher } from '@/components/agent/AgentCockpitLauncher';

export default function AgentOverviewPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.overview(currentProject?.id);
        setData(d);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load agent overview');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id]);

  const metrics = data?.metrics || {};
  const attentionItems: any[] = data?.attention_items || [];
  const recentEvents: any[] = data?.recent_events || [];
  const riskDist: Record<string, number> = data?.risk_distribution || {};

  return (
    <AgentWorkshell
      activeCount={{
        approvals: metrics.pending_approvals,
        signals: metrics.behavior_signals,
      }}
    >
      {loading && <AgentLoading />}
      {error && <AgentError message={error} />}
      {!loading && !error && data && (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Attention Banners ──────────────────────────────────── */}
          {attentionItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attentionItems.map((item: any, i: number) => (
                <AttentionBanner key={i} {...item} />
              ))}
            </div>
          )}

          {/* ── Key Metrics ────────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            <MetricCard
              label="Total Agents"
              value={metrics.total_agents ?? '—'}
              sub={`${metrics.active_agents ?? 0} active`}
              accent="#a78bfa"
              icon={<Bot size={16} />}
            />
            <MetricCard
              label="High Risk"
              value={metrics.high_risk_agents ?? '—'}
              sub="require attention"
              accent={metrics.high_risk_agents > 0 ? '#f87171' : '#4ade80'}
              icon={<AlertTriangle size={16} />}
            />
            <MetricCard
              label="Active Sessions"
              value={metrics.active_sessions ?? '—'}
              sub={`${metrics.blocked_sessions ?? 0} revoked`}
              accent="#60a5fa"
              icon={<Clock size={16} />}
            />
            <MetricCard
              label="Actions Today"
              value={metrics.total_actions_today ?? '—'}
              sub={`${metrics.blocked_actions ?? 0} blocked`}
              accent="#34d399"
              icon={<Activity size={16} />}
            />
            <MetricCard
              label="Delegations"
              value={metrics.active_delegations ?? '—'}
              sub="active transfers"
              accent="#f59e0b"
              icon={<GitBranch size={16} />}
            />
            <MetricCard
              label="Behavior Signals"
              value={metrics.behavior_signals ?? '—'}
              sub="unresolved"
              accent={metrics.behavior_signals > 0 ? '#fb923c' : '#4ade80'}
              icon={<Eye size={16} />}
            />
            <MetricCard
              label="Pending Approvals"
              value={metrics.pending_approvals ?? '—'}
              sub="awaiting decision"
              accent={metrics.pending_approvals > 0 ? '#facc15' : '#4ade80'}
              icon={<CheckCircle2 size={16} />}
            />
            <MetricCard
              label="Actions Blocked"
              value={metrics.blocked_actions ?? '—'}
              sub="by policy"
              accent={metrics.blocked_actions > 0 ? '#f87171' : '#4ade80'}
              icon={<Shield size={16} />}
            />
          </div>

          {/* ── Interactive Autonomous Agent Cockpit ────────────────── */}
          <AgentCockpitLauncher />

          {/* ── Risk Distribution + Authority Coverage ─────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Risk Distribution */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: 20,
            }}>
              <SectionHeader title="Agent Risk Distribution" sub="Live risk level across all registered agents" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const).map((level) => {
                  const count = riskDist[level] || 0;
                  const total = metrics.total_agents || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    CRITICAL: '#f87171', HIGH: '#fb923c', MEDIUM: '#facc15', LOW: '#4ade80', UNKNOWN: '#94a3b8',
                  };
                  return (
                    <div key={level}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: colors[level], fontWeight: 600 }}>{level}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{count} agents</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: colors[level], width: `${pct}%`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Authority Coverage */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: 20,
            }}>
              <SectionHeader title="Authority Coverage" sub="Permission and delegation binding coverage" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                {[
                  { label: 'Agents with Policy Binding', value: data?.authority_coverage?.agents_with_policies ?? 0, icon: <Shield size={14} />, color: '#a78bfa' },
                  { label: 'Agents without Policy', value: data?.authority_coverage?.agents_without_policies ?? 0, icon: <AlertTriangle size={14} />, color: '#f87171' },
                  { label: 'Active Delegations', value: data?.authority_coverage?.active_delegations ?? 0, icon: <GitBranch size={14} />, color: '#60a5fa' },
                  { label: 'Pending Approvals', value: data?.authority_coverage?.pending_approvals ?? 0, icon: <CheckCircle2 size={14} />, color: '#facc15' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontSize: 12 }}>
                      {icon}
                      {label}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Audit Events ────────────────────────────────── */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <SectionHeader
                title="Recent Agent Events"
                sub="Authoritative audit trail — sorted by time"
                actions={
                  <Link href="/agent/activity" style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
                    VIEW ALL →
                  </Link>
                }
              />
            </div>
            <div style={{ padding: '8px 0' }}>
              {recentEvents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  No recent events
                </div>
              ) : (
                recentEvents.map((ev: any) => (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: ev.outcome === 'SUCCESS' ? '#4ade80' : '#f87171',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#a78bfa', fontWeight: 600 }}>
                        {ev.event_type}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {ev.actor} · {ev.details ? Object.entries(ev.details).map(([k,v]) => `${k}: ${v}`).join(' · ') : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </div>
                    <StatusBadge status={ev.outcome} />
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </AgentWorkshell>
  );
}
