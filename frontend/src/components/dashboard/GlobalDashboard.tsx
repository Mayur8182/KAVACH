import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { StatusBadge, SeverityBadge } from '../shared/StatusBadge';
import { PageLoadingState, InlineLoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import type { AppRoute } from '../../types/navigation';

// ================================================================
// GlobalDashboard — Security Overview
//
// Answers five questions (DESIGN.md §10):
// 1. Is the system healthy?
// 2. What is currently wrong?
// 3. What is most important?
// 4. What changed recently?
// 5. What should I do next?
// ================================================================

interface GlobalDashboardProps {
  onNavigate: (route: AppRoute) => void;
}

interface DashboardMetrics {
  openCritical: number | null;
  openHigh: number | null;
  openMedium: number | null;
  openLow: number | null;
  activeIncidents: number | null;
  contractViolations: number | null;
  pendingApprovals: number | null;
  connectedIntegrations: number | null;
  totalIntegrations: number | null;
}

interface RecentEvent {
  id: string;
  type: string;
  title: string;
  severity?: string;
  asset?: string;
  timestamp: string;
  route?: AppRoute;
}

type LoadState = 'loading' | 'success' | 'error';

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({ onNavigate }) => {
  const [metricsState, setMetricsState] = useState<LoadState>('loading');
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    openCritical: null, openHigh: null, openMedium: null, openLow: null,
    activeIncidents: null, contractViolations: null, pendingApprovals: null,
    connectedIntegrations: null, totalIntegrations: null,
  });

  const [findingsState, setFindingsState] = useState<LoadState>('loading');
  const [recentFindings, setRecentFindings] = useState<RecentEvent[]>([]);

  const [incidentsState, setIncidentsState] = useState<LoadState>('loading');
  const [activeIncidentList, setActiveIncidentList] = useState<RecentEvent[]>([]);

  const [integrationHealthState, setIntegrationHealthState] = useState<LoadState>('loading');
  const [integrationHealth, setIntegrationHealth] = useState<Array<{ name: string; status: string }>>([]);

  const loadMetrics = useCallback(async () => {
    setMetricsState('loading');
    setMetricsError(null);
    try {
      // Load findings counts, incidents, contract violations, and approvals in parallel
      const [findingsRes, incidentsRes, approvalsRes] = await Promise.allSettled([
        apiClient.listFindings ? apiClient.listFindings() : Promise.resolve({ data: null }),
        apiClient.listIncidents ? apiClient.listIncidents() : Promise.resolve({ data: null }),
        apiClient.listAllPendingApprovals ? apiClient.listAllPendingApprovals() : Promise.resolve({ data: null }),
      ]);

      const findings = findingsRes.status === 'fulfilled' ? findingsRes.value?.data : null;
      const incidents = incidentsRes.status === 'fulfilled' ? incidentsRes.value?.data : null;
      const approvals = approvalsRes.status === 'fulfilled' ? approvalsRes.value?.data : null;

      const findingsArr = Array.isArray(findings) ? findings : [];
      const incidentsArr = Array.isArray(incidents) ? incidents : [];
      const approvalsArr = Array.isArray(approvals) ? approvals : [];

      setMetrics({
        openCritical: findingsArr.filter((f: any) => f.severity === 'CRITICAL' && f.status === 'OPEN').length,
        openHigh: findingsArr.filter((f: any) => f.severity === 'HIGH' && f.status === 'OPEN').length,
        openMedium: findingsArr.filter((f: any) => f.severity === 'MEDIUM' && f.status === 'OPEN').length,
        openLow: findingsArr.filter((f: any) => f.severity === 'LOW' && f.status === 'OPEN').length,
        activeIncidents: incidentsArr.filter((i: any) => i.status !== 'CLOSED' && i.status !== 'FALSE_POSITIVE').length,
        contractViolations: null, // loaded separately
        pendingApprovals: approvalsArr.length,
        connectedIntegrations: null,
        totalIntegrations: null,
      });
      setMetricsState('success');

      // Set recent findings
      const sorted = [...findingsArr]
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5)
        .map((f: any) => ({
          id: f.id,
          type: 'FINDING',
          title: f.title || f.rule_id || 'Security Finding',
          severity: f.severity,
          asset: f.repository_name || f.asset || undefined,
          timestamp: f.created_at,
          route: 'code/findings' as AppRoute,
        }));
      setRecentFindings(sorted);
      setFindingsState('success');

      // Set active incidents
      const incidentEvents = incidentsArr
        .filter((i: any) => i.status !== 'CLOSED' && i.status !== 'FALSE_POSITIVE')
        .slice(0, 5)
        .map((i: any) => ({
          id: i.id,
          type: 'INCIDENT',
          title: i.title || 'Security Incident',
          severity: i.severity,
          timestamp: i.created_at,
          route: 'incident/center' as AppRoute,
        }));
      setActiveIncidentList(incidentEvents);
      setIncidentsState('success');
    } catch (err: any) {
      setMetricsError(err?.message || 'Failed to load dashboard data');
      setMetricsState('error');
      setFindingsState('error');
      setIncidentsState('error');
    }
  }, []);

  const loadIntegrationHealth = useCallback(async () => {
    setIntegrationHealthState('loading');
    try {
      const res = await apiClient.getReadiness();
      if (res.data?.dependencies) {
        const deps = res.data.dependencies;
        const integrations = Object.entries(deps).map(([name, health]: [string, any]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          status: health.status === 'healthy' ? 'connected' : health.status === 'not_configured' ? 'not_configured' : 'failed',
        }));
        setIntegrationHealth(integrations);
      }
      setIntegrationHealthState('success');
    } catch {
      setIntegrationHealthState('error');
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    loadIntegrationHealth();
  }, [loadMetrics, loadIntegrationHealth]);

  const totalOpenFindings = (metrics.openCritical ?? 0) + (metrics.openHigh ?? 0);
  const postureState = metricsState === 'loading'
    ? 'loading'
    : metricsState === 'error'
    ? 'error'
    : (metrics.openCritical ?? 0) > 0
    ? 'critical'
    : (metrics.openHigh ?? 0) > 0 || (metrics.activeIncidents ?? 0) > 0
    ? 'attention'
    : 'healthy';

  return (
    <div style={{ padding: 'var(--space-8) var(--space-10)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* ── Page Header ── */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          Security Overview
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Thing Control Plane · Real-time security state across all domains
        </p>
      </div>

      {metricsState === 'loading' ? (
        <PageLoadingState rows={4} />
      ) : metricsState === 'error' ? (
        <ErrorState
          message={metricsError || 'Unable to load security overview.'}
          detail="The backend API did not return valid data."
          onRetry={loadMetrics}
        />
      ) : (
        <>
          {/* ── Section 1: Security Posture ── */}
          <PostureSection state={postureState} totalOpen={totalOpenFindings} onViewFindings={() => onNavigate('code/findings')} />

          {/* ── Section 2: Priority Metrics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            <MetricCard
              label="Critical Findings"
              value={metrics.openCritical}
              variant="critical"
              onClick={() => onNavigate('code/findings')}
            />
            <MetricCard
              label="Active Incidents"
              value={metrics.activeIncidents}
              variant="danger"
              onClick={() => onNavigate('incident/center')}
            />
            <MetricCard
              label="Pending Approvals"
              value={metrics.pendingApprovals}
              variant="warning"
              onClick={() => onNavigate('control/approvals')}
            />
            <MetricCard
              label="High Findings"
              value={metrics.openHigh}
              variant="high"
              onClick={() => onNavigate('code/findings')}
            />
          </div>

          {/* ── Section 3: Priority Findings + Active Incidents ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>

            {/* Priority Findings */}
            <section
              aria-label="Priority findings"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
              }}
            >
              <SectionHeader
                title="Priority Findings"
                subtitle="Critical and high severity, open"
                action={{ label: 'View all', onClick: () => onNavigate('code/findings') }}
              />
              {findingsState === 'loading' ? (
                <InlineLoadingState />
              ) : recentFindings.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  No open findings detected.
                </div>
              ) : (
                <EventList events={recentFindings} onNavigate={onNavigate} />
              )}
            </section>

            {/* Active Incidents */}
            <section
              aria-label="Active incidents"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
              }}
            >
              <SectionHeader
                title="Active Incidents"
                subtitle="Requiring investigation or containment"
                action={{ label: 'View all', onClick: () => onNavigate('incident/center') }}
              />
              {incidentsState === 'loading' ? (
                <InlineLoadingState />
              ) : activeIncidentList.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  No active incidents.
                </div>
              ) : (
                <EventList events={activeIncidentList} onNavigate={onNavigate} />
              )}
            </section>

          </div>

          {/* ── Section 4: Findings Distribution + Integration Health ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>

            {/* Findings Distribution */}
            <section
              aria-label="Findings by severity"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
              }}
            >
              <SectionHeader title="Findings by Severity" subtitle="All open findings" />
              <div style={{ padding: 'var(--space-5)' }}>
                <FindingBar label="Critical" value={metrics.openCritical ?? 0} color="var(--severity-critical)" max={Math.max(metrics.openCritical ?? 0, metrics.openHigh ?? 0, metrics.openMedium ?? 0, metrics.openLow ?? 0, 1)} />
                <FindingBar label="High"     value={metrics.openHigh ?? 0}     color="var(--severity-high)"     max={Math.max(metrics.openCritical ?? 0, metrics.openHigh ?? 0, metrics.openMedium ?? 0, metrics.openLow ?? 0, 1)} />
                <FindingBar label="Medium"   value={metrics.openMedium ?? 0}   color="var(--severity-medium)"   max={Math.max(metrics.openCritical ?? 0, metrics.openHigh ?? 0, metrics.openMedium ?? 0, metrics.openLow ?? 0, 1)} />
                <FindingBar label="Low"      value={metrics.openLow ?? 0}      color="var(--severity-low)"      max={Math.max(metrics.openCritical ?? 0, metrics.openHigh ?? 0, metrics.openMedium ?? 0, metrics.openLow ?? 0, 1)} />
              </div>
            </section>

            {/* Integration Health */}
            <section
              aria-label="Integration health"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
              }}
            >
              <SectionHeader
                title="Integration Health"
                subtitle="From backend health check"
                action={{ label: 'View all', onClick: () => onNavigate('integrations') }}
              />
              {integrationHealthState === 'loading' ? (
                <InlineLoadingState />
              ) : integrationHealth.length === 0 ? (
                <div style={{ padding: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  No integration health data available.
                </div>
              ) : (
                <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
                  {integrationHealth.map((intg) => (
                    <div
                      key={intg.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-3) 0',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{intg.name}</span>
                      <StatusBadge status={intg.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </>
      )}
    </div>
  );
};

// ================================================================
// PostureSection — communicates the current security state first
// ================================================================

type PostureState = 'loading' | 'error' | 'critical' | 'attention' | 'healthy';

const POSTURE_CONFIG: Record<string, { label: string; description: string; color: string; bg: string; border: string }> = {
  critical: {
    label: 'Critical Issues Detected',
    description: 'Critical findings are open and require immediate attention.',
    color: 'var(--severity-critical)',
    bg: 'var(--severity-critical-bg)',
    border: 'var(--severity-critical-border)',
  },
  attention: {
    label: 'Attention Required',
    description: 'High severity findings or active incidents require review.',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning-border)',
  },
  healthy: {
    label: 'No Critical Issues',
    description: 'No open critical or high severity findings detected.',
    color: 'var(--color-success)',
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success-border)',
  },
  error: {
    label: 'Data Unavailable',
    description: 'Security posture could not be evaluated — backend error.',
    color: 'var(--color-text-muted)',
    bg: 'rgba(113,113,122,0.08)',
    border: 'rgba(113,113,122,0.18)',
  },
  loading: {
    label: 'Evaluating...',
    description: 'Loading security posture data.',
    color: 'var(--color-text-muted)',
    bg: 'rgba(113,113,122,0.08)',
    border: 'rgba(113,113,122,0.18)',
  },
};

const PostureSection: React.FC<{ state: PostureState; totalOpen: number; onViewFindings: () => void }> = ({
  state, totalOpen, onViewFindings,
}) => {
  const config = POSTURE_CONFIG[state];
  return (
    <section
      aria-label="Security posture"
      style={{
        padding: 'var(--space-6)',
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-lg)',
        backgroundColor: config.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-6)' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              letterSpacing: '0.08em',
              color: config.color,
              marginBottom: 'var(--space-3)',
            }}
          >
            <span
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: config.color, flexShrink: 0,
              }}
            />
            SECURITY POSTURE
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: 'var(--space-2)' }}>
            {config.label}
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
            {config.description}
          </p>
        </div>
        {state !== 'loading' && state !== 'error' && (
          <button
            onClick={onViewFindings}
            style={{
              padding: 'var(--space-2) var(--space-5)',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {totalOpen > 0 ? `View ${totalOpen} priority findings` : 'View findings'}
          </button>
        )}
      </div>
    </section>
  );
};

