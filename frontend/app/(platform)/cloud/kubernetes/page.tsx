'use client';

/**
 * Thing Cloud — Kubernetes Security Workspace
 * Route: /cloud/kubernetes
 * Clusters, Workloads, RBAC controls, Network Policies, and Pod Security Standards.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Server,
  Network,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudKubernetesClusterItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function KubernetesWorkspacePage() {
  const [clusters, setClusters] = useState<CloudKubernetesClusterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.kubernetes();
      setClusters(res.clusters);
      setTotal(res.total_clusters);
    } catch (err: any) {
      setError(err.message || 'Failed to load Kubernetes cluster security.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
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
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Boxes size={14} color="#3b82f6" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Kubernetes Security Posture
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Cluster security, RBAC privileges, network policy isolation, and runtime workload protection across EKS, AKS, and GKE.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            Clusters: <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong>
          </span>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Evaluating Kubernetes clusters...
          </div>
        ) : clusters.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <Boxes size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
              No Kubernetes Clusters Discovered
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Connect AWS (EKS), Azure (AKS), or GCP (GKE) to inspect cluster security, network policies, and RBAC configs.
            </p>
            <Link
              href="/cloud"
              style={{
                fontSize: '11.5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'var(--color-primary)',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Connect Cloud Providers
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {clusters.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: 'var(--color-text-primary)' }}>
                    {c.cluster_name}
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: c.status === 'READY' || c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: c.status === 'READY' || c.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  Provider: <strong>{c.provider}</strong> • Kubernetes v{c.version || '1.28'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '14px',
                    textAlign: 'center',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Nodes</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '2px' }}>{c.nodes_count}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Namespaces</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '2px' }}>{c.namespaces_count}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Workloads</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '2px' }}>{c.workloads_count}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Strict RBAC Enforcement:</span>
                    {c.rbac_strict ? (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        <XCircle size={12} /> Loose Privileges
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Network Policy Isolation:</span>
                    {c.network_policies_active ? (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        <CheckCircle2 size={12} /> Enforced
                      </span>
                    ) : (
                      <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        <XCircle size={12} /> Missing Policies
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Open Cluster Findings:</span>
                    <strong style={{ color: c.open_findings_count > 0 ? '#ef4444' : 'var(--color-text-primary)' }}>
                      {c.open_findings_count}
                    </strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Link
                    href={`/cloud/findings?search=${encodeURIComponent(c.cluster_name)}`}
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-primary-text)',
                      textDecoration: 'none',
                      fontWeight: '600',
                    }}
                  >
                    View Cluster Findings →
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
