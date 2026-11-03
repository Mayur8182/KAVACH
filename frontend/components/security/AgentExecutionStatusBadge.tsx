'use client';

import React from 'react';
import { Bot, Terminal, CheckCircle2, AlertCircle, RefreshCw, Shield, Sparkles } from 'lucide-react';

export type AgentState =
  | 'INITIALIZING'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'POLICY_BLOCKED';

export interface AgentExecutionStatusProps {
  state: AgentState;
  agentName?: string;
  thoughtSnippet?: string;
  toolCallName?: string;
  toolArgs?: string;
  stdoutPreview?: string;
  verificationNote?: string;
  className?: string;
}

export function AgentExecutionStatusBadge({
  state,
  agentName = 'Kavach Autonomous SecOps Agent',
  thoughtSnippet = 'Analyzing lateral movement vectors in container audit logs (Model: Kavach-SecLLM-v3)...',
  toolCallName = 'sandbox_remediation.isolate_host',
  toolArgs = 'ip="10.244.0.18", policy="zero-trust-quarantine"',
  stdoutPreview,
  verificationNote = 'Artifact sha256 validated against VirusTotal & MITRE ATT&CK T1059.001',
  className = '',
}: AgentExecutionStatusProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5 ${className}`}>
      {/* Header with Agent Identity and State Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-900">{agentName}</div>
            <div className="text-[10px] font-mono text-slate-400">TELEMETRY ID: AGT-99201</div>
          </div>
        </div>

        {state === 'THINKING' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            THINKING...
          </span>
        )}

        {state === 'EXECUTING_TOOL' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Terminal size={12} className="text-cyan-600" />
            TOOL EXECUTING
          </span>
        )}

        {state === 'COMPLETED' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            REASONING VERIFIED
          </span>
        )}

        {state === 'AWAITING_APPROVAL' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle size={12} className="text-amber-600" />
            APPROVAL REQUIRED
          </span>
        )}

        {state === 'FAILED' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle size={12} className="text-rose-600" />
            EXECUTION FAILED
          </span>
        )}
      </div>

      {/* Active Thought / Reasoning Step */}
      <div className="space-y-2">
        <div className="text-[12.5px] text-slate-700 leading-relaxed font-sans">
          {thoughtSnippet}
        </div>

        {/* Tool Execution Code Block */}
        {(state === 'EXECUTING_TOOL' || state === 'AWAITING_APPROVAL') && (
          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11.5px] space-y-1 shadow-inner">
            <div className="text-slate-400 text-[10px] uppercase tracking-wide">
              AUTHORIZED TOOL INVOCATION
            </div>
            <div className="text-emerald-400">
              {toolCallName}(<span className="text-amber-300">{toolArgs}</span>)
            </div>
            {stdoutPreview && (
              <div className="text-slate-400 pt-1 border-t border-slate-800 text-[10.5px]">
                stdout: {stdoutPreview}
              </div>
            )}
          </div>
        )}

        {/* Verification Note */}
        {verificationNote && (
          <div className="flex items-center gap-2 text-[11.5px] font-mono text-emerald-700 bg-emerald-50/70 border border-emerald-200 px-2.5 py-1 rounded">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>{verificationNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentExecutionStatusBadge;
