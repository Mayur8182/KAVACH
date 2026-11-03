'use client';

/**
 * Thing Attack — Campaigns Workspace (/attack/campaigns)
 * Groups multiple security tests and targets under unified campaigns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { AttackStatusBadge, EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackPentestItem } from '@/types/api/attack';
import { Flag, RefreshCw, Plus, Play, ChevronRight } from 'lucide-react';

export default function AttackCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AttackPentestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.pentests();
      setCampaigns(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns');
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => router.push('/attack/pentests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} /> New Campaign
          </button>
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
        </div>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Offensive Security Campaigns
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Campaigns group multiple tests (DAST, API fuzzing, Auth, Rate limiting) across multi-asset estates.
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
              Campaign Registry ({campaigns.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <EmptyAttackState
                title="No Active Campaigns"
                description="Create an offensive testing campaign grouping DAST, API fuzzing, and Pentests."
                actionLabel="Create Campaign"
                onAction={() => router.push('/attack/pentests')}
              />
            ) : (
              campaigns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/attack/pentests/${c.id}`)}
                  style={{
                    padding: '16px 20px',
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
                        {c.name}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'var(--color-surface-elevated)' }}>
                        {c.environment.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px' }}>
                      {c.test_modules.length} Test Modules • {c.findings_count} Findings Discovered
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AttackStatusBadge status={c.status} />
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
