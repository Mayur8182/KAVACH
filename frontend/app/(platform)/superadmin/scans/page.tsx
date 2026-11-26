'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Layers,
  StopCircle,
  Filter,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface ScanJob {
  id: string;
  project_id: string;
  scan_type: string;
  status: string;
  findings_count: number;
  critical_count: number;
  duration_seconds?: number;
  created_at: string;
}

export default function GlobalScansManagementPage() {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getScanQueue();
      if (Array.isArray(res)) {
        setScans(res);
      }
    } catch (err: any) {
      console.error('Failed to query scan queue:', err);
      setError(err?.message || 'Failed to aggregate global security scan queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handleCancelScan = async (scanId: string) => {
    if (!window.confirm(`Cancel running scan ${scanId}?`)) return;

    setCancellingId(scanId);
    try {
      await api.superadmin.cancelScan(scanId);
      toast.success('Scan Cancelled', {
        description: 'Scan record updated to CANCELLED in PostgreSQL.',
      });
      fetchScans();
    } catch (err: any) {
      toast.error('Cancellation Failed', {
        description: err?.message || 'Could not cancel scan execution.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredScans = scans.filter((s) => {
    if (statusFilter !== 'ALL' && s.status?.toUpperCase() !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (s.scan_type || '').toLowerCase().includes(term) ||
      (s.id || '').toLowerCase().includes(term) ||
      (s.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <GitBranch className="w-4 h-4 text-[#0F172A]" />
              <span>Platform Security Scanner Fleet</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Global Scan Management Queue
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Centralized orchestration and cancellation controls across SAST, DAST, SCA, Secrets, IaC, and Container engines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchScans}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Queue</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold font-mono">
              <span>{scans.length} Scans in View</span>
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
              placeholder="Search by scan ID or engine type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#475569]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">Running</option>
              <option value="QUEUED">Queued</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Scan ID</th>
                  <th className="px-4 py-3">Engine Type</th>
                  <th className="px-4 py-3">Execution Status</th>
                  <th className="px-4 py-3">Findings</th>
                  <th className="px-4 py-3">Critical CVEs</th>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3 text-right">Emergency Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying security scans...
                    </td>
                  </tr>
                ) : filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[#94A3B8]">
                      No security scans found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((s) => {
                    const isRunning = s.status === 'RUNNING' || s.status === 'QUEUED';
                    const isFailed = s.status === 'FAILED';
                    const isCancelled = s.status === 'CANCELLED';

                    return (
                      <tr key={s.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[#0F172A]">
                          {s.id.slice(0, 13)}...
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-[#0F172A] uppercase">
                          {s.scan_type}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isRunning
                                ? 'bg-[#DBEAFE] text-[#1D4ED8] animate-pulse'
                                : isFailed
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : isCancelled
                                ? 'bg-[#F3F4F6] text-[#64748B]'
                                : 'bg-[#DCFCE7] text-[#166534]'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                          {s.findings_count ?? 0}
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          <span className={s.critical_count > 0 ? 'text-[#DC2626] font-bold' : 'text-[#64748B]'}>
                            {s.critical_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                          {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isRunning ? (
                            <button
                              onClick={() => handleCancelScan(s.id)}
                              disabled={cancellingId === s.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border border-[#FCA5A5] text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors"
                            >
                              <StopCircle className="w-3 h-3" />
                              <span>{cancellingId === s.id ? 'Aborting...' : 'Abort Scan'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8] font-mono">Archived</span>
                          )}
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

