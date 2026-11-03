'use client';

/**
 * Thing Cloud — Network Security Workspace
 * Route: /cloud/network
 * Network topologies, VPCs, VNets, Subnets, Internet Gateways,
 * and public ingress rule analysis (e.g. 0.0.0.0/0 on port 22/3389).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Network,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Radio,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudNetworkOverviewResponse } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudNetworkPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.network();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load Cloud network security posture.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
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
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Network size={14} color="#10b981" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Network Security &amp; Ingress Boundaries
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Multi-cloud VPC/VNet inspection, subnet isolation, transit gateways, and publicly exposed management ports (SSH/RDP).
            </p>
          </div>
          <button
            onClick={fetchNetwork}
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
            Mapping multi-cloud network topologies and firewall rules...
          </div>
        ) : !data ? null : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL VPCs / VNets</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.total_networks}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL SUBNETS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.total_subnets}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>PUBLIC INGRESS ROUTES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.public_ingress_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.public_ingress_count}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>OPEN SSH/RDP PORTS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.open_management_ports_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.open_management_ports_count}
                </div>
              </div>
            </div>

            {/* Networks Table */}
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
                  Cloud Virtual Networks &amp; Subnets
                </h3>
              </div>

              {data.networks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No virtual networks indexed. Connect cloud providers to begin network mapping.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>NETWORK NAME</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>CIDR BLOCK</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>REGION</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PUBLIC INGRESS</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>OPEN PORTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.networks.map((n) => (
                      <tr key={n.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{n.network_name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {n.provider_network_id}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                          {n.provider}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <code>{n.cidr_block}</code>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                          {n.region || 'global'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {n.is_public ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px' }}>Yes (Exposed)</span>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '11px' }}>Isolated</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {n.open_ports.length > 0 ? (
                            <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '11px' }}>
                              {n.open_ports.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>None</span>
                          )}
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
