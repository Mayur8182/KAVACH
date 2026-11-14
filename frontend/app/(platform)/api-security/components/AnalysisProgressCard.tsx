'use client';

/**
 * AnalysisProgressCard — Real-time Security Analysis Progress Card
 * Matching Screenshot 3:
 * - Header: "Analysis Progress" with percentage e.g. "72%"
 * - Horizontal sleek progress bar
 * - 4-Stage Checklist:
 *     1. Source code audit (AST) -> Completed
 *     2. Endpoint discovery -> Completed
 *     3. Vulnerability analysis -> Running...
 *     4. Attack path mapping -> Pending
 * - Live dynamic states calculated from deterministic backend scan execution
 */

import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export interface AnalysisProgressCardProps {
  progress?: number;
  status?: string;
  stepName?: string;
  className?: string;
}

export const AnalysisProgressCard: React.FC<AnalysisProgressCardProps> = ({
  progress,
  status = 'RUNNING',
  stepName = 'Vulnerability analysis',
  className = '',
}) => {
  const normStatus = (status || 'RUNNING').toUpperCase();
  const isFinished = normStatus === 'COMPLETED' || normStatus === 'FINISHED';
  const isFailed = normStatus === 'FAILED';

  // Determine stage progress and step statuses
  let calculatedPercent = typeof progress === 'number' ? progress : 72;
  let s1Status: 'completed' | 'running' | 'pending' | 'failed' = 'completed';
  let s2Status: 'completed' | 'running' | 'pending' | 'failed' = 'completed';
  let s3Status: 'completed' | 'running' | 'pending' | 'failed' = 'running';
  let s4Status: 'completed' | 'running' | 'pending' | 'failed' = 'pending';

  if (isFinished) {
    calculatedPercent = 100;
    s1Status = 'completed';
    s2Status = 'completed';
    s3Status = 'completed';
    s4Status = 'completed';
  } else if (isFailed) {
    s1Status = 'completed';
    s2Status = 'completed';
    s3Status = 'failed';
    s4Status = 'pending';
  } else if (normStatus === 'INITIALIZING' || normStatus === 'REPO_ANALYSIS') {
    calculatedPercent = 25;
    s1Status = 'running';
    s2Status = 'pending';
    s3Status = 'pending';
    s4Status = 'pending';
  } else if (normStatus === 'DISCOVERING' || normStatus === 'API_DISCOVERY') {
    calculatedPercent = 50;
    s1Status = 'completed';
    s2Status = 'running';
    s3Status = 'pending';
    s4Status = 'pending';
  } else if (normStatus === 'ANALYZING' || normStatus === 'ATTACK_PATH' || normStatus === 'FINDING_ANALYSIS') {
    calculatedPercent = 90;
    s1Status = 'completed';
    s2Status = 'completed';
    s3Status = 'completed';
    s4Status = 'running';
  } else {
    // Default running tests / vulnerability analysis (e.g. 72% matching screenshot 3)
    calculatedPercent = typeof progress === 'number' ? progress : 72;
    s1Status = 'completed';
    s2Status = 'completed';
    s3Status = 'running';
    s4Status = 'pending';
  }

  const steps = [
    { id: 'ast', title: 'Source code audit (AST)', state: s1Status },
    { id: 'discovery', title: 'Endpoint discovery', state: s2Status },
    { id: 'vuln', title: 'Vulnerability analysis', state: s3Status },
    { id: 'attack_path', title: 'Attack path mapping', state: s4Status },
  ];

  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs ${className}`}
    >
      {/* Header with Title and Percentage (Matching Screenshot 3) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Analysis Progress
        </h2>
        <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
          {calculatedPercent}%
        </span>
      </div>

      {/* Horizontal Progress Bar Track (Matching Screenshot 3) */}
      <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, calculatedPercent))}%` }}
        />
      </div>

      {/* 4-Step Checklist (Matching Screenshot 3) */}
      <div className="space-y-4">
        {steps.map((st) => {
          return (
            <div key={st.id} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-3">
                {st.state === 'completed' && (
                  <div className="w-4.5 h-4.5 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shrink-0">
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}

                {st.state === 'running' && (
                  <div className="w-4.5 h-4.5 rounded-full border-2 border-dashed border-slate-900 dark:border-white flex items-center justify-center animate-spin shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                  </div>
                )}

                {st.state === 'pending' && (
                  <div className="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-zinc-700 bg-transparent shrink-0" />
                )}

                {st.state === 'failed' && (
                  <div className="w-4.5 h-4.5 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 text-[10px] font-bold">
                    ✕
                  </div>
                )}

                <span
                  className={`text-xs font-semibold ${
                    st.state === 'running'
                      ? 'text-slate-900 dark:text-slate-100 font-bold'
                      : st.state === 'completed'
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  {st.title}
                </span>
              </div>

              <div>
                {st.state === 'completed' && (
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Completed
                  </span>
                )}
                {st.state === 'running' && (
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Running...
                  </span>
                )}
                {st.state === 'pending' && (
                  <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                    Pending
                  </span>
                )}
                {st.state === 'failed' && (
                  <span className="text-xs font-bold text-rose-600">
                    Failed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

