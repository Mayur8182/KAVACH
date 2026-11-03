'use client';

/**
 * Thing Data — DSPM Workspace (/data)
 * Route: /data
 * Real-time Data Security Posture Management connecting to GET /api/v1/data/* endpoints.
 * No hardcoded data. All store counts, inventory records, and flows come from the real database.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Database,
  HardDrive,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Server,
  Cloud,
  CheckCircle,
  FileText,
  Zap,
  AlertTriangle,
  Plus,
  Trash2,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

type DataTab = 'stores' | 'inventory' | 'flows' | 'policies';

// ── Sensitivity badge ──────────────────────────────────────────────────
function SensitivityBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Critical' },
    HIGH:     { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'High' },
    MEDIUM:   { bg: 'rgba(234,179,8,0.12)', color: '#eab308', label: 'Medium' },
    LOW:      { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Low' },
    UNKNOWN:  { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'Unknown' },
  };
  const c = cfg[level] || cfg.UNKNOWN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  );
}

// ── Compliance badge ───────────────────────────────────────────────────
function ComplianceBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    COMPLIANT:     { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    NON_COMPLIANT: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    AUDIT_REQUIRED:{ bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
    UNKNOWN:       { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  };
  const c = cfg[status] || cfg.UNKNOWN;
  const label = status.replace(/_/g, ' ');
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {label}
    </span>
  );
}

// ── Policy result badge ────────────────────────────────────────────────
function PolicyResultBadge({ result }: { result: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ALLOW: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    BLOCK: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    MASK:  { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
    ALERT: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  };
  const c = cfg[result] || { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {result}
    </span>
  );
}

// ── Scan status badge ──────────────────────────────────────────────────
function ScanStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    COMPLETED:      { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    RUNNING:        { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    QUEUED:         { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
    PENDING:        { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
    FAILED:         { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    NOT_CONFIGURED: { bg: 'rgba(148,163,184,0.08)', color: '#64748b' },
  };
  const c = cfg[status] || cfg.PENDING;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.color,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Metric card ────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, icon }: {
  label: string; value: React.ReactNode; sub?: string; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-surface-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: accent || 'var(--color-text-muted)', opacity: 0.7 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--color-text-primary)' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  );
}

export default function DataWorkspacePage() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<DataTab>('stores');
  const [searchQuery, setSearchQuery] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state — fetched from real API
  const [overview, setOverview] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [flows, setFlows] = useState<any[]>([]);
  const [flowsTotal, setFlowsTotal] = useState(0);
  const [policies, setPolicies] = useState<any[]>([]);

  // UI state
  const [scanningStoreId, setScanningStoreId] = useState<string | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const projectId = currentProject?.id || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, storesRes] = await Promise.all([
        api.data.overview(projectId),
        api.data.stores({ projectId, limit: 50 }),
      ]);
      setOverview(overviewRes);
      setStores(storesRes?.items || []);
      setStoresTotal(storesRes?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to DSPM service');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadInventory = useCallback(async () => {
    try {
      const res = await api.data.inventory({ projectId, limit: 50 });
      setInventory(res?.items || []);
      setInventoryTotal(res?.total || 0);
    } catch (_err) {/* handled by page-level error */}
  }, [projectId]);

  const loadFlows = useCallback(async () => {
    try {
      const res = await api.data.flows({ projectId, limit: 50 });
      setFlows(res?.items || []);
      setFlowsTotal(res?.total || 0);
    } catch (_err) {/* handled by page-level error */}
  }, [projectId]);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api.data.policies(projectId);
      setPolicies(res?.items || []);
    } catch (_err) {/* handled by page-level error */}
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (activeTab === 'inventory') loadInventory();
    if (activeTab === 'flows') loadFlows();
    if (activeTab === 'policies') loadPolicies();
  }, [activeTab, loadInventory, loadFlows, loadPolicies]);

  // Real search filtering using live API
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    try {
      const res = await api.data.stores({
        projectId,
        search: query || undefined,
        sensitivity: sensitivityFilter || undefined,
        complianceStatus: complianceFilter || undefined,
        limit: 50,
      });
      setStores(res?.items || []);
      setStoresTotal(res?.total || 0);
    } catch (_err) { /* search error is non-critical */ }
  }, [projectId, sensitivityFilter, complianceFilter]);

  // Real filter using live API
  const handleFilter = useCallback(async (sensitivity: string, compliance: string) => {
    setSensitivityFilter(sensitivity);
    setComplianceFilter(compliance);
    try {
      const res = await api.data.stores({
        projectId,
        search: searchQuery || undefined,
        sensitivity: sensitivity || undefined,
        complianceStatus: compliance || undefined,
        limit: 50,
      });
      setStores(res?.items || []);
      setStoresTotal(res?.total || 0);
    } catch (_err) { /* filter error is non-critical */ }
  }, [projectId, searchQuery]);

  // Trigger real scan job
  const handleScan = useCallback(async (store: any) => {
    setScanningStoreId(store.id);
    setActionMessage(null);
    try {
      const job = await api.data.triggerScan({
        data_store_id: store.id,
        scanner_type: 'DSPM',
        project_id: projectId || undefined,
      });
      setActionMessage({ type: 'success', text: `Scan job queued for ${store.name} (Job ID: ${job.id?.slice(0, 8)}…)` });
      // Reload stores to show updated scan_status
      const storesRes = await api.data.stores({ projectId, limit: 50 });
      setStores(storesRes?.items || []);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to queue scan' });
    } finally {
      setScanningStoreId(null);
    }
  }, [projectId]);

  // Delete a data store
  const handleDeleteStore = useCallback(async (storeId: string, storeName: string) => {
    if (!window.confirm(`Remove "${storeName}" from DSPM monitoring?`)) return;
    setDeletingStoreId(storeId);
    try {
      await api.data.deleteStore(storeId);
      setActionMessage({ type: 'success', text: `${storeName} removed from monitoring` });
      setStores(prev => prev.filter(s => s.id !== storeId));
      setStoresTotal(prev => prev - 1);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to remove store' });
    } finally {
      setDeletingStoreId(null);
    }
  }, []);

  const metrics = overview?.metrics;

  const tabs: { id: DataTab; label: string }[] = [
    { id: 'stores', label: 'Data Inventory' },
    { id: 'inventory', label: 'Sensitive Data' },
    { id: 'flows', label: 'Data Flows' },
    { id: 'policies', label: 'Policies' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* ── Breadcrumb ── */}
      <div style={{
        padding: '10px 24px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
        color: 'var(--color-text-secondary)',
      }}>
        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={12} />
        <span>Products</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--color-text-primary)' }}>Data</span>
      </div>

      {/* ── Hero ── */}
      <div style={{
        padding: '24px 24px 20px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            DATA SECURITY &amp; PRIVACY
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.25 }}>
            Discover, classify and<br />protect your sensitive data
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8, maxWidth: 420 }}>
            Automatically discover sensitive data across your environments, classify it and enforce data security policies to prevent leaks and unauthorized access.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 500,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 600,
              background: 'var(--color-accent)', border: 'none',
              borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer',
            }}
            onClick={() => {
              const name = window.prompt('Data store name (e.g. s3://my-bucket, rds://db.internal):');
              const type = window.prompt('Store type (AWS_S3, RDS_POSTGRESQL, SNOWFLAKE, REDIS, MONGODB):');
              if (name && type) {
                api.data.createStore({ name, store_type: type, project_id: projectId || undefined }).then(() => {
                  setActionMessage({ type: 'success', text: `${name} added to monitoring` });
                  load();
                }).catch((e) => setActionMessage({ type: 'error', text: e?.message || 'Failed to add store' }));
              }
            }}
          >
            <Plus size={12} />
            Add Data Store
          </button>
        </div>
      </div>

      {/* ── Action Message ── */}
      {actionMessage && (
        <div style={{
          margin: '12px 24px 0',
          padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 12,
          background: actionMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: actionMessage.type === 'success' ? '#22c55e' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {actionMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {actionMessage.text}
          <button onClick={() => setActionMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && !loading && (
        <div style={{
          margin: '16px 24px 0', padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={load} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Overview Metrics ── */}
      {!loading && metrics && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
          padding: '16px 24px 0',
        }}>
          <MetricCard label="Total Data Stores" value={metrics.total_stores} icon={<Database size={14} />} accent="var(--color-accent)" />
          <MetricCard label="Compliant" value={metrics.compliant_stores} icon={<ShieldCheck size={14} />} accent="#22c55e" />
          <MetricCard label="Non-Compliant" value={metrics.non_compliant_stores} icon={<ShieldAlert size={14} />} accent="#ef4444" />
          <MetricCard label="Critical Stores" value={metrics.critical_stores} icon={<AlertTriangle size={14} />} accent="#f97316" />
          <MetricCard label="Sensitive Records" value={metrics.total_sensitive_records?.toLocaleString() || '0'} icon={<Lock size={14} />} accent="#a855f7" />
          <MetricCard label="Active Policies" value={metrics.active_policies} icon={<FileText size={14} />} />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        padding: '16px 24px 0',
        display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)',
        marginTop: 16,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '16px 24px', flex: 1 }}>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 44, background: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        )}

        {/* ── Stores Tab ── */}
        {!loading && activeTab === 'stores' && (
          <>
            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  placeholder="Search data stores, databases, files..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', fontSize: 12,
                    background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <select
                value={sensitivityFilter}
                onChange={e => handleFilter(e.target.value, complianceFilter)}
                style={{
                  padding: '7px 10px', fontSize: 12, background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)', cursor: 'pointer',
                }}
              >
                <option value="">All Sensitivity</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={complianceFilter}
                onChange={e => handleFilter(sensitivityFilter, e.target.value)}
                style={{
                  padding: '7px 10px', fontSize: 12, background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)', cursor: 'pointer',
                }}
              >
                <option value="">All Compliance</option>
                <option value="COMPLIANT">Compliant</option>
                <option value="NON_COMPLIANT">Non-Compliant</option>
                <option value="AUDIT_REQUIRED">Audit Required</option>
              </select>
            </div>

            {/* Stores Table */}
            {stores.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Database size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No data stores connected</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Add a data store to start DSPM scanning</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Name', 'Type', 'Location', 'Sensitivity', 'Records', 'Compliance', 'Scan Status', 'Last Scanned', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                          color: 'var(--color-text-secondary)', fontSize: 11,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map(store => (
                      <tr key={store.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {store.store_type?.includes('S3') ? <Cloud size={13} style={{ color: '#f97316' }} /> :
                             store.store_type?.includes('RDS') || store.store_type?.includes('SNOWFLAKE') ? <Database size={13} style={{ color: '#3b82f6' }} /> :
                             <Server size={13} style={{ color: '#a855f7' }} />}
                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {store.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{store.store_type}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {store.location || store.region || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}><SensitivityBadge level={store.sensitivity} /></td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                          {store.record_count != null ? store.record_count.toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}><ComplianceBadge status={store.compliance_status} /></td>
                        <td style={{ padding: '10px 12px' }}><ScanStatusBadge status={store.scan_status} /></td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                          {store.last_scanned ? new Date(store.last_scanned).toLocaleDateString() : 'Never'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleScan(store)}
                              disabled={scanningStoreId === store.id || store.scan_status === 'RUNNING'}
                              title="Run DSPM scan"
                              style={{
                                padding: '4px 8px', fontSize: 11, fontWeight: 500,
                                background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: 4, color: '#3b82f6', cursor: scanningStoreId === store.id ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              {scanningStoreId === store.id ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                              Scan
                            </button>
                            <button
                              onClick={() => handleDeleteStore(store.id, store.name)}
                              disabled={deletingStoreId === store.id}
                              title="Remove from monitoring"
                              style={{
                                padding: '4px 8px', fontSize: 11,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 4, color: '#ef4444', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Showing {stores.length} of {storesTotal} data stores
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Sensitive Data Tab ── */}
        {!loading && activeTab === 'inventory' && (
          <>
            {inventory.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Lock size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No sensitive data records found</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Run a DSPM scan to discover sensitive data in your stores</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Field', 'Table / Path', 'Data Type', 'Subtype', 'Records', 'Confidence', 'Encrypted', 'Risk Score', 'Detected'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.field_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 11 }}>{item.table_name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}><SensitivityBadge level={item.data_type === 'PII' ? 'HIGH' : item.data_type === 'CREDENTIAL' ? 'CRITICAL' : 'MEDIUM'} /></td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{item.data_subtype || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{item.sample_count?.toLocaleString() || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{Math.round((item.confidence || 0) * 100)}%</td>
                        <td style={{ padding: '10px 12px' }}>
                          {item.is_encrypted ? <CheckCircle size={14} color="#22c55e" /> : <ShieldAlert size={14} color="#ef4444" />}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: item.risk_score >= 0.7 ? '#ef4444' : item.risk_score >= 0.4 ? '#eab308' : '#22c55e' }}>
                            {Math.round((item.risk_score || 0) * 100)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 11 }}>
                          {item.detected_at ? new Date(item.detected_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {inventoryTotal} sensitive data records
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Flows Tab ── */}
        {!loading && activeTab === 'flows' && (
          <>
            {flows.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Zap size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No data flows observed</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Data flows are detected from network telemetry and agent traces</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Source', 'Destination', 'Classification', 'Protocol', 'Policy Result', 'Encrypted', 'Observed'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flows.map(flow => (
                      <tr key={flow.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{flow.source_service}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{flow.destination_service}</td>
                        <td style={{ padding: '10px 12px' }}><SensitivityBadge level={flow.data_classification === 'PII' ? 'HIGH' : flow.data_classification === 'CREDENTIAL' ? 'CRITICAL' : 'MEDIUM'} /></td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{flow.protocol}</td>
                        <td style={{ padding: '10px 12px' }}><PolicyResultBadge result={flow.policy_result} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          {flow.is_encrypted ? <CheckCircle size={14} color="#22c55e" /> : <ShieldAlert size={14} color="#ef4444" />}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 11 }}>
                          {flow.observed_at ? new Date(flow.observed_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {flowsTotal} data flows observed
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Policies Tab ── */}
        {!loading && activeTab === 'policies' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={() => {
                  const name = window.prompt('Policy name:');
                  const types = window.prompt('Data types (PII,CREDENTIAL,FINANCIAL):');
                  const action = window.prompt('Action (ALERT, BLOCK, MASK, QUARANTINE):');
                  if (name) {
                    api.data.createPolicy({
                      name,
                      data_types: types ? types.split(',').map(t => t.trim()) : [],
                      action: action || 'ALERT',
                      project_id: projectId || undefined,
                    }).then(() => {
                      setActionMessage({ type: 'success', text: `Policy "${name}" created` });
                      loadPolicies();
                    }).catch(e => setActionMessage({ type: 'error', text: e?.message || 'Failed to create policy' }));
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', fontSize: 12, fontWeight: 600,
                  background: 'var(--color-accent)', border: 'none',
                  borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer',
                }}
              >
                <Plus size={12} /> New Policy
              </button>
            </div>
            {policies.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No classification policies defined</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Create DLP policies to control how sensitive data is handled</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {policies.map(policy => (
                  <div key={policy.id} style={{
                    padding: '14px 16px', background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{policy.name}</div>
                      {policy.description && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{policy.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {(policy.data_types || []).map((t: string) => (
                          <span key={t} style={{ padding: '1px 6px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', borderRadius: 3, fontSize: 10 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <PolicyResultBadge result={policy.action} />
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                        background: policy.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                        color: policy.enabled ? '#22c55e' : '#94a3b8',
                      }}>
                        {policy.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
