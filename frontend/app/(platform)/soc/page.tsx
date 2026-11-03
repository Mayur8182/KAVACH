'use client';

/**
 * Thing SOC — Security Operations Center & Incident Triage Workspace
 * Route: /soc
 * Real data loaded from:
 *   GET /api/v1/projects/{id}/soc/overview
 *   GET /api/v1/projects/{id}/soc/alerts
 *   GET /api/v1/projects/{id}/soc/cases
 *   GET /api/v1/projects/{id}/soc/events
 *   GET /api/v1/soc/detections/rules
 * Actions routed to real backend mutation endpoints with audit trails.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Radio,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Zap,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

// ── Severity Badge ──────────────────────────────────────────────────────────
function SevBadge({ sev }: { sev: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    HIGH:     { bg: 'rgba(234,88,12,0.1)', color: '#ea580c' },
    MEDIUM:   { bg: 'rgba(217,119,6,0.1)', color: '#d97706' },
    LOW:      { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
  };
  const c = cfg[sev] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color,
    }}>
      {sev}
    </span>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ESCALATED:  { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    IN_TRIAGE:  { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    CONTAINED:  { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' },
    RESOLVED:   { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
    CLOSED:     { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
    FALSE_POSITIVE: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
    INVESTIGATING: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    MITIGATING: { bg: 'rgba(234,88,12,0.1)', color: '#ea580c' },
    OPEN:       { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    CRITICAL:   { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    HIGH:       { bg: 'rgba(234,88,12,0.1)', color: '#ea580c' },
  };
  const c = cfg[status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#0F172A', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function LoadingRow() {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ width: 200, height: 14, borderRadius: 4, background: '#E2E8F0' }} />
      <div style={{ width: 60, height: 14, borderRadius: 4, background: '#E2E8F0' }} />
      <div style={{ width: 80, height: 14, borderRadius: 4, background: '#E2E8F0' }} />
    </div>
  );
}

export default function SocWorkspacePage() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const [activeTab, setActiveTab] = useState<'alerts' | 'cases' | 'events' | 'rules'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [overview, setOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, al, ca, ev] = await Promise.allSettled([
        api.soc.overview(projectId),
        api.soc.listAlerts(projectId, { limit: 100 }),
        api.soc.listCases(projectId, { limit: 50 }),
        api.soc.listEvents(projectId, { limit: 50 }),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (al.status === 'fulfilled') setAlerts(Array.isArray(al.value) ? al.value : []);
      if (ca.status === 'fulfilled') setCases(Array.isArray(ca.value) ? ca.value : []);
      if (ev.status === 'fulfilled') setEvents(Array.isArray(ev.value) ? ev.value : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load SOC workspace');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadRules = useCallback(async () => {
    try {
      const r = await api.soc.listDetectionRules();
      setRules(Array.isArray(r) ? r : []);
    } catch {
      setRules([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'rules') loadRules();
  }, [activeTab, loadRules]);

  const handleAction = async (action: () => Promise<any>, successMsg: string, alertId?: string) => {
    const key = alertId || action.toString();
    setActionLoading(key);
    setActionMessage(null);
    try {
      await action();
      setActionMessage({ type: 'success', text: successMsg });
      await load();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e?.message || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchSearch = !searchQuery ||
        (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.source || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.alert_key || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSev = severityFilter === 'ALL' || a.severity === severityFilter;
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchSearch && matchSev && matchStatus;
    });
  }, [alerts, searchQuery, severityFilter, statusFilter]);

  const metrics = overview || {};
  const mttd = metrics.mttd_minutes != null ? `${metrics.mttd_minutes} min` : '—';
  const mtta = metrics.mtta_minutes != null ? `${metrics.mtta_minutes} min` : '—';
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const activeCount = alerts.filter(a => ['IN_TRIAGE', 'ESCALATED'].includes(a.status)).length;

  if (!projectId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 48, color: '#64748B' }}>
        <ShieldAlert size={40} color="#CBD5E1" />
        <div style={{ marginTop: 16, fontWeight: 600, fontSize: 16 }}>No project selected</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Select a project to open the SOC workspace.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 18px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 12,
                backgroundColor: '#F0FDFA', border: '1px solid #99F6E4',
                color: '#0D9488', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <Activity size={12} />
                Thing SOC Workspace
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>• Production Triage Queue</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Security Operations Center & Automated Incident Triage
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
              Real-time telemetry event normalization, automated deduplication, active incident investigations, and verifiable remediation.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 6,
                border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
                color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>
            <Link
              href="/onboarding?product=soc"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 6,
                border: 'none', backgroundColor: '#0D9488',
                color: '#FFFFFF', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textDecoration: 'none',
              }}
            >
              <Zap size={14} />
              <span>Configure SOC Sources</span>
            </Link>
          </div>
        </div>

        {/* Operational Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20 }}>
          <MetricCard label="Mean Time to Detect (MTTD)" value={mttd} sub="Calculated from real event timestamps" />
          <MetricCard label="Mean Time to Acknowledge" value={mtta} sub="From backend SOC telemetry" />
          <MetricCard label="Active Triage Alerts" value={`${activeCount} Alerts`} sub={`${criticalCount} Critical`} accent={activeCount > 0 ? '#dc2626' : '#0F172A'} />
          <MetricCard label="Open Investigation Cases" value={cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length} sub="From real case records" accent="#0D9488" />
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div style={{
            marginTop: 14, padding: '10px 16px', borderRadius: 6,
            backgroundColor: actionMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${actionMessage.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: actionMessage.type === 'success' ? '#16A34A' : '#DC2626',
            fontSize: 13, fontWeight: 500,
          }}>
            {actionMessage.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, marginTop: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 2 }}>
          {[
            { id: 'alerts', label: `Triage Queue (${filteredAlerts.length})` },
            { id: 'cases', label: `Investigation Cases (${cases.length})` },
            { id: 'events', label: `Raw Telemetry (${events.length})` },
            { id: 'rules', label: 'Detection Rules' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none', border: 'none', padding: '6px 2px 10px',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#0F172A' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #0F172A' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{ margin: '20px 32px', padding: '14px 18px', borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
          <strong>Failed to load SOC workspace:</strong> {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flexGrow: 1, padding: '24px 32px', overflow: 'auto' }}>

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexGrow: 1, maxWidth: 360 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  placeholder="Search alerts…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px',
                    border: '1px solid #E2E8F0', borderRadius: 6,
                    fontSize: 13, color: '#0F172A', outline: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_TRIAGE">In Triage</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CONTAINED">Contained</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Alert table */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 90px 90px auto', gap: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Alert</span>
                <span>Severity</span>
                <span>Source</span>
                <span>Status</span>
                <span>Events</span>
                <span>Actions</span>
              </div>

              {loading && [1, 2, 3, 4].map(i => <LoadingRow key={i} />)}

              {!loading && filteredAlerts.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <ShieldAlert size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  No alerts match your current filters.
                </div>
              )}

              {!loading && filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 100px 90px 90px auto',
                    gap: 0, padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{alert.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {alert.alert_key} · First seen: {alert.first_seen_at ? new Date(alert.first_seen_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  <SevBadge sev={alert.severity} />
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{alert.source || '—'}</div>
                  <StatusBadge status={alert.status} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{alert.event_count ?? 0}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {alert.status !== 'RESOLVED' && alert.status !== 'CLOSED' && (
                      <>
                        <button
                          disabled={actionLoading === alert.id}
                          onClick={() => handleAction(() => api.soc.closeAlert(alert.id, 'RESOLVED'), `Alert ${alert.alert_key} resolved.`, alert.id)}
                          title="Mark Resolved"
                          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4', color: '#16A34A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          <CheckCircle size={12} />
                        </button>
                        <button
                          disabled={actionLoading === alert.id}
                          onClick={() => handleAction(() => api.soc.escalateAlert(alert.id), `Alert ${alert.alert_key} escalated to case.`, alert.id)}
                          title="Escalate to Case"
                          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          <AlertTriangle size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CASES TAB */}
        {activeTab === 'cases' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={async () => {
                  const title = window.prompt('Case title:');
                  const description = window.prompt('Case description:');
                  if (title && description && projectId) {
                    await handleAction(
                      () => api.soc.createCase(projectId, { title, description, priority: 'HIGH' }),
                      'Investigation case created successfully.'
                    );
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 6,
                  border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
                  color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                New Case
              </button>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 150px auto', gap: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Case</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Created</span>
                <span>Owner</span>
              </div>

              {loading && [1, 2, 3].map(i => <LoadingRow key={i} />)}

              {!loading && cases.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  No investigation cases found for this project.
                </div>
              )}

              {!loading && cases.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 90px 150px auto',
                    gap: 0, padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{c.case_key}</div>
                  </div>
                  <StatusBadge status={c.priority || '—'} />
                  <StatusBadge status={c.status || '—'} />
                  <div style={{ fontSize: 11, color: '#64748B' }}>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{c.owner_id ? c.owner_id.slice(0, 8) + '…' : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 150px', gap: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Event</span>
                <span>Type</span>
                <span>Source</span>
                <span>Severity</span>
                <span>Timestamp</span>
              </div>

              {loading && [1, 2, 3, 4, 5].map(i => <LoadingRow key={i} />)}

              {!loading && events.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <Database size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  No telemetry events ingested yet. Configure event sources to begin ingestion.
                </div>
              )}

              {!loading && events.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 150px',
                    gap: 0, padding: '12px 20px', borderBottom: '1px solid #F1F5F9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{ev.action || ev.event_type}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      Actor: {ev.actor || '—'} · Resource: {ev.resource || '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{ev.event_type}</div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{ev.source_type}</div>
                  <SevBadge sev={ev.severity || 'LOW'} />
                  <div style={{ fontSize: 11, color: '#64748B' }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DETECTION RULES TAB */}
        {activeTab === 'rules' && (
          <div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Rule</span>
                <span>Severity</span>
                <span>Confidence</span>
                <span>Scope</span>
              </div>

              {loading && [1, 2, 3].map(i => <LoadingRow key={i} />)}

              {!loading && rules.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <Terminal size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  No detection rules configured. Rules are automatically created from policy evaluations and ingested patterns.
                </div>
              )}

              {!loading && rules.map((rule: any) => (
                <div
                  key={rule.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
                    gap: 0, padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{rule.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {rule.rule_key} · Events: {(rule.event_types || []).join(', ')}
                    </div>
                  </div>
                  <SevBadge sev={rule.severity || 'LOW'} />
                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{rule.confidence || '—'}</span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{rule.scope || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
