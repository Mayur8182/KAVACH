'use client';

/**
 * Thing Cloud — Overview Workspace
 * Route: /cloud
 * Answers: “What cloud infrastructure exists, who can access it, what is exposed,
 * which security controls are violated, and what could an attacker reach?”
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  ShieldAlert,
  Server,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Radio,
  Lock,
  Layers,
  Database,
  ExternalLink,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudOverviewResponse, CloudProvider } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudProviderCard, ConnectCloudModal, ProviderConnectionStatus, CloudExposureBadge } from '@/components/cloud/CloudComponents';

export default function CloudOverviewPage() {
  const [overview, setOverview] = useState<CloudOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('AWS');

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      await api.cloud.scan({ provider: 'ALL' });
      setToast('Cloud security scan task submitted to worker queue.');
      setTimeout(() => setToast(null), 4000);
      await fetchOverview(true);
    } catch (err: any) {
      alert(`Scan failed: ${err.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchOverview = async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await api.cloud.overview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cloud infrastructure security overview.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const openConnect = (provider: CloudProvider) => {
    setSelectedProvider(provider);
    setConnectModalOpen(true);
  };

  const actionButtons = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleRunScan}
        disabled={isScanning}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 12px',
          borderRadius: '6px',
          background: 'rgba(37, 99, 235, 0.12)',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
          fontSize: '11.5px',
          fontWeight: '600',
          cursor: isScanning ? 'not-allowed' : 'pointer',
        }}
      >
        <Play size={12} className={isScanning ? 'animate-spin' : ''} />
        {isScanning ? 'Scanning...' : 'Run CSPM Scan'}
      </button>

      <button
        onClick={() => openConnect('AWS')}
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
        <Plus size={13} /> Connect Cloud
      </button>
      <button
        onClick={() => fetchOverview(true)}
        disabled={isRefreshing}
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
        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  return (
    <CloudWorkshell actions={actionButtons}>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {toast && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#059669',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            <RefreshCw size={16} className="animate-spin" style={{ marginRight: '8px' }} />
            Querying authoritative cloud security posture from PostgreSQL...
          </div>
        ) : !overview ? null : (
          <>
            {/* Top Stat Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cloud Accounts
                </div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {overview.cloud_accounts_count}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Multi-cloud connections active
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Discovered Assets
                </div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {overview.assets_total_count.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Compute, storage, IAM &amp; network
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Critical Findings
                </div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: overview.critical_findings_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {overview.critical_findings_count}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Require immediate remediation
                </div>
              </div>

              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  High Severity Findings
                </div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: overview.high_findings_count > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {overview.high_findings_count}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Policy violations &amp; misconfigs
                </div>
              </div>
            </div>

            {/* Provider Capability & Connection Cards */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                  Cloud Provider Posture &amp; Connection Matrix
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Honest connection states &amp; capability matrices
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {(['AWS', 'AZURE', 'GCP'] as CloudProvider[]).map((p) => {
                  const summary = overview.providers[p] || {
                    provider: p,
                    status: 'NOT_CONNECTED',
                    account_count: 0,
                    last_verified_at: null,
                  };
                  const cov = overview.coverage[p];
                  return (
                    <CloudProviderCard
                      key={p}
                      provider={p}
                      status={summary.status}
                      accountCount={summary.account_count}
                      coverage={cov}
                      onConnectClick={() => openConnect(p)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Critical Attention & Cloud Coverage Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {/* Critical Attention Column */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                      Critical Attention
                    </h3>
                  </div>
                  <Link
                    href="/cloud/findings?severity=CRITICAL"
                    style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none' }}
                  >
                    View All Findings →
                  </Link>
                </div>

                {overview.critical_attention.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    No critical security attention items detected across connected environments.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {overview.critical_attention.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '2px 5px',
                                borderRadius: '3px',
                                background: item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: item.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                              }}
                            >
                              {item.severity}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                              {item.provider} • {item.environment}
                            </span>
                          </div>
                          <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            Resource: <code style={{ color: 'var(--color-text-primary)' }}>{item.resource_name}</code> ({item.resource_type})
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Reason: {item.reason}
                          </div>
                        </div>

                        <Link
                          href={`/cloud/findings/${item.id}`}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-primary-text)',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '2px',
                          }}
                        >
                          Evidence <ArrowRight size={11} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cloud Coverage & Evaluation Fidelity */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                      Cloud Coverage &amp; Discovery Fidelity
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Unknown state preserved
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(['AWS', 'AZURE', 'GCP'] as CloudProvider[]).map((prov) => {
                    const cov = overview.coverage[prov];
                    const isConn = cov && cov.status === 'CONNECTED';
                    return (
                      <div
                        key={prov}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                            {prov}
                          </span>
                          <ProviderConnectionStatus status={cov ? cov.status : 'NOT_CONNECTED'} />
                        </div>

                        {isConn ? (
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div>
                              Assets discovered:{' '}
                              <strong style={{ color: 'var(--color-text-primary)' }}>{cov.discovered}</strong>
                            </div>
                            <div>
                              Assets evaluated:{' '}
                              <strong style={{ color: '#10b981' }}>{cov.evaluated}</strong>
                            </div>
                            <div>
                              Unknown / Unevaluated:{' '}
                              <strong style={{ color: cov.unknown > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                                {cov.unknown}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                            Not connected. Connect a {prov} account to enable configuration checks and reachability graphs.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal for connecting providers */}
        <ConnectCloudModal
          isOpen={connectModalOpen}
          initialProvider={selectedProvider}
          onClose={() => setConnectModalOpen(false)}
          onSuccess={() => fetchOverview(true)}
        />
      </div>
    </CloudWorkshell>
  );
}
