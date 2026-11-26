'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listTenantPlanAssignments().catch(() => ({ items: [] }));
      if (res?.items) {
        setAssignments(res.items);
      }
    } catch (err: any) {
      console.error('Failed to query subscriptions:', err);
      setError(err?.message || 'Failed to aggregate active customer subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filtered = assignments.filter((a) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (a.tenant_name || '').toLowerCase().includes(term) ||
      (a.plan_name || '').toLowerCase().includes(term) ||
      (a.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Commercial Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Subscription Lifecycle Management
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Active plan entitlements, seat utilization, and renewal tracking across tenant organizations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubscriptions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Subscriptions</span>
            </button>
            <Link
              href="/superadmin/plans"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0F17] text-white rounded-lg text-xs font-semibold hover:bg-[#1E293B] transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Manage Plans</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tenant or plan name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">
            {filtered.length} Subscriptions Listed
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Tenant Organization</th>
                  <th className="px-4 py-3">Assigned Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Seats Allocated</th>
                  <th className="px-4 py-3">Assigned On</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying subscription records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[#94A3B8]">
                      No subscription plan assignments found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#475569]" />
                          <span className="font-semibold text-[#0F172A]">{item.tenant_name || item.tenant_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#E8E6E1] px-2 py-0.5 rounded text-[11px]">
                          {item.plan_name || 'Standard Tier'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">
                          {item.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                        {item.seats_allocated ?? item.seat_limit ?? 'Default'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/superadmin/tenants/${item.tenant_id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline"
                        >
                          <span>Inspect Tenant</span>
                          <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}

