'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
  Play,
  Layers,
  Zap,
  CheckCircle2,
  Wrench,
  AlertOctagon,
  FileText,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { codeAuditApi, CodeAuditOverview } from '@/lib/api/codeAudit';

export default function CodeAuditOverviewPage() {
  const [overview, setOverview] = useState<CodeAuditOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await codeAuditApi.getOverview();
        setOverview(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Code Audit Intelligence...</p>
      </div>
    );
  }

  const latest = overview?.latest_run;
  const gradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'B':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'C':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'D':
      case 'F':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Card */}
      {!latest ? (
        <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center max-w-xl mx-auto my-12 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Code Audits Recorded Yet</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Execute your first repository audit to calculate Maintainability Index, detect circular dependencies, pinpoint N+1 bottlenecks, and estimate technical debt hours.
          </p>
          <div className="mt-5">
            <Link
              href="/code-audit/runs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Play size={14} /> View Audit Pipelines
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Health Score Card */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Score</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-4xl font-extrabold ${getScoreColor(latest.overall_score)}`}>
                    {latest.overall_score.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 100</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${gradeColor(latest.health_grade)}`}>
                  Grade: {latest.health_grade}
                </span>
                {overview?.score_delta !== null && overview?.score_delta !== undefined && (
                  <span className={`text-xs flex items-center gap-0.5 font-bold ${
                    overview.score_delta >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {overview.score_delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(overview.score_delta).toFixed(1)} pts
                  </span>
                )}
              </div>
            </div>

            {/* Total Findings Card */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Findings</span>
                <div className="text-4xl font-extrabold text-slate-900 mt-2">
                  {latest.total_findings}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 text-xs">
                <span className="text-red-600 font-semibold">{latest.critical_count} Crit</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600 font-semibold">{latest.high_count} High</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600 font-semibold">{latest.medium_count} Med</span>
              </div>
            </div>

            {/* Estimated Technical Debt */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Technical Debt</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold text-amber-600">
                    {latest.total_debt_hours.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">hours</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Rework Effort</span>
                <span className="text-slate-800 font-semibold">~{Math.ceil(latest.total_debt_hours / 8)} dev days</span>
              </div>
            </div>

            {/* Latest Run Metadata */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Run</span>
                <div className="text-sm font-bold text-slate-900 mt-2 truncate">
                  Branch: {latest.branch}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1 truncate">
                  SHA: {latest.commit_sha.substring(0, 8)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Duration: {latest.duration_seconds}s</span>
                <Link
                  href={`/code-audit/runs/${latest.id}`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-semibold"
                >
                  Inspect <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* 7 Category Health Scores Grid */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              Category Health & Quality Breakdown
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { key: 'QUALITY', label: 'Quality', icon: ShieldCheck, href: '/code-audit/code-quality' },
                { key: 'ARCHITECTURE', label: 'Architecture', icon: Layers, href: '/code-audit/architecture' },
                { key: 'PERFORMANCE', label: 'Performance', icon: Zap, href: '/code-audit/performance' },
                { key: 'TESTING', label: 'Testing', icon: CheckCircle2, href: '/code-audit/testing' },
                { key: 'MAINTAINABILITY', label: 'Maintainability', icon: Wrench, href: '/code-audit/maintainability' },
                { key: 'RELIABILITY', label: 'Reliability', icon: AlertOctagon, href: '/code-audit/reliability' },
                { key: 'DOCUMENTATION', label: 'Docs & API', icon: FileText, href: '/code-audit/settings' },
              ].map((cat) => {
                const score = overview?.category_summary?.[cat.key] ?? 100.0;
                const Icon = cat.icon;

                return (
                  <Link
                    key={cat.key}
                    href={cat.href}
                    className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between text-slate-500 group-hover:text-slate-900">
                      <Icon size={16} />
                      <span className="text-xs font-semibold text-slate-400">20%</span>
                    </div>
                    <div className="mt-3">
                      <div className={`text-xl font-bold ${getScoreColor(score)}`}>
                        {score.toFixed(1)}
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                        {cat.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/code-audit/findings"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">Explore All Findings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Filter by severity, category, priority, and examine line-by-line evidence.
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>

            <Link
              href="/code-audit/technical-debt"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">Technical Debt Hotspots</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Identify high-maintenance modules and calculate refactoring hour allocations.
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>

            <Link
              href="/code-audit/recommendations"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">Engineering Action Plan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Prioritized P0–P3 roadmap to eliminate architectural debt and code smells.
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
