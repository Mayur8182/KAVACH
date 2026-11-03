'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Key,
  Database,
  Users,
  CreditCard,
  FileCheck,
  Lock,
  Cpu,
  Workflow,
  Globe,
  Radio,
  Clock,
  Zap,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function CreatePlanWizardPage() {
  const router = useRouter();

  // Active Wizard Step (1 to 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature Catalog from server
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    key: '',
    description: '',
    plan_type: 'PAID', // PAID | TRIAL | CUSTOM
    pricing_model: 'FIXED', // FIXED | CUSTOM
    status: 'ACTIVE', // DRAFT | ACTIVE

    // Step 2: Feature Selection (dictionary: featureKey -> boolean)
    features: {} as Record<string, boolean>,

    // Step 3: Usage & Quotas
    max_repositories: 25,
    monthly_scan_minutes: 10000,
    concurrent_scans: 5,
    monthly_api_calls: 500000,
    api_rate_limit_per_minute: 1000,
    storage_limit_gb: 50,

    // Step 4: Seat Limits
    developer_seats: 25,
    admin_seats: 5,
    security_seats: 5,
    auditor_seats: 5,
    seat_counting_rule: 'ACTIVE_ONLY', // ACTIVE_ONLY | ALL_INVITED
    over_limit_behavior: 'BLOCK', // BLOCK | ALLOW_WARNING

    // Step 5: Billing & Trial
    monthly_price: 299,
    annual_price: 2990,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 14,
    is_trial_allowed: true,
    auto_renew: true,
    cancel_at_period_end: false,
    payment_provider: 'stripe',
  });

  // Fetch real feature catalog on mount
  useEffect(() => {
    let mounted = true;
    api.superadmin
      .getFeatureCatalog()
      .then((items) => {
        if (mounted && items && items.length > 0) {
          setCatalog(items);
          // Set baseline enabled features (sast, secrets, sca, sbom, pr_gates, ai_autofix)
          const initialFeatures: Record<string, boolean> = {};
          items.forEach((item) => {
            initialFeatures[item.key] = ['sast', 'secrets', 'sca', 'sbom', 'pr_security_gates', 'ai_autofix'].includes(item.key);
          });
          setFormData((prev) => ({
            ...prev,
            features: initialFeatures,
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch feature catalog:', err);
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-generate key from name if key hasn't been manually set
  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const autoKey = prev.key && prev.key !== prev.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        ? prev.key
        : val.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      return {
        ...prev,
        name: val,
        key: autoKey,
      };
    });
  };

  // Auto-calculate annual price discount
  const annualDiscountPercent =
    formData.monthly_price > 0 && formData.annual_price > 0
      ? Math.round((1 - formData.annual_price / (formData.monthly_price * 12)) * 100)
      : 0;

  const toggleFeature = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key],
      },
    }));
  };

  // Validation before proceeding
  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Plan name is required.');
        return false;
      }
      if (!formData.key.trim()) {
        setError('Plan key is required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (publishImmediate: boolean = true) => {
    setSubmitting(true);
    setError(null);
    try {
      // Collect enabled features
      const selectedFeatures = Object.keys(formData.features).filter((k) => formData.features[k]);

      const payload = {
        ...formData,
        status: publishImmediate ? 'ACTIVE' : 'DRAFT',
        features: selectedFeatures,
        discount_percent: annualDiscountPercent > 0 ? annualDiscountPercent : 0,
        changelog: `Initial plan creation via SuperAdmin Wizard`,
      };

      const res = await api.superadmin.createPlan(payload);
      if (res && res.id) {
        router.push(`/superadmin/plans/${res.id}`);
      } else {
        router.push('/superadmin/plans');
      }
    } catch (err: any) {
      console.error('Plan creation failed:', err);
      setError(err?.message || 'Failed to persist plan to database. Please check required fields.');
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Information', desc: 'Name, key & type' },
    { number: 2, title: 'Feature Selection', desc: 'Security modules' },
    { number: 3, title: 'Usage & Quotas', desc: 'Repos, scans & APIs' },
    { number: 4, title: 'Seat Limits', desc: 'Developer & admin seats' },
    { number: 5, title: 'Billing & Trial', desc: 'Pricing & trial duration' },
    { number: 6, title: 'Review & Create', desc: 'Verify and persist' },
  ];

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
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
            <span className="text-slate-900 font-semibold">Create Plan</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {currentStep === 1 && 'Create Plan — Basic Information'}
                {currentStep === 2 && 'Create Plan — Feature Selection'}
                {currentStep === 3 && 'Usage Plan — Usage & Quotas'}
                {currentStep === 4 && 'Create Plan — Seat Limits'}
                {currentStep === 5 && 'Create & Plan — Billing & Trial'}
                {currentStep === 6 && 'Review & Create'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentStep === 1 && 'Define plan identity, unique identifier, and tier type.'}
                {currentStep === 2 && 'Select which security modules are included in this plan.'}
                {currentStep === 3 && 'Configure repository, scan and api limits for this plan.'}
                {currentStep === 4 && 'Configure developer and admin seat limits.'}
                {currentStep === 5 && 'Configure pricing, billing cycle and trial options.'}
                {currentStep === 6 && 'Review plan configuration and create the plan.'}
              </p>
            </div>
            <Link
              href="/superadmin/plans"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Stepper Sidebar */}
          <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wizard Steps</h2>
            <nav className="space-y-1">
              {steps.map((s) => {
                const isActive = currentStep === s.number;
                const isPassed = currentStep > s.number;
                return (
                  <button
                    key={s.number}
                    onClick={() => {
                      if (s.number < currentStep || validateStep(currentStep)) {
                        setCurrentStep(s.number);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 pl-3'
                        : isPassed
                        ? 'text-slate-800 hover:bg-slate-50'
                        : 'text-slate-400 hover:bg-slate-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                    </div>
                    <div>
                      <span className="text-xs block leading-tight">{s.title}</span>
                      <span className="text-[10px] text-slate-400">{s.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Step Content Form */}
          <div className="lg:col-span-9 bg-white p-8 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
            {/* Error Notification */}
            {error && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Core identity parameters for licensing contracts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Plan Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pro"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Plan Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pro"
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Unique machine-readable identifier for code gates and APIs.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Short description about this plan..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Plan Type</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="plan_type"
                          value="PAID"
                          checked={formData.plan_type === 'PAID'}
                          onChange={() => setFormData({ ...formData, plan_type: 'PAID' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Paid Plan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="plan_type"
                          value="TRIAL"
                          checked={formData.plan_type === 'TRIAL'}
                          onChange={() => setFormData({ ...formData, plan_type: 'TRIAL' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Trial Plan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="plan_type"
                          value="CUSTOM"
                          checked={formData.plan_type === 'CUSTOM'}
                          onChange={() => setFormData({ ...formData, plan_type: 'CUSTOM' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Custom Tier</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Pricing Model</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="pricing_model"
                          value="FIXED"
                          checked={formData.pricing_model === 'FIXED'}
                          onChange={() => setFormData({ ...formData, pricing_model: 'FIXED' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Fixed Price</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="pricing_model"
                          value="CUSTOM"
                          checked={formData.pricing_model === 'CUSTOM'}
                          onChange={() => setFormData({ ...formData, pricing_model: 'CUSTOM' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Custom Contract</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Feature Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Feature Selection</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select which security modules are included in this plan.
                  </p>
                </div>

                {catalogLoading ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Loading authoritative feature catalog from database...
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {catalog.map((feature) => {
                      const isEnabled = !!formData.features[feature.key];
                      return (
                        <div
                          key={feature.key}
                          className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {feature.name?.[0] || 'F'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-xs">{feature.name}</span>
                                {feature.tagline && (
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    {feature.tagline}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
                                {feature.description}
                              </p>
                            </div>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleFeature(feature.key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Usage & Quotas */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Usage & Quotas</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure repository, scan and API limits for this plan.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Repository Limit</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.max_repositories}
                      onChange={(e) => setFormData({ ...formData, max_repositories: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Maximum repositories per tenant (0 for unlimited).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly Scan Minutes</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.monthly_scan_minutes}
                      onChange={(e) => setFormData({ ...formData, monthly_scan_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Concurrent Scans</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.concurrent_scans}
                      onChange={(e) => setFormData({ ...formData, concurrent_scans: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">API Calls (Monthly)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.monthly_api_calls}
                      onChange={(e) => setFormData({ ...formData, monthly_api_calls: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">API Rate Limit (per minute)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.api_rate_limit_per_minute}
                      onChange={(e) => setFormData({ ...formData, api_rate_limit_per_minute: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Storage Limit (GB)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.storage_limit_gb}
                      onChange={(e) => setFormData({ ...formData, storage_limit_gb: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Seat Limits */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Seat Limits</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure developer and admin seat limits.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Developer Seats</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.developer_seats}
                      onChange={(e) => setFormData({ ...formData, developer_seats: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Admin Seats</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.admin_seats}
                      onChange={(e) => setFormData({ ...formData, admin_seats: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Security Engineer Seats</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.security_seats}
                      onChange={(e) => setFormData({ ...formData, security_seats: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Auditor Seats</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.auditor_seats}
                      onChange={(e) => setFormData({ ...formData, auditor_seats: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Seat Counting Rules</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="seat_counting_rule"
                          value="ACTIVE_ONLY"
                          checked={formData.seat_counting_rule === 'ACTIVE_ONLY'}
                          onChange={() => setFormData({ ...formData, seat_counting_rule: 'ACTIVE_ONLY' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Count active members only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="seat_counting_rule"
                          value="ALL_INVITED"
                          checked={formData.seat_counting_rule === 'ALL_INVITED'}
                          onChange={() => setFormData({ ...formData, seat_counting_rule: 'ALL_INVITED' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Count all invited members</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Over Limit Behavior</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="over_limit_behavior"
                          value="BLOCK"
                          checked={formData.over_limit_behavior === 'BLOCK'}
                          onChange={() => setFormData({ ...formData, over_limit_behavior: 'BLOCK' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Block new invitations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="radio"
                          name="over_limit_behavior"
                          value="ALLOW_WARNING"
                          checked={formData.over_limit_behavior === 'ALLOW_WARNING'}
                          onChange={() => setFormData({ ...formData, over_limit_behavior: 'ALLOW_WARNING' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Allow with warning</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Billing & Trial */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Billing & Trial</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure pricing, billing cycle and trial options.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly Price (USD)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.monthly_price}
                      onChange={(e) => {
                        const m = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          monthly_price: m,
                          annual_price: Math.round(m * 10), // default 17% discount
                        });
                      }}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-700">Annual Price (USD)</label>
                      {annualDiscountPercent > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {annualDiscountPercent}% off
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={formData.annual_price}
                      onChange={(e) => setFormData({ ...formData, annual_price: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Billing Cycle</label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 capitalize"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Trial Duration (Days)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.trial_days}
                        onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="checkbox"
                          checked={formData.is_trial_allowed}
                          onChange={(e) => setFormData({ ...formData, is_trial_allowed: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Allow Trial for this Plan</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="checkbox"
                          checked={formData.auto_renew}
                          onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Auto-Renew Subscription</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                        <input
                          type="checkbox"
                          checked={formData.cancel_at_period_end}
                          onChange={(e) => setFormData({ ...formData, cancel_at_period_end: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>Cancel at Period End</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Payment Integration</label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                      <input
                        type="radio"
                        checked={formData.payment_provider === 'stripe'}
                        onChange={() => setFormData({ ...formData, payment_provider: 'stripe' })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium">Stripe</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Review & Create */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Review & Create</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review plan configuration and create the plan.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                      Basic Information
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-900">{formData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Key</span>
                        <span className="font-mono text-slate-700">{formData.key}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type</span>
                        <span className="capitalize text-slate-800">{formData.plan_type} Plan</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pricing Model</span>
                        <span className="capitalize text-slate-800">{formData.pricing_model}</span>
                      </div>
                      <div className="pt-2 text-[11px] text-slate-500 italic">
                        {formData.description || 'No description provided.'}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <h4 className="text-xs font-bold text-slate-900">Features</h4>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {Object.values(formData.features).filter(Boolean).length} enabled
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {Object.keys(formData.features)
                        .filter((k) => formData.features[k])
                        .map((k) => (
                          <li key={k} className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  {/* Usage & Quotas */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                      Usage & Quotas
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Repos</span>
                        <span className="font-semibold text-slate-900">
                          {formData.max_repositories === 0 ? 'Unlimited' : formData.max_repositories}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scan Minutes</span>
                        <span className="font-semibold text-slate-900">
                          {formData.monthly_scan_minutes.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Concurrent Scans</span>
                        <span className="font-semibold text-slate-900">{formData.concurrent_scans}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">API Calls</span>
                        <span className="font-semibold text-slate-900">
                          {formData.monthly_api_calls.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rate Limit</span>
                        <span className="font-semibold text-slate-900">
                          {formData.api_rate_limit_per_minute}/min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Storage</span>
                        <span className="font-semibold text-slate-900">{formData.storage_limit_gb} GB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seats */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-2">Seats</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Developer</span>
                        <span className="font-semibold text-slate-900">{formData.developer_seats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Admin</span>
                        <span className="font-semibold text-slate-900">{formData.admin_seats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Security Eng</span>
                        <span className="font-semibold text-slate-900">{formData.security_seats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Auditor</span>
                        <span className="font-semibold text-slate-900">{formData.auditor_seats}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Trial */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                      Pricing & Trial
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly</span>
                        <span className="font-bold text-slate-900">${formData.monthly_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Annual</span>
                        <span className="font-bold text-emerald-700">
                          ${formData.annual_price}{' '}
                          {annualDiscountPercent > 0 && `(${annualDiscountPercent}% off)`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trial</span>
                        <span className="font-medium text-slate-800">
                          {formData.is_trial_allowed ? `${formData.trial_days} days` : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Auto Renew</span>
                        <span className="text-slate-800">{formData.auto_renew ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <Link
                  href="/superadmin/plans"
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </Link>
              )}

              <div className="flex items-center gap-3">
                {currentStep === 1 && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || !formData.name}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 disabled:opacity-40"
                  >
                    Save Draft
                  </button>
                )}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating Plan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Create Plan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
