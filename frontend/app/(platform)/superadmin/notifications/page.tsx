'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  RefreshCw,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Shield,
  Send,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function NotificationsEmailLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchEmailLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getEmailLogs();
      if (Array.isArray(res)) {
        setLogs(res);
      }
    } catch (err: any) {
      console.error('Failed to query email logs:', err);
      setError(err?.message || 'Failed to aggregate email delivery logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailLogs();
  }, [fetchEmailLogs]);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (l.recipient_email || '').toLowerCase().includes(term) ||
      (l.subject || '').toLowerCase().includes(term) ||
      (l.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <Mail className="w-4 h-4 text-[#0F172A]" />
              <span>Communication Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Notification & Email Delivery Logs
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Authoritative dispatch records from PostgreSQL `email_delivery_logs` and customer notification webhooks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchEmailLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold font-mono">
              <span>{logs.length} Delivery Records</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient email or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">
            {filtered.length} Dispatches Listed
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Recipient Email</th>
                  <th className="px-4 py-3">Subject / Template</th>
                  <th className="px-4 py-3">Delivery Status</th>
                  <th className="px-4 py-3">Provider Reference</th>
                  <th className="px-4 py-3">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying email delivery logs...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[#94A3B8]">
                      No email delivery logs recorded in PostgreSQL.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const isDelivered = l.status === 'DELIVERED' || l.status === 'SENT';
                    const isFailed = l.status === 'FAILED' || l.status === 'BOUNCED';

                    return (
                      <tr key={l.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[#0F172A]">
                          {l.recipient_email}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                          {l.subject || 'Transactional Notification'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isDelivered
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : isFailed
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : 'bg-[#FEF3C7] text-[#92400E]'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#475569] text-[11px]">
                          {l.provider_message_id || 'LOCAL_SMTP'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                          {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
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

