'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  RotateCcw,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TenantEntitlementOverridesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  // Active subtab: 'features' (Screen 5) | 'limits' (Screen 6) | 'modules' (Screen 7) | 'advanced' (Screen 8)
  const [activeTab, setActiveTab] = useState<'features' | 'limits' | 'modules' | 'advanced'>('features');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Overrides Data
  const [tenantName, setTenantName] = useState('Organization');
  const [featuresList, setFeaturesList] = useState<any[]>([]);
  const [limitsList, setLimitsList] = useState<any[]>([]);
  const [modulesList, setModulesList] = useState<any[]>([]);
  const [advancedList, setAdvancedList] = useState<any[]>([]);

  useEffect(() => {
    async function loadOverrides() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.superadmin.getTenantPlanOverrides(tenantId);
        setTenantName(res.organization?.name || 'Organization');
        setFeaturesList(res.features || []);
        setLimitsList(res.limits || []);
        setModulesList(res.modules || []);
        setAdvancedList(res.advanced || []);
      } catch (err: any) {
        console.error('Failed to load overrides:', err);
        setError(err?.message || 'Failed to retrieve tenant overrides.');
      } finally {
        setLoading(false);
      }
    }
    loadOverrides();
  }, [tenantId]);

  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Toggle helpers
  const handleFeatureToggle = (idx: number, field: 'inherit_from_plan' | 'custom_override') => {
    const updated = [...featuresList];
    updated[idx][field] = !updated[idx][field];
    if (field === 'inherit_from_plan' && updated[idx].inherit_from_plan) {
      updated[idx].effective_value = 'Enabled';
    } else if (field === 'custom_override') {
      updated[idx].effective_value = updated[idx].custom_override ? 'Enabled' : 'Disabled';
    }
    setFeaturesList(updated);
  };

  const handleModuleToggle = (idx: number, field: 'inherit_from_plan' | 'custom_override') => {
    const updated = [...modulesList];
    updated[idx][field] = !updated[idx][field];
    if (field === 'custom_override') {
      updated[idx].effective_value = updated[idx].custom_override ? 'Enabled' : 'Disabled';
    }
    setModulesList(updated);
  };

  const handleLimitChange = (idx: number, val: number) => {
    const updated = [...limitsList];
    updated[idx].custom_limit = val;
    if (!updated[idx].inherit_from_plan) {
      updated[idx].effective_value = val;
    }
    setLimitsList(updated);
  };

  const handleLimitInheritToggle = (idx: number) => {
    const updated = [...limitsList];
    updated[idx].inherit_from_plan = !updated[idx].inherit_from_plan;
    updated[idx].effective_value = updated[idx].inherit_from_plan
      ? updated[idx].plan_default
      : updated[idx].custom_limit;
    setLimitsList(updated);
  };

  const handleAdvancedToggle = (idx: number, field: 'inherit_from_plan' | 'custom_override') => {
    const updated = [...advancedList];
    updated[idx][field] = !updated[idx][field];
    setAdvancedList(updated);
  };

  // Save current active tab overrides
  const handleSaveOverrides = async () => {
    setSaving(true);
    setError(null);
    try {
      let payloadOverrides = [];
      if (activeTab === 'features') payloadOverrides = featuresList;
      else if (activeTab === 'limits') payloadOverrides = limitsList;
      else if (activeTab === 'modules') payloadOverrides = modulesList;
      else payloadOverrides = advancedList;

      await api.superadmin.saveTenantPlanOverrides(tenantId, {
        category: activeTab,
        overrides: payloadOverrides,
      });

      triggerSuccess(`Successfully saved ${activeTab} overrides for ${tenantName}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to persist overrides.');
    } finally {
      setSaving(false);
    }
  };

  // Reset overrides to defaults
  const handleResetDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.superadmin.resetTenantPlanOverrides(tenantId, activeTab);
      setFeaturesList(res.features || []);
      setLimitsList(res.limits || []);
      setModulesList(res.modules || []);
      setAdvancedList(res.advanced || []);
      triggerSuccess('Reset overrides back to standard plan defaults.');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset overrides.');
    } finally {
      setSaving(false);
    }
  };

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
            <span>{tenantName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Overrides</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Entitlement Overrides</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure custom entitlements and quotas for {tenantName}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving || loading}
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Plan Defaults</span>
              </button>

              <button
                type="button"
                disabled={saving || loading}
                onClick={handleSaveOverrides}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Overrides</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Alert Banner matching image */}
        <div className="bg-amber-50/70 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Overrides allow you to enable and disable specific features and quotas for this organization.
          </span>
        </div>

        {/* 4 Subtabs Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
          {[
            { id: 'features', label: 'Features' },
            { id: 'limits', label: 'Limits & Quotas' },
            { id: 'modules', label: 'Modules' },
            { id: 'advanced', label: 'Advanced' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Subtab Tables */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading overrides configuration...</p>
            </div>
          ) : (
            <>
              {/* SCREEN 5: Features Tab */}
              {activeTab === 'features' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-3 px-6">Feature</th>
                      <th className="py-3 px-6 text-center">Inherit from Plan</th>
                      <th className="py-3 px-6 text-center">Custom Override</th>
                      <th className="py-3 px-6 text-right">Effective Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {featuresList.map((f, idx) => (
                      <tr key={f.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-800">{f.name}</td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={f.inherit_from_plan}
                            onChange={() => handleFeatureToggle(idx, 'inherit_from_plan')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={f.custom_override}
                            onChange={() => handleFeatureToggle(idx, 'custom_override')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              f.effective_value === 'Enabled'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {f.effective_value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* SCREEN 6: Limits & Quotas Tab */}
              {activeTab === 'limits' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-3 px-6">Feature / Quota</th>
                      <th className="py-3 px-6 text-center">Inherit from Plan</th>
                      <th className="py-3 px-6 text-center">Custom Limit</th>
                      <th className="py-3 px-6 text-right">Effective Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {limitsList.map((l, idx) => (
                      <tr key={l.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-800">{l.name}</td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={l.inherit_from_plan}
                            onChange={() => handleLimitInheritToggle(idx)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="number"
                            min={0}
                            value={l.custom_limit}
                            onChange={(e) => handleLimitChange(idx, parseInt(e.target.value) || 0)}
                            className="w-24 text-center px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 text-xs focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-slate-900">
                          {l.effective_value.toLocaleString()} {l.unit !== 'count' ? l.unit : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* SCREEN 7: Modules Tab */}
              {activeTab === 'modules' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-3 px-6">Module</th>
                      <th className="py-3 px-6 text-center">Inherit</th>
                      <th className="py-3 px-6 text-center">Custom Override</th>
                      <th className="py-3 px-6 text-right">Effective Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modulesList.map((m, idx) => (
                      <tr key={m.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-800">{m.name}</td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={m.inherit_from_plan}
                            onChange={() => handleModuleToggle(idx, 'inherit_from_plan')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={m.custom_override}
                            onChange={() => handleModuleToggle(idx, 'custom_override')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              m.effective_value === 'Enabled'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {m.effective_value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* SCREEN 8: Advanced Settings Tab */}
              {activeTab === 'advanced' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-3 px-6">Setting</th>
                      <th className="py-3 px-6 text-center">Inherit from Plan</th>
                      <th className="py-3 px-6 text-center">Custom Override</th>
                      <th className="py-3 px-6 text-right">Effective Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advancedList.map((a, idx) => (
                      <tr key={a.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-800">{a.name}</td>
                        <td className="py-3 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={a.inherit_from_plan}
                            onChange={() => handleAdvancedToggle(idx, 'inherit_from_plan')}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="font-semibold text-slate-700">{a.custom_override}</span>
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-blue-900">
                          {a.effective_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        <div className="pt-2">
          <Link
            href="/superadmin/tenants/plan"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
        </div>
      </div>
    </SuperAdminShell>
  );
}
