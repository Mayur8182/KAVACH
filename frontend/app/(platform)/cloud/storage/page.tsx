'use client';

/**
 * Thing Cloud — Storage Security Workspace
 * Route: /cloud/storage
 * Security analysis for Amazon S3, Azure Blob Storage, and Google Cloud Storage.
 * Verifies public access blocks, default encryption, bucket versioning, and object locking.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HardDrive,
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
import type { CloudStorageItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudExposureBadge } from '@/components/cloud/CloudComponents';

export default function CloudStoragePage() {
  const [items, setItems] = useState<CloudStorageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [publicCount, setPublicCount] = useState(0);
  const [unencryptedCount, setUnencryptedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.storage();
      setItems(res.items);
      setTotal(res.total_buckets);
      setPublicCount(res.publicly_accessible_count ?? res.public_buckets ?? 0);
      setUnencryptedCount(res.unencrypted_count ?? res.unencrypted_buckets ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load Cloud storage posture.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
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
                  background: 'rgba(234, 179, 8, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HardDrive size={14} color="#eab308" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Object Storage Security
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Multi-cloud posture evaluation across AWS S3 buckets, Azure Storage containers, and Google Cloud Storage buckets.
            </p>
          </div>
          <button
            onClick={fetchStorage}
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
            Evaluating bucket policies, public access blocks, and KMS encryption...
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>TOTAL STORAGE BUCKETS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {total}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>PUBLICLY EXPOSED</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: publicCount > 0 ? '#ef4444' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {publicCount}
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>UNENCRYPTED AT REST</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: unencryptedCount > 0 ? '#f59e0b' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {unencryptedCount}
                </div>
              </div>
            </div>

            {/* Storage Table */}
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
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>BUCKET / CONTAINER NAME</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>REGION</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PUBLIC BLOCK</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ENCRYPTION</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>VERSIONING</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>OPEN FINDINGS</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{b.bucket_name || b.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {b.account_id || b.storage_type}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--color-text-primary)' }}>
                        {b.provider}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {b.region || 'global'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {b.public_access_blocked ? (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600' }}>
                            <CheckCircle2 size={12} /> Blocked
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 'bold' }}>
                            <XCircle size={12} /> Public / Open
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {b.encryption_enabled || b.encrypted ? (
                          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                            <Lock size={12} /> {b.kms_key_arn ? 'KMS CMK' : 'AES-256'}
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                            <Unlock size={12} /> Unencrypted
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {b.versioning_enabled ? (
                          <span style={{ color: '#10b981', fontSize: '11px' }}>Enabled</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Disabled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {(b.findings_count ?? 0) > 0 ? (
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{b.findings_count}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          href={`/cloud/assets/${b.id}`}
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
