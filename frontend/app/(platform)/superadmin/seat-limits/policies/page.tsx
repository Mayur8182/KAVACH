'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SeatPoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [planDefaults, setPlanDefaults] = useState<any[]>([]);
  const [policies, setPolicies] = useState({
    allow_invite_beyond_limit: false,
    auto_revoke_inactive_after_90_days: true,
    send_usage_alerts_at_80: true,
    default_role_mapping: 'Developer',
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getSeatPoliciesAndPlanDefaults();
        setPlanDefaults(res.plan_defaults || []);
        if (res.seat_policies) {
          setPolicies(res.seat_policies);
        }
      } catch (err: any) {
        console.error('Failed to load seat policies:', err);
        setError(err?.message || 'Failed to retrieve seat policies.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = (key: 'allow_invite_beyond_limit' | 'auto_revoke_inactive_after_90_days' | 'send_usage_alerts_at_80') => {
    setPolicies((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.superadmin.updateSeatPolicies(policies);
      setSuccess('Seat policies updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update seat policies.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Module Sub-Navigation */}
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
          <Link href="/superadmin/quotas" className="text-slate-500 hover:text-slate-800 transition-colors">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
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
            <Link href="/superadmin/seat-limits" className="hover:underline">
              Seat Limits
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Seat Policies & Configuration</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Seat Policies & Configuration</h1>
              <p className="text-xs text-slate-500">Configure default plan allocations, membership rules, and role mappings.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/seat-limits"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Update Policies
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

        {/* Default Seat Limits per Plan Table (Screen 11) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Default Seat Limits per Plan</span>
            <span className="text-[11px] text-slate-500">Inherited on subscription provisioning</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Developer Seats</th>
                <th className="py-3 px-4">Security Engineer</th>
                <th className="py-3 px-4">Auditor Seats</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planDefaults.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.plan}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.developer_seats}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.security_engineer}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{row.auditor_seats}</td>
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

        {/* Seat Policies Card (Screen 11) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Seat Policies</h3>
              <p className="text-xs text-slate-500">Platform-wide membership, invitation limits, and inactivity rules.</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Global Membership Rule
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Policy 1 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Allow admins to invite beyond limit (with approval)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allows tenant owners to queue invitations which trigger a Founder SuperAdmin approval request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allow_invite_beyond_limit')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  policies.allow_invite_beyond_limit ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.allow_invite_beyond_limit ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Auto-revoke inactive users after 90 days
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically reclaims occupied seats when a member has zero logins or CLI scans for 90 days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('auto_revoke_inactive_after_90_days')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  policies.auto_revoke_inactive_after_90_days ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.auto_revoke_inactive_after_90_days ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 3 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Send seat usage alerts at 80%
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dispatches automated notifications to billing owners when seat occupancy reaches 80% capacity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('send_usage_alerts_at_80')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  policies.send_usage_alerts_at_80 ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    policies.send_usage_alerts_at_80 ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 4: Role Mapping */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900">Role Mapping</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Default role assigned to newly invited or SSO-provisioned members.
                </p>
              </div>
              <select
                value={policies.default_role_mapping}
                onChange={(e) => setPolicies({ ...policies, default_role_mapping: e.target.value })}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Developer">Developer</option>
                <option value="Security Engineer">Security Engineer</option>
                <option value="Auditor">Auditor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
