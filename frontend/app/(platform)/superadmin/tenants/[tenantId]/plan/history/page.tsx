'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  CreditCard,
  History,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  User as UserIcon,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantPlanAssignmentHistoryPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [tenantName, setTenantName] = useState('Organization');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [histRes, currRes] = await Promise.all([
          api.superadmin.getTenantPlanAssignmentHistory(tenantId),
          api.superadmin.getTenantCurrentPlan(tenantId),
        ]);
        setHistoryItems(histRes || []);
        if (currRes?.organization?.name) {
          setTenantName(currRes.organization.name);
        }
      } catch (err: any) {
        console.error('Failed to load plan history:', err);
        setError(err?.message || 'Failed to retrieve assignment history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId]);

  const getPlanBadge = (pName: string) => {
    const p = (pName || '').toLowerCase();
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
    if (p.includes('trial')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Trial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Starter
      </span>
    );
  };

  const getActionBadge = (act: string) => {
    const a = (act || '').toLowerCase();
    if (a.includes('upgrade')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Upgraded
        </span>
      );
    }
    if (a.includes('convert')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Converted
        </span>
      );
    }
    if (a.includes('downgrade')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Downgraded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Assigned
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
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

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/tenants/plan" className="hover:underline">
              Tenants
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{tenantName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">History</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plan Assignment History</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                View historical plan changes for {tenantName}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/select`}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                Change Plan
              </Link>
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/overrides`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                Overrides
              </Link>
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/usage`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                Usage
              </Link>
            </div>
          </div>
        </div>

        {/* History Table (Screen 4) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading plan history records...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No historical plan modifications found for this tenant.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{item.date}</td>
                    <td className="py-3 px-4">{getPlanBadge(item.plan)}</td>
                    <td className="py-3 px-4">{getActionBadge(item.action)}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{item.changed_by}</td>
                    <td className="py-3 px-4 text-slate-500">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-2">
          <Link
            href="/superadmin/tenants/plan"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
        </div>
      </div>
    </SuperAdminShell>
  );
}
