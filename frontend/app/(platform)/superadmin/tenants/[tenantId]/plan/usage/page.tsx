'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Calendar,
  AlertCircle,
  RefreshCw,
  FolderGit2,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantPlanUsagePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  // Active subtab from query or state
  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories' | 'scans' | 'api' | 'storage'>(
    (tabFromQuery as any) || 'overview'
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState('Organization');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [repositoriesData, setRepositoriesData] = useState<any[]>([]);
  const [scansData, setScansData] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [ov, repos, sc, ap, st] = await Promise.all([
          api.superadmin.getTenantPlanUsageOverview(tenantId),
          api.superadmin.getTenantPlanRepositoryUsage(tenantId),
          api.superadmin.getTenantPlanScanUsage(tenantId),
          api.superadmin.getTenantPlanApiUsage(tenantId),
          api.superadmin.getTenantPlanStorageUsage(tenantId),
        ]);
        setOverviewData(ov);
        setTenantName(ov?.organization?.name || 'Organization');
        setRepositoriesData(repos || []);
        setScansData(sc);
        setApiData(ap);
        setStorageData(st);
      } catch (err: any) {
        console.error('Failed to load usage data:', err);
        setError(err?.message || 'Failed to retrieve tenant usage telemetry.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId]);

  const metrics = overviewData?.metrics || {
    repositories: { used: 18, limit: 25, percentage: 72 },
    scan_minutes: { used: 6420, limit: 10000, percentage: 64 },
    api_calls: { used: 142560, limit: 1000000, percentage: 14 },
    storage_gb: { used: 48, limit: 100, percentage: 48 },
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
            <span className="text-slate-900 font-semibold">Usage</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Plan Usage Overview</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track real-time resource consumption and usage against plan limits for {tenantName}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Last 30 Days</span>
              </span>
            </div>
          </div>
        </div>

        {/* Subtabs matching screens 9, 10, 11, 12, 13 */}
        <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Usage Overview' },
            { id: 'repositories', label: 'Repositories' },
            { id: 'scans', label: 'Scans' },
            { id: 'api', label: 'API Usage' },
            { id: 'storage', label: 'Storage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading usage metrics and telemetry...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800 text-xs">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SCREEN 9: Usage Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 Metric Cards with progress bars */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Repositories */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[11px] font-medium text-slate-500">Repositories</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{metrics.repositories.used}</span>
                      <span className="text-xs text-slate-400">/ {metrics.repositories.limit}</span>
                      <span className="text-[11px] font-bold text-emerald-600 ml-auto bg-emerald-50 px-1.5 py-0.5 rounded">
                        {metrics.repositories.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${metrics.repositories.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Scan Minutes */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[11px] font-medium text-slate-500">Scan Minutes</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {metrics.scan_minutes.used.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">
                        / {metrics.scan_minutes.limit.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 ml-auto bg-blue-50 px-1.5 py-0.5 rounded">
                        {metrics.scan_minutes.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${metrics.scan_minutes.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* API Calls */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[11px] font-medium text-slate-500">API Calls</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {metrics.api_calls.used.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">
                        / {metrics.api_calls.limit >= 1000000 ? '1.0M' : metrics.api_calls.limit}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 ml-auto bg-indigo-50 px-1.5 py-0.5 rounded">
                        {metrics.api_calls.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${metrics.api_calls.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[11px] font-medium text-slate-500">Storage</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{metrics.storage_gb.used} GB</span>
                      <span className="text-xs text-slate-400">/ {metrics.storage_gb.limit} GB</span>
                      <span className="text-[11px] font-bold text-purple-600 ml-auto bg-purple-50 px-1.5 py-0.5 rounded">
                        {metrics.storage_gb.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${metrics.storage_gb.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Usage Trend (Last 30 Days) Chart Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Usage Trend (Last 30 Days)</h3>
                      <p className="text-xs text-slate-500">Historical consumption velocity</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span>Scan Minutes</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-indigo-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>API Calls</span>
                      </span>
                    </div>
                  </div>

                  {/* SVG Multi-Line Chart */}
                  <div className="h-52 w-full relative pt-2">
                    <svg className="w-full h-full" viewBox="0 0 600 180">
                      <defs>
                        <linearGradient id="scansGrad3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />

                      {/* Area and Paths */}
                      <path
                        d="M 0 140 Q 90 80, 180 110 T 360 70 T 540 100 L 600 50 L 600 170 L 0 170 Z"
                        fill="url(#scansGrad3)"
                      />
                      <path
                        d="M 0 140 Q 90 80, 180 110 T 360 70 T 540 100 L 600 50"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M 0 160 Q 90 120, 180 140 T 360 100 T 540 125 L 600 90"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono px-1">
                    <span>Sep 01</span>
                    <span>Sep 08</span>
                    <span>Sep 15</span>
                    <span>Sep 22</span>
                    <span>Sep 30</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 10: Repositories Tab */}
            {activeTab === 'repositories' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-3 px-6">Repository Name</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Last Scan</th>
                      <th className="py-3 px-6 text-right">Vulnerabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repositoriesData.map((repo, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-slate-400" />
                          <span>{repo.name}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {repo.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 font-mono">{repo.last_scan}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              repo.vulnerabilities.severity === 'High'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : repo.vulnerabilities.severity === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {repo.vulnerabilities.count} {repo.vulnerabilities.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SCREEN 11: Scans Tab */}
            {activeTab === 'scans' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Scan Minutes Usage (Last 30 Days)</h3>
                  <div className="h-56 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-100">
                    {(scansData?.daily_bars || []).map((b: any, idx: number) => {
                      const hPercent = Math.min(Math.max((b.minutes / 350) * 100, 10), 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                            style={{ height: `${hPercent}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Sep 01</span>
                    <span>Sep 08</span>
                    <span>Sep 15</span>
                    <span>Sep 22</span>
                    <span>Sep 30</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Top Scan Types</h3>
                  <div className="space-y-3">
                    {(scansData?.breakdown || []).map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">{item.type}</span>
                          <span className="text-slate-500 font-mono">
                            {item.percentage}% ({item.minutes} mins)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 12: API Usage Tab */}
            {activeTab === 'api' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">API Calls Usage (Last 30 Days)</h3>
                  <div className="h-56 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-100">
                    {(apiData?.daily_bars || []).map((b: any, idx: number) => {
                      const hPercent = Math.min(Math.max((b.calls / 6500) * 100, 10), 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all"
                            style={{ height: `${hPercent}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Sep 01</span>
                    <span>Sep 08</span>
                    <span>Sep 15</span>
                    <span>Sep 22</span>
                    <span>Sep 30</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Top Endpoints</h3>
                  <div className="space-y-3">
                    {(apiData?.endpoints || []).map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-slate-800 text-[11px] truncate max-w-[160px]">
                            {item.endpoint}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.percentage}% ({item.calls.toLocaleString()})
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 13: Storage Tab */}
            {activeTab === 'storage' && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Donut Visual Representation */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#2563eb"
                        strokeWidth="12"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 * (1 - 0.48)}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-2xl font-extrabold text-slate-900">{storageData?.total_used_gb} GB</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Used (48%)</div>
                    </div>
                  </div>
                </div>

                {/* Storage Breakdown List */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Storage Allocation Breakdown
                  </h3>
                  <div className="space-y-3">
                    {(storageData?.breakdown || []).map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              idx === 0
                                ? 'bg-blue-600'
                                : idx === 1
                                ? 'bg-indigo-500'
                                : idx === 2
                                ? 'bg-purple-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-800">{b.category}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 font-mono">
                          {b.used_gb} GB <span className="text-slate-400 font-normal">({b.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
