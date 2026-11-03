'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { VisualDiffItem } from '@/types/api/qa';
import {
  Layers,
  Check,
  X,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ZoomIn,
  Sliders,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function VisualRegressionPage() {
  const [diffs, setDiffs] = useState<VisualDiffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiffId, setSelectedDiffId] = useState<string>('diff-1');
  const [activeTab, setActiveTab] = useState<'Differences' | 'Baseline' | 'Current' | 'History'>('Differences');
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState<any>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchDiffs = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listVisualDiffs();
      setDiffs(res);
      if (res.length > 0 && !selectedDiffId) {
        setSelectedDiffId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load visual diffs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiffs();
  }, []);

  const activeDiff = diffs.find((d) => d.id === selectedDiffId) || diffs[0] || {
    id: 'diff-1',
    page_name: 'Checkout page',
    baseline_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    current_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    diff_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    differences_count: 2,
    diff_percentage: 1.2,
    status: 'Pending',
    diff_regions: [
      { x: 120, y: 180, width: 220, height: 45, label: 'Primary CTA Button Padding Shift +4px' },
      { x: 380, y: 40, width: 140, height: 30, label: 'Badge color shifted from #2563EB to #1D4ED8' },
    ],
  };

  const handleApprove = async (diffId: string) => {
    try {
      await api.qa.reviewVisualDiff(diffId, 'approve');
      setActionSuccess(`Successfully approved visual snapshot for ${activeDiff.page_name}`);
      fetchDiffs();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to approve diff:', err);
    }
  };

  const handleReject = async (diffId: string) => {
    try {
      await api.qa.reviewVisualDiff(diffId, 'reject', 'Detected unintended layout shift on checkout button.');
      setActionSuccess(`Rejected snapshot change. Raised regression bug ticket.`);
      fetchDiffs();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reject diff:', err);
    }
  };

  const handleApproveAll = async () => {
    try {
      await api.qa.approveAllVisualDiffs();
      setActionSuccess(`All pending visual snapshots approved as new baselines.`);
      fetchDiffs();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to approve all:', err);
    }
  };

  const handleExplainWithGemini = async () => {
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.explainVisualDiff({
        page_name: activeDiff.page_name,
        differences_count: activeDiff.differences_count,
        bounding_boxes: activeDiff.diff_regions,
      });
      setGeminiExplanation(res);
    } catch (err) {
      console.error('Gemini diff explanation failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const totalComparisons = 1248;
  const changesDetected = diffs.filter((d) => d.differences_count > 0).length || 12;
  const approvedCount = diffs.filter((d) => d.status === 'Approved').length || 10;
  const pendingCount = diffs.filter((d) => d.status === 'Pending').length || 2;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Visual Regression' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Visual Regression</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                  Pixelmatch & Resemble.js Engine
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Detect UI changes and maintain visual pixel consistency across releases</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExplainWithGemini}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Visual Reasoner
              </button>
              <button
                onClick={handleApproveAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                Approve All
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-[#E2E8F0] -mb-5">
            {(['Differences', 'Baseline', 'Current', 'History'] as const).map((tab) => (
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
        {/* Banner if action triggered */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-medium text-[#065F46] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess(null)} className="text-[#059669] hover:text-[#065F46]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Comparisons */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Comparisons</span>
            <div className="mt-2 text-2xl font-bold text-[#0F172A]">{totalComparisons.toLocaleString()}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Rendered viewport snapshots</p>
          </div>

          {/* Changes Detected */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Changes Detected</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#EF4444]">{changesDetected}</span>
              <span className="text-xs font-semibold text-[#EF4444]">(1.0%)</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Pixel threshold mismatch &gt; 0.1%</p>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Approved</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">{approvedCount}</span>
              <span className="text-xs font-semibold text-[#059669]">(83.3%)</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Promoted to golden baselines</p>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Pending</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F59E0B]">{pendingCount}</span>
              <span className="text-xs font-semibold text-[#F59E0B]">(16.7%)</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Awaiting QA engineer review</p>
          </div>
        </div>

        {/* Main 3-View Diff Viewer & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left 3 Cols: Tri-View Visual Inspector */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">{activeDiff.page_name}</h2>
                <p className="text-xs text-[#64748B]">
                  Comparing build against master branch golden snapshot
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    activeDiff.status === 'Approved'
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                      : activeDiff.status === 'Rejected'
                      ? 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]'
                      : 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                  }`}
                >
                  {activeDiff.status}
                </span>
                <span className="text-xs text-[#64748B]">
                  {activeDiff.differences_count} difference{activeDiff.differences_count !== 1 ? 's' : ''} detected
                </span>
              </div>
            </div>

            {/* 3-View Comparison Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Baseline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                  <span>Baseline (Master)</span>
                  <span className="text-[10px] bg-[#F1F5F9] px-2 py-0.5 rounded text-[#475569]">Golden</span>
                </div>
                <div className="relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#0F172A] aspect-[4/3] flex items-center justify-center group">
                  {/* Mock snapshot view with simulated UI components */}
                  <div className="w-full h-full p-4 bg-[#1E293B] text-white flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="w-16 h-3 bg-blue-500 rounded"></div>
                      <div className="w-8 h-8 rounded-full bg-slate-600"></div>
                    </div>
                    <div className="space-y-2 my-auto">
                      <div className="w-3/4 h-4 bg-slate-300 rounded"></div>
                      <div className="w-1/2 h-3 bg-slate-500 rounded"></div>
                      <div className="w-full h-12 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                        Complete Order ($49.00)
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded"></div>
                  </div>
                  <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/70 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                    Baseline
                  </span>
                </div>
              </div>

              {/* 2. Current */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                  <span>Current (PR #492)</span>
                  <span className="text-[10px] bg-[#EFF6FF] px-2 py-0.5 rounded text-[#2563EB]">New Build</span>
                </div>
                <div className="relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#0F172A] aspect-[4/3] flex items-center justify-center group">
                  <div className="w-full h-full p-4 bg-[#1E293B] text-white flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="w-16 h-3 bg-blue-500 rounded"></div>
                      <div className="w-8 h-8 rounded-full bg-slate-600"></div>
                    </div>
                    <div className="space-y-3 my-auto">
                      <div className="w-3/4 h-4 bg-slate-300 rounded"></div>
                      <div className="w-1/2 h-3 bg-slate-500 rounded"></div>
                      {/* Changed button padding and color */}
                      <div className="w-full h-14 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs ring-2 ring-red-400">
                        Complete Order ($49.00)
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded"></div>
                  </div>
                  <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/70 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                    Current
                  </span>
                </div>
              </div>

              {/* 3. Diff Heatmap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                  <span>Diff Heatmap</span>
                  <span className="text-[10px] bg-[#FEF2F2] px-2 py-0.5 rounded text-[#EF4444] font-bold">
                    Diff Highlight
                  </span>
                </div>
                <div className="relative rounded-xl border border-[#EF4444]/40 overflow-hidden bg-[#0A0F1D] aspect-[4/3] flex items-center justify-center group">
                  <div className="w-full h-full p-4 bg-[#0B1120] text-white flex flex-col justify-between select-none opacity-80">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 opacity-30">
                      <div className="w-16 h-3 bg-slate-700 rounded"></div>
                      <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="my-auto relative">
                      {/* Heatmap difference highlights in bright red/neon */}
                      <div className="w-full h-14 border-2 border-[#EF4444] bg-[#EF4444]/20 rounded-xl flex items-center justify-center">
                        <span className="text-[11px] font-bold text-[#EF4444] animate-pulse">
                          Δ 4px Height Shift + Color Shift
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded opacity-30"></div>
                  </div>
                  <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-red-950/80 text-red-200 px-2 py-0.5 rounded border border-red-500/30">
                    Diff Mask
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions & Details Bar */}
            <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC] -mx-6 -mb-6 p-6 rounded-b-xl">
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <span className="font-semibold text-[#0F172A]">Image: 10 Nov 23</span>
                <span>•</span>
                <span className="text-[#EF4444] font-semibold">{activeDiff.differences_count} differences</span>
                <span>•</span>
                <span>Status: <strong className="text-[#0F172A]">{activeDiff.status}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExplainWithGemini}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini Explain
                </button>
                <button
                  onClick={() => handleReject(activeDiff.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#EF4444] bg-white hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject Diff
                </button>
                <button
                  onClick={() => handleApprove(activeDiff.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Diff
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Recent Comparisons List */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Recent Comparisons</h3>
              <button onClick={fetchDiffs} className="text-[#64748B] hover:text-[#0F172A]">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: 'diff-1', name: 'Checkout page', diffs: 2, status: 'Pending' },
                { id: 'diff-2', name: 'Dashboard', diffs: 0, status: 'Approved' },
                { id: 'diff-3', name: 'Login Page', diffs: 1, status: 'Approved' },
                { id: 'diff-4', name: 'Settings', diffs: 3, status: 'Pending' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDiffId(item.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedDiffId === item.id
                      ? 'border-[#2563EB] bg-[#EFF6FF]/40 ring-1 ring-[#2563EB]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#0F172A]">{item.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'Approved'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {item.diffs} difference{item.diffs !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Visual Diff Explainer Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Visual Diff Intelligence</h3>
                  <p className="text-xs text-[#64748B]">Autonomous CSS regression analysis & intentionality verification</p>
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
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is inspecting bounding boxes and pixel diff tensors...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                        AI Diff Diagnosis
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                        Unintended Layout Shift Detected
                      </span>
                    </div>
                    <p className="text-xs text-[#4C1D95] mt-2 leading-relaxed">
                      {geminiExplanation?.summary ||
                        'The primary checkout button height expanded from 48px to 56px due to Tailwind CSS padding class upgrade (py-3 to py-4). Additionally, color changed from primary brand #2563EB to #4F46E5. This shift pushes the footer disclaimer down by 8px, causing a visual overflow on mobile viewports.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                      Detected Visual Bounding Zones
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex justify-between items-center">
                        <span className="font-semibold text-[#0F172A]">Primary CTA Button Height</span>
                        <span className="font-mono text-[#EF4444]">+8px vertical expansion</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex justify-between items-center">
                        <span className="font-semibold text-[#0F172A]">Accent Hue Shift</span>
                        <span className="font-mono text-[#F59E0B]">#2563EB → #4F46E5</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                      Gemini Recommendation
                    </h4>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      If the padding adjustment was an intentional design update in Figma token sync, click <strong>Approve Diff</strong> to accept the new baseline. If unintended, reject to maintain the current golden standard.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                onClick={() => setIsGeminiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApprove(activeDiff.id);
                  setIsGeminiModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors shadow-sm"
              >
                Accept Baseline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
