'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Lock,
  Globe,
  Layers,
  Settings,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function GlobalIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = () => {
    setLoading(true);
    setError(null);
    api.superadmin.getIntegrationsStatus()
      .then((res) => {
        if (res?.integrations) {
          setIntegrations(res.integrations);
        }
      })
      .catch((err) => setError(err.message || 'Failed to check integrations status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const connectedCount = integrations.filter(
    (i) => i.status === 'CONNECTED' || i.status === 'CONFIGURED'
  ).length;

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <GitBranch className="w-4 h-4" />
              <span>Platform Connectors</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Global Platform Integrations & External Gateways
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live external connector status derived from environment variables and real cloud provider credentials.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchIntegrations}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Check Gateways</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Rule 10 Verified: {connectedCount} / {integrations.length} Connected</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Integration List */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Checking live credentials for GitHub, AWS, Slack, S3...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {integrations.map((item) => {
              const isReady = item.status === 'CONNECTED' || item.status === 'CONFIGURED';
              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isReady
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                    <div className="text-[11px] font-mono text-slate-400">Target Gateway: {item.account}</div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                      {isReady ? 'Active Credential' : 'No Secret In Env'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
