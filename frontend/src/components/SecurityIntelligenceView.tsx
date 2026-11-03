import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface SecurityIntelligenceViewProps {
  projectId?: string;
  token?: string;
}

export const SecurityIntelligenceView: React.FC<SecurityIntelligenceViewProps> = ({
  projectId = '00000000-0000-0000-0000-000000000001',
  token,
}) => {
  const [activeTab, setActiveTab] = useState<'current_state' | 'drift' | 'behavior' | 'freshness' | 'verification' | 'correlations' | 'recommendations'>('current_state');
  
  const [summary, setSummary] = useState<any>(null);
  const [driftList, setDriftList] = useState<any[]>([]);
  const [baselineList, setBaselineList] = useState<any[]>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<any[]>([]);
  const [freshnessList, setFreshnessList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [correlationList, setCorrelationList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, driftRes, baseRes, behRes, freshRes, jobsRes, corrRes, recRes] = await Promise.all([
        apiClient.getIntelligenceSummary(projectId, token).catch(() => ({ data: null })),
        apiClient.listDriftEvents(projectId, token).catch(() => ({ data: [] })),
        apiClient.listBaselines(projectId, token).catch(() => ({ data: [] })),
        apiClient.listBehaviorEvents(projectId, token).catch(() => ({ data: [] })),
        apiClient.listControlFreshness(projectId, token).catch(() => ({ data: [] })),
        apiClient.listVerificationJobs(projectId, token).catch(() => ({ data: [] })),
        apiClient.listCorrelations(projectId, token).catch(() => ({ data: [] })),
        apiClient.listRecommendations(projectId, token).catch(() => ({ data: [] })),
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (driftRes.data) setDriftList(driftRes.data);
      if (baseRes.data) setBaselineList(baseRes.data);
      if (behRes.data) setBehaviorEvents(behRes.data);
      if (freshRes.data) setFreshnessList(freshRes.data);
      if (jobsRes.data) setJobsList(jobsRes.data);
      if (corrRes.data) setCorrelationList(corrRes.data);
      if (recRes.data) setRecommendations(recRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleDismissDrift = async (driftId: string) => {
    const reason = prompt('Enter dismissal reason (audit logged):');
    if (!reason) return;
    try {
      await apiClient.dismissDrift(driftId, reason, token);
      setActionMessage(`Drift ${driftId} dismissed.`);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to dismiss drift');
    }
  };

  const handleAcceptRecommendation = async (recId: string) => {
    if (!confirm('Accept this recommendation into the formal approval workflow?')) return;
    try {
      await apiClient.acceptRecommendation(recId, token);
      setActionMessage(`Recommendation ${recId} accepted.`);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to accept recommendation');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#38bdf8' }}>
            Continuous Security Intelligence Center
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Adaptive Verification, Security Drift Detection, Behavioral Baselines & Real Control Effectiveness
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Refresh Telemetry
        </button>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #059669', fontSize: '14px' }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#450a0a', color: '#fca5a5', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '24px' }}>
        {[
          { id: 'current_state', label: 'Current State (Factual)' },
          { id: 'drift', label: `Drift Detection (${driftList.length})` },
          { id: 'behavior', label: `Behavior & Baselines (${behaviorEvents.length})` },
          { id: 'freshness', label: `Control Freshness (${freshnessList.length})` },
          { id: 'verification', label: `Verification Jobs (${jobsList.length})` },
          { id: 'correlations', label: `Incident Correlations (${correlationList.length})` },
          { id: 'recommendations', label: `Adaptive Recommendations (${recommendations.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              backgroundColor: activeTab === tab.id ? '#0284c7' : '#1e293b',
              color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading Security Intelligence telemetry...</div>
      ) : (
        <>
          {/* TAB 1: CURRENT STATE (RULE 55 - NO SCORES, FACTUAL DIMENSIONS ONLY) */}
          {activeTab === 'current_state' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Active Drift Events', value: summary?.active_drift_events ?? driftList.length, color: '#f59e0b' },
                  { label: 'Stale / Expired Controls', value: summary?.stale_controls ?? freshnessList.filter(f => f.status !== 'FRESH').length, color: '#ef4444' },
                  { label: 'Behavioral Anomalies', value: summary?.behavior_anomalies ?? behaviorEvents.filter(b => b.status === 'ANOMALOUS' || b.status === 'SUSPICIOUS').length, color: '#ec4899' },
                  { label: 'Pending Recommendations', value: summary?.pending_recommendations ?? recommendations.filter(r => r.status === 'PROPOSED').length, color: '#a855f7' },
                  { label: 'Queued Verification Jobs', value: summary?.queued_verification_jobs ?? jobsList.filter(j => j.status === 'QUEUED').length, color: '#38bdf8' },
                ].map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>{item.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Rule 55: Factual count from live evidence</div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#38bdf8' }}>Continuous Control Invariants</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.7' }}>
                  <li><strong>VERIFIED YESTERDAY != VERIFIED TODAY:</strong> Controls automatically marked STALE when dependent infrastructure or credentials mutate.</li>
                  <li><strong>NO SECURITY SCORES:</strong> System exposes factual dimensions (counts of violations, active drift, and stale controls) without synthetic health metrics.</li>
                  <li><strong>DRIFT != VULNERABILITY:</strong> Drift triggers deterministic verification before declaring policy violations.</li>
                  <li><strong>ANOMALY != ATTACK:</strong> Behavioral deviations are classified strictly from historical statistical baselines.</li>
                  <li><strong>LLM IS NOT THE AUTHORITY:</strong> Recommendations require authorized human or policy workflow approval.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: DRIFT DETECTION */}
          {activeTab === 'drift' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Resource</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Explanation</th>
                    <th style={{ padding: '12px 16px' }}>Detected At</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {driftList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No drift events detected.</td>
                    </tr>
                  ) : (
                    driftList.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>{d.drift_type}</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{d.resource_type}: {d.resource_id}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            backgroundColor: d.severity_context === 'CRITICAL' ? '#7f1d1d' : '#854d0e',
                            color: d.severity_context === 'CRITICAL' ? '#fca5a5' : '#fde047',
                          }}>
                            {d.severity_context}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', maxWidth: '300px' }}>
                          {d.metadata_?.explanation || 'Attributes changed.'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {d.detected_at ? new Date(d.detected_at).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
                            backgroundColor: d.status === 'DETECTED' ? '#78350f' : '#14532d',
                            color: d.status === 'DETECTED' ? '#fde047' : '#86efac',
                          }}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {d.status === 'DETECTED' && (
                            <button
                              onClick={() => handleDismissDrift(d.id)}
                              style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Dismiss (Audit)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BEHAVIOR & BASELINES */}
          {activeTab === 'behavior' && (
            <div>
              <h3 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '12px' }}>Behavioral Baselines (Rule 57: Statistical Provenance)</h3>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', marginBottom: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Subject</th>
                      <th style={{ padding: '12px 16px' }}>Metric</th>
                      <th style={{ padding: '12px 16px' }}>Method</th>
                      <th style={{ padding: '12px 16px' }}>Samples</th>
                      <th style={{ padding: '12px 16px' }}>Baseline Values</th>
                      <th style={{ padding: '12px 16px' }}>Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baselineList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No baselines calculated.</td>
                      </tr>
                    ) : (
                      baselineList.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{b.subject_type}: {b.subject_id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>{b.metric}</td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{b.calculation_method}</td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{b.sample_count}</td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px' }}>
                            {JSON.stringify(b.baseline_value)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: '#064e3b', color: '#6ee7b7' }}>
                              {b.eligibility_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h3 style={{ fontSize: '16px', color: '#38bdf8', marginBottom: '12px' }}>Behavioral Events & Anomaly Classifications</h3>
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Subject</th>
                      <th style={{ padding: '12px 16px' }}>Event</th>
                      <th style={{ padding: '12px 16px' }}>Observed</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Deviation Context</th>
                      <th style={{ padding: '12px 16px' }}>Observed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No behavioral events recorded.</td>
                      </tr>
                    ) : (
                      behaviorEvents.map((e) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{e.subject_type}: {e.subject_id}</td>
                          <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>{e.event_type}</td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px' }}>
                            {JSON.stringify(e.observed_value)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                              backgroundColor: e.status === 'ANOMALOUS' ? '#831843' : e.status === 'SUSPICIOUS' ? '#7f1d1d' : '#064e3b',
                              color: e.status === 'ANOMALOUS' ? '#f472b6' : e.status === 'SUSPICIOUS' ? '#fca5a5' : '#6ee7b7',
                            }}>
                              {e.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                            {e.deviation_context ? JSON.stringify(e.deviation_context) : 'Within expected variance'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {e.observed_at ? new Date(e.observed_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CONTROL FRESHNESS */}
          {activeTab === 'freshness' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Requirement</th>
                    <th style={{ padding: '12px 16px' }}>Contract</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Last Verified</th>
                    <th style={{ padding: '12px 16px' }}>Stale Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {freshnessList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No controls tracked for freshness.</td>
                    </tr>
                  ) : (
                    freshnessList.map((f) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>{f.requirement_id}</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{f.contract_id || 'N/A'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            backgroundColor: f.status === 'FRESH' ? '#064e3b' : f.status === 'STALE' ? '#78350f' : '#7f1d1d',
                            color: f.status === 'FRESH' ? '#6ee7b7' : f.status === 'STALE' ? '#fde047' : '#fca5a5',
                          }}>
                            {f.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          {f.last_verified_at ? new Date(f.last_verified_at).toLocaleString() : 'Never verified'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#f87171' }}>
                          {f.stale_reason || 'Control evidence is fresh and valid.'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: VERIFICATION JOBS */}
          {activeTab === 'verification' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Job ID</th>
                    <th style={{ padding: '12px 16px' }}>Trigger</th>
                    <th style={{ padding: '12px 16px' }}>Contract</th>
                    <th style={{ padding: '12px 16px' }}>Target</th>
                    <th style={{ padding: '12px 16px' }}>Deduplication Key</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No verification jobs in queue.</td>
                    </tr>
                  ) : (
                    jobsList.map((j) => (
                      <tr key={j.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace' }}>{j.id.slice(0, 8)}...</td>
                        <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>{j.trigger_type}</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{j.contract_id || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{j.target_type}: {j.target_id || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                          {j.deduplication_key}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: '#0369a1', color: '#e0f2fe' }}>
                            {j.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: CORRELATIONS & TIMELINES */}
          {activeTab === 'correlations' && (
            <div>
              {correlationList.length === 0 ? (
                <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '8px', textAlign: 'center', color: '#64748b', border: '1px solid #334155' }}>
                  No correlated incidents detected.
                </div>
              ) : (
                correlationList.map((c) => (
                  <div key={c.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>{c.correlation_key}</h4>
                      <span style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: c.causality_status === 'CAUSALITY_VERIFIED' ? '#7f1d1d' : '#334155',
                        color: c.causality_status === 'CAUSALITY_VERIFIED' ? '#fca5a5' : '#94a3b8',
                      }}>
                        {c.causality_status} (Rule 46)
                      </span>
                    </div>
                    <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>{c.summary}</p>
                    <div style={{ borderLeft: '2px solid #38bdf8', paddingLeft: '16px', marginLeft: '8px' }}>
                      {(c.timeline || []).map((t: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: '12px', position: 'relative' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(t.timestamp).toLocaleTimeString()}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>{t.event_type} on {t.resource_id}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: ADAPTIVE RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px' }}>
                  <tr>
                    <th style={{ padding: '12px 16px' }}>Recommendation ID</th>
                    <th style={{ padding: '12px 16px' }}>Reason</th>
                    <th style={{ padding: '12px 16px' }}>Proposed Policy / Rule</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No pending recommendations.</td>
                    </tr>
                  ) : (
                    recommendations.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace' }}>{r.id.slice(0, 8)}...</td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{r.reason}</td>
                        <td style={{ padding: '12px 16px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '11px' }}>
                          {JSON.stringify(r.proposed_policy || r.proposed_requirement)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
                            backgroundColor: r.status === 'PROPOSED' ? '#78350f' : '#064e3b',
                            color: r.status === 'PROPOSED' ? '#fde047' : '#6ee7b7',
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {r.status === 'PROPOSED' && (
                            <button
                              onClick={() => handleAcceptRecommendation(r.id)}
                              style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Accept Workflow
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
