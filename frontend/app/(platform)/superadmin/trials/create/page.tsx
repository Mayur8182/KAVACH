'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function CreateTrialPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [organizationName, setOrganizationName] = useState('');
  const [planKey, setPlanKey] = useState('pro');
  const [durationDays, setDurationDays] = useState(14);
  const [autoConvert, setAutoConvert] = useState(false);
  const [sendReminders, setSendReminders] = useState(true);

  const calculateEndDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!organizationName) {
      setError('Please provide an organization name.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.superadmin.createTrial({
        organization_name: organizationName,
        plan_key: planKey,
        duration_days: durationDays,
        auto_convert: autoConvert,
        send_reminders: sendReminders,
      });

      const trialId = res.trial?.id;
      if (trialId) {
        router.push(`/superadmin/trials/${trialId}`);
      } else {
        router.push('/superadmin/trials');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create trial.');
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
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
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/trials" className="hover:underline">
              Trials
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Create Trial</span>
          </div>

          <div className="pt-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Customer Trial</h1>
            <p className="text-xs text-slate-500">Provision a high-priority enterprise trial with custom durations and quotas.</p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* 4-Step Wizard Stepper (Screen 14) */}
        <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4">
          {[
            { step: 1, label: '1. Organization' },
            { step: 2, label: '2. Plan & Duration' },
            { step: 3, label: '3. Features & Limits' },
            { step: 4, label: '4. Review & Create' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`text-left pb-2 text-xs font-bold transition-colors border-b-2 ${
                currentStep === s.step
                  ? 'border-blue-600 text-blue-600'
                  : currentStep > s.step
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Wizard Step 1: Organization */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 1: Organization Selection</h3>
              <p className="text-xs text-slate-500">Specify the target organization or prospect for this trial.</p>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wayne Enterprises, Acme Defense"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Domain</label>
                <input
                  type="text"
                  placeholder="e.g. wayne.com"
                  defaultValue={organizationName ? `${organizationName.toLowerCase().replace(/\s+/g, '')}.com` : ''}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Link
                href="/superadmin/trials"
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (!organizationName) {
                    setError('Please provide organization name.');
                    return;
                  }
                  setError(null);
                  setCurrentStep(2);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                Next: Plan & Duration
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Plan & Duration (Screen 14) */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 2: Plan Tier & Duration</h3>
              <p className="text-xs text-slate-500">Configure trial tier, expiration timing, and conversion policies.</p>
            </div>

            {/* Plan Tier Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Select Evaluation Plan</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'starter', name: 'Starter', desc: 'Basic SAST & Secret Detection' },
                  { key: 'pro', name: 'Pro', desc: 'Full Security Scanning & CI/CD Gates' },
                  { key: 'enterprise', name: 'Enterprise', desc: 'Unlimited Repositories & Dedicated Runners' },
                ].map((p) => (
                  <label
                    key={p.key}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      planKey === p.key
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      <input
                        type="radio"
                        name="planKey"
                        checked={planKey === p.key}
                        onChange={() => setPlanKey(p.key)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Trial Duration input */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trial Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 14)}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scheduled End Date</label>
                <div className="w-full text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                  {calculateEndDate(durationDays)}
                </div>
              </div>
            </div>

            {/* Toggles (Screen 14) */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Auto-convert to paid plan</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatically initiates card charge and plan transition at end of trial period.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoConvert(!autoConvert)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoConvert ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoConvert ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-900">Send trial reminder emails</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sends automated reminders 3 days and 1 day before expiration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendReminders(!sendReminders)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    sendReminders ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      sendReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                Next: Features & Limits
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3: Features & Limits */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 3: Features & Limits Preview</h3>
              <p className="text-xs text-slate-500">Quotas and feature matrix activated during this trial period.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block mb-2">Included Limits</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Repositories</span>
                  <span className="font-bold text-slate-800">{planKey === 'enterprise' ? 'Unlimited' : planKey === 'pro' ? '25' : '5'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Monthly Scan Minutes</span>
                  <span className="font-bold text-slate-800">{planKey === 'enterprise' ? '50,000' : planKey === 'pro' ? '10,000' : '2,000'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Developer Seats</span>
                  <span className="font-bold text-slate-800">{planKey === 'enterprise' ? '50' : planKey === 'pro' ? '20' : '5'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block mb-2">Active Security Modules</span>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Static Code Analysis (SAST)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Secret Detection & Token Leaks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Software Composition Analysis (SCA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pull Request Security Gates</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                Next: Review & Create
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4: Review & Create */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 4: Review & Confirm Trial</h3>
              <p className="text-xs text-slate-500">Verify trial details before creating and notifying the customer.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Organization:</span>
                  <span className="font-bold text-slate-900 text-sm">{organizationName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Plan Tier:</span>
                  <span className="font-bold text-blue-600 text-sm">{planKey.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration:</span>
                  <span className="font-semibold text-slate-800">{durationDays} Days</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expiration Date:</span>
                  <span className="font-semibold text-slate-800">{calculateEndDate(durationDays)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Auto-Convert:</span>
                  <span className="font-semibold text-slate-800">{autoConvert ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reminders:</span>
                  <span className="font-semibold text-slate-800">{sendReminders ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating Trial...
                  </>
                ) : (
                  'Create Trial'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
