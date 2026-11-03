'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Cpu,
  Save,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function ScanQuotasPage() {
  const [activeSubTab, setActiveSubTab] = useState<'plan_limits' | 'tenant_overrides'>('plan_limits');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [planLimits, setPlanLimits] = useState<any[]>([]);
  const [scanSettings, setScanSettings] = useState({
    block_scans_when_limit_reached: true,
    allow_burst_usage: false,
    notify_admins_at_80: true,
    reset_period: 'Monthly',
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getScanQuotas();
        setPlanLimits(res.plan_limits || []);
        if (res.scan_quota_settings) {
          setScanSettings(res.scan_quota_settings);
        }
      } catch (err: any) {
        console.error('Failed to load scan quotas:', err);
        setError(err?.message || 'Failed to load scan execution limits.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = (key: 'block_scans_when_limit_reached' | 'allow_burst_usage' | 'notify_admins_at_80') => {
    setScanSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.superadmin.updateScanSettings(scanSettings);
      setSuccess('Scan quota settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update scan quota settings.');
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
            <span className="text-slate-900 font-semibold">Scan Quotas</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scan Quotas & Execution Limits</h1>
              <p className="text-xs text-slate-500">Configure monthly scan minute quotas and parallel execution worker pools.</p>
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
            href="/superadmin/quotas/overrides?quota_type=Scan%20Minutes"
            className="pb-2.5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            Tenant Overrides
          </Link>
        </div>

        {/* Plan Limits Table (Screen 3) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Scan Execution Quotas per Plan</span>
            <span className="text-[11px] text-slate-500">Includes SAST, SCA, Secrets, IaC & Container runs</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Monthly Scan Minutes</th>
                <th className="py-3 px-4">Concurrent Scans</th>
                <th className="py-3 px-4">Enforcement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planLimits.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.plan}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.monthly_scan_minutes}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.concurrent_scans}</td>
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

        {/* Scan Quota Settings Card (Screen 3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scan Quota Settings</h3>
              <p className="text-xs text-slate-500">Scheduler and runner dispatch policy controls.</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Runner Pool Policy
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Setting 1 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Block scans when limit reached</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rejects new scan pipeline dispatches with a quota limit status until the next cycle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('block_scans_when_limit_reached')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  scanSettings.block_scans_when_limit_reached ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    scanSettings.block_scans_when_limit_reached ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Allow burst usage (10% over limit)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allows critical automated scans to run even if minutes exceed up to a 10% safety buffer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allow_burst_usage')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  scanSettings.allow_burst_usage ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    scanSettings.allow_burst_usage ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 3 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Notify admins at 80% usage</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sends automated notifications when a tenant consumes 80% of their monthly allocated scan minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('notify_admins_at_80')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  scanSettings.notify_admins_at_80 ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    scanSettings.notify_admins_at_80 ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reset Period */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Reset Period</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Billing and calculation frequency for scan minute quota renewals.
                </p>
              </div>
              <select
                value={scanSettings.reset_period}
                onChange={(e) => setScanSettings({ ...scanSettings, reset_period: e.target.value })}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
                <option value="Custom">Custom Rolling</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
