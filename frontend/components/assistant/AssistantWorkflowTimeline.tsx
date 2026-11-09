'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitPullRequest,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
  Lock,
  ArrowRight,
  Bug,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export interface AgentStep {
  step_id: string;
  agent_type: string;
  tool_id: string;
  title: string;
  description: string;
  risk_level: string;
  requires_approval: boolean;
  status: 'PENDING' | 'RUNNING' | 'WAITING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  input_params?: Record<string, any>;
  output_data?: Record<string, any>;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AgentWorkflowPlan {
  plan_id: string;
  conversation_id?: string;
  project_id: string;
  user_id: string;
  repository?: string;
  branch?: string;
  goal: string;
  status: 'PLAN_CREATED' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  steps: AgentStep[];
  approval_token?: string;
  metadata?: Record<string, any>;
}

interface AssistantWorkflowTimelineProps {
  workflow: AgentWorkflowPlan;
  onWorkflowUpdated?: (updatedPlan: AgentWorkflowPlan) => void;
}

export function AssistantWorkflowTimeline({
  workflow: initialWorkflow,
  onWorkflowUpdated,
}: AssistantWorkflowTimelineProps) {
  const [workflow, setWorkflow] = useState<AgentWorkflowPlan>(initialWorkflow);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState(false);

  const steps = workflow?.steps || [];
  const step3 = steps.find((s) => s.step_id === 'step-3-remediate');
  const step4 = steps.find((s) => s.step_id === 'step-4-validate');
  const step5 = steps.find((s) => s.step_id === 'step-5-pull-request');

  const diffText = step3?.output_data?.diff || '';
  const valEvidence = step4?.output_data?.evidence || '';
  const prData = step5?.output_data;

  const handleApproveStep5 = async () => {
    if (!workflow.plan_id || !workflow.approval_token) {
      setApprovalError('No cryptographic approval token available.');
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      const res = await api.post<any>('/api/v1/assistant/workflow/approve-step', {
        plan_id: workflow.plan_id,
        step_id: 'step-5-pull-request',
        approval_token: workflow.approval_token,
      });

      if (res?.plan) {
        setWorkflow(res.plan);
        if (onWorkflowUpdated) {
          onWorkflowUpdated(res.plan);
        }
      }
    } catch (err: any) {
      setApprovalError(
        err?.response?.data?.detail || err?.message || 'Human approval verification failed.'
      );
    } finally {
      setIsApproving(false);
    }
  };

  const getStepIcon = (status: AgentStep['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
      case 'WAITING_APPROVAL':
        return <Lock className="w-4 h-4 text-amber-500" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />;
    }
  };

  const getStatusBadge = (status: AgentStep['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            PASSED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            RUNNING
          </span>
        );
      case 'WAITING_APPROVAL':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            AWAITING APPROVAL
          </span>
        );
      case 'FAILED':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
            FAILED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="w-full my-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Autonomous Security Workflow
              </span>
              <span className="text-[10px] font-medium text-slate-500 font-mono">
                {workflow.repository || 'Repository'} : {workflow.branch || 'main'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">{workflow.goal}</p>
          </div>
        </div>

        <div>
          {workflow.status === 'COMPLETED' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </span>
          ) : workflow.status === 'WAITING_APPROVAL' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Approval Required
            </span>
          ) : workflow.status === 'FAILED' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Failed
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> In Progress
            </span>
          )}
        </div>
      </div>

      {/* DAG Stepper Body */}
      <div className="p-4 space-y-3">
        {steps.map((step, idx) => (
          <div
            key={step.step_id}
            className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
              step.status === 'WAITING_APPROVAL'
                ? 'bg-amber-50/40 border-amber-200'
                : step.status === 'COMPLETED'
                ? 'bg-slate-50/50 border-slate-200'
                : step.status === 'FAILED'
                ? 'bg-red-50/40 border-red-200'
                : 'bg-white border-slate-100'
            }`}
          >
            {/* Left step index and icon */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-xs">
                {getStepIcon(step.status)}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-0.5 h-full bg-slate-200 mt-2" style={{ minHeight: '12px' }} />
              )}
            </div>

            {/* Step details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{step.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{step.tool_id}</span>
                </div>
                <div>{getStatusBadge(step.status)}</div>
              </div>

              <p className="text-[11.5px] text-slate-600 mb-2">{step.description}</p>

              {/* Step 1 Output Summary */}
              {step.step_id === 'step-1-scan' && step.output_data && (
                <div className="flex items-center gap-3 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <span>
                    Scanners:{' '}
                    <strong>{step.output_data.scanners_executed?.join(', ') || 'SAST'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Findings detected: <strong>{step.output_data.total_findings || 0}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-red-600 font-semibold">
                    {step.output_data.critical_count || 0} Critical
                  </span>
                </div>
              )}

              {/* Step 2 Output Summary */}
              {step.step_id === 'step-2-investigate' && step.output_data && (
                <div className="space-y-1 text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                      {step.output_data.cwe || 'CWE'}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {step.output_data.title || 'Security Vulnerability'}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 font-mono">
                    {step.output_data.file_path}:{step.output_data.line_number}
                  </div>
                  {step.output_data.root_cause && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      {step.output_data.root_cause}
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 Diff Viewer */}
              {step.step_id === 'step-3-remediate' && diffText && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpandedDiff(!expandedDiff)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {expandedDiff ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <Code2 className="w-3.5 h-3.5" />
                    {expandedDiff ? 'Hide Proposed Diff' : 'View Synthesized AST Patch Diff'}
                  </button>

                  {expandedDiff && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[10.5px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                      {diffText.split('\n').map((line, lIdx) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++');
                        const isRem = line.startsWith('-') && !line.startsWith('---');
                        const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');
                        return (
                          <div
                            key={lIdx}
                            className={
                              isAdd
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : isRem
                                ? 'bg-red-950/60 text-red-300'
                                : isHeader
                                ? 'text-indigo-400 font-bold'
                                : 'text-slate-300'
                            }
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  )}
                </div>
              )}

              {/* Step 4 Sandbox Validation Evidence */}
              {step.step_id === 'step-4-validate' && valEvidence && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded text-[11px] text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Sandbox Verification Passed:</strong> {valEvidence}
                  </span>
                </div>
              )}

              {/* Step 5 Human Approval Gate Action */}
              {step.step_id === 'step-5-pull-request' && (
                <div className="mt-2">
                  {step.status === 'WAITING_APPROVAL' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                        <Lock className="w-4 h-4 text-amber-600" />
                        Human-in-the-Loop Gate Required
                      </div>
                      <p className="text-[11px] text-amber-800">
                        The AST patch has been validated clean in an isolated sandbox. Explicit authorization
                        is required before pushing branch and opening a pull request on repository{' '}
                        <code className="px-1 py-0.5 bg-amber-100 rounded text-amber-900 font-mono">
                          {workflow.repository || 'repository'}
                        </code>
                        .
                      </p>

                      {approvalError && (
                        <div className="p-2 rounded bg-red-100 text-red-800 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{approvalError}</span>
                        </div>
                      )}

                      <div className="pt-1">
                        <button
                          onClick={handleApproveStep5}
                          disabled={isApproving}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Verifying Signature & Opening PR...
                            </>
                          ) : (
                            <>
                              <GitPullRequest className="w-3.5 h-3.5" />
                              Approve & Open Pull Request
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {step.status === 'COMPLETED' && prData && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-emerald-900">
                        <GitPullRequest className="w-4 h-4 text-emerald-600" />
                        <span>
                          Pull Request <strong>#{prData.pr_number || 'PR'}</strong> opened on branch{' '}
                          <code className="text-[10.5px] font-mono text-emerald-800">
                            {prData.branch || workflow.branch || 'main'}
                          </code>
                        </span>
                      </div>
                      {prData.pr_url && (
                        <a
                          href={prData.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          View PR <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {step.status === 'FAILED' && step.error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-800">
                      <strong>Failed to open PR:</strong> {step.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

