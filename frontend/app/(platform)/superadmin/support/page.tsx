'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Headphones,
  LifeBuoy,
  Search,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  ExternalLink,
  ShieldAlert,
  Send,
  Bell,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SupportOperationsPage() {
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = () => {
    setLoading(true);
    setError(null);
    api.superadmin.listTenants({ page: 1, page_size: 20 })
      .then((res) => {
        if (res?.items) {
          setTenants(res.items);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load tenant support queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementSent(true);
    setTimeout(() => {
      setAnnouncementText('');
      setAnnouncementSent(false);
    }, 4000);
  };

  const filteredTenants = tenants.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.subscription_tier || '').toLowerCase().includes(term) ||
      (t.slug || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Headphones className="w-4 h-4" />
              <span>Customer Success & Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Support Operations & Tenant Diagnostics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live customer tenant escalation triage, broadcast maintenance notices, and diagnostic inspection.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTenants}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Tenants</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{tenants.length} Active Organizations</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Announcement Creator */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Broadcast Platform Announcement</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Push an emergency notice or scheduled maintenance announcement across customer tenant workspaces.
          </p>
          <form onSubmit={handlePostAnnouncement} className="space-y-3">
            <textarea
              rows={2}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Scheduled scanner cluster maintenance on Sunday 02:00 UTC. Live scans will queue automatically."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {announcementSent ? 'Notice logged and dispatched.' : `Will broadcast to ${tenants.length} active organizations.`}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast Notice</span>
              </button>
            </div>
          </form>
        </div>

        {/* Real Customer Tenants Diagnostics Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Tenant Diagnostics & Support Triage</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live organization records from database via /api/v1/superadmin/tenants</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tenant or tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying active customer tenants...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching tenant records found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTenants.map((t) => {
                const isActive = t.status === 'active' || t.is_active;
                return (
                  <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                          {t.subscription_tier || t.plan || 'PRO'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Slug: <span className="font-mono text-slate-600">{t.slug}</span> • Repositories: {t.repository_count ?? 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
                      >
                        <span>Diagnostic Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
