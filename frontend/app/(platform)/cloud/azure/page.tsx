'use client';

/**
 * Thing Cloud — Azure Security Workspace
 * Route: /cloud/azure
 * Dedicated Microsoft Azure security operations, Subscriptions, Entra ID, Storage Blobs, and VNets.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
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

export default function AzureWorkspacePage() {
  const [connections, setConnections] = useState<CloudConnectionItem[]>([]);
  const [assets, setAssets] = useState<CloudAssetItem[]>([]);
  const [findings, setFindings] = useState<CloudFindingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAzureData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connRes, assetRes, findingRes] = await Promise.all([
        api.cloud.connections({ provider: 'AZURE' }),
        api.cloud.assets({ provider: 'AZURE', limit: 50 }),
        api.cloud.findings({ provider: 'AZURE', limit: 20 }),
      ]);
      setConnections(connRes.items);
      setAssets(assetRes.items);
      setFindings(findingRes.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load Azure security workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAzureData();
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
        <Plus size={13} /> Connect Azure Subscription
      </button>
      <button
        onClick={fetchAzureData}
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
                color: '#0284c7',
                background: 'rgba(2, 132, 199, 0.1)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(2, 132, 199, 0.3)',
              }}
            >
              AZURE
            </span>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
              Microsoft Azure Security Workspace
            </h1>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Evaluate tenant security, Entra ID conditional access, Storage Blob public access, and AKS clusters.
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
            Querying Azure subscriptions and posture status...
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
            <Globe size={36} style={{ color: '#0284c7', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No Azure Subscriptions Connected
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto 18px auto' }}>
              Connect Azure using an Entra ID App Registration, Managed Identity, or Service Principal to inspect Azure resources.
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
              Connect Azure Subscription
            </button>
          </div>
        ) : (
          <>
            {/* Subscriptions List */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '10px' }}>
                Connected Azure Subscriptions ({connections.length})
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
                      Subscription ID: {c.subscription_identifier || c.account_identifier || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Auth: {c.authentication_method} • Region: {c.default_region || 'eastus'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Azure Findings & Assets */}
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
                    Azure Posture Findings ({findings.length})
                  </h3>
                  <Link href="/cloud/findings?provider=AZURE" style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}>
                    View All →
                  </Link>
                </div>
                {findings.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                    No security violations recorded for Azure assets.
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
                    Discovered Azure Assets ({assets.length})
                  </h3>
                  <Link href="/cloud/assets?provider=AZURE" style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}>
                    View All →
                  </Link>
                </div>
                {assets.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                    No Azure assets discovered yet.
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
          initialProvider="AZURE"
          onClose={() => setConnectModalOpen(false)}
          onSuccess={fetchAzureData}
        />
      </div>
    </CloudWorkshell>
  );
}
