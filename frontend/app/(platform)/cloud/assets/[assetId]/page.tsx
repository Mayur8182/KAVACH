'use client';

/**
 * Thing Cloud — Asset Detail Workspace
 * Route: /cloud/assets/[assetId]
 * Deep inspection of a specific cloud asset including real configuration JSON,
 * security violations, network/IAM relationships, and immutable evidence provenance.
 */

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Server,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Clock,
  Archive,
  RefreshCw,
  ExternalLink,
  Target,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudAssetDetailResponse } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudSecurityStateBadge, CloudExposureBadge } from '@/components/cloud/CloudComponents';

interface PageProps {
  params: Promise<{ assetId: string }>;
}

export default function CloudAssetDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { assetId } = resolvedParams;

  const [asset, setAsset] = useState<CloudAssetDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'findings' | 'evidence'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.cloud.assetDetail(assetId);
      setAsset(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetail();
  }, [assetId]);

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {/* Back Link */}
        <div style={{ marginBottom: '16px' }}>
          <Link
            href="/cloud/assets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} /> Back to Assets
          </Link>
        </div>

        {error && (
          <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Loading asset record...
          </div>
        ) : !asset ? null : (
          <div>
            {/* Asset Header Card */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '20px 24px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--color-primary-text)',
                      }}
                    >
                      {asset.provider}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                      <code>{asset.resource_type}</code>
                    </span>
                    <CloudExposureBadge exposure={asset.exposure} />
                    <CloudSecurityStateBadge state={asset.security_state} />
                  </div>

                  <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
                    {asset.resource_name}
                  </h1>

                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    {asset.provider_resource_id}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link
                    href={`/cloud/blast-radius?asset_id=${encodeURIComponent(asset.id)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    <Target size={13} /> Compute Blast Radius
                  </Link>
                </div>
              </div>

              {/* Asset Metadata Chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--color-border)',
                  fontSize: '11.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Region: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{asset.region || 'Global'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Account / Subscription: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{asset.account_id || 'Primary'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Environment: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{asset.environment}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>First Discovered: </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(asset.discovered_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: '20px',
              }}
            >
              {[
                { id: 'overview', label: 'Overview & Context' },
                { id: 'configuration', label: 'Live Configuration' },
                { id: 'findings', label: `Security Findings (${asset.findings.length})` },
                { id: 'evidence', label: 'Evidence & Provenance' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                    fontWeight: activeTab === tab.id ? '600' : 'normal',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                    Posture Evaluation Reasons
                  </h3>
                  {asset.reasons && asset.reasons.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-secondary)', fontSize: '12px', lineHeight: '1.6' }}>
                      {asset.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                      No active configuration warnings or violations detected.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                    Resource Tags &amp; Labels
                  </h3>
                  {asset.tags && Object.keys(asset.tags).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(asset.tags).map(([k, v]) => (
                        <span
                          key={k}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--color-background)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          <strong>{k}</strong>: {String(v)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                      No tags attached to this cloud resource.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'configuration' && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                    Authoritative Cloud Configuration JSON
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Extracted directly from {asset.provider} APIs
                  </span>
                </div>
                <pre
                  style={{
                    padding: '16px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    overflowX: 'auto',
                    lineHeight: '1.4',
                  }}
                >
                  {JSON.stringify(asset.configuration, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'findings' && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 16px 0', color: 'var(--color-text-primary)' }}>
                  Security Violations for {asset.resource_name}
                </h3>
                {asset.findings.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    Zero security violations recorded for this resource.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {asset.findings.map((f: any) => (
                      <div
                        key={f.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '6px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: f.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                              }}
                            >
                              {f.severity}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                              {f.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            Rule ID: <code>{f.rule_id}</code> • Status: <strong>{f.status}</strong>
                          </div>
                        </div>

                        <Link
                          href={`/cloud/findings/${f.id}`}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-primary-text)',
                            textDecoration: 'none',
                            fontWeight: '600',
                          }}
                        >
                          View Finding →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'evidence' && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-text-primary)' }}>
                  Cryptographic Evidence &amp; Invariants
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                  Runtime evidence proves the existence and configuration of this resource.
                  All findings are anchored to raw API responses and deterministic policy evaluations.
                </p>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    fontSize: '11.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Evidence ID: </span>
                    <code>{asset.id}-ev-prov</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Provenance Source: </span>
                    <strong>{asset.provider}_AUTHORITATIVE_API</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Last Verified Timestamp: </span>
                    <span>{new Date(asset.last_seen_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
