'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Settings,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  HardDrive,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function QuotaOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    total_tenants: 12,
    over_quota: 2,
    near_limit: 3,
    healthy: 7,
  });
  const [items, setItems] = useState<any[]>([]);

  // Filters
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchQuotas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getQuotasOverview({
        quota_type: activeTab !== 'all' ? activeTab : undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      setSummary(res.summary);
      setItems(res.items);
    } catch (err: any) {
      console.error('Failed to load quota overview:', err);
      setError(err?.message || 'Failed to retrieve tenant quota overview.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, planFilter, statusFilter, search]);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('over')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" />
          Over Limit
        </span>
      );
    }
    if (s.includes('near')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Near Limit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Healthy
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const p = (plan || '').toLowerCase();
    if (p.includes('enterprise')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
          Enterprise
        </span>
      );
    }
    if (p.includes('pro')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          Pro
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
        Starter
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Module Sub-Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements
          </Link>
          <Link href="/superadmin/tenants/plan" className="text-slate-500 hover:text-slate-800 transition-colors">
            Tenant Plan Assignment
          </Link>
          <Link href="/superadmin/quotas" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-slate-500 hover:text-slate-800 transition-colors">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Quotas</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Overview</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotas Overview</h1>
              <p className="text-xs text-slate-500">Manage repository, scans, API and storage quotas across all tenants.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/superadmin/quotas/repositories"
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Configure Quotas
              </Link>
              <Link
                href="/superadmin/quotas/overrides"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Tenant Overrides
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Summary Metric Cards (Screen 1) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Tenants</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_tenants}</div>
            <div className="text-[11px] text-slate-400 mt-1">Monitored active tenants</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Over Quota</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-red-600 mt-1">{summary.over_quota}</div>
            <div className="text-[11px] text-red-500 font-medium mt-1">Requires immediate review</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Near Limit</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{summary.near_limit}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">&gt; 80% quota utilized</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Healthy</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.healthy}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Operating within thresholds</div>
          </div>
        </div>

        {/* Filter Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-slate-200">
          {[
            { id: 'all', label: 'All Quotas', href: '/superadmin/quotas' },
            { id: 'repositories', label: 'Repositories', href: '/superadmin/quotas/repositories' },
            { id: 'scans', label: 'Scan Minutes', href: '/superadmin/quotas/scans' },
            { id: 'api', label: 'API Usage', href: '/superadmin/quotas/api-usage' },
            { id: 'storage', label: 'Storage', href: '/superadmin/quotas/storage' },
            { id: 'overrides', label: 'Overrides', href: '/superadmin/quotas/overrides' },
            { id: 'history', label: 'Usage History', href: '/superadmin/quotas/history' },
            { id: 'alerts', label: 'Alerts', href: '/superadmin/quotas/alerts' },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                tab.id === 'all'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="near limit">Near Limit</option>
              <option value="over limit">Over Limit</option>
            </select>

            <button
              onClick={fetchQuotas}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quota Overview Table (Screen 1) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading quota telemetry...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Database className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No tenant quota data found</p>
              <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Repositories</th>
                    <th className="py-3 px-4">Scan Minutes</th>
                    <th className="py-3 px-4">API Calls</th>
                    <th className="py-3 px-4">Storage</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{row.name}</span>
                          {getPlanBadge(row.plan)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {row.repositories}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {row.scan_minutes}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {row.api_calls}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {row.storage}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {items.length} tenants with authoritative quota limits</span>
            <span className="font-semibold text-slate-700">SecuLayer Enforcement Layer Active</span>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
