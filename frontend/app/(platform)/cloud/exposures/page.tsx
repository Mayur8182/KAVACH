'use client';

/**
 * Thing Cloud — Exposures Workspace
 * Route: /cloud/exposures
 * Catalog of internet-facing cloud assets, public IP addresses, publicly accessible storage,
 * and open security group ingress boundaries.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Globe,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudExposuresOverviewResponse } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudExposureBadge } from '@/components/cloud/CloudComponents';

export default function CloudExposuresPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExposures = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.exposures();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud exposures.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExposures();
  }, []);

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Radio size={14} color="#ef4444" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                External Attack Surface &amp; Cloud Exposures
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Real-time enumeration of all internet-facing compute instances, public IP allocations, storage buckets, and open ingress rules.
            </p>
          </div>
          <button
            onClick={fetchExposures}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              fontSize: '11.5px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Mapping perimeter exposures and public IP records...
          </div>
        ) : !data ? null : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL INTERNET EXPOSURES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.total_exposures > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.total_exposures}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>DIRECT PUBLIC IPs</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.direct_public_ips}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>PUBLIC STORAGE ASSETS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.public_storage_assets > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.public_storage_assets}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>OPEN INGRESS RULES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.open_ingress_rules > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.open_ingress_rules}
                </div>
              </div>
            </div>

            {/* Exposed Assets Table */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                  Perimeter Exposed Resources
                </h3>
              </div>

              {data.exposed_assets.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No internet-exposed assets detected. All cloud resources are inside private networks or protected by strict boundary controls.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>EXPOSED ASSET</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>EXPOSURE TYPE</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PUBLIC ENDPOINT / IP</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SERVICES</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>FINDINGS</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exposed_assets.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{item.resource_name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>{item.resource_type}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                          {item.provider}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '600',
                              color: '#ef4444',
                              background: 'rgba(239, 68, 68, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.exposure_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {item.public_endpoint || '0.0.0.0/0'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {item.reachable_services.join(', ') || 'TCP/All'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.findings_count > 0 ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.findings_count}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/cloud/attack-paths?target_id=${encodeURIComponent(item.id)}`}
                            style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none', fontWeight: '600' }}
                          >
                            Trace Attack Path →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </CloudWorkshell>
  );
}
