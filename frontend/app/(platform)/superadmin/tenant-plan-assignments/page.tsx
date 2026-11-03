'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Building2,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantPlanAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: { total_tenants: 0, active: 0, on_trial: 0, suspended: 0 },
    items: [],
  });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = () => {
    setLoading(true);
    setError(null);
    api.superadmin.listTenantPlanAssignments({ search })
      .then((res) => {
        if (res) {
          setData(res);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load tenant plan assignments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filteredItems = (data.items || []).filter((item: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (item.tenant_name || item.name || '').toLowerCase().includes(term) ||
      (item.plan_name || item.plan_key || '').toLowerCase().includes(term) ||
      (item.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Subscription Entitlements</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tenant Plan Assignments & Overrides
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Authoritative assignment of subscription tiers, custom pricing, and feature overrides per customer tenant.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAssignments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Assignments</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>DB Persistence: Live</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total Assigned Tenants</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {data.summary?.total_tenants || 0}
              </span>
              <span className="text-xs text-slate-400">Tenants</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">In tenant_plan_assignments table</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Active Paid Subscriptions</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">
                {data.summary?.active || 0}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status ACTIVE</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Active Trials</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-700">
                {data.summary?.on_trial || 0}
              </span>
              <span className="text-xs text-blue-600 font-semibold">Trialing</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Auto-converting pipeline</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Suspended / Inactive</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-600">
                {data.summary?.suspended || 0}
              </span>
              <span className="text-xs text-slate-400">Suspended</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Zero scans authorized</p>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Tenant Subscription Ledger</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real data retrieved from /api/v1/superadmin/tenant-plan-assignments</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tenant or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying tenant plan assignments from database...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No tenant plan assignments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Tenant Organization</th>
                    <th className="px-6 py-3">Current Plan</th>
                    <th className="px-6 py-3">Billing Cadence</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Effective Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item: any) => (
                    <tr key={item.tenant_id || item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.tenant_name || item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.tenant_id || item.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {item.plan_name || item.plan_key || 'PRO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {item.billing_cycle || 'monthly'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.start_date || item.effective_from ? new Date(item.start_date || item.effective_from).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/superadmin/tenants/${item.tenant_id || item.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
