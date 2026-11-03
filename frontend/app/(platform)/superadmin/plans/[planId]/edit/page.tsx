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
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Lock,
  Clock,
  History,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function EditPlanConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.planId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalPlan, setOriginalPlan] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_price: 0,
    annual_price: 0,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 14,
    is_trial_allowed: true,
    auto_renew: true,
    cancel_at_period_end: false,
    max_repositories: 25,
    monthly_scan_minutes: 10000,
    concurrent_scans: 5,
    monthly_api_calls: 500000,
    api_rate_limit_per_minute: 1000,
    storage_limit_gb: 50,
    developer_seats: 25,
    admin_seats: 5,
    security_seats: 5,
    auditor_seats: 5,
    seat_counting_rule: 'ACTIVE_ONLY',
    over_limit_behavior: 'BLOCK',
    features: [] as string[],
    changelog: 'Updated plan limits and configuration',
    reason: 'Administrative update via SuperAdmin Console',
  });

  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (!planId) return;

    Promise.all([api.superadmin.getPlanDetails(planId), api.superadmin.getFeatureCatalog()])
      .then(([planData, catData]) => {
        setOriginalPlan(planData);
        setCatalog(catData || []);

        setFormData({
          name: planData.name || '',
          description: planData.description || '',
          monthly_price: planData.pricing?.monthly_price ?? 0,
          annual_price: planData.pricing?.annual_price ?? 0,
          currency: planData.pricing?.currency || 'USD',
          billing_cycle: planData.pricing?.billing_cycle || 'monthly',
          trial_days: planData.pricing?.trial_days ?? 14,
          is_trial_allowed: planData.pricing?.is_trial_allowed ?? true,
          auto_renew: planData.pricing?.auto_renew ?? true,
          cancel_at_period_end: planData.pricing?.cancel_at_period_end ?? false,
          max_repositories: planData.limits?.max_repositories ?? 25,
          monthly_scan_minutes: planData.limits?.monthly_scan_minutes ?? 10000,
          concurrent_scans: planData.limits?.concurrent_scans ?? 5,
          monthly_api_calls: planData.limits?.monthly_api_calls ?? 500000,
          api_rate_limit_per_minute: planData.limits?.api_rate_limit_per_minute ?? 1000,
          storage_limit_gb: planData.limits?.storage_limit_gb ?? 50,
          developer_seats: planData.seats?.developer_seats ?? 25,
          admin_seats: planData.seats?.admin_seats ?? 5,
          security_seats: planData.seats?.security_seats ?? 5,
          auditor_seats: planData.seats?.auditor_seats ?? 5,
          seat_counting_rule: planData.seats?.seat_counting_rule || 'ACTIVE_ONLY',
          over_limit_behavior: planData.seats?.over_limit_behavior || 'BLOCK',
          features: planData.enabled_feature_keys || [],
          changelog: `Plan update for version ${planData.current_version}`,
          reason: 'Administrative update via SuperAdmin Console',
        });
      })
      .catch((err) => {
        console.error('Failed to load plan for editing:', err);
        setError('Failed to load plan details.');
      })
      .finally(() => setLoading(false));
  }, [planId]);

  const toggleFeature = (key: string) => {
    setFormData((prev) => {
      const exists = prev.features.includes(key);
      return {
        ...prev,
        features: exists ? prev.features.filter((f) => f !== key) : [...prev.features, key],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.superadmin.updatePlan(planId, formData);
      router.push(`/superadmin/plans/${planId}`);
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      setError(err?.message || 'Failed to update plan. Please check inputs.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-48" />
          <div className="h-10 bg-slate-200 rounded w-72" />
          <div className="h-96 bg-white rounded-xl border border-slate-200" />
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
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
              {originalPlan?.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Edit</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Edit Plan Configuration — {originalPlan?.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Modify quotas, seat limits, pricing and feature entitlements.
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

        {/* Versioning Policy Banner */}
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Deterministic Versioning Policy</span>
            <p className="text-blue-700 mt-0.5 leading-relaxed">
              {originalPlan?.status === 'ACTIVE'
                ? `This plan is PUBLISHED and active in production. Modifying quotas or pricing will generate an immutable new version (v${(originalPlan?.current_version || 1) + 1}) to guarantee existing customer contracts remain untouched.`
                : 'This plan is currently in DRAFT status. Updates will modify the current draft configuration directly.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSave} className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-xs space-y-8">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Key (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={originalPlan?.key}
                  className="w-full text-xs font-mono px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Usage & Quotas */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Repository & Quota Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Repository Limit</label>
                <input
                  type="number"
                  min={0}
                  value={formData.max_repositories}
                  onChange={(e) => setFormData({ ...formData, max_repositories: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400">0 for unlimited</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Scan Minutes</label>
                <input
                  type="number"
                  min={0}
                  value={formData.monthly_scan_minutes}
                  onChange={(e) => setFormData({ ...formData, monthly_scan_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Concurrent Scans</label>
                <input
                  type="number"
                  min={1}
                  value={formData.concurrent_scans}
                  onChange={(e) => setFormData({ ...formData, concurrent_scans: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monthly API Calls</label>
                <input
                  type="number"
                  min={0}
                  value={formData.monthly_api_calls}
                  onChange={(e) => setFormData({ ...formData, monthly_api_calls: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">API Rate Limit / min</label>
                <input
                  type="number"
                  min={0}
                  value={formData.api_rate_limit_per_minute}
                  onChange={(e) => setFormData({ ...formData, api_rate_limit_per_minute: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage Limit (GB)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.storage_limit_gb}
                  onChange={(e) => setFormData({ ...formData, storage_limit_gb: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Seat Allocations */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Seat Allocations
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Developer Seats</label>
                <input
                  type="number"
                  min={1}
                  value={formData.developer_seats}
                  onChange={(e) => setFormData({ ...formData, developer_seats: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Admin Seats</label>
                <input
                  type="number"
                  min={1}
                  value={formData.admin_seats}
                  onChange={(e) => setFormData({ ...formData, admin_seats: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Security Engineer</label>
                <input
                  type="number"
                  min={0}
                  value={formData.security_seats}
                  onChange={(e) => setFormData({ ...formData, security_seats: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Auditor Seats</label>
                <input
                  type="number"
                  min={0}
                  value={formData.auditor_seats}
                  onChange={(e) => setFormData({ ...formData, auditor_seats: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Pricing & Billing */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Pricing Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Price ($)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Annual Price ($)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.annual_price}
                  onChange={(e) => setFormData({ ...formData, annual_price: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Feature Entitlements */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Feature Entitlements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.map((feat) => {
                const checked = formData.features.includes(feat.key);
                return (
                  <label
                    key={feat.key}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-blue-50/60 border-blue-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-xs block">{feat.name}</span>
                      <span className="text-[10px] text-slate-400 block">{feat.tagline}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeature(feat.key)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 6: Audit Reason */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Audit Event Log
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason / Changelog for this update <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Upgraded quota limits for Q4 growth"
                value={formData.changelog}
                onChange={(e) => setFormData({ ...formData, changelog: e.target.value, reason: e.target.value })}
                className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/superadmin/plans/${planId}`}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Plan Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </SuperAdminShell>
  );
}
