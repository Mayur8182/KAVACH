'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  History,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  priority: string;
  is_active: boolean;
  published_at?: string;
  created_at: string;
}

export default function SupportOperationsPage() {
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('STANDARD');
  const [announcementAudience, setAnnouncementAudience] = useState('ALL');
  const [isPosting, setIsPosting] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchSupportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, announcementsRes] = await Promise.all([
        api.superadmin.listTenants({ page: 1, page_size: 20 }),
        api.superadmin.listAnnouncements().catch(() => []),
      ]);

      if (tenantsRes?.items) {
        setTenants(tenantsRes.items);
      }
      if (Array.isArray(announcementsRes)) {
        setAnnouncements(announcementsRes);
      }
    } catch (err: any) {
      console.error('Failed to load support data:', err);
      setError(err?.message || 'Failed to load tenant support queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupportData();
  }, [fetchSupportData]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMessage.trim()) return;

    setIsPosting(true);
    try {
      const created = await api.superadmin.createAnnouncement({
        title: announcementTitle.trim() || 'Platform Notice',
        message: announcementMessage.trim(),
        priority: announcementPriority,
        target_audience: announcementAudience,
      });

      toast.success('Announcement Published', {
        description: 'Broadcast record persisted to PostgreSQL and dispatched to tenants.',
      });

      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncements((prev) => [created, ...prev]);
    } catch (err: any) {
      toast.error('Failed to Dispatch Announcement', {
        description: err?.message || 'Server error while persisting notice.',
      });
    } finally {
      setIsPosting(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <Headphones className="w-4 h-4" />
              <span>Customer Success & Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Support Operations & Announcements
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Live customer tenant escalation triage, real PostgreSQL announcements, and diagnostic inspection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSupportData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Records</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold font-mono">
              <Building2 className="w-3.5 h-3.5 text-[#475569]" />
              <span>{tenants.length} Active Organizations</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Announcement Creator — Backed by PostgreSQL */}
        <div className="bg-white p-6 rounded-xl border border-[#E8E6E1] shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-[#D97706]" />
            <h2 className="text-sm font-bold text-[#0F172A]">Broadcast Platform Announcement</h2>
          </div>
          <p className="text-xs text-[#475569] mb-4">
            Push an emergency notice or scheduled maintenance announcement across customer tenant workspaces. Persisted in PostgreSQL.
          </p>

          <form onSubmit={handlePostAnnouncement} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Title (e.g. Scheduled Scanner Maintenance)"
                className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
              />

              <select
                value={announcementPriority}
                onChange={(e) => setAnnouncementPriority(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
              >
                <option value="STANDARD">Priority: Standard</option>
                <option value="CRITICAL">Priority: Critical / Emergency</option>
                <option value="MAINTENANCE">Priority: Scheduled Maintenance</option>
              </select>

              <select
                value={announcementAudience}
                onChange={(e) => setAnnouncementAudience(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
              >
                <option value="ALL">Audience: All Organizations</option>
                <option value="ENTERPRISE">Audience: Enterprise Only</option>
                <option value="ACTIVE_SCANS">Audience: Active Scan Queues</option>
              </select>
            </div>

            <textarea
              rows={2}
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="e.g. Scheduled scanner cluster maintenance on Sunday 02:00 UTC. Live scans will queue automatically."
              className="w-full text-xs p-3 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#94A3B8]">
                Dispatches to registered active customer tenants via PostgreSQL state.
              </span>
              <button
                type="submit"
                disabled={isPosting || !announcementMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B0F17] hover:bg-[#1E293B] rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isPosting ? 'Broadcasting...' : 'Broadcast Notice'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent Announcements History */}
        {announcements.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E6E1] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[#475569]" />
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Broadcast History ({announcements.length})
              </h3>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="py-2.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F172A]">{ann.title}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          ann.priority === 'CRITICAL'
                            ? 'bg-[#FEE2E2] text-[#991B1B]'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {ann.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">{ann.message}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8] whitespace-nowrap">
                    {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Customer Tenants Diagnostics Queue */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#0F172A]" />
                <h2 className="text-sm font-bold text-[#0F172A]">Tenant Diagnostics & Support Triage</h2>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">Authoritative records via /api/v1/superadmin/tenants</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tenant or tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#0F172A]" />
              <span>Querying active customer tenants...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8]">
              No matching tenant records found.
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {filteredTenants.map((t) => {
                const isActive = t.status === 'active' || t.is_active;
                return (
                  <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-[#0F172A]">{t.name}</h3>
                        <span className="text-[10px] font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E8E6E1] px-2 py-0.5 rounded-full uppercase font-mono">
                          {t.subscription_tier || t.plan || 'PRO'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                          isActive
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#FEE2E2] text-[#991B1B]'
                        }`}>
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569]">
                        Slug: <span className="font-mono text-[#0F172A]">{t.slug}</span> • Repositories: {t.repository_count ?? 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#E8E6E1] rounded-lg hover:bg-[#F8FAFC] shadow-sm"
                      >
                        <span>Diagnostic Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
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
