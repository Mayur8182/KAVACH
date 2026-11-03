'use client';

/**
 * Thing Attack — Policies Workspace (/attack/policies)
 * Safety controls, rate limit boundaries, and destructive testing policy rules.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackPolicyItem, CreatePolicyRequest } from '@/types/api/attack';
import { ShieldCheck, RefreshCw, Plus, Sliders, CheckCircle2 } from 'lucide-react';

export default function AttackPoliciesPage() {
  const [policies, setPolicies] = useState<AttackPolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.policies();
      setPolicies(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AttackWorkshell
      actions={
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Attack Safety &amp; Engagement Policies
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Deterministic guardrails enforced by OPA and gateway interceptors to protect production uptime.
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Enforced Policy Rules ({policies.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading policies...</div>
            ) : policies.length === 0 ? (
              <EmptyAttackState
                title="No Custom Policies"
                description="Default production guardrails are actively protecting targets."
              />
            ) : (
              policies.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={16} color="#10b981" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        {p.policy_type}
                      </span>
                    </div>

                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#10b981' }}>
                      ✓ DETERMINISTICALLY ENFORCED
                    </span>
                  </div>

                  <pre
                    style={{
                      background: '#0d1117',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      fontSize: '11px',
                      color: '#e6edf3',
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(p.rules, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AttackWorkshell>
  );
}
