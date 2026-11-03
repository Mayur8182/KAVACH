'use client';

/**
 * Thing Cloud — Attack Paths Workspace
 * Route: /cloud/attack-paths
 * Graph-based multi-hop attack path analysis connecting internet exposure,
 * credential leakage/IAM privileges, lateral movement, and crown-jewel assets.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GitMerge,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Globe,
  KeyRound,
  Database,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudAttackPathItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudAttackPathsPage() {
  const [paths, setPaths] = useState<CloudAttackPathItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activePaths, setActivePaths] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttackPaths = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.attackPaths();
      setPaths(res.items || []);
      setTotal(res.total || 0);
      setActivePaths(res.items?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud attack paths.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttackPaths();
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
                <GitMerge size={14} color="#ef4444" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Attack Paths &amp; Lateral Movement
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Chained exploits from perimeter exposures through IAM privilege escalation to high-value cloud crown jewels.
            </p>
          </div>
          <button
            onClick={fetchAttackPaths}
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
            <RefreshCw size={12} /> Re-evaluate Graphs
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
            Computing graph paths between exposures and crown jewels...
          </div>
        ) : paths.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <GitMerge size={36} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No Active Attack Paths Detected
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              Deterministic graph engine found no viable traversal route connecting public internet ingress to internal crown-jewel data stores.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {paths.map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: p.confidence === 'VERIFIED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: p.confidence === 'VERIFIED' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {p.confidence} • Blast Radius {p.blast_radius_score}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                      {p.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                    }}
                  >
                    {p.nodes?.length || 0} NODE{(p.nodes?.length || 0) === 1 ? '' : 'S'}
                  </span>
                </div>

                {/* Path Visual Flow */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={13} color="#ef4444" />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>ENTRY POINT</div>
                      <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {p.entry_point}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={13} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>PROVENANCE / EVIDENCE</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', maxWidth: '320px' }}>
                        {p.provenance}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={13} color="#ef4444" />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>TARGET ASSET</div>
                      <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#ef4444' }}>
                        {p.target_asset}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '11.5px' }}>
                  <Link
                    href={`/cloud/remediation?attack_path_id=${encodeURIComponent(p.id)}`}
                    style={{
                      color: 'var(--color-primary-text)',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    Sever Attack Path With Guardrail →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
