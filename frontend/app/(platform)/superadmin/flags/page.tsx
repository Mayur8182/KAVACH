'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Sliders,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function FeatureFlagsPage() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getFeatureFlags()
      .then((res) => {
        if (res?.flags) {
          setFlags(res.flags);
        }
      })
      .catch((err) => setError(err.message || 'Failed to retrieve feature flags from database'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = async (flagKey: string, currentStatus: boolean) => {
    setUpdatingKey(flagKey);
    setError(null);
    const targetStatus = !currentStatus;

    // Optimistic UI update
    setFlags((prev) =>
      prev.map((f) => (f.key === flagKey ? { ...f, is_active: targetStatus } : f))
    );

    try {
      await api.superadmin.toggleFeatureFlag(flagKey, targetStatus);
    } catch (err: any) {
      // Rollback on error
      setFlags((prev) =>
        prev.map((f) => (f.key === flagKey ? { ...f, is_active: currentStatus } : f))
      );
      setError(err.message || `Failed to update feature flag ${flagKey}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Flag className="w-4 h-4" />
              <span>Platform Toggles</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Feature Flags & Rollout Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live database-persisted feature toggles from feature_catalog table. Toggling immediately updates the backend.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFlags}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Flags</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>DB Persistence: Active</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Flags Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Database Feature Catalog</h2>
            <span className="text-xs text-slate-400 font-mono">Persisted in feature_catalog table</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying feature_catalog table from database...</span>
            </div>
          ) : flags.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No feature flags found in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {flags.map((flag) => {
                const isUpdating = updatingKey === flag.key;
                return (
                  <div
                    key={flag.key}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-slate-900">{flag.name}</h3>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {flag.key}
                        </span>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {flag.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Module: {flag.module}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{flag.description}</p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(flag.key, flag.is_active)}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Persisting...
                          </span>
                        ) : flag.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active in DB
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Disabled
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
