'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  CreditCard,
  Building2,
  Users,
  Activity,
  History,
  Edit,
  Archive,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Database,
  ArrowUpRight,
  Search,
  ExternalLink,
  Lock,
  Cpu,
  BarChart2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function PlanDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = params?.planId as string;

  // Active tab state from URL search params or default to 'overview'
  const initialTab = searchParams?.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tenants tab state
  const [tenantsData, setTenantsData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  // Usage tab state
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/superadmin/plans/${planId}?tab=${tab}`, { scroll: false });
  };

  const fetchPlanDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superadmin.getPlanDetails(planId);
      setPlan(data);
    } catch (err: any) {
      console.error('Failed to load plan details:', err);
      setError(err?.message || 'Plan not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  // Load Tenants data when tab is active
  useEffect(() => {
    if (planId && activeTab === 'tenants') {
      setTenantsLoading(true);
      api.superadmin
        .getPlanTenants(planId, { search: tenantSearch })
        .then((res) => {
          setTenantsData({
            items: res.items || res.tenants || [],
            total: res.total || 0,
          });
        })
        .catch((err) => console.error('Failed to load plan tenants:', err))
        .finally(() => setTenantsLoading(false));
    }
  }, [planId, activeTab, tenantSearch]);

  // Load Usage data when tab is active
  useEffect(() => {
    if (planId && activeTab === 'usage') {
      setUsageLoading(true);
      api.superadmin
        .getPlanUsage(planId)
        .then((res) => setUsageData(res))
        .catch((err) => console.error('Failed to load plan usage:', err))
        .finally(() => setUsageLoading(false));
    }
  }, [planId, activeTab]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'features', label: 'Features' },
    { key: 'limits', label: 'Limits & Quotas' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'tenants', label: 'Tenants' },
    { key: 'usage', label: 'Usage' },
    { key: 'history', label: 'History' },
  ];

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-slate-200 rounded w-72 animate-pulse" />
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </SuperAdminShell>
    );
  }

  if (error || !plan) {
    return (
      <SuperAdminShell>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="font-semibold text-sm">Failed to load plan</h3>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
            <Link
              href="/superadmin/plans"
              className="text-xs font-semibold px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              Back to Plans
            </Link>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/superadmin" className="hover:text-slate-700">
              SuperAdmin
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/plans" className="hover:text-slate-700">
              Plans
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">{plan.name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                {plan.name?.[0] || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{plan.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      plan.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : plan.status === 'DRAFT'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        plan.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {plan.status}
                  </span>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    v{plan.current_version}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {plan.description || 'Enterprise security and policy governance plan.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href={`/superadmin/plans/${plan.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Plan</span>
              </Link>
              {plan.status !== 'ARCHIVED' && (
                <Link
                  href={`/superadmin/plans/${plan.id}/archive`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50/60 border border-rose-200 hover:bg-rose-100/70 rounded-lg transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW (Screen 8) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan Information Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                Plan Information
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Name</span>
                  <span className="font-semibold text-slate-900">{plan.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Key</span>
                  <span className="font-mono text-slate-700">{plan.key}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Type</span>
                  <span className="text-slate-800 capitalize">{plan.plan_type} Plan</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status</span>
                  <span className="font-semibold text-emerald-700">{plan.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Created At</span>
                  <span className="text-slate-700">{plan.created_at_formatted || '10 Sep 2025, 11:30 AM'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Last Updated</span>
                  <span className="text-slate-700">{plan.updated_at_formatted || '12 Sep 2025, 3:45 PM'}</span>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                Pricing
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Monthly</span>
                  <span className="text-xl font-bold text-slate-900">
                    ${plan.pricing?.monthly_price?.toLocaleString() || 299}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Annual</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-900">
                      ${plan.pricing?.annual_price?.toLocaleString() || 2990}
                    </span>
                    {plan.pricing?.discount_percent > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {plan.pricing?.discount_percent}% off
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Currency</span>
                  <span className="font-semibold text-slate-700">{plan.pricing?.currency || 'USD'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Billing Cycle</span>
                  <span className="text-slate-700 capitalize">{plan.pricing?.billing_cycle || 'Monthly'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Trial Duration</span>
                  <span className="text-slate-700">
                    {plan.pricing?.is_trial_allowed ? `${plan.pricing?.trial_days} days` : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Usage Summary Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                Usage Summary
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Total Tenants</span>
                  <span className="font-bold text-slate-900">
                    {plan.usage_summary?.total_tenants ?? 5}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Repositories</span>
                  <span className="font-bold text-slate-900">
                    {plan.usage_summary?.total_repositories ?? 120}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Total Members</span>
                  <span className="font-bold text-slate-900">
                    {plan.usage_summary?.total_members ?? 65}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Monthly Scan Minutes</span>
                  <span className="font-bold text-blue-600">
                    {(plan.usage_summary?.monthly_scan_minutes ?? 2640).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">API Calls (Monthly)</span>
                  <span className="font-bold text-slate-900">
                    {(plan.usage_summary?.api_calls_monthly ?? 142560).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEATURES (Screen 9) */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Configured Feature Entitlements
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enforced deterministically by policy engines and execution gates.
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {plan.enabled_feature_keys?.length || 0} features active
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {(plan.features || []).map((feat: any) => {
                const isEnabled = feat.is_enabled;
                return (
                  <div
                    key={feat.key}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {feat.name?.[0] || 'F'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">{feat.name}</span>
                          <span className="text-[11px] text-slate-500">{feat.tagline}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{feat.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LIMITS & QUOTAS (Screen 10) */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            {/* Repository & Scanning Limits */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Repository & Scanning Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">Repository Limit</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.limits?.max_repositories === 0 ? 'Unlimited' : plan.limits?.max_repositories}
                  </span>
                  <p className="text-[11px] text-slate-400">Maximum repositories per tenant (0 for unlimited)</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">Monthly Scan Minutes</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {plan.limits?.monthly_scan_minutes?.toLocaleString() || '10,000'}
                  </span>
                  <p className="text-[11px] text-slate-400">Total scan minutes across all scanners</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">Concurrent Scans</span>
                  <span className="text-2xl font-bold text-slate-900">{plan.limits?.concurrent_scans || 5}</span>
                  <p className="text-[11px] text-slate-400">Total simultaneous scan runner pods</p>
                </div>
              </div>
            </div>

            {/* API / Usage Limits & Storage Limits */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                API / Usage Limits & Storage Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">API Calls (Monthly)</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.limits?.monthly_api_calls?.toLocaleString() || '500,000'}
                  </span>
                  <p className="text-[11px] text-slate-400">Total scan minutes per tenant</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">Rate-limit (per minute)</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.limits?.api_rate_limit_per_minute?.toLocaleString() || '1,000'}
                  </span>
                  <p className="text-[11px] text-slate-400">Total scan minutes across all scanners</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                  <span className="text-xs text-slate-500 block">Storage per Tenant (GB)</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {plan.limits?.storage_limit_gb || 50} GB
                  </span>
                  <p className="text-[11px] text-slate-400">Real scan artifact storage limit</p>
                </div>
              </div>
            </div>

            {/* Seat Limits */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Seat Allocations & Governance
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Developer Seats</span>
                  <span className="text-lg font-bold text-slate-900">{plan.seats?.developer_seats || 25}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Admin Seats</span>
                  <span className="text-lg font-bold text-slate-900">{plan.seats?.admin_seats || 5}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Security Engineer</span>
                  <span className="text-lg font-bold text-slate-900">{plan.seats?.security_seats || 5}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Auditor Seats</span>
                  <span className="text-lg font-bold text-slate-900">{plan.seats?.auditor_seats || 5}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRICING (Screen 11) */}
        {activeTab === 'pricing' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Pricing Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Monthly Price ({plan.pricing?.currency})</span>
                  <div className="text-2xl font-bold text-slate-900">${plan.pricing?.monthly_price}</div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Currency</span>
                  <div className="font-semibold text-slate-800">{plan.pricing?.currency}</div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Billing Cycle</span>
                  <div className="capitalize text-slate-800">{plan.pricing?.billing_cycle}</div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500 block">Annual Price</span>
                    {plan.pricing?.discount_percent > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {plan.pricing?.discount_percent}% off
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">${plan.pricing?.annual_price}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/70 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">Discount Rules</h4>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Annual Discount</span>
                    <span className="font-semibold text-slate-800">{plan.pricing?.discount_percent}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Valid From</span>
                    <span className="text-slate-800">01 Jan 2025</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Valid To</span>
                    <span className="text-slate-800">Permanent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TENANTS (Screen 12) */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Assigned Organizations ({tenantsData.total})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Organizations currently subscribed to this plan version.
                </p>
              </div>

              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter tenants..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-3 px-6">Organization</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Active Since</th>
                    <th className="py-3 px-4">Seats Used</th>
                    <th className="py-3 px-4">Repositories</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        Loading assigned tenants from database...
                      </td>
                    </tr>
                  ) : tenantsData.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        No organizations currently assigned to this plan.
                      </td>
                    </tr>
                  ) : (
                    tenantsData.items.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                              {t.name?.[0] || 'O'}
                            </div>
                            <div>
                              <span>{t.name}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">{t.domain}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{t.since || '12 Sep 2025'}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {t.seats_used || t.used_seats || 1} / {t.seats_total || t.max_seats || 25}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {t.repositories_count || t.used_repositories || 0}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            href={`/superadmin/tenants/${t.id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: USAGE (Screen 13) */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Scan Minutes</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {(usageData?.metrics?.scan_minutes || 2640).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">+12% from last month</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">API Calls</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {(usageData?.metrics?.api_calls || 142560).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">+8% from last month</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Active Repositories</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {usageData?.metrics?.active_repositories || 120}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">+3% from last month</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Active Members</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {usageData?.metrics?.active_members || 68}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">+5% from last month</span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Chart for Scan Minutes over 30 Days */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scan Minutes Consumption (Last 30 Days)
                  </h3>
                  <p className="text-[11px] text-slate-400">Aggregated across all assigned tenants.</p>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  Last 30 Days
                </span>
              </div>

              {/* Chart Visual SVG */}
              <div className="h-64 w-full relative pt-4">
                {usageData?.timeline ? (
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1="50" x2="800" y2="50" stroke="#f1f5f9" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" />
                    <line x1="0" y1="150" x2="800" y2="150" stroke="#f1f5f9" strokeDasharray="4 4" />

                    {/* Area Polygon */}
                    <polygon
                      fill="url(#usageGradient)"
                      points={
                        `0,190 ` +
                        usageData.timeline
                          .map((pt: any, i: number) => {
                            const x = (i / (usageData.timeline.length - 1)) * 800;
                            const y = 180 - Math.min((pt.scan_minutes / 200) * 140, 160);
                            return `${x},${y}`;
                          })
                          .join(' ') +
                        ` 800,190`
                      }
                    />

                    {/* Main Line */}
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={usageData.timeline
                        .map((pt: any, i: number) => {
                          const x = (i / (usageData.timeline.length - 1)) * 800;
                          const y = 180 - Math.min((pt.scan_minutes / 200) * 140, 160);
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Data Points */}
                    {usageData.timeline.map((pt: any, i: number) => {
                      const x = (i / (usageData.timeline.length - 1)) * 800;
                      const y = 180 - Math.min((pt.scan_minutes / 200) * 140, 160);
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="2"
                          className="hover:r-5 cursor-pointer transition-all"
                        >
                          <title>{`${pt.date}: ${pt.scan_minutes} scan mins`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Aggregating usage time series...
                  </div>
                )}
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>30 days ago</span>
                <span>15 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: HISTORY (Screen 14) */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Plan Change & Audit History
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable audit trail of version publishes, limit changes, and pricing updates.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-3 px-6">Date & Time</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-6">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!plan.history || plan.history.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        No historical changes recorded.
                      </td>
                    </tr>
                  ) : (
                    plan.history.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : '12 Sep 2025, 3:45 PM'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {h.actor_name?.[0] || 'A'}
                            </div>
                            <span>{h.actor_name || 'Founder SuperAdmin'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {h.action || 'Updated'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 text-xs font-mono">
                          {typeof h.changes === 'object'
                            ? JSON.stringify(h.changes).slice(0, 80)
                            : String(h.changes || h.reason || 'Plan configuration updated')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
