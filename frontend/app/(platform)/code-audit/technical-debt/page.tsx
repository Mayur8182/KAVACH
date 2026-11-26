'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCw,
  Flame,
} from 'lucide-react';
import {
  codeAuditApi,
  CodeAuditTechnicalDebt,
} from '@/lib/api/codeAudit';

export default function TechnicalDebtPage() {
  const [debt, setDebt] = useState<CodeAuditTechnicalDebt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const ov = await codeAuditApi.getOverview();
        if (ov.latest_run?.id) {
          const debtData = await codeAuditApi.getTechnicalDebt(ov.latest_run.id);
          setDebt(debtData);
        }
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
        <p className="text-sm font-medium text-slate-600">Aggregating Technical Debt & Maintenance Hotspots...</p>
      </div>
    );
  }

  const totalHours = debt?.total_debt_hours || 0;
  const highPriHours = debt?.high_priority_hours || 0;
  const devDays = Math.ceil(totalHours / 8);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Technical Debt & Remediation Estimation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quantifies engineering rework hours, maintenance hotspots, and debt distribution across modules and categories.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Technical Debt</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-amber-700">{totalHours.toFixed(1)}</span>
            <span className="text-xs text-slate-500 font-medium">engineering hours</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Equivalent to ~{devDays} dedicated developer days.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High-Priority (P0/P1) Debt</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-red-700">{highPriHours.toFixed(1)}</span>
            <span className="text-xs text-slate-500 font-medium">urgent hours</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Architectural flaws, blocking calls, and swallowed exceptions.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maintenance Hotspots</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {debt?.maintenance_hotspots.length || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">complex files</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Files exhibiting overlapping complexity across multiple audit categories.
          </p>
        </div>
      </div>

      {/* Debt by Category & Module Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Debt by Audit Category</h3>
          {debt?.debt_by_category && Object.keys(debt.debt_by_category).length > 0 ? (
            <div className="space-y-2 text-xs">
              {Object.entries(debt.debt_by_category).map(([cat, hrs]) => (
                <div key={cat} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <span className="font-mono text-amber-700 font-bold">{hrs.toFixed(1)} hrs</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">Zero category debt recorded.</div>
          )}
        </div>

        {/* Module Breakdown */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Debt by Subsystem / Module</h3>
          {debt?.debt_by_module && Object.keys(debt.debt_by_module).length > 0 ? (
            <div className="space-y-2 text-xs">
              {Object.entries(debt.debt_by_module).slice(0, 7).map(([mod, hrs]) => (
                <div key={mod} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800 truncate max-w-xs">{mod}</span>
                  <span className="font-mono text-amber-700 font-bold">{hrs.toFixed(1)} hrs</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">Zero module debt recorded.</div>
          )}
        </div>
      </div>

      {/* Maintenance Hotspots Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Flame size={16} className="text-red-600" />
          Top Maintenance Hotspots (Refactoring Priorities)
        </h3>

        {!debt?.maintenance_hotspots || debt.maintenance_hotspots.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Zero files identified as high-risk maintenance hotspots.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">File Location</th>
                  <th className="py-3 px-4">Highest Severity</th>
                  <th className="py-3 px-4">Findings</th>
                  <th className="py-3 px-4">Categories Involved</th>
                  <th className="py-3 px-4 text-right">Debt Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {debt.maintenance_hotspots.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{h.file_path}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(h.highest_severity)}`}>
                        {h.highest_severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{h.findings_count}</td>
                    <td className="py-3 px-4 text-slate-600">{h.categories.join(', ')}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 font-bold">
                      {h.debt_hours.toFixed(1)}h
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
