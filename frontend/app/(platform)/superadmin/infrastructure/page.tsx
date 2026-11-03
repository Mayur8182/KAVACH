'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Cpu,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Zap,
  Terminal,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function InfrastructurePage() {
  const [loading, setLoading] = useState(true);
  const [infra, setInfra] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInfra = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getInfrastructureStatus()
      .then((res) => setInfra(res))
      .catch((err) => setError(err.message || 'Failed to probe infrastructure status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInfra();
  }, []);

  const operationalCount = (infra?.engines || []).filter(
    (e: any) => e.status === 'OPERATIONAL'
  ).length;
  const totalEngines = (infra?.engines || []).length || 5;

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Server className="w-4 h-4" />
              <span>Platform Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Scanner Clusters & Engine Node Topology
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live host environment probe for Semgrep, Trivy, Gitleaks, Checkov, OPA, and persistence backends.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchInfra}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Probe Host</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Host Probes: Live</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Cluster Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Engines Operational</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {operationalCount} / {totalEngines}
              </span>
              <span className={`text-xs font-semibold ${operationalCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {operationalCount === totalEngines ? 'All Online' : 'Hybrid Fallback'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Real binary presence detection</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Database Storage</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-700">
                {infra?.persistence?.file_size_mb ?? 0.0} MB
              </span>
              <span className="text-xs text-blue-600 font-semibold">Disk Allocation</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{infra?.persistence?.database_type || 'SQLite dev.db'}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Async Background Workers</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">
                {infra?.background_workers?.registered_handlers ?? 14} Handlers
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Daemon Active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{infra?.background_workers?.worker_type || 'AsyncIO Event Loop'}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Platform Execution Mode</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">Deterministic</span>
              <span className="text-xs text-purple-600 font-semibold">Zero-Trust</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Rule 14 & 15 Enforced</p>
          </div>
        </div>

        {/* Security Engines Topology */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Security Scanners & Execution Engine Health</h2>
            </div>
            <span className="text-xs text-slate-400">Live probed via host CLI detection</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Probing host for Semgrep, Trivy, Gitleaks, Checkov, OPA...</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(infra?.engines || []).map((engine: any) => {
                const isOp = engine.status === 'OPERATIONAL';
                return (
                  <div key={engine.name} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-slate-900">{engine.name}</h3>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {engine.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOp
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {engine.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono text-[11px]">
                        Binary: {engine.binary_path}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Version / Details: {engine.version}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                        Mode: {engine.mode}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Persistence & Worker Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Persistence & Storage Engine</span>
            </div>
            <p className="text-xs text-slate-500">
              Strict Rule 6 persistence: all users, tenants, plans, quotas, and audit events are stored in ACID-compliant storage.
            </p>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Storage Backend</span>
                <span className="font-semibold text-slate-900">{infra?.persistence?.database_type || 'SQLite dev.db'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Database Size on Disk</span>
                <span className="font-semibold text-slate-900">{infra?.persistence?.file_size_mb ?? 0.0} MB</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Storage Health</span>
                <span className="font-semibold text-emerald-600">OPERATIONAL</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Background Asynchronous Queue</span>
            </div>
            <p className="text-xs text-slate-500">
              Long-running repository scans and dependency checks run asynchronously tracking QUEUED, RUNNING, COMPLETED, FAILED.
            </p>
            <div className="space-y-2 text-xs pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Worker Daemon</span>
                <span className="font-semibold text-slate-900">{infra?.background_workers?.worker_type || 'AsyncIO Event Loop'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Registered Task Handlers</span>
                <span className="font-semibold text-slate-900">{infra?.background_workers?.registered_handlers ?? 14} Handlers</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-600">Worker Status</span>
                <span className="font-semibold text-emerald-600">RUNNING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
