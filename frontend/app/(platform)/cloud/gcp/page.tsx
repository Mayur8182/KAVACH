'use client';

/**
 * Thing Cloud — GCP Security Workspace
 * Route: /cloud/gcp
 * Dedicated Google Cloud Platform security operations, Projects, Cloud IAM, GCS Storage, and VPC.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  ArrowRight,
  Database,
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudConnectionItem, CloudAssetItem, CloudFindingItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { ProviderConnectionStatus, ConnectCloudModal, CloudSecurityStateBadge, CloudExposureBadge } from '@/components/cloud/CloudComponents';

export default function GCPWorkspacePage() {
  const [connections, setConnections] = useState<CloudConnectionItem[]>([]);
  const [assets, setAssets] = useState<CloudAssetItem[]>([]);
  const [findings, setFindings] = useState<CloudFindingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGCPData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connRes, assetRes, findingRes] = await Promise.all([
        api.cloud.connections({ provider: 'GCP' }),
        api.cloud.assets({ provider: 'GCP', limit: 50 }),
        api.cloud.findings({ provider: 'GCP', limit: 20 }),
      ]);
      setConnections(connRes.items);
      setAssets(assetRes.items);
      setFindings(findingRes.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load GCP security workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGCPData();
  }, []);

  const isConnected = connections.some((c) => c.status === 'CONNECTED');

  const actionButtons = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => setConnectModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 12px',
          borderRadius: '6px',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          fontSize: '11.5px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        <Plus size={13} /> Connect GCP Project
      </button>
      <button
        onClick={fetchGCPData}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 10px',
          borderRadius: '6px',
          background: 'var(--color-surface)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
          fontSize: '11.5px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );

  return (
    <CloudWorkshell actions={actionButtons}>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ea4335',
                background: 'rgba(234, 67, 53, 0.1)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(234, 67, 53, 0.3)',
              }}
            >
              GCP
            </span>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
              Google Cloud Platform Security Workspace
            </h1>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Analyze Google Cloud organization hierarchies, service account keys, GCS buckets, and Security Command Center findings.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="animate-spin" style={{ marginRight: '6px' }} />
            Querying GCP projects and posture state...
          </div>
        ) : !isConnected && connections.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <Layers size={36} style={{ color: '#ea4335', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No GCP Projects Connected
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto 18px auto' }}>
              Connect a Google Cloud project or organization using Workload Identity Federation or Service Account credentials to evaluate GCP infrastructure.
            </p>
            <button
              onClick={() => setConnectModalOpen(true)}
              style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Connect GCP Project
            </button>
          </div>
        ) : (
          <>
            {/* Projects List */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                Connected GCP Projects ({connections.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {connections.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                        {c.connection_name}
                      </span>
                      <ProviderConnectionStatus status={c.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>
                      Project ID: {c.gcp_project_identifier || c.account_identifier || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Auth: {c.authentication_method} • Region: {c.default_region || 'us-central1'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GCP Findings & Assets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                    GCP Posture Findings ({findings.length})
                  </h3>
                  <Link href="/cloud/findings?provider=GCP" style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}>
                    View All →
                  </Link>
                </div>
                {findings.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                    No security violations recorded for GCP assets.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {findings.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: f.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                              }}
                            >
                              {f.severity}
                            </span>
                            <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                              {f.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Resource: {f.resource_name} ({f.resource_type})
                          </div>
                        </div>
                        <Link href={`/cloud/findings/${f.id}`} style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}>
                          Inspect →
                        </Link>
                      </div>
                    ))}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                    Discovered GCP Assets ({assets.length})
                  </h3>
                  <Link href="/cloud/assets?provider=GCP" style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}>
                    View All →
                  </Link>
                </div>
                {assets.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                    No GCP assets discovered yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assets.slice(0, 8).map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                            {a.resource_name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {a.resource_type} • {a.region || 'global'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CloudExposureBadge exposure={a.exposure} />
                          <CloudSecurityStateBadge state={a.security_state} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <ConnectCloudModal
          isOpen={connectModalOpen}
          initialProvider="GCP"
          onClose={() => setConnectModalOpen(false)}
          onSuccess={fetchGCPData}
        />
      </div>
    </CloudWorkshell>
  );
}
