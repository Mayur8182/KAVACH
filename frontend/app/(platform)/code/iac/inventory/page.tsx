'use client';

/**
 * Kavach — IaC Security: Resource & Manifest Inventory (/code/iac/inventory)
 * Screen 03: Discovers and organizes supported infrastructure files, resources,
 * modules, Kubernetes manifests, Helm charts, and CloudFormation templates.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  FolderGit2,
  FileCode2,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface InventoryItem {
  id: string;
  resource_identifier: string;
  resource_type: string;
  technology: string;
  cloud_provider: string;
  repository: string;
  file_path: string;
  line_start: number;
  line_end: number;
  status: string;
  open_findings: number;
  highest_severity: string;
  last_scanned: string;
  parsing_status: string;
}

function IaCInventoryContent() {
  const searchParams = useSearchParams();
  const initialRepo = searchParams?.get('repository') || 'All';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [repoFilter, setRepoFilter] = useState(initialRepo);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (techFilter !== 'All') params.set('technology', techFilter);
      if (providerFilter !== 'All') params.set('provider', providerFilter);
      if (repoFilter !== 'All') params.set('repository', repoFilter);
      params.set('page', page.toString());
      params.set('page_size', '12');

      const res = await api.get(`/api/v1/iac/inventory-suite?${params.toString()}`);
      if (res && res.items) {
        setItems(res.items);
        setStats(res.stats);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch IaC inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [search, techFilter, providerFilter, repoFilter, page]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '4px',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              IaC Security
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>/</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Manifests</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            IaC Resource Inventory
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Parsed infrastructure definitions across Terraform modules, Kubernetes YAML, Helm values, and CloudFormation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchInventory()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Total Resources Parsed</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
              {stats.total_resources}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 500 }}>Resources with Violations</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
              {stats.resources_with_violations}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>Hardened &amp; Secure</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
              {stats.secure_resources}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Frameworks Active</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', marginTop: '6px' }}>
              TF ({stats.by_technology?.terraform || 0}) • K8s ({stats.by_technology?.kubernetes || 0}) • Helm ({stats.by_technology?.helm || 0})
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by resource identifier or type..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#0F172A',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={techFilter}
          onChange={(e) => {
            setTechFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            color: '#334155',
            outline: 'none',
          }}
        >
          <option value="All">All Technologies</option>
          <option value="Terraform">Terraform</option>
          <option value="Kubernetes YAML">Kubernetes YAML</option>
          <option value="Helm">Helm</option>
          <option value="CloudFormation">CloudFormation</option>
        </select>

        <select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            color: '#334155',
            outline: 'none',
          }}
        >
          <option value="All">All Providers</option>
          <option value="AWS">AWS</option>
          <option value="Kubernetes">Kubernetes</option>
          <option value="Azure">Azure</option>
          <option value="GCP">GCP</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Resource Identifier</th>
                <th style={{ padding: '12px 16px' }}>Resource Type</th>
                <th style={{ padding: '12px 16px' }}>Technology</th>
                <th style={{ padding: '12px 16px' }}>Provider</th>
                <th style={{ padding: '12px 16px' }}>File &amp; Lines</th>
                <th style={{ padding: '12px 16px' }}>Security Status</th>
                <th style={{ padding: '12px 16px' }}>Findings</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
                    Loading inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    <Boxes size={32} style={{ margin: '0 auto 12px auto', color: '#94A3B8' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>No infrastructure resources match query</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                      Try adjusting your technology or provider filters.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace', fontSize: '12.5px' }}>
                        {item.resource_identifier}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <FolderGit2 size={11} /> {item.repository}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          fontFamily: 'monospace',
                        }}
                      >
                        {item.resource_type}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 500, color: '#0F172A' }}>{item.technology}</span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.cloud_provider === 'AWS' ? '#FFF7ED' : '#EFF6FF',
                          color: item.cloud_provider === 'AWS' ? '#EA580C' : '#2563EB',
                          border: `1px solid ${item.cloud_provider === 'AWS' ? '#FFEDD5' : '#DBEAFE'}`,
                        }}
                      >
                        {item.cloud_provider}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12px', color: '#2563EB', fontFamily: 'monospace' }}>
                        {item.file_path}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Lines {item.line_start}–{item.line_end}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: item.open_findings > 0 ? '#FEF2F2' : '#F0FDF4',
                          color: item.open_findings > 0 ? '#DC2626' : '#16A34A',
                          border: `1px solid ${item.open_findings > 0 ? '#FECACA' : '#DCFCE7'}`,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {item.open_findings > 0 ? (
                        <span style={{ fontWeight: 700, color: '#DC2626' }}>
                          {item.open_findings} ({item.highest_severity})
                        </span>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#16A34A' }}>0</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/code/iac/findings?search=${encodeURIComponent(item.resource_identifier)}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                        }}
                      >
                        Findings
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              fontSize: '12px',
              color: '#64748B',
            }}
          >
            <span>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IaCInventoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading inventory...</div>}>
      <IaCInventoryContent />
    </Suspense>
  );
}
