'use client';

/**
 * Thing Attack — Web Applications (/attack/web-apps)
 * Dedicated view of web applications and user interfaces subject to DAST and browser-based attacks.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { AttackStatusBadge, SeverityBadge, EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackAssetItem } from '@/types/api/attack';
import { LayoutGrid, RefreshCw, Flame, ExternalLink } from 'lucide-react';

export default function AttackWebAppsPage() {
  const router = useRouter();
  const [webApps, setWebApps] = useState<AttackAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.assets({ assetType: 'WEB_APP' });
      setWebApps(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load web applications');
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
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Web Applications Attack Surface
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Client-facing web applications, single-page applications, and interactive user interfaces.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', color: 'var(--color-text-muted)' }}>Loading web applications...</div>
          ) : webApps.length === 0 ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <EmptyAttackState
                title="No Web Applications Registered"
                description="Register a web application or front-end service to evaluate XSS, CSRF, and clickjacking posture."
                actionLabel="Register Web App"
                onAction={() => router.push('/attack/surface')}
              />
            </div>
          ) : (
            webApps.map((app) => (
              <div
                key={app.id}
                onClick={() => router.push(`/attack/surface/${app.id}`)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {app.name}
                  </span>
                  <SeverityBadge severity={app.risk_level} size="sm" />
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  {app.target_url || 'https://...'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  <span>Tech: <strong>{app.technology || 'Next.js'}</strong></span>
                  <span>Exposure: <strong>{app.exposure}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AttackWorkshell>
  );
}
