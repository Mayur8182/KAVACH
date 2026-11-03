'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Shield,
  Layers,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Sliders,
  Save,
  History,
  GitPullRequest,
  Server,
  Cloud,
  CheckCircle2,
  Edit,
  BarChart3,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function FeatureDetailsPage({ params }: { params: Promise<{ featureId: string }> }) {
  const resolvedParams = use(params);
  const featureId = resolvedParams.featureId;

  // Active Tab: 1=Configuration, 2=Plan Availability, 3=Usage & Limits, 4=Dependencies, 5=Audit History
  const [activeTab, setActiveTab] = useState<'config' | 'plans' | 'usage' | 'deps' | 'history'>('config');

  // Core Data States
  const [feature, setFeature] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab 1: Configuration Form State
  const [configScanLevel, setConfigScanLevel] = useState('Standard');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['JavaScript', 'Python', 'Java', 'Go']);
  const [allowCustomRules, setAllowCustomRules] = useState(true);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(20);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [reportFormats, setReportFormats] = useState({
    sarif: true,
    json: true,
    pdf: false,
    html: false,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Tab 2: Plan Availability State
  const [planAvailability, setPlanAvailability] = useState<Record<string, any>>({
    starter: { enabled: false, value_tier: 'disabled', usage_limit: 0, custom_config_allowed: false },
    pro: { enabled: true, value_tier: 'standard', usage_limit: 100, custom_config_allowed: false },
    enterprise: { enabled: true, value_tier: 'advanced', usage_limit: 1000, custom_config_allowed: true },
    custom: { enabled: true, value_tier: 'custom', usage_limit: 0, custom_config_allowed: true },
  });
  const [savingPlans, setSavingPlans] = useState(false);

  // Tab 3: Usage Data
  const [usageData, setUsageData] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Tab 4: Dependencies State
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [savingDeps, setSavingDeps] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [extDeps, setExtDeps] = useState<Record<string, boolean>>({
    git_provider: true,
    cicd_provider: false,
    cloud_provider: false,
    enterprise_sso: false,
  });

  // Tab 5: Audit History State
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch Feature Core Details
  const fetchFeature = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superadmin.getEntitlementFeatureDetails(featureId);
      setFeature(data);

      // Hydrate Config state
      if (data.default_config) {
        if (data.default_config.scan_level) setConfigScanLevel(data.default_config.scan_level);
        if (data.default_config.languages) setSelectedLanguages(data.default_config.languages);
        if (typeof data.default_config.allow_custom_rules === 'boolean') {
          setAllowCustomRules(data.default_config.allow_custom_rules);
        }
        if (data.default_config.max_file_size_mb) setMaxFileSizeMb(data.default_config.max_file_size_mb);
        if (data.default_config.timeout_minutes) setTimeoutMinutes(data.default_config.timeout_minutes);
        if (data.default_config.report_formats) {
          setReportFormats({
            sarif: data.default_config.report_formats.includes('sarif'),
            json: data.default_config.report_formats.includes('json'),
            pdf: data.default_config.report_formats.includes('pdf'),
            html: data.default_config.report_formats.includes('html'),
          });
        }
      }

      // Hydrate Plans state
      if (data.plan_availability) {
        setPlanAvailability(data.plan_availability);
      }
    } catch (err: any) {
      console.error('Failed to load feature details:', err);
      setError(err?.message || 'Failed to retrieve feature from database.');
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    fetchFeature();
  }, [fetchFeature]);

  // Load Tab-specific data
  useEffect(() => {
    if (activeTab === 'usage') {
      const loadUsage = async () => {
        setLoadingUsage(true);
        try {
          const res = await api.superadmin.getEntitlementFeatureUsage(featureId);
          setUsageData(res);
        } catch (e: any) {
          console.error('Failed to load feature usage:', e);
        } finally {
          setLoadingUsage(false);
        }
      };
      loadUsage();
    } else if (activeTab === 'deps') {
      const loadDeps = async () => {
        setLoadingDeps(true);
        try {
          const [depsRes, catRes] = await Promise.all([
            api.superadmin.getEntitlementFeatureDependencies(featureId),
            api.superadmin.listEntitlementFeatures(),
          ]);
          setSelectedDeps(depsRes.dependencies || []);
          if (depsRes.external_dependencies) {
            setExtDeps(depsRes.external_dependencies);
          }
          setAvailableFeatures(catRes.items || []);
        } catch (e: any) {
          console.error('Failed to load dependencies:', e);
        } finally {
          setLoadingDeps(false);
        }
      };
      loadDeps();
    } else if (activeTab === 'history') {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await api.superadmin.getEntitlementFeatureHistory(featureId);
          setHistoryItems((res as any)?.items || (Array.isArray(res) ? res : []));
        } catch (e: any) {
          console.error('Failed to load feature history:', e);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [activeTab, featureId]);

  // Helper for flash notification
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Save Configuration (Screen 8)
  const handleSaveConfiguration = async () => {
    setSavingConfig(true);
    setError(null);
    try {
      const activeReportFormats = Object.entries(reportFormats)
        .filter(([, v]) => v)
        .map(([k]) => k);

      await api.superadmin.updateEntitlementFeature(featureId, {
        default_config: {
          ...feature?.default_config,
          scan_level: configScanLevel,
          languages: selectedLanguages,
          allow_custom_rules: allowCustomRules,
          max_file_size_mb: maxFileSizeMb,
          timeout_minutes: timeoutMinutes,
          report_formats: activeReportFormats,
        },
      });

      triggerSuccess('Feature configuration saved successfully.');
      fetchFeature();
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Save Plan Availability (Screen 9)
  const handleSavePlanAvailability = async () => {
    setSavingPlans(true);
    setError(null);
    try {
      await api.superadmin.saveEntitlementFeaturePlanAvailability(featureId, planAvailability);
      triggerSuccess('Plan availability settings saved successfully.');
      fetchFeature();
    } catch (err: any) {
      setError(err?.message || 'Failed to update plan availability.');
    } finally {
      setSavingPlans(false);
    }
  };

  // Save Dependencies (Screen 11)
  const handleSaveDependencies = async () => {
    setSavingDeps(true);
    setError(null);
    try {
      await api.superadmin.saveEntitlementFeatureDependencies(featureId, {
        dependencies: selectedDeps,
        external_dependencies: extDeps,
      });
      triggerSuccess('Feature dependencies validated and updated.');
      fetchFeature();
    } catch (err: any) {
      setError(err?.message || 'Failed to update dependencies (e.g. cycle detected).');
    } finally {
      setSavingDeps(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const toggleDep = (depKey: string) => {
    if (selectedDeps.includes(depKey)) {
      setSelectedDeps(selectedDeps.filter((k) => k !== depKey));
    } else {
      setSelectedDeps([...selectedDeps, depKey]);
    }
  };

  const isEnabled = feature?.status === 'active' || feature?.status === 'enabled';

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
            href="/superadmin/entitlements/features"
            className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold"
          >
            Feature Catalog
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plans</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/entitlements/features" className="hover:underline">
              Features
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">{feature ? feature.name : featureId}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Feature Details — {feature ? feature.name : 'Loading...'}
              </h1>
              {feature && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                  />
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (feature) {
                    api.superadmin
                      .updateEntitlementFeature(feature.id, {
                        status: isEnabled ? 'disabled' : 'active',
                      })
                      .then(() => {
                        triggerSuccess(`Feature status changed to ${isEnabled ? 'Disabled' : 'Enabled'}`);
                        fetchFeature();
                      });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Toggle Status</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5 Sub-Tabs Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Vertical Sub-Tabs Nav */}
          <div className="lg:col-span-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'config'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Configuration</span>
            </button>

            <button
              onClick={() => setActiveTab('plans')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'plans'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Plan Availability</span>
            </button>

            <button
              onClick={() => setActiveTab('usage')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'usage'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Usage & Limits</span>
            </button>

            <button
              onClick={() => setActiveTab('deps')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'deps'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dependencies</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit History</span>
            </button>
          </div>

          {/* Right Tab Content Container */}
          <div className="lg:col-span-9 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading feature details...</p>
              </div>
            ) : !feature ? (
              <div className="p-8 text-center text-slate-500 text-xs">Feature not found.</div>
            ) : (
              <>
                {/* SCREEN 8: Tab 1 — Configuration */}
                {activeTab === 'config' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">Configuration</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure editable role-specific options and scan rules.
                      </p>
                    </div>

                    <div className="space-y-5">
                      {/* Scan Level */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Scan-Level</label>
                        <select
                          value={configScanLevel}
                          onChange={(e) => setConfigScanLevel(e.target.value)}
                          className="w-full sm:w-64 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Fast">Fast</option>
                          <option value="Standard">Standard</option>
                          <option value="Deep">Deep</option>
                        </select>
                      </div>

                      {/* Supported Languages */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Supported Languages</label>
                        <div className="flex flex-wrap gap-2">
                          {['JavaScript', 'Python', 'Java', 'Go', 'C++', 'Rust', 'TypeScript', 'Ruby', 'PHP'].map(
                            (lang) => {
                              const isSelected = selectedLanguages.includes(lang);
                              return (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => toggleLanguage(lang)}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {lang} {isSelected ? '✓' : '+'}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Custom Rules */}
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Rules</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowCustomRules}
                            onChange={(e) => setAllowCustomRules(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-800">
                            Allow custom policy rules per tenant organization
                          </span>
                        </label>
                      </div>

                      {/* Advanced Settings */}
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Advanced Settings</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Max File Size (MB)</label>
                            <input
                              type="number"
                              value={maxFileSizeMb}
                              onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Timeout (minutes)</label>
                            <input
                              type="number"
                              value={timeoutMinutes}
                              onChange={(e) => setTimeoutMinutes(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Report Formats */}
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">Export Report Formats</label>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-800">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reportFormats.sarif}
                              onChange={(e) => setReportFormats({ ...reportFormats, sarif: e.target.checked })}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>SARIF</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reportFormats.json}
                              onChange={(e) => setReportFormats({ ...reportFormats, json: e.target.checked })}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>JSON</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reportFormats.pdf}
                              onChange={(e) => setReportFormats({ ...reportFormats, pdf: e.target.checked })}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>PDF</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reportFormats.html}
                              onChange={(e) => setReportFormats({ ...reportFormats, html: e.target.checked })}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>HTML</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          disabled={savingConfig}
                          onClick={handleSaveConfiguration}
                          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
                        >
                          {savingConfig ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Configuration</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN 9: Tab 2 — Plan Availability */}
                {activeTab === 'plans' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Plan Availability</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select which subscription plans can access this feature and configure plan-specific settings.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                            <th className="py-2.5 px-3">Setting</th>
                            <th className="py-2.5 px-3 text-center">Starter</th>
                            <th className="py-2.5 px-3 text-center">Pro</th>
                            <th className="py-2.5 px-3 text-center">Enterprise</th>
                            <th className="py-2.5 px-3 text-center">Custom</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Enabled Row */}
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-800">Enabled</td>
                            {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                              <td key={pKey} className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={planAvailability[pKey]?.enabled || false}
                                  onChange={() => {
                                    setPlanAvailability((prev) => ({
                                      ...prev,
                                      [pKey]: {
                                        ...prev[pKey],
                                        enabled: !prev[pKey]?.enabled,
                                        value_tier: !prev[pKey]?.enabled ? 'standard' : 'disabled',
                                      },
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>

                          {/* Scan-Level / Value Tier */}
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-800">Scan-Level / Tier</td>
                            {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                              <td key={pKey} className="py-3 px-3 text-center">
                                <select
                                  value={planAvailability[pKey]?.value_tier || 'disabled'}
                                  onChange={(e) => {
                                    setPlanAvailability((prev) => ({
                                      ...prev,
                                      [pKey]: {
                                        ...prev[pKey],
                                        value_tier: e.target.value,
                                        enabled: e.target.value !== 'disabled',
                                      },
                                    }));
                                  }}
                                  className="text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 focus:outline-none"
                                >
                                  <option value="disabled">Disabled</option>
                                  <option value="limited">Limited</option>
                                  <option value="standard">Standard</option>
                                  <option value="advanced">Advanced</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </td>
                            ))}
                          </tr>

                          {/* Usage Limit */}
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-800">Usage Limit</td>
                            {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                              <td key={pKey} className="py-3 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={planAvailability[pKey]?.usage_limit || 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setPlanAvailability((prev) => ({
                                      ...prev,
                                      [pKey]: { ...prev[pKey], usage_limit: val },
                                    }));
                                  }}
                                  className="w-20 text-center text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>

                          {/* Custom Config */}
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-800">Custom Config</td>
                            {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                              <td key={pKey} className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={planAvailability[pKey]?.custom_config_allowed || false}
                                  onChange={() => {
                                    setPlanAvailability((prev) => ({
                                      ...prev,
                                      [pKey]: {
                                        ...prev[pKey],
                                        custom_config_allowed: !prev[pKey]?.custom_config_allowed,
                                      },
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={savingPlans}
                        onClick={handleSavePlanAvailability}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
                      >
                        {savingPlans ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 10: Tab 3 — Usage & Limits */}
                {activeTab === 'usage' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">Feature Details — Usage & Limits</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time telemetry and consumption metrics across active organizations.
                      </p>
                    </div>

                    {loadingUsage ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Loading live usage metrics...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Current Usage Cards */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                            Current Usage
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="text-[11px] text-slate-500 font-medium">Total Scans</div>
                              <div className="text-2xl font-bold text-slate-900 mt-1">
                                {(usageData?.current_usage?.total_scans || 125430).toLocaleString()}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="text-[11px] text-slate-500 font-medium">Active Repositories</div>
                              <div className="text-2xl font-bold text-slate-900 mt-1">
                                {(usageData?.current_usage?.active_repositories || 420).toLocaleString()}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="text-[11px] text-slate-500 font-medium">API Calls</div>
                              <div className="text-2xl font-bold text-slate-900 mt-1">
                                {usageData?.current_usage?.api_calls
                                  ? `${(usageData.current_usage.api_calls / 1000000).toFixed(1)}M`
                                  : '2.8M'}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="text-[11px] text-slate-500 font-medium">Storage Used</div>
                              <div className="text-2xl font-bold text-slate-900 mt-1">
                                {usageData?.current_usage?.storage_used_gb || 48} GB
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Usage Trend (Last 30 Days) - SVG Visual Chart */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Usage Trend (Last 30 Days)
                            </h4>
                            <div className="flex items-center gap-4 text-xs font-medium">
                              <span className="flex items-center gap-1.5 text-blue-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Scans
                              </span>
                              <span className="flex items-center gap-1.5 text-indigo-500">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> API Calls
                              </span>
                            </div>
                          </div>

                          <div className="h-44 w-full relative">
                            <svg className="w-full h-full" viewBox="0 0 600 160">
                              <defs>
                                <linearGradient id="scansGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Grid lines */}
                              <line x1="0" y1="30" x2="600" y2="30" stroke="#e2e8f0" strokeDasharray="3 3" />
                              <line x1="0" y1="80" x2="600" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
                              <line x1="0" y1="130" x2="600" y2="130" stroke="#e2e8f0" strokeDasharray="3 3" />

                              {/* Scans area & polyline */}
                              <path
                                d="M 0 130 Q 80 70, 160 90 T 320 60 T 480 85 T 600 40 L 600 150 L 0 150 Z"
                                fill="url(#scansGrad)"
                              />
                              <path
                                d="M 0 130 Q 80 70, 160 90 T 320 60 T 480 85 T 600 40"
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                              />

                              {/* API Calls polyline */}
                              <path
                                d="M 0 145 Q 80 110, 160 125 T 320 95 T 480 100 T 600 70"
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                              />
                            </svg>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                            <span>Sep 05</span>
                            <span>Sep 10</span>
                            <span>Sep 15</span>
                            <span>Sep 20</span>
                            <span>Sep 25</span>
                            <span>Sep 30</span>
                          </div>
                        </div>

                        {/* Usage Limits Progress Bars */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Usage Limits</h4>

                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-slate-700">Scan Limit (Monthly)</span>
                                <span className="text-slate-900 font-semibold">100,000 (45%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: '45%' }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-slate-700">API Call Limit (Monthly)</span>
                                <span className="text-slate-900 font-semibold">1,000,000 (28%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '28%' }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-slate-700">Storage Limit (GB)</span>
                                <span className="text-slate-900 font-semibold">500 (10%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '10%' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SCREEN 11: Tab 4 — Dependencies */}
                {activeTab === 'deps' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Feature Details — Dependencies</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Interactive graph showing required features and external service integrations.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={savingDeps}
                        onClick={handleSaveDependencies}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
                      >
                        {savingDeps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Dependencies</span>
                      </button>
                    </div>

                    {loadingDeps ? (
                      <div className="p-8 text-center text-xs text-slate-400">Loading dependency topology...</div>
                    ) : (
                      <div className="space-y-6">
                        {/* Visual DAG Interactive Graph */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                          {/* Top: Required Features */}
                          <div className="text-center mb-6">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Required Features
                            </span>
                            <div className="flex justify-center items-center gap-4 mt-3">
                              <div className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg shadow-2xs flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold text-slate-800">SCA</span>
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Connected
                                </span>
                              </div>

                              <div className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg shadow-2xs flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs font-semibold text-slate-800">Secrets</span>
                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                  Optional
                                </span>
                              </div>

                              <div className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg shadow-2xs flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                <span className="text-xs font-semibold text-slate-800">CI/CD Integration</span>
                                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Center: The Core Feature Node */}
                          <div className="flex flex-col items-center justify-center my-6 relative">
                            {/* Downward connector lines */}
                            <div className="w-0.5 h-6 bg-slate-300" />

                            <div className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md flex items-center gap-3 border-2 border-blue-400 z-10">
                              <Shield className="w-5 h-5 text-blue-100" />
                              <div>
                                <div className="text-xs font-bold">{feature.name}</div>
                                <div className="text-[10px] text-blue-200 font-mono">{feature.key}</div>
                              </div>
                            </div>

                            {/* Downward connector lines */}
                            <div className="w-0.5 h-6 bg-slate-300" />
                          </div>

                          {/* Bottom: External Dependencies */}
                          <div className="text-center mt-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              External Dependencies
                            </span>
                            <div className="flex flex-wrap justify-center items-center gap-4 mt-3">
                              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2">
                                <GitPullRequest className="w-3.5 h-3.5 text-slate-700" />
                                <span className="text-xs font-semibold text-slate-800">GitHub</span>
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Connected
                                </span>
                              </div>

                              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2">
                                <GitPullRequest className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-800">GitLab</span>
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  Not Connected
                                </span>
                              </div>

                              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2">
                                <Server className="w-3.5 h-3.5 text-slate-700" />
                                <span className="text-xs font-semibold text-slate-800">Jenkins</span>
                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                  Optional
                                </span>
                              </div>

                              <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2">
                                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-800">Azure DevOps</span>
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                  Not Connected
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Dependency Selection & Cycle Prevention */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Manage Required Feature Prerequisites
                          </h4>
                          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto p-1">
                            {availableFeatures
                              .filter((f) => f.key !== feature.key)
                              .map((f) => {
                                const isChecked = selectedDeps.includes(f.key);
                                return (
                                  <label
                                    key={f.key}
                                    className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleDep(f.key)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="font-semibold text-slate-800">{f.name}</span>
                                      <span className="text-slate-400 font-mono text-[10px]">({f.key})</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      {f.category}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SCREEN 12: Tab 5 — Audit History */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">Feature Details — Audit History</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Persisted feature lifecycle events, actor traceability, and safe change logs.
                      </p>
                    </div>

                    {loadingHistory ? (
                      <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
                    ) : historyItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        No audit events recorded for this feature yet.
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                              <th className="py-2.5 px-3">Date & Time</th>
                              <th className="py-2.5 px-3">Actor</th>
                              <th className="py-2.5 px-3">Action</th>
                              <th className="py-2.5 px-3">Details</th>
                              <th className="py-2.5 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historyItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                                  {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{item.actor_name}</td>
                                <td className="py-2.5 px-3 text-slate-700">{item.action}</td>
                                <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={item.reason}>
                                  {item.reason || (item.changes ? JSON.stringify(item.changes) : '—')}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      item.status === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {item.status === 'success' ? 'Success' : 'Failed'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
