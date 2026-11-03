import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import type {
  DNSOverviewResponse,
  DNSDataSource,
  DNSEventSummary,
  DomainSummary,
  DNSPolicySummary,
  DNSListEntrySummary,
  DNSSignalSummary,
} from '../../types/api';

interface DnsSecurityViewProps {
  projectId?: string;
  initialTab?: 'overview' | 'events' | 'domains' | 'signals' | 'policies';
}

export const DnsSecurityView: React.FC<DnsSecurityViewProps> = ({
  projectId: propProjectId,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'domains' | 'signals' | 'policies'>(initialTab);
  const [projectId, setProjectId] = useState<string>(propProjectId || '');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<DNSOverviewResponse | null>(null);
  const [sources, setSources] = useState<DNSDataSource[]>([]);
  const [events, setEvents] = useState<DNSEventSummary[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [signals, setSignals] = useState<DNSSignalSummary[]>([]);
  const [policies, setPolicies] = useState<DNSPolicySummary[]>([]);
  const [listEntries, setListEntries] = useState<DNSListEntrySummary[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rcodeFilter, setRcodeFilter] = useState<string>('');
  const [reputationFilter, setReputationFilter] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New source form
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('KUBERNETES');
  const [newProvider, setNewProvider] = useState('COREDNS');
  const [newEndpoint, setNewEndpoint] = useState('kube-dns.kube-system.svc.cluster.local:53');

  // Ingest simulation form
  const [ingestQueryName, setIngestQueryName] = useState('beacon-c2-99.malicious-traffic.net');
  const [ingestQueryType, setIngestQueryType] = useState('A');
  const [ingestClientIdentity, setIngestClientIdentity] = useState('agent-payment-processor');

  // New List Entry form
  const [newListType, setNewListType] = useState<'ALLOWLIST' | 'BLOCKLIST' | 'WATCHLIST'>('BLOCKLIST');
  const [newListPattern, setNewListPattern] = useState('');
  const [newListReason, setNewListReason] = useState('');

  // Initial load
  useEffect(() => {
    apiClient.listProjects({ limit: 50 }).then((res) => {
      if (res.data && res.data.length > 0) {
        setProjects(res.data);
        if (!projectId) {
          setProjectId(res.data[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, srcRes, evtRes, domRes, sigRes, polRes, listRes] = await Promise.all([
        apiClient.getDnsOverview(projectId || undefined),
        apiClient.listDnsSources(),
        apiClient.listDnsEvents({
          project_id: projectId || undefined,
          domain: searchQuery || undefined,
          response_code: rcodeFilter || undefined,
          limit: 50,
        }),
        apiClient.listDnsDomains({
          reputation: reputationFilter || undefined,
          search: searchQuery || undefined,
          limit: 50,
        }),
        apiClient.listDnsSignals(projectId || undefined),
        apiClient.listDnsPolicies(projectId || undefined),
        apiClient.listDnsListEntries(undefined, projectId || undefined),
      ]);

      if (ovRes.data) setOverview(ovRes.data);
      if (srcRes.data) setSources(srcRes.data);
      if (evtRes.data) setEvents(evtRes.data);
      if (domRes.data) setDomains(domRes.data);
      if (sigRes.data) setSignals(sigRes.data);
      if (polRes.data) setPolicies(polRes.data);
      if (listRes.data) setListEntries(listRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load DNS security data');
    } finally {
      setLoading(false);
    }
  }, [projectId, searchQuery, rcodeFilter, reputationFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle register source
  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newEndpoint.trim()) return;
    setIsSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await apiClient.createDnsSource({
        name: newSourceName.trim(),
        source_type: newSourceType,
        provider: newProvider,
        endpoint: newEndpoint.trim(),
        authentication_type: 'NONE',
      });
      if (res.error) throw new Error(res.error.message);
      setActionSuccess(`DNS Source '${newSourceName}' registered successfully.`);
      setNewSourceName('');
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to register DNS source');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle test telemetry ingestion
  const handleIngestTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestQueryName.trim()) return;
    setIsSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await apiClient.ingestDnsTelemetry({
        query_name: ingestQueryName.trim(),
        query_type: ingestQueryType,
        client_identity: ingestClientIdentity.trim(),
        agent_identity: ingestClientIdentity.startsWith('agent') ? ingestClientIdentity.trim() : undefined,
        environment: 'PRODUCTION',
        project_id: projectId || undefined,
      });
      if (res.error) throw new Error(res.error.message);
      setActionSuccess(`DNS Query for '${ingestQueryName}' processed -> Decision: ${res.data?.decision || 'ALLOWED'}`);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest telemetry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle create list entry
  const handleCreateListEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListPattern.trim() || !newListReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.createDnsListEntry({
        list_type: newListType,
        domain_pattern: newListPattern.trim(),
        reason: newListReason.trim(),
        project_id: projectId || undefined,
        scope: projectId ? 'PROJECT' : 'GLOBAL',
      });
      if (res.error) throw new Error(res.error.message);
      setActionSuccess(`Added '${newListPattern}' to ${newListType}`);
      setNewListPattern('');
      setNewListReason('');
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to add list entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle escalate signal to SOC
  const handleEscalateToSoc = async (signalId: string) => {
    setIsSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await apiClient.escalateDnsSignal(signalId);
      if (res.error) throw new Error(res.error.message);
      setActionSuccess(`Signal escalated to Thing SOC Alert: ${res.data?.alert_key || 'ALT-CREATED'}`);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to escalate to SOC');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            DNS Security & DNS Threat Protection
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Continuous DNS telemetry collection, tunneling/DGA detection, and authoritative policy enforcement.
          </p>
        </div>

        {/* Project Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="">All Projects (Global Scope)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => refreshData()}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        {[
          { id: 'overview', label: 'Overview & Sources' },
          { id: 'events', label: `DNS Traffic (${events.length})` },
          { id: 'domains', label: `Domains & Reputation (${domains.length})` },
          { id: 'signals', label: `Threat Signals (${signals.length})` },
          { id: 'policies', label: `Policies & Lists (${policies.length + listEntries.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === t.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & SOURCES */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Banners */}
          {overview && !overview.is_configured && (
            <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#f59e0b', fontWeight: 700 }}>
                DNS Visibility NOT CONFIGURED
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                No live DNS resolver or cloud telemetry source connected. Register a DNS resolver or CoreDNS collector below.
              </p>
            </div>
          )}

          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>SOURCES CONNECTED</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: overview?.sources_connected ? '#22c55e' : '#f59e0b' }}>
                {overview?.sources_connected || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Status: <code>{overview?.resolver_health || 'NOT_CONFIGURED'}</code>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL DNS EVENTS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
                {overview?.total_dns_events || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Normalized telemetry
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>BLOCKED QUERIES</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: overview?.blocked_queries ? '#ef4444' : '#22c55e' }}>
                {overview?.blocked_queries || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Enforced by policy
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>MALICIOUS DOMAINS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: overview?.malicious_domains_tracked ? '#ef4444' : 'var(--text-secondary)' }}>
                {overview?.malicious_domains_tracked || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Step 24 threat intelligence
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TUNNELING & EXFILTRATION</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: overview?.tunneling_signals ? '#ef4444' : 'var(--text-secondary)' }}>
                {overview?.tunneling_signals || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Entropy & long label alerts
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DGA DETECTIONS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: overview?.dga_signals ? '#f59e0b' : 'var(--text-secondary)' }}>
                {overview?.dga_signals || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                High entropy domain generation
              </div>
            </div>
          </div>

          {/* Sources Table & Registration Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0' }}>Connected DNS Collectors</h3>
              {sources.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No DNS collectors configured yet. Register a collector to begin receiving telemetry.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sources.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{s.name}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 600 }}>
                            {s.source_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Provider: <code>{s.provider}</code> &bull; Endpoint: <code>{s.endpoint}</code>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: s.status === 'CONNECTED' ? '#22c55e' : '#ef4444' }}>
                          {s.status}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Events: {s.events_collected}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Register New Source Form */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0' }}>Register DNS Collector</h3>
              <form onSubmit={handleRegisterSource} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Collector Name</label>
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="e.g., EKS CoreDNS Ingestion"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Source Type</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  >
                    <option value="KUBERNETES">Kubernetes (CoreDNS)</option>
                    <option value="CLOUD_DNS">Cloud DNS (AWS Route 53)</option>
                    <option value="RESOLVER">External Resolver / Gateway</option>
                    <option value="ENDPOINT_AGENT">Endpoint / Worker Agent</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Provider</label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  >
                    <option value="COREDNS">CoreDNS</option>
                    <option value="AWS_ROUTE53">AWS Route 53 Resolver</option>
                    <option value="CLOUDFLARE">Cloudflare Gateway</option>
                    <option value="BIND">BIND / Named</option>
                    <option value="GENERIC">Generic Resolver</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Endpoint</label>
                  <input
                    type="text"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: '8px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {isSubmitting ? 'Registering...' : 'Register Collector'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DNS TRAFFIC & INGESTION */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Ingestion Test Tool */}
          <div className="glass-panel" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-secondary)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700 }}>Simulate Live DNS Query Resolution</h4>
            <form onSubmit={handleIngestTelemetry} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Queried Domain</label>
                <input
                  type="text"
                  value={ingestQueryName}
                  onChange={(e) => setIngestQueryName(e.target.value)}
                  placeholder="e.g. c2-beacon.attacker.net"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Query Type</label>
                <select
                  value={ingestQueryType}
                  onChange={(e) => setIngestQueryType(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="TXT">TXT</option>
                  <option value="MX">MX</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Client / Agent Identity</label>
                <input
                  type="text"
                  value={ingestClientIdentity}
                  onChange={(e) => setIngestClientIdentity(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Ingest & Evaluate
              </button>
            </form>
          </div>

          {/* Events Table */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>DNS Query Telemetry</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={rcodeFilter}
                  onChange={(e) => setRcodeFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px' }}
                >
                  <option value="">All Response Codes</option>
                  <option value="NOERROR">NOERROR</option>
                  <option value="NXDOMAIN">NXDOMAIN</option>
                  <option value="SERVFAIL">SERVFAIL</option>
                  <option value="REFUSED">REFUSED</option>
                </select>
                <input
                  type="text"
                  placeholder="Filter by domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', width: '220px' }}
                />
              </div>
            </div>

            {events.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No DNS events recorded. Ingest telemetry above or connect a DNS collector.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px' }}>Timestamp</th>
                      <th style={{ padding: '10px' }}>Queried Domain</th>
                      <th style={{ padding: '10px' }}>Type</th>
                      <th style={{ padding: '10px' }}>RCode</th>
                      <th style={{ padding: '10px' }}>Client / Agent Identity</th>
                      <th style={{ padding: '10px' }}>Resolver</th>
                      <th style={{ padding: '10px' }}>Raw Digest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => (
                      <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <code>{evt.normalized_query}</code>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '11px', fontWeight: 700 }}>
                            {evt.query_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: evt.response_code === 'NOERROR' ? '#22c55e' : '#f59e0b' }}>
                            {evt.response_code}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <code>{evt.agent_identity || evt.client_identity || 'anonymous'}</code>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {evt.resolver}
                        </td>
                        <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <code>{evt.raw_event_reference.substring(0, 15)}...</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOMAINS & REPUTATION */}
      {activeTab === 'domains' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Observed Domains & Linguistic Entropy</h3>
            <select
              value={reputationFilter}
              onChange={(e) => setReputationFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="">All Reputations</option>
              <option value="KNOWN_MALICIOUS">Known Malicious</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="KNOWN_BENIGN">Known Benign</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          {domains.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No domains observed yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px' }}>FQDN</th>
                    <th style={{ padding: '10px' }}>Registered Domain</th>
                    <th style={{ padding: '10px' }}>Entropy</th>
                    <th style={{ padding: '10px' }}>Reputation</th>
                    <th style={{ padding: '10px' }}>Classification</th>
                    <th style={{ padding: '10px' }}>Total Queries</th>
                    <th style={{ padding: '10px' }}>First Seen</th>
                    <th style={{ padding: '10px' }}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((dom) => (
                    <tr key={dom.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        <code>{dom.fqdn}</code>
                        {dom.is_idn && (
                          <span style={{ marginLeft: '6px', padding: '2px 4px', fontSize: '10px', borderRadius: '3px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            IDN / Punycode
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                        <code>{dom.registered_domain}</code>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: (dom.entropy || 0) > 3.6 ? '#ef4444' : (dom.entropy || 0) > 3.2 ? '#f59e0b' : 'inherit',
                        }}>
                          {dom.entropy !== undefined && dom.entropy !== null ? dom.entropy.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            dom.reputation === 'KNOWN_MALICIOUS'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : dom.reputation === 'SUSPICIOUS'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                          color:
                            dom.reputation === 'KNOWN_MALICIOUS'
                              ? '#ef4444'
                              : dom.reputation === 'SUSPICIOUS'
                              ? '#f59e0b'
                              : 'var(--text-secondary)',
                        }}>
                          {dom.reputation}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <code>{dom.classification}</code>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        {dom.total_queries}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(dom.first_seen).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(dom.last_seen).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: THREAT SIGNALS & DETECTIONS */}
      {activeTab === 'signals' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0' }}>Active DNS Threat Detections</h3>
          {signals.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No active DNS threat signals detected in the environment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {signals.map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: sig.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: sig.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                      }}>
                        {sig.severity}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {sig.alert_type.replace('_', ' ')}
                      </span>
                      <code style={{ fontSize: '13px', color: '#3b82f6' }}>{sig.domain}</code>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Entity: <code>{sig.entity_id}</code> ({sig.entity_type}) &bull; Confidence: <code>{sig.confidence}</code> &bull; Detected: {new Date(sig.created_at).toLocaleString()}
                    </div>

                    {sig.details && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                        {JSON.stringify(sig.details)}
                      </div>
                    )}
                  </div>

                  <div>
                    {sig.status === 'ESCALATED' ? (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        Escalated to SOC
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEscalateToSoc(sig.id)}
                        disabled={isSubmitting}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Escalate to SOC
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: POLICIES & LISTS */}
      {activeTab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left: Lists */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0' }}>Allowlist / Blocklist / Watchlist</h3>

            <form onSubmit={handleCreateListEntry} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <select
                  value={newListType}
                  onChange={(e) => setNewListType(e.target.value as any)}
                  style={{ padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="BLOCKLIST">BLOCKLIST</option>
                  <option value="ALLOWLIST">ALLOWLIST</option>
                  <option value="WATCHLIST">WATCHLIST</option>
                </select>
                <input
                  type="text"
                  placeholder="Domain or pattern (e.g. *.evil.com)"
                  value={newListPattern}
                  onChange={(e) => setNewListPattern(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <input
                type="text"
                placeholder="Reason / justification"
                value={newListReason}
                onChange={(e) => setNewListReason(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Add Rule Entry
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {listEntries.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px' }}>
                  No allow/block/watchlist rules defined.
                </div>
              ) : (
                listEntries.map((e) => (
                  <div key={e.id} style={{ padding: '10px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code>{e.domain_pattern}</code>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: e.list_type === 'BLOCKLIST' ? 'rgba(239, 68, 68, 0.1)' : e.list_type === 'ALLOWLIST' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: e.list_type === 'BLOCKLIST' ? '#ef4444' : e.list_type === 'ALLOWLIST' ? '#22c55e' : '#3b82f6',
                      }}>
                        {e.list_type}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {e.reason} &bull; Scope: <code>{e.scope}</code>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Custom Policies */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0' }}>Scoped DNS Policies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {policies.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px' }}>
                  No scoped DNS policies active. Default resolution rules apply.
                </div>
              ) : (
                policies.map((p) => (
                  <div key={p.id} style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{p.name}</span>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: p.action === 'BLOCK' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: p.action === 'BLOCK' ? '#ef4444' : '#22c55e',
                      }}>
                        {p.action}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Priority: {p.priority} &bull; Scope: <code>{p.scope}</code>
                    </div>
                    <pre style={{ fontSize: '11px', padding: '6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', marginTop: '6px', overflowX: 'auto' }}>
                      {JSON.stringify(p.conditions, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
