'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  RotateCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { codeAuditApi, CodeAuditRun, CodeAuditFinding } from '@/lib/api/codeAudit';

export default function CodeAuditRunDetailPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [run, setRun] = useState<CodeAuditRun | null>(null);
  const [findings, setFindings] = useState<CodeAuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRunData() {
      try {
        setLoading(true);
        const [runData, findingsData] = await Promise.all([
          codeAuditApi.getRun(runId),
          codeAuditApi.getFindings(runId, { limit: 50 }),
        ]);
        setRun(runData);
        setFindings(findingsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load run details');
      } finally {
        setLoading(false);
      }
    }
    if (runId) {
      loadRunData();
    }
  }, [runId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Audit Execution Details...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center max-w-md mx-auto my-12 shadow-sm">
        <AlertTriangle size={32} className="mx-auto text-red-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Failed to Load Run</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'Run not found'}</p>
        <Link
          href="/code-audit/runs"
          className="mt-4 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          &larr; Back to Runs History
        </Link>
      </div>
    );
  }

  const sc = run.scorecard;

  return (
    <div className="space-y-6">
      {/* Header Breadcrumb & Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/code-audit/runs" className="hover:text-slate-900 font-medium">
              Runs History
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-700">{run.id.substring(0, 8)}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Audit Run Execution Report
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-mono text-slate-700 border border-slate-200 font-semibold">
              {run.scope}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-700">Branch: {run.branch}</div>
            <div className="text-xs font-mono text-slate-400">SHA: {run.commit_sha.substring(0, 8)}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Score</span>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">
            {run.overall_score.toFixed(1)} <span className="text-xs text-slate-400 font-mono font-normal">/ 100</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-700">
            Grade: <span className="text-emerald-600 font-bold">{run.health_grade}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Findings</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{run.total_findings}</div>
          <div className="mt-2 text-xs font-semibold text-red-600">
            {run.critical_count} Critical, {run.high_count} High
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Debt</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">
            {run.total_debt_hours.toFixed(1)} <span className="text-xs text-slate-500 font-normal">hrs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            High Priority: {run.technical_debt?.high_priority_hours.toFixed(1) || 0} hrs
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Execution Duration</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {run.duration_seconds} <span className="text-xs text-slate-500 font-normal">s</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono font-medium">Status: {run.status}</div>
        </div>
      </div>

      {/* Category Scores */}
      {sc && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Category Score Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { label: 'Quality', val: sc.quality_score },
              { label: 'Architecture', val: sc.architecture_score },
              { label: 'Performance', val: sc.performance_score },
              { label: 'Testing', val: sc.testing_score },
              { label: 'Maintainability', val: sc.maintainability_score },
              { label: 'Reliability', val: sc.reliability_score },
              { label: 'Documentation', val: sc.documentation_score },
            ].map((c) => (
              <div key={c.label} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <div className="text-xs font-medium text-slate-500">{c.label}</div>
                <div className="text-lg font-extrabold text-slate-900 mt-1">{c.val.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings Preview Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Detected Findings ({findings.length})</h3>
          <Link
            href={`/code-audit/findings?run_id=${run.id}`}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            View in Findings Explorer <ChevronRight size={13} />
          </Link>
        </div>

        {findings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Zero findings detected for this scope. Codebase passed all audit rules.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Title & Rule</th>
                  <th className="py-2.5 px-3">File Location</th>
                  <th className="py-2.5 px-3">Est. Fix</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                        f.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                        f.severity === 'HIGH' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{f.category}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{f.title}</div>
                      <div className="font-mono text-xs text-slate-400">{f.rule_id}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 truncate max-w-xs">
                      {f.file_path}:{f.start_line || 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {f.estimated_remediation_minutes}m
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/code-audit/findings/${f.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
