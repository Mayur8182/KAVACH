'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  RotateCw,
  ChevronRight,
} from 'lucide-react';
import { codeAuditApi, CodeAuditFinding, CodeAuditOverview } from '@/lib/api/codeAudit';

export default function TestingAuditPage() {
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
          const list = await codeAuditApi.getFindings(ov.latest_run.id, {
            category: 'TESTING',
            limit: 50,
          });
          setFindings(list);
        }
      } catch {
        setFindings([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const testScore = overview?.category_summary?.['TESTING'] ?? 100.0;

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
        <p className="text-sm font-medium text-slate-600">Evaluating Test Coverage Gaps & Assertion Quality...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-600" />
            Testing Quality & Coverage Gap Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Detects untested critical business logic modules, weak assertions (assert True), and tests without verification logic.
          </p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-right">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Testing Score</div>
          <div className="text-2xl font-bold text-slate-900">{testScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
        </div>
      </div>

      {findings.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-slate-200 shadow-xs">
          <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Robust Automated Test Coverage</h3>
          <p className="text-xs text-slate-500 mt-1">
            All critical business modules possess corresponding test suites with verified assertions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Rule</th>
                <th className="py-3 px-4">Testing Defect</th>
                <th className="py-3 px-4">Target File</th>
                <th className="py-3 px-4">Est. Fix</th>
                <th className="py-3 px-4 text-right">Action</th>
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
                  <td className="py-3 px-4 font-mono font-semibold text-amber-700">
                    {f.estimated_remediation_minutes}m
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/code-audit/findings/${f.id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      Remediate <ChevronRight size={13} />
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
