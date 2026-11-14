'use client';

/**
 * Kavach Security — Unified Findings Workbench (/findings)
 * 
 * Ruthlessly simplified, high-density DevSecOps triage workbench:
 * - Single authoritative view: Live search and faceted filters directly on the table.
 * - Zero artificial page tabs (Filters, Search, and Severity work live in-place).
 * - 100% real database persistence via /api/v1/findings/*.
 * - Built-in AST patch inspection, scanner rescan, and 1-click GitHub PR creation.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Download,
  SlidersHorizontal,
  Sparkles,
  GitPullRequest,
  ExternalLink,
  X,
  Layers,
  FolderGit2,
  FileCode2,
  Filter,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { FindingDetailDrawer } from '@/components/findings/FindingDetailDrawer';
import {
  Button,
  Badge,
  SeverityBadge,
  StatusBadge,
  FilterPill,
  PageHeader,
  EmptyState,
  ErrorState,
} from '@/components/ui';

type ViewMode = 'list' | 'matrix';

export default function UnifiedFindingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // View Mode: 'list' (default) or 'matrix' (aggregated breakdown)
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get('mode') === 'matrix' ? 'matrix' : 'list'
  );

  // Pagination & List State
  const [findings, setFindings] = useState<any[]>([]);
  const [totalFindings, setTotalFindings] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get('page_size')) || 25);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Summary counts from live database
  const [summary, setSummary] = useState<any>({
    total_findings: 0,
    severity_counts: { critical: 0, high: 0, medium: 0, low: 0 },
    status_counts: { open: 0, in_progress: 0, resolved: 0, false_positive: 0, ignored: 0 },
    category_counts: {},
  });

  // Filter States
  const [selectedRepo, setSelectedRepo] = useState<string>(searchParams.get('repository') || 'all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>(searchParams.get('severity') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedBranch, setSelectedBranch] = useState<string>(searchParams.get('branch') || 'all');
  const [selectedRule, setSelectedRule] = useState<string>(searchParams.get('rule') || 'all');

  // Live Search Input
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('q') || '');
  const [submittedSearch, setSubmittedSearch] = useState<string>(searchParams.get('q') || '');

  // Advanced Filters Drawer Toggle
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState<boolean>(false);

  // Selected row checkboxes for batch triage
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Finding Detail Drawer State
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Export & Action Modals
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [issueModalOpen, setIssueModalOpen] = useState<boolean>(false);
  const [issueTitle, setIssueTitle] = useState<string>('');
  const [issueDesc, setIssueDesc] = useState<string>('');
  const [issueSubmitting, setIssueSubmitting] = useState<boolean>(false);

  // Category / Repository Matrix State
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);
  const [categoryRows, setCategoryRows] = useState<any[]>([]);
  const [repositoryRows, setRepositoryRows] = useState<any[]>([]);
  const [matrixTab, setMatrixTab] = useState<'category' | 'repository'>('category');

  // Scope Context
  const { currentRepository, currentProject } = useScope();

  useEffect(() => {
    if (currentRepository?.name) {
      setSelectedRepo(currentRepository.name);
      setPage(1);
    }
  }, [currentRepository?.name]);

  // URL Query Sync
  const updateUrl = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const sp = new URLSearchParams(window.location.search);
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === undefined || v === '' || v === 'all') {
          sp.delete(k);
        } else {
          sp.set(k, String(v));
        }
      });
      const newQs = sp.toString() ? `?${sp.toString()}` : '';
      router.replace(`/findings${newQs}`, { scroll: false });
    },
    [router]
  );

  // Filter Query Object
  const currentFilterParams = useMemo(() => {
    return {
      repository: selectedRepo !== 'all' ? selectedRepo : undefined,
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      rule_id: selectedRule !== 'all' ? selectedRule : undefined,
      search: submittedSearch.trim() ? submittedSearch.trim() : undefined,
    };
  }, [
    selectedRepo,
    selectedBranch,
    selectedSeverity,
    selectedStatus,
    selectedCategory,
    selectedRule,
    submittedSearch,
  ]);

  // Load Paginated Findings
  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.findings.list({
        ...currentFilterParams,
        page,
        page_size: pageSize,
      });
      setFindings(res.items || []);
      setTotalFindings(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security findings from database.');
      setFindings([]);
      setTotalFindings(0);
    } finally {
      setLoading(false);
    }
  }, [currentFilterParams, page, pageSize]);

  // Load Facet Summary Counts
  const loadSummary = useCallback(async () => {
    try {
      const res = await api.findings.summary({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        search: submittedSearch.trim() ? submittedSearch.trim() : undefined,
      });
      if (res) setSummary(res);
    } catch (err) {
      console.error('Failed to load summary counts:', err);
    }
  }, [selectedRepo, selectedBranch, submittedSearch]);

  // Load Breakdown Matrix
  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const [cats, repos] = await Promise.all([
        api.findings.categories({
          repository: selectedRepo !== 'all' ? selectedRepo : undefined,
          branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        }),
        api.findings.repositories({
          branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        }),
      ]);
      setCategoryRows(cats?.rows || []);
      setRepositoryRows(repos?.rows || []);
    } catch (err) {
      console.error('Failed to load category/repository matrix:', err);
    } finally {
      setMatrixLoading(false);
    }
  }, [selectedRepo, selectedBranch]);

  useEffect(() => {
    loadFindings();
    loadSummary();
  }, [loadFindings, loadSummary]);

  useEffect(() => {
    if (viewMode === 'matrix') {
      loadMatrix();
    }
  }, [viewMode, loadMatrix]);

  // Keyboard Shortcuts: Escape closes active drawers/menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailModalOpen) setDetailModalOpen(false);
        if (issueModalOpen) setIssueModalOpen(false);
        if (exportMenuOpen) setExportMenuOpen(false);
        if (advancedFiltersOpen) setAdvancedFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailModalOpen, issueModalOpen, exportMenuOpen, advancedFiltersOpen]);

  // Search Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(searchInput);
    setPage(1);
    updateUrl({ q: searchInput.trim() || undefined, page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setPage(1);
    updateUrl({ q: undefined, page: 1 });
  };

  // Severity Filter Toggle
  const handleToggleSeverity = (sev: string) => {
    const next = selectedSeverity.toUpperCase() === sev.toUpperCase() ? 'all' : sev;
    setSelectedSeverity(next);
    setPage(1);
    updateUrl({ severity: next === 'all' ? undefined : next, page: 1 });
  };

  // Status Filter Toggle
  const handleToggleStatus = (st: string) => {
    const next = selectedStatus.toLowerCase() === st.toLowerCase() ? 'all' : st;
    setSelectedStatus(next);
    setPage(1);
    updateUrl({ status: next === 'all' ? undefined : next, page: 1 });
  };

  // Engine / Category Filter Toggle
  const handleToggleCategory = (cat: string) => {
    const next = selectedCategory.toUpperCase() === cat.toUpperCase() ? 'all' : cat;
    setSelectedCategory(next);
    setPage(1);
    updateUrl({ category: next === 'all' ? undefined : next, page: 1 });
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSelectedRepo('all');
    setSelectedSeverity('all');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedBranch('all');
    setSelectedRule('all');
    setSearchInput('');
    setSubmittedSearch('');
    setPage(1);
    router.replace('/findings', { scroll: false });
  };

  // Single Finding Status Change
  const handleStatusChange = async (findingId: string, newStatus: string) => {
    try {
      await api.findings.patch(findingId, { status: newStatus });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
      );
      loadSummary();
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  };

  // Batch Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(findings.map((f) => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchStatus = async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => api.findings.patch(id, { status: newStatus })));
      setSelectedIds(new Set());
      loadFindings();
      loadSummary();
    } catch (err) {
      console.error('Batch status update failed:', err);
    }
  };

  // Issue Creation Submit
  const handleCreateIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding?.id) return;
    setIssueSubmitting(true);
    try {
      await api.findings.createIssue(selectedFinding.id, {
        title: issueTitle,
        description: issueDesc,
      });
      setIssueModalOpen(false);
      setIssueTitle('');
      setIssueDesc('');
    } catch (err: any) {
      console.error('Issue creation failed:', err);
    } finally {
      setIssueSubmitting(false);
    }
  };

  const hasActiveFilters =
    selectedSeverity !== 'all' ||
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    selectedRepo !== 'all' ||
    submittedSearch.trim().length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans p-6 max-w-7xl mx-auto w-full">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <PageHeader
        title="Security Findings"
        subtitle="Live code vulnerability triage, AST patch proposals, and continuous security gate status."
        breadcrumbs={[
          { label: 'Workspace', href: '/overview' },
          { label: currentProject?.name || 'All Projects' },
          { label: 'Findings' },
        ]}
        badge={
          <Badge variant="neutral" size="sm">
            {totalFindings} {totalFindings === 1 ? 'Finding' : 'Findings'}
          </Badge>
        }
        actions={
          <>
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-[#F1F5F9] border border-[#E2E8F0] rounded-md p-0.5">
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  updateUrl({ mode: undefined });
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('matrix');
                  updateUrl({ mode: 'matrix' });
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Breakdown Matrix
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                loadFindings();
                loadSummary();
              }}
              disabled={loading}
              title="Refresh findings"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </Button>

            {/* Export Dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download size={13} />}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
              >
                Export
              </Button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-[#E2E8F0] rounded-md shadow-md z-50 py-1 flex flex-col text-xs">
                  <a
                    href={api.findings.exportUrl(currentFilterParams, 'csv')}
                    download
                    onClick={() => setExportMenuOpen(false)}
                    className="px-3 py-1.5 text-[#0F172A] hover:bg-[#F8FAFC] flex items-center justify-between"
                  >
                    <span>CSV Format</span>
                  </a>
                  <a
                    href={api.findings.exportUrl(currentFilterParams, 'json')}
                    download
                    onClick={() => setExportMenuOpen(false)}
                    className="px-3 py-1.5 text-[#0F172A] hover:bg-[#F8FAFC] flex items-center justify-between"
                  >
                    <span>JSON Format</span>
                  </a>
                </div>
              )}
            </div>
          </>
        }
      >
        {/* ── 2. Unified Live Filter Toolbar (Directly in-context) ── */}
        <div className="flex flex-col gap-2.5 bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-xs">
          {/* Row A: Search Bar + Advanced Trigger */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
              <Search size={14} className="absolute left-3 text-[#64748B] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Filter by CVE, CWE, title, rule ID, or file path... (Press Enter)"
                className="w-full text-xs text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-md pl-8 pr-8 py-2 outline-none hover:border-[#94A3B8] focus:bg-white focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 text-[#64748B] hover:text-[#0F172A]"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </form>

            <Button
              variant={advancedFiltersOpen ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<SlidersHorizontal size={13} />}
              onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            >
              Filters
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-[#64748B] hover:text-[#DC2626]"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Row B: Quick Facet Filter Strip */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-[#F8FAFC]">
            {/* Severity Facets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#64748B] mr-1 uppercase">Severity:</span>
              <FilterPill
                label="All"
                count={summary.total_findings}
                isActive={selectedSeverity === 'all'}
                onClick={() => handleToggleSeverity('all')}
              />
              <FilterPill
                label="Critical"
                count={summary.severity_counts?.critical || 0}
                tone="critical"
                isActive={selectedSeverity.toUpperCase() === 'CRITICAL'}
                onClick={() => handleToggleSeverity('CRITICAL')}
              />
              <FilterPill
                label="High"
                count={summary.severity_counts?.high || 0}
                tone="warning"
                isActive={selectedSeverity.toUpperCase() === 'HIGH'}
                onClick={() => handleToggleSeverity('HIGH')}
              />
              <FilterPill
                label="Medium"
                count={summary.severity_counts?.medium || 0}
                tone="warning"
                isActive={selectedSeverity.toUpperCase() === 'MEDIUM'}
                onClick={() => handleToggleSeverity('MEDIUM')}
              />
              <FilterPill
                label="Low"
                count={summary.severity_counts?.low || 0}
                tone="info"
                isActive={selectedSeverity.toUpperCase() === 'LOW'}
                onClick={() => handleToggleSeverity('LOW')}
              />
            </div>

            {/* Engine Facets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#64748B] mr-1 uppercase">Engine:</span>
              {['SAST', 'SCA', 'SECRETS', 'IAC', 'CONTAINER', 'API'].map((engine) => (
                <FilterPill
                  key={engine}
                  label={engine}
                  isActive={selectedCategory.toUpperCase() === engine}
                  onClick={() => handleToggleCategory(engine)}
                />
              ))}
            </div>
          </div>

          {/* Row C: Collapsible Advanced Filters Drawer */}
          {advancedFiltersOpen && (
            <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleToggleStatus(e.target.value)}
                  className="w-full text-xs text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 outline-none focus:border-[#09090B]"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="false_positive">False Positive</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>

              {/* Repository Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase mb-1">
                  Repository Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend, payments"
                  value={selectedRepo === 'all' ? '' : selectedRepo}
                  onChange={(e) => {
                    const val = e.target.value.trim() || 'all';
                    setSelectedRepo(val);
                    setPage(1);
                    updateUrl({ repository: val === 'all' ? undefined : val, page: 1 });
                  }}
                  className="w-full text-xs text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 outline-none focus:border-[#09090B]"
                />
              </div>

              {/* Branch / Ref Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase mb-1">
                  Git Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. main, dev"
                  value={selectedBranch === 'all' ? '' : selectedBranch}
                  onChange={(e) => {
                    const val = e.target.value.trim() || 'all';
                    setSelectedBranch(val);
                    setPage(1);
                    updateUrl({ branch: val === 'all' ? undefined : val, page: 1 });
                  }}
                  className="w-full text-xs text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 outline-none focus:border-[#09090B]"
                />
              </div>
            </div>
          )}
        </div>
      </PageHeader>

      {/* ── 3. Batch Action Bar (Shown when rows selected) ─────────── */}
      {selectedIds.size > 0 && (
        <div className="mb-3 p-2.5 bg-[#09090B] text-white rounded-lg flex items-center justify-between text-xs shadow-md animate-in fade-in duration-120">
          <div className="flex items-center gap-2">
            <span className="font-semibold px-2 py-0.5 bg-[#27272A] rounded">
              {selectedIds.size} selected
            </span>
            <span>Bulk triage action:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleBatchStatus('resolved')}
            >
              Mark Resolved
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleBatchStatus('false_positive')}
            >
              Mark False Positive
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleBatchStatus('ignored')}
            >
              Ignore
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSelectedIds(new Set())}
              className="text-white hover:text-white hover:bg-[#27272A]"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. Main Findings Content ───────────────────────────────── */}
      {viewMode === 'matrix' ? (
        /* Breakdown Matrix View */
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMatrixTab('category')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  matrixTab === 'category'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setMatrixTab('repository')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  matrixTab === 'repository'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                By Repository
              </button>
            </div>
            <span className="text-xs text-[#64748B]">
              Aggregated vulnerability matrix across live codebase.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">
                    {matrixTab === 'category' ? 'Vulnerability Category' : 'Repository Name'}
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Total Findings</th>
                  <th className="py-2.5 px-3 font-semibold text-[#DC2626]">Critical</th>
                  <th className="py-2.5 px-3 font-semibold text-[#EA580C]">High</th>
                  <th className="py-2.5 px-3 font-semibold text-[#D97706]">Medium</th>
                  <th className="py-2.5 px-3 font-semibold text-[#2563EB]">Low</th>
                </tr>
              </thead>
              <tbody>
                {matrixLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                      <RefreshCw size={18} className="animate-spin inline-block mb-2 text-[#2563EB]" />
                      <div>Calculating live aggregated matrix...</div>
                    </td>
                  </tr>
                ) : (matrixTab === 'category' ? categoryRows : repositoryRows).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      No matrix records found in connected database.
                    </td>
                  </tr>
                ) : (
                  (matrixTab === 'category' ? categoryRows : repositoryRows).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                        {matrixTab === 'category' ? row.category : row.repository}
                      </td>
                      <td className="py-2.5 px-3 font-bold">{row.total}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#DC2626]">{row.critical || 0}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#EA580C]">{row.high || 0}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#D97706]">{row.medium || 0}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#2563EB]">{row.low || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* High-Density Findings Table */
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wider select-none">
                  <th className="w-9 py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={findings.length > 0 && selectedIds.size === findings.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-[#09090B] focus:ring-[#09090B] cursor-pointer"
                    />
                  </th>
                  <th className="w-24 py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Finding / Rule ID</th>
                  <th className="w-24 py-2.5 px-3 font-semibold">Engine</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="w-28 py-2.5 px-3 font-semibold">Status</th>
                  <th className="w-24 py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#64748B]">
                      <RefreshCw size={20} className="animate-spin inline-block mb-2 text-[#09090B]" />
                      <div className="font-medium text-[#0F172A]">Loading verified findings...</div>
                      <div className="text-xs text-[#64748B] mt-0.5">Querying PostgreSQL database</div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <ErrorState
                        title="Failed to Load Findings"
                        message={error}
                        onRetry={loadFindings}
                      />
                    </td>
                  </tr>
                ) : findings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <EmptyState
                        variant="no_vulnerabilities"
                        title={hasActiveFilters ? 'No Matching Findings' : 'Clean Bill of Health'}
                        description={
                          hasActiveFilters
                            ? 'No findings matched your active search or filter criteria. Try clearing filters to view all issues.'
                            : 'Zero unaddressed vulnerabilities detected in monitored repositories.'
                        }
                        primaryAction={
                          hasActiveFilters
                            ? {
                                label: 'Reset Filter Criteria',
                                onClick: handleResetFilters,
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  findings.map((f) => {
                    const isSelected = selectedIds.has(f.id);
                    return (
                      <tr
                        key={f.id}
                        className={`hover:bg-[#F8FAFC] transition-colors group ${
                          isSelected ? 'bg-[#EFF6FF]' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(f.id)}
                            className="rounded border-[#CBD5E1] text-[#09090B] focus:ring-[#09090B] cursor-pointer"
                          />
                        </td>

                        {/* Severity Badge */}
                        <td className="py-2.5 px-3">
                          <SeverityBadge severity={f.severity} size="xs" />
                        </td>

                        {/* Finding Title & Rule */}
                        <td className="py-2.5 px-3 max-w-sm">
                          <div
                            onClick={() => {
                              setSelectedFinding(f);
                              setDetailModalOpen(true);
                            }}
                            className="font-medium text-[#0F172A] hover:text-[#2563EB] cursor-pointer truncate flex items-center gap-1.5"
                            title={f.title || f.message}
                          >
                            <span>{f.title || f.message}</span>
                            {f.cwe && (
                              <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.2 rounded shrink-0 font-mono">
                                {f.cwe}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B] truncate mt-0.5">
                            {f.rule_id || f.display_id || f.id}
                          </div>
                        </td>

                        {/* Scanner Engine */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] uppercase">
                            {f.category || 'SAST'}
                          </span>
                        </td>

                        {/* Location: Repo + File:Line */}
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="flex items-center gap-1 text-xs text-[#0F172A] font-medium truncate">
                            <FolderGit2 size={12} className="text-[#64748B] shrink-0" />
                            <span className="truncate">{f.repository || 'monorepo'}</span>
                            {f.branch && (
                              <span className="text-[10px] text-[#64748B] font-mono">
                                ({f.branch})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B] truncate mt-0.5">
                            {f.file_path ? `${f.file_path}${f.line_number ? `:${f.line_number}` : ''}` : 'Unknown file'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3">
                          <StatusBadge status={f.status} size="xs" />
                        </td>

                        {/* Action: Open Remediation Drawer */}
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setSelectedFinding(f);
                              setDetailModalOpen(true);
                            }}
                            leftIcon={<Sparkles size={11} className="text-[#2563EB]" />}
                          >
                            Remediate
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── 5. Pagination Bar ──────────────────────────────────── */}
          {!loading && findings.length > 0 && (
            <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] select-none">
              <div>
                Showing{' '}
                <span className="font-semibold text-[#0F172A]">
                  {(page - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-[#0F172A]">
                  {Math.min(page * pageSize, totalFindings)}
                </span>{' '}
                of <span className="font-semibold text-[#0F172A]">{totalFindings}</span> findings
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    updateUrl({ page: next });
                  }}
                  leftIcon={<ChevronLeft size={12} />}
                >
                  Previous
                </Button>

                <span className="px-2 font-medium text-[#0F172A]">
                  {page} / {totalPages || 1}
                </span>

                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    updateUrl({ page: next });
                  }}
                  rightIcon={<ChevronRight size={12} />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Unified Finding Detail & Remediation Drawer ──────────── */}
      <FindingDetailDrawer
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        findingId={selectedFinding?.id || null}
        initialFinding={selectedFinding}
        onStatusChange={(id, newStatus) => {
          handleStatusChange(id, newStatus);
        }}
      />

      {/* ── 7. Clean Issue Creation Modal ──────────────────────────── */}
      {issueModalOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIssueModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-lg shadow-lg border border-[#E2E8F0] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#0F172A] m-0">
                Create Issue in VCS / Jira
              </h3>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateIssueSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  required
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full text-xs text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md px-3 py-2 outline-none focus:border-[#09090B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Description & Remediation Guidance
                </label>
                <textarea
                  rows={4}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className="w-full text-xs text-[#0F172A] bg-white border border-[#CBD5E1] rounded-md px-3 py-2 outline-none focus:border-[#09090B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={issueSubmitting}
                  loadingText="Creating..."
                >
                  Create Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