// ================================================================
// MetricCard
// ================================================================

type MetricVariant = 'critical' | 'danger' | 'warning' | 'high' | 'neutral';

const METRIC_COLORS: Record<MetricVariant, { color: string; bg: string; border: string }> = {
  critical: { color: 'var(--severity-critical)', bg: 'var(--severity-critical-bg)', border: 'var(--severity-critical-border)' },
  danger:   { color: 'var(--color-danger)',       bg: 'var(--color-danger-subtle)',   border: 'var(--color-danger-border)' },
  high:     { color: 'var(--severity-high)',      bg: 'var(--severity-high-bg)',      border: 'var(--severity-high-border)' },
  warning:  { color: 'var(--color-warning)',      bg: 'var(--color-warning-subtle)',  border: 'var(--color-warning-border)' },
  neutral:  { color: 'var(--color-text)',         bg: 'var(--color-surface)',         border: 'var(--color-border)' },
};

const MetricCard: React.FC<{
  label: string;
  value: number | null;
  variant?: MetricVariant;
  onClick?: () => void;
}> = ({ label, value, variant = 'neutral', onClick }) => {
  const colors = value !== null && value > 0 ? METRIC_COLORS[variant] : METRIC_COLORS.neutral;
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-5)',
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--radius-lg)',
        backgroundColor: colors.bg,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--motion-fast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-medium)' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: value !== null && value > 0 ? colors.color : 'var(--color-text)', lineHeight: 1 }}>
        {value === null ? '—' : value}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        {value === null ? 'Unavailable' : 'current'}
      </span>
    </button>
  );
};

