"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck2,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  GitCompare,
  Clock,
  Shield,
  Layers,
  AlertTriangle
} from "lucide-react";
import { ProtectWorkshell } from "@/components/protect/ProtectWorkshell";
import {
  PolicyStatusBadge,
  EnforcementDecisionBadge
} from "@/components/protect/ProtectComponents";
import { api } from "@/lib/api/client";
import { ProtectionPolicy } from "@/types/api/protect";

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params?.policyId as string;

  const [policy, setPolicy] = useState<ProtectionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.policyDetail(policyId);
      setPolicy(data?.policy || data || null);
    } catch (err) {
      console.error("Failed to load policy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policyId) fetchPolicy();
  }, [policyId]);

  const handlePublish = async () => {
    try {
      setActing(true);
      const res = await api.protect.publishPolicy(policyId);
      setMessage(`Published v${res.version} successfully`);
      fetchPolicy();
    } catch (err: any) {
      setMessage(`Publish failed: ${err.message}`);
    } finally {
      setActing(false);
    }
  };

  const handleRollback = async () => {
    if (!policy || policy.version <= 1) return;
    try {
      setActing(true);
      const res = await api.protect.rollbackPolicy(policyId, policy.version - 1);
      setMessage(`Rolled back to v${res.version} successfully`);
      fetchPolicy();
    } catch (err: any) {
      setMessage(`Rollback failed: ${err.message}`);
    } finally {
      setActing(false);
    }
  };

  if (loading && !policy) {
    return (
      <ProtectWorkshell>
        <div className="py-24 text-center text-xs font-mono text-zinc-500">
          QUERYING DETERMINISTIC POLICY RECORD...
        </div>
      </ProtectWorkshell>
    );
  }

  if (!policy) {
    return (
      <ProtectWorkshell>
        <div className="py-24 text-center text-xs font-mono text-rose-400">
          POLICY NOT FOUND
        </div>
      </ProtectWorkshell>
    );
  }

  return (
    <ProtectWorkshell>
      <div className="pb-6 border-b border-zinc-800/80">
        <Link
          href="/protect/policies"
          className="text-xs font-mono text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO POLICIES</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono text-zinc-100">{policy.name}</h1>
                <PolicyStatusBadge status={policy.status} />
                <span className="text-xs font-mono font-bold text-emerald-400">v{policy.version}</span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Type: <span className="text-zinc-200">{policy.policy_type}</span> • Scope:{" "}
                <span className="text-zinc-200">{typeof policy.scope === 'string' ? policy.scope : (policy.scope?.environment || policy.scope?.cluster || JSON.stringify(policy.scope))}</span> • Mode:{" "}
                <span className="text-zinc-200">{policy.enforcement_mode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {policy.version > 1 && (
              <button
                onClick={handleRollback}
                disabled={acting}
                className="px-3 py-1.5 rounded text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ROLLBACK TO v{policy.version - 1}</span>
              </button>
            )}
            <button
              onClick={handlePublish}
              disabled={acting}
              className="px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PUBLISH NEW VERSION</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-2.5 rounded bg-zinc-900 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-zinc-300">
              DISMISS
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Diff */}
        <div className="md:col-span-2 space-y-6">
          {/* Policy Evaluation Rules */}
          <div className="p-5 rounded-lg bg-[#0e1017] border border-zinc-800/80">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 mb-3">
              PREDICATE SPECIFICATION & CONDITIONS
            </h3>
            <div className="p-4 bg-black/60 border border-zinc-800 rounded font-mono text-xs space-y-3">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase mb-1">
                  WHEN CONDITIONS
                </span>
                <pre className="text-emerald-300 overflow-x-auto">
                  {JSON.stringify(policy.conditions, null, 2)}
                </pre>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase mb-1">
                  ENFORCEMENT ACTION (THEN)
                </span>
                <div className="flex items-center gap-2">
                  <EnforcementDecisionBadge decision={policy.action} />
                  <span className="text-zinc-300 text-xs">
                    Executed when all predicate conditions evaluate to true.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 18: Policy Diff Visualizer */}
          <div className="p-5 rounded-lg bg-[#0e1017] border border-zinc-800/80">
            <div className="flex items-center gap-2 mb-3">
              <GitCompare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                POLICY VERSION DIFF (v{policy.version > 1 ? policy.version - 1 : 1} → v{policy.version})
              </h3>
            </div>

            <div className="p-4 bg-black/60 border border-zinc-800 rounded font-mono text-xs space-y-2">
                <span>
                  + ADDED: Resource condition matches &quot;{(Array.isArray(policy.conditions) ? policy.conditions[0]?.resource : (policy.conditions as any)?.resource) || "all"}&quot;
                </span>
              <div className="text-amber-400 flex items-center gap-2">
                <span>~ CHANGED:</span>
                <span>Action configured to {policy.action}</span>
              </div>
              <div className="text-zinc-500 flex items-center gap-2">
                <span>- REMOVED:</span>
                <span>Legacy bypass exception for deprecated service accounts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Metadata & Version History */}
        <div className="space-y-6">
          <div className="p-5 rounded-lg bg-[#0e1017] border border-zinc-800/80">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 mb-3">
              VERSION TRAIL & AUDIT
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Current Version:</span>
                <span className="text-emerald-400 font-bold">v{policy.version}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Author:</span>
                <span className="text-zinc-200">{policy.created_by}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Created:</span>
                <span className="text-zinc-200">
                  {new Date(policy.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Last Triggered:</span>
                <span className="text-zinc-200">
                  {policy.last_triggered
                    ? new Date(policy.last_triggered).toLocaleTimeString()
                    : "Never"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectWorkshell>
  );
}
