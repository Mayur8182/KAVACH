'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  CreditCard,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function ReviewPlanAssignmentPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;
  const targetPlanKey = searchParams.get('target') || 'enterprise';

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    async function loadPreview() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.previewTenantPlanAssignment(tenantId, targetPlanKey);
        setPreviewData(res);
      } catch (err: any) {
        console.error('Failed to load assignment preview:', err);
        setError(err?.message || 'Failed to load assignment comparison preview.');
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [tenantId, targetPlanKey]);

  const handleAssignPlan = async () => {
    setAssigning(true);
    setError(null);
    try {
      await api.superadmin.confirmTenantPlanAssignment(tenantId, {
        target_plan_key: targetPlanKey,
        billing_cycle: 'monthly',
        reason: `Assigned ${targetPlanKey.toUpperCase()} plan via SuperAdmin Review`,
      });
      setSuccess(`Successfully assigned ${targetPlanKey.toUpperCase()} plan!`);
      setTimeout(() => {
        router.push(`/superadmin/tenants/${tenantId}/plan/history`);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute plan assignment.');
    } finally {
      setAssigning(false);
    }
  };

  const orgName = previewData?.organization?.name || 'Organization';

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements Matrix
          </Link>
          <Link
            href="/superadmin/tenants/plan"
            className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold"
          >
            Tenant Plan Assignment
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/tenants/plan" className="hover:underline">
              Tenants
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{orgName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Review</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plan Assignment Review</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review changes before assigning the plan to {orgName}.
              </p>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {previewData?.warnings && previewData.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Attention Required:</span>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                {previewData.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Comparison Table Card (Screen 3) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Calculating plan comparison...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-3.5 px-6">Setting / Feature</th>
                  <th className="py-3.5 px-6">
                    Current Plan ({previewData?.current_plan_name || 'Current'})
                  </th>
                  <th className="py-3.5 px-6 text-blue-700 bg-blue-50/50">
                    New Plan ({previewData?.target_plan_name || 'New'})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(previewData?.comparison || []).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6 font-semibold text-slate-800">{row.feature}</td>
                    <td className="py-3 px-6 text-slate-600">{row.current_val}</td>
                    <td className="py-3 px-6 font-bold text-blue-900 bg-blue-50/25">{row.new_val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between">
          <Link
            href={`/superadmin/tenants/${tenantId}/plan/select`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>

          <button
            type="button"
            disabled={assigning || loading}
            onClick={handleAssignPlan}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
          >
            {assigning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Assigning Plan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Assign Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </SuperAdminShell>
  );
}
