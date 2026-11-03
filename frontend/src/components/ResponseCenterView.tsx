import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type {
  SecurityResponseAction,
  RuntimeEnforcementRule,
  SecurityIncident,
  ResponseOverview,
  ResponseDryRunResult,
  ReverificationResult,
  SecurityResponseActionCreate,
  ResponseActionType,
  ResponseTargetType,
} from '../types/api';

interface ResponseCenterViewProps {
  projectId?: string;
}

export const ResponseCenterView: React.FC<ResponseCenterViewProps> = ({
  projectId = '00000000-0000-0000-0000-000000000001',
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'actions' | 'approvals' | 'enforcement' | 'incidents'
  >('overview');

  const [overview, setOverview] = useState<ResponseOverview | null>(null);
  const [responses, setResponses] = useState<SecurityResponseAction[]>([]);
  const [rules, setRules] = useState<RuntimeEnforcementRule[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Action for Detailed Modal / Simulation / Reverification
  const [selectedAction, setSelectedAction] = useState<SecurityResponseAction | null>(null);
  const [simResult, setSimResult] = useState<ResponseDryRunResult | null>(null);
  const [reverifyResult, setReverifyResult] = useState<ReverificationResult | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form for manual controlled response creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newActionType, setNewActionType] = useState<ResponseActionType>('ALERT');
  const [newTargetType, setNewTargetType] = useState<ResponseTargetType>('SERVICE');
  const [newTargetId, setNewTargetId] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiClient.getResponseOverview(projectId);
      if (res.data) setOverview(res.data);
    } catch (e: any) {
      console.error('Failed to load overview:', e);
    }
  }, [projectId]);

  const fetchResponses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.listResponses(projectId);
      if (res.data) setResponses(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load response actions');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchRules = useCallback(async () => {
    try {
      const res = await apiClient.listEnforcementRules(projectId);
      if (res.data) setRules(res.data);
    } catch (e: any) {
      console.error('Failed to load enforcement rules:', e);
    }
  }, [projectId]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await apiClient.listIncidents(projectId);
      if (res.data) setIncidents(res.data);
    } catch (e: any) {
      console.error('Failed to load incidents:', e);
    }
  }, [projectId]);

  const refreshAll = useCallback(() => {
    setError(null);
    setSuccessMsg(null);
    fetchOverview();
    fetchResponses();
    fetchRules();
    fetchIncidents();
  }, [fetchOverview, fetchResponses, fetchRules, fetchIncidents]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handler: Execute
  const handleExecute = async (actionId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.executeResponse(actionId);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccessMsg(`Action executed with status: ${res.data?.status}`);
        refreshAll();
      }
    } catch (e: any) {
      setError(e.message || 'Execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Dry Run / Simulate
  const handleSimulate = async (actionId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.simulateResponse(actionId);
      if (res.data) {
        setSimResult(res.data);
      }
    } catch (e: any) {
      setError(e.message || 'Dry-run failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Approve
  const handleApprove = async (actionId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.approveResponse(actionId, approvalNote || 'Approved via Control Plane');
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccessMsg('Response action successfully approved');
        setSelectedAction(null);
        refreshAll();
      }
    } catch (e: any) {
      setError(e.message || 'Approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Reject
  const handleReject = async (actionId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.rejectResponse(actionId, approvalNote || 'Rejected via Control Plane');
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccessMsg('Response action rejected');
        setSelectedAction(null);
        refreshAll();
      }
    } catch (e: any) {
      setError(e.message || 'Rejection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Revoke Rule
  const handleRevokeRule = async (ruleId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.revokeEnforcementRule(ruleId, 'Revoked by operator in Response Center');
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccessMsg('Active enforcement rule successfully revoked');
        fetchRules();
      }
    } catch (e: any) {
      setError(e.message || 'Revocation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Re-verify
  const handleReverify = async (actionId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      const res = await apiClient.triggerReverification(actionId);
      if (res.data) {
        setReverifyResult(res.data);
        setSuccessMsg(`Contract re-evaluation complete: ${res.data.status}`);
      }
    } catch (e: any) {
      setError(e.message || 'Re-verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Create manual response
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      setError(null);
      const payload: SecurityResponseActionCreate = {
        action_type: newActionType,
        target_type: newTargetType,
        target_id: newTargetId,
        reason: newReason,
        mode: 'AUTOMATIC',
      };
      const res = await apiClient.createResponse(projectId, payload);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccessMsg('Controlled response action successfully registered');
        setShowCreateModal(false);
        setNewTargetId('');
        setNewReason('');
        refreshAll();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create response action');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingApprovals = responses.filter((r) => r.status === 'PENDING_APPROVAL');

  return (
    <div style={{ padding: '24px', color: '#f3f4f6', minHeight: '100vh', background: '#0b0f19' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #1f293d',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} color="#ef4444" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
              Runtime Response Center & Controlled Enforcement
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Deterministic response orchestration, active enforcement rules, separation of duties, and post-action verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Play size={15} /> Propose Response
          </button>
          <button
            onClick={refreshAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#451a1a',
            border: '1px solid #dc2626',
            borderRadius: '6px',
            color: '#fca5a5',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#064e3b',
            border: '1px solid #059669',
            borderRadius: '6px',
            color: '#6ee7b7',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      {overview && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Active Responses
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', marginTop: '6px' }}>
              {overview.active_responses_count}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Pending Approvals
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: overview.pending_approvals_count > 0 ? '#f59e0b' : '#10b981',
                marginTop: '6px',
              }}
            >
              {overview.pending_approvals_count}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Active Enforcement Rules
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginTop: '6px' }}>
              {overview.active_enforcement_rules_count}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Open Incidents
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f87171', marginTop: '6px' }}>
              {overview.open_incidents_count}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Completed Actions
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
              {overview.completed_actions_count}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Failed Actions
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: overview.failed_actions_count > 0 ? '#ef4444' : '#64748b',
                marginTop: '6px',
              }}
            >
              {overview.failed_actions_count}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1f293d',
          marginBottom: '20px',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'overview' ? '#60a5fa' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Response Overview
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'actions' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'actions' ? '#60a5fa' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Response Actions ({responses.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'approvals' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'approvals' ? '#60a5fa' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Pending Approvals ({pendingApprovals.length})
        </button>
        <button
          onClick={() => setActiveTab('enforcement')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'enforcement' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'enforcement' ? '#60a5fa' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Active Enforcement Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'incidents' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'incidents' ? '#60a5fa' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Security Incidents ({incidents.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          <div
            style={{
              background: '#111827',
              border: '1px solid #1f293d',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#f9fafb' }}>
              Controlled Enforcement Loop Invariants
            </h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
              The Antigravity Runtime Security Agent is <strong>NOT</strong> an unrestricted autonomous AI.
              Every enforcement action strictly passes through deterministic verification:
              <br />
              <code
                style={{
                  display: 'block',
                  margin: '12px 0',
                  padding: '10px 14px',
                  background: '#090d16',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '12px',
                }}
              >
                DETECT → VERIFY → CORRELATE → RISK CONTEXT → POLICY DECISION → APPROVAL IF REQUIRED → AUTHORIZED RESPONSE → EXECUTION → POST-ACTION EVIDENCE → RE-VERIFY
              </code>
              No action may execute without explicit policy sanction, valid authorization, and target validation. Destructive commands (e.g., DROP TABLE, DELETE CLUSTER) are strictly forbidden.
            </p>
          </div>

          {/* Pending Action Highlight */}
          {pendingApprovals.length > 0 && (
            <div
              style={{
                background: '#2b1b0b',
                border: '1px solid #d97706',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock color="#f59e0b" size={20} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fbbf24' }}>
                  {pendingApprovals.length} Actions Require Separation-of-Duties Approval
                </h3>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#fde68a' }}>
                Self-approval is forbidden. A secondary security officer must review target blast radius and policy justification.
              </p>
              <button
                onClick={() => setActiveTab('approvals')}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#f59e0b',
                  color: '#000000',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Review Pending Approvals →
              </button>
            </div>
          )}

          {/* Active Enforcement Rules Summary */}
          <div
            style={{
              background: '#111827',
              border: '1px solid #1f293d',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f9fafb' }}>
              Active Runtime Enforcement Rules in Effect
            </h3>
            {rules.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                NO ACTIVE ENFORCEMENT RULES IN EFFECT
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: '12px',
                      background: '#182032',
                      border: '1px solid #2d3748',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            background: '#7f1d1d',
                            color: '#fca5a5',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '4px',
                          }}
                        >
                          {rule.action}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
                          {rule.target_type}: {rule.target_id}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        Reason: {rule.reason} | Expires: {new Date(rule.expires_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeRule(rule.id)}
                      disabled={isProcessing}
                      style={{
                        padding: '6px 12px',
                        background: '#374151',
                        color: '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Revoke Block
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Response Actions */}
      {activeTab === 'actions' && (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {responses.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
              NO ACTIVE RESPONSE ACTIONS REGISTERED
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#182032', borderBottom: '1px solid #243048', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Action Type</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Target</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Mode / Severity</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Requested By</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((action) => (
                  <tr key={action.id} style={{ borderBottom: '1px solid #1f293d' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f3f4f6' }}>
                      {action.action_type}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        {action.target_type}
                      </span>
                      {action.target_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            action.status === 'COMPLETED'
                              ? '#064e3b'
                              : action.status === 'FAILED'
                              ? '#7f1d1d'
                              : action.status === 'PENDING_APPROVAL'
                              ? '#78350f'
                              : '#1e293b',
                          color:
                            action.status === 'COMPLETED'
                              ? '#34d399'
                              : action.status === 'FAILED'
                              ? '#f87171'
                              : action.status === 'PENDING_APPROVAL'
                              ? '#fbbf24'
                              : '#94a3b8',
                        }}
                      >
                        {action.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {action.mode} / <span style={{ color: '#f87171' }}>{action.severity}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {action.requested_by_type} ({action.requested_by_id.substring(0, 8)}...)
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedAction(action);
                            setSimResult(null);
                            setReverifyResult(null);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          Details
                        </button>
                        {(action.status === 'REQUESTED' || action.status === 'APPROVED') && (
                          <button
                            onClick={() => handleExecute(action.id)}
                            disabled={isProcessing}
                            style={{
                              padding: '4px 8px',
                              background: '#2563eb',
                              border: 'none',
                              color: '#ffffff',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            Execute
                          </button>
                        )}
                        {action.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleReverify(action.id)}
                            disabled={isProcessing}
                            style={{
                              padding: '4px 8px',
                              background: '#059669',
                              border: 'none',
                              color: '#ffffff',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            Re-verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Pending Approvals */}
      {activeTab === 'approvals' && (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f9fafb' }}>
            Actions Requiring Human Authorization
          </h3>
          {pendingApprovals.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
              NO PENDING APPROVAL REQUESTS
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingApprovals.map((action) => (
                <div
                  key={action.id}
                  style={{
                    padding: '16px',
                    background: '#182032',
                    border: '1px solid #3b4252',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            background: '#78350f',
                            color: '#fef08a',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {action.action_type}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                          Target: {action.target_type} → {action.target_id}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        Requested By: {action.requested_by_type} ({action.requested_by_id}) | Severity: {action.severity}
                      </div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                        Policy: REQUIRE_APPROVAL | Self-approval strictly forbidden
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Approval notes / reasoning..."
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: '#090d16',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#f3f4f6',
                          fontSize: '12px',
                          width: '220px',
                        }}
                      />
                      <button
                        onClick={() => handleApprove(action.id)}
                        disabled={isProcessing}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(action.id)}
                        disabled={isProcessing}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Enforcement Rules */}
      {activeTab === 'enforcement' && (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {rules.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
              NO RUNTIME ENFORCEMENT RULES IN EFFECT
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#182032', borderBottom: '1px solid #243048', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Rule Type</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Target</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Action</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Reason</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Expires At</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid #1f293d' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f3f4f6' }}>
                      {rule.rule_type}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {rule.target_type}: {rule.target_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 700 }}>
                      {rule.action}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{rule.reason}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: rule.status === 'ACTIVE' ? '#7f1d1d' : '#334155',
                          color: rule.status === 'ACTIVE' ? '#fca5a5' : '#94a3b8',
                        }}
                      >
                        {rule.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {new Date(rule.expires_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rule.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevokeRule(rule.id)}
                          disabled={isProcessing}
                          style={{
                            padding: '4px 8px',
                            background: '#374151',
                            color: '#f3f4f6',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Incidents */}
      {activeTab === 'incidents' && (
        <div
          style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {incidents.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
              NO SECURITY INCIDENTS RECORDED
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#182032', borderBottom: '1px solid #243048', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Incident Title</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Severity</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>First Detected</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Last Detected</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Correlated Events</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #1f293d' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f3f4f6' }}>
                      {inc.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f87171', fontWeight: 700 }}>
                      {inc.severity}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: inc.status === 'OPEN' ? '#7f1d1d' : '#064e3b',
                          color: inc.status === 'OPEN' ? '#fca5a5' : '#6ee7b7',
                        }}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {new Date(inc.first_detected_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {new Date(inc.last_detected_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {inc.events?.length || 1} events linked
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Action Details / Simulation Modal */}
      {selectedAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '650px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              color: '#f3f4f6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Response Action Details
              </h2>
              <button
                onClick={() => setSelectedAction(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <strong>Action ID:</strong> <code style={{ color: '#38bdf8' }}>{selectedAction.id}</code>
              </div>
              <div>
                <strong>Action Type:</strong> {selectedAction.action_type}
              </div>
              <div>
                <strong>Target:</strong> {selectedAction.target_type} → {selectedAction.target_id}
              </div>
              <div>
                <strong>Status:</strong> {selectedAction.status}
              </div>
              <div>
                <strong>Severity:</strong> {selectedAction.severity} | <strong>Mode:</strong> {selectedAction.mode}
              </div>
              <div>
                <strong>Requested At:</strong> {new Date(selectedAction.created_at).toLocaleString()}
              </div>
              {selectedAction.failure_reason && (
                <div style={{ padding: '8px 12px', background: '#451a1a', borderRadius: '4px', color: '#fca5a5' }}>
                  <strong>Failure Reason:</strong> {selectedAction.failure_reason}
                </div>
              )}
            </div>

            {/* Dry Run / Simulation button */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #1f293d', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => handleSimulate(selectedAction.id)}
                  disabled={isProcessing}
                  style={{
                    padding: '6px 14px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Dry Run (Simulate Impact)
                </button>
                {selectedAction.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleReverify(selectedAction.id)}
                    disabled={isProcessing}
                    style={{
                      padding: '6px 14px',
                      background: '#059669',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Trigger Re-verification
                  </button>
                )}
              </div>

              {simResult && (
                <div style={{ background: '#090d16', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                    Dry Run Simulation Result:
                  </div>
                  <div>Would Execute: {simResult.would_execute ? 'YES' : 'NO'}</div>
                  <div>Authorization: {simResult.authorization}</div>
                  <div>Policy: {simResult.policy}</div>
                  <div>Approval Required: {simResult.approval}</div>
                  <pre style={{ margin: '8px 0 0 0', color: '#94a3b8' }}>
                    {JSON.stringify(simResult.simulated_effects, null, 2)}
                  </pre>
                </div>
              )}

              {reverifyResult && (
                <div style={{ background: '#090d16', padding: '12px', borderRadius: '6px', fontSize: '12px', marginTop: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                    Post-Action Contract Re-verification:
                  </div>
                  <div>Outcome: <strong>{reverifyResult.status}</strong></div>
                  <div>Reason: {reverifyResult.reason}</div>
                  <div>Evidence Count: {reverifyResult.post_action_evidence_count}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Propose Action Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '500px',
              padding: '24px',
              color: '#f3f4f6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Propose Controlled Security Response
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Response Action Type
                </label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value as ResponseActionType)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                  }}
                >
                  <option value="ALERT">ALERT (Security Alert Only)</option>
                  <option value="DENY_TOOL_CALL">DENY_TOOL_CALL (MCP Tool Block)</option>
                  <option value="REVOKE_SESSION">REVOKE_SESSION (Session Invalidation)</option>
                  <option value="REVOKE_DELEGATION">REVOKE_DELEGATION (Step 11 Revocation)</option>
                  <option value="SUSPEND_AGENT">SUSPEND_AGENT (Agent Inactivation)</option>
                  <option value="RESTRICT_DATA_FLOW">RESTRICT_DATA_FLOW (Data Restriction)</option>
                  <option value="ISOLATE_WORKLOAD">ISOLATE_WORKLOAD (Requires Approval)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Target Type
                </label>
                <select
                  value={newTargetType}
                  onChange={(e) => setNewTargetType(e.target.value as ResponseTargetType)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                  }}
                >
                  <option value="SERVICE">SERVICE</option>
                  <option value="MCP_TOOL_CALL">MCP_TOOL_CALL</option>
                  <option value="SESSION">SESSION</option>
                  <option value="DELEGATION">DELEGATION</option>
                  <option value="AGENT">AGENT</option>
                  <option value="DATA_FLOW">DATA_FLOW</option>
                  <option value="CONTAINER">CONTAINER</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Target ID (e.g. tool name, session UUID, agent ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="run_security_scan or UUID"
                  value={newTargetId}
                  onChange={(e) => setNewTargetId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Reason & Context
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this response action is requested..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    color: '#f3f4f6',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
