'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Layers,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowLeft,
  ArrowRight,
  Info,
  GitPullRequest,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function CreateFeatureWizardPage() {
  const router = useRouter();

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Available existing features for dependencies selection
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  // Submitting state & Error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Information
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Code Security');
  const [module, setModule] = useState('SAST');
  const [icon, setIcon] = useState('Shield');
  const [enableFeature, setEnableFeature] = useState(true);
  const [showInUI, setShowInUI] = useState(true);

  // Step 2: Configuration
  const [defaultStatus, setDefaultStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [scope, setScope] = useState<'global' | 'per_tenant'>('per_tenant');
  const [configSchemaJson, setConfigSchemaJson] = useState(
    JSON.stringify(
      {
        scan_level: { type: 'string', default: 'standard', enum: ['fast', 'standard', 'deep'] },
        auto_fix: { type: 'boolean', default: false },
        report_format: { type: 'array', default: ['json', 'sarif', 'pdf'] },
      },
      null,
      2
    )
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [menuLocation, setMenuLocation] = useState('Security');
  const [requiresOrgSetup, setRequiresOrgSetup] = useState(false);

  // Step 3: Dependencies
  const [selectedRequiredFeatures, setSelectedRequiredFeatures] = useState<string[]>([]);
  const [externalDeps, setExternalDeps] = useState({
    git_provider: false,
    cicd_provider: false,
    cloud_provider: false,
    enterprise_sso: false,
  });

  // Step 4: Plan Availability
  const [planAvailability, setPlanAvailability] = useState<
    Record<
      string,
      {
        enabled: boolean;
        value_tier: string;
        usage_limit: number;
        custom_config_allowed: boolean;
      }
    >
  >({
    starter: { enabled: false, value_tier: 'disabled', usage_limit: 0, custom_config_allowed: false },
    pro: { enabled: true, value_tier: 'standard', usage_limit: 100, custom_config_allowed: false },
    enterprise: { enabled: true, value_tier: 'advanced', usage_limit: 1000, custom_config_allowed: true },
    custom: { enabled: true, value_tier: 'custom', usage_limit: 0, custom_config_allowed: true },
  });
  const [allowCustomLimitsPerTenant, setAllowCustomLimitsPerTenant] = useState(true);
  const [showInPlanComparison, setShowInPlanComparison] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      setLoadingFeatures(true);
      try {
        const res = await api.superadmin.listEntitlementFeatures();
        setAvailableFeatures(res.items || []);
      } catch (e) {
        console.error('Failed to load existing features for dependencies:', e);
      } finally {
        setLoadingFeatures(false);
      }
    }
    loadCatalog();
  }, []);

  // Auto-generate key from name if key hasn't been manually diverged
  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key === name.toLowerCase().replace(/[^a-z0-9_]/g, '_')) {
      setKey(val.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError('Feature Name is required.');
        return false;
      }
      if (!key.trim() || !/^[a-z0-9_]+$/.test(key.trim())) {
        setError('Feature Key is required and must only contain lowercase letters, numbers, and underscores.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      try {
        JSON.parse(configSchemaJson);
        setSchemaError(null);
        return true;
      } catch (err: any) {
        setSchemaError('Invalid JSON format: ' + err.message);
        setError('Please fix the configuration schema JSON format.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePlanToggle = (planKey: string) => {
    setPlanAvailability((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        enabled: !prev[planKey].enabled,
        value_tier: !prev[planKey].enabled ? 'standard' : 'disabled',
      },
    }));
  };

  const handlePlanTierChange = (planKey: string, tier: string) => {
    setPlanAvailability((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        value_tier: tier,
        enabled: tier !== 'disabled',
      },
    }));
  };

  const handlePlanLimitChange = (planKey: string, limit: number) => {
    setPlanAvailability((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        usage_limit: limit,
      },
    }));
  };

  const handlePlanCustomConfigToggle = (planKey: string) => {
    setPlanAvailability((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        custom_config_allowed: !prev[planKey].custom_config_allowed,
      },
    }));
  };

  const toggleRequiredFeature = (featKey: string) => {
    if (selectedRequiredFeatures.includes(featKey)) {
      setSelectedRequiredFeatures(selectedRequiredFeatures.filter((k) => k !== featKey));
    } else {
      setSelectedRequiredFeatures([...selectedRequiredFeatures, featKey]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;

    setSubmitting(true);
    setError(null);

    let parsedSchema = {};
    try {
      parsedSchema = JSON.parse(configSchemaJson);
    } catch {
      setError('Invalid configuration schema JSON.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        key: key.trim(),
        description: description.trim(),
        category,
        module,
        icon,
        status: enableFeature ? 'active' : 'disabled',
        scope,
        show_in_ui: showInUI,
        requires_org_setup: requiresOrgSetup,
        menu_location: menuLocation,
        config_schema: parsedSchema,
        default_config: { status: defaultStatus },
        dependencies: selectedRequiredFeatures,
        external_dependencies: {
          git_provider: externalDeps.git_provider,
          cicd_provider: externalDeps.cicd_provider,
          cloud_provider: externalDeps.cloud_provider,
          enterprise_sso: externalDeps.enterprise_sso,
        },
        plan_availability: planAvailability,
      };

      const result = await api.superadmin.createEntitlementFeature(payload);
      router.push(`/superadmin/entitlements/features/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create feature:', err);
      setError(err?.message || 'Failed to create feature definition in database.');
    } finally {
      setSubmitting(false);
    }
  };

  const wizardSteps = [
    { num: 1, label: 'Basic Information', sub: 'Feature name, key & category' },
    { num: 2, label: 'Configuration', sub: 'Schema, scope & UI settings' },
    { num: 3, label: 'Dependencies', sub: 'Required features & external services' },
    { num: 4, label: 'Plan Availability', sub: 'Plan tiers & configurability' },
    { num: 5, label: 'Review & Create', sub: 'Verify and create feature' },
  ];

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
            <span className="text-slate-900 font-semibold">Create Feature</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Feature</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define feature capabilities, schema rules, dependencies, and subscription plan availability.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Layout: Stepper on Left, Content on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Stepper Card */}
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Creation Steps</h2>

            <div className="space-y-4">
              {wizardSteps.map((step) => {
                const isCurrent = currentStep === step.num;
                const isComplete = currentStep > step.num;

                return (
                  <div
                    key={step.num}
                    onClick={() => {
                      if (step.num < currentStep || validateStep(currentStep)) {
                        setCurrentStep(step.num);
                      }
                    }}
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50/70 border border-blue-200'
                        : isComplete
                        ? 'hover:bg-slate-50'
                        : 'opacity-70'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isComplete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isComplete ? <Check className="w-3.5 h-3.5" /> : step.num}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-semibold ${
                          isCurrent ? 'text-blue-900 font-bold' : isComplete ? 'text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{step.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Features are created as platform records and immediately validated against cycle rules.</span>
            </div>
          </div>

          {/* Form Step Content Card */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Specify primary feature attributes and identification.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Feature Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IaC Security"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unique Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. iac_security"
                      value={key}
                      onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Machine-readable identifier used across APIs, OPA policies, and SDKs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      >
                        <option value="Code Security">Code Security</option>
                        <option value="Dependency Security">Dependency Security</option>
                        <option value="CI/CD Security">CI/CD Security</option>
                        <option value="AI & Automation">AI & Automation</option>
                        <option value="Identity & Access">Identity & Access</option>
                        <option value="Infrastructure">Infrastructure</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Module</label>
                      <input
                        type="text"
                        placeholder="e.g. SAST, AI Remediation, SSO"
                        value={module}
                        onChange={(e) => setModule(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Provide an overview of what this capability provides to customer organizations..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Icon Representation</label>
                    <select
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="Shield">Shield (Security / Protection)</option>
                      <option value="Key">Key (Secrets / Encryption)</option>
                      <option value="FileCheck">FileCheck (SCA / SBOM / Artifacts)</option>
                      <option value="GitPullRequest">GitPullRequest (PR / CI/CD Gates)</option>
                      <option value="Sparkles">Sparkles (AI / Autofix / ML)</option>
                      <option value="Lock">Lock (SSO / IAM / RBAC)</option>
                      <option value="Server">Server (Runners / Infra / Clusters)</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Enable Feature</div>
                        <div className="text-[11px] text-slate-400">
                          Activate feature for evaluation and plan configuration.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableFeature}
                        onChange={(e) => setEnableFeature(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Show in UI</div>
                        <div className="text-[11px] text-slate-400">
                          Expose feature option in tenant navigation and plan comparisons.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showInUI}
                        onChange={(e) => setShowInUI(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Configuration */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Configuration Options</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define operational configuration parameters and validation schema for this feature.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Status</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="defaultStatus"
                            checked={defaultStatus === 'enabled'}
                            onChange={() => setDefaultStatus('enabled')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="defaultStatus"
                            checked={defaultStatus === 'disabled'}
                            onChange={() => setDefaultStatus('disabled')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Disabled</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scope</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={scope === 'global'}
                            onChange={() => setScope('global')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Global</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={scope === 'per_tenant'}
                            onChange={() => setScope('per_tenant')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Per Tenant</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Configuration Schema (JSON)</label>
                      <span className="text-[10px] text-slate-400">Validated against JSON Schema spec</span>
                    </div>
                    <textarea
                      rows={8}
                      value={configSchemaJson}
                      onChange={(e) => {
                        setConfigSchemaJson(e.target.value);
                        try {
                          JSON.parse(e.target.value);
                          setSchemaError(null);
                        } catch (err: any) {
                          setSchemaError(err.message);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-900 text-slate-100 font-mono rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {schemaError && <p className="text-[11px] text-rose-500 font-medium mt-1">{schemaError}</p>}
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">UI Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Menu Location</label>
                        <select
                          value={menuLocation}
                          onChange={(e) => setMenuLocation(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        >
                          <option value="Security">Security</option>
                          <option value="Infrastructure">Infrastructure</option>
                          <option value="Compliance">Compliance</option>
                          <option value="Settings">Settings</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={requiresOrgSetup}
                            onChange={(e) => setRequiresOrgSetup(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-semibold text-slate-800">Requires Organization Setup</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Dependencies */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Feature Dependencies</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define prerequisites and third-party integrations required for this capability.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Required Features</label>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Select features that must be active for this capability to function. Cycles are automatically
                      detected and prevented.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedRequiredFeatures.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No feature dependencies selected.</span>
                      ) : (
                        selectedRequiredFeatures.map((fKey) => {
                          const feat = availableFeatures.find((f) => f.key === fKey);
                          return (
                            <span
                              key={fKey}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                            >
                              <span>{feat ? feat.name : fKey}</span>
                              <button
                                type="button"
                                onClick={() => toggleRequiredFeature(fKey)}
                                className="text-blue-500 hover:text-blue-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                      {loadingFeatures ? (
                        <div className="p-4 text-center text-xs text-slate-400">Loading features...</div>
                      ) : (
                        availableFeatures
                          .filter((f) => f.key !== key)
                          .map((f) => {
                            const isChecked = selectedRequiredFeatures.includes(f.key);
                            return (
                              <label
                                key={f.key}
                                className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleRequiredFeature(f.key)}
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
                          })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">External Dependencies</h4>
                    <p className="text-[11px] text-slate-400">
                      Toggle third-party integrations required by this feature runtime.
                    </p>

                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <GitPullRequest className="w-4 h-4 text-purple-600" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">Git Provider Integration</div>
                            <div className="text-[10px] text-slate-400">GitHub, GitLab, or Bitbucket connectivity</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={externalDeps.git_provider}
                          onChange={(e) => setExternalDeps({ ...externalDeps, git_provider: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">CI/CD Provider</div>
                            <div className="text-[10px] text-slate-400">GitHub Actions, Jenkins, or CircleCI runner</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={externalDeps.cicd_provider}
                          onChange={(e) => setExternalDeps({ ...externalDeps, cicd_provider: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-amber-600" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">Cloud Provider</div>
                            <div className="text-[10px] text-slate-400">AWS, GCP, or Azure account integration</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={externalDeps.cloud_provider}
                          onChange={(e) => setExternalDeps({ ...externalDeps, cloud_provider: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-600" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">Enterprise SSO (SAML / OIDC)</div>
                            <div className="text-[10px] text-slate-400">Okta, Azure AD, or PingFederate connector</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={externalDeps.enterprise_sso}
                          onChange={(e) => setExternalDeps({ ...externalDeps, enterprise_sso: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Plan Availability */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Plan Availability & Configurability</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select which subscription plans can access this feature and configure plan-specific limits.
                  </p>
                </div>

                <div className="space-y-4">
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
                                onChange={() => handlePlanToggle(pKey)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>

                        {/* Value Tier Row */}
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-800">Value Tier</td>
                          {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                            <td key={pKey} className="py-3 px-3 text-center">
                              <select
                                value={planAvailability[pKey]?.value_tier || 'disabled'}
                                onChange={(e) => handlePlanTierChange(pKey, e.target.value)}
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

                        {/* Usage Limit Row */}
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-800">Usage Limit</td>
                          {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                            <td key={pKey} className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={planAvailability[pKey]?.usage_limit || 0}
                                onChange={(e) => handlePlanLimitChange(pKey, parseInt(e.target.value) || 0)}
                                className="w-20 text-center text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 focus:outline-none"
                              />
                            </td>
                          ))}
                        </tr>

                        {/* Custom Config Allowed Row */}
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-800">Custom Config</td>
                          {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => (
                            <td key={pKey} className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={planAvailability[pKey]?.custom_config_allowed || false}
                                onChange={() => handlePlanCustomConfigToggle(pKey)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Feature Limits</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCustomLimitsPerTenant}
                        onChange={(e) => setAllowCustomLimitsPerTenant(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-700">Allow custom limits per tenant</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInPlanComparison}
                        onChange={(e) => setShowInPlanComparison(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-700">Show in plan comparison matrix</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Review & Create */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Review & Create Feature</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review all parameters before saving to the database and publishing to the feature registry.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Overview Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Overview</h4>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Feature Name</span>
                      <span className="font-semibold text-slate-900">{name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Key</span>
                      <span className="font-mono text-slate-900">{key}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Category</span>
                      <span className="text-slate-900">{category}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Module</span>
                      <span className="text-slate-900">{module}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Scope</span>
                      <span className="text-slate-900 capitalize">{scope.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Plan Availability Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Plan Availability</h4>
                    {['starter', 'pro', 'enterprise', 'custom'].map((pKey) => {
                      const p = planAvailability[pKey];
                      return (
                        <div key={pKey} className="flex justify-between py-1 border-b border-slate-200/60 last:border-0">
                          <span className="text-slate-500 capitalize">{pKey}</span>
                          <span
                            className={`font-semibold ${
                              p?.enabled ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {p?.enabled ? `Enabled (${p.value_tier})` : 'Disabled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Configuration & Dependencies Summary */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Dependencies & Integration Rules
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 w-36 shrink-0">Required Features:</span>
                      <span className="font-medium text-slate-900">
                        {selectedRequiredFeatures.length > 0 ? selectedRequiredFeatures.join(', ') : 'None'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 w-36 shrink-0">External Integrations:</span>
                      <span className="font-medium text-slate-900">
                        {Object.entries(externalDeps)
                          .filter(([, v]) => v)
                          .map(([k]) => k.replace('_', ' ').toUpperCase())
                          .join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Back / Next / Create */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <Link
                  href="/superadmin/entitlements/features"
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </Link>
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Feature...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create Feature</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
