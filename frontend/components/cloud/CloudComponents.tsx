'use client';

/**
 * CloudComponents — Reusable UI widgets for Thing Cloud
 * Implements Section 65: Provider Cards, Badges, Modals, Status, and Controls
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  ExternalLink,
  Plus,
  RefreshCw,
  Server,
  Lock,
  Layers,
  ArrowRight,
  Database,
  Radio,
  FileCode2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudProvider, CloudConnectionStatus, CloudSecurityState, CloudExposureState } from '@/types/api/cloud';

// ─────────────────────────────────────────────────────────────
// 1. Provider Connection Status Badge
// ─────────────────────────────────────────────────────────────
export const ProviderConnectionStatus: React.FC<{ status: CloudConnectionStatus | string }> = ({ status }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    CONNECTED: {
      bg: 'rgba(16, 185, 129, 0.1)',
      text: '#10b981',
      border: 'rgba(16, 185, 129, 0.25)',
      icon: <CheckCircle2 size={12} />,
      label: 'CONNECTED',
    },
    NOT_CONNECTED: {
      bg: 'rgba(148, 163, 184, 0.1)',
      text: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.25)',
      icon: <Clock size={12} />,
      label: 'NOT CONNECTED',
    },
    NOT_CONFIGURED: {
      bg: 'rgba(148, 163, 184, 0.1)',
      text: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.25)',
      icon: <Clock size={12} />,
      label: 'NOT CONFIGURED',
    },
    DEGRADED: {
      bg: 'rgba(245, 158, 11, 0.1)',
      text: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.25)',
      icon: <AlertTriangle size={12} />,
      label: 'DEGRADED',
    },
    AUTHENTICATION_FAILED: {
      bg: 'rgba(239, 68, 68, 0.1)',
      text: '#ef4444',
      border: 'rgba(239, 68, 68, 0.25)',
      icon: <XCircle size={12} />,
      label: 'AUTH FAILED',
    },
    PERMISSION_DENIED: {
      bg: 'rgba(239, 68, 68, 0.1)',
      text: '#ef4444',
      border: 'rgba(239, 68, 68, 0.25)',
      icon: <XCircle size={12} />,
      label: 'PERMISSION DENIED',
    },
    DISCOVERY_RUNNING: {
      bg: 'rgba(59, 130, 246, 0.1)',
      text: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.25)',
      icon: <RefreshCw size={12} className="animate-spin" />,
      label: 'DISCOVERING',
    },
    UNKNOWN: {
      bg: 'rgba(100, 116, 139, 0.1)',
      text: '#64748b',
      border: 'rgba(100, 116, 139, 0.25)',
      icon: <AlertTriangle size={12} />,
      label: 'UNKNOWN',
    },
  };

  const style = config[norm] || config.UNKNOWN;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: '600',
        padding: '2px 7px',
        borderRadius: '4px',
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.02em',
      }}
    >
      {style.icon}
      {style.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. Cloud Security State Badge
// ─────────────────────────────────────────────────────────────
export const CloudSecurityStateBadge: React.FC<{ state: CloudSecurityState | string }> = ({ state }) => {
  const norm = (state || 'UNKNOWN').toUpperCase();

  const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
    HEALTHY: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)', label: 'HEALTHY' },
    ATTENTION: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)', label: 'ATTENTION' },
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', label: 'CRITICAL' },
    NOT_EVALUATED: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)', label: 'NOT EVALUATED' },
    UNKNOWN: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)', label: 'UNKNOWN' },
  };

  const item = map[norm] || map.UNKNOWN;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '10.5px',
        fontWeight: '600',
        padding: '2px 6px',
        borderRadius: '4px',
        background: item.bg,
        color: item.text,
        border: `1px solid ${item.border}`,
      }}
    >
      {item.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. Exposure State Badge
// ─────────────────────────────────────────────────────────────
export const CloudExposureBadge: React.FC<{ exposure: CloudExposureState | string }> = ({ exposure }) => {
  const norm = (exposure || 'UNKNOWN').toUpperCase();

  if (norm === 'PUBLIC') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10.5px',
          fontWeight: '600',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <Radio size={10} /> PUBLIC
      </span>
    );
  }

  if (norm === 'INTERNAL') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10.5px',
          fontWeight: '500',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'rgba(16, 185, 129, 0.08)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <Lock size={10} /> INTERNAL
      </span>
    );
  }

  return (
    <span
      style={{
        fontSize: '10.5px',
        fontWeight: '500',
        padding: '2px 6px',
        borderRadius: '4px',
        background: 'rgba(148, 163, 184, 0.1)',
        color: '#94a3b8',
      }}
    >
      UNKNOWN
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// 4. Provider Overview Card (Section 5, 6, 8)
// ─────────────────────────────────────────────────────────────
export const CloudProviderCard: React.FC<{
  provider: CloudProvider;
  status: string;
  accountCount: number;
  coverage?: { discovered: number; evaluated: number; unknown: number; status: string };
  onConnectClick?: () => void;
}> = ({ provider, status, accountCount, coverage, onConnectClick }) => {
  const isConnected = status === 'CONNECTED';

  const providerMeta: Record<CloudProvider, { title: string; desc: string; color: string; icon: string; link: string }> = {
    AWS: {
      title: 'Amazon Web Services',
      desc: 'IAM roles, S3 buckets, EC2, VPC security groups, GuardDuty, and EKS',
      color: '#f59e0b',
      icon: 'AWS',
      link: '/cloud?view=as',
    },
    AZURE: {
      title: 'Microsoft Azure',
      desc: 'Entra ID, Storage Blobs, Virtual Machines, VNets, Defender, and AKS',
      color: '#0284c7',
      icon: 'Azure',
      link: '/cloud?view=as',
    },
    GCP: {
      title: 'Google Cloud Platform',
      desc: 'Cloud IAM, GCS Storage, Compute Engine, VPC, Security Command Center, and GKE',
      color: '#ea4335',
      icon: 'GCP',
      link: '/cloud?view=as',
    },
    KUBERNETES: {
      title: 'Kubernetes Clusters',
      desc: 'K8s RBAC, PodSecurity, NetworkPolicies, Helm charts, and runtime posture',
      color: '#326ce5',
      icon: 'K8s',
      link: '/cloud?view=as',
    },
  };

  const meta = providerMeta[provider] || providerMeta.AWS;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '170px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: meta.color,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '3px 7px',
                borderRadius: '4px',
                border: `1px solid ${meta.color}40`,
              }}
            >
              {provider}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
              {meta.title}
            </span>
          </div>
          <ProviderConnectionStatus status={status} />
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: '1.4', margin: '4px 0 12px 0' }}>
          {meta.desc}
        </p>

        {isConnected ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Accounts / Subscriptions: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{accountCount}</strong>
            </div>
            {coverage && (
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Assets Evaluated: </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {coverage.evaluated} / {coverage.discovered}
                </strong>
                {coverage.unknown > 0 && (
                  <span style={{ color: '#f59e0b', marginLeft: '4px' }}>({coverage.unknown} unknown)</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(148, 163, 184, 0.05)',
              border: '1px dashed var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            Connect a {provider} account to begin automated infrastructure &amp; posture discovery.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
        {isConnected ? (
          <Link
            href={meta.link}
            style={{
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--color-primary-text)',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            View {provider} Workspace <ArrowRight size={12} />
          </Link>
        ) : (
          <button
            onClick={onConnectClick}
            style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '5px 12px',
              borderRadius: '5px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={12} /> Connect {provider}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 5. Connect Cloud Provider Modal
// ─────────────────────────────────────────────────────────────
export const ConnectCloudModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProvider?: CloudProvider;
}> = ({ isOpen, onClose, onSuccess, initialProvider = 'AWS' }) => {
  const [provider, setProvider] = useState<CloudProvider>(initialProvider);
  const [connectionName, setConnectionName] = useState('');
  const [authMethod, setAuthMethod] = useState('IAM_ROLE');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.cloud.createConnection({
        provider,
        connection_name: connectionName || `${provider} Production Account`,
        authentication_method: authMethod,
        account_identifier: accountIdentifier || undefined,
        default_region: region,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect cloud provider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={16} color="var(--color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
              Connect Cloud Infrastructure
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '11.5px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Provider selector */}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            CHOOSE PROVIDER
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {(['AWS', 'AZURE', 'GCP'] as CloudProvider[]).map((p) => {
              const selected = provider === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setProvider(p);
                    setAuthMethod(p === 'AWS' ? 'IAM_ROLE' : p === 'AZURE' ? 'MANAGED_IDENTITY' : 'WORKLOAD_IDENTITY');
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '6px',
                    border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: selected ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-background)',
                    color: selected ? 'var(--color-primary-text)' : 'var(--color-text-primary)',
                    fontWeight: selected ? 'bold' : 'normal',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Cloud size={16} />
                  {p}
                </button>
              );
            })}
          </div>

          {/* Connection Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '5px' }}>
              CONNECTION NAME
            </label>
            <input
              type="text"
              required
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              placeholder={`e.g. ${provider} Primary Production`}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Account/Subscription/Project Identifier */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '5px' }}>
              {provider === 'AWS' ? 'AWS ACCOUNT ID' : provider === 'AZURE' ? 'SUBSCRIPTION ID' : 'GCP PROJECT ID'}
            </label>
            <input
              type="text"
              required
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              placeholder={provider === 'AWS' ? '12-digit AWS Account ID' : provider === 'AZURE' ? 'Azure Subscription UUID' : 'gcp-project-id'}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Auth Method */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '5px' }}>
              AUTHENTICATION METHOD (Short-Lived / Role-Based Preferred)
            </label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
              }}
            >
              {provider === 'AWS' && (
                <>
                  <option value="IAM_ROLE">Cross-Account IAM Role (Recommended)</option>
                  <option value="ACCESS_KEY">IAM Access Key (Restricted)</option>
                  <option value="AWS_ORGANIZATION">AWS Organizations Integration</option>
                </>
              )}
              {provider === 'AZURE' && (
                <>
                  <option value="MANAGED_IDENTITY">Managed Identity / Entra App (Recommended)</option>
                  <option value="SERVICE_PRINCIPAL">Service Principal Secret</option>
                </>
              )}
              {provider === 'GCP' && (
                <>
                  <option value="WORKLOAD_IDENTITY">Workload Identity Federation (Recommended)</option>
                  <option value="SERVICE_ACCOUNT_KEY">Service Account Key JSON</option>
                </>
              )}
            </select>
          </div>

          {/* Default Region */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '5px' }}>
              DEFAULT REGION
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. us-east-1, eastus, us-central1"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Validating & Connecting...' : 'Validate & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 8. Cloud Provider Chip & Aliases
// ─────────────────────────────────────────────────────────────
export const CloudProviderChip: React.FC<{ provider: CloudProvider | string }> = ({ provider }) => {
  const norm = (provider || 'AWS').toUpperCase();
  const colors: Record<string, string> = {
    AWS: '#f59e0b',
    AZURE: '#0284c7',
    GCP: '#ea4335',
  };
  const color = colors[norm] || '#8b5cf6';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        color,
        background: `${color}15`,
        border: `1px solid ${color}35`,
      }}
    >
      {norm}
    </span>
  );
};

export const CloudConnectionStateBadge = ProviderConnectionStatus;

