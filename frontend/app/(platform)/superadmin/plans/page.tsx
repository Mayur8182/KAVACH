'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  SlidersHorizontal,
  CreditCard,
  CheckCircle2,
  Clock,
  Archive,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Users,
  Box,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SubscriptionPlansOverviewPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'trial' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listPlans({
        status: activeTab === 'all' ? undefined : activeTab,
        plan_type: planTypeFilter === 'all' ? undefined : planTypeFilter,
        search: searchQuery.trim() || undefined,
        page,
        page_size: 10,
      });
      setPlans(res.plans || []);
      if (res.stats) {
        setStats(res.stats);
      }
      setTotalPages(Math.ceil((res.total || 1) / 10));
    } catch (err: any) {
      console.error('Failed to fetch subscription plans:', err);
      setError(err?.message || 'Failed to load plans from server');
    } finally {
      setLoading(false);
    }
  }, [activeTab, planTypeFilter, searchQuery, page]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleTabChange = (tab: 'all' | 'active' | 'trial' | 'archived') => {
    setActiveTab(tab);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Active
        </span>
      );
    }
    if (s === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Archived
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb & Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plans</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Subscription Plans</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage subscription plans, pricing, features and entitlements.
              </p>
            </div>
            <Link
              href="/superadmin/plans/create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Plans</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-500">defined</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats.active}</span>
              <span className="text-xs text-emerald-600 font-medium">in production</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Trial Plans</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats.trial}</span>
              <span className="text-xs text-slate-500">available</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Archived</span>
              <Archive className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats.archived}</span>
              <span className="text-xs text-slate-500">deprecated</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs + Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-lg w-fit">
              {(['all', 'active', 'trial', 'archived'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab === 'all' ? 'All Plans' : tab}
                </button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <select
                value={planTypeFilter}
                onChange={(e) => {
                  setPlanTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="PAID">Paid</option>
                <option value="TRIAL">Trial</option>
                <option value="CUSTOM">Custom</option>
              </select>

              <button
                onClick={() => fetchPlans()}
                title="Refresh from database"
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="m-4 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchPlans()}
                className="font-medium underline hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Plans Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-4">Key</th>
                  <th className="py-3.5 px-4">Billing</th>
                  <th className="py-3.5 px-4">Price (Monthly)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="h-4 bg-slate-200 rounded w-28"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-14"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">No subscription plans found</h3>
                        <p className="text-xs text-slate-500">
                          {searchQuery || activeTab !== 'all'
                            ? 'No plans match the selected filters. Try adjusting your search query or reset status filters.'
                            : 'Get started by creating your first subscription plan with security features and quota limits.'}
                        </p>
                        <Link
                          href="/superadmin/plans/create"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New Plan</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/superadmin/plans/${plan.id}`)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {plan.name?.[0] || 'P'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {plan.name}
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              {plan.description || `${plan.plan_type} Tier`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        {plan.key}
                      </td>
                      <td className="py-4 px-4 text-slate-700 capitalize">
                        {plan.billing_cycle || 'Monthly'}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {plan.monthly_price === 0
                          ? '$0'
                          : plan.pricing_model === 'CUSTOM'
                          ? 'Custom'
                          : `$${plan.monthly_price?.toLocaleString()}`}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(plan.status)}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {plan.created_at_formatted || '12 Sep 2025'}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/superadmin/plans/${plan.id}`}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            href={`/superadmin/plans/${plan.id}/edit`}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            Edit
                          </Link>
                          {plan.status !== 'ARCHIVED' && (
                            <Link
                              href={`/superadmin/plans/${plan.id}/archive`}
                              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              Archive
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {plans.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-medium text-slate-800">{plans.length}</span> plans
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
