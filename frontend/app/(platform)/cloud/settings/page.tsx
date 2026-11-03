'use client';

/**
 * Thing Cloud — Settings Workspace
 * Route: /cloud/settings
 * Cloud provider connections, credential management, scanning cadence,
 * policy enforcement thresholds, and audit webhooks.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  Cloud,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudConnectionItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudProviderChip, CloudConnectionStateBadge } from '@/components/cloud/CloudComponents';

export default function CloudSettingsPage() {
  const [connections, setConnections] = useState<CloudConnectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New connection modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'AWS' | 'AZURE' | 'GCP'>('AWS');
  const [connectionName, setConnectionName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchConnections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.connections();
      setConnections(res.items || (res as any));
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud provider connections.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSubmitSuccess(null);
    try {
      await api.cloud.connectProvider({
        provider: selectedProvider,
        name: connectionName || `${selectedProvider} Connection`,
        account_id: accountId,
        credentials: {
          role_arn: roleArn,
        },
      });
      setSubmitSuccess(`Successfully added connection for ${selectedProvider}!`);
      setShowConnectModal(false);
      setConnectionName('');
      setAccountId('');
      setRoleArn('');
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Failed to register cloud connection.');
    } finally {
      setIsSubmitting(false);
    }
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings size={14} color="var(--color-text-secondary)" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Security Settings &amp; Integrations
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Manage cloud provider connections, cross-account IAM trust roles, scanning intervals, and policy automation rules.
            </p>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Add Cloud Provider
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {submitSuccess && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '12px', marginBottom: '20px' }}>
            {submitSuccess}
          </div>
        )}

        {/* Cloud Connections Section */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
              Connected Cloud Providers
            </h3>
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              <RefreshCw size={14} className="animate-spin" style={{ marginRight: '6px' }} />
              Loading connected accounts...
            </div>
          ) : connections.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              No cloud accounts connected yet. Add an AWS, Azure, or GCP provider to start indexing infrastructure.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>NAME</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACCOUNT ID</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>STATUS</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>LAST AUDITED</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <CloudProviderChip provider={c.provider} />
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {c.account_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <CloudConnectionStateBadge status={c.status} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                      {c.last_scan_at || c.last_verified_at ? new Date(c.last_scan_at || c.last_verified_at!).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Global Cloud Policy Settings */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 14px 0', color: 'var(--color-text-primary)' }}>
            Cloud Governance &amp; Posture Configuration
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                Continuous Scan Frequency
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                Inventory drift detection and CIS benchmark evaluation schedule.
              </div>
              <select
                defaultValue="HOURLY"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              >
                <option value="HOURLY">Every 1 Hour (Recommended for Production)</option>
                <option value="SIX_HOURS">Every 6 Hours</option>
                <option value="DAILY">Daily at 00:00 UTC</option>
              </select>
            </div>

            <div style={{ padding: '14px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                Enforcement Mode
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                Block non-compliant Terraform plans or notify via audit webhook.
              </div>
              <select
                defaultValue="BLOCK_ON_CRITICAL"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              >
                <option value="BLOCK_ON_CRITICAL">Block CI/CD on Critical Findings (Strict)</option>
                <option value="WARN_ONLY">Warn Only / Audit Trail Recording</option>
                <option value="AUTO_REMEDIATE">Auto-Sever Attack Paths via Lambda Guardrails</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal for Connecting Cloud Provider */}
        {showConnectModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '520px',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                  Connect Cloud Provider
                </h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '13px' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateConnection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    PROVIDER
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e: any) => setSelectedProvider(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="AWS">Amazon Web Services (AWS)</option>
                    <option value="AZURE">Microsoft Azure</option>
                    <option value="GCP">Google Cloud Platform (GCP)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    CONNECTION / ACCOUNT LABEL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Production Workloads"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    ACCOUNT ID / SUBSCRIPTION ID / PROJECT ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="12-digit AWS Account ID or Azure Subscription UUID"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                    CROSS-ACCOUNT IAM ROLE ARN (READ-ONLY)
                  </label>
                  <input
                    type="text"
                    placeholder="arn:aws:iam::123456789012:role/ThingCloudAuditorRole"
                    value={roleArn}
                    onChange={(e) => setRoleArn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Connecting...' : 'Save & Verify Connection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CloudWorkshell>
  );
}
