import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import type { SecurityApproval } from '../../types/api';
import { StatusBadge } from '../shared/StatusBadge';
import { PageLoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';

interface ApprovalCenterViewProps {
  projectId?: string;
  projectIds?: string[];
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  projectId,
  projectIds,
}) => {
  const [approvals, setApprovals] = useState<SecurityApproval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (projectId) {
        res = await apiClient.listPendingApprovals(projectId);
      } else if (projectIds && projectIds.length > 0) {
        res = await apiClient.listAllPendingApprovals(projectIds);
      } else {
        const projRes = await apiClient.listProjects({ limit: 10 });
        const ids = projRes.data?.map((p: any) => p.id) || [];
        res = await apiClient.listAllPendingApprovals(ids);
      }

      if (res.isError && res.error) {
        setError(res.error.message || 'Failed to fetch pending approvals');
      } else if (res.data) {
        setApprovals(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading approvals');
    } finally {
      setLoading(false);
    }
  }, [projectId, projectIds]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approvalId: string) => {
    setActingId(approvalId);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await apiClient.approveDecision(approvalId, {
        approval_notes: notes[approvalId] || undefined,
      });
      if (res.isError && res.error) {
        setError(res.error.message || 'Failed to approve request');
      } else {
        setActionSuccess(`Approval granted for record ${approvalId}`);
        await fetchApprovals();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setActingId(approvalId);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await apiClient.rejectDecision(approvalId, {
        reason: notes[approvalId] || 'Rejected by security administrator',
        approval_notes: notes[approvalId] || undefined,
      });
      if (res.isError && res.error) {
        setError(res.error.message || 'Failed to reject request');
      } else {
        setActionSuccess(`Request ${approvalId} rejected`);
        await fetchApprovals();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reject');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ padding: 'var(--space-8) var(--space-10)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)' }}>
          Security Approval Center
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Review and authorize high-risk operations requiring explicit human approval under OPA policies
        </p>
      </div>

      {actionSuccess && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-success-subtle)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {actionSuccess}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchApprovals} />}

      {loading ? (
        <PageLoadingState message="Loading pending approval queue..." />
      ) : approvals.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-10)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--color-success)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            No Pending Approvals
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            All policy decisions are currently satisfied or executed. No manual authorizations are queued.
          </p>
          <button
            onClick={fetchApprovals}
            style={{
              marginTop: 'var(--space-4)',
              padding: '6px 14px',
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            Refresh Queue
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {approvals.map((app) => (
            <div
              key={app.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <StatusBadge status={app.status} />
                  <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    ID: {app.id}
                  </span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Requested: {new Date(app.created_at).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Decision Reference</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                    {app.decision_id || 'Direct Approval'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Requested By</span>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {app.requested_by || 'SECURITY_SYSTEM'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Expiration</span>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {app.expires_at ? new Date(app.expires_at).toLocaleString() : 'No expiration set'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  placeholder="Optional review notes..."
                  value={notes[app.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--text-xs)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button
                  disabled={actingId === app.id}
                  onClick={() => handleReject(app.id)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: actingId === app.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actingId === app.id ? 'Processing...' : 'Reject Operation'}
                </button>
                <button
                  disabled={actingId === app.id}
                  onClick={() => handleApprove(app.id)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: 'var(--color-success)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: actingId === app.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actingId === app.id ? 'Processing...' : 'Grant Approval'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
