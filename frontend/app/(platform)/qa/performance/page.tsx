'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { PerformanceTestItem } from '@/types/api/qa';
import {
  Activity,
  Plus,
  Play,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gauge,
  Zap,
  BarChart2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

export default function PerformanceTestingPage() {
  const [tests, setTests] = useState<PerformanceTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Load Tests' | 'Stress' | 'Spike Tests' | 'Endurance Tests'>('Overview');
  const [isNewTestModalOpen, setIsNewTestModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // New Test form state
  const [testName, setTestName] = useState('Payment Gateway Stress Test');
  const [testType, setTestType] = useState('Stress');
  const [virtualUsers, setVirtualUsers] = useState(2500);
  const [testDuration, setTestDuration] = useState('15m');
  const [targetEndpoint, setTargetEndpoint] = useState('https://api.nexora.internal/v1/payments/process');
  const [submitting, setSubmitting] = useState(false);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listPerformance();
      setTests(res);
    } catch (err) {
      console.error('Failed to load performance tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const handleCreateAndRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.qa.runPerformance({
        name: testName,
        type: testType,
        virtual_users: virtualUsers,
        duration: testDuration,
      });
      setIsNewTestModalOpen(false);
      fetchPerformanceData();
    } catch (err) {
      console.error('Failed to run performance test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunGeminiDiagnosis = async (test: PerformanceTestItem) => {
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.analyzeFailure({
        test_case_id: test.id,
        error_message: `Performance SLO Breach in ${test.name}: Avg Latency ${test.avg_latency_ms}ms, P95 ${test.p95_ms}ms, Error Rate ${test.error_rate}%. Virtual users: ${test.virtual_users}.`,
        stack_trace: `Target: ${test.name}\nRPS: ${test.requests_per_sec}\nP99: ${test.p99_ms}ms\nStatus: ${test.status}`,
        expected_result: 'P95 latency < 500ms, Error Rate < 0.5%',
        actual_result: `P95 latency is ${test.p95_ms}ms with error rate ${test.error_rate}% under load`,
      });
      setGeminiAnalysis({
        testName: test.name,
        diagnosis: res.root_cause,
        recommendations: res.recommended_fixes,
        prevention: res.preventive_measures,
        codeFix: res.suggested_patch,
      });
    } catch (err) {
      console.error('Gemini analysis failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (activeTab === 'Overview') return true;
    if (activeTab === 'Load Tests') return t.type.toLowerCase().includes('load');
    if (activeTab === 'Stress') return t.type.toLowerCase().includes('stress');
    if (activeTab === 'Spike Tests') return t.type.toLowerCase().includes('spike');
    if (activeTab === 'Endurance Tests') return t.type.toLowerCase().includes('endurance');
    return true;
  });

  // Calculate summary metrics
  const totalRps = tests.reduce((acc, t) => acc + (t.requests_per_sec || 0), 0);
  const avgLatency = tests.length ? Math.round(tests.reduce((acc, t) => acc + (t.avg_latency_ms || 0), 0) / tests.length) : 248;
  const avgP95 = tests.length ? Math.round(tests.reduce((acc, t) => acc + (t.p95_ms || 0), 0) / tests.length) : 612;
  const avgErrorRate = tests.length ? +(tests.reduce((acc, t) => acc + (t.error_rate || 0), 0) / tests.length).toFixed(1) : 0.8;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Performance Testing' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Performance Testing</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  k6 & Distributed Locust Engine
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Load, stress and performance analysis with real-time latency percentiles</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (tests[0]) handleRunGeminiDiagnosis(tests[0]);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Performance Advisor
              </button>
              <button
                onClick={() => setIsNewTestModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Test
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-[#E2E8F0] -mb-5">
            {(['Overview', 'Load Tests', 'Stress', 'Spike Tests', 'Endurance Tests'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Requests per second */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">Requests per second</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">{totalRps ? totalRps.toLocaleString() : '4,612'}</span>
              <span className="text-xs font-semibold text-[#059669] flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> 12%
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Aggregated system throughput</p>
          </div>

          {/* Avg Latency */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">Avg Latency</span>
              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#059669]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">{avgLatency}ms</span>
              <span className="text-xs font-semibold text-[#059669] flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> 18%
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Under peak virtual user load</p>
          </div>

          {/* P95 Latency */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">P95</span>
              <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">{avgP95}ms</span>
              <span className="text-xs font-semibold text-[#059669] flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> 5%
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">95% of requests completed faster</p>
          </div>

          {/* Error Rate */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">Error Rate</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-[#EF4444]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">{avgErrorRate}%</span>
              <span className="text-xs font-semibold text-[#059669] flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> 45%
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">HTTP 5xx & connection timeouts</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests per Second Area Chart */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Requests per Second</h3>
                <p className="text-xs text-[#64748B]">Sustained load curve over 30 min duration</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                Live Stream
              </span>
            </div>

            {/* SVG Area Chart */}
            <div className="h-52 w-full pt-4">
              <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="rpsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#E2E8F0" strokeWidth="1" />

                {/* Filled Area */}
                <path
                  d="M 0,140 Q 60,110 120,90 T 240,70 T 360,40 T 440,30 L 500,28 L 500,140 Z"
                  fill="url(#rpsAreaGrad)"
                />
                {/* Smooth Curve */}
                <path
                  d="M 0,140 Q 60,110 120,90 T 240,70 T 360,40 T 440,30 L 500,28"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                />
                {/* Data points */}
                <circle cx="120" cy="90" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="240" cy="70" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="360" cy="40" r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="440" cy="30" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] text-[#94A3B8] font-medium pt-2 border-t border-[#F1F5F9]">
              <span>00:00</span>
              <span>05:00</span>
              <span>10:00</span>
              <span>15:00</span>
              <span>20:00</span>
              <span>25:00</span>
              <span>30:00</span>
            </div>
          </div>

          {/* Response Time Multi-line Chart */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Response Time (ms)</h3>
                <p className="text-xs text-[#64748B]">Latency distribution across percentile buckets</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#2563EB]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span> P50
                </span>
                <span className="flex items-center gap-1.5 text-[#F59E0B]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> P90
                </span>
                <span className="flex items-center gap-1.5 text-[#06B6D4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span> P95
                </span>
              </div>
            </div>

            {/* SVG Lines */}
            <div className="h-52 w-full pt-4">
              <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#E2E8F0" strokeWidth="1" />

                {/* P50 line (Blue, bottom) */}
                <path
                  d="M 0,125 Q 70,122 140,118 T 280,112 T 420,115 L 500,110"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                />

                {/* P90 line (Orange, middle) */}
                <path
                  d="M 0,95 Q 80,90 160,82 T 320,85 T 440,78 L 500,75"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />

                {/* P95 line (Cyan, top) */}
                <path
                  d="M 0,65 Q 90,60 180,50 T 340,45 T 460,40 L 500,38"
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="2"
                />
              </svg>
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] text-[#94A3B8] font-medium pt-2 border-t border-[#F1F5F9]">
              <span>00:00</span>
              <span>05:00</span>
              <span>10:00</span>
              <span>15:00</span>
              <span>20:00</span>
              <span>25:00</span>
              <span>30:00</span>
            </div>
          </div>
        </div>

        {/* Recent Tests Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Recent Tests</h2>
              <p className="text-xs text-[#64748B]">Real-time execution telemetry and percentile breakdown</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPerformanceData}
                className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                title="Refresh table"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-3 px-5">Stress Tests / Name</th>
                  <th className="py-3 px-5">Environment</th>
                  <th className="py-3 px-5">Virtual Users</th>
                  <th className="py-3 px-5">Reqs/s</th>
                  <th className="py-3 px-5">Avg Latency</th>
                  <th className="py-3 px-5">P95 / P99</th>
                  <th className="py-3 px-5">Error %</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{test.name}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded bg-[#F1F5F9] text-[#475569]">
                            {test.type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-[#475569] font-medium">Staging</td>
                    <td className="py-4 px-5 font-semibold text-[#0F172A]">
                      {test.virtual_users?.toLocaleString()} users
                    </td>
                    <td className="py-4 px-5 font-semibold text-[#0F172A]">
                      {test.requests_per_sec?.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-[#475569] font-medium">{test.avg_latency_ms}ms</td>
                    <td className="py-4 px-5 text-[#64748B]">
                      <span className="font-semibold text-[#0F172A]">{test.p95_ms}ms</span> / {test.p99_ms}ms
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`font-semibold ${
                          test.error_rate > 1.0 ? 'text-[#EF4444]' : 'text-[#059669]'
                        }`}
                      >
                        {test.error_rate}%
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          test.status === 'Passed'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : test.status === 'Failed'
                            ? 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]'
                            : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                        }`}
                      >
                        {test.status === 'Passed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {test.status === 'Failed' && <XCircle className="w-3.5 h-3.5" />}
                        {test.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleRunGeminiDiagnosis(test)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Diagnose
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Performance Test Modal */}
      {isNewTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Run Performance Test</h3>
                  <p className="text-xs text-[#64748B]">Spin up distributed runner workers</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTestModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAndRunTest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Test Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="Load">Load Test</option>
                    <option value="Stress">Stress Test</option>
                    <option value="Spike">Spike Test</option>
                    <option value="Endurance">Endurance Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Duration</label>
                  <select
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="1h">1 Hour (Endurance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Virtual Users (Concurrent Clients)
                </label>
                <input
                  type="number"
                  min="50"
                  max="50000"
                  step="100"
                  value={virtualUsers}
                  onChange={(e) => setVirtualUsers(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Target Endpoint</label>
                <input
                  type="url"
                  value={targetEndpoint}
                  onChange={(e) => setTargetEndpoint(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Provisioning Cluster...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Start Test Run
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini Performance Advisor Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Performance & Bottleneck Diagnosis</h3>
                  <p className="text-xs text-[#64748B]">Autonomous root cause reasoning on p95/p99 latency regressions</p>
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
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is analyzing latency percentiles & connection pool metrics...</p>
                </div>
              ) : geminiAnalysis ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Analyzed Target</span>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5">{geminiAnalysis.testName}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-2">Root Cause Identified</h4>
                    <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-xs text-[#4C1D95] leading-relaxed">
                      {geminiAnalysis.diagnosis}
                    </div>
                  </div>

                  {geminiAnalysis.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Architectural Recommendations</h4>
                      <ul className="space-y-2">
                        {geminiAnalysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-[#475569]">
                            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {geminiAnalysis.codeFix && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Suggested Optimizations (Configuration / Query)</h4>
                      <pre className="p-4 rounded-xl bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto leading-relaxed">
                        {geminiAnalysis.codeFix}
                      </pre>
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
                Close Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
