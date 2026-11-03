'use client';

/**
 * Thing Attack — Attack Surface (/attack/surface)
 * Full inventory of reachable and attackable assets.
 * Real database values from GET /api/v1/attack/assets.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  AttackStatusBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import { ServerPagination } from '@/components/data-display/ServerPagination';
import type { AttackAssetItem, CreateAttackAssetRequest } from '@/types/api/attack';
import {
  RefreshCw,
  Search,
  Filter,
  Plus,
  Globe2,
  ExternalLink,
  ChevronRight,
  Server,
  Layers,
} from 'lucide-react';

export default function AttackSurfacePage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AttackAssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [envFilter, setEnvFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState<CreateAttackAssetRequest>({
    name: '',
    asset_type: 'API',
    environment: 'production',
    exposure: 'INTERNET',
    technology: '',
    target_url: '',
    ownership: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.assets({
        page,
        pageSize,
        search: search || undefined,
        assetType: typeFilter !== 'ALL' ? typeFilter : undefined,
        environment: envFilter !== 'ALL' ? envFilter : undefined,
        risk: riskFilter !== 'ALL' ? riskFilter : undefined,
      });
      setAssets(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load attack surface assets');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, envFilter, riskFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    setSubmitting(true);
    try {
      await api.attack.createAsset(newAsset);
      setShowAddModal(false);
      setNewAsset({
        name: '',
        asset_type: 'API',
        environment: 'production',
        exposure: 'INTERNET',
        technology: '',
        target_url: '',
        ownership: '',
      });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to create asset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AttackWorkshell
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} />
            Add Attack Asset
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 500,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, maxWidth: '400px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                width: '100%',
              }}
            >
              <Search size={13} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search domain, host, technology, IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Types</option>
              <option value="API">API</option>
              <option value="WEB_APP">Web Application</option>
              <option value="GRAPHQL">GraphQL</option>
              <option value="DOMAIN">Domain / Subdomain</option>
              <option value="K8S_SERVICE">Kubernetes</option>
              <option value="CLOUD_ASSET">Cloud Asset</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Risks</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Assets Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Attack Surface Asset Inventory ({total})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Provenance-verified targets
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              Enumerating attack surface...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ padding: '60px 24px' }}>
              <EmptyAttackState
                title="No Assets Found"
                description="No reachable assets matched the specified filters. Try adjusting your query or register a new target."
                actionLabel="Add Target Asset"
                onAction={() => setShowAddModal(true)}
              />
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Asset</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Environment</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Exposure</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Technology</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Last Seen</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Risk</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => router.push(`/attack/surface/${a.id}`)}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          <div>{a.name}</div>
                          {a.target_url && (
                            <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                              {a.target_url}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--color-surface-elevated)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {a.asset_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: a.environment === 'production' ? '#f87171' : 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          {a.environment}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: a.exposure === 'INTERNET' ? '#ef4444' : '#10b981',
                            }}
                          >
                            {a.exposure}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                          {a.technology || '–'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                          {a.last_seen || '–'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <SeverityBadge severity={a.risk_level} size="sm" />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <AttackStatusBadge status={a.status} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <ChevronRight size={14} color="var(--color-text-muted)" />
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
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </div>

        {/* Add Asset Modal */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                width: '480px',
                maxWidth: '90vw',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Register Attack Surface Asset
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Asset Identifier / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. api.domain.com or auth-gateway"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Asset Type
                    </label>
                    <select
                      value={newAsset.asset_type}
                      onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="API">API</option>
                      <option value="WEB_APP">Web Application</option>
                      <option value="GRAPHQL">GraphQL</option>
                      <option value="DOMAIN">Domain</option>
                      <option value="SERVICE">Service</option>
                      <option value="CONTAINER">Container</option>
                      <option value="K8S_SERVICE">Kubernetes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Environment
                    </label>
                    <select
                      value={newAsset.environment}
                      onChange={(e) => setNewAsset({ ...newAsset, environment: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Target URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newAsset.target_url || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, target_url: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Technology Stack
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FastAPI / NGINX"
                      value={newAsset.technology || ''}
                      onChange={(e) => setNewAsset({ ...newAsset, technology: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Ownership
                    </label>
                    <input
                      type="text"
                      placeholder="Team / Dept"
                      value={newAsset.ownership || ''}
                      onChange={(e) => setNewAsset({ ...newAsset, ownership: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '7px 14px',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '7px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    {submitting ? 'Registering...' : 'Register Target'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
