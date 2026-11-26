'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  RotateCw,
  Sparkles,
  FileCode2,
  Copy,
  Check,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import {
  codeAuditApi,
  CodeAuditFinding,
  CodeAuditAutofixProposal,
} from '@/lib/api/codeAudit';

export default function FindingDetailPage() {
  const params = useParams();
  const findingId = params.findingId as string;

  const [finding, setFinding] = useState<CodeAuditFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Autofix state
  const [autofix, setAutofix] = useState<CodeAuditAutofixProposal | null>(null);
  const [isGeneratingAutofix, setIsGeneratingAutofix] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  // Deep dive explanation state
  const [explanation, setExplanation] = useState<any | null>(null);
  const [isLoadingExpl, setIsLoadingExpl] = useState(false);

  // Status updating state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await codeAuditApi.getFinding(findingId);
        setFinding(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load finding details');
      } finally {
        setLoading(false);
      }
    }
    if (findingId) {
      loadData();
    }
  }, [findingId]);

  const handleGenerateAutofix = async () => {
    try {
      setIsGeneratingAutofix(true);
      const res = await codeAuditApi.generateAutofix(findingId);
      setAutofix(res);
    } catch (err: any) {
      alert(err.message || 'Autofix generation failed');
    } finally {
      setIsGeneratingAutofix(false);
    }
  };

  const handleExplain = async () => {
    try {
      setIsLoadingExpl(true);
      const res = await codeAuditApi.explainFinding(findingId);
      setExplanation(res);
    } catch (err: any) {
      alert(err.message || 'Explanation failed');
    } finally {
      setIsLoadingExpl(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      const updated = await codeAuditApi.updateFindingStatus(findingId, newStatus, 'Triaged via UI');
      setFinding(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopyPatch = () => {
    if (autofix?.diff_patch) {
      navigator.clipboard.writeText(autofix.diff_patch);
      setCopiedDiff(true);
      setTimeout(() => setCopiedDiff(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RotateCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Finding Details...</p>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="p-8 rounded-xl bg-white border border-slate-200 text-center max-w-md mx-auto my-12 shadow-xs">
        <AlertTriangle size={32} className="mx-auto text-red-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Finding Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'Finding does not exist.'}</p>
        <Link
          href="/code-audit/findings"
          className="mt-4 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          &larr; Back to Findings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 pb-2 border-b border-slate-200">
        <Link href="/code-audit/findings" className="hover:text-slate-900 font-medium">
          Findings
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-mono font-semibold">{finding.rule_id}</span>
      </div>

      {/* Header Info */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                finding.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                finding.severity === 'HIGH' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {finding.severity}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {finding.priority}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {finding.category} • {finding.rule_id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Status: {finding.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2">{finding.title}</h2>
            <div className="text-xs text-slate-500 font-mono mt-1">
              File: {finding.file_path} {finding.start_line ? `(lines ${finding.start_line}-${finding.end_line || finding.start_line})` : ''}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExplain}
              disabled={isLoadingExpl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
            >
              {isLoadingExpl ? <RotateCw size={13} className="animate-spin" /> : <HelpCircle size={13} />}
              Explain Issue
            </button>

            <button
              onClick={handleGenerateAutofix}
              disabled={isGeneratingAutofix}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              {isGeneratingAutofix ? <RotateCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Generate Autofix Patch
            </button>

            {/* Status Dropdown */}
            <select
              value={finding.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="OPEN">Mark Open</option>
              <option value="IN_REVIEW">Mark In Review</option>
              <option value="RESOLVED">Mark Resolved</option>
              <option value="ACCEPTED_RISK">Accept Risk</option>
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
          {finding.description}
        </p>
      </div>

      {/* Code Evidence Section */}
      {finding.code_evidence && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <FileCode2 size={14} className="text-blue-600" />
            Code Evidence & Context
          </h3>
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-100 overflow-x-auto whitespace-pre">
            {finding.code_evidence}
          </div>
        </div>
      )}

      {/* Root Cause & Remediation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Root Cause</span>
          <p className="text-slate-800 leading-relaxed">
            {finding.root_cause || 'Pattern violation or missing architectural guardrail.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Technical Impact</span>
          <p className="text-slate-800 leading-relaxed">
            {finding.technical_impact || 'Degrades maintainability, scalability, or code reliability.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Recommended Solution</span>
          <p className="text-slate-800 leading-relaxed">
            {finding.recommended_solution || 'Refactor according to standard architecture guidelines.'}
          </p>
          <div className="mt-2 text-slate-600 font-mono">
            Est. Fix: {finding.estimated_remediation_minutes} minutes
          </div>
        </div>
      </div>

      {/* AI Deep Dive Explanation Box */}
      {explanation && (
        <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle size={15} />
            AI Architectural Investigation
          </h3>
          <p className="text-xs text-slate-800 leading-relaxed">{explanation.explanation}</p>
          <div className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-blue-200">
            <strong className="text-blue-900">Preventative Advice:</strong> {explanation.preventative_advice}
          </div>
        </div>
      )}

      {/* Autofix Patch Proposal Preview */}
      {autofix && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Generated Remediation Patch</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold">
                {autofix.validation_status}
              </span>
            </div>
            <button
              onClick={handleCopyPatch}
              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 shadow-xs font-medium"
            >
              {copiedDiff ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedDiff ? 'Copied' : 'Copy Patch'}
            </button>
          </div>

          <p className="text-xs text-slate-700">{autofix.explanation}</p>

          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
            {autofix.diff_patch}
          </div>

          {autofix.validation_command && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              <Terminal size={14} className="text-slate-500" />
              <span>Validation Command: </span>
              <span className="text-slate-900 font-semibold">{autofix.validation_command}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
