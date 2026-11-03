'use client';

/**
 * THING AGENT — Agent Registry
 * Full list of registered agents with filtering, risk levels, and quick actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge, StatusBadge, Table, Th, Td, Tr, AgentLoading, AgentError, SectionHeader,
} from '@/components/agent/AgentComponents';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { Bot, Search, Filter, PlusCircle, Shield, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AgentRegistryPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.agent.agents({
        projectId: currentProject?.id,
        risk: riskFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, riskFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const agents: any[] = Array.isArray(data) ? data : (data?.items || []);
  const total = data?.total ?? agents.length;

  return (
    <AgentWorkshell>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Agent Registry</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {total} registered agents — every agent must be registered before it can act
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 12px',
            }}>
              <Search size={12} color="var(--color-text-muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents…"
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  fontSize: 12, color: 'var(--color-text)', width: 180,
                }}
              />
            </div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              <option value="">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="QUARANTINED">Quarantined</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        {loading && <AgentLoading />}
        {error && <AgentError message={error} />}
        {!loading && !error && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <Table>
              <thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Identity URI</Th>
                  <Th>Environment</Th>
                  <Th>Risk</Th>
                  <Th>Status</Th>
                  <Th>Protection</Th>
                  <Th>Permissions</Th>
                  <Th>Last Active</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent: any) => (
                  <Tr key={agent.id}>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{agent.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {agent.agent_id}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {agent.owner}
                        </span>
                      </div>
                    </Td>
                    <Td mono>
                      <span style={{ fontSize: 10, color: '#a78bfa' }}>{agent.identity_uri}</span>
                    </Td>
                    <Td>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: agent.environment_id === 'production' ? '#fb923c' : '#60a5fa',
                        background: agent.environment_id === 'production' ? 'rgba(249,115,22,0.08)' : 'rgba(96,165,250,0.08)',
                        border: `1px solid ${agent.environment_id === 'production' ? 'rgba(249,115,22,0.2)' : 'rgba(96,165,250,0.2)'}`,
                        padding: '2px 8px', borderRadius: 10,
                      }}>
                        {agent.environment_id?.toUpperCase()}
                      </span>
                    </Td>
                    <Td><RiskBadge risk={agent.risk_level} /></Td>
                    <Td><StatusBadge status={agent.status} /></Td>
                    <Td><StatusBadge status={agent.protection_state} /></Td>
                    <Td>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {agent.permission_count ?? '—'}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {agent.last_active_at ? new Date(agent.last_active_at).toLocaleString() : '—'}
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/agent/agents/${agent.id}`} style={{
                        fontSize: 11, color: '#a78bfa', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <ExternalLink size={11} /> Detail
                      </Link>
                    </Td>
                  </Tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                      No agents match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </AgentWorkshell>
  );
}
