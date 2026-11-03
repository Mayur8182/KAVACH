'use client';
import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { RiskBadge, StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader } from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { Wrench, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ToolsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const d = await api.agent.tools(currentProject?.id, riskFilter || undefined);
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load tools');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id, riskFilter]);

  const items: any[] = Array.isArray(data) ? data : (data?.items || []);

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionHeader title="Tool Inventory" sub={`${items.length} registered tools — each classified by risk, provider, and access requirements`} />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            <Table>
              <thead>
                <tr>
                  <Th>Tool</Th>
                  <Th>Provider</Th>
                  <Th>Type</Th>
                  <Th>Risk</Th>
                  <Th>Approval Required</Th>
                  <Th>Risk Reason</Th>
                  <Th>Executions</Th>
                  <Th>Status</Th>
                  <Th>Last Used</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((t: any) => (
                  <Tr key={t.id}>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{t.display_name || t.tool_name}</div>
                      <div style={{ fontSize: 10, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{t.tool_id}</div>
                    </Td>
                    <Td>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--font-mono)',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8',
                      }}>
                        {t.provider || '—'}
                      </span>
                    </Td>
                    <Td><span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t.tool_type}</span></Td>
                    <Td><RiskBadge risk={t.risk_level} /></Td>
                    <Td>
                      {t.requires_approval ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#facc15' }}>
                          <AlertTriangle size={11} /> Required
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4ade80' }}>
                          <CheckCircle2 size={11} /> Auto
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.risk_reason || '—'}
                      </span>
                    </Td>
                    <Td mono><span style={{ color: 'var(--color-text-muted)' }}>{(t.execution_count ?? 0).toLocaleString()}</span></Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.last_used_at ? new Date(t.last_used_at).toLocaleString() : '—'}</span></Td>
                  </Tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No tools registered</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
