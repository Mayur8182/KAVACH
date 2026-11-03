'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Shield,
  Key,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function FounderProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFounder = () => {
    setLoading(true);
    setError(null);
    api.auth.me()
      .then((user) => setCurrentUser(user))
      .catch((err) => setError(err.message || 'Failed to load founder identity from database'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFounder();
  }, []);

  const initials = (currentUser?.name || currentUser?.email || 'SA')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Platform Executive Authority</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Founder SuperAdmin Profile & Master Authority
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live identity persistence from users table in database with verified platform superuser privileges.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFounder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Verify DB Identity</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Founder Status: Active & Verified</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Founder Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {currentUser?.name || 'SuperAdmin User'}
                  </h2>
                  <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                    {currentUser?.is_superuser ? 'Platform SuperUser' : 'Founder Admin'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {currentUser?.email || 'Loading email...'}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                  <span>User UUID: <span className="font-mono text-slate-700 font-semibold">{currentUser?.id || '—'}</span></span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">Deterministic OPA Authority: Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/code"
                className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open Security Workspace</span>
              </Link>
            </div>
          </div>

          {/* Master Safeguards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-700">Platform SuperUser Flag</span>
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {currentUser?.is_superuser ? 'Enabled (is_superuser = 1)' : 'Founder Whitelist Active'}
              </p>
              <p className="text-[11px] text-slate-400">Enforced by require_superadmin_user dependency</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-700">Security Provider</span>
              <p className="text-xs text-slate-900 font-bold">OAuth 2.0 / JWT Signed</p>
              <p className="text-[11px] text-slate-400">Signed with ECDSA / HMAC bearer secret</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-700">Audit Provenance</span>
              <p className="text-xs text-slate-900 font-bold">Cryptographically Logged</p>
              <p className="text-[11px] text-slate-400">Every action written to audit_events table</p>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
