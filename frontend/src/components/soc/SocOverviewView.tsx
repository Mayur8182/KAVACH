import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import type {
  SocOverviewResponse,
  SocAlertSummary,
  SocAlertDetail,
  SecurityEventSummary,
  SecurityEventDetail,
  SocCaseSummary,
  SocCaseDetail,
  SocWatchlist,
  SocDetectionRule,
} from '../../types/api';

interface SocOverviewViewProps {
  projectId?: string;
  initialTab?: 'overview' | 'alerts' | 'events' | 'cases' | 'watchlists' | 'rules';
}

export const SocOverviewView: React.FC<SocOverviewViewProps> = ({
  projectId: propProjectId,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'events' | 'cases' | 'watchlists' | 'rules'>(initialTab);
  const [projectId, setProjectId] = useState<string>(propProjectId || '');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<SocOverviewResponse | null>(null);
  const [alerts, setAlerts] = useState<SocAlertSummary[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SocAlertDetail | null>(null);
  const [events, setEvents] = useState<SecurityEventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventDetail | null>(null);
  const [cases, setCases] = useState<SocCaseSummary[]>([]);
  const [selectedCase, setSelectedCase] = useState<SocCaseDetail | null>(null);
  const [watchlists, setWatchlists] = useState<SocWatchlist[]>([]);
  const [rules, setRules] = useState<SocDetectionRule[]>([]);

  // Action states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newNoteContent, setNewNoteContent] = useState<string>('');

  // Initial project resolution
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const res = await apiClient.listProjects();
        if (res.data && res.data.length > 0 && isMounted) {
          setProjects(res.data);
          if (!projectId) {
            setProjectId(res.data[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load projects');
      }
    }
    loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch data based on active tab and project
  const loadTabContent = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const res = await apiClient.getSocOverview(projectId);
        if (res.data) setOverview(res.data);
      } else if (activeTab === 'alerts') {
        const res = await apiClient.listSocAlerts(projectId);
        if (res.data) setAlerts(res.data);
      } else if (activeTab === 'events') {
        const res = await apiClient.listSocEvents(projectId);
        if (res.data) setEvents(res.data);
      } else if (activeTab === 'cases') {
        const res = await apiClient.listSocCases(projectId);
        if (res.data) setCases(res.data);
      } else if (activeTab === 'watchlists') {
        const res = await apiClient.listSocWatchlists(projectId);
        if (res.data) setWatchlists(res.data);
      } else if (activeTab === 'rules') {
        const res = await apiClient.listSocDetectionRules();
        if (res.data) setRules(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading SOC data');
    } finally {
      setLoading(false);
    }
  }, [projectId, activeTab]);

  useEffect(() => {
    loadTabContent();
  }, [loadTabContent]);

  // Alert interactions
  const handleAcknowledgeAlert = async (alertId: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.acknowledgeSocAlert(alertId);
      setActionSuccess(`Alert ${alertId.slice(0, 8)} acknowledged`);
      loadTabContent();
      if (selectedAlert?.alert.id === alertId) {
        const ref = await apiClient.getSocAlert(alertId);
        if (ref.data) setSelectedAlert(ref.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to acknowledge alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateAlert = async (alertId: string) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.escalateSocAlert(alertId, {});
      setActionSuccess(`Alert escalated to Case ${res.data?.case_key || ''}`);
      loadTabContent();
    } catch (err: any) {
      setError(err?.message || 'Failed to escalate alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAlert = async (alertId: string, status: string = 'RESOLVED') => {
    setIsSubmitting(true);
    try {
      await apiClient.closeSocAlert(alertId, status, 'Analyst verified remediation');
      setActionSuccess(`Alert ${alertId.slice(0, 8)} closed with status ${status}`);
      loadTabContent();
    } catch (err: any) {
      setError(err?.message || 'Failed to close alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewAlertDetails = async (alertId: string) => {
    try {
      const res = await apiClient.getSocAlert(alertId);
      if (res.data) setSelectedAlert(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to view alert details');
    }
  };

  const handleViewEventDetails = async (eventId: string) => {
    try {
      const res = await apiClient.getSocEvent(eventId);
      if (res.data) setSelectedEvent(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to view event details');
    }
  };

  const handleViewCaseDetails = async (caseId: string) => {
    try {
      const res = await apiClient.getSocCase(caseId);
      if (res.data) setSelectedCase(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to view case details');
    }
  };

  const handleAddCaseNote = async (caseId: string) => {
    if (!newNoteContent.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.addSocCaseNote(caseId, { content: newNoteContent.trim() });
      setNewNoteContent('');
      setActionSuccess('Analyst note added to case timeline');
      const ref = await apiClient.getSocCase(caseId);
      if (ref.data) setSelectedCase(ref.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to add case note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/80';
      case 'HIGH':
        return 'bg-orange-950/70 text-orange-300 border-orange-800/80';
      case 'MEDIUM':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      case 'LOW':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'NEW':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-700';
      case 'OPEN':
      case 'ACKNOWLEDGED':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-700';
      case 'INVESTIGATING':
      case 'ESCALATED':
        return 'bg-purple-950/70 text-purple-300 border-purple-700';
      case 'RESOLVED':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-700';
      case 'FALSE_POSITIVE':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Security Operations Center (SOC)
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Continuous operational security layer &bull; Real-time telemetry, deterministic detections, and evidence-backed triage
          </p>
        </div>

        {/* Project Selector & Refresh */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scope:</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadTabContent()}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-sm rounded-lg flex justify-between items-center">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 font-bold">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-sm rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 mt-6 space-x-1 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'alerts', label: 'Alert Queue' },
          { key: 'events', label: 'Security Events' },
          { key: 'cases', label: 'Cases & Workspace' },
          { key: 'watchlists', label: 'Watchlists' },
          { key: 'rules', label: 'Detection Rules' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setSelectedAlert(null);
              setSelectedEvent(null);
              setSelectedCase(null);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && overview && (
        <div className="mt-6 space-y-6">
          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Open Alerts</span>
              <div className="text-2xl font-bold text-white mt-1">{overview.open_alerts}</div>
              <div className="text-xs text-slate-500 mt-1">Pending triage</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Critical Alerts</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">{overview.critical_alerts}</div>
              <div className="text-xs text-slate-500 mt-1">High urgency</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Active Cases</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">{overview.active_cases}</div>
              <div className="text-xs text-slate-500 mt-1">In investigation</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Telemetry (24h)</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{overview.events_ingested_24h}</div>
              <div className="text-xs text-slate-500 mt-1">Canonical events ingested</div>
            </div>
          </div>

          {/* SLA Performance Metrics (Section 51) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mean Time To Detect (MTTD)</h3>
              <div className="text-3xl font-extrabold text-cyan-300 mt-2">
                {overview.mean_time_to_detect_seconds !== null ? `${overview.mean_time_to_detect_seconds}s` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Calculated from real Postgres timestamps: time(alert_created) - time(event_occurred).
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mean Time To Acknowledge (MTTA)</h3>
              <div className="text-3xl font-extrabold text-indigo-300 mt-2">
                {overview.mean_time_to_acknowledge_seconds !== null ? `${overview.mean_time_to_acknowledge_seconds}s` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Calculated from real analyst triage timestamps: time(acknowledged) - time(created).
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correlated Signals</h3>
              <div className="text-3xl font-extrabold text-emerald-300 mt-2">
                {overview.events_correlated}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Deduplicated and multi-source correlated security events.
              </p>
            </div>
          </div>

          {/* Subsystem Health Monitoring (Section 49) */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              SOC Pipeline Health (Section 49)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(overview.pipeline_health).map(([key, val]) => (
                <div key={key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-300 capitalize">{key.replace('_', ' ')}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                      val === 'HEALTHY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Alerts Queue */}
      {activeTab === 'alerts' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert List */}
          <div className={`${selectedAlert ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
            {alerts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
                No active alerts found for this scope.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleViewAlertDetails(alert.id)}
                  className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition hover:border-slate-600 ${
                    selectedAlert?.alert.id === alert.id ? 'border-cyan-500 bg-slate-900/90' : 'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getSeverityBadgeClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs font-mono text-slate-400">[{alert.alert_key}]</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeClass(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Conf: {alert.confidence}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{alert.description}</p>
                    </div>

                    <div className="text-right space-y-1 flex-shrink-0">
                      <div className="text-xs text-slate-500">
                        Events: <span className="font-bold text-cyan-400">{alert.event_count}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(alert.last_seen_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800 text-xs" onClick={(e) => e.stopPropagation()}>
                    {alert.status === 'NEW' && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        disabled={isSubmitting}
                        className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded transition"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleEscalateAlert(alert.id)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 rounded transition"
                    >
                      Escalate to Case
                    </button>
                    {alert.status !== 'RESOLVED' && alert.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleCloseAlert(alert.id, 'RESOLVED')}
                        disabled={isSubmitting}
                        className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded transition"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={() => handleCloseAlert(alert.id, 'FALSE_POSITIVE')}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded transition"
                    >
                      False Positive
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Alert Details Panel */}
          {selectedAlert && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getSeverityBadgeClass(selectedAlert.alert.severity)}`}>
                    {selectedAlert.alert.severity}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{selectedAlert.alert.title}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-1">{selectedAlert.alert.alert_key}</div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedAlert.alert.description}
              </div>

              {/* Supporting Events */}
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Supporting Events ({selectedAlert.events.length})
                </h5>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedAlert.events.map((e, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>{e.event_type}</span>
                        <span>{e.association_type}</span>
                      </div>
                      <div className="text-slate-300">
                        Actor: <span className="text-cyan-400">{e.actor?.id || 'Unknown'}</span> &bull; Action: {e.action} &bull; Result: {e.result}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlations */}
              {selectedAlert.correlations.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Correlated Signals ({selectedAlert.correlations.length})
                  </h5>
                  <div className="space-y-1.5">
                    {selectedAlert.correlations.map((c) => (
                      <div key={c.id} className="p-2 bg-slate-950 rounded border border-slate-800 text-xs">
                        <span className="text-purple-300 font-semibold">{c.relationship_type}</span>: {c.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Security Events */}
      {activeTab === 'events' && (
        <div className="mt-6 space-y-4">
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono text-slate-400">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono">{e.source_type}</td>
                    <td className="p-3 font-semibold text-white">{e.event_type}</td>
                    <td className="p-3 text-cyan-300 font-mono">{e.actor?.id || 'SYSTEM'}</td>
                    <td className="p-3">{e.action}</td>
                    <td className="p-3 font-mono">
                      <span className={e.result === 'DENIED' || e.result === 'BLOCKED' ? 'text-rose-400' : 'text-emerald-400'}>
                        {e.result}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getSeverityBadgeClass(e.severity)}`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleViewEventDetails(e.id)}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal / Panel for Inspected Event */}
          {selectedEvent && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white font-mono">Event Details: {selectedEvent.event_id}</h4>
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Raw Event Reference: <span className="text-emerald-400">{selectedEvent.raw_event_reference}</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
                {JSON.stringify(selectedEvent.raw_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Cases & Workspace */}
      {activeTab === 'cases' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selectedCase ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-3`}>
            {cases.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
                No active investigation cases. Escalate an alert to open a case.
              </div>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleViewCaseDetails(c.id)}
                  className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition hover:border-slate-600 ${
                    selectedCase?.case.id === c.id ? 'border-purple-500 bg-slate-900/90' : 'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-purple-400 font-semibold">{c.case_key}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1">{c.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-1">{c.description}</p>
                </div>
              ))
            )}
          </div>

          {/* Investigation Case Workspace */}
          {selectedCase && (
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-purple-400 font-semibold">{selectedCase.case.case_key}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedCase.case.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedCase.case.description}</p>
                </div>
                <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              {/* Case Timeline */}
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Forensic Timeline
                </h5>
                <div className="space-y-2 border-l-2 border-slate-800 pl-4">
                  {selectedCase.case.timeline?.map((item, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-cyan-400" />
                      <div className="text-slate-400 font-mono text-[10px]">
                        {new Date(item.timestamp).toLocaleString()} &bull; {item.actor}
                      </div>
                      <div className="text-white font-semibold">{item.event}</div>
                      {item.details && <div className="text-slate-400 mt-0.5">{item.details}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Notes */}
              <div>
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Analyst Notes & Findings ({selectedCase.notes.length})
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {selectedCase.notes.map((n) => (
                    <div key={n.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                        <span>{n.author_name}</span>
                        <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{n.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Document forensic observation or triage rationale..."
                    className="flex-1 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleAddCaseNote(selectedCase.case.id)}
                    disabled={isSubmitting || !newNoteContent.trim()}
                    className="px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Watchlists */}
      {activeTab === 'watchlists' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watchlists.map((wl) => (
              <div key={wl.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">{wl.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {wl.watchlist_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{wl.description}</p>
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Monitored Entities ({wl.entities.length})
                  </span>
                  <div className="space-y-1.5 mt-2">
                    {wl.entities.map((e) => (
                      <div key={e.id} className="p-2 bg-slate-950 rounded border border-slate-800 text-xs flex justify-between items-center">
                        <div>
                          <span className="text-cyan-400 font-mono font-semibold">{e.entity_name}</span>
                          <span className="text-slate-500 text-[10px] ml-2 font-mono">({e.entity_identifier})</span>
                        </div>
                        <span className="text-slate-400 text-[11px] italic">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Detection Rules */}
      {activeTab === 'rules' && (
        <div className="mt-6 space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">[{rule.rule_key}]</span>
                  <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityBadgeClass(rule.severity)}`}>
                    {rule.severity}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">v{rule.version} &bull; {rule.lifecycle_status}</span>
              </div>
              <p className="text-xs text-slate-400">{rule.description}</p>
              <div className="flex gap-2 text-xs text-slate-500">
                <span>Triggers on:</span>
                {rule.event_types.map((et, idx) => (
                  <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded font-mono text-cyan-300 border border-slate-800">
                    {et}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
