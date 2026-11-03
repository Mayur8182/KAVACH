'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductNavigation } from '@/components/navigation/ProductNavigation';
import { SharedTable, ColumnDef } from '@/components/data-display/SharedTable';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { CheckCircle, Plug, Clock, User, AlertTriangle, RefreshCw, Mail, X, RotateCcw, Shield } from 'lucide-react';

export default function ControlPlanePage() {
  const searchParams = useSearchParams();
  const { currentProject, currentOrg } = useScope();
  const initialTab = searchParams.get('tab') || 'integrations';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Integrations
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  // Audit
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Invitations
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const tabs = [
    { id: 'integrations', label: 'Integrations & Connectors' },
    { id: 'team', label: 'Team & Invitations' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'settings', label: 'Settings' },
  ];

  const loadIntegrations = useCallback(async () => {
    setLoadingIntegrations(true);
    try {
      const data = await api.integrations.list(currentProject?.id);
      setIntegrations(data || []);
    } catch {
      setIntegrations([]);
    } finally {
      setLoadingIntegrations(false);
    }
  }, [currentProject?.id]);

  const loadAuditEvents = useCallback(async () => {
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const data = await api.audit.list({
        projectId: currentProject?.id,
        limit: 50,
      });
      setAuditEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setAuditError(err.message || 'Failed to load audit events');
      setAuditEvents([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [currentProject?.id]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const data = await api.invitations.list({
        projectId: currentProject?.id,
        organizationId: currentOrg?.id,
      });
      setInvitations(data || []);
    } catch {
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  }, [currentProject?.id, currentOrg?.id]);

  useEffect(() => {
    loadIntegrations();
    loadAuditEvents();
    loadInvitations();
  }, [loadIntegrations, loadAuditEvents, loadInvitations]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!currentProject?.id && !currentOrg?.id) {
      setInviteError('Select a project or organization scope first');
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      await api.invitations.create({
        email: inviteEmail.trim(),
        role: inviteRole,
        project_id: currentProject?.id,
        organization_id: currentOrg?.id,
        message: inviteMessage.trim() || undefined,
      });
      setInviteEmail('');
      setInviteMessage('');
      await loadInvitations();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Failed to send invitation';
      setInviteError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await api.invitations.resend(id);
      await loadInvitations();
    } catch (err: any) {
      alert(`Resend failed: ${err.message}`);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await api.invitations.cancel(id);
      await loadInvitations();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const integrationColumns: ColumnDef<any>[] = [
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
          {row.provider}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Integration ID',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {row.id}
        </span>
      ),
    },
    {
      key: 'is_connected',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.is_connected ? 'ACTIVE' : 'INACTIVE'} size="sm" />
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  const statusColor: Record<string, string> = {
    PENDING: 'var(--color-warning-text)',
    ACCEPTED: 'var(--color-success-text)',
    CANCELLED: 'var(--color-text-muted)',
    EXPIRED: 'var(--color-error-text)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <ProductNavigation
        productTitle="Control Plane"
        productSubtitle="Authenticated Connectors, Team Invitations, and Immutable Audit Trails"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div style={{ padding: '24px' }}>
        {activeTab === 'integrations' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="typography-title-section">Configured Integrations & Connectors</h2>
              <button onClick={loadIntegrations} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {loadingIntegrations ? (
              <LoadingSkeleton lines={4} />
            ) : (
              <SharedTable
                columns={integrationColumns}
                data={integrations}
                loading={false}
                emptyTitle="No Integrations Configured"
                emptyDescription="Connect your source control or cloud providers to enable continuous verification."
              />
            )}
          </div>

        ) : activeTab === 'team' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 className="typography-title-section">Team Invitations</h2>

            {/* Invite Form */}
            <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'var(--weight-semibold)', marginBottom: '16px' }}>Invite Team Member</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', fontSize: '13px', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div style={{ flex: '0 0 140px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Role</label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', fontSize: '13px', color: 'var(--color-text-primary)' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
                <button
                  id="send-invite-btn"
                  onClick={handleSendInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  style={{ padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '13px', fontWeight: 'var(--weight-semibold)', cursor: inviteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: inviteLoading ? 0.7 : 1 }}
                >
                  <Mail size={14} />
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
              {inviteError && (
                <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-error-bg)', color: 'var(--color-error-text)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} /> {inviteError}
                </div>
              )}
            </div>

            {/* Invitation List */}
            {loadingInvitations ? (
              <LoadingSkeleton lines={3} />
            ) : invitations.length === 0 ? (
              <EmptyState type="empty" title="No Pending Invitations" description="Use the form above to invite team members to this project." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invitations.map((inv) => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <User size={16} style={{ color: 'var(--color-text-muted)' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)' }}>{inv.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Role: <strong>{inv.role}</strong> · Sent {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'var(--weight-semibold)', color: statusColor[inv.status] || 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        {inv.status}
                      </span>
                      {(inv.status === 'PENDING' || inv.status === 'EXPIRED') && (
                        <button onClick={() => handleResendInvite(inv.id)} title="Resend" style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <RotateCcw size={12} /> Resend
                        </button>
                      )}
                      {inv.status === 'PENDING' && (
                        <button onClick={() => handleCancelInvite(inv.id)} title="Cancel" style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-error-text)' }}>
                          <X size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : activeTab === 'audit' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="typography-title-section">Immutable Audit Trail</h2>
              <button onClick={loadAuditEvents} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loadingAudit ? (
              <LoadingSkeleton lines={6} />
            ) : auditError ? (
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-error-bg)', color: 'var(--color-error-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={16} />
                <div>
                  <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: '13px' }}>Failed to load audit events</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>{auditError}</div>
                </div>
              </div>
            ) : auditEvents.length === 0 ? (
              <EmptyState
                type="empty"
                title="No Audit Events Yet"
                description="Audit events are recorded automatically when users, agents, or systems perform security-relevant actions."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {auditEvents.map((event) => (
                  <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '200px 160px 1fr 120px', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
                    </span>
                    <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', textTransform: 'uppercase', fontSize: '11px' }}>
                      {event.action}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.resource_type}
                      {event.resource_id ? ` · ${event.resource_id.slice(0, 8)}…` : ''}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', textAlign: 'right' }}>
                      {event.actor_type}: {event.actor_id ? event.actor_id.slice(0, 8) + '…' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (
          <EmptyState
            type="empty"
            title="Control Plane Settings"
            description="Manage cryptographic key material, RBAC definitions, and tenant isolation policies."
          />
        )}
      </div>
    </div>
  );
}
