'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantPlanAssignmentOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listTenantPlanAssignments({
        search: searchQuery.trim() || undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load tenant plan assignments:', err);
      setError(err?.message || 'Failed to retrieve tenant plan assignments.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, planFilter, statusFilter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const summary = data?.summary || {
    total_tenants: 12,
    active: 10,
    on_trial: 2,
    suspended: 0,
  };

  const getPlanBadge = (planName: string) => {
    const p = (planName || '').toLowerCase();
    if (p.includes('enterprise')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Enterprise
        </span>
      );
    }
    if (p.includes('pro')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Pro
        </span>
      );
    }
    if (p.includes('custom')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Custom
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Starter
      </span>
    );
  };

  const getStatusBadge = (st: string) => {
    const s = (st || '').toLowerCase();
    if (s.includes('active')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    }
    if (s.includes('trial')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Trial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Suspended
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Sub-Tabs matching reference layout */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements Matrix
          </Link>
          <Link
            href="/superadmin/tenants/plan"
            className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold"
          >
            Tenant Plan Assignment
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plans</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Tenant Plan Assignment</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Plan Assignment</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                View and manage subscription plans for all tenants.
              </p>
            </div>
          </div>
        </div>

        {/* Metric Cards (Screen 1 top banner) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tenants</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_tenants}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Active</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.active}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">On Trial</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.on_trial}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Suspended</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{summary.suspended}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
              <option value="custom">Custom</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              onClick={() => fetchAssignments()}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading tenant plan assignments from database...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800 space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={() => fetchAssignments()}
              className="px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-rose-700 hover:bg-rose-100"
            >
              Try Again
            </button>
          </div>
        ) : (data?.items || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No Tenant Assignments Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tenants match your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Current Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.items.map((tenant: any) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/superadmin/tenants/${tenant.id}/plan/select`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 font-bold text-xs">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{tenant.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{tenant.domain}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getPlanBadge(tenant.current_plan)}</td>

                    <td className="py-3.5 px-4">{getStatusBadge(tenant.status)}</td>

                    <td className="py-3.5 px-4 text-slate-600">{tenant.next_billing}</td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/superadmin/tenants/${tenant.id}/plan/select`}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          Select Plan
                        </Link>
                        <Link
                          href={`/superadmin/tenants/${tenant.id}/plan/overrides`}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          Overrides
                        </Link>
                        <Link
                          href={`/superadmin/tenants/${tenant.id}/plan/usage`}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          Usage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
