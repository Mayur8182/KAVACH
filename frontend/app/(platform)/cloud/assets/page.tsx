'use client';

/**
 * Thing Cloud — Asset Inventory
 * Route: /cloud/assets
 * Lists all discovered multi-cloud resources with full filtering, exposure status, and security posture.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudAssetItem, CloudProvider } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { CloudSecurityStateBadge, CloudExposureBadge } from '@/components/cloud/CloudComponents';
import { ServerPagination } from '@/components/data-display/ServerPagination';

export default function CloudAssetsPage() {
  const [assets, setAssets] = useState<CloudAssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const fetchAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.assets({
        provider: selectedProvider || undefined,
        resourceType: resourceType || undefined,
        environment: environment || undefined,
        search: search || undefined,
        page,
        pageSize,
        limit: pageSize,
      });
      setAssets(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud asset inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [selectedProvider, resourceType, environment, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  return (
    <CloudWorkshell>
      <div style={{ padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
              Cloud Asset Inventory
            </h1>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
              Normalized inventory across AWS, Azure, and GCP resources, networks, identities, and databases.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            Total Assets: <strong style={{ color: 'var(--color-text-primary)' }}>{total.toLocaleString()}</strong>
          </span>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Provider Filter */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
              }}
            >
              <option value="">All Providers</option>
              <option value="AWS">AWS</option>
              <option value="AZURE">Azure</option>
              <option value="GCP">GCP</option>
            </select>

            {/* Resource Type Filter */}
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
              }}
            >
              <option value="">All Resource Types</option>
              <option value="aws_s3_bucket">S3 Bucket</option>
              <option value="aws_instance">EC2 Instance</option>
              <option value="aws_security_group">Security Group</option>
              <option value="aws_iam_role">IAM Role</option>
              <option value="aws_db_instance">RDS Database</option>
              <option value="azure_storage_account">Azure Storage</option>
              <option value="azure_virtual_machine">Azure VM</option>
              <option value="gcp_compute_instance">GCP Compute</option>
              <option value="gcp_storage_bucket">GCP Storage</option>
            </select>

            {/* Environment Filter */}
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
              }}
            >
              <option value="">All Environments</option>
              <option value="PRODUCTION">Production</option>
              <option value="STAGING">Staging</option>
              <option value="DEVELOPMENT">Development</option>
            </select>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search resource name or ARN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  width: '240px',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Assets Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              <RefreshCw size={14} className="animate-spin" style={{ marginRight: '6px' }} />
              Loading authoritative cloud asset catalog...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Server size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
                No Cloud Assets Found
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                No resources match your active filters, or no cloud provider accounts have completed discovery.
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
                  display: 'inline-block',
                }}
              >
                Go to Cloud Overview &amp; Connect Accounts
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>RESOURCE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>TYPE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>PROVIDER</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>REGION</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>EXPOSURE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>SECURITY STATE</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>VIOLATIONS</th>
                    <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{asset.resource_name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                          {asset.provider_resource_id.length > 40
                            ? asset.provider_resource_id.substring(0, 40) + '...'
                            : asset.provider_resource_id}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11.5px' }}>
                        <code>{asset.resource_type}</code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                          {asset.provider}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                        {asset.region || 'global'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <CloudExposureBadge exposure={asset.exposure} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <CloudSecurityStateBadge state={asset.security_state} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {asset.violations_count > 0 ? (
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{asset.violations_count}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          href={`/cloud/assets/${asset.id}`}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-primary-text)',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          View <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ServerPagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                totalPages={Math.ceil(total / pageSize) || 1}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </CloudWorkshell>
  );
}
