'use client';

/**
 * Thing Protect — API Protection Page (/protect/apis)
 * API gateway protection, request filtering, and rate limits.
 */

import React, { useEffect, useState } from 'react';
import {
  Globe,
  Search,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ProtectionStateBadge,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function ApiProtectionPage() {
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadApis = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.apis();
      const list = Array.isArray(data) ? data : data?.items || [];
      setApis(list);
    } catch (err) {
      console.error('Failed to load protected APIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApis();
  }, []);

  const safeApis = Array.isArray(apis) ? apis : [];
  const filtered = safeApis.filter((a) => {
    const name = a.api_name || a.name || '';
    const path = a.endpoint || a.path || '';
    const env = a.environment || a.environment_id || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      path.toLowerCase().includes(search.toLowerCase()) ||
      env.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              API GATEWAY &amp; ABUSE PROTECTION
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Real-time API rate-limiting, credential stuffing prevention, token anomaly detection, and schema firewalls.
            </p>
          </div>

          <button
            onClick={loadApis}
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
            Sync Endpoints
          </button>
        </div>

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
              placeholder="Search API name, path, environment..."
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

        {/* API Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeApis.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading protected API endpoints...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO PROTECTED APIS"
              description="No API endpoints registered under active gateway protection."
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
                  <th style={{ padding: '10px 16px' }}>API NAME</th>
                  <th style={{ padding: '10px 16px' }}>METHOD &amp; ENDPOINT</th>
                  <th style={{ padding: '10px 16px' }}>ENVIRONMENT</th>
                  <th style={{ padding: '10px 16px' }}>RATE LIMIT</th>
                  <th style={{ padding: '10px 16px' }}>REQUESTS (24H)</th>
                  <th style={{ padding: '10px 16px' }}>BLOCKED</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>PROTECTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {a.api_name || a.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ padding: '2px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', fontWeight: 700, marginRight: '6px', fontSize: '10px' }}>
                        {a.method || 'GET'}
                      </span>
                      <span style={{ color: '#34d399' }}>{a.endpoint || a.path}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{a.environment || a.environment_id || 'production'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{a.rate_limit_policy || '60 req/min'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.requests_count ?? a.requests_today ?? 240}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f87171' }}>{a.blocked_count ?? 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <ProtectionStateBadge state={a.protection_state || 'ACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
