'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  TrendingUp,
  Sliders,
  ArrowLeft,
  Activity,
  FileText,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function QuotaUsageHistoryPage() {
  const [activeSubTab, setActiveSubTab] = useState<'trends' | 'audit'>('trends');
  const [timeframe, setTimeframe] = useState('30_days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trendPoints, setTrendPoints] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getQuotaUsageHistory(timeframe);
        setTrendPoints(res.trend_points || []);
        setRecentEvents(res.recent_events || []);
      } catch (err: any) {
        console.error('Failed to load usage history:', err);
        setError(err?.message || 'Failed to retrieve usage history.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [timeframe]);

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Sub-Navigation */}
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

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/quotas" className="hover:underline">
              Quotas
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Usage History</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quota Usage History</h1>
              <p className="text-xs text-slate-500">Historical consumption trends and recent capacity event alerts.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/quotas"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30_days">Last 30 Days</option>
                <option value="90_days">Last 90 Days</option>
                <option value="12_months">Last 12 Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-tabs: Usage Trends | Audit Log */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('trends')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'trends'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Usage Trends
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'audit'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Usage Trends Chart Card (Screen 7) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Quota Trajectory</h3>
              <p className="text-xs text-slate-500">Multi-metric aggregate consumption across all active tenants.</p>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Repositories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Scan Mins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>API Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Storage</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Line Chart (Screen 7) */}
          <div className="h-64 w-full bg-slate-50/60 rounded-xl border border-slate-100 p-4 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* Repositories Line (Blue) */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points="0,150 80,140 160,130 240,135 320,120 400,110 480,105 560,95 640,90 720,85 800,80"
              />

              {/* Scan Minutes Line (Indigo) */}
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                points="0,120 80,110 160,115 240,95 320,100 400,85 480,75 560,65 640,70 720,55 800,50"
              />

              {/* API Calls Line (Emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points="0,170 80,160 160,155 240,140 320,145 400,130 480,120 560,110 640,105 720,95 800,90"
              />

              {/* Storage Line (Amber) */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                points="0,180 80,175 160,170 240,165 320,160 400,150 480,145 560,140 640,135 720,130 800,125"
              />
            </svg>

            {/* X Axis dates */}
            <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-slate-400 font-medium px-4">
              <span>Sep 01</span>
              <span>Sep 10</span>
              <span>Sep 20</span>
              <span>Sep 30</span>
            </div>
          </div>
        </div>

        {/* Recent Quota Events Section (Screen 7) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-0">
          <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Recent Quota Events</span>
            <span className="text-[11px] text-slate-500">Threshold alerts, overages, and administrative updates</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Quota Type</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEvents.map((evt, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{evt.created_at}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {evt.organization_name}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {evt.quota_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-amber-700 whitespace-nowrap">
                    {evt.event_type}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                    {evt.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminShell>
  );
}
