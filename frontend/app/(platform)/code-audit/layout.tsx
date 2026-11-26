'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileCode2,
  Play,
  RotateCw,
  LayoutDashboard,
  History,
  AlertTriangle,
  GitBranch,
  Zap,
  CheckCircle2,
  Wrench,
  AlertOctagon,
  Clock,
  ListOrdered,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { codeAuditApi } from '@/lib/api/codeAudit';

interface TabItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', href: '/code-audit', icon: LayoutDashboard },
  { id: 'runs', label: 'Runs History', href: '/code-audit/runs', icon: History },
  { id: 'findings', label: 'Findings', href: '/code-audit/findings', icon: AlertTriangle },
  { id: 'code-quality', label: 'Code Quality', href: '/code-audit/code-quality', icon: FileCode2 },
  { id: 'architecture', label: 'Architecture', href: '/code-audit/architecture', icon: GitBranch },
  { id: 'performance', label: 'Performance', href: '/code-audit/performance', icon: Zap },
  { id: 'testing', label: 'Testing Quality', href: '/code-audit/testing', icon: CheckCircle2 },
  { id: 'maintainability', label: 'Maintainability', href: '/code-audit/maintainability', icon: Wrench },
  { id: 'reliability', label: 'Reliability', href: '/code-audit/reliability', icon: AlertOctagon },
  { id: 'technical-debt', label: 'Technical Debt', href: '/code-audit/technical-debt', icon: Clock },
  { id: 'recommendations', label: 'Action Plan', href: '/code-audit/recommendations', icon: ListOrdered },
  { id: 'settings', label: 'Audit Rules', href: '/code-audit/settings', icon: Sliders },
];

export default function CodeAuditLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auditScope, setAuditScope] = useState('FULL');
  const [targetBranch, setTargetBranch] = useState('main');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await fetch('/api/v1/repositories/management');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setRepositories(data);
            setSelectedRepoId(data[0].id);
          }
        }
      } catch {
        // ignore
      }
    }
    loadRepos();
  }, []);

  const handleTriggerAudit = async () => {
    if (!selectedRepoId) {
      setErrorBanner('Please select a repository first.');
      return;
    }
    try {
      setIsAuditing(true);
      setErrorBanner(null);
      const run = await codeAuditApi.triggerAudit(selectedRepoId, auditScope, targetBranch);
      setIsModalOpen(false);
      router.push(`/code-audit/runs/${run.id}`);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to trigger code audit');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50 text-slate-900 pb-12">
      {/* Top Header Card */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FileCode2 size={20} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Enterprise Code Audit Engine</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Production Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Independent engineering quality, architecture coupling, performance bottlenecks, and technical debt analysis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {repositories.length > 0 && (
              <div className="relative">
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium shadow-sm"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name} ({repo.default_branch || 'main'})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3 pointer-events-none text-slate-400" />
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Play size={14} />
              Run Code Audit
            </button>
          </div>
        </div>

        {errorBanner && (
          <div className="mt-3 max-w-7xl mx-auto p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* 12 Horizontal Navigation Tabs */}
        <nav className="flex items-center gap-1 mt-5 max-w-7xl mx-auto overflow-x-auto no-scrollbar border-t border-slate-100 pt-3">
          {TABS.map((tab) => {
            const isActive = tab.href === '/code-audit'
              ? pathname === '/code-audit'
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Page Area */}
      <main className="p-6 max-w-7xl mx-auto mt-2">{children}</main>

      {/* Trigger Audit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Play size={16} className="text-blue-600" />
                Launch Repository Code Audit
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Audit Scope</label>
                <select
                  value={auditScope}
                  onChange={(e) => setAuditScope(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                >
                  <option value="FULL">Comprehensive Audit (All 7 Categories)</option>
                  <option value="QUALITY">Code Quality Only (Smells, Complexity, Nesting)</option>
                  <option value="ARCHITECTURE">Architecture Only (Coupling & Cycles)</option>
                  <option value="PERFORMANCE">Performance Only (N+1, Loops, React)</option>
                  <option value="TESTING">Testing Quality Only (Coverage & Assertions)</option>
                  <option value="MAINTAINABILITY">Maintainability Only (MI & Halstead)</option>
                  <option value="RELIABILITY">Reliability Only (Swallowed Errors)</option>
                  <option value="DOCUMENTATION">Documentation Only (README & API)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Branch</label>
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-xs leading-relaxed">
                Audits run deterministically and are completely decoupled from security scanning. AST parsing and dependency graphs run in the background.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerAudit}
                disabled={isAuditing}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isAuditing ? <RotateCw size={14} className="animate-spin" /> : <Play size={14} />}
                {isAuditing ? 'Starting Audit...' : 'Execute Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
