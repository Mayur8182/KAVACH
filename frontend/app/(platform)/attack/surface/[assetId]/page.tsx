'use client';

/**
 * Thing Attack — Asset Detail (/attack/surface/:assetId)
 * Deep dive into individual reachable asset with tabs:
 * Overview, Endpoints, Technologies, Findings, Attack Paths, Tests, Evidence, Activity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  ExploitabilityBadge,
  AttackStatusBadge,
  MetricCard,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackAssetDetailResponse } from '@/types/api/attack';
import {
  ArrowLeft,
  Globe2,
  FileCode2,
  Bug,
  GitFork,
  Flame,
  Archive,
  Clock,
  Layers,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.assetId as string;

  const [detail, setDetail] = useState<AttackAssetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'findings' | 'paths' | 'tests' | 'evidence'>('overview');

  const load = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.assetDetail(assetId);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading asset security state...
        </div>
      </AttackWorkshell>
    );
  }

  if (error || !detail) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error || 'Asset not found'}</p>
          <button
            onClick={() => router.push('/attack/surface')}
            style={{
              padding: '6px 12px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            ← Back to Attack Surface
          </button>
        </div>
      </AttackWorkshell>
    );
  }

  const { asset } = detail;

  return (
    <AttackWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Breadcrumb / Back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push('/attack/surface')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <ArrowLeft size={13} /> Attack Surface
          </button>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{asset.name}</span>
        </div>

        {/* Asset Header Banner */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {asset.name}
              </h2>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {asset.asset_type}
              </span>
              <SeverityBadge severity={asset.risk_level} size="sm" />
              <AttackStatusBadge status={asset.status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              {asset.target_url && (
                <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{asset.target_url}</span>
              )}
              <span>Environment: <strong>{asset.environment}</strong></span>
              <span>Exposure: <strong>{asset.exposure}</strong></span>
              <span>Owner: <strong>{asset.ownership || 'Unassigned'}</strong></span>
              <span>Last Tested: <strong>{asset.last_tested || 'Never'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => router.push('/attack/dast')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <Flame size={12} />
              Launch DAST Scan
            </button>
          </div>
        </div>

        {/* Metric Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <MetricCard label="Endpoints" value={detail.endpoints_count} sublabel="Enumerated APIs" />
          <MetricCard
            label="Findings"
            value={detail.findings_count}
            sublabel="Confirmed weaknesses"
            color={detail.findings_count > 0 ? '#ef4444' : undefined}
          />
          <MetricCard
            label="Attack Paths"
            value={detail.attack_paths_count}
            sublabel="Multi-hop reachable"
            color={detail.attack_paths_count > 0 ? '#f97316' : undefined}
          />
          <MetricCard label="Technologies" value={detail.technologies.length || 1} sublabel="Detected frameworks" />
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '8px',
          }}
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'endpoints', label: `Endpoints (${detail.endpoints.length})` },
            { id: 'findings', label: `Findings (${detail.findings.length})` },
            { id: 'paths', label: `Attack Paths (${detail.attack_paths.length})` },
            { id: 'tests', label: 'Recent Tests' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '6px 14px',
                background: activeTab === t.id ? '#ef4444' : 'var(--color-surface-elevated)',
                color: activeTab === t.id ? 'white' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Target Security Attributes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Technology Fingerprint</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{asset.technology || 'None recorded'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>IP Address</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{asset.ip_address || 'Unresolved'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Port / Protocol</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{asset.port ? `${asset.port} / HTTPS` : '443 / HTTPS'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Target Host Header</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{asset.name}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Recent Security Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.activity_timeline.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0' }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>{act.action}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{act.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Endpoint</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Method</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Auth</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Source</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Risk</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() => router.push(`/attack/apis/${ep.id}`)}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                      {ep.path}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, fontSize: '10.5px', color: '#f87171' }}>{ep.method}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{ep.auth}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{ep.source}</td>
                    <td style={{ padding: '12px 16px' }}><SeverityBadge severity={ep.risk} size="sm" /></td>
                    <td style={{ padding: '12px 16px' }}><AttackStatusBadge status={ep.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'findings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.findings.map((f) => (
              <div
                key={f.id}
                onClick={() => router.push(`/attack/findings/${f.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SeverityBadge severity={f.severity} size="sm" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.title}</span>
                </div>
                <ExploitabilityBadge status={f.exploitability} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
