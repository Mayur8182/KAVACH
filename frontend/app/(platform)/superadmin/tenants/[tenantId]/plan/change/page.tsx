'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Check,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function ChangeTenantPlanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Loaded Data
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [targetPlanKey, setTargetPlanKey] = useState<string>('enterprise');

  // Change parameters
  const [effectiveDateType, setEffectiveDateType] = useState<'immediately' | 'on_next_billing_cycle'>('immediately');
  const [reason, setReason] = useState<string>('');

  // Downgrade preview & acknowledgment (Screen 15)
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downgradePreview, setDowngradePreview] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  // Load initial current plan and plan options
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const [curr, opts] = await Promise.all([
          api.superadmin.getTenantCurrentPlan(tenantId),
          api.superadmin.getTenantPlanOptions(tenantId),
        ]);
        setCurrentPlanData(curr);
        setAvailablePlans(opts.available_plans || []);

        // Pick a default target plan that is different from current
        const currentKey = curr.current_plan?.key || 'pro';
        const defaultTarget = currentKey === 'enterprise' ? 'pro' : 'enterprise';
        setTargetPlanKey(defaultTarget);
      } catch (err: any) {
        console.error('Failed to load plan change data:', err);
        setError(err?.message || 'Failed to retrieve current plan information.');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [tenantId]);

  // Load downgrade preview when targetPlanKey changes
  useEffect(() => {
    if (!targetPlanKey) return;
    async function loadChangePreview() {
      setPreviewLoading(true);
      try {
        const preview = await api.superadmin.previewTenantPlanChange(tenantId, targetPlanKey);
        setDowngradePreview(preview);
        // Reset acknowledgment when target changes
        setAcknowledged(false);
      } catch (err: any) {
        console.error('Failed to calculate plan change preview:', err);
      } finally {
        setPreviewLoading(false);
      }
    }
    loadChangePreview();
  }, [tenantId, targetPlanKey]);

  const handleExecuteChange = async () => {
    if (downgradePreview?.is_downgrade && !acknowledged) {
      setError('Please acknowledge the downgrade impact before proceeding.');
      return;
    }

    setExecuting(true);
    setError(null);
    try {
      const res = await api.superadmin.executeTenantPlanChange(tenantId, {
        target_plan_key: targetPlanKey,
        effective_date_type: effectiveDateType,
        reason: reason || undefined,
        is_downgrade_acknowledged: acknowledged,
      });

      setSuccess(res.message || 'Plan change executed successfully!');
      setTimeout(() => {
        router.push(`/superadmin/tenants/${tenantId}/plan/audit`);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute plan change.');
    } finally {
      setExecuting(false);
    }
  };

  const orgName = currentPlanData?.organization?.name || 'Organization';
  const currentPlan = currentPlanData?.current_plan || {};
  const isDowngrade = downgradePreview?.is_downgrade;

  const targetPlanDetails = availablePlans.find(
    (p) => p.key?.toLowerCase() === targetPlanKey.toLowerCase()
  ) || {
    name: targetPlanKey.toUpperCase(),
    key: targetPlanKey,
    price_monthly: targetPlanKey === 'starter' ? 99 : targetPlanKey === 'enterprise' ? 'Custom' : 299,
  };

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

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/tenants/plan" className="hover:underline">
              Tenants
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700">{orgName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/superadmin/tenants/${tenantId}/plan/usage`} className="hover:underline">
              Plan
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Change Plan</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Change Plan</h1>
              <p className="text-xs text-slate-500">Upgrade, downgrade or change the subscription plan for this tenant.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/history`}
                className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                View Assignment History
              </Link>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading current plan & change options...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Screen 14: Side-by-side Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Current Plan Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Current Plan</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{currentPlan.name || 'Pro'}</h3>
                  <div className="text-lg font-bold text-blue-600 mb-5">
                    {currentPlan.price_monthly ? `$${currentPlan.price_monthly} / mo` : '$299 / mo'}
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{currentPlan.repositories_limit || 25} Repositories</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{(currentPlan.scan_minutes_limit || 10000).toLocaleString()} Scan Minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{currentPlan.developer_seats_limit || 20} Developer Seats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>SAST, Secrets, SCA Included</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Assigned on: {currentPlanData?.subscription?.started_at ? new Date(currentPlanData.subscription.started_at).toLocaleDateString() : 'Active subscription'}
                </div>
              </div>

              {/* Target Plan Selector Card */}
              <div className="bg-white border-2 border-blue-500 rounded-xl p-6 shadow-sm flex flex-col justify-between relative">
                <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                  Target Plan
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Select New Plan</span>
                    {previewLoading && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Choose Plan Tier</label>
                    <select
                      value={targetPlanKey}
                      onChange={(e) => setTargetPlanKey(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availablePlans.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name} — {p.price_monthly === 'Custom' ? 'Custom Pricing' : `$${p.price_monthly} / mo`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{targetPlanDetails.name}</h3>
                  <div className="text-lg font-bold text-blue-600 mb-5">
                    {targetPlanDetails.price_monthly === 'Custom'
                      ? 'Custom Pricing'
                      : `$${targetPlanDetails.price_monthly} / mo`}
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    {targetPlanKey === 'starter' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Up to 5 Repositories</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>2,000 Scan Minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>5 Developer Seats</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="w-4 h-4 text-center">✕</span>
                          <span>Basic SAST only (No AI Autofix, No SBOM)</span>
                        </div>
                      </>
                    )}

                    {targetPlanKey === 'pro' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Up to 25 Repositories</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>10,000 Scan Minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>20 Developer Seats</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>PR Security Gates & AI Autofix (Basic)</span>
                        </div>
                      </>
                    )}

                    {targetPlanKey === 'enterprise' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">Unlimited Repositories</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">50,000 Scan Minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">50 Developer Seats</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Advanced Security, Dedicated Runners, SAML SSO</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Type: {isDowngrade ? 'Downgrade' : 'Upgrade / Change'}</span>
                  <span className="font-semibold text-blue-600">Verified Plan Version</span>
                </div>
              </div>
            </div>

            {/* Effective Date & Reason Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <h4 className="text-sm font-bold text-slate-900">Execution Parameters</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Effective Date</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      effectiveDateType === 'immediately'
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="effectiveDate"
                        checked={effectiveDateType === 'immediately'}
                        onChange={() => setEffectiveDateType('immediately')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Immediately</div>
                        <div className="text-[11px] text-slate-500">
                          Changes take effect instantly, recalculating quotas and feature gates now.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      effectiveDateType === 'on_next_billing_cycle'
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="effectiveDate"
                        checked={effectiveDateType === 'on_next_billing_cycle'}
                        onChange={() => setEffectiveDateType('on_next_billing_cycle')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">On Next Billing Cycle</div>
                        <div className="text-[11px] text-slate-500">
                          Maintain current plan features until renewal date, then transition automatically.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Reason for Change</label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for this plan change (e.g. Customer requested upgrade, team expansion, or downsizing)..."
                    className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">This explanation will be recorded in the audit log.</p>
                </div>
              </div>
            </div>

            {/* Screen 15: Plan Downgrade Confirmation (shown when isDowngrade is true) */}
            {isDowngrade && downgradePreview && (
              <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 text-amber-900">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-950">Plan Downgrade Confirmation</h3>
                    <p className="text-xs text-amber-800 font-medium">
                      This will reduce the tenant's access to certain features and limits.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-amber-200/80">
                  {/* Left Column: What will be changed */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">What will be changed:</h4>
                    <div className="space-y-2 text-xs text-slate-700">
                      {downgradePreview.what_will_be_changed?.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Impact on current usage */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Impact on current usage:</h4>
                    <div className="space-y-2 text-xs">
                      {downgradePreview.impact_on_current_usage?.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-red-700 bg-red-50 px-2.5 py-1.5 rounded-md border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span className="font-semibold">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Explicit Downgrade Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      I understand the impact and want to proceed
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/usage`}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel
              </Link>

              {isDowngrade ? (
                <button
                  type="button"
                  onClick={handleExecuteChange}
                  disabled={!acknowledged || executing}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 ${
                    !acknowledged || executing
                      ? 'bg-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'
                  }`}
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Downgrading Plan...
                    </>
                  ) : (
                    'Downgrade Plan'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteChange}
                  disabled={executing || targetPlanKey === currentPlan.key?.toLowerCase()}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 ${
                    executing || targetPlanKey === currentPlan.key?.toLowerCase()
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                  }`}
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing Change...
                    </>
                  ) : (
                    'Change Plan'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
