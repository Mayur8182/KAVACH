'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { DecisionBadge, StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader, EvidenceDrawer } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { FileText } from 'lucide-react';

export default function ActionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState('');
  const [selectedAction, setSelectedAction] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.actions({ projectId: currentProject?.id, decision: decisionFilter || undefined, limit: 100 });
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load actions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id, decisionFilter]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionHeader title="Action Audit" sub={`${data?.total ?? items.length} recorded tool executions — every action is immutably logged`} />
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            <option value="">All Decisions</option>
            <option value="ALLOWED">Allowed</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              <Table>
                <thead>
                  <tr>
                    <Th>Agent</Th>
                    <Th>Tool</Th>
                    <Th>Target Resource</Th>
                    <Th>Environment</Th>
                    <Th>Decision</Th>
                    <Th>Result</Th>
                    <Th>Duration</Th>
                    <Th>Policy</Th>
                    <Th>Trace</Th>
                    <Th>Time</Th>
                    <Th>Evidence</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a: any) => (
                    <Tr key={a.id} onClick={() => setSelectedAction(a)}>
                      <Td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{a.agent_name || '—'}</div>
                      </Td>
                      <Td mono><span style={{ color: '#a78bfa' }}>{a.tool_name}</span></Td>
                      <Td>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.target_resource || '—'}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: a.environment_id === 'production' ? '#fb923c' : '#60a5fa' }}>
                          {a.environment_id?.toUpperCase()}
                        </span>
                      </Td>
                      <Td><DecisionBadge decision={a.decision} /></Td>
                      <Td><StatusBadge status={a.result || 'UNKNOWN'} /></Td>
                      <Td mono><span style={{ color: 'var(--color-text-muted)' }}>{a.duration_ms != null ? `${a.duration_ms}ms` : '—'}</span></Td>
                      <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{a.policy_name?.slice(0, 20) || '—'}</span></Td>
                      <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{a.trace_id?.slice(0, 8) || '—'}</span></Td>
                      <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(a.executed_at).toLocaleString()}</span></Td>
                      <Td>
                        {a.evidence_id && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedAction(a); }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                          }}>
                            <FileText size={11} /> View
                          </button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No actions recorded</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
            {selectedAction && (
              <EvidenceDrawer evidence={selectedAction} onClose={() => setSelectedAction(null)} />
            )}
          </>
        )}
      </div>
    </AgentWorkshell>
  );
}
