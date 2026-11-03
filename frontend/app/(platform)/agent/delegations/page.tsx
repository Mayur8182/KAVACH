'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { RiskBadge, StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { GitBranch } from 'lucide-react';

export default function DelegationsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const d = await api.agent.delegations({ projectId: currentProject?.id });
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load delegations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentProject?.id]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  const handleRevoke = async (delegationId: string) => {
    const reason = prompt('Revocation reason:');
    if (!reason) return;
    try {
      await api.agent.revokeDelegation(delegationId, reason, currentProject?.id);
      await load();
    } catch (e: any) {
      alert(`Revoke failed: ${e?.message}`);
    }
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <SectionHeader title="Agent Delegations" sub={`${items.length} delegation records — agent-to-agent authority transfers`} />
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
            <Table>
              <thead>
                <tr>
                  <Th>Issuer Agent</Th>
                  <Th>Delegate Agent</Th>
                  <Th>Delegated Actions</Th>
                  <Th>Environment</Th>
                  <Th>Max Depth</Th>
                  <Th>Further Delegation</Th>
                  <Th>Status</Th>
                  <Th>Created By</Th>
                  <Th>Expires</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((d: any) => (
                  <Tr key={d.id}>
                    <Td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{d.issuer_name || d.issuer_agent_id?.slice(0, 12)}</div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{d.delegate_name || d.delegate_agent_id?.slice(0, 12)}</div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(d.delegated_actions || []).map((a: string) => (
                          <span key={a} style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)',
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8',
                          }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: d.environment_id === 'production' ? '#fb923c' : '#60a5fa' }}>
                        {d.environment_id?.toUpperCase()}
                      </span>
                    </Td>
                    <Td mono><span style={{ color: 'var(--color-text-muted)' }}>{d.max_depth}</span></Td>
                    <Td>
                      <span style={{ fontSize: 11, color: d.further_delegation_allowed ? '#facc15' : '#4ade80' }}>
                        {d.further_delegation_allowed ? 'Allowed' : 'Blocked'}
                      </span>
                    </Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.created_by || '—'}</span></Td>
                    <Td>
                      <span style={{ fontSize: 11, color: d.expires_at && new Date(d.expires_at) < new Date() ? '#f87171' : 'var(--color-text-muted)' }}>
                        {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '—'}
                      </span>
                    </Td>
                    <Td>
                      {d.status === 'ACTIVE' && (
                        <button onClick={() => handleRevoke(d.id)} style={{
                          fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                        }}>
                          Revoke
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No delegations recorded</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
