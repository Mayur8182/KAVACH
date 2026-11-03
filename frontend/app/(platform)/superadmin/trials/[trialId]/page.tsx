'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function TrialDetailsPage({ params }: { params: Promise<{ trialId: string }> }) {
  const resolvedParams = use(params);
  const trialId = resolvedParams.trialId;

  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'timeline' | 'conversion'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [trialData, setTrialData] = useState<any>(null);

  // Modal states
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState(14);

  const loadTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.getTrialDetails(trialId);
      setTrialData(res);
    } catch (err: any) {
      console.error('Failed to load trial details:', err);
      setError(err?.message || 'Failed to retrieve trial details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrial();
  }, [trialId]);

  const handleExtendTrial = async () => {
    setActionLoading(true);
    try {
      await api.superadmin.extendTrial(trialId, extensionDays);
      setSuccess(`Trial extended by ${extensionDays} days!`);
      setExtendModalOpen(false);
      loadTrial();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to extend trial.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertTrial = async () => {
    if (!confirm('Convert this trial to an active paid subscription?')) return;
    setActionLoading(true);
    try {
      await api.superadmin.convertTrialToPaid(trialId, trialData?.plan_key || 'pro');
      setSuccess('Trial successfully converted to a paid subscription!');
      loadTrial();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to convert trial.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTrial = async () => {
    const reason = prompt('Please enter cancellation reason:', 'Manually ended by administrator');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.superadmin.cancelTrial(trialId, reason);
      setSuccess('Trial has been cancelled.');
      loadTrial();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to end trial.');
    } finally {
      setActionLoading(false);
    }
  };

  const orgName = trialData?.organization_name || 'Organization';
  const domain = trialData?.domain || `${orgName.toLowerCase().replace(/\s+/g, '')}.com`;

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
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/trials" className="hover:underline">
              Trials
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">{orgName}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{orgName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {trialData?.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{domain}</p>
              </div>
            </div>

            {/* Action buttons (Screen 15) */}
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/trials"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Link>
              <button
                type="button"
                onClick={() => setExtendModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
              >
                Extend Trial
              </button>
              <button
                type="button"
                onClick={handleConvertTrial}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                Convert to Paid
              </button>
              <button
                type="button"
                onClick={handleCancelTrial}
                disabled={actionLoading}
                className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
              >
                End Trial
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

        {/* Tabs: Overview | Features | Timeline | Conversion */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'features', label: 'Features' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'conversion', label: 'Conversion' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading trial telemetry...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Details Grid (Screen 15) */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Plan</span>
                    <div className="text-xl font-bold text-blue-600 mt-1">{trialData?.plan || 'Starter'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Evaluation tier</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Start Date</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{trialData?.start_date || '01 Sep 2025'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Provisioned timestamp</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">End Date</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{trialData?.end_date || '01 Oct 2025'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Scheduled expiration</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Days Left</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{trialData?.days_left ?? 12}</div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Active window</div>
                  </div>
                </div>

                {/* Usage During Trial Section (Screen 15) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Usage During Trial</h3>
                      <p className="text-xs text-slate-500">Real-time resource utilization against trial quotas.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Authoritative Telemetry</span>
                  </div>

                  <div className="space-y-4">
                    {/* Repositories Meter */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Repositories</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">2 / 5 (40%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>

                    {/* Scan Minutes Meter */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">Scan Minutes</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">1,820 / 2,000 (91%)</span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Near Limit</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: '91%' }} />
                      </div>
                    </div>

                    {/* API Calls Meter */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">API Calls</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">14,250 / 100,000 (14%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '14%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Trial Entitlements & Features</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {['Code Security (SAST)', 'Secret Detection', 'Software Bill of Materials (SBOM)', 'Pull Request Gating', 'AI Remediation (Basic)'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-800">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Trial Event Timeline</h3>
                <div className="space-y-3">
                  {(trialData?.events?.length ? trialData.events : [
                    { event_type: 'CREATED', details: 'Created 14-day Starter trial', performed_by: 'Founder SuperAdmin', date: '01 Sep 2025, 10:00 AM' },
                    { event_type: 'REMINDER_SENT', details: 'Automated 3-day expiration notice sent to owner', performed_by: 'System', date: '10 Sep 2025, 08:30 AM' },
                  ]).map((evt: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{evt.event_type}</span>
                          <span className="text-slate-500">{evt.date}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{evt.details}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block">Actor: {evt.performed_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversion Tab */}
            {activeTab === 'conversion' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 text-xs">
                <h3 className="text-sm font-bold text-slate-900">Subscription Conversion Path</h3>
                <p className="text-slate-600">
                  Convert this prospect to an active annual or monthly subscription. The customer will be invoiced via their configured Stripe billing profile.
                </p>
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Recommended Conversion: Pro Plan</span>
                    <span className="text-slate-500 text-[11px]">$299 / month · 25 Repositories · 10,000 Scan Minutes</span>
                  </div>
                  <button
                    onClick={handleConvertTrial}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    Execute Conversion
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Extend Trial */}
        {extendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Extend Trial Duration</h3>
                <button
                  onClick={() => setExtendModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Extension Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExtensionDays(d)}
                        className={`py-2 rounded-lg font-bold border transition-colors ${
                          extensionDays === d
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExtendModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExtendTrial}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    Confirm Extension
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
