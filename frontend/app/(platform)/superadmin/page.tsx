'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Key,
  Database,
  Users,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Activity,
  Layers,
  Sparkles,
  Server,
  Receipt,
  Headphones,
  Flag,
  UserCheck,
  GitBranch,
  ChevronRight,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SuperAdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platform Metrics
  const [tenantStats, setTenantStats] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [planStats, setPlanStats] = useState({ total: 0, active: 0, trial: 0, archived: 0 });
  const [quotaStats, setQuotaStats] = useState({ total_tenants: 0, over_quota: 0, near_limit: 0, healthy: 0 });
  const [seatStats, setSeatStats] = useState({ total_allocated: 0, total_used: 0, over_limit: 0 });
  const [trialStats, setTrialStats] = useState({ total_trials: 0, active: 0, expiring_soon: 0, converted: 0 });

  // Recent Items
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [recentTrials, setRecentTrials] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [tenantsRes, plansRes, quotasRes, seatsRes, trialsRes] = await Promise.allSettled([
        api.superadmin.listTenants({ page: 1, page_size: 5, sort_by: 'created_at', sort_order: 'desc' }),
        api.superadmin.listPlans({ page: 1, page_size: 10 }),
        api.superadmin.getQuotasOverview(),
        api.superadmin.getSeatLimitsOverview(),
        api.superadmin.listTrials(),
      ]);

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value) {
        setRecentTenants(tenantsRes.value.items || []);
        if (tenantsRes.value.stats) {
          setTenantStats({
            total: tenantsRes.value.stats.total || tenantsRes.value.total || 0,
            active: tenantsRes.value.stats.active || 0,
            pending: tenantsRes.value.stats.pending || 0,
            suspended: tenantsRes.value.stats.suspended || 0,
          });
        }
      }

      if (plansRes.status === 'fulfilled' && plansRes.value) {
        setPlanStats({
          total: plansRes.value.stats?.total || plansRes.value.total || 0,
          active: plansRes.value.stats?.active || 0,
          trial: plansRes.value.stats?.trial || 0,
          archived: plansRes.value.stats?.archived || 0,
        });
      }

      if (quotasRes.status === 'fulfilled' && quotasRes.value?.summary) {
        setQuotaStats(quotasRes.value.summary);
      }

      if (seatsRes.status === 'fulfilled' && seatsRes.value?.summary) {
        setSeatStats({
          total_allocated: seatsRes.value.summary.total_allocated || 0,
          total_used: seatsRes.value.summary.total_used || 0,
          over_limit: seatsRes.value.summary.over_limit || 0,
        });
      }

      if (trialsRes.status === 'fulfilled' && trialsRes.value) {
        setRecentTrials(trialsRes.value.items?.slice(0, 5) || []);
        if (trialsRes.value.summary) {
          setTrialStats({
            total_trials: trialsRes.value.summary.total_trials || 0,
            active: trialsRes.value.summary.active || 0,
            expiring_soon: trialsRes.value.summary.expiring_soon || 0,
            converted: trialsRes.value.summary.converted || 0,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load SuperAdmin dashboard data:', err);
      setError(err?.message || 'Failed to aggregate SuperAdmin metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  return (
    <SuperAdminShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Platform Executive Cockpit</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              SuperAdmin Global Control Plane
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Centralized oversight of all customer organizations, subscription licensing, seat limits, and security enforcement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{refreshing ? 'Synchronizing...' : 'Refresh Metrics'}</span>
            </button>
            <Link
              href="/superadmin/tenants/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Provision Tenant</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={handleRefresh} className="underline font-semibold hover:text-amber-900">
              Retry
            </button>
          </div>
        )}

        {/* Primary KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Tenants */}
          <Link
            href="/superadmin/tenants"
            className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Tenants</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : tenantStats.total}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span className="text-emerald-600 font-medium">{tenantStats.active} Active</span>
                <span>•</span>
                <span>{tenantStats.suspended} Suspended</span>
              </div>
            </div>
          </Link>

          {/* Card 2: Subscription Plans */}
          <Link
            href="/superadmin/plans"
            className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Subscription Plans</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : planStats.total}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span className="text-indigo-600 font-medium">{planStats.active} Published</span>
                <span>•</span>
                <span>Tier Catalogs</span>
              </div>
            </div>
          </Link>

          {/* Card 3: Developer Seats */}
          <Link
            href="/superadmin/seat-limits"
            className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Seats Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : `${seatStats.total_used} / ${seatStats.total_allocated}`}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span className={seatStats.over_limit > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                  {seatStats.over_limit} Over Limit
                </span>
              </div>
            </div>
          </Link>

          {/* Card 4: Quota Policies */}
          <Link
            href="/superadmin/quotas"
            className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Quota Health</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : quotaStats.healthy}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                <span className="text-rose-600 font-medium">{quotaStats.over_quota} Exceeded</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600">{quotaStats.near_limit} Warning</span>
              </div>
            </div>
          </Link>

          {/* Card 5: Customer Trials */}
          <Link
            href="/superadmin/trials"
            className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Trials</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : trialStats.active}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                <span className="text-purple-600 font-medium">{trialStats.expiring_soon} Expiring</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600">{trialStats.converted} Converted</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Core SuperAdmin Modules Grid */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
            Platform Management Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Module 1: Tenant Management */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    Part 1
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Tenant Management</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Provision new organizations, inspect member allocations, configure data retention policies, and monitor provisioning jobs.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>{tenantStats.total} Organizations</span>
                </div>
                <Link
                  href="/superadmin/tenants"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Module 2: Plans & Licensing */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Part 2
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Subscription Plans & Tiers</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Configure Free, Pro, Business, and Enterprise plans. Define feature gates, scanner execution allowances, and add-on pricing.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>{planStats.total} Configured Plans</span>
                </div>
                <Link
                  href="/superadmin/plans"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  <span>Configure</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Module 3: Feature Entitlements */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Part 2
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Feature Entitlements</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Granular control over scanner capabilities, AI remediation agents, OPA contract enforcement, and container security.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Feature Catalog</span>
                <Link
                  href="/superadmin/entitlements"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  <span>Entitlements</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Module 4: Quotas & Execution Limits */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Part 4 · Section A
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Repository & Scan Quotas</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  8 dedicated screens for repository allowances, concurrent scan minutes, API rate limits, storage consumption, and custom overrides.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-700">{quotaStats.over_quota} Over Quota</span>
                </div>
                <Link
                  href="/superadmin/quotas"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
                >
                  <span>Review Quotas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Module 5: Developer Seat Limits */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                    Part 4 · Section B
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Developer Seat Limits</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Track allocated seats per organization, enforce overage warnings, define automatic seat expansion policies, and grant temporary seat waivers.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {seatStats.total_used} / {seatStats.total_allocated} Seats
                </span>
                <Link
                  href="/superadmin/seat-limits"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                >
                  <span>Seat Policies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Module 6: Customer Trial Management */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                    Part 4 · Section C
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Trial Management & Pipeline</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Provision 14/30-day proof-of-concept trials, extend evaluations, convert prospects directly to annual enterprise agreements, and audit history.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-purple-600 font-semibold">{trialStats.active} Active Trials</span>
                <Link
                  href="/superadmin/trials"
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
                >
                  <span>Trials Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Live Recent Entities Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Recently Active Organizations</h3>
              </div>
              <Link href="/superadmin/tenants" className="text-xs font-medium text-blue-600 hover:underline">
                View all ({tenantStats.total})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading organizations...</div>
            ) : recentTenants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No organizations found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTenants.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t.name}</p>
                      <p className="text-[11px] text-slate-400">{t.slug || t.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          t.status === 'active' || t.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.status || (t.is_active ? 'Active' : 'Suspended')}
                      </span>
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Trials Pipeline Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Evaluation & Trial Pipeline</h3>
              </div>
              <Link href="/superadmin/trials" className="text-xs font-medium text-purple-600 hover:underline">
                All trials ({trialStats.total_trials})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading trial pipeline...</div>
            ) : recentTrials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No active trials recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTrials.map((tr) => (
                  <div key={tr.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{tr.organization_name || tr.tenant_name}</p>
                      <p className="text-[11px] text-slate-400">Plan: {tr.plan_key?.toUpperCase()} • {tr.days_remaining}d remaining</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          tr.status === 'active'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : tr.status === 'converted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {tr.status}
                      </span>
                      <Link
                        href={`/superadmin/trials/${tr.id}`}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global System Health & Operations Banner */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Platform Security & Engine Integrity</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All 5 deterministic engines (Semgrep, Trivy, Checkov, Gitleaks, OPA) active with runtime policy enforcement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/superadmin/infrastructure"
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Engine Health
            </Link>
            <Link
              href="/superadmin/security"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm"
            >
              Audit Vault
            </Link>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
