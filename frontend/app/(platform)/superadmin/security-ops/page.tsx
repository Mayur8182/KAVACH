'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

interface IncidentItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  tenant_id: string;
  summary: string;
  created_at: string;
}

export default function SecurityOpsPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentsRes, alertsRes] = await Promise.all([
        api.superadmin.listIncidents().catch(() => []),
        api.superadmin.listSecurityAlerts().catch(() => []),
      ]);

      if (Array.isArray(incidentsRes)) {
        setIncidents(incidentsRes);
      }
      if (Array.isArray(alertsRes)) {
        setAlerts(alertsRes);
      }
    } catch (err: any) {
      console.error('Failed to load security ops data:', err);
      setError(err?.message || 'Failed to aggregate security incident desk.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity.toUpperCase() !== severityFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (inc.title || '').toLowerCase().includes(term) ||
      (inc.summary || '').toLowerCase().includes(term) ||
      (inc.severity || '').toLowerCase().includes(term)
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
              <span>Platform Security Operations Center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Security Incident & Alert Console
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Authoritative incident triage, real-time threat alert tracking, and platform-wide vulnerability escalation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSecurityData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Feed</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] rounded-lg text-xs font-semibold font-mono">
              <span>{incidents.filter((i) => i.severity === 'CRITICAL').length} Critical Incidents</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Severity filter and search */}
        <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incidents or threat rules..."
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

        {/* Incidents Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Incident Title & Details</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tenant Identifier</th>
                  <th className="px-4 py-3">Reported At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying security incidents from database...
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[#94A3B8]">
                      No active security incidents recorded in PostgreSQL.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const isCrit = inc.severity === 'CRITICAL';
                    const isHigh = inc.severity === 'HIGH';
                    return (
                      <tr key={inc.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-[#0F172A]">{inc.title}</p>
                          <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">{inc.summary}</p>
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
                            {inc.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px]">
                          {inc.status || 'OPEN'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#475569] text-[11px]">
                          {inc.tenant_id ? inc.tenant_id.slice(0, 12) + '...' : 'Global'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                          {inc.created_at ? new Date(inc.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href="/superadmin/vulnerabilities"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline"
                          >
                            <span>Inspect CVE</span>
                            <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                          </Link>
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

