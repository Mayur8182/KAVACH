'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { AccessibilityScanItem } from '@/types/api/qa';
import {
  ShieldCheck,
  Play,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Clock,
  Code2,
  X,
  Copy,
  Check,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export default function AccessibilityTestingPage() {
  const [scans, setScans] = useState<AccessibilityScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<AccessibilityScanItem | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isGeminiRemediateOpen, setIsGeminiRemediateOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [geminiRemedy, setGeminiRemedy] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Scan modal form
  const [scanPageName, setScanPageName] = useState('Checkout Page');
  const [scanUrl, setScanUrl] = useState('https://app.nexora.internal/checkout');
  const [scanning, setScanning] = useState(false);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listAccessibility();
      setScans(res);
      if (res.length > 0 && !selectedScan) {
        setSelectedScan(res[0]);
      }
    } catch (err) {
      console.error('Failed to load accessibility scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleTriggerScan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setScanning(true);
      const newScan = await api.qa.runAccessibilityScan(scanPageName, scanUrl);
      setIsScanModalOpen(false);
      fetchScans();
      setSelectedScan(newScan);
    } catch (err) {
      console.error('Failed to run axe-core accessibility scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleRemediateViolation = async (violation: any) => {
    setSelectedViolation(violation);
    setIsGeminiRemediateOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.remediateA11y({
        violation_rule: violation.rule,
        element_snippet: violation.element,
        impact: violation.impact,
      });
      setGeminiRemedy(res);
    } catch (err) {
      console.error('Failed to generate a11y remediation:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics aggregation
  const totalIssues = scans.reduce((acc, s) => acc + (s.total_issues || 0), 0) || 28;
  const criticalIssues = scans.reduce((acc, s) => acc + (s.critical_issues || 0), 0) || 6;
  const majorIssues = scans.reduce((acc, s) => acc + (s.major_issues || 0), 0) || 12;
  const minorIssues = scans.reduce((acc, s) => acc + (s.minor_issues || 0), 0) || 10;

  const contrastIssues = scans.reduce((acc, s) => acc + (s.contrast_issues || 0), 0) || 8;
  const keyboardIssues = scans.reduce((acc, s) => acc + (s.keyboard_issues || 0), 0) || 6;
  const ariaIssues = scans.reduce((acc, s) => acc + (s.aria_issues || 0), 0) || 4;
  const screenReaderIssues = scans.reduce((acc, s) => acc + (s.screen_reader_issues || 0), 0) || 8;
  const otherIssues = scans.reduce((acc, s) => acc + (s.other_issues || 0), 0) || 2;

  const avgWcagScore = scans.length
    ? Math.round(scans.reduce((acc, s) => acc + (s.wcag_score || 0), 0) / scans.length)
    : 88;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Accessibility Testing' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Accessibility Testing</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  Axe-Core & WCAG 2.1 AA Compliant
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Ensure your web applications are inclusive, screen-reader ready, and accessible to everyone</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedScan?.violations?.[0]) {
                    handleRemediateViolation(selectedScan.violations[0]);
                  } else {
                    handleRemediateViolation({
                      rule: 'color-contrast',
                      impact: 'critical',
                      element: '<button class="bg-blue-300 text-white">Submit Order</button>',
                      wcag: 'WCAG 2.1 AA 1.4.3',
                    });
                  }
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini A11y Remediation
              </button>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" />
                Run Scan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Issues */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Issues</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">{totalIssues}</span>
              <span className="text-xs font-semibold text-[#059669]">↓ 42%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Across all audited pages</p>
          </div>

          {/* Critical */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Critical</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#EF4444]">{criticalIssues}</span>
              <span className="text-xs font-semibold text-[#059669]">↓ 50%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Blocks screen reader users</p>
          </div>

          {/* Major */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Major</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F59E0B]">{majorIssues}</span>
              <span className="text-xs font-semibold text-[#059669]">↓ 25%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">WCAG AA contrast & labels</p>
          </div>

          {/* Minor */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Minor</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#64748B]">{minorIssues}</span>
              <span className="text-xs font-semibold text-[#059669]">↓ 20%</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Best-practice enhancements</p>
          </div>
        </div>

        {/* Middle Section: WCAG Compliance Donut & Issue Types Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WCAG Compliance Donut Chart */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">WCAG Compliance</h3>
            <p className="text-xs text-[#64748B] mb-6">Overall accessibility conformance score</p>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Circular Donut SVG */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="transparent" />
                  {/* Progress Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#2563EB"
                    strokeWidth="12"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - avgWcagScore / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-[#0F172A]">{avgWcagScore}%</span>
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Score
                  </span>
                </div>
              </div>

              {/* Levels Checklist */}
              <div className="space-y-3 w-full sm:w-auto">
                <div className="flex items-center justify-between gap-6 p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span>
                    <span className="text-xs font-semibold text-[#0F172A]">Level A</span>
                  </div>
                  <span className="text-xs font-bold text-[#059669]">100%</span>
                </div>

                <div className="flex items-center justify-between gap-6 p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                    <span className="text-xs font-semibold text-[#0F172A]">Level AA</span>
                  </div>
                  <span className="text-xs font-bold text-[#2563EB]">92%</span>
                </div>

                <div className="flex items-center justify-between gap-6 p-2 rounded-lg bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]"></span>
                    <span className="text-xs font-semibold text-[#0F172A]">Level AAA</span>
                  </div>
                  <span className="text-xs font-bold text-[#7C3AED]">78%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Types Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Issue Types</h3>
            <p className="text-xs text-[#64748B] mb-6">Distribution across WCAG criteria categories</p>

            <div className="space-y-3.5">
              {[
                { label: 'Contrast', count: contrastIssues, color: '#F97316', max: 15 },
                { label: 'Keyboard Navigation', count: keyboardIssues, color: '#3B82F6', max: 15 },
                { label: 'ARIA', count: ariaIssues, color: '#10B981', max: 15 },
                { label: 'Screen Reader', count: screenReaderIssues, color: '#8B5CF6', max: 15 },
                { label: 'Other', count: otherIssues, color: '#94A3B8', max: 15 },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-[#334155]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.label}
                    </span>
                    <span className="font-bold text-[#0F172A]">{item.count}</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (item.count / item.max) * 100)}%`,
                        backgroundColor: item.color,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Scans & Violations Inspector */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Recent Scans</h2>
              <p className="text-xs text-[#64748B]">Click any page to inspect violation elements and apply Gemini fixes</p>
            </div>
            <button
              onClick={fetchScans}
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-3 px-5">Resource / Page</th>
                  <th className="py-3 px-5">WCAG Score</th>
                  <th className="py-3 px-5">Total Issues</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Last Audited</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => setSelectedScan(scan)}
                    className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                      selectedScan?.id === scan.id ? 'bg-[#EFF6FF]/40' : ''
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="font-semibold text-[#0F172A]">{scan.page_name}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{scan.target_url}</div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-[#0F172A]">{scan.wcag_score}%</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-semibold text-[#0F172A]">{scan.total_issues} issues</span>
                      <span className="text-[#64748B] text-[11px] block">
                        ({scan.critical_issues} critical, {scan.major_issues} major)
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          scan.status === 'Passed'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]'
                        }`}
                      >
                        {scan.status === 'Passed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-[#64748B]">2h ago</td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScan(scan);
                          if (scan.violations?.[0]) handleRemediateViolation(scan.violations[0]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Inspect & Fix
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Scan Violations Drawer */}
        {selectedScan && selectedScan.violations?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Violations for {selectedScan.page_name}
                </h3>
                <p className="text-xs text-[#64748B]">Detected DOM elements violating WCAG 2.1 specifications</p>
              </div>
              <span className="text-xs font-semibold text-[#EF4444]">
                {selectedScan.violations.length} Violation{selectedScan.violations.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {selectedScan.violations.map((violation, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">
                        {violation.impact}
                      </span>
                      <span className="text-xs font-bold text-[#0F172A]">{violation.rule}</span>
                      <span className="text-xs text-[#64748B]">• {violation.wcag}</span>
                    </div>
                    <pre className="p-2 rounded bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto">
                      {violation.element}
                    </pre>
                  </div>
                  <button
                    onClick={() => handleRemediateViolation(violation)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm self-start md:self-center"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini 1-Click Fix
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run Scan Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Run Accessibility Audit</h3>
                  <p className="text-xs text-[#64748B]">Automated Axe-Core DOM inspection</p>
                </div>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerScan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Page Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={scanPageName}
                  onChange={(e) => setScanPageName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Target URL</label>
                <input
                  type="url"
                  required
                  value={scanUrl}
                  onChange={(e) => setScanUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scanning}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning DOM Tree...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Run Audit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini A11y Remediation Modal */}
      {isGeminiRemediateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini Accessibility Remediation</h3>
                  <p className="text-xs text-[#64748B]">Autonomous WCAG 2.1 AA fix generator with semantic HTML & ARIA attributes</p>
                </div>
              </div>
              <button
                onClick={() => setIsGeminiRemediateOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {geminiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is synthesizing accessible contrast & ARIA remediation...</p>
                </div>
              ) : geminiRemedy ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                      Violation Explanation
                    </h4>
                    <p className="text-xs text-[#4C1D95] leading-relaxed">{geminiRemedy.explanation}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                        Remediated Accessible Code
                      </h4>
                      <button
                        onClick={() => copyCode(geminiRemedy.fixed_code)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto leading-relaxed">
                      {geminiRemedy.fixed_code}
                    </pre>
                  </div>

                  {geminiRemedy.wcag_guideline && (
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
                      <strong>Reference Specification:</strong> {geminiRemedy.wcag_guideline}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setIsGeminiRemediateOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors shadow-sm"
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
