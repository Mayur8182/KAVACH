import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type {
  AbuseOverviewResponse,
  RateLimitPolicySummary,
  RateLimitDecisionSummary,
  AbuseDetectionSignalSummary,
  TemporaryBlockSummary,
  PermanentBlockSummary,
} from '../../types/api';

export const AbuseSecurityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluator' | 'ingest' | 'signals' | 'blocks' | 'policies'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<AbuseOverviewResponse | null>(null);
  const [policies, setPolicies] = useState<RateLimitPolicySummary[]>([]);
  const [decisions, setDecisions] = useState<RateLimitDecisionSummary[]>([]);
  const [signals, setSignals] = useState<AbuseDetectionSignalSummary[]>([]);
  const [tempBlocks, setTempBlocks] = useState<TemporaryBlockSummary[]>([]);
  const [permBlocks, setPermBlocks] = useState<PermanentBlockSummary[]>([]);

  // Evaluator Form State
  const [evalEndpoint, setEvalEndpoint] = useState<string>('/api/v1/auth/login');
  const [evalMethod, setEvalMethod] = useState<string>('POST');
  const [evalIp, setEvalIp] = useState<string>('198.51.100.42');
  const [evalAccount, setEvalAccount] = useState<string>('admin@company.com');
  const [evalAgentId, setEvalAgentId] = useState<string>('');
  const [evalToolName, setEvalToolName] = useState<string>('');
  const [evalMode, setEvalMode] = useState<'LIVE' | 'SIMULATION'>('LIVE');
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState<boolean>(false);

  // Telemetry Ingest Form State
  const [ingestType, setIngestType] = useState<string>('AUTHENTICATION');
  const [ingestEndpoint, setIngestEndpoint] = useState<string>('/api/v1/auth/login');
  const [ingestStatus, setIngestStatus] = useState<string>('INVALID_CREDENTIALS');
  const [ingestIp, setIngestIp] = useState<string>('203.0.113.88');
  const [ingestAccount, setIngestAccount] = useState<string>('victim@company.com');
  const [ingestAgentId, setIngestAgentId] = useState<string>('');
  const [ingestToolName, setIngestToolName] = useState<string>('');
  const [ingestResult, setIngestResult] = useState<any>(null);
  const [ingestLoading, setIngestLoading] = useState<boolean>(false);

  // Manual Block Form State
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockTarget, setBlockTarget] = useState<string>('');
  const [blockType, setBlockType] = useState<string>('IP');
  const [blockReason, setBlockReason] = useState<string>('');
  const [blockPermanent, setBlockPermanent] = useState<boolean>(false);
  const [blockDuration, setBlockDuration] = useState<number>(60);

  // Policy Creation Form State
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [newPolicyName, setNewPolicyName] = useState<string>('');
  const [newPolicyScope, setNewPolicyScope] = useState<string>('GLOBAL');
  const [newPolicyAlgorithm, setNewPolicyAlgorithm] = useState<string>('TOKEN_BUCKET');
  const [newPolicyLimit, setNewPolicyLimit] = useState<number>(100);
  const [newPolicyWindow, setNewPolicyWindow] = useState<number>(60);
  const [newPolicyAction, setNewPolicyAction] = useState<string>('THROTTLE');
  const [newPolicyDryRun, setNewPolicyDryRun] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, polRes, decRes, sigRes, blkRes] = await Promise.all([
        apiClient.getAbuseOverview(),
        apiClient.listRateLimitPolicies(),
        apiClient.listRateLimitDecisions(50),
        apiClient.listAbuseSignals(50),
        apiClient.listBlocks(),
      ]);

      if (!ovRes.isError && ovRes.data) setOverview(ovRes.data);
      if (!polRes.isError && polRes.data) setPolicies(polRes.data);
      if (!decRes.isError && decRes.data) setDecisions(decRes.data);
      if (!sigRes.isError && sigRes.data) setSignals(sigRes.data);
      if (!blkRes.isError && blkRes.data) {
        setTempBlocks(blkRes.data.temporary_blocks || []);
        setPermBlocks(blkRes.data.permanent_blocks || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load abuse protection telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const payload: any = {
        endpoint: evalEndpoint,
        http_method: evalMethod,
        ip_address: evalIp,
        account_identifier: evalAccount || undefined,
        agent_id: evalAgentId || undefined,
        tool_name: evalToolName || undefined,
      };

      const res = evalMode === 'LIVE'
        ? await apiClient.evaluateRateLimit(payload)
        : await apiClient.simulateRateLimit(payload);

      if (!res.isError && res.data) {
        setEvalResult(res.data);
        if (evalMode === 'LIVE') {
          // Refresh overview and decisions
          const [ovRes, decRes] = await Promise.all([
            apiClient.getAbuseOverview(),
            apiClient.listRateLimitDecisions(50),
          ]);
          if (!ovRes.isError && ovRes.data) setOverview(ovRes.data);
          if (!decRes.isError && decRes.data) setDecisions(decRes.data);
        }
      } else {
        setEvalResult({ error: res.error?.message || 'Evaluation failed' });
      }
    } catch (err: any) {
      setEvalResult({ error: err?.message || 'Network error' });
    } finally {
      setEvalLoading(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestLoading(true);
    setIngestResult(null);
    try {
      const payload: any = {
        event_type: ingestType,
        endpoint: ingestEndpoint,
        result_status: ingestStatus,
        ip_address: ingestIp,
        account_identifier: ingestAccount || undefined,
        agent_id: ingestAgentId || undefined,
        tool_name: ingestToolName || undefined,
      };

      const res = await apiClient.ingestAbuseEvent(payload);
      if (!res.isError && res.data) {
        setIngestResult(res.data);
        fetchData();
      } else {
        setIngestResult({ error: res.error?.message || 'Ingestion failed' });
      }
    } catch (err: any) {
      setIngestResult({ error: err?.message || 'Network error' });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.createBlock({
        block_type: blockType,
        target_value: blockTarget,
        reason: blockReason,
        permanent: blockPermanent,
        duration_minutes: blockDuration,
      });
      if (!res.isError) {
        setShowBlockModal(false);
        setBlockTarget('');
        setBlockReason('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await apiClient.deleteBlock(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.createRateLimitPolicy({
        name: newPolicyName,
        scope: newPolicyScope,
        algorithm: newPolicyAlgorithm,
        limit_count: Number(newPolicyLimit),
        window_seconds: Number(newPolicyWindow),
        action: newPolicyAction,
        dry_run: newPolicyDryRun,
        enabled: true,
      });
      if (!res.isError) {
        setShowPolicyModal(false);
        setNewPolicyName('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', background: '#0b0f19', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
              Thing Protect → Adaptive Rate Limiting & Abuse Defense
            </h1>
            <span style={{ fontSize: '11px', background: '#064e3b', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
              STEP 26 ACTIVE
            </span>
            <span style={{ fontSize: '11px', background: '#1e1b4b', color: '#818cf8', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
              DISTRIBUTED STATE: IN-MEMORY RESILIENT
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Identity-aware, multi-dimensional rate limiting, brute-force mitigation, credential stuffing detection, and automated enforcement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowBlockModal(true)}
            style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
          >
            + Create Block
          </button>
          <button
            onClick={() => setShowPolicyModal(true)}
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
          >
            + New Policy
          </button>
          <button
            onClick={fetchData}
            style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ background: '#1e293b', color: '#38bdf8', padding: '8px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px' }}>
          Loading real-time abuse telemetry from database...
        </div>
      )}

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #b91c1c', color: '#fca5a5', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
          Error: {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>Evaluated Requests</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginTop: '6px' }}>
            {overview ? overview.total_requests_evaluated.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Across all identities</div>
        </div>

        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '600' }}>Throttled Requests</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', marginTop: '6px' }}>
            {overview ? overview.throttled_requests.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Rate limit triggered</div>
        </div>

        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#ef4444', textTransform: 'uppercase', fontWeight: '600' }}>Blocked Requests</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginTop: '6px' }}>
            {overview ? overview.blocked_requests.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Active blocklist enforcement</div>
        </div>

        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#ec4899', textTransform: 'uppercase', fontWeight: '600' }}>Brute Force Signals</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ec4899', marginTop: '6px' }}>
            {overview ? overview.brute_force_signals : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Repeated auth failures</div>
        </div>

        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#a855f7', textTransform: 'uppercase', fontWeight: '600' }}>Stuffing & Spraying</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#a855f7', marginTop: '6px' }}>
            {overview ? overview.credential_stuffing_signals : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Multi-account probing</div>
        </div>

        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '600' }}>Active Blocks</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#38bdf8', marginTop: '6px' }}>
            {overview ? (overview.active_temporary_blocks + overview.active_permanent_blocks) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {overview ? `${overview.active_temporary_blocks} temp, ${overview.active_permanent_blocks} perm` : '—'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '20px' }}>
        {[
          { key: 'overview', label: 'Overview & Top Targets' },
          { key: 'evaluator', label: 'Live Evaluator & Simulation' },
          { key: 'ingest', label: 'Telemetry Ingest & Detector' },
          { key: 'signals', label: `Threat Signals (${signals.length})` },
          { key: 'blocks', label: `Active Blocks (${tempBlocks.length + permBlocks.length})` },
          { key: 'policies', label: `Policies (${policies.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.key ? '#1e293b' : 'transparent',
              color: activeTab === tab.key ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '600' : '500',
              fontSize: '13px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Top Targeted Accounts */}
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Top Targeted Accounts</h3>
            {overview && overview.top_targeted_accounts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overview.top_targeted_accounts.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <span style={{ fontFamily: 'monospace', color: '#e2e8f0', fontSize: '13px' }}>{item.account}</span>
                    <span style={{ background: '#ef444422', color: '#f87171', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                      {item.event_count} failed events
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No targeted account activity recorded yet.</div>
            )}
          </div>

          {/* Top Targeted Endpoints */}
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Top Targeted Endpoints</h3>
            {overview && overview.top_targeted_endpoints.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overview.top_targeted_endpoints.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '13px' }}>{item.endpoint}</span>
                    <span style={{ background: '#3b82f622', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                      {item.request_count} evaluations
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No endpoint activity evaluated yet.</div>
            )}
          </div>

          {/* Recent Decisions Audit */}
          <div style={{ gridColumn: 'span 2', background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Live Rate Limit Decision Audit Trail</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>TIMESTAMP</th>
                    <th style={{ padding: '8px' }}>IDENTITY</th>
                    <th style={{ padding: '8px' }}>ENDPOINT</th>
                    <th style={{ padding: '8px' }}>ALGORITHM</th>
                    <th style={{ padding: '8px' }}>DECISION</th>
                    <th style={{ padding: '8px' }}>STATUS</th>
                    <th style={{ padding: '8px' }}>TOKENS LEFT</th>
                    <th style={{ padding: '8px' }}>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.length > 0 ? (
                    decisions.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', color: '#64748b', whiteSpace: 'nowrap' }}>{d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : '—'}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#cbd5e1' }}>{d.identity_key}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.endpoint}</td>
                        <td style={{ padding: '8px', color: '#94a3b8' }}>{d.algorithm_used}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                            background: d.decision === 'ALLOW' ? '#064e3b' : (d.decision === 'BLOCK' ? '#7f1d1d' : '#78350f'),
                            color: d.decision === 'ALLOW' ? '#34d399' : (d.decision === 'BLOCK' ? '#fca5a5' : '#fcd34d'),
                          }}>
                            {d.decision}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{d.execution_status}</td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{d.tokens_remaining !== null ? d.tokens_remaining : '—'}</td>
                        <td style={{ padding: '8px', color: '#94a3b8', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No live rate limit decisions evaluated yet. Use the Evaluator tab to test!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE EVALUATOR & SIMULATION */}
      {activeTab === 'evaluator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Request Rate Limit Tester</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
              Simulates a live API request and evaluates it against authoritative policies, token buckets, and active blocks.
            </p>
            <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Evaluation Mode</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="mode" value="LIVE" checked={evalMode === 'LIVE'} onChange={() => setEvalMode('LIVE')} />
                    Live Enforcement (Records Decision Audit)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="mode" value="SIMULATION" checked={evalMode === 'SIMULATION'} onChange={() => setEvalMode('SIMULATION')} />
                    Dry-Run Simulation (Zero State Alteration)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Endpoint</label>
                <input
                  type="text"
                  value={evalEndpoint}
                  onChange={(e) => setEvalEndpoint(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>HTTP Method</label>
                  <select
                    value={evalMethod}
                    onChange={(e) => setEvalMethod(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Client IP Address</label>
                  <input
                    type="text"
                    value={evalIp}
                    onChange={(e) => setEvalIp(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Account / User ID (Optional)</label>
                <input
                  type="text"
                  value={evalAccount}
                  onChange={(e) => setEvalAccount(e.target.value)}
                  placeholder="e.g. finance_admin@corp.net"
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Agent ID (Optional)</label>
                  <input
                    type="text"
                    value={evalAgentId}
                    onChange={(e) => setEvalAgentId(e.target.value)}
                    placeholder="agent-security-bot"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tool Name (Optional)</label>
                  <input
                    type="text"
                    value={evalToolName}
                    onChange={(e) => setEvalToolName(e.target.value)}
                    placeholder="delete_database"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={evalLoading}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}
              >
                {evalLoading ? 'Evaluating Policy...' : 'Execute Evaluation'}
              </button>
            </form>
          </div>

          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Evaluation Outcome</h3>
            {evalResult ? (
              <div>
                <div style={{
                  padding: '16px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  background: evalResult.decision === 'ALLOW' ? '#064e3b33' : (evalResult.decision === 'BLOCK' ? '#7f1d1d33' : '#78350f33'),
                  border: `1px solid ${evalResult.decision === 'ALLOW' ? '#059669' : (evalResult.decision === 'BLOCK' ? '#dc2626' : '#d97706')}`,
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: evalResult.decision === 'ALLOW' ? '#34d399' : (evalResult.decision === 'BLOCK' ? '#fca5a5' : '#fcd34d') }}>
                    DECISION: {evalResult.decision || evalResult.simulated_decision}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '6px', color: '#cbd5e1' }}>
                    {evalResult.reason}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>ALGORITHM</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginTop: '2px' }}>{evalResult.algorithm_used}</div>
                  </div>
                  <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>TOKENS REMAINING</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginTop: '2px' }}>{evalResult.tokens_remaining ?? 'N/A'}</div>
                  </div>
                  <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>RETRY AFTER</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginTop: '2px' }}>{evalResult.retry_after_seconds ? `${evalResult.retry_after_seconds}s` : '0s'}</div>
                  </div>
                  <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>POLICY MATCHED</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginTop: '2px' }}>{evalResult.policy_name}</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>EVIDENCE & CONTEXT PAYLOAD:</div>
                <pre style={{ background: '#0b0f19', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '11px', color: '#38bdf8', overflowX: 'auto' }}>
                  {JSON.stringify(evalResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '48px', fontSize: '13px' }}>
                Fill out the form and submit to view live evaluation and cryptographic token metrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TELEMETRY INGEST & DETECTOR */}
      {activeTab === 'ingest' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Telemetry Ingestion Simulator</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
              Ingests raw authentication, MFA, token, or agent telemetry. Ingesting multiple failed events triggers deterministic brute force or credential stuffing detections with automated temporary blocks.
            </p>
            <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Event Type</label>
                  <select
                    value={ingestType}
                    onChange={(e) => setIngestType(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                    <option value="MFA">MFA</option>
                    <option value="TOKEN">TOKEN</option>
                    <option value="SESSION">SESSION</option>
                    <option value="AGENT_TOOL">AGENT_TOOL</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Result Status</label>
                  <select
                    value={ingestStatus}
                    onChange={(e) => setIngestStatus(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="INVALID_CREDENTIALS">INVALID_CREDENTIALS</option>
                    <option value="ACCOUNT_NOT_FOUND">ACCOUNT_NOT_FOUND</option>
                    <option value="MFA_FAILED">MFA_FAILED</option>
                    <option value="TOKEN_INVALID">TOKEN_INVALID</option>
                    <option value="SUCCESS">SUCCESS</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Endpoint</label>
                <input
                  type="text"
                  value={ingestEndpoint}
                  onChange={(e) => setIngestEndpoint(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Attacker IP Address</label>
                  <input
                    type="text"
                    value={ingestIp}
                    onChange={(e) => setIngestIp(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Account</label>
                  <input
                    type="text"
                    value={ingestAccount}
                    onChange={(e) => setIngestAccount(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Agent ID (if agent)</label>
                  <input
                    type="text"
                    value={ingestAgentId}
                    onChange={(e) => setIngestAgentId(e.target.value)}
                    placeholder="agent-runner-x"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tool Name (if MCP tool)</label>
                  <input
                    type="text"
                    value={ingestToolName}
                    onChange={(e) => setIngestToolName(e.target.value)}
                    placeholder="delete_database"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ingestLoading}
                style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}
              >
                {ingestLoading ? 'Ingesting Event...' : 'Ingest Telemetry Event'}
              </button>
            </form>
          </div>

          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Detection Engine Feedback</h3>
            {ingestResult ? (
              <div>
                <div style={{ padding: '14px', borderRadius: '6px', background: '#0b0f19', border: '1px solid #1e293b', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>RAW EVENT SHA-256 DIGEST:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#34d399', wordBreak: 'break-all', marginTop: '4px' }}>
                    {ingestResult.raw_hash}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>SIGNALS DETECTED:</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: ingestResult.signals_generated_count > 0 ? '#ef4444' : '#34d399', marginTop: '2px' }}>
                    {ingestResult.signals_generated_count} signals generated
                  </div>
                </div>

                {ingestResult.signals && ingestResult.signals.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ingestResult.signals.map((s: any, idx: number) => (
                      <div key={idx} style={{ background: '#7f1d1d22', border: '1px solid #dc2626', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: '#fca5a5', fontSize: '13px' }}>{s.signal_type}</span>
                          <span style={{ fontSize: '11px', background: '#dc2626', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{s.severity}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>Target: {s.target_identity}</div>
                        {s.action_taken && (
                          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', fontWeight: '600' }}>
                            Mitigation Applied: {s.action_taken}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '48px', fontSize: '13px' }}>
                Ingest authentication or API failure events to test behavioral detection rules.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: THREAT SIGNALS */}
      {activeTab === 'signals' && (
        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Active Abuse & Brute-Force Signals</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>DETECTED AT</th>
                  <th style={{ padding: '8px' }}>SIGNAL TYPE</th>
                  <th style={{ padding: '8px' }}>SEVERITY</th>
                  <th style={{ padding: '8px' }}>TARGET IDENTITY</th>
                  <th style={{ padding: '8px' }}>TARGET RESOURCE</th>
                  <th style={{ padding: '8px' }}>CONFIDENCE</th>
                  <th style={{ padding: '8px' }}>ACTION TAKEN</th>
                  <th style={{ padding: '8px' }}>SOC ALERT REF</th>
                </tr>
              </thead>
              <tbody>
                {signals.length > 0 ? (
                  signals.map((sig) => (
                    <tr key={sig.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {sig.detected_at ? new Date(sig.detected_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '8px', fontWeight: '600', color: '#f8fafc' }}>{sig.signal_type}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                          background: sig.severity === 'CRITICAL' ? '#7f1d1d' : (sig.severity === 'HIGH' ? '#9a3412' : '#854d0e'),
                          color: sig.severity === 'CRITICAL' ? '#fca5a5' : (sig.severity === 'HIGH' ? '#fdba74' : '#fef08a'),
                        }}>
                          {sig.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>{sig.target_identity}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94a3b8' }}>{sig.target_resource}</td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{Math.round(sig.confidence_score * 100)}%</td>
                      <td style={{ padding: '8px', color: '#34d399', fontWeight: '600' }}>{sig.action_taken || 'ALERT_ONLY'}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#a78bfa' }}>{sig.escalation_reference || 'NONE'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No abuse signals detected yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVE BLOCKS */}
      {activeTab === 'blocks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Temporary Blocks */}
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Temporary Blocks (Automated & Time-Bounded)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>TYPE</th>
                    <th style={{ padding: '8px' }}>TARGET VALUE</th>
                    <th style={{ padding: '8px' }}>REASON</th>
                    <th style={{ padding: '8px' }}>EXPIRES AT</th>
                    <th style={{ padding: '8px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {tempBlocks.length > 0 ? (
                    tempBlocks.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '600' }}>{b.block_type}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#f8fafc' }}>{b.target_value}</td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{b.reason}</td>
                        <td style={{ padding: '8px', color: '#f59e0b' }}>{b.expires_at ? new Date(b.expires_at).toLocaleTimeString() : '—'}</td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => handleDeleteBlock(b.id)}
                            style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No active temporary blocks.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permanent Blocks */}
          <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Permanent Blocks (Authorized Administrative)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>TYPE</th>
                    <th style={{ padding: '8px' }}>TARGET VALUE</th>
                    <th style={{ padding: '8px' }}>REASON</th>
                    <th style={{ padding: '8px' }}>AUTHORIZED BY</th>
                    <th style={{ padding: '8px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {permBlocks.length > 0 ? (
                    permBlocks.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px', color: '#ef4444', fontWeight: '600' }}>{b.block_type}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#f8fafc' }}>{b.target_value}</td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{b.reason}</td>
                        <td style={{ padding: '8px', color: '#94a3b8' }}>{b.authorized_by}</td>
                        <td style={{ padding: '8px' }}>
                          <button
                            onClick={() => handleDeleteBlock(b.id)}
                            style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No permanent blocks active.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: POLICIES */}
      {activeTab === 'policies' && (
        <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Configured Rate Limit Policies</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>POLICY NAME</th>
                  <th style={{ padding: '8px' }}>SCOPE</th>
                  <th style={{ padding: '8px' }}>PRIORITY</th>
                  <th style={{ padding: '8px' }}>ALGORITHM</th>
                  <th style={{ padding: '8px' }}>LIMIT / WINDOW</th>
                  <th style={{ padding: '8px' }}>ACTION</th>
                  <th style={{ padding: '8px' }}>DRY RUN</th>
                  <th style={{ padding: '8px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {policies.length > 0 ? (
                  policies.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: '600', color: '#f8fafc' }}>{p.name}</td>
                      <td style={{ padding: '8px', color: '#38bdf8' }}>{p.scope}</td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{p.priority}</td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{p.algorithm}</td>
                      <td style={{ padding: '8px', color: '#f8fafc' }}>{p.limit_count} req / {p.window_seconds}s</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ background: '#3b82f622', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {p.action}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        {p.dry_run ? (
                          <span style={{ color: '#f59e0b', fontWeight: '600' }}>YES</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>NO</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: p.enabled ? '#34d399' : '#64748b', fontWeight: '600' }}>
                          {p.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No custom policies configured. System default conservative policy applies.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE BLOCK MODAL */}
      {showBlockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#131b2e', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#f8fafc' }}>Add Blocklist Target</h3>
            <form onSubmit={handleCreateBlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Type</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                >
                  <option value="IP">IP Address</option>
                  <option value="ACCOUNT">Account / Username</option>
                  <option value="AGENT">Agent ID</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Value</label>
                <input
                  type="text"
                  value={blockTarget}
                  onChange={(e) => setBlockTarget(e.target.value)}
                  placeholder="e.g. 198.51.100.99"
                  required
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Reason</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Suspected brute force / botnet"
                  required
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                <input
                  type="checkbox"
                  id="perm"
                  checked={blockPermanent}
                  onChange={(e) => setBlockPermanent(e.target.checked)}
                />
                <label htmlFor="perm" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer' }}>Permanent Block (Authorized by Admin)</label>
              </div>

              {!blockPermanent && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Duration (Minutes)</label>
                  <input
                    type="number"
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(Number(e.target.value))}
                    min="1"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Enforce Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE POLICY MODAL */}
      {showPolicyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#131b2e', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#f8fafc' }}>Create Rate Limit Policy</h3>
            <form onSubmit={handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Policy Name</label>
                <input
                  type="text"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  placeholder="e.g. Sensitive Auth Throttler"
                  required
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Algorithm</label>
                  <select
                    value={newPolicyAlgorithm}
                    onChange={(e) => setNewPolicyAlgorithm(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                  >
                    <option value="TOKEN_BUCKET">Token Bucket</option>
                    <option value="SLIDING_WINDOW">Sliding Window</option>
                    <option value="LEAKY_BUCKET">Leaky Bucket</option>
                    <option value="ADAPTIVE">Adaptive (Trust + Threat)</option>
                    <option value="CONCURRENCY_LIMIT">Concurrency Limit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Scope</label>
                  <select
                    value={newPolicyScope}
                    onChange={(e) => setNewPolicyScope(e.target.value)}
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                  >
                    <option value="GLOBAL">Global</option>
                    <option value="ENDPOINT">Endpoint Specific</option>
                    <option value="USER">User / Account</option>
                    <option value="AGENT">AI Agent</option>
                    <option value="TOOL">MCP Tool</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Request Limit</label>
                  <input
                    type="number"
                    value={newPolicyLimit}
                    onChange={(e) => setNewPolicyLimit(Number(e.target.value))}
                    min="1"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Window (Seconds)</label>
                  <input
                    type="number"
                    value={newPolicyWindow}
                    onChange={(e) => setNewPolicyWindow(Number(e.target.value))}
                    min="1"
                    style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Exceed Action</label>
                <select
                  value={newPolicyAction}
                  onChange={(e) => setNewPolicyAction(e.target.value)}
                  style={{ width: '100%', background: '#0b0f19', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px' }}
                >
                  <option value="THROTTLE">THROTTLE (429 Retry-After)</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="CHALLENGE">REQUIRE CHALLENGE / MFA</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                <input
                  type="checkbox"
                  id="dryrun"
                  checked={newPolicyDryRun}
                  onChange={(e) => setNewPolicyDryRun(e.target.checked)}
                />
                <label htmlFor="dryrun" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer' }}>Dry Run Mode (WOULD_THROTTLE without blocking)</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
