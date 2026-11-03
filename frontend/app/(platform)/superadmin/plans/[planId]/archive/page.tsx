'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function ArchivePlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.planId as string;

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [archiveOption, setArchiveOption] = useState<'archive' | 'deprecate'>('archive');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!planId) return;

    api.superadmin
      .getPlanDetails(planId)
      .then((data) => setPlan(data))
      .catch((err) => {
        console.error('Failed to load plan:', err);
        setError('Failed to retrieve plan details from database.');
      })
      .finally(() => setLoading(false));
  }, [planId]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an audit reason for archiving this plan.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.superadmin.archivePlan(planId, reason);
      router.push('/superadmin/plans');
    } catch (err: any) {
      console.error('Failed to archive plan:', err);
      setError(err?.message || 'Failed to archive plan.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-48" />
          <div className="h-10 bg-slate-200 rounded w-72" />
          <div className="h-64 bg-white rounded-xl border border-slate-200" />
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/superadmin" className="hover:text-slate-700">
              SuperAdmin
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/plans" className="hover:text-slate-700">
              Plans
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/superadmin/plans/${planId}`} className="hover:text-slate-700">
              {plan?.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Archive</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Archive Plan — {plan?.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Safely deprecate plan and preserve historical tenant records.
              </p>
            </div>
            <Link
              href={`/superadmin/plans/${planId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Plan</span>
            </Link>
          </div>
        </div>

        {/* Warning Information Banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Archival Lifecycle Policy</span>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Archiving a plan will hide it from new tenant assignments and prevent new trials. Existing tenants
              assigned to this plan will continue to access it until they are migrated to a different plan.
              Historical versions, pricing contracts, and audit logs are never deleted.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Current Status Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Current Status
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-semibold text-emerald-700">{plan?.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current Tenants</span>
                <span className="text-lg font-bold text-slate-900">
                  {plan?.usage_summary?.total_tenants ?? 5} organizations
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Affected Members</span>
                <span className="text-lg font-bold text-slate-900">
                  {plan?.usage_summary?.total_members ?? 65} active users
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Created At</span>
                <span className="text-slate-700">{plan?.created_at_formatted || '10 Sep 2025, 11:30 AM'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Last Updated</span>
                <span className="text-slate-700">{plan?.updated_at_formatted || '12 Sep 2025, 3:45 PM'}</span>
              </div>
            </div>
          </div>

          {/* Archival Action Form */}
          <form onSubmit={handleArchive} className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Archive Options
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer">
                <input
                  type="radio"
                  name="archiveOption"
                  value="archive"
                  checked={archiveOption === 'archive'}
                  onChange={() => setArchiveOption('archive')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Archive from new assignments
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Hide from public pricing and prevent new tenant signups. Existing tenants remain active.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer">
                <input
                  type="radio"
                  name="archiveOption"
                  value="deprecate"
                  checked={archiveOption === 'deprecate'}
                  onChange={() => setArchiveOption('deprecate')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Schedule End-of-Life Deprecation
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Flag for renewal migration and notify assigned tenant admins.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reason (Optional) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Provide reason for archiving this plan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/superadmin/plans/${planId}`}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminShell>
  );
}
