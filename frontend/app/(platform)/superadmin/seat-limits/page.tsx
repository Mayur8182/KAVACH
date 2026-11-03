'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Sliders,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SeatLimitsOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    total_tenants: 12,
    total_seats: 420,
    used_seats: 312,
    available_seats: 108,
  });
  const [items, setItems] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getSeatLimitsOverview({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        search: search || undefined,
      });
      setSummary(res.summary);
      setItems(res.items || []);
    } catch (err: any) {
      console.error('Failed to load seat limits overview:', err);
      setError(err?.message || 'Failed to retrieve developer seat limits.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, planFilter, search]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

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
    if (s.includes('limit') || s.includes('near') || s.includes('at')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          {status}
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

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Module Sub-Navigation */}
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
          <Link href="/superadmin/quotas" className="text-slate-500 hover:text-slate-800 transition-colors">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-slate-500 hover:text-slate-800 transition-colors">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Seat Limits</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Overview</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Developer Seat Limits Overview</h1>
              <p className="text-xs text-slate-500">Manage developer, security engineer and auditor seat limits across organizations.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/superadmin/seat-limits/policies"
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Seat Policies
              </Link>
              <Link
                href="/superadmin/seat-limits/overrides"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Seat Overrides
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Summary Metric Cards (Screen 9) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Tenants</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_tenants}</div>
            <div className="text-[11px] text-slate-400 mt-1">Active customer tenants</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Seats</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{summary.total_seats}</div>
            <div className="text-[11px] text-slate-400 mt-1">Licensed seats pool</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Used Seats</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.used_seats}</div>
            <div className="text-[11px] text-slate-400 mt-1">Assigned user memberships</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Available Seats</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.available_seats}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Unallocated capacity</div>
          </div>
        </div>

        {/* Search & Filters */}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="at limit">At Limit</option>
              <option value="over limit">Over Limit</option>
            </select>

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

            <button
              onClick={fetchSeats}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Seat Limits Table (Screen 9) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading seat allocations...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Total Seats</th>
                    <th className="py-3 px-4">Used</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {row.plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {row.total_seats}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                        {row.used}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold whitespace-nowrap">
                        {row.available}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/superadmin/seat-limits/usage?tenant=${encodeURIComponent(row.name)}`}
                          className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {items.length} organization seat ledgers</span>
            <span className="font-semibold text-slate-700">Deterministic Seat Ledger</span>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
