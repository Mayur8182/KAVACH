'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  FolderGit2,
  Users,
  Shield,
  Plus,
  ArrowRight,
  MoreVertical,
  Mail,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings as SettingsIcon,
  Search,
  Filter,
  Loader2,
  Trash2,
  UserCheck,
  Check,
  X,
} from 'lucide-react';

import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal';
import { KavachLogo } from '@/components/common/KavachLogo';
import type { OrganizationOverviewResponse, WorkspaceItem } from '@/types/api/workspaces';

const ORG_ICON_COLORS = [
  { bg: '#FEE2E2', text: '#DC2626' },
  { bg: '#CCFBF1', text: '#0D9488' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#E0E7FF', text: '#4F46E5' },
];

export default function OrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgParam = searchParams.get('id');
  const { currentOrg, currentWorkspace, workspaces, refreshWorkspaces } = useScope();

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'workspaces' | 'projects' | 'settings'>('overview');
  const [overview, setOverview] = useState<OrganizationOverviewResponse | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);

  // Invite member form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Resolve target organization id
  const targetOrgId = orgParam || currentWorkspace?.organization_id || currentOrg?.id || (workspaces.organizations[0]?.id ?? '');

  // Load real organization overview data
  const loadOrgData = async () => {
    if (!targetOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.organizations.getOverview(targetOrgId);
      setOverview(data);

      // Load members & invitations
      const invRes: any = await api.invitations.list().catch(() => []);
      const rawList = Array.isArray(invRes) ? invRes : (Array.isArray(invRes?.items) ? invRes.items : []);
      const orgInvs = rawList.filter((inv: any) => !inv.organization_id || inv.organization_id === targetOrgId);
      setInvitations(orgInvs);
    } catch (err) {
      console.error('Failed to load organization overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgData();
  }, [targetOrgId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await api.invitations.create({
        email: inviteEmail.trim(),
        role: inviteRole,
        organization_id: targetOrgId || undefined,
        message: inviteMessage.trim() || undefined,
      });

      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteMessage('');
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 1500);

      loadOrgData();
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invId: string) => {
    try {
      await api.invitations.cancel(invId);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err: any) {
      alert(`Failed to revoke invitation: ${err?.message}`);
    }
  };

  const orgName = overview?.name || currentOrg?.name || 'ADIT Projects';
  const orgDesc = overview?.description || 'Manage your organization, members, workspaces, and projects.';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
      }}
    >
      {/* ── LEFT SIDEBAR (Identical to Assistant & Reference Image) ── */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          padding: '16px 14px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Logo */}
          <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KavachLogo size={24} showText={true} />
          </div>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link
              href="/assistant"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Search size={16} />
              <span>Search / Ask</span>
            </Link>

            <Link
              href="/projects"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <FolderGit2 size={16} />
              <span>Repositories</span>
            </Link>

            <Link
              href="/code/scans"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <Clock size={16} />
              <span>Scans</span>
            </Link>

            <Link
              href="/code/findings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <AlertCircle size={16} />
              <span>Findings</span>
            </Link>

            <Link
              href="/organization"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F1F5F9',
                textDecoration: 'none',
              }}
            >
              <Building2 size={16} color="#2563EB" />
              <span>Organization</span>
            </Link>

            <Link
              href="/settings/workspace"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* User profile footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 8px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Mayur Bharvad
            </span>
            <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              mayur@adit.edu.in
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT (SCREEN 04) ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 48px' }}>
        {/* Organization Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                flexShrink: 0,
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {orgName}
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                {orgDesc}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <UserPlus size={15} />
              <span>Invite member</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            borderBottom: '1px solid #E2E8F0',
            marginBottom: 32,
          }}
        >
          {(['overview', 'members', 'workspaces', 'projects', 'settings'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #0F172A' : '2px solid transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  marginBottom: -1,
                  transition: 'color 0.15s ease',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {/* 4 Metric Cards matching Screen 04 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
              {/* Total Workspaces */}
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {overview?.workspaces_count ?? 0}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
                  Workspaces
                </div>
              </div>

              {/* Total Projects */}
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {overview?.projects_count ?? 0}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
                  Projects
                </div>
              </div>

              {/* Total Repositories */}
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {overview?.repositories_count ?? 0}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
                  Repositories
                </div>
              </div>

              {/* Members */}
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {overview?.members_count ?? 1}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: 500 }}>
                  Members
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Recent activity
                </h2>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => router.push('/audit-logs')}
                >
                  View all <ArrowRight size={13} />
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                }}
              >
                {overview?.recent_activity && overview.recent_activity.length > 0 ? (
                  overview.recent_activity.map((act, idx) => (
                    <div
                      key={act.id || idx}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: idx !== overview.recent_activity.length - 1 ? '1px solid #F1F5F9' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: idx % 4 === 0 ? '#EFF6FF' : idx % 4 === 1 ? '#DCFCE7' : idx % 4 === 2 ? '#F3E8FF' : '#FEF3C7',
                            color: idx % 4 === 0 ? '#2563EB' : idx % 4 === 1 ? '#16A34A' : idx % 4 === 2 ? '#9333EA' : '#D97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {act.action.includes('scan') ? (
                            <Shield size={16} />
                          ) : act.action.includes('member') ? (
                            <Users size={16} />
                          ) : act.action.includes('workspace') ? (
                            <FolderGit2 size={16} />
                          ) : (
                            <Building2 size={16} />
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>
                            <strong style={{ fontWeight: 600 }}>{act.actor}</strong> {act.action}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>
                        {act.relative_time}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No recent activity recorded yet in this organization.
                  </div>
                )}
              </div>
            </div>

            {/* Workspaces Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Workspaces
                </h2>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => setActiveTab('workspaces')}
                >
                  View all <ArrowRight size={13} />
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                {overview?.workspaces && overview.workspaces.length > 0 ? (
                  overview.workspaces.map((ws, wsIdx) => {
                    const color = ORG_ICON_COLORS[wsIdx % ORG_ICON_COLORS.length];
                    return (
                      <div
                        key={ws.id}
                        style={{
                          padding: '20px',
                          borderRadius: 12,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 130,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              backgroundColor: color.bg,
                              color: color.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FolderGit2 size={18} />
                          </div>
                          <button
                            onClick={() => router.push(`/settings/workspace`)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 12 }}>
                            {ws.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                            {ws.project_count} projects · {ws.repository_count} repositories
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop: '1px solid #F1F5F9',
                            fontSize: 12,
                            color: '#64748B',
                          }}
                        >
                          <Users size={14} color="#94A3B8" />
                          <span>{ws.member_count || 1} members</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: 32,
                      textAlign: 'center',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      border: '1px dashed #CBD5E1',
                    }}
                  >
                    <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 12px 0' }}>
                      No workspaces configured yet in this organization.
                    </p>
                    <button
                      onClick={() => setShowCreateWsModal(true)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Create Workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: MEMBERS */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Organization Members
                </h2>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  Manage team member roles and invitations.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <UserPlus size={15} />
                <span>Invite member</span>
              </button>
            </div>

            {/* Members Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                  padding: '12px 20px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748B',
                }}
              >
                <span>MEMBER</span>
                <span>ROLE</span>
                <span>STATUS</span>
                <span style={{ textAlign: 'right' }}>ACTIONS</span>
              </div>

              {/* Owner Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F1F5F9',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    M
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>Mayur Bharvad</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>mayur@adit.edu.in</div>
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Owner / Admin
                  </span>
                </div>
                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16A34A', fontSize: 12, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                    Active
                  </span>
                </div>
                <div style={{ textAlign: 'right', color: '#94A3B8' }}>
                  Primary
                </div>
              </div>

              {/* Pending Invitations */}
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                    padding: '16px 20px',
                    borderBottom: '1px solid #F1F5F9',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Mail size={15} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{inv.email}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>Invited pending acceptance</div>
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {inv.role}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D97706', fontSize: 12, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706' }} />
                      Pending
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleRevokeInvitation(inv.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: WORKSPACES */}
        {activeTab === 'workspaces' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Workspaces in {orgName}
                </h2>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  Isolated environments for your projects and connected repositories.
                </p>
              </div>
              <button
                onClick={() => setShowCreateWsModal(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={15} />
                <span>Create workspace</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              {overview?.workspaces?.map((ws, wsIdx) => {
                const color = ORG_ICON_COLORS[wsIdx % ORG_ICON_COLORS.length];
                return (
                  <div
                    key={ws.id}
                    style={{
                      padding: '20px',
                      borderRadius: 12,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: color.bg,
                          color: color.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FolderGit2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{ws.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {ws.project_count} projects · {ws.repository_count} repositories
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: PROJECTS */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Organization Projects
                </h2>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  All engineering projects connected across this organization.
                </p>
              </div>
              <button
                onClick={() => router.push('/projects')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + New project
              </button>
            </div>
            <p style={{ color: '#64748B', fontSize: 13 }}>
              Total projects active: {overview?.projects_count ?? 0}. Switch to workspace views to manage individual project pipelines.
            </p>
          </div>
        )}

        {/* Tab 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                Organization name
              </label>
              <input
                type="text"
                defaultValue={orgName}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                defaultValue={orgDesc}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: 480,
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px 16px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Invite member to {orgName}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {inviteError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 12 }}>
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: 12 }}>
                  {inviteSuccess}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="admin">Admin (Full administrative control)</option>
                  <option value="member">Member (Can create projects and view scans)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isInviting ? 'Sending...' : 'Send invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateWsModal}
        onClose={() => setShowCreateWsModal(false)}
        onSuccess={() => {
          loadOrgData();
          refreshWorkspaces();
        }}
      />
    </div>
  );
}
