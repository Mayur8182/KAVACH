'use client';

/**
 * Thing Protect — MCP Security Gateway & Tool Control (/protect/mcp)
 * Intercepts, authorizes, and audits every Model Context Protocol tool execution.
 * Matches backend ProtectService DTO schemas cleanly in Enterprise Light UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Plug,
  RefreshCw,
  Server,
  Wrench,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EmptyProtectState,
  EnforcementDecisionBadge,
  EvidenceDrawer,
  ProtectionStateBadge,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type {
  McpRequestAuditItem,
  McpServerItem,
  McpToolControlItem,
  ProtectionEvidence,
} from '@/types/api/protect';

function formatObservedTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    // Backend returns pre-formatted UTC strings like "2026-11-26 12:00 UTC"
    return value;
  }
  return new Date(parsed).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRiskBadgeStyle(riskLevel?: string): { bg: string; color: string; border: string } {
  const level = (riskLevel || '').toUpperCase();
  if (level === 'CRITICAL' || level === 'HIGH') {
    return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
  }
  if (level === 'MEDIUM') {
    return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  }
  return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
}

export default function McpSecurityPage() {
  const [activeTab, setActiveTab] = useState<'servers' | 'tools' | 'requests'>('servers');
  const [servers, setServers] = useState<McpServerItem[]>([]);
  const [tools, setTools] = useState<McpToolControlItem[]>([]);
  const [requests, setRequests] = useState<McpRequestAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, t, r] = await Promise.all([
        api.protect.mcpServers(),
        api.protect.mcpTools(),
        api.protect.mcpRequests(),
      ]);
      setServers(Array.isArray(s?.items) ? s.items : []);
      setTools(Array.isArray(t?.items) ? t.items : []);
      setRequests(Array.isArray(r?.items) ? r.items : []);
    } catch (err: any) {
      setError({
        message: err?.message || 'Unable to load MCP security gateway telemetry.',
        requestId: err?.request_id,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInspectEvidence = async (evId?: string) => {
    if (!evId) return;
    try {
      const ev = await api.protect.evidenceDetail(evId);
      setSelectedEvidence(ev);
      setDrawerOpen(true);
    } catch (err: any) {
      setError({
        message: err?.message || 'Failed to fetch cryptographic evidence detail.',
        requestId: err?.request_id,
      });
    }
  };

  const serverNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of servers) {
      if (s.id) map[s.id] = s.name;
    }
    return map;
  }, [servers]);

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              MCP SECURITY GATEWAY &amp; TOOL CONTROL
            </h2>
            <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 0 0' }}>
              Authoritative Model Context Protocol reverse proxy. Intercepts, authorizes, and audits every tool execution.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/settings/mcp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                color: '#4F46E5',
              }}
            >
              <Plug size={13} />
              <span>OAuth 2.1 Connections</span>
              <ExternalLink size={11} />
            </Link>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                color: '#0F172A',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Sync Gateway</span>
            </button>
          </div>
        </div>

        {/* Real Error Banner with Retry */}
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                  Failed to load MCP Gateway data
                </div>
                <div style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '2px' }}>
                  {error.message}
                  {error.requestId ? ` (Request ID: ${error.requestId})` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #EAECF0',
            paddingBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('servers')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'servers' ? 700 : 500,
              borderRadius: '8px',
              background: activeTab === 'servers' ? '#EEF2FF' : '#FFFFFF',
              color: activeTab === 'servers' ? '#4F46E5' : '#475569',
              border: activeTab === 'servers' ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Server size={13} />
            <span>SERVERS ({servers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'tools' ? 700 : 500,
              borderRadius: '8px',
              background: activeTab === 'tools' ? '#EEF2FF' : '#FFFFFF',
              color: activeTab === 'tools' ? '#4F46E5' : '#475569',
              border: activeTab === 'tools' ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wrench size={13} />
            <span>REGISTERED TOOLS ({tools.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'requests' ? 700 : 500,
              borderRadius: '8px',
              background: activeTab === 'requests' ? '#EEF2FF' : '#FFFFFF',
              color: activeTab === 'requests' ? '#4F46E5' : '#475569',
              border: activeTab === 'requests' ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={13} />
            <span>INTERCEPTED REQUESTS ({requests.length})</span>
          </button>
        </div>

        {/* Content Panel */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div className="animate-pulse" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ height: '32px', backgroundColor: '#F8FAFC', borderRadius: '6px' }} />
              <div style={{ height: '44px', backgroundColor: '#F1F5F9', borderRadius: '6px' }} />
              <div style={{ height: '44px', backgroundColor: '#F1F5F9', borderRadius: '6px' }} />
              <div style={{ height: '44px', backgroundColor: '#F1F5F9', borderRadius: '6px' }} />
            </div>
          ) : (
            <>
              {activeTab === 'servers' && (
                servers.length === 0 ? (
                  <div style={{ padding: '16px' }}>
                    <EmptyProtectState title="NO MCP SERVERS" description="No MCP servers registered under gateway proxy." />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #EAECF0', background: '#F8FAFC', color: '#64748B', fontSize: '10.5px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 16px' }}>MCP SERVER</th>
                          <th style={{ padding: '10px 16px' }}>IDENTITY PRINCIPAL</th>
                          <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                          <th style={{ padding: '10px 16px' }}>STATUS</th>
                          <th style={{ padding: '10px 16px' }}>PROTECTION</th>
                          <th style={{ padding: '10px 16px' }}>TOOLS / RESOURCES</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right' }}>LAST ACTIVITY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servers.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</div>
                              {s.server_url && (
                                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                  {s.server_url}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                              {s.identity_principal || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{s.environment || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: s.status === 'ACTIVE' ? '#ECFDF5' : '#F1F5F9',
                                  color: s.status === 'ACTIVE' ? '#059669' : '#475569',
                                  border: `1px solid ${s.status === 'ACTIVE' ? '#A7F3D0' : '#E2E8F0'}`,
                                }}
                              >
                                {s.status || 'UNKNOWN'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <ProtectionStateBadge state={s.protection_state || 'UNKNOWN'} />
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              {s.tools_count ?? 0} tools • {s.resources_count ?? 0} resources
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>
                              {formatObservedTime(s.last_activity_at || s.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeTab === 'tools' && (
                tools.length === 0 ? (
                  <div style={{ padding: '16px' }}>
                    <EmptyProtectState title="NO TOOLS CONFIGURED" description="No MCP tool definitions found." />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #EAECF0', background: '#F8FAFC', color: '#64748B', fontSize: '10.5px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 16px' }}>TOOL NAME</th>
                          <th style={{ padding: '10px 16px' }}>DESCRIPTION</th>
                          <th style={{ padding: '10px 16px' }}>SERVER / POLICY</th>
                          <th style={{ padding: '10px 16px' }}>RISK RATING</th>
                          <th style={{ padding: '10px 16px' }}>APPROVAL GATING</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right' }}>LAST USED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tools.map((t) => {
                          const riskBadge = getRiskBadgeStyle(t.risk_level);
                          const serverName = serverNameById[t.server_id];
                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669', fontFamily: 'var(--font-mono)' }}>
                                {t.tool_name}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '340px' }}>
                                {t.description || '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                <div>{serverName || t.policy_name || '—'}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>
                                  {t.total_invocations ?? 0} calls • {t.blocked_invocations ?? 0} blocked
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    padding: '2px 7px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    backgroundColor: riskBadge.bg,
                                    color: riskBadge.color,
                                    border: `1px solid ${riskBadge.border}`,
                                  }}
                                >
                                  {t.risk_level || 'UNKNOWN'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {t.requires_approval ? (
                                  <span
                                    style={{
                                      padding: '2px 7px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      backgroundColor: '#EEF2FF',
                                      color: '#4F46E5',
                                      border: '1px solid #C7D2FE',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    REQUIRED
                                  </span>
                                ) : (
                                  <span style={{ color: '#64748B' }}>Auto</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>
                                {formatObservedTime(t.last_used_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeTab === 'requests' && (
                requests.length === 0 ? (
                  <div style={{ padding: '16px' }}>
                    <EmptyProtectState title="NO INTERCEPTED REQUESTS" description="No MCP request activity recorded." />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #EAECF0', background: '#F8FAFC', color: '#64748B', fontSize: '10.5px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 16px' }}>OBSERVED AT</th>
                          <th style={{ padding: '10px 16px' }}>AGENT</th>
                          <th style={{ padding: '10px 16px' }}>TOOL</th>
                          <th style={{ padding: '10px 16px' }}>DECISION</th>
                          <th style={{ padding: '10px 16px' }}>ARGUMENTS (SANITIZED)</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right' }}>EVIDENCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                              {formatObservedTime(r.observed_at)}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                              {r.agent_id || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#059669', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {r.tool_name}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <EnforcementDecisionBadge decision={r.decision || 'UNKNOWN'} />
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'var(--font-mono)', fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {JSON.stringify(r.arguments_redacted || {})}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {r.evidence_id ? (
                                <button
                                  type="button"
                                  onClick={() => handleInspectEvidence(r.evidence_id)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#059669',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '6px',
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
                  </div>
                )
              )}
            </>
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
