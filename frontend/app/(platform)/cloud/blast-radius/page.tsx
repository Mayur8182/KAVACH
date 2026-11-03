'use client';

/**
 * Thing Cloud — Blast Radius Workspace
 * Route: /cloud/blast-radius
 * Deterministic blast radius simulation answering:
 * "If this IAM principal or workload is compromised, what exact resources and data can be reached?"
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Target,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Database,
  Lock,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudBlastRadiusResponse } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudBlastRadiusPage() {
  const [data, setData] = useState<CloudBlastRadiusResponse | null>(null);
  const [targetId, setTargetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlastRadius = async (assetId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.blastRadius(assetId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate blast radius.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlastRadius();
  }, []);

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBlastRadius(targetId || undefined);
  };

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
                <Target size={14} color="#ef4444" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Blast Radius &amp; Compromise Simulation
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Determines reachable assets, databases, and sensitive data stores if a specific credential, pod, or instance is breached.
            </p>
          </div>
        </div>

        {/* Simulation Input */}
        <form
          onSubmit={handleRunSimulation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <Search size={14} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Enter Asset ID or IAM Role ARN to simulate compromise..."
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Run Simulation
          </button>
        </form>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Computing blast radius traversal graph...
          </div>
        ) : !data ? null : (
          <div>
            {/* Simulation Header */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '18px 20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                SIMULATED COMPROMISE SOURCE
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {data.starting_asset}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Reachable Identities: <strong>{data.reachable_identities_count}</strong> • Reachable Sensitive Data:{' '}
                <strong style={{ color: data.reachable_sensitive_data ? '#ef4444' : '#10b981' }}>
                  {data.reachable_sensitive_data ? 'EXPOSED' : 'ISOLATED'}
                </strong>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>REACHABLE RESOURCES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.reachable_resources_count}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>REACHABLE IDENTITIES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.reachable_identities_count > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.reachable_identities_count}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>SENSITIVE DATA EXPOSURE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.reachable_sensitive_data ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                  {data.reachable_sensitive_data ? 'YES' : 'NO'}
                </div>
              </div>
            </div>

            {/* Reachable Assets Table */}
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
                  Reachable Blast Radius Graph Nodes
                </h3>
              </div>

              {(!data.nodes || data.nodes.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No secondary assets reachable. Compromise is strictly isolated by IAM boundary policies.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>NODE</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>NODE TYPE</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>REACHABILITY</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>RISK LEVEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nodes.map((node, nIdx) => (
                      <tr key={node.id || nIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{node.label || node.id}</div>
                          {node.label && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{node.id}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          <code>{node.type}</code>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                          {node.reachability}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 'bold',
                              color: node.risk_level === 'CRITICAL' || node.risk_level === 'HIGH' ? '#ef4444' : '#10b981',
                            }}
                          >
                            {node.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
