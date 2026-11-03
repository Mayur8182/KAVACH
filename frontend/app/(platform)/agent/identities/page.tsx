'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { KeyRound } from 'lucide-react';

export default function IdentitiesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.identities(currentProject?.id);
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load identities');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <SectionHeader
          title="Agent Identities"
          sub={`${items.length} credential bindings — issuer, subject, credential type, expiry`}
        />
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
            <Table>
              <thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Issuer</Th>
                  <Th>Subject</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Issued</Th>
                  <Th>Expires</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((id: any) => (
                  <Tr key={id.id}>
                    <Td mono><span style={{ fontSize: 10, color: '#a78bfa' }}>{id.agent_entity_id?.slice(0, 8)}…</span></Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{id.issuer}</span></Td>
                    <Td mono><span style={{ fontSize: 11 }}>{id.subject}</span></Td>
                    <Td>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#818cf8', fontFamily: 'var(--font-mono)',
                      }}>
                        {id.credential_type}
                      </span>
                    </Td>
                    <Td><StatusBadge status={id.status} /></Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{id.issued_at ? new Date(id.issued_at).toLocaleDateString() : '—'}</span></Td>
                    <Td>
                      <span style={{
                        fontSize: 11,
                        color: id.expires_at && new Date(id.expires_at) < new Date() ? '#f87171' : 'var(--color-text-muted)',
                      }}>
                        {id.expires_at ? new Date(id.expires_at).toLocaleDateString() : '—'}
                      </span>
                    </Td>
                  </Tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No identity records found</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
