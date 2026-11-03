'use client';

/**
 * Thing Cloud — IAM & Identity Security Workspace
 * Route: /cloud/iam
 * Evaluates Cloud IAM principals, roles, service accounts, toxic permission combinations,
 * overprivileged access, and MFA enforcement across AWS, Azure, and GCP.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudIAMOverviewResponse, CloudIAMPrincipalItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudIAMPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIAM = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.iam();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load Cloud IAM security posture.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIAM();
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
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={14} color="#f59e0b" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud IAM &amp; Entitlement Security
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Least privilege analysis, overprivileged roles, toxic entitlement combinations, and machine identity risks across AWS IAM, Entra ID, and GCP IAM.
            </p>
          </div>
          <button
            onClick={fetchIAM}
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
            Evaluating IAM permissions and effective access graphs...
          </div>
        ) : !data ? null : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL PRINCIPALS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.total_principals}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>ADMIN PRIVILEGES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.admin_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.admin_count}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>OVERPRIVILEGED ROLES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.overprivileged_count > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.overprivileged_count}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOXIC COMBINATIONS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: data.toxic_combinations_count > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {data.toxic_combinations_count}
                </div>
              </div>
            </div>

            {/* Principals Table */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-primary)' }}>
                  Cloud IAM Principals &amp; Effective Access
                </h3>
              </div>

              {data.principals.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  No IAM principals indexed. Connect cloud providers to begin entitlement discovery.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PRINCIPAL NAME</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>TYPE</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ADMIN ACCESS</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>OVERPRIVILEGED</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>MFA STATUS</th>
                      <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.principals.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{p.principal_name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {p.arn.length > 40 ? p.arn.substring(0, 40) + '...' : p.arn}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          <code>{p.principal_type}</code>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                          {p.provider}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.is_admin ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={12} /> Full Admin
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Standard</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.is_overprivileged ? (
                            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '11px' }}>Yes</span>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '11px' }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.mfa_enabled ? (
                            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                              <XCircle size={12} /> Missing
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/cloud/blast-radius?principal_id=${encodeURIComponent(p.id)}`}
                            style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none', fontWeight: '600' }}
                          >
                            Trace Access →
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
