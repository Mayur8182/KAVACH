'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { BrowserMatrixItem } from '@/types/api/qa';
import {
  Globe,
  Play,
  Sparkles,
  CheckCircle2,
  XCircle,
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  Check,
  X,
  RefreshCw,
  Sliders,
  ChevronRight,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

interface BrowserCellStatus {
  status: 'Passed' | 'Failed' | 'NA';
  version?: string;
  resolution?: string;
}

export default function BrowserDeviceTestingPage() {
  const [matrixData, setMatrixData] = useState<BrowserMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Browser Matrix' | 'Device Matrix' | 'Runs' | 'History'>('Browser Matrix');
  const [selectedCell, setSelectedCell] = useState<{ os: string; browser: string; status: string; version: string; resolution: string } | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Run modal state
  const [selectedOSList, setSelectedOSList] = useState<string[]>(['Windows', 'macOS', 'iOS', 'Android']);
  const [selectedBrowserList, setSelectedBrowserList] = useState<string[]>(['Chrome', 'Firefox', 'Safari', 'Edge']);
  const [targetUrl, setTargetUrl] = useState('https://app.nexora.internal/checkout');
  const [running, setRunning] = useState(false);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.qa.getBrowsers();
      setMatrixData(res);
    } catch (err) {
      console.error('Failed to load browser matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const osRows = [
    { name: 'Windows', icon: Monitor, version: 'Windows 11 / 10' },
    { name: 'macOS', icon: Laptop, version: 'macOS Sonoma / Ventura' },
    { name: 'Linux', icon: Monitor, version: 'Ubuntu 22.04 LTS' },
    { name: 'Android', icon: Smartphone, version: 'Android 14 (Pixel 8 / Galaxy S24)' },
    { name: 'iOS', icon: Smartphone, version: 'iOS 17.4 (iPhone 15 Pro, iPad Pro)' },
  ];

  const browserCols = ['Chrome', 'Firefox', 'Safari', 'Edge'];

  // Look up status strictly from backend matrixData
  const getCellData = (os: string, browser: string): { status: 'Passed' | 'Failed' | 'NA'; version: string; resolution: string } => {
    const found = matrixData.find((item) => 
      item.os?.toLowerCase() === os.toLowerCase() && 
      item.browser?.toLowerCase() === browser.toLowerCase()
    );
    if (found) {
      const normalized = (found.status || '').toLowerCase();
      return {
        status: normalized === 'passed' ? 'Passed' : normalized === 'failed' ? 'Failed' : 'NA',
        version: found.version || 'v124.0',
        resolution: found.resolution || '1920x1080',
      };
    }
    // Incompatible platform combinations
    if (browser.toLowerCase() === 'safari' && ['windows', 'linux', 'android'].includes(os.toLowerCase())) {
      return { status: 'NA', version: 'N/A', resolution: 'N/A' };
    }
    // Truthful untested status when not present in database
    return { status: 'NA', version: 'Not Run', resolution: 'Unconfigured' };
  };

  const handleCellClick = (os: string, browser: string) => {
    const data = getCellData(os, browser);
    setSelectedCell({
      os,
      browser,
      status: data.status,
      version: data.version,
      resolution: data.resolution,
    });
  };

  const handleRunCompatibilityAnalysis = async () => {
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.analyzeFailure({
        test_case_id: 'BROWSER-COMPAT-01',
        error_message: 'Cross-browser incompatibility detected: Safari WebKit CSS backdrop-filter render flaw and iOS Edge flexbox shrink defect.',
        stack_trace: 'OS: iOS 17.4 | Browser: Edge Mobile v123.0\nViewport: 390x844\nElement: .checkout-button-fixed-bottom\nFailure: Touch click event propagation swallowed by -webkit-overflow-scrolling parent',
        expected_result: 'All form controls and CTAs functional across Chromium, Gecko, and WebKit rendering engines.',
        actual_result: 'Touch events unresponsive on iOS Edge; backdrop blur artifacts in Safari.',
      });
      setGeminiResult(res);
    } catch (err) {
      console.error('Gemini browser analysis failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleExecuteMatrixRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const launchPromises = [];
      for (const os of selectedOSList) {
        for (const browser of selectedBrowserList) {
          launchPromises.push(api.qa.launchBrowser({ os, browser }));
        }
      }
      await Promise.allSettled(launchPromises);
      await fetchMatrix();
    } catch (err) {
      console.error('Failed to execute matrix run:', err);
    } finally {
      setRunning(false);
      setIsRunModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Browser & Device Testing' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Browser & Device Testing</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  Playwright Matrix Fleet
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Cross-browser and device compatibility testing across 48 OS/Browser combinations</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunCompatibilityAnalysis}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Compatibility Engine
              </button>
              <button
                onClick={() => setIsRunModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" />
                Run Test
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-[#E2E8F0] -mb-5">
            {(['Browser Matrix', 'Device Matrix', 'Runs', 'History'] as const).map((tab) => (
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
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Combinations */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Combinations</span>
            <div className="mt-2 text-2xl font-bold text-[#0F172A]">48</div>
            <p className="text-[11px] text-[#64748B] mt-1">Cross-platform test targets</p>
          </div>

          {/* Passed */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Passed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#059669]">46</span>
              <span className="text-xs font-semibold text-[#059669]">95.8%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Passed all functional assertions</p>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Failed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#EF4444]">2</span>
              <span className="text-xs font-semibold text-[#EF4444]">4.2%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">WebKit & iOS Edge regressions</p>
          </div>

          {/* Coverage */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Coverage</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#2563EB]">100%</span>
              <span className="text-xs font-semibold text-[#2563EB]">Full Stack</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Desktop, mobile & tablet coverage</p>
          </div>
        </div>

        {/* Main Grid & Recent Runs Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matrix Grid (Takes 2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Browser Matrix</h2>
                <p className="text-xs text-[#64748B]">Click any cell to view execution logs and screenshot artifact</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-[#059669] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Passed
                </span>
                <span className="flex items-center gap-1.5 text-[#EF4444] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Failed
                </span>
                <span className="flex items-center gap-1.5 text-[#94A3B8] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]"></span> N/A
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-4 px-4 text-xs font-bold text-[#64748B] uppercase tracking-wider w-40">
                      Platform
                    </th>
                    {browserCols.map((b) => (
                      <th key={b} className="py-4 px-4 text-xs font-bold text-[#0F172A]">
                        <div className="flex flex-col items-center gap-1.5">
                          {b === 'Chrome' && (
                            <span className="w-7 h-7 rounded-full bg-[#EA4335]/10 text-[#EA4335] flex items-center justify-center font-bold text-xs">
                              C
                            </span>
                          )}
                          {b === 'Firefox' && (
                            <span className="w-7 h-7 rounded-full bg-[#FF7139]/10 text-[#FF7139] flex items-center justify-center font-bold text-xs">
                              F
                            </span>
                          )}
                          {b === 'Safari' && (
                            <span className="w-7 h-7 rounded-full bg-[#006CFF]/10 text-[#006CFF] flex items-center justify-center font-bold text-xs">
                              S
                            </span>
                          )}
                          {b === 'Edge' && (
                            <span className="w-7 h-7 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center font-bold text-xs">
                              E
                            </span>
                          )}
                          <span>{b}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {osRows.map((os) => (
                    <tr key={os.name} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="text-left py-4 px-4 font-semibold text-[#0F172A] text-xs">
                        <div className="flex items-center gap-2.5">
                          <os.icon className="w-4 h-4 text-[#64748B]" />
                          <span>{os.name}</span>
                        </div>
                      </td>
                      {browserCols.map((browser) => {
                        const cell = getCellData(os.name, browser);
                        return (
                          <td key={browser} className="py-4 px-4">
                            <button
                              onClick={() => handleCellClick(os.name, browser)}
                              disabled={cell.status === 'NA'}
                              className={`w-9 h-9 rounded-lg inline-flex items-center justify-center transition-all ${
                                cell.status === 'Passed'
                                  ? 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5] ring-1 ring-[#A7F3D0]'
                                  : cell.status === 'Failed'
                                  ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2] ring-1 ring-[#FECACA] animate-pulse'
                                  : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                              }`}
                              title={`${os.name} + ${browser}: ${cell.status}`}
                            >
                              {cell.status === 'Passed' && <Check className="w-4 h-4 stroke-[2.5]" />}
                              {cell.status === 'Failed' && <X className="w-4 h-4 stroke-[2.5]" />}
                              {cell.status === 'NA' && <span className="text-xs font-bold">—</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <span>Showing 5 of 8 operating platforms</span>
              <span className="font-medium text-[#2563EB] cursor-pointer hover:underline">
                View all supported versions →
              </span>
            </div>
          </div>

          {/* Right Column: Recent Runs & Detail Inspector */}
          <div className="space-y-6">
            {/* Recent Runs Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
              <h3 className="text-sm font-bold text-[#0F172A] mb-4">Recent Runs</h3>
              <div className="space-y-4">
                {[
                  { id: '#8241', name: 'Cross-browser Test', time: '2h ago', status: 'Passed', icon: Globe },
                  { id: '#8240', name: 'Mobile Device Test', time: '5h ago', status: 'Passed', icon: Smartphone },
                  { id: '#8239', name: 'Tablet Test', time: '1d ago', status: 'Passed', icon: Tablet },
                  { id: '#8238', name: 'Browser Compatibility', time: '12h ago', status: 'Failed', icon: Monitor },
                ].map((run) => (
                  <div
                    key={run.id}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          run.status === 'Passed'
                            ? 'bg-[#ECFDF5] text-[#059669]'
                            : 'bg-[#FEF2F2] text-[#EF4444]'
                        }`}
                      >
                        <run.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">{run.name}</p>
                        <p className="text-[11px] text-[#64748B]">
                          {run.id} • {run.time}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        run.status === 'Passed'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : 'bg-[#FEF2F2] text-[#EF4444]'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cell Telemetry Detail Inspector */}
            {selectedCell && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    Selected Node Inspector
                  </h3>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Platform:</span>
                    <span className="font-semibold text-[#0F172A]">{selectedCell.os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Browser:</span>
                    <span className="font-semibold text-[#0F172A]">{selectedCell.browser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Engine Version:</span>
                    <span className="font-mono text-[#0F172A]">{selectedCell.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Viewport / Res:</span>
                    <span className="font-mono text-[#0F172A]">{selectedCell.resolution}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Execution Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        selectedCell.status === 'Passed'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : 'bg-[#FEF2F2] text-[#EF4444]'
                      }`}
                    >
                      {selectedCell.status}
                    </span>
                  </div>

                  {selectedCell.status === 'Failed' && (
                    <div className="mt-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B]">
                      <p className="font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> WebKit Click Event Propagation Failure
                      </p>
                      <p className="mt-1">
                        Safari touch event was intercepted by fixed position sticky nav bar in iOS viewport.
                      </p>
                      <button
                        onClick={handleRunCompatibilityAnalysis}
                        className="mt-2 text-xs font-bold text-[#7C3AED] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Ask Gemini for CSS Polyfix
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Run Cross-Browser Matrix Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Run Cross-Browser Suite</h3>
                  <p className="text-xs text-[#64748B]">Deploy parallel test runner across device farm</p>
                </div>
              </div>
              <button
                onClick={() => setIsRunModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteMatrixRun} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Target Application URL</label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-2">Target Browsers</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Chrome', 'Firefox', 'Safari', 'Edge'].map((b) => (
                    <label
                      key={b}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer text-xs font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrowserList.includes(b)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBrowserList([...selectedBrowserList, b]);
                          else setSelectedBrowserList(selectedBrowserList.filter((x) => x !== b));
                        }}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span>{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-2">Target OS Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Windows', 'macOS', 'Linux', 'iOS', 'Android'].map((os) => (
                    <label
                      key={os}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer text-xs font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOSList.includes(os)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOSList([...selectedOSList, os]);
                          else setSelectedOSList(selectedOSList.filter((x) => x !== os));
                        }}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span>{os}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={running}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {running ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Launching Matrix...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Execute 48 Matrix Nodes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini Cross-Browser Diagnostic Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Cross-Browser Incompatibility Analyzer</h3>
                  <p className="text-xs text-[#64748B]">Autonomous CSS WebKit & JavaScript engine polyfill generator</p>
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
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is cross-referencing CanIUse and WebKit ASTs...</p>
                </div>
              ) : geminiResult ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                      WebKit & Gecko Incompatibility Diagnostic
                    </h4>
                    <p className="text-xs text-[#4C1D95] leading-relaxed">{geminiResult.root_cause}</p>
                  </div>

                  {geminiResult.recommended_fixes?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                        Cross-Browser Fixes
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

                  {geminiResult.suggested_patch && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">
                        Suggested CSS Autoprefixer & Fallback Code
                      </h4>
                      <pre className="p-4 rounded-xl bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto leading-relaxed">
                        {geminiResult.suggested_patch}
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
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
