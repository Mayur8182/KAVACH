'use client';

/**
 * Thing Cloud — Database Security Workspace
 * Route: /cloud/databases
 * Evaluates Amazon RDS/Aurora, Azure SQL/Cosmos, and Google Cloud SQL.
 * Verifies public accessibility, storage encryption, automated backups, and IAM database authentication.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudDatabaseItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';

export default function CloudDatabasesPage() {
  const [items, setItems] = useState<CloudDatabaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [publicCount, setPublicCount] = useState(0);
  const [unencryptedCount, setUnencryptedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatabases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.databases();
      setItems(res.items);
      setTotal(res.total_databases);
      setPublicCount(res.publicly_exposed_count ?? 0);
      setUnencryptedCount(res.unencrypted_count);
    } catch (err: any) {
      setError(err.message || 'Failed to load Cloud database posture.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
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
                  background: 'rgba(168, 85, 247, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Database size={14} color="#a855f7" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Database Security Posture
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Managed relational and NoSQL database security across Amazon RDS/Aurora, Azure SQL, and GCP Cloud SQL.
            </p>
          </div>
          <button
            onClick={fetchDatabases}
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
            Evaluating database configurations, security group bindings, and encryption...
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL DATABASES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {total}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>PUBLICLY ACCESSIBLE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: publicCount > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {publicCount}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>UNENCRYPTED DISKS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: unencryptedCount > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {unencryptedCount}
                </div>
              </div>
            </div>

            {/* Databases Table */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>DATABASE INSTANCE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ENGINE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PUBLIC ACCESS</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ENCRYPTION</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>BACKUPS</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>MULTI-AZ</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SECURITY STATUS</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((db) => (
                    <tr key={db.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{db.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                          {db.region || 'global'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        <code>{db.engine} {db.version || ''}</code>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                        {db.provider}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {db.is_publicly_accessible ? (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                            <XCircle size={12} /> Public IP
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}>
                            <CheckCircle2 size={12} /> Private VPC
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {db.storage_encrypted ? (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                            <Lock size={12} /> Encrypted
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                            <Unlock size={12} /> Unencrypted
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {db.backup_retention_days > 0 ? (
                          <span style={{ color: '#10b981', fontSize: '11px' }}>{db.backup_retention_days} days</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '11px' }}>Disabled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {db.multi_az ? (
                          <span style={{ color: '#10b981', fontSize: '11px' }}>Enabled</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Single AZ</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: (db.security_status as string) === 'VIOLATION' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: (db.security_status as string) === 'VIOLATION' ? '#ef4444' : '#10b981'
                        }}>
                          {db.security_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          href={`/cloud/assets/${db.id}`}
                          style={{ fontSize: '11px', color: 'var(--color-primary-text)', textDecoration: 'none', fontWeight: '600' }}
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </CloudWorkshell>
  );
}