// ================================================================
// SectionHeader
// ================================================================

const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}> = ({ title, subtitle, action }) => (
  <div
    style={{
      padding: 'var(--space-4) var(--space-5)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
    }}
  >
    <div>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {subtitle}
        </div>
      )}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary)',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'var(--weight-medium)',
          whiteSpace: 'nowrap',
        }}
      >
        {action.label} →
      </button>
    )}
  </div>
);

// ================================================================
// EventList
// ================================================================

const EventList: React.FC<{
  events: RecentEvent[];
  onNavigate: (r: AppRoute) => void;
}> = ({ events, onNavigate }) => (
  <div>
    {events.map((event, idx) => (
      <div
        key={event.id}
        style={{
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: idx < events.length - 1 ? '1px solid var(--color-border)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          cursor: event.route ? 'pointer' : 'default',
        }}
        onClick={() => event.route && onNavigate(event.route)}
        role={event.route ? 'button' : undefined}
        tabIndex={event.route ? 0 : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter' && event.route) onNavigate(event.route); }}
      >
        {event.severity ? (
          <SeverityBadge severity={event.severity} size="sm" />
        ) : (
          <span style={{ width: '60px', flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </span>
        {event.asset && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', flexShrink: 0 }}>
            {event.asset}
          </span>
        )}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-disabled)', flexShrink: 0 }}>
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>
    ))}
  </div>
);

// ================================================================
// FindingBar — horizontal bar for severity distribution
// ================================================================

const FindingBar: React.FC<{ label: string; value: number; color: string; max: number }> = ({
  label, value, color, max,
}) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', width: '56px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: value > 0 ? color : 'transparent',
            borderRadius: 'var(--radius-pill)',
            transition: 'width var(--motion-slow)',
          }}
        />
      </div>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: value > 0 ? color : 'var(--color-text-muted)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
};

// ================================================================
// Helpers
// ================================================================

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
