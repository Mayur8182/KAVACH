'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Shield,
  XCircle,
  Power,
  ChevronRight,
  Terminal,
  Activity,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface AgentExecution {
  id: string;
  agent_id: string;
  tenant_id: string;
  agent_name: string;
  trigger_source: string;
  status: string;
  token_usage: number;
  duration_ms: number;
  created_at: string;
}

export default function AiAgentsGovernancePage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [registry, setRegistry] = useState<any[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, registryRes, executionsRes] = await Promise.all([
        api.superadmin.getAiAgentOverview().catch(() => null),
        api.superadmin.getAiAgentRegistry().catch(() => []),
        api.superadmin.getAiAgentExecutions().catch(() => []),
      ]);

      if (overviewRes) setOverview(overviewRes);
      if (Array.isArray(registryRes)) setRegistry(registryRes);
      if (Array.isArray(executionsRes)) setExecutions(executionsRes);
    } catch (err: any) {
      console.error('Failed to query AI Agent control plane:', err);
      setError(err?.message || 'Failed to aggregate AI agent governance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentData();
  }, [fetchAgentData]);

  const handleKillExecution = async (executionId: string) => {
    if (!window.confirm(`Are you sure you want to trigger an emergency kill switch for execution ${executionId}?`)) {
      return;
    }
    setTerminatingId(executionId);
    try {
      await api.superadmin.killAgentExecution(executionId);
      toast.success('Agent Execution Terminated', {
        description: 'Session status revoked and worker signal dispatched.',
      });
      fetchAgentData();
    } catch (err: any) {
      toast.error('Termination Failed', {
        description: err?.message || 'Could not revoke agent execution session.',
      });
    } finally {
      setTerminatingId(null);
    }
  };

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <Sparkles className="w-4 h-4 text-[#0F172A]" />
              <span>Autonomous Agent Control Plane</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              AI Agents & MCP Governance
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Deterministic supervisor oversight, token consumption telemetry, and emergency execution kill switch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAgentData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Control Plane</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] rounded-lg text-xs font-semibold font-mono">
              <Shield className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>OPA Policy Guard Active</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Registered Agents</p>
            <p className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
              {loading ? '—' : overview?.registered_agents ?? registry.length}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Specialized autonomous workers</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Active Executions</p>
            <p className="text-2xl font-bold font-mono text-[#2563EB] mt-1">
              {loading ? '—' : overview?.active_executions ?? 0}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">In-flight sessions</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Completed Sessions</p>
            <p className="text-2xl font-bold font-mono text-[#16A34A] mt-1">
              {loading ? '—' : overview?.completed_executions ?? 0}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Verified deterministic tasks</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E6E1] shadow-sm">
            <p className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Tokens Consumed</p>
            <p className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
              {loading ? '—' : (overview?.token_consumption ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Provider billing telemetry</p>
          </div>
        </div>

        {/* Agent Registry Grid */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Core Autonomous Agent Fleet</h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Specialized security agents governed by MCP tool call authorization.
              </p>
            </div>
            <span className="text-xs font-mono text-[#94A3B8]">{registry.length} Agents Configured</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {registry.map((ag) => (
              <div
                key={ag.name}
                className="p-3 rounded-lg border border-[#E8E6E1] bg-[#FDFCFA] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] font-mono">{ag.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        ag.status === 'ENABLED'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {ag.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] mt-1 line-clamp-2">{ag.description}</p>
                </div>
                <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[10px] text-[#94A3B8] font-mono">
                  <span>Tools: {ag.tools?.length ?? 0}</span>
                  <span>Limits: Enforced</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live / Recent Executions Inspector with Kill Switch */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E8E6E1] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Live & Historical Execution Inspector</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Session governance records from PostgreSQL `agent_governance_sessions`.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Execution ID</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Trigger Source</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-right">Kill Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying agent executions...
                    </td>
                  </tr>
                ) : executions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[#94A3B8]">
                      No active or historical AI agent executions found.
                    </td>
                  </tr>
                ) : (
                  executions.map((ex) => {
                    const isTerminated = ex.status === 'REVOKED' || ex.status === 'TERMINATED' || ex.status === 'FAILED';
                    const isRunning = ex.status === 'RUNNING' || ex.status === 'ACTIVE';

                    return (
                      <tr key={ex.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[#0F172A]">
                          {ex.id.slice(0, 13)}...
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                          {ex.agent_name || ex.agent_id}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isRunning
                                ? 'bg-[#DBEAFE] text-[#1D4ED8] animate-pulse'
                                : isTerminated
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : 'bg-[#DCFCE7] text-[#166534]'
                            }`}
                          >
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#475569] text-[11px]">
                          {ex.trigger_source || 'SCANNER_DISPATCH'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                          {ex.token_usage ?? 0}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                          {ex.duration_ms ? `${ex.duration_ms}ms` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleKillExecution(ex.id)}
                            disabled={terminatingId === ex.id || isTerminated}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border transition-colors ${
                              isTerminated
                                ? 'border-[#E8E6E1] text-[#94A3B8] cursor-not-allowed bg-[#F8FAFC]'
                                : 'border-[#FCA5A5] text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{terminatingId === ex.id ? 'Revoking...' : isTerminated ? 'Revoked' : 'Kill Execution'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}

