'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Users,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SeatUsageAllocationPage() {
  const searchParams = useSearchParams();
  const initialTenant = searchParams.get('tenant') || 'Acme Corp';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'roles'>('overview');
  const [selectedTenant, setSelectedTenant] = useState(initialTenant);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<any>({
    tenant_name: 'Acme Corp',
    total_seats: 25,
    used_seats: 18,
    available_seats: 7,
    pending_invites: 3,
    role_allocations: [
      { role: 'Developers', used: 14, total: 20, percentage: 70 },
      { role: 'Security Engineers', used: 4, total: 5, percentage: 80 },
      { role: 'Auditors', used: 2, total: 3, percentage: 67 },
    ],
    usage_trend: [],
  });

  useEffect(() => {
    async function loadUsage() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getSeatUsageAndAllocation(selectedTenant);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load seat usage:', err);
        setError(err?.message || 'Failed to retrieve tenant seat usage.');
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, [selectedTenant]);

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
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
            <Link href="/superadmin/seat-limits" className="hover:underline">
              Seat Limits
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Seat Usage & Allocation</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Seat Usage & Allocation</h1>
              <p className="text-xs text-slate-500">Granular role-wise seat breakdown and 30-day occupancy trend.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/seat-limits"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Acme Corp">Acme Corp</option>
                <option value="Globex Inc">Globex Inc</option>
                <option value="Initech">Initech</option>
                <option value="Umbrella Corp">Umbrella Corp</option>
                <option value="Stark Industries">Stark Industries</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-tabs: Usage Overview | Role-wise Usage */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Usage Overview
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'roles'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Role-wise Usage
          </button>
        </div>

        {/* 4 Summary Badges (Screen 10) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Seats</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{data.total_seats}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Permitted under plan</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Used Seats</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{data.used_seats}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Active assigned seats</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Available Seats</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{data.available_seats}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Available for invitation</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Pending Invites</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{data.pending_invites}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Reserved seat invites</div>
          </div>
        </div>

        {/* Role Allocation Breakdown (Screen 10) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Role Allocations</h3>
              <p className="text-xs text-slate-500">Occupancy segmented by member security role.</p>
            </div>
            <span className="text-xs font-bold text-slate-700">{selectedTenant}</span>
          </div>

          <div className="space-y-4">
            {data.role_allocations?.map((item: any, idx: number) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-bold text-slate-800">{item.role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-600">{item.used} / {item.total}</span>
                    <span className="font-bold text-blue-600 w-10 text-right">{item.percentage}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seat Usage Trend Chart (Screen 10) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Seat Usage Trend</h3>
              <p className="text-xs text-slate-500">Historical member occupancy versus licensed ceiling.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Used Seats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Total Seats</span>
              </div>
            </div>
          </div>

          <div className="h-44 w-full bg-slate-50 rounded-xl border border-slate-100 p-4 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 120" preserveAspectRatio="none">
              <line x1="0" y1="20" x2="800" y2="20" stroke="#cbd5e1" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="800" y2="70" stroke="#cbd5e1" strokeDasharray="3 3" />

              {/* Total Seats Horizontal line */}
              <line x1="0" y1="20" x2="800" y2="20" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

              {/* Used Seats ascending curve */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points="0,85 100,80 200,75 300,75 400,65 500,55 600,50 700,45 800,40"
              />
            </svg>
            <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-slate-400 font-medium px-4">
              <span>Sep 01</span>
              <span>Sep 10</span>
              <span>Sep 20</span>
              <span>Sep 30</span>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
