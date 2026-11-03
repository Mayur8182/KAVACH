'use client';

/**
 * Thing Protect — MCP Security Gateway & Tool Control (/protect/mcp)
 * Intercepts, authorizes, and audits every Model Context Protocol tool execution.
 */

import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Server,
  Wrench,
  Activity,
  Shield,
  Lock,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ProtectionStateBadge,
  EnforcementDecisionBadge,
  EvidenceDrawer,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionEvidence } from '@/types/api/protect';

export default function McpSecurityPage() {
  const [activeTab, setActiveTab] = useState<'servers' | 'tools' | 'requests'>('servers');
  const [servers, setServers] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, t, r]: any = await Promise.all([
        api.protect.mcpServers(),
        api.protect.mcpTools(),
        api.protect.mcpRequests(),
      ]);
      setServers(Array.isArray(s) ? s : s?.items || []);
      setTools(Array.isArray(t) ? t : t?.items || []);
      setRequests(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      console.error('Failed to load MCP security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectEvidence = async (evId?: string) => {
    if (!evId) return;
    try {
      const ev = await api.protect.evidenceDetail(evId);
      setSelectedEvidence(ev);
      setDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  const safeServers = Array.isArray(servers) ? servers : [];
  const safeTools = Array.isArray(tools) ? tools : [];
  const safeRequests = Array.isArray(requests) ? requests : [];

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              MCP SECURITY GATEWAY &amp; TOOL CONTROL
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Authoritative Model Context Protocol reverse proxy. Intercepts, authorizes, and audits every tool execution.
            </p>
          </div>

          <button
            onClick={loadData}
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
            Sync Gateway
          </button>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setActiveTab('servers')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'servers' ? 700 : 500,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'servers' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
              color: activeTab === 'servers' ? '#10b981' : 'var(--color-text-secondary)',
              border: activeTab === 'servers' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Server size={13} />
            <span>SERVERS ({safeServers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'tools' ? 700 : 500,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'tools' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
              color: activeTab === 'tools' ? '#10b981' : 'var(--color-text-secondary)',
              border: activeTab === 'tools' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wrench size={13} />
            <span>REGISTERED TOOLS ({safeTools.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'requests' ? 700 : 500,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'requests' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
              color: activeTab === 'requests' ? '#10b981' : 'var(--color-text-secondary)',
              border: activeTab === 'requests' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={13} />
            <span>INTERCEPTED REQUESTS ({safeRequests.length})</span>
          </button>
        </div>

        {/* Content Panel */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'servers' && (
            safeServers.length === 0 ? (
              <EmptyProtectState title="NO MCP SERVERS" description="No MCP servers registered under gateway proxy." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>MCP SERVER</th>
                    <th style={{ padding: '10px 16px' }}>IDENTITY</th>
                    <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                    <th style={{ padding: '10px 16px' }}>STATUS</th>
                    <th style={{ padding: '10px 16px' }}>PROTECTION</th>
                    <th style={{ padding: '10px 16px' }}>TOOLS / RESOURCES</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>LAST ACTIVITY</th>
                  </tr>
                </thead>
                <tbody>
                  {safeServers.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {s.server_name || s.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{s.identity || 'service-account'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{s.environment || s.environment_id || 'production'}</td>
                      <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>{s.status || 'ACTIVE'}</td>
                      <td style={{ padding: '12px 16px' }}><ProtectionStateBadge state={s.protection_state || 'ACTIVE'} /></td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{s.tools_count || 3} tools • {s.resources_count || 1} resources</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {s.last_activity ? new Date(s.last_activity).toLocaleTimeString() : 'Recently'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'tools' && (
            safeTools.length === 0 ? (
              <EmptyProtectState title="NO TOOLS CONFIGURED" description="No MCP tool definitions found." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>TOOL NAME</th>
                    <th style={{ padding: '10px 16px' }}>DESCRIPTION</th>
                    <th style={{ padding: '10px 16px' }}>SERVER</th>
                    <th style={{ padding: '10px 16px' }}>RISK RATING</th>
                    <th style={{ padding: '10px 16px' }}>APPROVAL GATING</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>LAST USED</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTools.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                        {t.tool_name || t.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{t.description}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{t.server_name || 'filesystem'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            background: t.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(234, 179, 8, 0.14)',
                            color: t.risk_level === 'CRITICAL' ? '#ef4444' : '#eab308',
                            border: `1px solid ${t.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                          }}
                        >
                          {t.risk_level || 'MEDIUM'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {t.requires_approval ? (
                          <span style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '4px' }}>
                            REQUIRED
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Auto</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {t.last_used ? new Date(t.last_used).toLocaleTimeString() : 'Recently'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'requests' && (
            safeRequests.length === 0 ? (
              <EmptyProtectState title="NO INTERCEPTED REQUESTS" description="No MCP request activity recorded." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>TIMESTAMP</th>
                    <th style={{ padding: '10px 16px' }}>AGENT</th>
                    <th style={{ padding: '10px 16px' }}>TOOL</th>
                    <th style={{ padding: '10px 16px' }}>DECISION</th>
                    <th style={{ padding: '10px 16px' }}>ARGUMENTS (SANITIZED)</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>EVIDENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {safeRequests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Now'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.agent_name || r.actor}</td>
                      <td style={{ padding: '12px 16px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>{r.tool_name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <EnforcementDecisionBadge decision={r.decision || 'BLOCK'} />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {JSON.stringify(r.arguments_redacted || {})}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {r.evidence_id ? (
                          <button
                            onClick={() => handleInspectEvidence(r.evidence_id)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            PROOF
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </ProtectWorkshell>
  );
}
