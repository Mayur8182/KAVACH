'use client';

/**
 * THING AGENT — Access & Action Approvals
 * Route: /agent/approvals
 * Real backend data from /api/v1/agent/approvals
 * Resolves approval via POST /api/v1/agent/approvals/{id}/resolve
 */

import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge,
  StatusBadge,
  Table,
  Th,
  Td,
  Tr,
  AgentLoading,
  AgentError,
  SectionHeader,
  EvidenceDrawer,
} from '@/components/agent/AgentComponents';
import { CheckCircle2, XCircle, Clock, ShieldAlert, Check, X, FileSearch } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

interface ApprovalRequest {
  id: string;
  agent_id: string;
  agent_name?: string;
  requested_action: string;
  resource_target: string;
  environment: string;
  risk_level: string;
  policy_id: string;
  requested_by: string;
  status: string; // PENDING | APPROVED | REJECTED
  expires_at?: string;
  created_at: string;
  decision_reason?: string;
}

export default function AgentApprovalsPage() {
  const { currentProject } = useProject();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [modalItem, setModalItem] = useState<{ id: string; decision: 'APPROVED' | 'REJECTED' } | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.agent.approvals(currentProject?.id);
      setApprovals(Array.isArray(data) ? data : (data?.items || []));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [currentProject?.id]);

  const handleResolve = async () => {
    if (!modalItem) return;
    setActionInProgress(modalItem.id);
    try {
      await api.agent.resolveApproval(
        modalItem.id,
        modalItem.decision,
        resolutionNote || `${modalItem.decision} via Agent Security Console`,
        currentProject?.id
      );
      setModalItem(null);
      setResolutionNote('');
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve approval');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Authority & Tool Approvals"
          sub="Review and authorize high-risk tool execution and temporary privilege escalation requests."
        />

        {loading ? (
          <AgentLoading />
        ) : error ? (
          <AgentError message={error} />
        ) : approvals.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}>
            No pending or historical approval requests recorded.
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <Table>
              <thead>
                <tr>
                  <Th>Agent</Th>
                  <Th>Action</Th>
                  <Th>Resource Target</Th>
                  <Th>Environment</Th>
                  <Th>Risk</Th>
                  <Th>Policy</Th>
                  <Th>Requested By</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((req) => (
                  <Tr key={req.id}>
                    <Td mono>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                        {req.agent_name || req.agent_id}
                      </span>
                    </Td>
                    <Td mono>{req.requested_action}</Td>
                    <Td mono>{req.resource_target}</Td>
                    <Td mono>{req.environment}</Td>
                    <Td>
                      <RiskBadge risk={req.risk_level || 'HIGH'} />
                    </Td>
                    <Td mono>{req.policy_id || 'human-in-the-loop-v1'}</Td>
                    <Td>{req.requested_by || 'system'}</Td>
                    <Td>
                      <StatusBadge status={req.status} />
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => setModalItem({ id: req.id, decision: 'APPROVED' })}
                              disabled={actionInProgress === req.id}
                              style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#4ade80',
                                borderRadius: 6,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setModalItem({ id: req.id, decision: 'REJECTED' })}
                              disabled={actionInProgress === req.id}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                borderRadius: 6,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => setSelectedApproval(req)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                          }}
                        >
                          Evidence
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Modal for Approve / Reject */}
        {modalItem && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 24,
              width: 440,
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: modalItem.decision === 'APPROVED' ? '#4ade80' : '#f87171' }}>
                {modalItem.decision === 'APPROVED' ? 'Approve Access Request' : 'Reject Access Request'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                State reason or compliance justification for this security decision:
              </div>
              <input
                type="text"
                placeholder="Reason (e.g. Verified change ticket CHG-4829)"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--color-text)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setModalItem(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  style={{
                    background: modalItem.decision === 'APPROVED' ? '#22c55e' : '#ef4444',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm {modalItem.decision === 'APPROVED' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Drawer */}
        {selectedApproval && (
          <EvidenceDrawer evidence={selectedApproval} onClose={() => setSelectedApproval(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
