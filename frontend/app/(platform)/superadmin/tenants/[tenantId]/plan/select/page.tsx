'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  CreditCard,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Zap,
  Building2,
  Lock,
  Layers,
  Server,
  ArrowRight,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SelectTenantPlanPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<any>(null);

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getTenantPlanOptions(tenantId);
        setPlanData(res);
      } catch (err: any) {
        console.error('Failed to load plan options:', err);
        setError(err?.message || 'Failed to retrieve plan options.');
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, [tenantId]);

  const handleSelectPlan = (planKey: string) => {
    router.push(`/superadmin/tenants/${tenantId}/plan/review?target=${planKey}`);
  };

  const orgName = planData?.organization?.name || 'Organization';

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
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
            <span className="text-slate-900 font-semibold">Select</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Select Plan for {orgName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a subscription plan for this organization.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/overrides`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                Overrides
              </Link>
              <Link
                href={`/superadmin/tenants/${tenantId}/plan/history`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                History
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading subscription plans...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800 space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 3 Subscription Plan Cards (Screen 2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {(planData?.plans || []).map((plan: any) => {
                const isCurrent = plan.is_current;
                const isEnterprise = plan.key === 'enterprise';

                return (
                  <div
                    key={plan.key}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between p-6 relative ${
                      isCurrent
                        ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                        : isEnterprise
                        ? 'border-slate-300 shadow-xs hover:border-slate-400'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        Current Plan
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-slate-900">
                            {plan.price_amount > 0 ? `$${plan.price_amount}` : plan.price_formatted}
                          </span>
                          {plan.price_amount > 0 && (
                            <span className="text-xs text-slate-500 font-medium">/ month</span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                        <ul className="space-y-2.5 text-xs text-slate-600">
                          {plan.features.map((feat: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(plan.key)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isCurrent ? 'Current Plan (Review)' : 'Select Plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Links */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <Link
                href="/superadmin/tenants/plan"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </Link>

              <div className="flex items-center gap-6">
                <Link
                  href="/superadmin/plans"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Compare All Plans
                </Link>
                <Link
                  href="/superadmin/entitlements"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  View Feature Matrix
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
