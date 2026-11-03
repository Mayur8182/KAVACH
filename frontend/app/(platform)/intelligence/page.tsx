'use client';

/**
 * Thing Threat Intelligence — Real-time Threat Feed Workspace
 * Route: /intelligence
 * Data sourced from real backend endpoints:
 *   GET /api/v1/intelligence/overview
 *   GET /api/v1/intelligence/sources
 *   GET /api/v1/intelligence/indicators
 *   GET /api/v1/intelligence/threat-actors
 *   GET /api/v1/intelligence/malware
 *   GET /api/v1/projects/{id}/intelligence/matches
 * No hardcoded data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Radio,
  Shield,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Globe,
  Zap,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

// ── Confidence badge ────────────────────────────────────────────────────────
function ConfBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    HIGH:    { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' },
    MEDIUM:  { bg: 'rgba(217,119,6,0.1)', color: '#d97706' },
    LOW:     { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
  };
  const c = cfg[level] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color,
    }}>
      {level}
    </span>
  );
}

// ── Indicator type badge ────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const label = (type || '').replace(/_/g, ' ');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: 'rgba(99,102,241,0.1)', color: '#6366f1',
    }}>
      {label}
    </span>
  );
}

// ── Source status badge ─────────────────────────────────────────────────────
function SourceStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    ACTIVE:     { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' },
    INACTIVE:   { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
    ERROR:      { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    SYNCING:    { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    PENDING:    { bg: 'rgba(217,119,6,0.1)', color: '#d97706' },
  };
  const c = cfg[status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {status}
    </span>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function LoadingRow() {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
      {[200, 80, 100, 80].map((w, i) => (
        <div key={i} style={{ width: w, height: 13, borderRadius: 4, background: '#E2E8F0' }} />
      ))}
    </div>
  );
}

// ── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent?: string }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && (
        <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: accent ? `${accent}15` : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: accent || '#0F172A', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

type IntelTab = 'feeds' | 'indicators' | 'actors' | 'malware' | 'techniques' | 'matches';

export default function IntelligencePage() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const [activeTab, setActiveTab] = useState<IntelTab>('feeds');
  const [overview, setOverview] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [malware, setMalware] = useState<any[]>([]);
  const [techniques, setTechniques] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadOverview = useCallback(async () => {
    try {
      const [ov, src] = await Promise.allSettled([
        api.threatIntel.overview(),
        api.threatIntel.listSources(),
      ]);
      if (ov.status === 'fulfilled') {
        setOverview(ov.value);
      } else {
        console.error('[ThreatIntel] Failed to load overview metrics:', ov.reason);
      }
      if (src.status === 'fulfilled') {
        setSources(Array.isArray(src.value) ? src.value : []);
      } else {
        console.error('[ThreatIntel] Failed to load threat sources:', src.reason);
      }
    } catch (err: any) {
      console.error('[ThreatIntel] Unexpected error loading intelligence overview:', err);
      setError(err?.message || 'Failed to initialize Threat Intelligence overview.');
    }
  }, []);

  const loadTab = useCallback(async (tab: IntelTab) => {
    setTabLoading(true);
    setError(null);
    try {
      if (tab === 'feeds') {
        const src = await api.threatIntel.listSources();
        setSources(Array.isArray(src) ? src : []);
      } else if (tab === 'indicators') {
        const ind = await api.threatIntel.listIndicators({ limit: 100 });
        setIndicators(Array.isArray(ind) ? ind : []);
      } else if (tab === 'actors') {
        const act = await api.threatIntel.listThreatActors();
        setActors(Array.isArray(act) ? act : []);
      } else if (tab === 'malware') {
        const mal = await api.threatIntel.listMalware();
        setMalware(Array.isArray(mal) ? mal : []);
      } else if (tab === 'techniques') {
        const tech = await api.threatIntel.listTechniques();
        setTechniques(Array.isArray(tech) ? tech : []);
      } else if (tab === 'matches' && projectId) {
        const m = await api.threatIntel.listMatches(projectId, { limit: 50 });
        setMatches(Array.isArray(m) ? m : []);
      }
    } catch (e: any) {
      setError(e?.message || `Failed to load ${tab}`);
    } finally {
      setTabLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadOverview();
      await loadTab('feeds');
      setLoading(false);
    };
    init();
  }, [loadOverview, loadTab]);

  useEffect(() => {
    if (!loading) loadTab(activeTab);
  }, [activeTab]); // eslint-disable-line

  const handleSyncSource = async (sourceId: string, sourceName: string) => {
    setActionLoading(sourceId);
    setActionMsg(null);
    try {
      const result = await api.threatIntel.syncSource(sourceId);
      setActionMsg({
        type: 'success',
        text: `Sync for "${sourceName}" completed: ${result.records_added ?? 0} added, ${result.records_updated ?? 0} updated, ${result.error_count ?? 0} errors.`,
      });
      await loadTab('feeds');
    } catch (e: any) {
      setActionMsg({ type: 'error', text: `Sync failed: ${e?.message || 'Unknown error'}` });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIndicators = indicators.filter(ind => {
    const matchSearch = !search || (ind.value || '').toLowerCase().includes(search.toLowerCase()) || (ind.title || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || ind.indicator_type === typeFilter;
    return matchSearch && matchType;
  });

  const stats = overview || {};
  const activeSources = sources.filter(s => s.status === 'ACTIVE').length;
  const highConfIndicators = indicators.filter(i => i.confidence === 'HIGH').length;

  const tabs: { id: IntelTab; label: string }[] = [
    { id: 'feeds', label: `Feed Sources (${sources.length})` },
    { id: 'indicators', label: `Threat Indicators (${indicators.length})` },
    { id: 'actors', label: `Threat Actors (${actors.length})` },
    { id: 'malware', label: `Malware Families (${malware.length})` },
    { id: 'techniques', label: `MITRE ATT&CK Matrix (${techniques.length})` },
    { id: 'matches', label: `Project Matches (${matches.length})` },
  ];

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
                backgroundColor: '#FFF7ED', border: '1px solid #FED7AA',
                color: '#EA580C', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <Radio size={12} />
                Threat Intelligence
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>• Real-time Threat Feeds & IoC Database</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Threat Intelligence Platform
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
              Real-time threat indicators, CVE correlation, adversarial TTPs, and threat actor profiles from registered intelligence feeds.
            </p>
          </div>
          <button
            onClick={() => { loadOverview(); loadTab(activeTab); }}
            disabled={loading || tabLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
              color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: (loading || tabLoading) ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Overview metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
          <MetricCard
            label="Active Feed Sources"
            value={loading ? '…' : activeSources}
            icon={<Database size={16} color="#2563eb" />}
            accent="#2563eb"
          />
          <MetricCard
            label="Active Indicators"
            value={loading ? '…' : (stats.active_indicators_count ?? indicators.length)}
            icon={<Activity size={16} color="#ea580c" />}
            accent="#ea580c"
          />
          <MetricCard
            label="High Confidence IoCs"
            value={loading ? '…' : highConfIndicators}
            icon={<Shield size={16} color="#dc2626" />}
            accent="#dc2626"
          />
          <MetricCard
            label="Project Matches"
            value={loading ? '…' : (stats.active_matches_count ?? matches.length)}
            icon={<AlertTriangle size={16} color="#d97706" />}
            accent="#d97706"
          />
        </div>

        {/* Action message */}
        {actionMsg && (
          <div style={{
            marginTop: 14, padding: '10px 16px', borderRadius: 6,
            backgroundColor: actionMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${actionMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: actionMsg.type === 'success' ? '#16A34A' : '#DC2626',
            fontSize: 13, fontWeight: 500,
          }}>
            {actionMsg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, marginTop: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 2 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', padding: '6px 2px 10px',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#0F172A' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #EA580C' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && !tabLoading && (
        <div style={{ margin: '20px 32px', padding: '14px 18px', borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <strong>Error loading {activeTab}:</strong> {error}
          </div>
          <button
            onClick={() => { setError(null); loadTab(activeTab); loadOverview(); }}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #DC2626',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flexGrow: 1, padding: '24px 32px', overflow: 'auto' }}>

        {/* FEEDS TAB */}
        {activeTab === 'feeds' && (
          <div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 150px auto', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Source Name</span>
                <span>Type</span>
                <span>Provider</span>
                <span>Status</span>
                <span>Last Sync</span>
                <span>Actions</span>
              </div>

              {(loading || tabLoading) && [1, 2, 3].map(i => <LoadingRow key={i} />)}

              {!loading && !tabLoading && sources.length === 0 && (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <Radio size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  <div style={{ fontWeight: 600 }}>No threat intelligence feeds configured</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Add STIX/TAXII, REST API, or advisory feeds to populate indicators. Status will show <strong>NOT CONNECTED</strong> for unconfigured sources.
                  </div>
                </div>
              )}

              {!loading && !tabLoading && sources.map(src => (
                <div
                  key={src.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 150px auto',
                    padding: '14px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{src.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace' }}>
                      {src.endpoint}
                    </div>
                  </div>
                  <TypeBadge type={src.source_type} />
                  <div style={{ fontSize: 12, color: '#475569' }}>{src.provider}</div>
                  <SourceStatusBadge status={src.status} />
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    {src.last_sync_at ? new Date(src.last_sync_at).toLocaleString() : 'Never'}
                  </div>
                  <button
                    disabled={actionLoading === src.id}
                    onClick={() => handleSyncSource(src.id, src.name)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 4,
                      border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF',
                      color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={11} style={{ animation: actionLoading === src.id ? 'spin 1s linear infinite' : 'none' }} />
                    {actionLoading === src.id ? 'Syncing…' : 'Sync Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INDICATORS TAB */}
        {activeTab === 'indicators' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexGrow: 1, maxWidth: 360 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  placeholder="Search indicators…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF' }}
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Types</option>
                <option value="IP_ADDRESS">IP Address</option>
                <option value="DOMAIN">Domain</option>
                <option value="URL">URL</option>
                <option value="FILE_HASH">File Hash</option>
                <option value="EMAIL">Email</option>
                <option value="CVE">CVE</option>
              </select>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 150px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Indicator Value</span>
                <span>Type</span>
                <span>Confidence</span>
                <span>Severity</span>
                <span>Last Seen</span>
              </div>

              {(loading || tabLoading) && [1, 2, 3, 4, 5].map(i => <LoadingRow key={i} />)}

              {!loading && !tabLoading && filteredIndicators.length === 0 && (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  <Eye size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                  <div style={{ fontWeight: 600 }}>No indicators found</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Indicators are populated from synchronized threat intelligence feeds.</div>
                </div>
              )}

              {!loading && !tabLoading && filteredIndicators.map(ind => (
                <div
                  key={ind.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 150px',
                    padding: '12px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', wordBreak: 'break-all' }}>{ind.value}</div>
                    {ind.title && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{ind.title}</div>}
                  </div>
                  <TypeBadge type={ind.indicator_type} />
                  <ConfBadge level={ind.confidence || 'LOW'} />
                  <ConfBadge level={ind.severity || 'LOW'} />
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    {ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* THREAT ACTORS TAB */}
        {activeTab === 'actors' && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 200px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Threat Actor</span>
              <span>Sophistication</span>
              <span>Origin</span>
              <span>Primary Targets</span>
            </div>

            {(loading || tabLoading) && [1, 2, 3].map(i => <LoadingRow key={i} />)}

            {!loading && !tabLoading && actors.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                <Globe size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                <div style={{ fontWeight: 600 }}>No threat actors in database</div>
                <div style={{ marginTop: 4, fontSize: 12 }}>Threat actor profiles are populated from synced STIX/TAXII and advisory feeds.</div>
              </div>
            )}

            {!loading && !tabLoading && actors.map((actor: any) => (
              <div
                key={actor.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 100px 200px',
                  padding: '14px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{actor.name}</div>
                  {actor.aliases && actor.aliases.length > 0 && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      Also known as: {actor.aliases.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
                <ConfBadge level={actor.sophistication || 'LOW'} />
                <div style={{ fontSize: 12, color: '#475569' }}>{actor.origin_country || '—'}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  {(actor.primary_targets || []).slice(0, 3).join(', ') || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MALWARE TAB */}
        {activeTab === 'malware' && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Malware Family</span>
              <span>Type</span>
              <span>Capabilities</span>
            </div>

            {(loading || tabLoading) && [1, 2, 3].map(i => <LoadingRow key={i} />)}

            {!loading && !tabLoading && malware.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                <Shield size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                <div style={{ fontWeight: 600 }}>No malware families in database</div>
                <div style={{ marginTop: 4, fontSize: 12 }}>Malware profiles are populated from synced threat intelligence feeds.</div>
              </div>
            )}

            {!loading && !tabLoading && malware.map((mal: any) => (
              <div
                key={mal.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px',
                  padding: '14px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{mal.name}</div>
                  {mal.description && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, maxWidth: 400 }}>{mal.description.slice(0, 100)}{mal.description.length > 100 ? '…' : ''}</div>
                  )}
                </div>
                <TypeBadge type={mal.malware_type || '—'} />
                <div style={{ fontSize: 11, color: '#475569' }}>
                  {(mal.capabilities || []).slice(0, 2).join(', ') || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div>
            {!projectId && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                <AlertTriangle size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                <div style={{ fontWeight: 600 }}>No project selected</div>
                <div style={{ marginTop: 4, fontSize: 12 }}>Select a project to view threat intelligence matches.</div>
              </div>
            )}

            {projectId && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 150px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Matched Observation</span>
                  <span>Match Type</span>
                  <span>Confidence</span>
                  <span>Matched At</span>
                </div>

                {(loading || tabLoading) && [1, 2, 3].map(i => <LoadingRow key={i} />)}

                {!loading && !tabLoading && matches.length === 0 && (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                    <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                    <div style={{ fontWeight: 600 }}>No threat matches for this project</div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      Matches are generated when project observations (IPs, domains, hashes) correlate against known threat indicators.
                    </div>
                  </div>
                )}

                {!loading && !tabLoading && matches.map((match: any) => (
                  <div
                    key={match.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 100px 150px',
                      padding: '14px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', fontFamily: 'monospace' }}>
                        {match.observed_value || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Entity: {match.observed_entity_id} · {match.observed_entity_type}
                      </div>
                    </div>
                    <TypeBadge type={match.observation_type || '—'} />
                    <ConfBadge level={match.match_confidence || 'LOW'} />
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {match.matched_at ? new Date(match.matched_at).toLocaleString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MITRE ATT&CK TECHNIQUES TAB */}
        {activeTab === 'techniques' && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  MITRE ATT&CK Enterprise Matrix v14
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>
                  Tactics, Techniques, and Procedures (TTPs) mapped to observed attack paths and threat indicators.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#EA580C', backgroundColor: '#FFF7ED', padding: '4px 10px', borderRadius: 6, border: '1px solid #FED7AA' }}>
                Multi-Hop Attack Path Correlated
              </span>
            </div>

            {(loading || tabLoading) && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                {[1, 2, 3].map(i => <LoadingRow key={i} />)}
              </div>
            )}

            {!loading && !tabLoading && techniques.length === 0 && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '48px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <Shield size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD5E1' }} />
                <div style={{ fontWeight: 600 }}>No MITRE techniques loaded</div>
              </div>
            )}

            {!loading && !tabLoading && techniques.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {techniques.map((t: any) => (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                          backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px',
                          borderRadius: 4, border: '1px solid #DBEAFE',
                        }}>
                          {t.technique_id}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: '#475569',
                          backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: 4,
                        }}>
                          {t.tactic}
                        </span>
                      </div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                        {t.name}
                      </h4>
                      <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                        {t.description}
                      </p>
                      {t.detection_guidance && (
                        <div style={{ marginTop: 10, padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: 6, border: '1px solid #F1F5F9' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                            Detection Guidance:
                          </span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>
                            {t.detection_guidance}
                          </span>
                        </div>
                      )}
                    </div>
                    {t.url && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, color: '#2563EB', textDecoration: 'none',
                          }}
                        >
                          View in MITRE Matrix
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
