'use client';

/**
 * Thing Protect — Human-In-The-Loop Approval Center (/protect/approvals)
 * Authoritative gating queue for sensitive actions, destructive tool calls, and high-risk agent delegations.
 */

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  ShieldAlert,
  FileText,
  UserCheck,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EvidenceDrawer,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionApproval, ProtectionEvidence } from '@/types/api/protect';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ProtectionApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.approvals();
      const list = Array.isArray(data) ? data : data?.items || [];
      setApprovals(list);
    } catch (err) {
      console.error('Failed to load approvals queue:', err);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  // Keyboard accessibility: Escape key closes evidence drawer (Mistake #57, #67)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handleResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setResolvingId(id);
      await api.protect.resolveApproval(
        id,
        decision,
        `Human security officer ${decision.toLowerCase()} via control plane console.`
      );
      setStatusMessage(`Approval ${id.slice(0, 8)} set to ${decision}`);
      loadApprovals();
    } catch (err: any) {
      setStatusMessage(`Resolution failed: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const handleInspectEvidence = async (evId?: string) => {
    if (!evId) return;
    try {
      const ev = await api.protect.evidenceDetail(evId);
      setSelectedEvidence(ev);
      setDrawerOpen(true);
    } catch (err) {
      console.error('Failed to load evidence:', err);
    }
  };

  const safeApprovals = Array.isArray(approvals) ? approvals : [];
  const filtered = safeApprovals.filter((a) => {
    const term = search.toLowerCase();
    return (
      (a.requester || '').toLowerCase().includes(term) ||
      (a.action || '').toLowerCase().includes(term) ||
      (a.resource || '').toLowerCase().includes(term) ||
      (a.policy_name || '').toLowerCase().includes(term)
    );
  });

  const pendingCount = safeApprovals.filter((a) => a.status === 'PENDING').length;
  const approvedCount = safeApprovals.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = safeApprovals.filter((a) => a.status === 'REJECTED').length;

  return (
    <ProtectWorkshell activeCount={{ approvals: pendingCount }}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#10b981" />
              HUMAN-IN-THE-LOOP APPROVAL CENTER
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Authoritative gating queue for sensitive actions, destructive tool calls, and high-risk agent delegations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={loadApprovals}
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
              Sync Queue
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Reviews</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: pendingCount > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>{pendingCount}</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Require authorization</span>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approved Actions</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{approvedCount}</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Granted by security leads</span>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rejected Requests</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>{rejectedCount}</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Blocked at gate</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              flex: 1,
              maxWidth: '360px',
            }}
          >
            <Search size={13} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search by requester, action, resource, or policy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Queue Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeApprovals.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading approval queue...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO PENDING APPROVALS"
              description="The human authorization queue is clear. No actions currently require manual intervention."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: 'var(--color-surface-elevated)',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '10px 14px' }}>Requester</th>
                    <th style={{ padding: '10px 14px' }}>Action &amp; Target</th>
                    <th style={{ padding: '10px 14px' }}>Scope</th>
                    <th style={{ padding: '10px 14px' }}>Risk</th>
                    <th style={{ padding: '10px 14px' }}>Governing Policy</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Time</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {a.requester}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.action}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)', fontSize: '11px' }}>{a.resource}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {a.environment_id || 'production'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: a.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: a.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                            border: `1px solid ${a.risk_level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {a.risk_level}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#10b981', fontSize: '11px', fontFamily: 'monospace' }}>
                        {a.policy_name}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '10px',
                            fontWeight: 700,
                            background:
                              a.status === 'PENDING'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : a.status === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              a.status === 'PENDING'
                                ? '#f59e0b'
                                : a.status === 'APPROVED'
                                ? '#10b981'
                                : '#ef4444',
                            border: `1px solid ${
                              a.status === 'PENDING'
                                ? 'rgba(245, 158, 11, 0.3)'
                                : a.status === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }`,
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {new Date(a.created_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {a.evidence_id && (
                            <button
                              onClick={() => handleInspectEvidence(a.evidence_id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              Proof
                            </button>
                          )}
                          {a.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleResolve(a.id, 'APPROVED')}
                                disabled={resolvingId === a.id}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                  opacity: resolvingId === a.id ? 0.6 : 1,
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleResolve(a.id, 'REJECTED')}
                                disabled={resolvingId === a.id}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                  opacity: resolvingId === a.id ? 0.6 : 1,
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <EvidenceDrawer
          evidence={selectedEvidence}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </ProtectWorkshell>
  );
}
