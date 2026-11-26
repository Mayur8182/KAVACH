'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  ChevronRight,
} from 'lucide-react';
import { codeAuditApi, CodeAuditRun } from '@/lib/api/codeAudit';

export default function CodeAuditRunsPage() {
  const [runs, setRuns] = useState<CodeAuditRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoading(true);
        const overview = await codeAuditApi.getOverview();
        if (overview.latest_run?.repository_id) {
          const list = await codeAuditApi.listRuns(overview.latest_run.repository_id, 30);
          setRuns(list);
        } else {
          setRuns([]);
        }
      } catch {
        setRuns([]);
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCw size={12} className="animate-spin" /> Running
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'B':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'C':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      default:
        return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Fetching Audit Execution History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            Audit Execution History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete historical record of repository audits, commit SHAs, health grades, and duration.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
          <History size={32} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Audit Executions Recorded</h3>
          <p className="text-xs text-slate-500 mt-1">
            Use the "Run Code Audit" button at the top to execute your first repository audit.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Score & Grade</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Branch & Commit</th>
                <th className="py-3 px-4">Findings</th>
                <th className="py-3 px-4">Debt (hrs)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Executed At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                  <td className="py-3 px-4 font-mono font-medium">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border mr-2 ${getGradeBadge(r.health_grade)}`}>
                      {r.health_grade}
                    </span>
                    <span className="text-slate-900 font-semibold">{r.overall_score.toFixed(1)}/100</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-xs">
                      {r.scope}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <GitBranch size={13} className="text-slate-400" />
                      {r.branch}
                    </div>
                    <div className="font-mono text-xs text-slate-400 mt-0.5">
                      {r.commit_sha.substring(0, 8)}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {r.total_findings}
                    {r.critical_count > 0 && (
                      <span className="ml-1 text-red-600 font-normal">({r.critical_count} crit)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-amber-600">
                    {r.total_debt_hours.toFixed(1)}h
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {r.duration_seconds}s
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/code-audit/runs/${r.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Inspect <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
