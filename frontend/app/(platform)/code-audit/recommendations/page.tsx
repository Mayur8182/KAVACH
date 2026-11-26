'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import { codeAuditApi, CodeAuditFinding } from '@/lib/api/codeAudit';

export default function EngineeringActionPlanPage() {
  const [findings, setFindings] = useState<CodeAuditFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const ov = await codeAuditApi.getOverview();
        if (ov.latest_run?.id) {
          const list = await codeAuditApi.getFindings(ov.latest_run.id, { limit: 100 });
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Synthesizing Prioritized Engineering Roadmap...</p>
      </div>
    );
  }

  const p0 = findings.filter((f) => f.priority === 'P0');
  const p1 = findings.filter((f) => f.priority === 'P1');
  const p2 = findings.filter((f) => f.priority === 'P2');
  const p3 = findings.filter((f) => f.priority === 'P3');

  const groups = [
    {
      level: 'P0',
      label: 'Immediate Blockers (Sprint Goal)',
      containerStyle: 'border-red-200 bg-red-50/20',
      badge: 'bg-red-50 text-red-700 border-red-200',
      items: p0,
      desc: 'Architectural layering violations and silent exception swallowing.',
    },
    {
      level: 'P1',
      label: 'Urgent Refactoring (Current Iteration)',
      containerStyle: 'border-amber-200 bg-amber-50/20',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      items: p1,
      desc: 'N+1 performance loops, circular module cycles, and critical untested business logic.',
    },
    {
      level: 'P2',
      label: 'Technical Debt Cleanups (Next Iteration)',
      containerStyle: 'border-blue-200 bg-blue-50/20',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      items: p2,
      desc: 'Deeply nested control structures, large classes, and moderate maintainability risks.',
    },
    {
      level: 'P3',
      label: 'Code Polish & Hygiene (Backlog)',
      containerStyle: 'border-slate-200 bg-slate-50/40',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      items: p3,
      desc: 'Dead unused imports, missing docstrings, and minor formatting smells.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ListOrdered size={18} className="text-blue-600" />
            Engineering Action Plan (P0 – P3 Priority Matrix)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic roadmap sequencing refactoring tasks by blast radius, system stability, and engineering debt.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.level} className={`p-5 rounded-xl border ${g.containerStyle} space-y-3 shadow-xs`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${g.badge}`}>
                  {g.level}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{g.label}</h3>
                <span className="text-xs font-semibold text-slate-500">({g.items.length} items)</span>
              </div>
            </div>
            <p className="text-xs text-slate-600">{g.desc}</p>

            {g.items.length === 0 ? (
              <div className="p-4 rounded-lg bg-white border border-slate-200 text-xs text-slate-400 italic">
                Zero items pending in this priority tier.
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {g.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-4 hover:border-slate-300 shadow-2xs transition"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                        <span className="text-xs font-mono text-slate-400">[{item.rule_id}]</span>
                        <span className="text-xs text-slate-500">({item.category})</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {item.file_path}:{item.start_line || 1} &bull; Est: {item.estimated_remediation_minutes}m
                      </div>
                    </div>

                    <Link
                      href={`/code-audit/findings/${item.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 inline-flex items-center gap-1 shadow-xs transition"
                    >
                      Autofix <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
