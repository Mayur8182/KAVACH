'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
  TrendingUp,
  XCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TrialHistoryPage() {
  const [activeTab, setActiveTab] = useState<'expired' | 'conversions'>('expired');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [expiredList, setExpiredList] = useState<any[]>([]);
  const [conversionList, setConversionList] = useState<any[]>([]);

  // Filters
  const [timeframe, setTimeframe] = useState('30_days');
  const [planFilter, setPlanFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getTrialHistory({
        timeframe,
        plan: planFilter !== 'all' ? planFilter : undefined,
        search: search || undefined,
      });
      setExpiredList(res.expired_trials || []);
      setConversionList(res.conversions || []);
    } catch (err: any) {
      console.error('Failed to load trial history:', err);
      setError(err?.message || 'Failed to retrieve trial lifecycle history.');
    } finally {
      setLoading(false);
    }
  }, [timeframe, planFilter, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalHistorical = expiredList.length + conversionList.length;
  const conversionRate = totalHistorical > 0 ? Math.round((conversionList.length / totalHistorical) * 100) : 0;

  // Filtered views based on search if not handled by API
  const filteredExpired = expiredList.filter((item) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.organization?.toLowerCase().includes(term) ||
      item.domain?.toLowerCase().includes(term) ||
      item.reason?.toLowerCase().includes(term)
    );
  });

  const filteredConversions = conversionList.filter((item) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.organization?.toLowerCase().includes(term) ||
      item.domain?.toLowerCase().includes(term) ||
      item.outcome?.toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/superadmin" className="hover:text-foreground transition-colors">
                Admin
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/superadmin/trials" className="hover:text-foreground transition-colors">
                Trial Management
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">History & Conversions</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Expired &amp; Cancelled Trials
            </h1>
            <p className="text-xs text-muted-foreground">
              Audit expired trial lifecycles, cancellations, and conversion outcomes across customer organizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/superadmin/trials"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Active Trials
            </Link>
            <Link
              href="/superadmin/trials/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Trial
            </Link>
          </div>
        </div>

        {/* KPI Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Historical Trials</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalHistorical}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Total completed trial records</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Expired &amp; Cancelled</span>
              <XCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{expiredList.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Unconverted or ended early</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Converted to Paid</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">{conversionList.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Migrated to active commercial plans</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{conversionRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">Trial to subscription conversion</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchHistory()}
              className="text-[11px] underline hover:no-underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Sub-tabs & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Sub-tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('expired')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'expired'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Expired &amp; Cancelled Trials
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  activeTab === 'expired'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {expiredList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('conversions')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'conversions'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conversion History
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  activeTab === 'conversions'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {conversionList.length}
              </span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organization or domain..."
                className="pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs border border-border rounded-lg bg-card px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              >
                <option value="30_days">Last 30 Days</option>
                <option value="60_days">Last 60 Days</option>
                <option value="90_days">Last 90 Days</option>
                <option value="all_time">All Time</option>
              </select>
            </div>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none"
            >
              <option value="all">All Plans</option>
              <option value="enterprise">Enterprise</option>
              <option value="pro">Pro</option>
              <option value="starter">Starter</option>
            </select>

            <button
              onClick={() => fetchHistory()}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Expired & Cancelled Trials */}
        {activeTab === 'expired' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Trial Plan</th>
                    <th className="py-3 px-4">Expired On</th>
                    <th className="py-3 px-4">Reason / Outcome</th>
                    <th className="py-3 px-4">Lifecycle State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading expired trials history...
                      </td>
                    </tr>
                  ) : filteredExpired.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                        <p className="font-medium text-foreground">No expired trials found</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {search ? 'Try adjusting your search criteria.' : 'All trials are currently active or converted.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpired.map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs uppercase text-primary shrink-0">
                              {t.organization?.slice(0, 2) || 'OR'}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{t.organization}</div>
                              <div className="text-[11px] text-muted-foreground">{t.domain}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              t.plan === 'Enterprise'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : t.plan === 'Pro'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                            }`}
                          >
                            {t.plan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{t.expired_on}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            {t.reason?.toLowerCase().includes('manually') ? (
                              <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{t.reason}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              t.reason?.toLowerCase().includes('manually')
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {t.reason?.toLowerCase().includes('manually') ? 'Cancelled' : 'Expired'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {t.id ? (
                              <Link
                                href={`/superadmin/trials/${t.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                View Details
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <Link
                                href="/superadmin/trials/create"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Restart Trial
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Conversion History */}
        {activeTab === 'conversions' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Converted Plan</th>
                    <th className="py-3 px-4">Converted On</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Commercial Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading conversions history...
                      </td>
                    </tr>
                  ) : filteredConversions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                        <p className="font-medium text-foreground">No conversions recorded yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {search ? 'Try adjusting your search criteria.' : 'Trials that convert to paid plans will appear here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredConversions.map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {c.organization?.slice(0, 2) || 'OR'}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{c.organization}</div>
                              <div className="text-[11px] text-muted-foreground">{c.domain}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              c.plan === 'Enterprise'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {c.plan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{c.converted_on}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{c.outcome}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Paid Customer
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.id ? (
                              <Link
                                href={`/superadmin/trials/${c.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                View Details
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <Link
                                href="/superadmin/tenants/plan"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                View Tenant Plan
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
