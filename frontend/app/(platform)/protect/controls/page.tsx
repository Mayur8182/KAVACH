'use client';

/**
 * Thing Protect — Control Effectiveness Page (/protect/controls)
 * Empirical verification of whether security controls are actually blocking unauthorized access.
 */

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import { EmptyProtectState } from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function ControlsEffectivenessPage() {
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadControls = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.controls();
      const list = Array.isArray(data) ? data : data?.items || [];
      setControls(list);
    } catch (err) {
      console.error('Failed to load control effectiveness:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadControls();
  }, []);

  const safeControls = Array.isArray(controls) ? controls : [];

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              CONTROL EFFECTIVENESS &amp; EMPIRICAL PROOF
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Empirical runtime verification. Proves whether deterministic security policies are actually blocking unauthorized actions.
            </p>
          </div>

          <button
            onClick={loadControls}
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
            Verify Controls
          </button>
        </div>

        {/* Controls Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && safeControls.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Computing empirical effectiveness metrics...
            </div>
          ) : safeControls.length === 0 ? (
            <EmptyProtectState
              title="NO CONTROLS CONFIGURED"
              description="No active policies have registered enforcement telemetry."
            />
          ) : (
            safeControls.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ maxWidth: '600px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {c.policy_name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: c.verification_result === 'PASS' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.16)',
                        color: c.verification_result === 'PASS' ? '#10b981' : '#ef4444',
                        border: `1px solid ${c.verification_result === 'PASS' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.4)'}`,
                      }}
                    >
                      VERIFICATION: {c.verification_result}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Expected: {c.expected_behavior}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>OBSERVED</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{c.observed_attempts}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>BLOCKED</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>{c.blocked_count}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>ALLOWED</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{c.allowed_count}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>LAST AUDIT</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {c.last_verified ? new Date(c.last_verified).toLocaleTimeString() : 'Now'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
