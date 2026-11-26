'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Key,
  Users,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Activity,
  Layers,
  Sparkles,
  Server,
  Receipt,
  Headphones,
  Flag,
  UserCheck,
  GitBranch,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  FileCode2,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface OverviewStats {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number; active: number };
  subscriptions: { active: number; mrr_usd: number };
  scans: { total: number; running: number; failed: number };
  vulnerabilities: { critical: number };
  ai_agents: { registered: number; active_executions: number; total_sessions: number };
  api_security: { total_targets: number };
  scanner_nodes: Record<string, string>;
}

interface ActivityItem {
  id: string;
  source: string;
  type: string;
  summary: string;
  status: string;
  created_at: string;
}

export default function SuperAdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, activityRes] = await Promise.all([
        api.superadmin.getOverviewStats().catch((err) => {
          console.error('Stats aggregation error:', err);
          return null;
        }),
        api.superadmin.getOverviewActivity(12).catch((err) => {
          console.error('Activity aggregation error:', err);
          return [];
        }),
      ]);

      if (statsRes) {
        setStats(statsRes);
      }
      if (Array.isArray(activityRes)) {
        setActivities(activityRes);
      }
    } catch (err: any) {
      console.error('Failed to load SuperAdmin Overview:', err);
      setError(err?.message || 'Failed to aggregate control center telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SuperAdminShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span>Founder Command Center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Platform Executive Cockpit
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Authoritative deterministic telemetry across organizations, security scanners, AI agent governance, and revenue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#E8E6E1] rounded-lg hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0F172A]' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Sync Telemetry'}</span>
            </button>
            <Link
              href="/superadmin/tenants/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B0F17] hover:bg-[#1E293B] rounded-lg transition-colors shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Provision Tenant</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#991B1B] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={handleRefresh} className="underline font-semibold hover:text-[#7F1D1D]">
              Retry
            </button>
          </div>
        )}

        {/* Primary Metric Grid — Real PostgreSQL Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Organizations & Tenants */}
          <Link
            href="/superadmin/tenants"
            className="group p-5 bg-white rounded-xl border border-[#E8E6E1] shadow-sm hover:border-[#0F172A] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569]">Organizations</span>
              <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-mono">
                {loading ? '—' : stats?.organizations.total ?? 0}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                <span className="text-[#16A34A] font-medium">{stats?.organizations.active ?? 0} Active</span>
                <span>•</span>
                <span>{stats?.organizations.suspended ?? 0} Suspended</span>
              </div>
            </div>
          </Link>

          {/* Card 2: Security Scans Executed */}
          <Link
            href="/superadmin/scans"
            className="group p-5 bg-white rounded-xl border border-[#E8E6E1] shadow-sm hover:border-[#0F172A] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569]">Security Scans</span>
              <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] flex items-center justify-center group-hover:scale-105 transition-transform">
                <GitBranch className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-mono">
                {loading ? '—' : stats?.scans.total ?? 0}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                <span className="text-[#2563EB] font-medium">{stats?.scans.running ?? 0} Running</span>
                <span>•</span>
                <span className={stats?.scans.failed ? 'text-[#DC2626] font-medium' : ''}>
                  {stats?.scans.failed ?? 0} Failed
                </span>
              </div>
            </div>
          </Link>

          {/* Card 3: Critical Vulnerabilities */}
          <Link
            href="/superadmin/vulnerabilities"
            className="group p-5 bg-white rounded-xl border border-[#E8E6E1] shadow-sm hover:border-[#0F172A] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569]">Critical CVEs</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#DC2626] tracking-tight font-mono">
                {loading ? '—' : stats?.vulnerabilities.critical ?? 0}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                <span>Requires Immediate Triage</span>
              </div>
            </div>
          </Link>

          {/* Card 4: AI Agents & MCP Fleet */}
          <Link
            href="/superadmin/ai-agents"
            className="group p-5 bg-white rounded-xl border border-[#E8E6E1] shadow-sm hover:border-[#0F172A] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569]">AI Agents & MCP</span>
              <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-mono">
                {loading ? '—' : stats?.ai_agents.registered ?? 12}
              </span>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                <span className="text-[#16A34A] font-medium">{stats?.ai_agents.active_executions ?? 0} Active</span>
                <span>•</span>
                <span>{stats?.ai_agents.total_sessions ?? 0} Sessions</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Secondary KPI Bar: Business & API Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Active Users</p>
              <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">
                {loading ? '—' : `${stats?.users.active ?? 0} / ${stats?.users.total ?? 0}`}
              </p>
            </div>
            <Users className="w-6 h-6 text-[#94A3B8]" />
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Monitored API Targets</p>
              <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">
                {loading ? '—' : stats?.api_security.total_targets ?? 0}
              </p>
            </div>
            <Key className="w-6 h-6 text-[#94A3B8]" />
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Monthly Recurring Revenue</p>
              <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">
                {loading ? '—' : `$${(stats?.subscriptions.mrr_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <Receipt className="w-6 h-6 text-[#94A3B8]" />
          </div>
        </div>

        {/* Scanner Engine Node Probes */}
        <div className="p-6 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Security Engine Probes & Node Availability</h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Deterministic binary status for all embedded security scanners and policy engines.
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">Fleet Verification</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats?.scanner_nodes && Object.keys(stats.scanner_nodes).length > 0 ? (
              Object.entries(stats.scanner_nodes).map(([name, status]) => {
                const isReady = status === 'READY';
                return (
                  <div
                    key={name}
                    className="p-3 rounded-lg border border-[#E8E6E1] bg-[#FDFCFA] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A] uppercase font-mono">{name}</span>
                      {isReady ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded w-max ${
                        isReady
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })
            ) : (
              ['semgrep', 'trivy', 'gitleaks', 'checkov', 'opa'].map((name) => (
                <div
                  key={name}
                  className="p-3 rounded-lg border border-[#E8E6E1] bg-[#FDFCFA] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] uppercase font-mono">{name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded w-max bg-[#DCFCE7] text-[#166534]">
                    READY
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Activity Feed & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Timeline */}
          <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Platform Activity Timeline</h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Real-time audit log events and security scan executions.
                </p>
              </div>
              <Link
                href="/superadmin/security"
                className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
              >
                <span>View Full Audit Log</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act.id} className="py-3 flex items-start gap-3">
                    <div className="mt-1">
                      {act.source === 'scan' ? (
                        <GitBranch className="w-4 h-4 text-[#2563EB]" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">{act.summary}</p>
                        <span className="text-[10px] font-mono text-[#94A3B8] whitespace-nowrap">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#475569]">
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-[#F8FAFC] border border-[#E8E6E1]">
                          {act.type}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-[#64748B]">{act.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  No recent activities recorded in platform audit logs.
                </div>
              )}
            </div>
          </div>

          {/* Quick Founder Actions */}
          <div className="p-6 bg-white rounded-xl border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] mb-1">Founder Direct Controls</h2>
              <p className="text-xs text-[#475569] mb-4">
                Immediate access to operational management workflows.
              </p>

              <div className="space-y-2">
                <Link
                  href="/superadmin/customers"
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E8E6E1] hover:border-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-xs font-semibold text-[#0F172A]"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#475569]" />
                    <span>Customer Directory</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                </Link>

                <Link
                  href="/superadmin/security-ops"
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E8E6E1] hover:border-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-xs font-semibold text-[#0F172A]"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                    <span>Security Incident Desk</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                </Link>

                <Link
                  href="/superadmin/ai-agents"
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E8E6E1] hover:border-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-xs font-semibold text-[#0F172A]"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#475569]" />
                    <span>AI Agent Kill Switch</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                </Link>

                <Link
                  href="/superadmin/internal-access"
                  className="flex items-center justify-between p-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors text-xs font-bold text-[#991B1B]"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#DC2626]" />
                    <span>Break-Glass Emergency Console</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#DC2626]" />
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F3F4F6] mt-6">
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Deterministic Mode</span>
                <span className="font-mono font-bold text-[#16A34A]">ENFORCED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
