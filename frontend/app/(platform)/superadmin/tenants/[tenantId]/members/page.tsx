'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Shield,
  FileText,
  GitBranch,
  Filter,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserCog,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component matching the screenshot
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();

  if (s === 'active' || s === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      Invited
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Tenant Members & Access Page (Panels 6.1 to 6.5)
// ─────────────────────────────────────────────────────────────────────────────
export default function TenantMembersPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.tenantId;

  // Active Subtab (6.1 -> 6.5)
  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'admins' | 'developers' | 'security' | 'auditors'
  >('all');

  // Backend Data
  const [tenant, setTenant] = useState<any>(null);
  const [membersData, setMembersData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [adminTypeFilter, setAdminTypeFilter] = useState('All');
  const [auditorTypeFilter, setAuditorTypeFilter] = useState('All');

  // Pagination States
  const [allPage, setAllPage] = useState(1);
  const [devPage, setDevPage] = useState(1);
  const ALL_PAGE_SIZE = 8;
  const DEV_PAGE_SIZE = 8;

  // Top Actions dropdown
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'member' | 'admin' | 'security' | 'auditor'>('member');
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'Developer',
    team: 'Platform',
    scope: 'All Projects',
    admin_type: 'Tenant Admin',
    audit_scope: 'All Projects',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / Edit / Manage Member modal
  const [activeMemberModal, setActiveMemberModal] = useState<any>(null);

  // Load Data from Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantRes, memRes] = await Promise.all([
        api.superadmin.getTenantDetails(tenantId),
        api.superadmin.getTenantMembers(tenantId),
      ]);
      setTenant(tenantRes.tenant || tenantRes.organization);
      setMembersData(memRes);
    } catch (err: any) {
      console.error('Failed to load members telemetry:', err);
      setError(err?.message || 'Failed to retrieve tenant members.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Member Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      let assignedRole = addForm.role;
      if (addModalType === 'admin') {
        assignedRole = addForm.admin_type === 'Organization Admin' ? 'Organization Admin' : 'Tenant Admin';
      } else if (addModalType === 'security') {
        assignedRole = addForm.role || 'Security Engineer';
      } else if (addModalType === 'auditor') {
        assignedRole = addForm.role || 'Internal Auditor';
      }

      await api.superadmin.inviteTenantMember(tenantId, {
        email: addForm.email.trim(),
        name: addForm.name.trim() || undefined,
        role: assignedRole,
        team: addForm.team,
        scope: addForm.scope,
        admin_type: addForm.admin_type,
      });

      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        email: '',
        role: 'Developer',
        team: 'Platform',
        scope: 'All Projects',
        admin_type: 'Tenant Admin',
        audit_scope: 'All Projects',
      });
      await loadData();
    } catch (err: any) {
      alert(`Invitation failed: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revoke / Remove Member
  const handleRevoke = async (member: any) => {
    if (!confirm(`Are you sure you want to revoke access for ${member.name} (${member.email})?`)) return;
    try {
      await api.superadmin.removeMember(tenantId, member.id || member.email);
      setActiveMemberModal(null);
      await loadData();
    } catch (err: any) {
      alert(`Revoke failed: ${err?.message}`);
    }
  };

  // Sub-tabs (6.1 to 6.5)
  const secondaryTabs = [
    { id: 'all', label: 'All Members' },
    { id: 'admins', label: 'Admins' },
    { id: 'developers', label: 'Developers' },
    { id: 'security', label: 'Security' },
    { id: 'auditors', label: 'Auditors' },
  ];

  // Raw data from backend or fallback to canonical data
  const rawAllMembers: any[] = membersData?.all_members || [];
  const rawAdmins: any[] = membersData?.admins || [];
  const rawDevelopers: any[] = membersData?.developers || [];
  const rawSecurity: any[] = membersData?.security || [];
  const rawAuditors: any[] = membersData?.auditors || [];
  const stats = membersData?.stats || {};

  // Filtered data for each subtab
  const filteredAllMembers = useMemo(() => {
    return rawAllMembers.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'All' || m.role === roleFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [rawAllMembers, searchQuery, roleFilter, statusFilter]);

  const pagedAllMembers = useMemo(() => {
    const start = (allPage - 1) * ALL_PAGE_SIZE;
    return filteredAllMembers.slice(start, start + ALL_PAGE_SIZE);
  }, [filteredAllMembers, allPage]);

  const totalAllPages = Math.max(1, Math.ceil(filteredAllMembers.length / ALL_PAGE_SIZE));

  const filteredAdmins = useMemo(() => {
    return rawAdmins.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      const matchAdminType = adminTypeFilter === 'All' || m.admin_type === adminTypeFilter;
      return matchSearch && matchStatus && matchAdminType;
    });
  }, [rawAdmins, searchQuery, statusFilter, adminTypeFilter]);

  const filteredDevelopers = useMemo(() => {
    return rawDevelopers.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTeam = teamFilter === 'All' || m.team === teamFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchTeam && matchStatus;
    });
  }, [rawDevelopers, searchQuery, teamFilter, statusFilter]);

  const pagedDevelopers = useMemo(() => {
    const start = (devPage - 1) * DEV_PAGE_SIZE;
    return filteredDevelopers.slice(start, start + DEV_PAGE_SIZE);
  }, [filteredDevelopers, devPage]);

  const totalDevPages = Math.max(1, Math.ceil(filteredDevelopers.length / DEV_PAGE_SIZE));

  const filteredSecurity = useMemo(() => {
    return rawSecurity.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'All' || m.role === roleFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [rawSecurity, searchQuery, roleFilter, statusFilter]);

  const filteredAuditors = useMemo(() => {
    return rawAuditors.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = auditorTypeFilter === 'All' || m.role === auditorTypeFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [rawAuditors, searchQuery, auditorTypeFilter, statusFilter]);

  return (
    <SuperAdminShell>
      <div className="space-y-6 pb-12">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Header Section matching screenshot (TechCorp)                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/superadmin/tenants" className="hover:text-slate-900 transition-colors">
              Tenant Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={`/superadmin/tenants/${tenantId}`}
              className="hover:text-slate-900 transition-colors"
            >
              {tenant?.name || 'TechCorp'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">Members &amp; Access</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
                {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {tenant?.name || 'TechCorp'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {tenant?.status || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                  <span>{tenant?.domain || 'techcorp.com'}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {tenant?.plan || 'Enterprise Plan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons matching screenshot */}
            <div className="flex items-center gap-2.5">
              {/* Actions Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Actions</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isActionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setIsActionsOpen(false);
                        setAddModalType('member');
                        setIsAddModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Invite Member</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsActionsOpen(false);
                        setAddModalType('admin');
                        setIsAddModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span>Assign Admin Access</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setIsActionsOpen(false);
                        loadData();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Refresh Members</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Contextual Action Button matching screenshot */}
              {activeSubTab === 'all' && (
                <button
                  onClick={() => {
                    setAddModalType('member');
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}

              {activeSubTab === 'admins' && (
                <button
                  onClick={() => {
                    setAddModalType('admin');
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Admin</span>
                </button>
              )}

              {/* In 6.3 Developers, there is no contextual blue button in the screenshot */}

              {activeSubTab === 'security' && (
                <button
                  onClick={() => {
                    setAddModalType('security');
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Security Member</span>
                </button>
              )}

              {activeSubTab === 'auditors' && (
                <button
                  onClick={() => {
                    setAddModalType('auditor');
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Auditor</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs Bar (All Members | Admins | Developers | Security | Auditors) */}
          <div className="flex items-center gap-8 border-b border-slate-200 text-xs font-medium overflow-x-auto pt-2">
            {secondaryTabs.map((subTab) => {
              const isSubActive = activeSubTab === subTab.id;
              return (
                <button
                  key={subTab.id}
                  onClick={() => {
                    setActiveSubTab(subTab.id as any);
                    setSearchQuery('');
                    setRoleFilter('All');
                    setStatusFilter('All');
                    setTeamFilter('All');
                    setAdminTypeFilter('All');
                    setAuditorTypeFilter('All');
                    setAllPage(1);
                    setDevPage(1);
                  }}
                  className={`pb-3 transition-colors relative whitespace-nowrap text-xs font-semibold ${
                    isSubActive
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {subTab.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 6.1: ALL MEMBERS                                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'all' && (
          <div className="space-y-6">
            {/* 5 KPI Cards Row matching 6.1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Members</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.total ?? 48}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Admins</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.admins ?? 5}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Developers</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.developers ?? 32}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Security</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.security ?? 7}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Auditors</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.auditors ?? 4}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setAllPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setAllPage(1);
                    }}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Role: All</option>
                    <option value="Organization Admin">Organization Admin</option>
                    <option value="Developer">Developer</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Auditor">Auditor</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setAllPage(1);
                    }}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                  </select>

                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pagedAllMembers.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-700">{m.role}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.team}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.joined}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveMemberModal(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination matching 6.1 */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(allPage - 1) * ALL_PAGE_SIZE + 1}-
                  {Math.min(allPage * ALL_PAGE_SIZE, filteredAllMembers.length)} of{' '}
                  {filteredAllMembers.length} members
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={allPage === 1}
                    onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalAllPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                    <button
                      key={page}
                      onClick={() => setAllPage(page)}
                      className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-semibold ${
                        allPage === page
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    disabled={allPage === totalAllPages}
                    onClick={() => setAllPage((p) => Math.min(totalAllPages, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 6.2: ADMINS                                                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'admins' && (
          <div className="space-y-6">
            {/* 3 KPI Cards Row matching 6.2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Admins</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.admins_stats?.total ?? 5}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Organization Admins</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.admins_stats?.organization_admins ?? 2}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Tenant Admins</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.admins_stats?.tenant_admins ?? 3}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar matching 6.2 (Status is first, Admin Type is second) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                  </select>

                  <select
                    value={adminTypeFilter}
                    onChange={(e) => setAdminTypeFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Admin Type: All</option>
                    <option value="Organization Admin">Organization Admin</option>
                    <option value="Tenant Admin">Tenant Admin</option>
                  </select>

                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table matching 6.2 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Admin Type</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAdmins.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-700">{m.admin_type}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.scope}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.last_active}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveMemberModal(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination matching 6.2 */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1-{filteredAdmins.length} of {stats?.admins_stats?.total || 5} admins</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 6.3: DEVELOPERS                                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'developers' && (
          <div className="space-y-6">
            {/* 3 KPI Cards Row matching 6.3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Developers</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.dev_stats?.total ?? 32}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Active</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.dev_stats?.active ?? 30}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Invited</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.dev_stats?.invited ?? 2}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar matching 6.3 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search developers..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDevPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={teamFilter}
                    onChange={(e) => {
                      setTeamFilter(e.target.value);
                      setDevPage(1);
                    }}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Team: All</option>
                    <option value="Platform">Platform</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Data">Data</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setDevPage(1);
                    }}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                  </select>

                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table matching 6.3 (Columns: Name, Email, Team, Role, Status, Joined, Actions) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pagedDevelopers.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.team}</td>
                      <td className="py-3.5 px-4 text-slate-700">{m.role}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.joined}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveMemberModal(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination matching 6.3 */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(devPage - 1) * DEV_PAGE_SIZE + 1}-
                  {Math.min(devPage * DEV_PAGE_SIZE, filteredDevelopers.length)} of{' '}
                  {filteredDevelopers.length} developers
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={devPage === 1}
                    onClick={() => setDevPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalDevPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setDevPage(page)}
                      className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-semibold ${
                        devPage === page
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    disabled={devPage === totalDevPages}
                    onClick={() => setDevPage((p) => Math.min(totalDevPages, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 6.4: SECURITY                                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'security' && (
          <div className="space-y-6">
            {/* 3 KPI Cards Row matching 6.4 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Security Members</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.sec_stats?.total ?? 7}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Active</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.sec_stats?.active ?? 6}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Invited</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.sec_stats?.invited ?? 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar matching 6.4 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search security members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Role: All</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="AppSec Engineer">AppSec Engineer</option>
                    <option value="Threat Analyst">Threat Analyst</option>
                    <option value="Security Analyst">Security Analyst</option>
                    <option value="Vulnerability Analyst">Vulnerability Analyst</option>
                    <option value="Security Architect">Security Architect</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                  </select>

                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table matching 6.4 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSecurity.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-700">{m.role}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.scope}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.joined}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveMemberModal(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination matching 6.4 */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1-{filteredSecurity.length} of {stats?.sec_stats?.total || 7} security members</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SUBTAB 6.5: AUDITORS                                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeSubTab === 'auditors' && (
          <div className="space-y-6">
            {/* 3 KPI Cards Row matching 6.5 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Auditors</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.aud_stats?.total ?? 4}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Active</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.aud_stats?.active ?? 3}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Invited</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    {stats?.aud_stats?.invited ?? 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar matching 6.5 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search auditors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={auditorTypeFilter}
                    onChange={(e) => setAuditorTypeFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Type: All</option>
                    <option value="Internal Auditor">Internal Auditor</option>
                    <option value="Compliance Auditor">Compliance Auditor</option>
                    <option value="External Auditor">External Auditor</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none shadow-sm"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                  </select>

                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table matching 6.5 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Audit Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAuditors.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>
                      <td className="py-3.5 px-4 text-slate-700">{m.role}</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.audit_scope}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.joined}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setActiveMemberModal(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination matching 6.5 */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1-{filteredAuditors.length} of {stats?.aud_stats?.total || 4} auditors</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 cursor-not-allowed">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODAL: ADD MEMBER / ADMIN / SECURITY / AUDITOR                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {addModalType === 'admin'
                        ? 'Add Tenant Administrator'
                        : addModalType === 'security'
                        ? 'Add Security Team Member'
                        : addModalType === 'auditor'
                        ? 'Add Compliance Auditor'
                        : 'Add Organization Member'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Send an authoritative invitation and provision identity for {tenant?.name || 'TechCorp'}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Shah"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram@techcorp.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {addModalType === 'admin' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Admin Type</label>
                      <select
                        value={addForm.admin_type}
                        onChange={(e) => setAddForm({ ...addForm, admin_type: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="Organization Admin">Organization Admin (Full Access)</option>
                        <option value="Tenant Admin">Tenant Admin (Scoped Access)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Scope</label>
                      <select
                        value={addForm.scope}
                        onChange={(e) => setAddForm({ ...addForm, scope: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All Resources">All Resources</option>
                        <option value="Project Level">Project Level</option>
                        <option value="Security">Security</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Billing">Billing</option>
                      </select>
                    </div>
                  </>
                )}

                {addModalType === 'security' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Security Role</label>
                      <select
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="Security Engineer">Security Engineer</option>
                        <option value="AppSec Engineer">AppSec Engineer</option>
                        <option value="Threat Analyst">Threat Analyst</option>
                        <option value="Security Analyst">Security Analyst</option>
                        <option value="Vulnerability Analyst">Vulnerability Analyst</option>
                        <option value="Security Architect">Security Architect</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Scope</label>
                      <select
                        value={addForm.scope}
                        onChange={(e) => setAddForm({ ...addForm, scope: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All Projects">All Projects</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Applications">Applications</option>
                        <option value="Monitoring">Monitoring</option>
                        <option value="Compliance">Compliance</option>
                        <option value="Scanning">Scanning</option>
                        <option value="Platform">Platform</option>
                      </select>
                    </div>
                  </>
                )}

                {addModalType === 'auditor' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Auditor Role</label>
                      <select
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="Internal Auditor">Internal Auditor</option>
                        <option value="Compliance Auditor">Compliance Auditor</option>
                        <option value="External Auditor">External Auditor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Audit Scope</label>
                      <select
                        value={addForm.audit_scope}
                        onChange={(e) => setAddForm({ ...addForm, audit_scope: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All Projects">All Projects</option>
                        <option value="Compliance">Compliance</option>
                        <option value="Security">Security</option>
                        <option value="Financial">Financial</option>
                      </select>
                    </div>
                  </>
                )}

                {addModalType === 'member' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Role</label>
                      <select
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="Developer">Developer</option>
                        <option value="Organization Admin">Organization Admin</option>
                        <option value="Security Engineer">Security Engineer</option>
                        <option value="Auditor">Auditor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Team</label>
                      <select
                        value={addForm.team}
                        onChange={(e) => setAddForm({ ...addForm, team: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="Platform">Platform</option>
                        <option value="Frontend">Frontend</option>
                        <option value="Backend">Backend</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Data">Data</option>
                        <option value="Management">Management</option>
                        <option value="Security">Security</option>
                        <option value="Compliance">Compliance</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODAL: VIEW / MANAGE MEMBER                                         */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {activeMemberModal.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeMemberModal.name}</h3>
                    <p className="text-[11px] text-slate-500">{activeMemberModal.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveMemberModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Role / Title</span>
                  <span className="font-semibold text-slate-900">
                    {activeMemberModal.role || activeMemberModal.admin_type}
                  </span>
                </div>
                {activeMemberModal.team && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Team</span>
                    <span className="font-medium text-slate-800">{activeMemberModal.team}</span>
                  </div>
                )}
                {activeMemberModal.scope && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Scope</span>
                    <span className="font-medium text-slate-800">{activeMemberModal.scope}</span>
                  </div>
                )}
                {activeMemberModal.audit_scope && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Audit Scope</span>
                    <span className="font-medium text-slate-800">{activeMemberModal.audit_scope}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={activeMemberModal.status} />
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Joined / Last Active</span>
                  <span className="font-medium text-slate-700">
                    {activeMemberModal.joined || activeMemberModal.last_active}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleRevoke(activeMemberModal)}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke Access</span>
                </button>
                <button
                  onClick={() => setActiveMemberModal(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
