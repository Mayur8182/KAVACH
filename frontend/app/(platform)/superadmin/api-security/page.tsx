'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Key,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Globe,
  FileCode,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function GlobalApiSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchApiSecurityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, targetsRes] = await Promise.all([
        api.superadmin.getApiSecuritySummary().catch(() => null),
        api.superadmin.listApiSecurityTargets().catch(() => []),
      ]);

      if (sumRes) setSummary(sumRes);
      if (Array.isArray(targetsRes)) setTargets(targetsRes);
    } catch (err: any) {
      console.error('Failed to query API Security summary:', err);
      setError(err?.message || 'Failed to aggregate global API security telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiSecurityData();
  }, [fetchApiSecurityData]);

  const filteredTargets = targets.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.target_url || '').toLowerCase().includes(term) ||
      (t.tenant_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <Key className="w-4 h-4 text-[#0F172A]" />
              <span>Application Security Portfolio</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Global API Security Fleet
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Monitored API targets, OpenAPI specifications, BOLA/BFLA vulnerability exposure across all customer tenants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchApiSecurityData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Targets</span>
            </button>
            <Link
              href="/api-security"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0F17] text-white rounded-lg text-xs font-semibold hover:bg-[#1E293B] transition-colors shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Customer Console</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Monitored API Targets</p>
            <p className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
              {loading ? '—' : summary?.total_targets ?? targets.length}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Discovered hostnames</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Discovered Endpoints</p>
            <p className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
              {loading ? '—' : summary?.discovered_endpoints ?? 0}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Mapped routes & parameters</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">OpenAPI Specifications</p>
            <p className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
              {loading ? '—' : summary?.openapi_imports ?? 0}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Parsed schemas</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Critical API Findings</p>
            <p className="text-2xl font-bold font-mono text-[#DC2626] mt-1">
              {loading ? '—' : summary?.critical_findings ?? 0}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">BOLA / BFLA exposures</p>
          </div>
        </div>

        {/* Targets Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search target by hostname or tenant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
              />
            </div>
            <span className="text-xs text-[#94A3B8] font-mono">
              {filteredTargets.length} Monitored Endpoints
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">API Target Name & Host</th>
                  <th className="px-4 py-3">Tenant Organization</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Findings</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying API targets...
                    </td>
                  </tr>
                ) : filteredTargets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[#94A3B8]">
                      No API security targets registered.
                    </td>
                  </tr>
                ) : (
                  filteredTargets.map((t) => (
                    <tr key={t.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#0F172A]">{t.name || 'API Endpoint'}</p>
                        <p className="text-[11px] text-[#64748B] font-mono">{t.target_url}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                        {t.tenant_name || t.tenant_id}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        {t.environment || 'PRODUCTION'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">
                          {t.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                        {t.findings_count ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/api-security/targets`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline"
                        >
                          <span>Target Details</span>
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

