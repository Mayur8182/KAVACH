'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Clock, ExternalLink } from 'lucide-react';

export interface PipelineStage {
  id: string;
  name: string;
  status: 'COMPLETED' | 'COMPLETED_WITH_FINDINGS' | 'RUNNING' | 'QUEUED' | 'FAILED';
  duration?: string;
  findingsCount?: number;
  highlightText?: string;
  progressPercent?: number;
  details?: string;
}

export interface MultiStagePipelineProps {
  pipelineId?: string;
  target?: string;
  triggerInfo?: string;
  stages?: PipelineStage[];
  className?: string;
}

const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: '1',
    name: 'Static AST & SBOM Extraction',
    status: 'COMPLETED',
    duration: '1.2s',
    findingsCount: 0,
    highlightText: '0 vulnerabilities detected',
    details: 'Syft & Semgrep AST verified',
  },
  {
    id: '2',
    name: 'Dynamic DAST & Kernel Runtime Trace',
    status: 'COMPLETED_WITH_FINDINGS',
    duration: '4.8s',
    findingsCount: 3,
    highlightText: '3 Critical CVE-2024-38816',
    details: 'Stack overflow trace in http-parser',
  },
  {
    id: '3',
    name: 'Secrets & API Token Pattern Scan',
    status: 'RUNNING',
    progressPercent: 74,
    highlightText: '74% complete',
    details: 'Analyzing layer sha256:8f2a9910b...',
  },
  {
    id: '4',
    name: 'Zero-Trust Policy Enforcement (OPA Rego)',
    status: 'QUEUED',
    highlightText: 'Waiting on Stage 3',
    details: 'Gate: BLOCK_ON_CRITICAL',
  },
];

export function MultiStagePipeline({
  pipelineId = '#SC-89214',
  target = 'k8s.gcr.io/kavach/auth-broker:v2.19.4-distroless',
  triggerInfo = 'GitLab-CI #99104',
  stages = DEFAULT_STAGES,
  className = '',
}: MultiStagePipelineProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-900">
              Container Artifact Vulnerability Pipeline {pipelineId}
            </span>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
              ACTIVE TELEMETRY
            </span>
          </div>
          <div className="text-[12px] text-slate-500 font-mono mt-1">
            Target: <span className="text-slate-800">{target}</span> • Triggered by: {triggerInfo}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400">PIPELINE RUNTIME: 8.4s</span>
        </div>
      </div>

      {/* 4 Pipeline Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'COMPLETED';
          const isWithFindings = stage.status === 'COMPLETED_WITH_FINDINGS';
          const isRunning = stage.status === 'RUNNING';
          const isQueued = stage.status === 'QUEUED';
          const isFailed = stage.status === 'FAILED';

          return (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isRunning
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200 shadow-sm'
                  : isWithFindings
                  ? 'bg-rose-50/30 border-rose-200'
                  : isCompleted
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-slate-50/60 border-slate-200 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    STAGE 0{idx + 1}
                  </span>

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.2 rounded">
                      <CheckCircle2 size={11} /> PASSED
                    </span>
                  )}

                  {isWithFindings && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-1.5 py-0.2 rounded">
                      <AlertTriangle size={11} /> FINDINGS
                    </span>
                  )}

                  {isRunning && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-1.5 py-0.2 rounded">
                      <RefreshCw size={11} className="animate-spin" /> RUNNING
                    </span>
                  )}

                  {isQueued && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                      <Clock size={11} /> QUEUED
                    </span>
                  )}
                </div>

                <div className="text-[13px] font-semibold text-slate-900 leading-tight">
                  {stage.name}
                </div>

                <div className="text-[12px] font-mono mt-2">
                  {stage.highlightText && (
                    <span
                      className={`font-semibold ${
                        isWithFindings
                          ? 'text-rose-700'
                          : isCompleted
                          ? 'text-emerald-700'
                          : isRunning
                          ? 'text-blue-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.highlightText}
                    </span>
                  )}
                </div>

                {stage.details && (
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {stage.details}
                  </div>
                )}
              </div>

              {isRunning && stage.progressPercent !== undefined && (
                <div className="mt-4 pt-2">
                  <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${stage.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {stage.duration && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>TIME: {stage.duration}</span>
                  {isWithFindings && (
                    <span className="text-rose-600 font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
                      Inspect CVEs <ExternalLink size={9} />
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MultiStagePipeline;
