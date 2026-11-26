'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RotateCw,
  Search,
  ChevronRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { codeAuditApi, CodeAuditFinding } from '@/lib/api/codeAudit';

export default function CodeAuditFindingsPage() {
  const [findings, setFindings] = useState<CodeAuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchFindings() {
      try {
        setLoading(true);
        const overview = await codeAuditApi.getOverview();
        if (!isMounted) return;
        if (overview.latest_run?.id) {
          const data = await codeAuditApi.getFindings(overview.latest_run.id, {
            category: categoryFilter || undefined,
            severity: severityFilter || undefined,
            priority: priorityFilter || undefined,
            status: statusFilter || undefined,
            search: activeSearch || undefined,
            limit: 100,
          });
          if (isMounted) setFindings(data);
        } else {
          if (isMounted) setFindings([]);
        }
      } catch {
        if (isMounted) setFindings([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchFindings();
    return () => {
      isMounted = false;
    };
  }, [categoryFilter, severityFilter, priorityFilter, statusFilter, activeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'P0':
        return 'bg-red-50 text-red-800 border-red-200 font-bold';
      case 'P1':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      case 'P2':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle size={18} className="text-blue-600" />
          Findings Explorer
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Inspect, filter, and remediate all architectural violations, code smells, performance bottlenecks, and reliability gaps.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, rule ID, or path..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mr-1">
            <Filter size={13} />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            <option value="">All Categories</option>
            <option value="QUALITY">Quality</option>
            <option value="ARCHITECTURE">Architecture</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="TESTING">Testing</option>
            <option value="MAINTAINABILITY">Maintainability</option>
            <option value="RELIABILITY">Reliability</option>
            <option value="DOCUMENTATION">Documentation</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            <option value="">All Priorities</option>
            <option value="P0">P0 (Blocker)</option>
            <option value="P1">P1 (Urgent)</option>
            <option value="P2">P2 (Normal)</option>
            <option value="P3">P3 (Minor)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ACCEPTED_RISK">Accepted Risk</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RotateCw size={24} className="animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-medium text-slate-600">Loading findings...</p>
        </div>
      ) : findings.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-slate-200 shadow-xs">
          <ShieldCheck size={36} className="mx-auto text-emerald-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Matching Findings</h3>
          <p className="text-xs text-slate-500 mt-1">
            Either no audit has been run yet or all findings are filtered out.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Title & Rule</th>
                <th className="py-3 px-4">File Path</th>
                <th className="py-3 px-4">Est. Debt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {findings.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(f.severity)}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs border font-mono ${getPriorityBadge(f.priority)}`}>
                      {f.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {f.category}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{f.title}</div>
                    <div className="font-mono text-xs text-slate-400">{f.rule_id}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-xs">
                    {f.file_path}:{f.start_line || 1}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-amber-700">
                    {f.estimated_remediation_minutes}m
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/code-audit/findings/${f.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Details <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
