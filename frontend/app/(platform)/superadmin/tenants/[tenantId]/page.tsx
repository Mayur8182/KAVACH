'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  FolderGit2,
  Boxes,
  Cpu,
  Receipt,
  Activity,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  Download,
  Ban,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Filter,
  Calendar,
  CreditCard,
  DollarSign,
  Layers,
  HardDrive,
  Gauge,
  Server,
  Edit,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Brand SVGs
// ─────────────────────────────────────────────────────────────────────────────
function ProviderIcon({ provider, className = 'w-4 h-4' }: { provider: string; className?: string }) {
  const p = (provider || '').toLowerCase();

  if (p.includes('github') && !p.includes('actions')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }
  if (p.includes('gitlab')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M22.65 14.39L20.61 8.1c-.13-.41-.7-.41-.83 0l-2.04 6.29H6.26L4.22 8.1c-.13-.41-.7-.41-.83 0L1.35 14.39a1 1 0 00.36 1.12l10.29 7.49 10.29-7.49a1 1 0 00.36-1.12z" fill="#E24329" />
        <path d="M12 23l-10.65-8.61c-.36-.28-.5-.78-.36-1.12L3.39 8.1a.43.43 0 01.83 0l2.04 6.29H12v8.61z" fill="#FC6D26" />
        <path d="M12 23V14.39h5.74l2.04-6.29a.43.43 0 01.83 0l2.04 6.29c.14.34 0 .84-.36 1.12L12 23z" fill="#FCA326" />
      </svg>
    );
  }
  if (p.includes('bitbucket')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0052CC">
        <path d="M.75 3.375A.75.75 0 0 1 1.5 2.625h21a.75.75 0 0 1 .746.836l-2.625 17.25a.75.75 0 0 1-.746.639H4.125a.75.75 0 0 1-.746-.639L.754 3.461A.75.75 0 0 1 .75 3.375zm13.313 12.375l1.312-7.5H8.625l1.313 7.5h4.125z" />
      </svg>
    );
  }
  if (p.includes('jenkins')) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center">
        J
      </div>
    );
  }
  if (p.includes('actions')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#2088FF">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#2088FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (p.includes('aws')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#FF9900">
        <path d="M18.8 14.5c-2.4 1.8-5.8 2.8-8.8 2.8-4.2 0-8-1.5-10.9-4-.2-.2-.2-.5 0-.7.3-.2.6-.2.8 0 2.7 2.3 6.2 3.8 10.1 3.8 2.8 0 5.9-.9 8.2-2.5.3-.2.7-.1.9.2.1.2 0 .5-.3.6z" />
      </svg>
    );
  }
  if (p.includes('azure')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0078D4">
        <path d="M13.4 2.1l-6.1 11 3.8 4.2 8.7-2.9-6.4-12.3zm-8 12.6l-2.4 4.5c-.4.8.2 1.8 1.1 1.8h9.8l-8.5-6.3z" />
      </svg>
    );
  }
  if (p.includes('gcp') || p.includes('google')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#4285F4" />
      </svg>
    );
  }
  return <Boxes className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Circular Progress Dial Component (Panel 3.5)
