'use client';

/**
 * Thing Attack — Targets Workspace (/attack/targets)
 * Real target registration, authorization boundaries, and scope tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { AttackStatusBadge, SeverityBadge, EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackAssetItem } from '@/types/api/attack';
import { Target, RefreshCw, Plus, Search, ShieldCheck, ChevronRight } from 'lucide-react';

export default function AttackTargetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AttackAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.assets();
      setAssets(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load targets');
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
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Authorized Security Attack Targets
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              Explicit targets registered for offensive vulnerability evaluation and DAST execution.
            </p>
          </div>
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
              Target Registry ({assets.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                Loading targets...
              </div>
            ) : assets.length === 0 ? (
              <EmptyAttackState
                title="No Targets Configured"
                description="Register a production or staging service target to begin testing."
                actionLabel="Add Target"
                onAction={() => router.push('/attack/surface')}
              />
            ) : (
              assets.map((a) => (
                <div
                  key={a.id}
                  onClick={() => router.push(`/attack/surface/${a.id}`)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {a.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: 'var(--color-surface-elevated)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {a.asset_type}
                      </span>
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                        ✓ Scope Authorized
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                      {a.target_url || a.ip_address || 'Internal Service'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SeverityBadge severity={a.risk_level} size="sm" />
                    <AttackStatusBadge status={a.status} />
                    <ChevronRight size={14} color="var(--color-text-muted)" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AttackWorkshell>
  );
}
