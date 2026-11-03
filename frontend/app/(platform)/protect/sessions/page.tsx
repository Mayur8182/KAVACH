'use client';

/**
 * Thing Protect — Protected Sessions Page (/protect/sessions)
 * Active sessions, instant token revocation, and zero-trust termination.
 */

import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import { EmptyProtectState } from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function SessionsControlPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Revoke modal state
  const [targetSession, setTargetSession] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState('Suspicious tool execution or policy violation');
  const [revoking, setRevoking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.sessions();
      const list = Array.isArray(data) ? data : data?.items || [];
      setSessions(list);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleConfirmRevoke = async () => {
    if (!targetSession) return;
    try {
      setRevoking(true);
      await api.protect.revokeSession(targetSession.id, revokeReason);
      setStatusMessage(`Session ${targetSession.id.slice(0, 8)} revoked successfully.`);
      setTargetSession(null);
      loadSessions();
    } catch (err: any) {
      setStatusMessage(`Revocation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRevoking(false);
    }
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filtered = safeSessions.filter((s) => {
    const actor = s.actor || '';
    const principal = s.principal_id || '';
    const status = s.status || '';
    return (
      actor.toLowerCase().includes(search.toLowerCase()) ||
      principal.toLowerCase().includes(search.toLowerCase()) ||
      status.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              PROTECTED SESSION CONTROL
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Active agent, user, and service sessions. Immediate server-side token revocation and zero-trust termination.
            </p>
          </div>

          <button
            onClick={loadSessions}
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
            Sync Sessions
          </button>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#34d399',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Dismiss</button>
          </div>
        )}

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
              placeholder="Search actor, principal ID, status..."
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

        {/* Sessions Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeSessions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading active sessions...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO ACTIVE SESSIONS"
              description="No active protected sessions matching the query."
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
                  <th style={{ padding: '10px 16px' }}>ACTOR / AGENT</th>
                  <th style={{ padding: '10px 16px' }}>PRINCIPAL ID</th>
                  <th style={{ padding: '10px 16px' }}>IP / INGRESS</th>
                  <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                  <th style={{ padding: '10px 16px' }}>STATUS</th>
                  <th style={{ padding: '10px 16px' }}>LAST SEEN</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {s.actor}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {s.principal_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{s.ip_address || '10.0.1.20'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{s.environment || s.environment_id || 'production'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          background: s.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.14)',
                          color: s.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                      {s.last_activity ? new Date(s.last_activity).toLocaleTimeString() : 'Recently'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {s.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setTargetSession(s)}
                          style={{
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          TERMINATE
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>REVOKED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {targetSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--color-surface)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <ShieldAlert size={16} />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>CONFIRM SESSION TERMINATION</span>
              </div>
              <button onClick={() => setTargetSession(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Actor:</strong> {targetSession.actor}</div>
              <div><strong>Principal:</strong> {targetSession.principal_id}</div>
              <div><strong>Session ID:</strong> {targetSession.id}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Termination Reason</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                rows={2}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setTargetSession(null)}
                style={{ padding: '6px 14px', fontSize: '11px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={revoking}
                style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 700, background: '#ef4444', border: 'none', borderRadius: 'var(--radius-sm)', color: '#ffffff', cursor: 'pointer' }}
              >
                {revoking ? 'Terminating...' : 'Terminate Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectWorkshell>
  );
}
