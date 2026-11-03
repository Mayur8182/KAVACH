'use client';

/**
 * Thing Attack — API Inventory (/attack/apis)
 * Real inventory of known, shadow, zombie, REST, and GraphQL endpoints with discovery provenance.
 * Queries GET /api/v1/attack/apis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  AttackStatusBadge,
  ProvenanceBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackApiEndpointItem } from '@/types/api/attack';
import {
  RefreshCw,
  Search,
  FileCode2,
  ChevronRight,
  Radio,
  Plus,
  ShieldAlert,
} from 'lucide-react';

export default function AttackApisPage() {
  const router = useRouter();
  const [endpoints, setEndpoints] = useState<AttackApiEndpointItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [authFilter, setAuthFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.apis({
        search: search || undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        authType: authFilter !== 'ALL' ? authFilter : undefined,
        discoverySource: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        testStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setEndpoints(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load API inventory');
    } finally {
      setLoading(false);
    }
  }, [search, methodFilter, authFilter, sourceFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AttackWorkshell
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => router.push('/attack/api-discovery')}
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
            <Radio size={12} />
            Discover APIs
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
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, maxWidth: '360px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                width: '100%',
              }}
            >
              <Search size={13} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search API path, e.g. /api/v1/..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>

            <select
              value={authFilter}
              onChange={(e) => setAuthFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Auth</option>
              <option value="JWT">JWT</option>
              <option value="NONE">Unauthenticated</option>
              <option value="API_KEY">API Key</option>
              <option value="OAUTH2">OAuth2</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="OPENAPI">OpenAPI</option>
              <option value="TRAFFIC">Traffic</option>
              <option value="GATEWAY">Gateway</option>
              <option value="RUNTIME_TELEMETRY">Runtime</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Test Statuses</option>
              <option value="EXPLOITABLE">Exploitable</option>
              <option value="VERIFIED_SAFE">Verified Safe</option>
              <option value="NOT_TESTED">Not Tested</option>
              <option value="TESTING">Testing</option>
            </select>
          </div>
        </div>

        {/* API Inventory Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              API Inventory ({total})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Provenanced REST &amp; GraphQL endpoints
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              Loading API endpoints...
            </div>
          ) : endpoints.length === 0 ? (
            <div style={{ padding: '60px 24px' }}>
              <EmptyAttackState
                title="No API Endpoints Detected"
                description="Run automated API discovery against an OpenAPI specification, service gateway, or code repository."
                actionLabel="Start API Discovery"
                onAction={() => router.push('/attack/api-discovery')}
              />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Endpoint</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Method</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Auth</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Source Provenance</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Risk</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Test Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() => router.push(`/attack/apis/${ep.id}`)}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                      <div>{ep.path}</div>
                      {ep.asset_name && (
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'sans-serif' }}>
                          Target: {ep.asset_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: ep.method === 'GET' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: ep.method === 'GET' ? '#60a5fa' : '#f87171',
                        }}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: ep.auth_type === 'NONE' ? '#f59e0b' : 'var(--color-text-secondary)' }}>
                      {ep.auth_type}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ProvenanceBadge provenance={ep.discovery_source} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <SeverityBadge severity={ep.risk_level} size="sm" />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <AttackStatusBadge status={ep.test_status} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AttackWorkshell>
  );
}
