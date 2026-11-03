'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Sliders,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function PlanActionAuditLogPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [orgName, setOrgName] = useState<string>('Organization');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logs, curr] = await Promise.all([
        api.superadmin.getTenantPlanAuditLog(tenantId, {
          action: actionFilter !== 'all' ? actionFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        api.superadmin.getTenantCurrentPlan(tenantId),
      ]);
      setEvents(logs || []);
      setOrgName(curr.organization?.name || 'Organization');
    } catch (err: any) {
      console.error('Failed to load plan action audit log:', err);
      setError(err?.message || 'Failed to retrieve plan audit events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
  }, [tenantId, actionFilter, statusFilter]);

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.action && e.action.toLowerCase().includes(q)) ||
      (e.performed_by && e.performed_by.toLowerCase().includes(q)) ||
      (e.details && e.details.toLowerCase().includes(q)) ||
      (e.date && e.date.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('upgraded')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          {action}
        </span>
      );
    }
    if (act.includes('downgraded')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <TrendingDown className="w-3 h-3 text-amber-600" />
          {action}
        </span>
      );
    }
    if (act.includes('override')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Sliders className="w-3 h-3 text-purple-600" />
          {action}
        </span>
      );
    }
    if (act.includes('converted')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <RefreshCw className="w-3 h-3 text-indigo-600" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <CreditCard className="w-3 h-3 text-blue-600" />
        {action}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <AlertCircle className="w-3 h-3 text-red-500" />
        Failed
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Navigation Sub-Tabs */}
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

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/tenants/plan" className="hover:underline">
              Tenants
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700">{orgName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/superadmin/tenants/${tenantId}/plan/usage`} className="hover:underline">
              Plan
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Audit Log</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plan Action Audit Log</h1>
              <p className="text-xs text-slate-500">View all privileged plan-related actions and security events for this tenant.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/usage`}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Usage
              </Link>
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/change`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Change Plan
              </Link>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="assigned">Plan Assigned</option>
              <option value="upgraded">Plan Upgraded</option>
              <option value="downgraded">Plan Downgraded</option>
              <option value="override">Overrides Updated</option>
              <option value="converted">Trial Converted</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={loadAuditLog}
              title="Refresh"
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audit Events Table (Screen 16) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading audit events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No plan action events found</p>
              <p className="text-xs text-slate-500">No privileged plan modifications match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((event, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{event.date}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(event.action)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                            {event.performed_by ? event.performed_by[0] : 'U'}
                          </div>
                          <span className="font-medium text-slate-800">{event.performed_by}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {event.details}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {getStatusBadge(event.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Info */}
          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {filteredEvents.length} privileged plan action events</span>
            <span className="font-medium text-slate-600">Deterministic Audit Ledger & Evidence Persistence</span>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
