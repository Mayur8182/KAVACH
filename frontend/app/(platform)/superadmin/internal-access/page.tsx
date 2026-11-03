'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Key,
  ShieldAlert,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Users,
  Search,
  ExternalLink,
  RefreshCw,
  Send,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function InternalAccessPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantName, setTenantName] = useState('Acme Corp');
  const [breakGlassReason, setBreakGlassReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getInternalAccessRequests()
      .then((res) => {
        if (res?.requests) {
          setRequests(res.requests);
        }
      })
      .catch((err) => setError(err.message || 'Failed to retrieve break-glass access logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassReason.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.superadmin.requestBreakGlassAccess({
        tenant_name: tenantName,
        reason: breakGlassReason,
      });
      setSuccessMessage(res.message || 'Break-glass authorization recorded in audit vault.');
      setBreakGlassReason('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit break-glass request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Zero-Trust Emergency Protocols</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Internal Access & Break-Glass Authority
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Time-bound emergency access to customer tenant workspaces with immutable cryptographic audit logging in database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Vault</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Backed: Enforced</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Break-Glass Request Form Card */}
        <div className="p-6 bg-white rounded-xl border border-rose-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Initiate Break-Glass Request</h2>
              <p className="text-xs text-slate-500">
                Creates an immediate cryptographic AuditEvent in database and grants temporary 1-hour diagnostic session.
              </p>
            </div>
          </div>

          <form onSubmit={handleRequestBreakGlass} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Tenant</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Tenant Name"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Verifiable Incident Justification</label>
                <input
                  type="text"
                  value={breakGlassReason}
                  onChange={(e) => setBreakGlassReason(e.target.value)}
                  placeholder="e.g. Incident INC-4021 - OPA engine deadlock investigation"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Action will be permanently recorded in audit_events table with requester UUID.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Authorize Break-Glass</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Real Access Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Historical Break-Glass Audit Trail</h2>
            <span className="text-xs text-slate-400 font-mono">Retrieved from database audit_events</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying break-glass audit events...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No break-glass requests recorded in audit vault yet. Submit one above to create a real record.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs font-mono">
              {requests.map((log) => (
                <div key={log.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-sans">{log.tenant_name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        60 mins duration
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-sans">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-sans">{log.reason}</p>
                    <p className="text-[10px] text-slate-400">
                      Requester: {log.requester} • ID: {log.id}
                    </p>
                  </div>

                  <div className="text-right text-slate-500 text-[11px] font-sans">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
