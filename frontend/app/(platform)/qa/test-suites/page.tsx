'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { TestSuiteItem } from '@/types/api/qa';
import {
  Boxes,
  Plus,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Search,
  RefreshCw,
  X,
  ArrowRight,
  Shield,
  Layers,
  Clock,
} from 'lucide-react';

export default function TestSuitesPage() {
  const [suites, setSuites] = useState<TestSuiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [suitePrompt, setSuitePrompt] = useState('Generate an End-to-End User Onboarding and Subscription Billing test suite with 10 test cases');
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState('Staging');
  const [submitting, setSubmitting] = useState(false);

  const fetchSuites = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listTestSuites();
      setSuites(res);
    } catch (err) {
      console.error('Failed to load test suites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuites();
  }, []);

  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.qa.createTestSuite({
        name,
        description,
        environment,
        status: 'Active',
      });
      setIsCreateModalOpen(false);
      setName('');
      setDescription('');
      fetchSuites();
    } catch (err) {
      console.error('Failed to create suite:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateWithGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiLoading(true);
    try {
      const res = await api.qa.generateTestCases({
        prompt: suitePrompt,
        suite: 'Autonomous AI Suite',
        count: 5,
      });
      setGeminiResult(res);
      fetchSuites();
    } catch (err) {
      console.error('Gemini suite generation failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const filteredSuites = suites.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalTests = suites.reduce((acc, s) => acc + (s.test_count || 0), 0);
  const avgPassRate = suites.length
    ? +(suites.reduce((acc, s) => acc + (s.pass_rate || 0), 0) / suites.length).toFixed(1)
    : 96.2;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Test Suites' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Test Suites</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  Logical Domain Groupings
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Organize, group, and execute test cases by business capability and architecture domains</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsGeminiModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Suite Synthesizer
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Test Suite
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Test Suites</span>
            <div className="mt-2 text-2xl font-bold text-[#0F172A]">{suites.length}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Domain & service clusters</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Covered Test Cases</span>
            <div className="mt-2 text-2xl font-bold text-[#2563EB]">{totalTests}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Mapped to regression suites</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Avg Suite Pass Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">{avgPassRate}%</span>
              <span className="text-xs font-semibold text-[#059669]">Healthy</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Across all environments</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Active Executions</span>
            <div className="mt-2 text-2xl font-bold text-[#7C3AED]">Ready</div>
            <p className="text-[11px] text-[#64748B] mt-1">Ready for CI/CD trigger</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search test suites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <button
            onClick={fetchSuites}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Suites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuites.map((suite) => (
            <div
              key={suite.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-sm">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] leading-snug">{suite.name}</h3>
                      <span className="text-[11px] font-mono text-[#64748B]">{suite.id}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    {suite.status}
                  </span>
                </div>

                <p className="text-xs text-[#64748B] mt-3 line-clamp-2 leading-relaxed">
                  {suite.description || 'No description provided.'}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-[#F1F5F9]">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Test Cases</span>
                    <span className="text-sm font-bold text-[#0F172A]">{suite.test_count} tests</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Pass Rate</span>
                    <span className="text-sm font-bold text-[#059669]">{suite.pass_rate}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <Link
                  href={`/qa/test-cases?suite=${encodeURIComponent(suite.name)}`}
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  View Cases <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/qa/test-runs"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3" /> Run Suite
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Suite Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Create Test Suite</h3>
                  <p className="text-xs text-[#64748B]">Group test cases into a reusable execution package</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSuite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Suite Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity & OAuth2 SSO Suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Environment Target</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                >
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Dev">Development</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the business domain, services, and regression boundaries covered by this suite..."
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                ></textarea>
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
                  {submitting ? 'Creating Suite...' : 'Create Suite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini Suite Synthesizer Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini AI Suite Synthesizer</h3>
                  <p className="text-xs text-[#64748B]">Autonomous full-suite generation from product requirements</p>
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
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Describe Application Feature or Architecture Domain
                </label>
                <textarea
                  rows={3}
                  value={suitePrompt}
                  onChange={(e) => setSuitePrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                ></textarea>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateWithGemini}
                  disabled={geminiLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {geminiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Synthesizing Suite Architecture...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Synthesize Test Suite
                    </>
                  )}
                </button>
              </div>

              {geminiResult && (
                <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                      Gemini Architectural Reasoning
                    </h4>
                    <p className="text-xs text-[#4C1D95] leading-relaxed">{geminiResult.reasoning}</p>
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                    Generated Test Cases ({geminiResult.generated_count || geminiResult.test_cases?.length})
                  </h4>
                  <div className="space-y-2">
                    {geminiResult.test_cases?.map((tc: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs flex justify-between items-center">
                        <span className="font-semibold text-[#0F172A]">{tc.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                          {tc.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
