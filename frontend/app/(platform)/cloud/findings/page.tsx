'use client';

/**
 * Thing Cloud — Findings Workspace
 * Route: /cloud/findings
 * Multi-cloud security misconfigurations, policy violations, and compliance breaches.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type { CloudFindingItem } from '@/types/api/cloud';
import { CloudWorkshell } from '@/components/cloud/CloudWorkshell';
import { ServerPagination } from '@/components/data-display/ServerPagination';

export default function CloudFindingsPage() {
  const [findings, setFindings] = useState<CloudFindingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState<string>('');
  const [provider, setProvider] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const fetchFindings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.cloud.findings({
        severity: severity || undefined,
        provider: provider || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize,
        limit: pageSize,
      });
      setFindings(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load cloud findings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [severity, provider, status, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFindings();
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
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={14} color="#ef4444" />
              </div>
              <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: 0 }}>
                Cloud Security Findings &amp; Misconfigurations
              </h1>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Deterministic policy violations, exposure risks, and compliance breaches across AWS, Azure, and GCP resources.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            Findings Total: <strong style={{ color: 'var(--color-text-primary)' }}>{total.toLocaleString()}</strong>
          </span>
        </div>

        {/* Filter Toolbar */}
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
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
              }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
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

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '11.5px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="MUTED">Muted</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search rule or resource..."
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

        {error && (
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

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
              Loading security findings from PostgreSQL...
            </div>
          ) : findings.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <AlertTriangle size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
                No Findings Found
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                No active security violations match your filter criteria.
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>FINDING / RULE</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>SEVERITY</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>PROVIDER</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>AFFECTED RESOURCE</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ENV</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>STATUS</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{f.title}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{f.rule_id}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: f.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11.5px', color: 'var(--color-text-primary)' }}>
                      {f.provider}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{f.resource_name}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>{f.resource_type}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                      {f.environment}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: f.status === 'OPEN' ? '#ef4444' : '#10b981' }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/cloud/findings/${f.id}`}
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
                        Details <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        </>
      )}
        </div>
      </div>
    </CloudWorkshell>
  );
}
