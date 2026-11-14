'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Lock,
  GitBranch,
  Save,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

export interface PolicyItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: string;
  priority?: number;
  updated_at?: string;
}

export default function ApiSecurityPoliciesPage() {
  const { selectedApi } = useApiSecurity();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.apiSecurity.getPolicies(selectedApi?.id);
      if (res?.policies) {
        setPolicies(res.policies);
      }
    } catch (err: any) {
      console.error('Failed to load API policies:', err);
      setErrorMessage(err?.message || 'Failed to connect to backend policy engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [selectedApi?.id]);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    try {
      const res = await api.apiSecurity.savePolicies(policies, selectedApi?.id);
      if (res?.policies) {
        setPolicies(res.policies);
      }
      setSaveSuccess(res?.message || 'Security policies successfully persisted to PostgreSQL.');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      console.error('Failed to save policies:', err);
      setErrorMessage(err?.message || 'Failed to save policies to database');
    } finally {
      setIsSaving(false);
    }
  };

  const enabledCount = policies.filter((p) => p.enabled).length;
  const criticalCount = policies.filter((p) => p.severity?.toUpperCase() === 'CRITICAL').length;

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div className="w-full space-y-6">
        {/* Header */}
        <PageHeader
          title="Security Policies &amp; Gates"
          subtitle="Configure deterministic guardrails, CI/CD security quality gates, and automated test enforcement rules."
          breadcrumbs={[
            { label: 'API Security', href: '/api-security' },
            { label: 'Policies' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPolicies}
                disabled={isLoading || isSaving}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isLoading}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>{isSaving ? 'Persisting...' : saveSuccess ? 'Saved to DB' : 'Save Policies'}</span>
              </Button>
            </div>
          }
        />

        {/* Status Alerts */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Guardrails"
            value={policies.length}
            subtitle="Deterministic security rules"
            tone="neutral"
            icon={<Shield className="w-4 h-4 text-slate-500" />}
          />
          <MetricCard
            label="Enforced Policies"
            value={enabledCount}
            subtitle={`${policies.length - enabledCount} Currently Disabled`}
            tone={enabledCount > 0 ? 'success' : 'neutral'}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          />
          <MetricCard
            label="Critical Blockers"
            value={criticalCount}
            subtitle="Block deployments on failure"
            tone={criticalCount > 0 ? 'critical' : 'neutral'}
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          />
          <MetricCard
            label="OPA Decision Engine"
            value="Active"
            subtitle="Rego Runtime Compliance"
            tone="info"
            icon={<Lock className="w-4 h-4 text-blue-500" />}
          />
        </div>

        {/* Policies Card Container */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Policy Ruleset
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Toggle guardrails to enforce automated block gates during pull requests and CI/CD pipelines.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              {enabledCount} of {policies.length} Enforced
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-500 dark:text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-500" />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Loading Policies from PostgreSQL...
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Reading policy configuration rules for current workspace
              </p>
            </div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-zinc-400 text-xs">
              No security policies configured for this scope. Click refresh to initialize standard guardrails.
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((pol) => (
                <div
                  key={pol.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    pol.enabled
                      ? 'bg-slate-50/70 dark:bg-zinc-850/60 border-slate-200 dark:border-zinc-700'
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        pol.enabled
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {pol.name}
                        </span>
                        <SeverityBadge severity={pol.severity || 'MEDIUM'} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {pol.description}
                      </p>
                    </div>
                  </div>

                  {/* Accessible Theme-Aware Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={pol.enabled}
                      onChange={() => togglePolicy(pol.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </KavachApiLayout>
  );
}
