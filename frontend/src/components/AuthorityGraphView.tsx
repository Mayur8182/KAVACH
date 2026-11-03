import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type {
  AuthorityGraphResponse,
  AuthorityChainResponse,
  EffectiveAuthorityResponse,
  AgentDelegation,
  AgentDataFlow,
  Agent,
} from '../types/api';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
  LayersIcon,
  ShieldIcon,
  TerminalIcon,
} from './Icons';

interface AuthorityGraphViewProps {
  projectId?: string;
  projectName?: string;
}

export const AuthorityGraphView: React.FC<AuthorityGraphViewProps> = ({
  projectId = '00000000-0000-0000-0000-000000000001',
  projectName = 'Default Production Project',
}) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'effective' | 'delegations' | 'dataflows'>('graph');
  const [graphData, setGraphData] = useState<AuthorityGraphResponse | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [effectiveAuthority, setEffectiveAuthority] = useState<EffectiveAuthorityResponse | null>(null);
  const [authorityChain, setAuthorityChain] = useState<AuthorityChainResponse | null>(null);
  const [delegations, setDelegations] = useState<AgentDelegation[]>([]);
  const [dataFlows, setDataFlows] = useState<AgentDataFlow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delegation modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [delegatorId, setDelegatorId] = useState<string>('');
  const [delegateId, setDelegateId] = useState<string>('');
  const [actionsInput, setActionsInput] = useState<string>('SCAN_EXECUTE,FINDING_READ');
  const [environmentScope, setEnvironmentScope] = useState<string>('DEVELOPMENT');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [allowFurther, setAllowFurther] = useState<boolean>(false);
  const [reasonInput, setReasonInput] = useState<string>('Enable security scanning agent to execute analysis');

  // Data flow modal state
  const [showDataFlowModal, setShowDataFlowModal] = useState<boolean>(false);
  const [dfSourceId, setDfSourceId] = useState<string>('');
  const [dfDestId, setDfDestId] = useState<string>('');
  const [dfDataType, setDfDataType] = useState<string>('SECURITY_FINDINGS');
  const [dfClassification, setDfClassification] = useState<'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SENSITIVE' | 'SECRET' | 'RESTRICTED'>('INTERNAL');
  const [dfPurpose, setDfPurpose] = useState<string>('Analyze repository vulnerabilities');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [graphRes, agentsRes] = await Promise.all([
        apiClient.getProjectAuthorityGraph(projectId),
        apiClient.listProjectAgents(projectId),
      ]);

      if (graphRes.data) {
        setGraphData(graphRes.data);
      }
      if (agentsRes.data) {
        setAgents(agentsRes.data);
        if (!selectedAgentId && agentsRes.data.length > 0) {
          setSelectedAgentId(agentsRes.data[0].id);
        }
        if (!delegatorId && agentsRes.data.length > 0) {
          setDelegatorId(agentsRes.data[0].id);
        }
        if (!delegateId && agentsRes.data.length > 1) {
          setDelegateId(agentsRes.data[1].id);
        }
        if (!dfSourceId && agentsRes.data.length > 0) {
          setDfSourceId(agentsRes.data[0].id);
        }
        if (!dfDestId && agentsRes.data.length > 1) {
          setDfDestId(agentsRes.data[1].id);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load authority graph data');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedAgentId, delegatorId, delegateId, dfSourceId, dfDestId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load agent-specific effective authority & chain
  const fetchAgentAuthority = useCallback(async (agentId: string) => {
    if (!agentId) return;
    try {
      const [effRes, chainRes, delRes, dfRes] = await Promise.all([
        apiClient.getAgentEffectiveAuthority(agentId),
        apiClient.getAgentAuthorityChain(agentId),
        apiClient.listAgentDelegations(agentId),
        apiClient.listAgentDataFlows(agentId),
      ]);
      if (effRes.data) setEffectiveAuthority(effRes.data);
      if (chainRes.data) setAuthorityChain(chainRes.data);
      if (delRes.data) setDelegations(delRes.data);
      if (dfRes.data) setDataFlows(dfRes.data);
    } catch (e: unknown) {
      console.error('Failed to load agent authority details', e);
    }
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentAuthority(selectedAgentId);
    }
  }, [selectedAgentId, fetchAgentAuthority]);

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatorId || !delegateId) {
      setError('Please select both delegator and delegate agents.');
      return;
    }
    const actions = actionsInput.split(',').map((s) => s.trim()).filter(Boolean);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresInDays);

    const payload = {
      delegate_agent_id: delegateId,
      authority: {
        actions,
        resource_type: 'PROJECT',
        resource_scope: { project_id: projectId },
        environment: environmentScope,
        allow_further_delegation: allowFurther,
      },
      expires_at: expDate.toISOString(),
      allow_further_delegation: allowFurther,
      reason: reasonInput,
    };

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const res = await apiClient.createDelegation(delegatorId, payload);
    setLoading(false);

    if (res.isError) {
      setError(res.error?.message || 'Delegation request was rejected by deterministic authority engine.');
    } else {
      setSuccessMessage(`Delegation created successfully with status ${res.data?.status}!`);
      setShowCreateModal(false);
      fetchData();
      if (selectedAgentId) fetchAgentAuthority(selectedAgentId);
    }
  };

  const handleRevokeDelegation = async (delegationId: string) => {
    if (!window.confirm('Are you sure you want to revoke this delegation? All dependent authority in child subtrees will be immediately revoked!')) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const res = await apiClient.revokeDelegation(delegationId, 'Governance administrative revocation');
    setLoading(false);

    if (res.isError) {
      setError(res.error?.message || 'Failed to revoke delegation.');
    } else {
      setSuccessMessage(`Revocation propagated: ${res.data?.revoked_count || 1} delegation node(s) revoked in subtree.`);
      fetchData();
      if (selectedAgentId) fetchAgentAuthority(selectedAgentId);
    }
  };

  const handleCreateDataFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dfSourceId || !dfDestId) {
      setError('Please select source and destination agents.');
      return;
    }

    const payload = {
      destination_agent_id: dfDestId,
      data: {
        type: dfDataType,
        classification: dfClassification,
      },
      source_resource: {
        type: 'SCAN',
        id: projectId,
      },
      purpose: dfPurpose,
    };

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const res = await apiClient.requestDataFlow(dfSourceId, payload);
    setLoading(false);

    if (res.isError) {
      setError(res.error?.message || 'Data-flow request was denied by data governance evaluator.');
    } else {
      setSuccessMessage(`Data flow evaluated: ${res.data?.status} (${res.data?.decision})`);
      setShowDataFlowModal(false);
      if (selectedAgentId) fetchAgentAuthority(selectedAgentId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayersIcon size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Authority Graph & Agent Delegation Control &mdash; {projectName}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Deterministic authority subset enforcement (Delegated &le; Delegator), multi-hop acyclic chains, subtree revocation, and data-flow governance.
              </p>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="primary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            <ShieldIcon size={14} /> Delegate Authority
          </button>
          <button
            onClick={() => setShowDataFlowModal(true)}
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            <TerminalIcon size={14} /> Request Data Flow
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="icon-btn"
            title="Refresh graph data"
            style={{ padding: '8px 12px' }}
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-success)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <CheckCircleIcon size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('graph')}
          className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'graph' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'graph' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          Authority Graph Visualizer ({graphData?.total_edges || 0} Edges)
        </button>
        <button
          onClick={() => setActiveTab('effective')}
          className={`tab-btn ${activeTab === 'effective' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'effective' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'effective' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          Effective Authority & Chain Inspector
        </button>
        <button
          onClick={() => setActiveTab('delegations')}
          className={`tab-btn ${activeTab === 'delegations' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'delegations' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'delegations' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          Active & Historical Delegations
        </button>
        <button
          onClick={() => setActiveTab('dataflows')}
          className={`tab-btn ${activeTab === 'dataflows' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'dataflows' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'dataflows' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          Data-Flow Governance
        </button>
      </div>

      {/* TAB 1: AUTHORITY GRAPH VISUALIZER */}
      {activeTab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
              Project Authority Graph — Directed Delegation Edges
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Real graph constructed from persistent PostgreSQL edges. Nodes represent registered project agents; directed arrows indicate delegated authority chains with exact action bounds.
            </p>

            {(!graphData?.edges || graphData.edges.length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <LayersIcon size={32} />
                <p style={{ marginTop: '12px', fontSize: '14px' }}>No active authority delegation edges found in this project.</p>
                <p style={{ fontSize: '12px' }}>Use "Delegate Authority" to establish a bounded authority relationship between agents.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {graphData.edges.map((edge) => {
                  const source = graphData.nodes.find((n) => n.id === edge.source_agent_id);
                  const target = graphData.nodes.find((n) => n.id === edge.target_agent_id);
                  const actions = (edge.authority?.actions as string[]) || [];

                  return (
                    <div
                      key={edge.id}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)' }}>
                            HOP DEPTH: {edge.depth}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {source?.name || edge.source_agent_id.substring(0, 8)}
                          </span>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>&rarr;</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {target?.name || edge.target_agent_id.substring(0, 8)}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', backgroundColor: edge.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: edge.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {edge.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Delegation: <code>{edge.delegation_id.substring(0, 8)}</code>
                          </span>
                          {edge.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevokeDelegation(edge.delegation_id)}
                              style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Revoke Subtree
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edge Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Delegated Actions:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {actions.map((act) => (
                              <span key={act} style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontSize: '11px', fontFamily: 'monospace' }}>
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Environment & Scope:</span>
                          <div>
                            <strong>Env:</strong> {(edge.authority?.environment as string) || 'DEVELOPMENT'} &bull; <strong>Resource:</strong> {(edge.authority?.resource_type as string) || 'PROJECT'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Validity & Expiration:</span>
                          <div>
                            {edge.expires_at ? new Date(edge.expires_at).toLocaleString() : 'No expiration'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EFFECTIVE AUTHORITY & CHAIN INSPECTOR */}
      {activeTab === 'effective' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Effective Authority Resolution</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Resolves direct role permissions combined with validated incoming active delegations, strictly verifying delegator health and preserving provenance.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select Agent:</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.agent_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {effectiveAuthority ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Agent Status</span>
                    <strong style={{ fontSize: '14px', color: effectiveAuthority.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {effectiveAuthority.status}
                    </strong>
                  </div>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Trust Level</span>
                    <strong style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>
                      {effectiveAuthority.trust_level}
                    </strong>
                  </div>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Effective Action Capabilities</span>
                    <strong style={{ fontSize: '14px' }}>
                      {effectiveAuthority.total_effective_actions}
                    </strong>
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>
                  Action Capabilities & Provenance Breakdown
                </h4>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>Action</th>
                        <th style={{ padding: '8px' }}>Resource</th>
                        <th style={{ padding: '8px' }}>Source Type</th>
                        <th style={{ padding: '8px' }}>Source Agent / Role</th>
                        <th style={{ padding: '8px' }}>Delegation Depth</th>
                        <th style={{ padding: '8px' }}>Further Delegation</th>
                        <th style={{ padding: '8px' }}>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveAuthority.effective_permissions.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px' }}>
                            <code style={{ color: 'var(--accent-primary)' }}>{item.action}</code>
                          </td>
                          <td style={{ padding: '8px' }}>{item.resource_type}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', backgroundColor: item.source_type === 'DIRECT_ROLE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)', color: item.source_type === 'DIRECT_ROLE' ? '#3b82f6' : '#a855f7' }}>
                              {item.source_type}
                            </span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            {item.source_type === 'DIRECT_ROLE' ? item.role_name : item.source_agent_name}
                          </td>
                          <td style={{ padding: '8px' }}>{item.depth}</td>
                          <td style={{ padding: '8px' }}>
                            {item.allow_further_delegation ? 'YES' : 'NO'}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Chain of Custody */}
                {authorityChain && authorityChain.chain.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                      Authority Chain of Custody (Root: {authorityChain.root_principal})
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {authorityChain.chain.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Step {c.step}:</span>
                          <span>{c.source_agent_name}</span>
                          <span>&rarr;</span>
                          <strong>{c.target_agent_name}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>(Delegation: {c.delegation_id.substring(0, 8)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select an agent to inspect its effective authority profile.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DELEGATIONS MANAGEMENT */}
      {activeTab === 'delegations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
              Active & Historical Delegations
            </h3>

            {delegations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No delegations found for the selected agent.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>ID</th>
                      <th style={{ padding: '8px' }}>Delegator</th>
                      <th style={{ padding: '8px' }}>Delegate</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Actions</th>
                      <th style={{ padding: '8px' }}>Expires</th>
                      <th style={{ padding: '8px' }}>Subtree Ops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegations.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px' }}><code>{d.id.substring(0, 8)}</code></td>
                        <td style={{ padding: '8px' }}>{d.delegator_agent_id.substring(0, 8)}</td>
                        <td style={{ padding: '8px' }}>{d.delegate_agent_id.substring(0, 8)}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', backgroundColor: d.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: d.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          {(d.authority_snapshot?.actions as string[] || []).join(', ')}
                        </td>
                        <td style={{ padding: '8px' }}>{new Date(d.expires_at).toLocaleDateString()}</td>
                        <td style={{ padding: '8px' }}>
                          {d.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevokeDelegation(d.id)}
                              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Revoke
                            </button>
                          )}
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

      {/* TAB 4: DATA FLOW GOVERNANCE */}
      {activeTab === 'dataflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
              Data-Flow Control & Classification Records
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Every inter-agent data flow is evaluated for project boundary containment, data classification clearance, and strict secret protection.
            </p>

            {dataFlows.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recorded data flows for the selected agent.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>Source Agent</th>
                      <th style={{ padding: '8px' }}>Destination Agent</th>
                      <th style={{ padding: '8px' }}>Data Type</th>
                      <th style={{ padding: '8px' }}>Classification</th>
                      <th style={{ padding: '8px' }}>Decision</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataFlows.map((df) => (
                      <tr key={df.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px' }}><code>{df.source_agent_id.substring(0, 8)}</code></td>
                        <td style={{ padding: '8px' }}><code>{df.destination_agent_id.substring(0, 8)}</code></td>
                        <td style={{ padding: '8px' }}>{df.data_type}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', backgroundColor: df.classification === 'SECRET' || df.classification === 'RESTRICTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: df.classification === 'SECRET' || df.classification === 'RESTRICTED' ? 'var(--accent-danger)' : '#3b82f6' }}>
                            {df.classification}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ fontWeight: 600, color: df.decision === 'ALLOW' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {df.decision}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>{df.status}</td>
                        <td style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {df.purpose}
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

      {/* CREATE DELEGATION MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Create Agent Delegation
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Delegated authority must be an exact subset of delegator authority. Escalations in action, environment, or lifetime will be deterministically blocked.
            </p>

            <form onSubmit={handleCreateDelegation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Delegator Agent (Source)</label>
                <select
                  value={delegatorId}
                  onChange={(e) => setDelegatorId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.agent_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Delegate Agent (Recipient)</label>
                <select
                  value={delegateId}
                  onChange={(e) => setDelegateId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                >
                  {agents.filter((a) => a.id !== delegatorId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.agent_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Actions (Comma-Separated)</label>
                <input
                  type="text"
                  value={actionsInput}
                  onChange={(e) => setActionsInput(e.target.value)}
                  placeholder="SCAN_EXECUTE,FINDING_READ"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Environment</label>
                  <select
                    value={environmentScope}
                    onChange={(e) => setEnvironmentScope(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  >
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="TEST">TEST</option>
                    <option value="STAGING">STAGING</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Validity (Days)</label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 1)}
                    min={1}
                    max={30}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  id="allowFurther"
                  checked={allowFurther}
                  onChange={(e) => setAllowFurther(e.target.checked)}
                />
                <label htmlFor="allowFurther" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Allow further delegation to child agents (Hop &le; 3)
                </label>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Audit Reason</label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="secondary-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Create Delegation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST DATA FLOW MODAL */}
      {showDataFlowModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Request Inter-Agent Data Flow
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Data-flow gateway evaluates data classifications and blocks automatic secret forwarding unless both agents possess explicit SECRET_READ clearance.
            </p>

            <form onSubmit={handleCreateDataFlow} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Source Agent</label>
                <select
                  value={dfSourceId}
                  onChange={(e) => setDfSourceId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.agent_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Destination Agent</label>
                <select
                  value={dfDestId}
                  onChange={(e) => setDfDestId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                >
                  {agents.filter((a) => a.id !== dfSourceId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.agent_type})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Data Type</label>
                  <input
                    type="text"
                    value={dfDataType}
                    onChange={(e) => setDfDataType(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Classification</label>
                  <select
                    value={dfClassification}
                    onChange={(e) => setDfClassification(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="SENSITIVE">SENSITIVE</option>
                    <option value="SECRET">SECRET (Guarded)</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Purpose</label>
                <input
                  type="text"
                  value={dfPurpose}
                  onChange={(e) => setDfPurpose(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowDataFlowModal(false)}
                  className="secondary-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Evaluate Data Flow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
