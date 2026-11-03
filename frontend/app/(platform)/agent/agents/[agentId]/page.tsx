'use client';

/**
 * THING AGENT — Agent Detail Page
 * Full profile of a single agent: identity, permissions, sessions, actions, behavior signals.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge, StatusBadge, DecisionBadge, MetricCard,
  Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader,
} from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  Bot, Shield, Key, Activity, AlertTriangle, GitBranch, Clock,
  Lock, ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params?.agentId as string;
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.agentDetail(agentId, currentProject?.id);
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Agent not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agentId, currentProject?.id]);

  const handleQuarantine = async () => {
    const reason = prompt('Quarantine reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await api.agent.quarantineAgent(agentId, reason, currentProject?.id);
      const d = await api.agent.agentDetail(agentId, currentProject?.id);
      setData(d);
    } catch (e: any) {
      alert(`Quarantine failed: ${e?.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    const reason = prompt('Disable reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await api.agent.disableAgent(agentId, reason, currentProject?.id);
      const d = await api.agent.agentDetail(agentId, currentProject?.id);
      setData(d);
    } catch (e: any) {
      alert(`Disable failed: ${e?.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <AgentWorkshell><AgentLoading /></AgentWorkshell>;
  if (error) return <AgentWorkshell><AgentError message={error} /></AgentWorkshell>;
  if (!data) return <AgentWorkshell><AgentError message="Agent not found" /></AgentWorkshell>;

  const auth = data.authority_summary || {};

  return (
    <AgentWorkshell>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Back */}
        <Link href="/agent/agents" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          <ChevronLeft size={14} /> Agent Registry
        </Link>

        {/* Agent Header */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 10, padding: '20px 24px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Bot size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{data.name}</span>
                <RiskBadge risk={data.risk_level} size="md" />
                <StatusBadge status={data.status} size="md" />
              </div>
              <div style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {data.identity_uri}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {data.agent_id} · {data.owner} · {data.environment_id?.toUpperCase()}
              </div>
              {data.description && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, maxWidth: 520 }}>
                  {data.description}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {data.status !== 'QUARANTINED' && (
              <button onClick={handleQuarantine} disabled={actionLoading} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)',
                background: 'rgba(249,115,22,0.08)', color: '#fb923c',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}>
                Quarantine
              </button>
            )}
            {data.status !== 'DISABLED' && (
              <button onClick={handleDisable} disabled={actionLoading} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)', color: '#f87171',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}>
                Disable
              </button>
            )}
          </div>
        </div>

        {/* Authority Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
        }}>
          <MetricCard label="Permissions" value={auth.total_permissions ?? 0} sub={`${auth.expired_permissions ?? 0} expired`} accent="#a78bfa" icon={<Shield size={14} />} />
          <MetricCard label="Actions" value={(auth.actions || []).length} sub="distinct action types" accent="#60a5fa" icon={<Key size={14} />} />
          <MetricCard label="Resources" value={(auth.resources || []).length} sub="in scope" accent="#34d399" icon={<GitBranch size={14} />} />
          <MetricCard label="Environments" value={(auth.environments || []).length} sub="access scope" accent="#f59e0b" icon={<Clock size={14} />} />
          <MetricCard label="Revoked" value={auth.revoked_permissions ?? 0} sub="permissions" accent={auth.revoked_permissions > 0 ? '#f87171' : '#4ade80'} icon={<Lock size={14} />} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Permissions */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <SectionHeader title="Active Permissions" sub={`${(data.permissions || []).filter((p: any) => p.status === 'ACTIVE').length} active`} />
            </div>
            <Table>
              <thead><tr><Th>Action</Th><Th>Resource</Th><Th>Source</Th><Th>Status</Th></tr></thead>
              <tbody>
                {(data.permissions || []).slice(0, 10).map((p: any) => (
                  <Tr key={p.id}>
                    <Td mono>{p.action}</Td>
                    <Td>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{p.resource}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>{p.source}</span>
                    </Td>
                    <Td><StatusBadge status={p.status} /></Td>
                  </Tr>
                ))}
                {(data.permissions || []).length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No permissions</td></tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Behavior Signals */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <SectionHeader
                title="Behavior Signals"
                sub={`${(data.behavior_signals || []).length} unresolved`}
              />
            </div>
            {(data.behavior_signals || []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                No behavior signals detected
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {(data.behavior_signals || []).map((b: any) => (
                  <div key={b.id} style={{
                    padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AlertTriangle size={12} color={b.severity === 'HIGH' || b.severity === 'CRITICAL' ? '#f87171' : '#facc15'} />
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {b.signal_type}
                      </span>
                      <RiskBadge risk={b.severity} />
                      <StatusBadge status={b.verification_status} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {b.description}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {new Date(b.detected_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Actions */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <SectionHeader title="Recent Tool Executions" sub="Authoritative action log" />
          </div>
          <Table>
            <thead><tr><Th>Tool</Th><Th>Target Resource</Th><Th>Decision</Th><Th>Result</Th><Th>Duration</Th><Th>Time</Th></tr></thead>
            <tbody>
              {(data.recent_actions || []).map((a: any) => (
                <Tr key={a.id}>
                  <Td mono>{a.tool_name}</Td>
                  <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.target_resource || '—'}</span></Td>
                  <Td><DecisionBadge decision={a.decision} /></Td>
                  <Td><StatusBadge status={a.result || 'UNKNOWN'} /></Td>
                  <Td mono>{a.duration_ms != null ? `${a.duration_ms}ms` : '—'}</Td>
                  <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(a.executed_at).toLocaleString()}</span></Td>
                </Tr>
              ))}
              {(data.recent_actions || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No actions recorded</td></tr>
              )}
            </tbody>
          </Table>
        </div>

      </div>
    </AgentWorkshell>
  );
}
