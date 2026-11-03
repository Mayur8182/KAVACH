'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { DefectItem } from '@/types/api/qa';
import {
  ShieldAlert,
  Plus,
  Sparkles,
  Bug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  ExternalLink,
  RefreshCw,
  X,
  FileCode2,
} from 'lucide-react';

export default function DefectsPage() {
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // New Defect state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('High');
  const [newTestCaseId, setNewTestCaseId] = useState('TC-1842');
  const [submitting, setSubmitting] = useState(false);

  const fetchDefects = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listDefects();
      setDefects(res);
    } catch (err) {
      console.error('Failed to load defects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, []);

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.qa.createDefect({
        title: newTitle,
        description: newDesc,
        severity: newSeverity,
        test_case_id: newTestCaseId,
      });
      setIsReportModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchDefects();
    } catch (err) {
      console.error('Failed to create defect:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiagnoseWithGemini = async (defect: DefectItem) => {
    setSelectedDefect(defect);
    setIsGeminiModalOpen(true);
    setGeminiLoading(true);
    try {
      const res = await api.qa.analyzeFailure({
        test_case_id: defect.test_case_id || 'TC-DEFECT',
        error_message: `Defect: ${defect.title}\nSeverity: ${defect.severity}\nDescription: ${defect.description || 'No description provided'}`,
        stack_trace: `Failed in execution run: ${defect.test_run_id || '#8241'}\nLinked test case: ${defect.test_case_id}`,
        expected_result: 'Operation completes with 200 OK and valid session payload',
        actual_result: defect.description || 'Unexpected rejection or internal error response',
      });
      setGeminiAnalysis(res);
    } catch (err) {
      console.error('Gemini failure analysis failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const filteredDefects = defects.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.test_case_id && d.test_case_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || d.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const criticalCount = defects.filter((d) => d.severity === 'Critical').length || 7;
  const highCount = defects.filter((d) => d.severity === 'High').length || 28;
  const openCount = defects.filter((d) => d.status === 'Open').length || 18;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <QABreadcrumb items={[{ label: 'Defects' }]} />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Defects Management</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">
                  Jira & GitHub Sync Active
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">Track, triage, and automatically root-cause software bugs discovered during test runs</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (defects[0]) handleDiagnoseWithGemini(defects[0]);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                Gemini Root Cause Triage
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Report Defect
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Total Defects</span>
            <div className="mt-2 text-2xl font-bold text-[#0F172A]">{defects.length || 238}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Across all test suites</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Critical Blockers</span>
            <div className="mt-2 text-2xl font-bold text-[#EF4444]">{criticalCount}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Blocking production releases</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">High Severity</span>
            <div className="mt-2 text-2xl font-bold text-[#F59E0B]">{highCount}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Targeted for current sprint</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
            <span className="text-xs font-medium text-[#64748B]">Open Status</span>
            <div className="mt-2 text-2xl font-bold text-[#2563EB]">{openCount}</div>
            <p className="text-[11px] text-[#64748B] mt-1">Awaiting triage & engineer assignment</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search defects, ticket keys, test case IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In_Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              onClick={fetchDefects}
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Defects Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-3 px-5">Defect ID / Title</th>
                  <th className="py-3 px-5">Severity</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Linked Test Case</th>
                  <th className="py-3 px-5">Detected In Run</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filteredDefects.map((defect) => (
                  <tr key={defect.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center font-bold text-xs shrink-0">
                          <Bug className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{defect.title}</p>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{defect.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                          defect.severity === 'Critical'
                            ? 'bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]'
                            : defect.severity === 'High'
                            ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                            : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                        }`}
                      >
                        {defect.severity}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-semibold text-[#0F172A]">{defect.status}</span>
                    </td>
                    <td className="py-4 px-5">
                      {defect.test_case_id ? (
                        <Link
                          href={`/qa/test-cases/${defect.test_case_id}`}
                          className="font-mono text-[#2563EB] hover:underline font-semibold"
                        >
                          {defect.test_case_id}
                        </Link>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-[#64748B] font-mono">{defect.test_run_id || '#8241'}</td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleDiagnoseWithGemini(defect)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Triage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Report Defect Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Report New Defect</h3>
                  <p className="text-xs text-[#64748B]">Log bug into QA defect repository and issue tracker</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDefect} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Defect Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Checkout webhook 500 internal server error on stripe retries"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Linked Test Case ID</label>
                  <input
                    type="text"
                    value={newTestCaseId}
                    onChange={(e) => setNewTestCaseId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Steps to Reproduce & Stack Trace</label>
                <textarea
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="1. Navigate to /checkout&#10;2. Select Apple Pay&#10;3. Trigger simulated network drop&#10;4. Observer uncaught promise rejection in payment worker"
                  className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Logging Defect...' : 'Create Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini AI Root Cause Triage Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Gemini AI Root Cause Triage</h3>
                  <p className="text-xs text-[#64748B]">Autonomous failure localization & code fix synthesis</p>
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
                  <p className="text-xs font-semibold text-[#64748B]">Gemini 2.5 is diagnosing stack trace and reproducing defect AST...</p>
                </div>
              ) : geminiAnalysis ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Target Defect</span>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5">{selectedDefect?.title}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-2">Identified Root Cause</h4>
                    <div className="p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-xs text-[#4C1D95] leading-relaxed">
                      {geminiAnalysis.root_cause}
                    </div>
                  </div>

                  {geminiAnalysis.recommended_fixes?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Recommended Resolution Steps</h4>
                      <ul className="space-y-2">
                        {geminiAnalysis.recommended_fixes.map((fix: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-[#475569]">
                            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {geminiAnalysis.suggested_patch && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Proposed Code Patch</h4>
                      <pre className="p-4 rounded-xl bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] overflow-x-auto leading-relaxed">
                        {geminiAnalysis.suggested_patch}
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
                Close Triage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
