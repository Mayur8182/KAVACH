'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { RiskBadge, StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

export default function SessionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.agent.sessions({ projectId: currentProject?.id, status: statusFilter || undefined });
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentProject?.id, statusFilter]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  const handleRevoke = async (sessionId: string) => {
    const reason = prompt('Revocation reason:');
    if (!reason) return;
    try {
      await api.agent.revokeSession(sessionId, reason, currentProject?.id);
      await load();
    } catch (e: any) {
      alert(`Revoke failed: ${e?.message}`);
    }
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionHeader title="Agent Sessions" sub={`${data?.total ?? items.length} sessions — active, expired, and revoked`} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            <option value="">All Sessions</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            <Table>
              <thead>
                <tr>
                  <Th>Session</Th>
                  <Th>Agent</Th>
                  <Th>Trigger</Th>
                  <Th>Environment</Th>
                  <Th>Risk</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                  <Th>Blocks</Th>
                  <Th>Started</Th>
                  <Th>Last Activity</Th>
                  <Th>Expires</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {items.map((s: any) => (
                  <Tr key={s.id}>
                    <Td mono><span style={{ fontSize: 10, color: '#a78bfa' }}>{s.session_id}</span></Td>
                    <Td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{s.agent_name || '—'}</div>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 11 }}>{s.trigger || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{s.trigger_type}</div>
                    </Td>
                    <Td>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: s.environment_id === 'production' ? '#fb923c' : '#60a5fa',
                      }}>
                        {s.environment_id?.toUpperCase()}
                      </span>
                    </Td>
                    <Td><RiskBadge risk={s.risk_level} /></Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td mono><span style={{ color: 'var(--color-text-muted)' }}>{s.tool_calls}</span></Td>
                    <Td mono>
                      <span style={{ color: s.policy_blocks > 0 ? '#f87171' : 'var(--color-text-muted)' }}>
                        {s.policy_blocks}
                      </span>
                    </Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(s.started_at).toLocaleString()}</span></Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(s.last_activity_at).toLocaleString()}</span></Td>
                    <Td>
                      <span style={{
                        fontSize: 11,
                        color: s.expires_at && new Date(s.expires_at) < new Date() ? '#f87171' : 'var(--color-text-muted)',
                      }}>
                        {s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                      </span>
                    </Td>
                    <Td>
                      {s.status === 'ACTIVE' && (
                        <button onClick={() => handleRevoke(s.id)} style={{
                          fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                        }}>
                          Revoke
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No sessions found</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
