'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

export default function PermissionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.permissions({ projectId: currentProject?.id, status: statusFilter || undefined });
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id, statusFilter]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  const handleRevoke = async (permId: string) => {
    if (!confirm('Revoke this permission?')) return;
    try {
      await api.agent.revokePermission(permId, currentProject?.id);
      const d = await api.agent.permissions({ projectId: currentProject?.id, status: statusFilter || undefined });
      setData(d);
    } catch (e: any) {
      alert(`Revoke failed: ${e?.message}`);
    }
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionHeader
            title="Agent Permissions"
            sub={`${data?.total ?? items.length} permission records`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            <Table>
              <thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Action</Th>
                  <Th>Resource</Th>
                  <Th>Type</Th>
                  <Th>Environment</Th>
                  <Th>Source</Th>
                  <Th>Policy</Th>
                  <Th>Status</Th>
                  <Th>Used</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((p: any) => (
                  <Tr key={p.id}>
                    <Td>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.agent_name || '—'}</div>
                      <div style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{p.agent_entity_id?.slice(0, 8)}…</div>
                    </Td>
                    <Td mono>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10,
                        background: p.action === 'EXECUTE' ? 'rgba(239,68,68,0.1)' : p.action === 'WRITE' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
                        color: p.action === 'EXECUTE' ? '#f87171' : p.action === 'WRITE' ? '#fb923c' : '#4ade80',
                        border: `1px solid ${p.action === 'EXECUTE' ? 'rgba(239,68,68,0.2)' : p.action === 'WRITE' ? 'rgba(249,115,22,0.2)' : 'rgba(34,197,94,0.2)'}`,
                        fontFamily: 'var(--font-mono)', fontWeight: 700,
                      }}>
                        {p.action}
                      </span>
                    </Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{p.resource}</span></Td>
                    <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{p.resource_type || '—'}</span></Td>
                    <Td>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: p.environment_id === 'production' ? '#fb923c' : '#60a5fa',
                      }}>
                        {p.environment_id?.toUpperCase()}
                      </span>
                    </Td>
                    <Td><span style={{ fontSize: 10, color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{p.source}</span></Td>
                    <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.policy_id?.slice(0, 20) || '—'}</span></Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.usage_count ?? 0}x</span></Td>
                    <Td>
                      {p.status === 'ACTIVE' && (
                        <button onClick={() => handleRevoke(p.id)} style={{
                          fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          textDecoration: 'underline',
                        }}>
                          Revoke
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No permissions found</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
