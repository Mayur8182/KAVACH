import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type {
  RuntimeEvidence,
  RuntimeEvidenceSource,
  RuntimeHealthResponse,
  ContractViolation,
} from '../types/api';

interface RuntimeSecurityViewProps {
  projectId?: string;
  token?: string;
}

export const RuntimeSecurityView: React.FC<RuntimeSecurityViewProps> = ({
  projectId = '00000000-0000-0000-0000-000000000001',
  token,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'sources' | 'verifications' | 'violations' | 'traces' | 'health'>('events');
  const [evidenceList, setEvidenceList] = useState<RuntimeEvidence[]>([]);
  const [sourcesList, setSourcesList] = useState<RuntimeEvidenceSource[]>([]);
  const [verificationsList, setVerificationsList] = useState<any[]>([]);
  const [violationsList, setViolationsList] = useState<ContractViolation[]>([]);
  const [healthData, setHealthData] = useState<RuntimeHealthResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSourceType, setFilterSourceType] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [filterTraceId, setFilterTraceId] = useState<string>('');
  const [selectedEvidence, setSelectedEvidence] = useState<RuntimeEvidence | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, srcRes, verRes, violRes, healthRes] = await Promise.all([
        apiClient.listProjectEvidence(projectId, {
          source_type: filterSourceType || undefined,
          event_type: filterEventType || undefined,
          trace_id: filterTraceId || undefined,
          limit: 100,
        }, token),
        apiClient.listRuntimeSources(projectId, token),
        apiClient.listRuntimeVerifications(projectId, {}, token),
        apiClient.listRuntimeViolations(projectId, {}, token),
        apiClient.getRuntimeHealth(token),
      ]);

      if (evRes.data) setEvidenceList(evRes.data);
      if (srcRes.data) setSourcesList(srcRes.data);
      if (verRes.data) setVerificationsList(verRes.data);
      if (violRes.data) setViolationsList(violRes.data);
      if (healthRes.data) setHealthData(healthRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load runtime security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, filterSourceType, filterEventType, filterTraceId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#f7fafc' }}>
            Runtime Evidence & Continuous Contract Verification
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a0aec0' }}>
            Authoritative runtime telemetry, deterministic contract evaluation, and continuous invariant verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px 14px',
              backgroundColor: loading ? '#4a5568' : '#2b6cb0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Live State'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #2d3748', paddingBottom: '8px' }}>
        {[
          { key: 'events', label: `Live Evidence (${evidenceList.length})` },
          { key: 'sources', label: `Evidence Sources (${sourcesList.length})` },
          { key: 'verifications', label: `Contract Verifications (${verificationsList.length})` },
          { key: 'violations', label: `Violations (${violationsList.length})` },
          { key: 'traces', label: 'Trace Explorer' },
          { key: 'health', label: 'Collector Health' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? '#3182ce' : '#1a202c',
              color: activeTab === tab.key ? '#ffffff' : '#a0aec0',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#742a2a', color: '#feb2b2', borderRadius: '4px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Tab 1: Live Evidence Explorer */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', backgroundColor: '#1a202c', padding: '10px 14px', borderRadius: '6px' }}>
            <input
              type="text"
              placeholder="Filter by Source Type (e.g. MCP, APPLICATION)..."
              value={filterSourceType}
              onChange={(e) => setFilterSourceType(e.target.value)}
              style={{ padding: '6px 10px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <input
              type="text"
              placeholder="Filter by Event Type (e.g. AGENT_ACTION)..."
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              style={{ padding: '6px 10px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <input
              type="text"
              placeholder="Filter by Trace ID..."
              value={filterTraceId}
              onChange={(e) => setFilterTraceId(e.target.value)}
              style={{ padding: '6px 10px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            {(filterSourceType || filterEventType || filterTraceId) && (
              <button
                onClick={() => { setFilterSourceType(''); setFilterEventType(''); setFilterTraceId(''); }}
                style={{ padding: '6px 10px', backgroundColor: '#4a5568', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* List or Empty State */}
          {evidenceList.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#1a202c', borderRadius: '8px', color: '#a0aec0' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#cbd5e0', marginBottom: '8px' }}>
                NO RUNTIME EVIDENCE RECEIVED
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                No runtime evidence source has transmitted events for this project yet. Real events appear automatically upon transmission.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 2, overflowY: 'auto', border: '1px solid #2d3748', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#e2e8f0' }}>
                  <thead style={{ backgroundColor: '#2d3748', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time (Occurred)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Source</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Event Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Action</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Resource</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceList.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvidence(ev)}
                        style={{
                          borderBottom: '1px solid #2d3748',
                          cursor: 'pointer',
                          backgroundColor: selectedEvidence?.id === ev.id ? '#2b6cb044' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '8px 12px' }}>{new Date(ev.occurred_at).toLocaleTimeString()}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#4a5568', fontSize: '0.75rem' }}>
                            {ev.source_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{ev.event_type}</td>
                        <td style={{ padding: '8px 12px' }}>{ev.subject_type}:{ev.subject_id || 'n/a'}</td>
                        <td style={{ padding: '8px 12px' }}>{ev.action_type || 'n/a'}</td>
                        <td style={{ padding: '8px 12px' }}>{ev.resource_type || 'n/a'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: ev.classification === 'CONFIDENTIAL' ? '#ecc94b' : '#a0aec0' }}>
                            {ev.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail Inspector */}
              {selectedEvidence && (
                <div style={{ flex: 1, backgroundColor: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', padding: '16px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#f7fafc' }}>Evidence Inspector</h3>
                    <button
                      onClick={() => setSelectedEvidence(null)}
                      style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      &times;
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#cbd5e0' }}>
                    <div><strong>Event ID:</strong> {selectedEvidence.event_id}</div>
                    <div><strong>Source ID:</strong> {selectedEvidence.source_id}</div>
                    <div><strong>Payload Hash:</strong> <code style={{ color: '#68d391' }}>{selectedEvidence.payload_hash.slice(0, 16)}...</code></div>
                    <div><strong>Occurred At:</strong> {new Date(selectedEvidence.occurred_at).toISOString()}</div>
                    <div><strong>Received At:</strong> {new Date(selectedEvidence.received_at).toISOString()}</div>
                    <div><strong>Trace ID:</strong> {selectedEvidence.trace_id || 'none'}</div>
                    <div><strong>Environment:</strong> {selectedEvidence.environment}</div>
                    <div><strong>Trust Level:</strong> {selectedEvidence.trust_level}</div>
                    <div><strong>Timestamp Quality:</strong> {selectedEvidence.timestamp_quality}</div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <strong>Normalized Payload:</strong>
                      <pre style={{ backgroundColor: '#0d1117', padding: '10px', borderRadius: '4px', fontSize: '0.75rem', overflowX: 'auto' }}>
                        {JSON.stringify(selectedEvidence.normalized_payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Evidence Sources */}
      {activeTab === 'sources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sourcesList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1a202c', borderRadius: '8px', color: '#a0aec0' }}>
              No evidence sources configured for this project yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {sourcesList.map(src => (
                <div key={src.id} style={{ backgroundColor: '#1a202c', border: '1px solid #2d3748', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#f7fafc' }}>{src.name}</h4>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: src.status === 'ACTIVE' ? '#22543d' : '#742a2a',
                      color: src.status === 'ACTIVE' ? '#9ae6b4' : '#feb2b2',
                    }}>
                      {src.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Source Type:</strong> {src.source_type}</div>
                    <div><strong>Last Event:</strong> {src.last_event_at ? new Date(src.last_event_at).toLocaleString() : 'None'}</div>
                    <div><strong>Last Seen:</strong> {src.last_seen_at ? new Date(src.last_seen_at).toLocaleString() : 'None'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Contract Verifications */}
      {activeTab === 'verifications' && (
        <div style={{ overflowY: 'auto', border: '1px solid #2d3748', borderRadius: '6px' }}>
          {verificationsList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1a202c', color: '#a0aec0' }}>
              No runtime contract verifications recorded yet. Verifications are evaluated upon receiving relevant telemetry.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#e2e8f0' }}>
              <thead style={{ backgroundColor: '#2d3748' }}>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Evaluated At</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Contract</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Verifier</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Evidence Evaluated</th>
                </tr>
              </thead>
              <tbody>
                {verificationsList.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #2d3748' }}>
                    <td style={{ padding: '10px 14px' }}>{new Date(v.evaluated_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{v.contract_name || v.contract_version_id}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: v.status === 'VERIFIED' ? '#22543d' : (v.status === 'VIOLATED' ? '#742a2a' : '#744210'),
                        color: v.status === 'VERIFIED' ? '#9ae6b4' : (v.status === 'VIOLATED' ? '#feb2b2' : '#fbd38d'),
                      }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{v.verifier_type}:{v.verifier_version}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {v.evidence_summary?.evidence_ids?.length || 0} events
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Violations */}
      {activeTab === 'violations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {violationsList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1a202c', borderRadius: '8px', color: '#9ae6b4' }}>
              ✓ No runtime security contract violations detected. All invariants satisfied or not yet applicable.
            </div>
          ) : (
            violationsList.map(viol => (
              <div key={viol.id} style={{ backgroundColor: '#1a202c', borderLeft: '4px solid #e53e3e', borderTop: '1px solid #2d3748', borderRight: '1px solid #2d3748', borderBottom: '1px solid #2d3748', borderRadius: '6px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#742a2a', color: '#feb2b2', fontWeight: 600, fontSize: '0.75rem' }}>
                      {viol.severity}
                    </span>
                    <h4 style={{ margin: 0, color: '#f7fafc', fontSize: '0.95rem' }}>{viol.violation_type}</h4>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{new Date(viol.detected_at).toLocaleString()}</span>
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', color: '#cbd5e0' }}>{viol.description}</p>
                <div style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'flex', gap: '16px' }}>
                  <div><strong>Subject:</strong> {viol.subject || 'n/a'}</div>
                  <div><strong>Action:</strong> {viol.action || 'n/a'}</div>
                  <div><strong>Resource:</strong> {viol.resource || 'n/a'}</div>
                  <div><strong>Status:</strong> {viol.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Trace Explorer */}
      {activeTab === 'traces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter Trace ID to visualize timeline..."
              value={filterTraceId}
              onChange={(e) => setFilterTraceId(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', backgroundColor: '#1a202c', color: '#fff', border: '1px solid #4a5568', borderRadius: '4px', fontSize: '0.85rem' }}
            />
          </div>

          {filterTraceId && (
            <div style={{ backgroundColor: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#f7fafc' }}>
                Correlated Trace Timeline: <code style={{ color: '#63b3ed' }}>{filterTraceId}</code>
              </h4>
              {evidenceList.filter(e => e.trace_id === filterTraceId).length === 0 ? (
                <div style={{ color: '#a0aec0', fontSize: '0.85rem' }}>No evidence matching this Trace ID.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {evidenceList
                    .filter(e => e.trace_id === filterTraceId)
                    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
                    .map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '80px', fontSize: '0.75rem', color: '#a0aec0', paddingTop: '2px' }}>
                          {new Date(item.occurred_at).toLocaleTimeString()}
                        </div>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#4299e1',
                          marginTop: '6px',
                        }} />
                        <div style={{ flex: 1, backgroundColor: '#2d3748', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', color: '#e2e8f0' }}>
                          <div style={{ fontWeight: 600, color: '#90cdf4' }}>{item.event_type} ({item.source_type})</div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e0', marginTop: '4px' }}>
                            Subject: {item.subject_type}:{item.subject_id} | Action: {item.action_type} | Resource: {item.resource_type}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Collector Health */}
      {activeTab === 'health' && (
        <div style={{ backgroundColor: '#1a202c', border: '1px solid #2d3748', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#f7fafc' }}>Evidence Collectors Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {healthData?.collectors && Object.entries(healthData.collectors).map(([collName, collStatus]) => (
              <div key={collName} style={{ backgroundColor: '#2d3748', borderRadius: '6px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#e2e8f0', fontSize: '0.9rem' }}>
                  {collName} Collector
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: collStatus === 'active' ? '#22543d' : '#744210',
                  color: collStatus === 'active' ? '#9ae6b4' : '#fbd38d',
                  textTransform: 'uppercase',
                }}>
                  {collStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
