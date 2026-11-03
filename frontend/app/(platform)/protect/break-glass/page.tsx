'use client';

/**
 * Thing Protect — Emergency Break-Glass Workspace (/protect/break-glass)
 * Privileged emergency access authorization with dual-custody justification,
 * automatic TTL expiration, and forensic recording.
 */

import React, { useEffect, useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle,
  Lock,
  RefreshCw,
  X,
  Shield,
  FileText,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import { EmptyProtectState } from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { BreakGlassRecord } from '@/types/api/protect';

export default function BreakGlassPage() {
  const [grants, setGrants] = useState<BreakGlassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Request form state
  const [scope, setScope] = useState('Production API Gateway');
  const [reason, setReason] = useState('Emergency incident response — Sev1 DB outage bypass');
  const [duration, setDuration] = useState('30');
  const [approver, setApprover] = useState('sec-admin@internal');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadGrants = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.breakGlass();
      const list = Array.isArray(data) ? data : data?.items || [];
      setGrants(list);
    } catch (err) {
      console.error('Failed to load break glass records:', err);
      setGrants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrants();
  }, []);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.protect.requestBreakGlass({
        scope,
        reason,
        duration_minutes: parseInt(duration, 10) || 30,
        approver,
      });
      setStatusMessage('Emergency Break-Glass access request submitted and recorded in cryptographic audit log.');
      loadGrants();
    } catch (err: any) {
      setStatusMessage(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const safeGrants = Array.isArray(grants) ? grants : [];
  const activeGrants = safeGrants.filter((g) => g.status === 'ACTIVE');

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="#ef4444" />
              EMERGENCY BREAK-GLASS WORKSPACE
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Privileged emergency access authorization. Requires strict dual-custody justification, automatic TTL expiration, and forensic recording.
            </p>
          </div>

          <button
            onClick={loadGrants}
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
            Sync Grants
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Warning Banner */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
              High-Risk Operational Bypass Procedure
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
              Triggering break-glass suspends specific deterministic OPA policy constraints for the designated scope. All operations performed during the window generate cryptographically signed audit events and alert security leadership immediately.
            </div>
          </div>
        </div>

        {/* Form & Active Table Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '20px' }}>
          {/* Request Panel */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Lock size={15} color="#ef4444" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Request Emergency Bypass
              </span>
            </div>

            <form onSubmit={handleRequestAccess} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Target Scope / Resource
                </label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Forensic Justification (Mandatory)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    TTL Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Authorizer Email
                  </label>
                  <input
                    type="email"
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginTop: '6px',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Authorizing Bypass...' : 'Trigger Break-Glass Bypass'}
              </button>
            </form>
          </div>

          {/* Active Grants List */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Active &amp; Historical Break-Glass Sessions
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeGrants.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: activeGrants.length > 0 ? '#ef4444' : '#10b981',
                }}
              >
                {activeGrants.length} Active Bypass
              </span>
            </div>

            {loading && safeGrants.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                Loading emergency grants...
              </div>
            ) : safeGrants.length === 0 ? (
              <EmptyProtectState
                title="ZERO ACTIVE BREAK-GLASS SESSIONS"
                description="No emergency bypasses are currently active. All deterministic policies are fully enforced."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {safeGrants.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-elevated)',
                      border: `1px solid ${g.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: g.status === 'ACTIVE' ? '#ef4444' : 'var(--color-text-primary)', fontSize: '12px' }}>
                        {g.scope}
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: g.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: g.status === 'ACTIVE' ? '#ef4444' : 'var(--color-text-muted)',
                          border: `1px solid ${g.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                        }}
                      >
                        {g.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {g.reason}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <span>Requester: <strong style={{ color: 'var(--color-text-primary)' }}>{g.requester}</strong></span>
                      <span>Approver: <strong style={{ color: 'var(--color-text-primary)' }}>{g.approver}</strong></span>
                      <span>Expires: {new Date(g.expires_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectWorkshell>
  );
}
