'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  CreditCard,
  TrendingUp,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [billing, setBilling] = useState<any>({
    mrr: 0,
    total_organizations: 0,
    active_subscriptions: 0,
    gateway_status: 'NOT CONFIGURED',
    invoices: [],
  });
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getBillingSummary()
      .then((res) => setBilling(res))
      .catch((err) => setError(err.message || 'Failed to load billing summary'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const filteredInvoices = (billing.invoices || []).filter((inv: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (inv.organization_name || '').toLowerCase().includes(term) ||
      (inv.id || '').toLowerCase().includes(term) ||
      (inv.tier || '').toLowerCase().includes(term)
    );
  });

  const isGatewayConnected = billing.gateway_status === 'CONNECTED';

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Receipt className="w-4 h-4" />
              <span>Financial Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Billing, Licensing & Invoicing
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live customer subscription pricing, database-derived MRR, and payment gateway connectivity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBilling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalculate MRR</span>
            </button>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              isGatewayConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stripe Gateway: {billing.gateway_status}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Revenue KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Live Platform MRR</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                ${(billing.mrr || 0).toLocaleString()}
              </span>
              <span className="text-xs text-emerald-600 font-semibold inline-flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> Calculated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sum of active organization plan rates</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Active Subscriptions</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">
                {billing.active_subscriptions || 0}
              </span>
              <span className="text-xs text-slate-400">/ {billing.total_organizations || 0} Orgs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status ACTIVE in organizations table</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Average Revenue Per Org</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-700">
                ${billing.total_organizations > 0 ? Math.round(billing.mrr / billing.total_organizations) : 0} /mo
              </span>
              <span className="text-xs text-blue-600 font-semibold">ARPO</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Blended across all tiers</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Invoices In Audit Trail</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {(billing.invoices || []).length}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Tracked</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Current billing period</p>
          </div>
        </div>

        {/* Invoices & Plan Subscriptions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Active Tenant Invoicing Ledger</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real organization subscriptions queried via /api/v1/superadmin/billing/summary</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or org..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Calculating live MRR and organization ledger...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No invoice records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Invoice Number</th>
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Assigned Tier</th>
                    <th className="px-6 py-3">Monthly Charge</th>
                    <th className="px-6 py-3">Payment Status</th>
                    <th className="px-6 py-3">Issued Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                        {inv.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{inv.organization_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{inv.organization_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {inv.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ${inv.amount.toLocaleString()} /mo
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : 'Active'}
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
