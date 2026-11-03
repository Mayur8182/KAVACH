'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { QualityGateItem } from '@/types/api/qa';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  GitBranch,
  Sliders,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';

export default function QualityGatesPage() {
  const [gates, setGates] = useState<QualityGateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnv, setSelectedEnv] = useState<'Staging' | 'Production'>('Production');
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  const fetchGates = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listQualityGates();
      setGates(res);
    } catch (err) {
      console.error('Failed to load quality gates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGates();
  }, []);

  const handleRunRiskEvaluation = async () => {
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.analyzeFailure({
        test_case_id: 'GATE-EVAL-PROD',
        error_message: 'CI/CD Quality Gate Evaluation for Production Release v2.4.0: 4 Passed, 1 Warning (P95 Latency 612ms > 500ms SLO).',
        stack_trace: 'Commit: 5a871e (Merge branch feat/checkout-v2)\nTarget: Production Cluster us-east-1\nRules: Pass Rate >= 95%, Blocker Bugs == 0, Coverage >= 80%, P95 <= 500ms, A11y >= 85%',
        expected_result: 'All 5 gate criteria strictly meet deployment SLA.',
        actual_result: 'P95 latency is 612ms (+112ms above threshold).',
      });
      setGeminiResult(res);
    } catch (err) {
      console.error('Gemini gate evaluation failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const allPassed = gates.every((g) => g.status === 'Passed');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Quality Gates' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Quality Gates</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  Deterministic Release Policy
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Enforce automated CI/CD deployment rules, blocking releases that violate quality thresholds</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunRiskEvaluation}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Release Risk Advisor
              </button>
              <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
                {(['Staging', 'Production'] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => setSelectedEnv(env)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      selectedEnv === env
                        ? 'bg-white text-[#0F172A] shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Gate Status Banner */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            allPassed
              ? 'bg-[#ECFDF5] border-[#A7F3D0]'
              : 'bg-[#FFFBEB] border-[#FDE68A]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                allPassed ? 'bg-[#059669] text-white' : 'bg-[#D97706] text-white'
              }`}
            >
              {allPassed ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {allPassed
                  ? `Release Gate Passed for ${selectedEnv}`
                  : `Release Gate Warning for ${selectedEnv} (Action Required)`}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {allPassed
                  ? 'All quality, performance, and security threshold criteria satisfied. Safe to promote pipeline.'
                  : '4 of 5 criteria met. Latency SLO is approaching warning boundary.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunRiskEvaluation}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm"
            >
              Analyze Bypass Risk
            </button>
          </div>
        </div>

        {/* Quality Gates Rules Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Enforced Quality Rules</h2>
              <p className="text-xs text-[#64748B]">Deterministic thresholds evaluated by GitHub Actions & GitLab CI runner</p>
            </div>
            <button
              onClick={fetchGates}
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-3 px-5">Rule Name / Category</th>
                  <th className="py-3 px-5">Required Threshold</th>
                  <th className="py-3 px-5">Current Measurement</th>
                  <th className="py-3 px-5">Evaluation Status</th>
                  <th className="py-3 px-5 text-right">Policy Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {gates.map((gate) => (
                  <tr key={gate.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{gate.name}</p>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{gate.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-[#0F172A] font-semibold">
                      {gate.threshold}
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-[#0F172A]">
                      {gate.current_value}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          gate.status === 'Passed'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : gate.status === 'Warning'
                            ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                            : 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]'
                        }`}
                      >
                        {gate.status === 'Passed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {gate.status === 'Warning' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {gate.status === 'Failed' && <XCircle className="w-3.5 h-3.5" />}
                        {gate.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded">
                        Block Merge & Deploy
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gemini Gate Evaluation Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Release Risk & Gate Advisor</h3>
                  <p className="text-xs text-[#64748B]">Autonomous deployment impact analysis & rollback risk prediction</p>
                </div>
              </div>
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {geminiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is calculating blast radius and deployment probability of error...</p>
                </div>
              ) : geminiResult ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                      Release Risk Recommendation
                    </h4>
                    <p className="text-xs text-[#4C1D95] leading-relaxed">
                      {geminiResult.root_cause ||
                        'Conditional Promotion Advised: While functional pass rate (96.8%) and zero blocker defects meet threshold criteria, P95 latency exceeds the 500ms target by 112ms. Recommend applying a canary deployment with 5% traffic split before 100% rollout.'}
                    </p>
                  </div>

                  {geminiResult.recommended_fixes?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                        Pre-Deployment Guardrails
                      </h4>
                      <ul className="space-y-2">
                        {geminiResult.recommended_fixes.map((fix: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-[#475569]">
                            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#0F172A] text-white">
                    <span className="text-[11px] font-mono text-[#94A3B8] block mb-1">OPA Rego Policy Enforcement</span>
                    <p className="text-xs font-mono text-[#34D399]">
                      default allow = false<br />
                      allow {"{"} input.pass_rate &gt;= 95; input.critical_defects == 0 {"}"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm"
              >
                Close Risk Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
