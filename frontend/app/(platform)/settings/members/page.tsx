'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Search,
  Key,
  Sliders,
  Bell,
  Lock,
  FileText,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { InviteMemberModal } from '@/components/team/InviteMemberModal';

export default function MembersSettingsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        api.invitations.listMembers(),
        api.invitations.list({}),
      ]);
      const realMembers = (membersData || []).filter(
        (m: any) => !m.email?.toLowerCase().endsWith('@acme.com') && !m.email?.toLowerCase().endsWith('@example.com')
      );
      const realInvites = (invitesData || []).filter(
        (i: any) => !i.email?.toLowerCase().endsWith('@acme.com') && !i.email?.toLowerCase().endsWith('@example.com')
      );

      // Ensure any accepted invitation is immediately displayed in active members
      const acceptedInvites = realInvites.filter((i: any) => (i.status || '').toUpperCase() === 'ACCEPTED');
      const existingEmails = new Set(realMembers.map((m: any) => m.email?.toLowerCase()));
      const combinedMembers = [...realMembers];

      acceptedInvites.forEach((inv: any) => {
        if (!existingEmails.has(inv.email?.toLowerCase())) {
          existingEmails.add(inv.email?.toLowerCase());
          combinedMembers.push({
            id: inv.id,
            email: inv.email,
            name: inv.email.split('@')[0],
            role: inv.role?.replace(/_/g, ' ') || 'Security Analyst',
            joined_at: inv.accepted_at || inv.created_at || new Date().toISOString(),
            is_active: true,
            permissions: (inv.permissions && Array.isArray(inv.permissions) && inv.permissions.length > 0)
              ? inv.permissions
              : ((inv.role || '').toLowerCase().trim() === 'owner'
                ? ['view_findings', 'run_scans', 'manage_policies', 'manage_integrations']
                : ['view_findings', 'run_scans']),
          });
        }
      });

      setMembers(combinedMembers);
      setInvitations(realInvites);
    } catch (err: any) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResend = async (id: string) => {
    try {
      await api.invitations.resend(id);
      toast.success('Invitation link regenerated and expiry extended.');
      setActionMsg('Invitation link regenerated and expiry extended.');
      setTimeout(() => setActionMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      toast.error(`Resend failed: ${err.message || 'Error'}`);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation? The token will immediately become invalid.')) {
      return;
    }
    try {
      await api.invitations.cancel(id);
      toast.success('Invitation revoked successfully.');
      setActionMsg('Invitation revoked successfully.');
      setTimeout(() => setActionMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      toast.error(`Revoke failed: ${err.message || 'Error'}`);
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/invitations/accept?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.info('Invitation link copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.role?.toLowerCase().includes(search.toLowerCase())
  );

  const distinctRolesCount = new Set(members.map((m) => m.role?.toLowerCase())).size || (members.length > 0 ? 1 : 0);

  return (
    <div className="kavach-page-container" style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Team Members & Access Control
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Manage active organization members, roles, project privileges, and pending invitations.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          style={{
            padding: '9px 18px',
            borderRadius: '6px',
            border: 'none',
            background: '#09090B',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <UserPlus size={16} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {actionMsg && (
        <div
          style={{
            marginBottom: '20px',
            padding: '10px 16px',
            borderRadius: '6px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#16A34A',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="kavach-grid-kpi" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Active Members', value: members.length, desc: 'Authorized organization accounts' },
          { label: 'Pending Invitations', value: invitations.filter((i) => i.status === 'PENDING').length, desc: 'Awaiting email verification' },
          { label: 'Configured Roles', value: distinctRolesCount, desc: 'Roles assigned in directory' },
          { label: 'Access Policy', value: 'Strict RBAC', desc: 'Deterministic policy evaluation' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
              {stat.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table 1: Active Workspace Members ── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="#2563EB" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Active Members ({filteredMembers.length})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 12px',
              width: '100%',
              maxWidth: '320px',
              minWidth: '180px',
            }}
          >
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              aria-label="Search members by name, email, or role"
              placeholder="Search members by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#0F172A',
              }}
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
            <Users size={24} style={{ margin: '0 auto 8px auto', color: '#94A3B8' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>No Active Members Found</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              No authorized members match your search criteria.
            </div>
          </div>
        ) : (
          <div className="kavach-table-responsive" style={{ margin: 0 }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 20px', fontWeight: 600 }}>Member</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Permissions</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 20px', fontWeight: 600, textAlign: 'right' }}>Joined At</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{m.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(m.permissions || ['view_findings', 'run_scans']).map((p: string) => (
                          <span
                            key={p}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: '#F1F5F9',
                              color: '#475569',
                            }}
                          >
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#16A34A',
                        }}
                      >
                        <CheckCircle2 size={12} /> Active
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', color: '#64748B', fontSize: '12px' }}>
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* ── Table 2: Pending Invitations ── */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#EA580C" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Pending Invitations ({invitations.filter((i) => (i.status || '').toUpperCase() === 'PENDING').length})
              </span>
            </div>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Tokens automatically expire after 7 days
            </span>
          </div>

          {invitations.filter((i) => (i.status || '').toUpperCase() === 'PENDING').length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <Clock size={24} style={{ margin: '0 auto 8px auto', color: '#94A3B8' }} />
              <div style={{ fontSize: '13px', fontWeight: 500 }}>No Pending Invitations</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                All sent invitations have been accepted or expired.
              </div>
            </div>
          ) : (
            <div className="kavach-table-responsive" style={{ margin: 0 }}>
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 20px', fontWeight: 600 }}>Invited Email</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Expires At</th>
                  <th style={{ padding: '10px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations
                  .filter((i) => (i.status || '').toUpperCase() === 'PENDING')
                  .map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{inv.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#F1F5F9',
                          color: '#334155',
                          textTransform: 'capitalize',
                        }}
                      >
                        {inv.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: inv.status === 'PENDING' ? '#FEF3C7' : '#F1F5F9',
                          color: inv.status === 'PENDING' ? '#B45309' : '#64748B',
                        }}
                      >
                        {inv.status === 'PENDING' ? <Clock size={12} /> : null}
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {inv.token && (
                          <button
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedId === inv.id ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                            <span>{copiedId === inv.id ? 'Copied' : 'Copy Link'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleResend(inv.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <RotateCcw size={12} />
                          <span>Resend</span>
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #FCA5A5',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
