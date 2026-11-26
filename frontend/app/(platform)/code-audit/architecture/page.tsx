'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import {
  codeAuditApi,
  CodeAuditArchitecture,
  CodeAuditFinding,
  CodeAuditOverview,
} from '@/lib/api/codeAudit';

export default function ArchitectureAuditPage() {
  const [arch, setArch] = useState<CodeAuditArchitecture | null>(null);
  const [findings, setFindings] = useState<CodeAuditFinding[]>([]);
  const [overview, setOverview] = useState<CodeAuditOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const ov = await codeAuditApi.getOverview();
        setOverview(ov);
        if (ov.latest_run?.id) {
          const [archData, findData] = await Promise.all([
            codeAuditApi.getArchitecture(ov.latest_run.id),
            codeAuditApi.getFindings(ov.latest_run.id, { category: 'ARCHITECTURE', limit: 50 }),
          ]);
          setArch(archData);
          setFindings(findData);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const archScore = overview?.category_summary?.['ARCHITECTURE'] ?? 100.0;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Computing Module Coupling & Dependency Cycles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitBranch size={18} className="text-blue-600" />
            Architecture & Modular Coupling Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dependency graph analysis, circular import cycles, coupling index, and architectural boundary violations.
          </p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-right">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Architecture Score</div>
          <div className="text-2xl font-bold text-slate-900">{archScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Circular Dependency Cycles</span>
          <div className={`text-2xl font-bold mt-1.5 ${
            (arch?.circular_dependencies.length || 0) > 0 ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {arch?.circular_dependencies.length || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Cycles cause fragile startup order and tight module coupling.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coupling Index (Edges / Nodes)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {arch?.coupling_index || 0.0}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Lower ratios indicate cleaner, decoupled module boundaries.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modular Cohesion Score</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1.5">
            {((arch?.modular_cohesion || 1.0) * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Evaluates independence of business services.
          </p>
        </div>
      </div>

      {/* Circular Dependencies Alert Card */}
      {arch && arch.circular_dependencies.length > 0 && (
        <div className="p-5 rounded-xl bg-red-50 border border-red-200 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={15} />
            Detected Circular Dependency Cycles
          </div>
          <div className="space-y-2">
            {arch.circular_dependencies.map((cycle, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-red-200 text-xs font-mono text-slate-800 shadow-xs">
                <span className="text-red-700 font-bold mr-2">Cycle #{idx + 1}:</span>
                {cycle.join(' ➔ ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Findings Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Architectural Findings ({findings.length})</h3>

        {findings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No architectural layering breaches or circular dependencies identified.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Rule</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Module Location</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(f.severity)}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{f.rule_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{f.title}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-xs">{f.file_path}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/code-audit/findings/${f.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
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