// ─────────────────────────────────────────────────────────────────────────────
function CircularProgress({
  percentage,
  label,
  subtext,
  color = '#3B82F6',
  size = 72,
  strokeWidth = 7,
}: {
  percentage: number;
  label: string;
  subtext: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-4">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-sm font-bold text-slate-800">{percentage}%</span>
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900">{label}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Tenant Details Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TenantDetailsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.tenantId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Tenant profile & active tabs state
  const [tenant, setTenant] = useState<any>(null);
  const [membersData, setMembersData] = useState<any[]>([]);
  const [memberStats, setMemberStats] = useState<any>({ total: 48, admins: 5, developers: 32, security: 7, auditors: 4 });
  const [memberRoleFilter, setMemberRoleFilter] = useState('All');
  const [memberStatusFilter, setMemberStatusFilter] = useState('All');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const [reposData, setReposData] = useState<any[]>([]);
  const [repoStats, setRepoStats] = useState<any>({ total: 128, active: 112, private: 96, public: 32 });
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoProviderFilter, setRepoProviderFilter] = useState('All');
  const [repoVisibilityFilter, setRepoVisibilityFilter] = useState('All');

  const [integrationsData, setIntegrationsData] = useState<any>(null);
  const [resourcesData, setResourcesData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [selectedActivityCategory, setSelectedActivityCategory] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Actions
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState('bitbucket');

  // Form states
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('developer');
  const [newMemberName, setNewMemberName] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoProvider, setNewRepoProvider] = useState('github');

  // Load Tenant Details
  const loadTenantDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getTenantDetails(tenantId);
      if (res && (res.tenant || res.organization)) {
        const t = res.tenant || res.organization;
        setTenant(t);
        setEditName(t.name || 'TechCorp');
        setEditDomain(t.domain || 'techcorp.com');
        setEditIndustry(t.industry || 'Software Development');
        setEditDescription(t.description || 'A modern software company focused on building secure applications.');
      } else {
        setError('Tenant not found.');
      }
    } catch (err: any) {
      console.error('Failed to load tenant details:', err);
      setError(err?.message || 'Failed to retrieve tenant details from database.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadTenantDetails();
  }, [loadTenantDetails]);

  // Tab data fetching
  useEffect(() => {
    if (!tenantId) return;

    if (activeTab === 'members') {
      api.superadmin.getTenantMembers(tenantId)
        .then((res: any) => {
          if (res) {
            setMembersData(res.items || res.members || []);
            if (res.stats) setMemberStats(res.stats);
          }
        })
        .catch(console.error);
    } else if (activeTab === 'repositories') {
      api.superadmin.getTenantRepositories(tenantId)
        .then((res: any) => {
          if (res) {
            const list = Array.isArray(res) ? res : res.repositories || res.items || [];
            setReposData(list);
            if (res.stats) setRepoStats(res.stats);
          }
        })
        .catch(console.error);
    } else if (activeTab === 'integrations') {
      api.superadmin.getTenantIntegrations(tenantId)
        .then((res: any) => setIntegrationsData(res))
        .catch(console.error);
    } else if (activeTab === 'resources') {
      api.superadmin.getTenantResources(tenantId)
        .then((res: any) => setResourcesData(res))
        .catch(console.error);
    } else if (activeTab === 'billing') {
      api.superadmin.getTenantBilling(tenantId)
        .then((res: any) => setBillingData(res))
        .catch(console.error);
    } else if (activeTab === 'activity') {
      api.superadmin.getTenantActivity(tenantId)
        .then((res: any) => setActivityData(res))
        .catch(console.error);
    }
  }, [tenantId, activeTab]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'members') {
      router.push(`/superadmin/tenants/${tenantId}/members`);
      return;
    }
    setActiveTab(tabId);
    router.replace(`/superadmin/tenants/${tenantId}?tab=${tabId}`, { scroll: false });
  };

  // Actions
  const handleSaveOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Updates state and re-fetches
      setTenant((prev: any) => ({
        ...prev,
        name: editName,
        domain: editDomain,
        industry: editIndustry,
        description: editDescription,
      }));
      setIsEditOrgOpen(false);
    } catch (err: any) {
      alert(`Save failed: ${err?.message}`);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) return;
    try {
      await api.superadmin.inviteTenantMember(tenantId, {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setIsAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      // Refresh members
      const res = await api.superadmin.getTenantMembers(tenantId);
      if (res) setMembersData(res.items || res.members || []);
    } catch (err: any) {
      alert(`Failed to add member: ${err?.message}`);
    }
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName) return;
    const newRepoItem = {
      id: `repo-${Date.now()}`,
      name: newRepoName,
      provider: newRepoProvider,
      provider_display: newRepoProvider === 'github' ? 'GitHub' : newRepoProvider === 'gitlab' ? 'GitLab' : 'Bitbucket',
      language: 'TypeScript',
      last_scan: 'Just now',
      status: 'Scanned',
      vulnerabilities: { critical: 0, high: 0, medium: 0 },
      visibility: 'Private',
      default_branch: 'main',
    };
    setReposData((prev) => [newRepoItem, ...prev]);
    setIsAddRepoOpen(false);
    setNewRepoName('');
  };

  const handleConnectIntegration = async (provider: string) => {
    try {
      await api.superadmin.connectTenantIntegration(tenantId, {
        provider,
        account_name: `${provider}_account`,
      });
      setIsConnectModalOpen(false);
      const res = await api.superadmin.getTenantIntegrations(tenantId);
      setIntegrationsData(res);
    } catch (err: any) {
      alert(`Connection failed: ${err?.message}`);
    }
  };

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return membersData.filter((m) => {
      const matchesSearch =
        !memberSearchQuery ||
        m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(memberSearchQuery.toLowerCase());

      const matchesRole =
        memberRoleFilter === 'All' ||
        (m.role || '').toLowerCase().includes(memberRoleFilter.toLowerCase());

      const matchesStatus =
        memberStatusFilter === 'All' ||
        (m.status || '').toLowerCase() === memberStatusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [membersData, memberSearchQuery, memberRoleFilter, memberStatusFilter]);

  // Filtered Repositories
  const filteredRepos = useMemo(() => {
    return reposData.filter((r) => {
      const matchesSearch =
        !repoSearchQuery ||
        r.name?.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
        r.language?.toLowerCase().includes(repoSearchQuery.toLowerCase());

      const matchesProvider =
        repoProviderFilter === 'All' ||
        (r.provider || '').toLowerCase() === repoProviderFilter.toLowerCase();

      const matchesVisibility =
        repoVisibilityFilter === 'All' ||
        (r.visibility || '').toLowerCase() === repoVisibilityFilter.toLowerCase();

      return matchesSearch && matchesProvider && matchesVisibility;
    });
  }, [reposData, repoSearchQuery, repoProviderFilter, repoVisibilityFilter]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    const list = activityData?.items || activityData?.activities || [];
    return list.filter((act: any) => {
      const matchesSearch =
        !activitySearchQuery ||
        act.user?.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
        act.action?.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
        act.details?.toLowerCase().includes(activitySearchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [activityData, activitySearchQuery]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'repositories', label: 'Repositories' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'resources', label: 'Resources' },
    { id: 'billing', label: 'Billing' },
    { id: 'activity', label: 'Activity' },
  ];

  if (isLoading && !tenant) {
    return (
      <SuperAdminShell>
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Loading tenant profile...</p>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/superadmin/tenants" className="hover:text-slate-800">
            Tenant Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold">{tenant?.name || 'TechCorp'}</span>
        </div>

        {/* ── Tenant Header Profile Banner ── */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {/* Black square with T */}
            <div className="w-12 h-12 rounded-lg bg-black text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
              T
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {tenant?.name || 'TechCorp'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>{tenant?.domain || 'techcorp.com'}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">
                  Enterprise Plan
                </span>
              </div>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="relative">
            <button
              onClick={() => setIsActionOpen(!isActionOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
            >
              <span>Actions</span>
              <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${isActionOpen ? 'rotate-90' : ''}`} />
            </button>

            {isActionOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 text-xs divide-y divide-slate-100">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      setIsEditOrgOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    Edit Organization
                  </button>
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      setIsAddMemberOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      setIsAddRepoOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                    Add Repository
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      handleTabChange('resources');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    Manage Quotas
                  </button>
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      handleTabChange('billing');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    Change Plan
                  </button>
                  <Link
                    href={`/superadmin/tenants/${tenantId}/lifecycle`}
                    onClick={() => setIsActionOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    Lifecycle & Deletion
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 7 Horizontal Tabs ── */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 text-sm font-medium">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 font-semibold text-xs border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 8 KPI Cards (4x2 Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href={`/superadmin/tenants/${tenantId}/members`}
                className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5 hover:border-blue-400 hover:shadow transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Members</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">48</p>
                </div>
              </Link>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Repositories</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">128</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Integrations</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">6</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Projects Scanned</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">312</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Plan</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">Enterprise</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Status</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">Active</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Renewal Date</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">12 Jan 2025</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Monthly Usage</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">68%</p>
                </div>
              </div>
            </div>

            {/* 2-Column Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Organization Details (7 cols) */}
              <div className="md:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Organization Details</h3>
                  <button
                    onClick={() => setIsEditOrgOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Name</span>
                    <span className="col-span-2 text-slate-900 font-semibold">{tenant?.name || 'TechCorp'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Domain</span>
                    <span className="col-span-2 text-slate-900 font-semibold">{tenant?.domain || 'techcorp.com'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Type</span>
                    <span className="col-span-2 text-slate-900 font-semibold">{tenant?.org_type || 'Technology'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Industry</span>
                    <span className="col-span-2 text-slate-900 font-semibold">{tenant?.industry || 'Software Development'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Description</span>
                    <span className="col-span-2 text-slate-600 leading-relaxed">
                      {tenant?.description || 'A modern software company focused on building secure applications.'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-slate-500 font-medium">Logo</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-black text-white text-xs font-bold flex items-center justify-center">
                        T
                      </div>
                      <span className="text-slate-900 font-semibold">{tenant?.name || 'TechCorp'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Posture (5 cols) */}
              <div className="md:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Security Posture</h3>
                  <button
                    onClick={() => handleTabChange('repositories')}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-slate-700 font-medium">Critical</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">3</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-slate-700 font-medium">High</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">12</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-slate-700 font-medium">Medium</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">28</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-700 font-medium">Low</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">41</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.2: MEMBERS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* 5 KPI Cards in 1 Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Members</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{memberStats.total}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Admins</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{memberStats.admins}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Developers</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{memberStats.developers}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Security</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{memberStats.security}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Auditors</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{memberStats.auditors}</p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={memberRoleFilter}
                    onChange={(e) => setMemberRoleFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="All">Role: All</option>
                    <option value="Organization Admin">Role: Admin</option>
                    <option value="Developer">Role: Developer</option>
                    <option value="Security">Role: Security</option>
                    <option value="Auditor">Role: Auditor</option>
                  </select>

                  <select
                    value={memberStatusFilter}
                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Status: Active</option>
                    <option value="Invited">Status: Invited</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Member
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4 text-slate-600">{m.email}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{m.role}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.status === 'Invited'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'Invited' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{m.joined || '12 Jan 2024'}</td>
                      <td className="py-3 px-5 text-right">
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1-8 of 48 members</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    2
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    3
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    4
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    5
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.3: REPOSITORIES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'repositories' && (
          <div className="space-y-6">
            {/* 4 KPI Cards in 1 Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Total Repositories</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{repoStats.total}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Active</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{repoStats.active}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Private</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{repoStats.private}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Public</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{repoStats.public}</p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={repoProviderFilter}
                    onChange={(e) => setRepoProviderFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="All">Provider: All</option>
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                    <option value="bitbucket">Bitbucket</option>
                  </select>

                  <select
                    value={repoVisibilityFilter}
                    onChange={(e) => setRepoVisibilityFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="All">Visibility: All</option>
                    <option value="Private">Private</option>
                    <option value="Public">Public</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsAddRepoOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Repository
              </button>
            </div>

            {/* Repositories Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-5">Repository</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Last Scan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Vulnerabilities</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepos.map((repo, idx) => (
                    <tr key={repo.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-semibold text-slate-900">{repo.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <ProviderIcon provider={repo.provider} className="w-3.5 h-3.5" />
                          <span>{repo.provider_display || repo.provider}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{repo.language}</td>
                      <td className="py-3 px-4 text-slate-500">{repo.last_scan}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            repo.status === 'Failed'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {repo.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {repo.vulnerabilities ? (
                          <div className="flex items-center justify-center gap-1.5 font-bold text-[10px]">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                              {repo.vulnerabilities.critical}
                            </span>
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
                              {repo.vulnerabilities.high}
                            </span>
                            <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
                              {repo.vulnerabilities.medium}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-center block">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1-8 of 128 repositories</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    2
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    3
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    4
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                    5
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.4: INTEGRATIONS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* 3 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Connected</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">6</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Available</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">12</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Not Connected</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">6</p>
                </div>
              </div>
            </div>

            {/* SCM Providers Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SCM Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GitHub */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <ProviderIcon provider="github" className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">GitHub</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connected on 12 Jan 2024</p>
                    <Link
                      href={`/superadmin/tenants/${tenantId}/integrations`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 hover:underline"
                    >
                      Configure →
                    </Link>
                  </div>
                </div>

                {/* GitLab */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                    <ProviderIcon provider="gitlab" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">GitLab</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connected on 03 Feb 2024</p>
                  </div>
                </div>

                {/* Bitbucket */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <ProviderIcon provider="bitbucket" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">Bitbucket</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                      Not Connected
                    </span>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setConnectProvider('bitbucket');
                          setIsConnectModalOpen(true);
                        }}
                        className="px-3.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CI/CD Providers Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">CI/CD Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Jenkins */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <ProviderIcon provider="jenkins" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">Jenkins</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connected on 21 Feb 2024</p>
                  </div>
                </div>

                {/* GitHub Actions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ProviderIcon provider="actions" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">GitHub Actions</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connected on 05 Mar 2024</p>
                  </div>
                </div>

                {/* GitLab CI */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                    <ProviderIcon provider="gitlab" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">GitLab CI</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                      Not Connected
                    </span>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setConnectProvider('gitlab-ci');
                          setIsConnectModalOpen(true);
                        }}
                        className="px-3.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Providers Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cloud Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* AWS */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <ProviderIcon provider="aws" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">AWS</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connected on 12 Jan 2024</p>
                  </div>
                </div>

                {/* Azure */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <ProviderIcon provider="azure" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">Azure</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                      Not Connected
                    </span>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setConnectProvider('azure');
                          setIsConnectModalOpen(true);
                        }}
                        className="px-3.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>

                {/* GCP */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <ProviderIcon provider="gcp" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">GCP</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                      Not Connected
                    </span>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setConnectProvider('gcp');
                          setIsConnectModalOpen(true);
                        }}
                        className="px-3.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.5: RESOURCES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* 4 Circular Progress Dials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <CircularProgress
                percentage={42}
                label="CPU Usage"
                subtext="(42 of 100 vCPU)"
                color="#3B82F6"
              />
              <CircularProgress
                percentage={58}
                label="Memory Usage"
                subtext="(58 of 100 GB)"
                color="#3B82F6"
              />
              <CircularProgress
                percentage={27}
                label="Storage Usage"
                subtext="(270 GB of 1 TB)"
                color="#3B82F6"
              />
              <CircularProgress
                percentage={68}
                label="Scan Credits"
                subtext="(68K of 100K)"
                color="#10B981"
              />
            </div>

            {/* 4 Cards (2x2 Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Infrastructure Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Infrastructure</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Cluster</span>
                    <span className="font-semibold text-slate-900 font-mono">eks-techcorp-01</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Region</span>
                    <span className="font-semibold text-slate-900">ap-south-1 (Mumbai)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Node Count</span>
                    <span className="font-semibold text-slate-900">6</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Healthy
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/superadmin/tenants/${tenantId}/resources`}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              {/* Environment Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Environment</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Production</p>
                      <p className="text-[11px] text-slate-400 font-mono">eks-techcorp-prod</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Staging</p>
                      <p className="text-[11px] text-slate-400 font-mono">eks-techcorp-staging</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Development</p>
                      <p className="text-[11px] text-slate-400 font-mono">eks-techcorp-dev</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Quotas & Limits Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Quotas & Limits</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Max Repositories</span>
                    <p className="font-bold text-slate-900 mt-1">500 <span className="font-normal text-slate-500">(128 used)</span></p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Max Members</span>
                    <p className="font-bold text-slate-900 mt-1">100 <span className="font-normal text-slate-500">(48 used)</span></p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Scan Credits</span>
                    <p className="font-bold text-slate-900 mt-1">100,000 <span className="font-normal text-slate-500">(68,000 used)</span></p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Storage</span>
                    <p className="font-bold text-slate-900 mt-1">1 TB <span className="font-normal text-slate-500">(270 GB used)</span></p>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/superadmin/tenants/${tenantId}/resources`}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    View All Quotas
                  </Link>
                </div>
              </div>

              {/* Isolation Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Isolation</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Kubernetes Namespace</span>
                    <span className="font-mono text-slate-900 font-semibold">techcorp</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Database Instance</span>
                    <span className="font-mono text-slate-900 font-semibold">techcorp-db</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Object Storage</span>
                    <span className="font-mono text-slate-900 font-semibold">techcorp-storage</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Network Policy</span>
                    <span className="text-slate-900 font-semibold">Isolated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.6: BILLING */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* 4 KPI Cards in 1 Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Current Plan</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">Enterprise</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Monthly Price</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">$299/month</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Next Billing Date</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">12 Jan 2025</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Payment Method</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">•••• 4242</p>
                </div>
              </div>
            </div>

            {/* Middle Section: Usage This Month + Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usage This Month */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Usage This Month</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-700">Scan Credits</span>
                      <span className="text-slate-500 font-semibold">68,000 / 100,000 (68%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-700">Storage</span>
                      <span className="text-slate-500 font-semibold">270 GB / 1 TB (27%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '27%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-700">Members</span>
                      <span className="text-slate-500 font-semibold">48 / 100 (48%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '48%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-700">Repositories</span>
                      <span className="text-slate-500 font-semibold">128 / 500 (26%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '26%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Plan Details</h3>
                      <p className="text-xs font-bold text-slate-800 mt-1">Enterprise</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">$299/month</span>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Unlimited scanning</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Advanced security features</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Custom integrations</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dedicated infrastructure</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setIsChangePlanOpen(true)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Change Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Invoices Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Invoices</h3>
                <button className="text-xs text-blue-600 font-semibold hover:underline">
                  View All Invoices
                </button>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(billingData?.invoices || [
                    { invoice_number: 'INV-2024-001', date: '12 Jan 2024', amount_formatted: '$299.00', status: 'Paid' },
                    { invoice_number: 'INV-2023-012', date: '12 Dec 2023', amount_formatted: '$299.00', status: 'Paid' },
                    { invoice_number: 'INV-2023-011', date: '12 Nov 2023', amount_formatted: '$299.00', status: 'Paid' },
                  ]).map((inv: any, idx: number) => (
                    <tr key={inv.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-semibold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.date || inv.billing_date}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{inv.amount_formatted || `$${inv.amount}`}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline">
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PANEL 3.7: ACTIVITY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Top Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none">
                  <option>All Activities</option>
                  <option>Settings Updates</option>
                  <option>Scans</option>
                  <option>Member Changes</option>
                </select>

                <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none">
                  <option>All Users</option>
                  <option>Rahul Patel</option>
                  <option>Priya Sharma</option>
                  <option>Amit Singh</option>
                  <option>System</option>
                </select>

                <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none">
                  <option>All Severity</option>
                  <option>Info</option>
                  <option>Success</option>
                  <option>Warning</option>
                  <option>Error</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>01 Jan 2024 - 31 Mar 2024</span>
              </div>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Quick Filter Tags (3 cols) */}
              <div className="md:col-span-3 bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  {[
                    { name: 'Token Sharing', count: 3036 },
                    { name: 'Same Old Questions', count: 3024 },
                    { name: 'Priority Support', count: 3030 },
                    { name: 'Secure Repositories', count: 3027 },
                  ].map((cat) => {
                    const isSelected = selectedActivityCategory === cat.name;
                    return (
                      <div
                        key={cat.name}
                        onClick={() => setSelectedActivityCategory(isSelected ? null : cat.name)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{cat.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Main Audit Log Table (9 cols) */}
              <div className="md:col-span-9 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-5 text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActivities.map((act: any, idx: number) => {
                      const isError = act.severity === 'Error';
                      return (
                        <tr key={act.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{act.time}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{act.user}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{act.action}</td>
                          <td className="py-3 px-4">
                            <span className={isError ? 'text-red-600 font-medium' : 'text-slate-600'}>
                              {act.details}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                act.severity === 'Success'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : act.severity === 'Warning'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : act.severity === 'Error'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {act.severity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing 1-8 of 124 activities</span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-semibold">
                      1
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                      2
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                      3
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                      4
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                      5
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MODALS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Edit Organization Modal */}
        {isEditOrgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Edit Organization Details</h3>
                <button onClick={() => setIsEditOrgOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveOrgDetails} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOrgOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Invite Member to Organization</h3>
                <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Nair"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@techcorp.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="developer">Developer</option>
                    <option value="security">Security</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Organization Admin</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Repository Modal */}
        {isAddRepoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Add New Repository</h3>
                <button onClick={() => setIsAddRepoOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddRepo} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Repository Name</label>
                  <input
                    type="text"
                    placeholder="e.g. auth-service"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Git Provider</label>
                  <select
                    value={newRepoProvider}
                    onChange={(e) => setNewRepoProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                    <option value="bitbucket">Bitbucket</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRepoOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    Register Repository
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Connect Integration Modal */}
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">
                  Connect {connectProvider.toUpperCase()}
                </h3>
                <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Authenticate and grant organization-level webhook & repository access to sync telemetry.
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-600">
                  <p className="font-semibold text-slate-800">Required Scopes:</p>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                    <li>repo (full repository control)</li>
                    <li>read:org (read organization and team membership)</li>
                    <li>admin:repo_hook (read/write repository hooks)</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectIntegration(connectProvider)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    Authorize & Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Plan Modal */}
        {isChangePlanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Change Subscription Tier</h3>
                <button onClick={() => setIsChangePlanOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 border-2 border-blue-600 rounded-xl bg-blue-50/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Enterprise Plan</span>
                    <span className="font-bold text-blue-600">$299/mo</span>
                  </div>
                  <p className="text-slate-500 mt-1">Unlimited scanning, dedicated cluster, 24/7 support.</p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Pro Plan</span>
                    <span className="font-bold text-slate-700">$99/mo</span>
                  </div>
                  <p className="text-slate-500 mt-1">Up to 25 repositories, standard runners.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangePlanOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
