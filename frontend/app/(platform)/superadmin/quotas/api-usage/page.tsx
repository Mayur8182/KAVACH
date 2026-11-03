'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Layers,
  Save,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function ApiUsageQuotasPage() {
  const [activeSubTab, setActiveSubTab] = useState<'plan_limits' | 'tenant_overrides'>('plan_limits');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [planLimits, setPlanLimits] = useState<any[]>([]);
  const [apiSettings, setApiSettings] = useState({
    enforce_rate_limits: true,
    block_requests_when_nearly_limit_reached: true,
    allow_whitelisted_ip_ranges: false,
    log_all_blocked_requests: true,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getApiUsageQuotas();
        setPlanLimits(res.plan_limits || []);
        if (res.api_usage_settings) {
          setApiSettings(res.api_usage_settings);
        }
      } catch (err: any) {
        console.error('Failed to load API quotas:', err);
        setError(err?.message || 'Failed to load API usage limits.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = (key: keyof typeof apiSettings) => {
    setApiSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.superadmin.updateApiSettings(apiSettings);
      setSuccess('API usage settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update API usage settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Sub-Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements
          </Link>
          <Link href="/superadmin/tenants/plan" className="text-slate-500 hover:text-slate-800 transition-colors">
            Tenant Plan Assignment
          </Link>
          <Link href="/superadmin/quotas" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-slate-500 hover:text-slate-800 transition-colors">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/quotas" className="hover:underline">
              Quotas
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">API Usage & Rate Limits</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Usage & Rate Limits</h1>
              <p className="text-xs text-slate-500">Configure monthly API request volumes and per-minute throttling limits.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/quotas"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Update Limits
              </button>
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

        {/* Sub-tabs: Plan Limits | Tenant Overrides */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('plan_limits')}
            className={`pb-2.5 transition-colors ${
              activeSubTab === 'plan_limits'
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Plan Limits
          </button>
          <Link
            href="/superadmin/quotas/overrides?quota_type=API%20Calls"
            className="pb-2.5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            Tenant Overrides
          </Link>
        </div>

        {/* Plan Limits Table (Screen 4) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">API Gateway Volume Quotas</span>
            <span className="text-[11px] text-slate-500">Enforced by SecuLayer Gateway Middleware</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Monthly API Calls</th>
                <th className="py-3 px-4">Rate Limit (per min)</th>
                <th className="py-3 px-4">Enforcement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planLimits.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.plan}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.monthly_api_calls}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.rate_limit_per_min}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {row.enforcement}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href="/superadmin/plans"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Usage Settings Card (Screen 4) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">API Usage Settings</h3>
              <p className="text-xs text-slate-500">Gateway throttling, rate-limit defense and security controls.</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Gateway Policy
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Setting 1 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Enforce rate limits</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Applies leaky-bucket token limits per API key and service token to prevent abuse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('enforce_rate_limits')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  apiSettings.enforce_rate_limits ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    apiSettings.enforce_rate_limits ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Block requests when monthly limit reached</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Returns HTTP 429 Too Many Requests when the organization consumes its monthly call allowance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('block_requests_when_nearly_limit_reached')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  apiSettings.block_requests_when_nearly_limit_reached ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    apiSettings.block_requests_when_nearly_limit_reached ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 3 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Allow whitelisted IP ranges</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exempts trusted runner CIDR blocks and on-prem gateway IPs from per-minute throttling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allow_whitelisted_ip_ranges')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  apiSettings.allow_whitelisted_ip_ranges ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    apiSettings.allow_whitelisted_ip_ranges ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 4 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Log all blocked requests</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Records detailed IP, endpoint path, and timestamp in the security audit stream when throttled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('log_all_blocked_requests')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  apiSettings.log_all_blocked_requests ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    apiSettings.log_all_blocked_requests ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
