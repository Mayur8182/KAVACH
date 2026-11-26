'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Save,
  Check,
  Settings,
} from 'lucide-react';

export default function CodeAuditSettingsPage() {
  const [maxFunctionLength, setMaxFunctionLength] = useState(60);
  const [maxComplexity, setMaxComplexity] = useState(10);
  const [maxNesting, setMaxNesting] = useState(4);
  const [maxFileLength, setMaxFileLength] = useState(800);
  const [excludedGlobs, setExcludedGlobs] = useState('node_modules/**, dist/**, .next/**, coverage/**, venv/**');
  const [autoRunOnPR, setAutoRunOnPR] = useState(true);
  const [blockOnGradeF, setBlockOnGradeF] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sliders size={18} className="text-blue-600" />
          Code Audit Rules & Threshold Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure deterministic complexity thresholds, exclusion globs, and automated pull request quality gates.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Complexity Thresholds Card */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings size={15} className="text-blue-600" />
            Static Complexity Thresholds
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Max Function Length (lines)
              </label>
              <input
                type="number"
                value={maxFunctionLength}
                onChange={(e) => setMaxFunctionLength(Number(e.target.value))}
                min={20}
                max={200}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <span className="text-slate-500 text-xs mt-1 block">Standard threshold: 60 lines</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Max Cyclomatic Complexity (CC)
              </label>
              <input
                type="number"
                value={maxComplexity}
                onChange={(e) => setMaxComplexity(Number(e.target.value))}
                min={5}
                max={30}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <span className="text-slate-500 text-xs mt-1 block">Decision paths per function (recommended: 10)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Max Control Flow Nesting Depth
              </label>
              <input
                type="number"
                value={maxNesting}
                onChange={(e) => setMaxNesting(Number(e.target.value))}
                min={2}
                max={10}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <span className="text-slate-500 text-xs mt-1 block">Maximum indentation levels (recommended: 4)</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Max File Size (lines)
              </label>
              <input
                type="number"
                value={maxFileLength}
                onChange={(e) => setMaxFileLength(Number(e.target.value))}
                min={300}
                max={2000}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <span className="text-slate-500 text-xs mt-1 block">Single file maintainability ceiling (recommended: 800)</span>
            </div>
          </div>
        </div>

        {/* Exclusion Globs */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Excluded Paths & Globs</h3>
          <p className="text-xs text-slate-500">
            Comma-separated file globs to skip during AST analysis and architecture mapping.
          </p>
          <input
            type="text"
            value={excludedGlobs}
            onChange={(e) => setExcludedGlobs(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        {/* CI/CD & Quality Gate Rules */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Automation & Quality Gates</h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRunOnPR}
                onChange={(e) => setAutoRunOnPR(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/10"
              />
              <span className="text-slate-800 font-medium">
                Automatically trigger incremental code audit on incoming Pull Requests
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={blockOnGradeF}
                onChange={(e) => setBlockOnGradeF(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/10"
              />
              <span className="text-slate-800 font-medium">
                Block PR merge if Code Audit overall grade drops to &apos;F&apos; or introduces P0 blocker
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Check size={14} /> Audit rules saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
