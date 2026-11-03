'use client';

/**
 * Thing Protect — Protected Agents Page (/protect/agents)
 * Zero-trust agent delegation boundaries, least-privilege tool execution, and session telemetry.
 */

import React, { useEffect, useState } from 'react';
import {
  Bot,
  Activity,
  Shield,
  Search,
  RefreshCw,
  UserCheck,
  ChevronRight,
  AlertTriangle,
  Clock,
  Lock,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ProtectionStateBadge,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function AgentsProtectionPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.agents();
      const list = Array.isArray(data) ? data : data?.items || [];
      setAgents(list);
    } catch (err) {
      console.error('Failed to load protected agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const safeAgents = Array.isArray(agents) ? agents : [];
  const filtered = safeAgents.filter((a) => {
    const aName = a.agent_name || a.name || '';
    const aId = a.identity || '';
    const aPol = a.policy_name || a.active_policy_name || '';
    return (
      aName.toLowerCase().includes(search.toLowerCase()) ||
      aId.toLowerCase().includes(search.toLowerCase()) ||
      aPol.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              AI AGENT RUNTIME PROTECTION
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Zero-trust agent delegation boundaries, least-privilege tool execution, and session telemetry.
            </p>
          </div>

          <button
            onClick={loadAgents}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Sync Agents
          </button>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search agent, identity, policy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Agents Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeAgents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading protected agents...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO PROTECTED AGENTS"
              description="No AI agents registered under runtime protection."
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
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>AGENT NAME</th>
                  <th style={{ padding: '10px 16px' }}>IDENTITY / PRINCIPAL</th>
                  <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                  <th style={{ padding: '10px 16px' }}>RISK PROFILE</th>
                  <th style={{ padding: '10px 16px' }}>GOVERNING POLICY</th>
                  <th style={{ padding: '10px 16px' }}>PROTECTION</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>LAST ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {a.agent_name || a.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {a.identity || 'agent/support'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {a.environment || a.environment_id || 'production'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          background: a.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(234, 179, 8, 0.14)',
                          color: a.risk_level === 'CRITICAL' ? '#ef4444' : '#eab308',
                          border: `1px solid ${a.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                        }}
                      >
                        {a.risk_level || 'HIGH'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981' }}>
                      {a.policy_name || a.active_policy_name || 'agent-boundary-v1'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ProtectionStateBadge state={a.protection_state || 'ACTIVE'} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                      {a.last_action_timestamp ? new Date(a.last_action_timestamp).toLocaleTimeString() : 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
