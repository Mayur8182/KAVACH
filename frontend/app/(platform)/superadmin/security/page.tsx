'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Lock,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Key,
  Terminal,
  Activity,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function PlatformSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAuditEvents = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getSecurityAuditEvents(50)
      .then((res) => {
        if (res?.events) {
          setEvents(res.events);
        }
      })
      .catch((err) => setError(err.message || 'Failed to retrieve cryptographic audit events'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (e.action || '').toLowerCase().includes(term) ||
      (e.actor_id || '').toLowerCase().includes(term) ||
      (e.resource_type || '').toLowerCase().includes(term) ||
      (e.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Trust & Compliance</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Security Governance, Audit Vault & Compliance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Deterministic evidence verification, cryptographic audit trails from audit_events, and policy enforcement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAuditEvents}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Vault</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Vault: Active</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Golden Rule Directive Card */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>System Architectural Directive</span>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
              RULE #14 & #15
            </span>
          </div>
          <blockquote className="text-sm sm:text-base font-semibold text-slate-100 italic border-l-2 border-blue-500 pl-4 py-1">
            &ldquo;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&rdquo;
          </blockquote>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI language models never hold authoritative security decisions. All access controls, secrets, and deployment gates are decided by deterministic OPA rules and verifiable runtime scanner evidence.
          </p>
        </div>

        {/* Real Cryptographic Audit Events Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Cryptographic Audit Events Ledger</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real events retrieved from audit_events table via /api/v1/superadmin/security/audit-events</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search action, actor, resource..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying audit_events table from database...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit events found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-semibold">
                  <tr>
                    <th className="px-6 py-3">Timestamp (UTC)</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Resource Target</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredEvents.map((evt) => {
                    const isSuccess = evt.status === 'SUCCESS' || evt.status === 'APPROVED';
                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 font-sans">
                          {evt.action}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {evt.actor_id || 'system'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {evt.resource_type}: {evt.resource_id || 'global'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={JSON.stringify(evt.metadata)}>
                          {Object.keys(evt.metadata || {}).length > 0
                            ? JSON.stringify(evt.metadata)
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
