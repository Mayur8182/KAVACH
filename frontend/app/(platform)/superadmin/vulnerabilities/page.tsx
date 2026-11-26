'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Filter,
  Shield,
  FileCode,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function GlobalVulnerabilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchVulnerabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getVulnerabilitiesAggregate();
      if (Array.isArray(res)) {
        setVulnerabilities(res);
      }
    } catch (err: any) {
      console.error('Failed to query vulnerabilities aggregate:', err);
      setError(err?.message || 'Failed to aggregate global vulnerabilities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  const filtered = vulnerabilities.filter((v) => {
    if (severityFilter !== 'ALL' && v.severity?.toUpperCase() !== severityFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (v.title || '').toLowerCase().includes(term) ||
      (v.cve_id || '').toLowerCase().includes(term) ||
      (v.scanner || '').toLowerCase().includes(term) ||
      (v.file_path || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
              <span>Platform Vulnerability Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Global Vulnerability Console
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Cross-tenant aggregated findings from Semgrep, Trivy, Gitleaks, Checkov, and DAST engines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchVulnerabilities}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync CVEs</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] rounded-lg text-xs font-semibold font-mono">
              <span>{vulnerabilities.filter((v) => v.severity === 'CRITICAL').length} Critical CVEs</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, CVE-ID, or file path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#475569]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs p-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Vulnerability / CVE Title</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Scanner Engine</th>
                  <th className="px-4 py-3">File / Resource Path</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detected</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying vulnerability database...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[#94A3B8]">
                      Zero vulnerabilities found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const isCrit = v.severity === 'CRITICAL';
                    const isHigh = v.severity === 'HIGH';

                    return (
                      <tr key={v.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-[#0F172A]">{v.title}</p>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{v.cve_id || 'CWE / Rule'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isCrit
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : isHigh
                                ? 'bg-[#FFEDD5] text-[#EA580C]'
                                : 'bg-[#FEF3C7] text-[#D97706]'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono uppercase text-[#0F172A] font-semibold text-[11px]">
                          {v.scanner}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#475569] text-[11px] max-w-xs truncate">
                          {v.file_path || 'Repository Root'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px]">
                          {v.remediation_status || 'OPEN'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                          {v.detected_at ? new Date(v.detected_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[11px] font-mono text-[#64748B]">Audited</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}

