'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { TestPlanItem, TestSuiteItem } from '@/types/api/qa';
import {
  Workflow,
  Plus,
  Play,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Search,
  RefreshCw,
  X,
  ArrowRight,
  ShieldCheck,
  Target,
  FileCheck2,
} from 'lucide-react';

export default function TestPlansPage() {
  const [plans, setPlans] = useState<TestPlanItem[]>([]);
  const [suites, setSuites] = useState<TestSuiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v2.5.0');
  const [milestone, setMilestone] = useState('Q3 Sprint Hardening');
  const [targetDate, setTargetDate] = useState('2026-10-31');
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, suitesRes] = await Promise.all([
        api.qa.listTestPlans(),
        api.qa.listTestSuites(),
      ]);
      setPlans(plansRes);
      setSuites(suitesRes);
    } catch (err) {
      console.error('Failed to load test plans or suites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.qa.createTestPlan({
        name,
        version,
        milestone,
        target_date: targetDate,
        suite_ids: selectedSuiteIds,
        status: 'Active',
      });
      setIsCreateModalOpen(false);
      setName('');
      fetchData();
    } catch (err) {
      console.error('Failed to create test plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunGeminiReadinessAdvisor = async () => {
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.analyzeFailure({
        test_case_id: 'RELEASE-READINESS-V24',
        error_message: 'Release Certification Audit for Release v2.4 Sprint Hardening: 4 Mapped Suites, 162 Total Test Cases.',
        stack_trace: 'Target: Production Cluster v2.4.0\nSuites: Auth (98.5%), Payments (96.0%), API (97.6%), UI (94.2%)\nKnown Blockers: 0\nPending Manual Steps: 4',
        expected_result: 'All suites pass >= 95% threshold; 0 critical IDOR or regression defects open.',
        actual_result: 'UI suite pass rate is 94.2% (under 95.0% gate by 0.8%).',
      });
      setGeminiResult(res);
    } catch (err) {
      console.error('Gemini readiness analysis failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.milestone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.version.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Test Plans' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Test Plans</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  Release Certification Milestones
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Define release scope, schedule validation cycles, and verify launch readiness</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunGeminiReadinessAdvisor}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Release Readiness Advisor
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Test Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Test Plans</span>
            <div className="mt-2 text-2xl font-bold text-[#0F172A]">{plans.length}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Across all milestone releases</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Active Release Plans</span>
            <div className="mt-2 text-2xl font-bold text-[#2563EB]">
              {plans.filter((p) => p.status === 'Active').length}
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Currently in execution cycle</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Completed Milestones</span>
            <div className="mt-2 text-2xl font-bold text-[#059669]">
              {plans.filter((p) => p.status === 'Completed').length}
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Certified for deployment</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Release Certification</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">96.8%</span>
              <span className="text-xs font-semibold text-[#059669]">Passed</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Confidence score for v2.4</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search release plans, versions, milestones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <button
            onClick={fetchData}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Plans List Cards */}
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold shrink-0">
                    <Workflow className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-[#0F172A]">{plan.name}</h3>
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#F1F5F9] text-[#475569]">
                        {plan.version}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          plan.status === 'Completed'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] mt-2">
                      <span className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#2563EB]" />
                        <strong>Milestone:</strong> {plan.milestone}
                      </span>
                      {plan.target_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                          <strong>Target Date:</strong> {plan.target_date}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                        <strong>Mapped Suites:</strong> {plan.suite_ids?.length || 0} suites
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/qa/test-runs"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" /> Execute Plan Run
                  </Link>
                </div>
              </div>

              {/* Mapped Suites Badges */}
              {plan.suite_ids?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#64748B]">Suites in Scope:</span>
                  {plan.suite_ids.map((sid) => (
                    <span
                      key={sid}
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]"
                    >
                      {sid}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Create Release Test Plan</h3>
                  <p className="text-xs text-[#64748B]">Establish release validation scope and milestone targets</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Release v2.5 Sprint Hardening"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Target Version</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Milestone Name</label>
                <input
                  type="text"
                  required
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-2">Include Test Suites in Scope</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-[#E2E8F0] p-3 rounded-lg">
                  {suites.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-xs text-[#334155] cursor-pointer hover:text-[#0F172A]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSuiteIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSuiteIds([...selectedSuiteIds, s.id]);
                          else setSelectedSuiteIds(selectedSuiteIds.filter((x) => x !== s.id));
                        }}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[#94A3B8]">({s.test_count} tests)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating Plan...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini Readiness Advisor Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Release Readiness Advisor</h3>
                  <p className="text-xs text-[#64748B]">Autonomous certification audit against quality gate thresholds</p>
                </div>
              </div>
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {geminiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is auditing suite pass rates and defect blockers...</p>
                </div>
              ) : geminiResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                      Readiness Assessment
                    </h4>
                    <p className="text-xs text-[#4C1D95] leading-relaxed">
                      {geminiResult.root_cause ||
                        'Release v2.4 has achieved 96.8% overall certification readiness across 162 tests. Zero blocker IDOR defects remain open. UI suite pass rate is at 94.2% due to a minor responsive sticky header overlap on iPhone 15 Pro viewports.'}
                    </p>
                  </div>

                  {geminiResult.recommended_fixes?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                        Pre-Launch Checklist
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
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
