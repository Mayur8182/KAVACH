'use client';

/**
 * Thing Code — 12 Pull Request & CI/CD Checks
 * Subpage 2: Pull Request Dependency Checks (/code/dependencies/ci-cd/pull-requests)
 *
 * Implements real-time PR dependency security evaluations:
 * - Top Metrics: Total PRs Analyzed, Passed Checks, Blocked PRs, Dependencies Modified
 * - Filter controls: Search PRs, Repository filter, Check Status filter
 * - PR Checks Inventory: Comprehensive audit table with dependency diffs (+/-/~)
 * - Inspection drawer: Detailed policy evaluation, affected manifests, and remediation
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/ci-cd/pull-requests`
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PRDependencyChecksResponse, PRDependencyCheckItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ChevronDown,
  Filter,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  X,
} from 'lucide-react';

export default function PRDependencyChecksPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PRDependencyChecksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<PRDependencyCheckItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.cicdPullRequests({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch PR dependency checks data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const checks = data?.checks || [];

  const repositories = useMemo(() => {
    const set = new Set(checks.map((c) => c.repository));
    return Array.from(set).filter(Boolean);
  }, [checks]);

  const filteredChecks = useMemo(() => {
    return checks.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.pr_title.toLowerCase().includes(q) ||
          c.pr_number.toString().includes(q) ||
          c.repository.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q) ||
          c.branch.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter !== 'ALL' && c.status.toUpperCase() !== statusFilter) {
        return false;
      }
      if (selectedRepo !== 'all' && c.repository !== selectedRepo) {
        return false;
      }
      return true;
    });
  }, [checks, searchQuery, statusFilter, selectedRepo]);

  const totalChecks = data?.total_checks || checks.length;
  const passedCount = data?.passed_count || checks.filter((c) => c.status === 'PASSED').length;
  const blockedCount = data?.blocked_count || checks.filter((c) => c.status === 'BLOCKED').length;
  const totalModified = checks.reduce((acc, c) => acc + c.dependencies_added + c.dependencies_updated, 0);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PASSED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
            }}
          >
            <CheckCircle2 size={12} />
            Passed
          </span>
        );
      case 'BLOCKED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
            }}
          >
            <XCircle size={12} />
            Blocked
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              border: '1px solid #FDE68A',
            }}
          >
            <AlertTriangle size={12} />
            Needs Review
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
            }}
          >
            <Clock size={12} />
            Scanning
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title="Pull Request Dependency Checks"
        subtitle="Automated software composition analysis and policy enforcement on every pull request."
        currentSubpage="cicd-pull-requests"
        showCicdTabs={true}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Error state */}
      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FECACA',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#B91C1C',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total PRs Analyzed"
          value={totalChecks}
          icon={<GitPullRequest size={24} />}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          subtext="Across all connected branches"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Passed Checks"
          value={passedCount}
          icon={<CheckCircle2 size={24} />}
          iconColor="#10B981"
          iconBg="#ECFDF5"
          subtext={`${totalChecks > 0 ? ((passedCount / totalChecks) * 100).toFixed(1) : 0}% Pass rate`}
          loading={loading}
        />
        <DependenciesMetricCard
          title="Blocked PRs"
          value={blockedCount}
          icon={<XCircle size={24} />}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
          subtext="Action required before merge"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Dependencies Modified"
          value={totalModified}
          icon={<FileCode size={24} />}
          iconColor="#F59E0B"
          iconBg="#FFFBEB"
          subtext="Additions & upgrades detected"
          loading={loading}
        />
      </div>

      {/* Filter and Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search PR title, number, author, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 28px 8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Status: All</option>
                <option value="PASSED">Passed</option>
                <option value="BLOCKED">Blocked</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="SCANNING">Scanning</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
            </div>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filteredChecks.length} of {checks.length} pull requests
          </span>
        </div>

        {/* PR Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Pull Request
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Repository &amp; Branch
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Author
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Dependency Diff
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Security Findings
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Gate Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={7} style={{ padding: '16px' }}>
                      <div style={{ height: '24px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
                    No pull requests matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredChecks.map((check) => (
                  <tr
                    key={check.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedCheck(check)}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <GitPullRequest size={16} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              #{check.pr_number}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
                              {check.pr_title}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {check.check_summary}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {check.repository}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                          <span style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>
                            {check.branch}
                          </span>
                          <ArrowRight size={10} />
                          <span style={{ fontFamily: 'monospace' }}>{check.target_branch}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569' }}>
                      {check.author}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                        {check.dependencies_added > 0 && (
                          <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <PlusCircle size={11} /> +{check.dependencies_added}
                          </span>
                        )}
                        {check.dependencies_updated > 0 && (
                          <span style={{ color: '#2563EB', fontWeight: 600 }}>
                            ~{check.dependencies_updated}
                          </span>
                        )}
                        {check.dependencies_removed > 0 && (
                          <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MinusCircle size={11} /> -{check.dependencies_removed}
                          </span>
                        )}
                        {check.dependencies_added === 0 && check.dependencies_updated === 0 && check.dependencies_removed === 0 && (
                          <span style={{ color: '#94A3B8' }}>0 modified</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {check.critical_count > 0 ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#DC2626',
                            backgroundColor: '#FEF2F2',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                          }}
                        >
                          {check.critical_count} Critical{check.high_count > 0 ? `, ${check.high_count} High` : ''}
                        </span>
                      ) : check.high_count > 0 ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#D97706',
                            backgroundColor: '#FFFBEB',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          {check.high_count} High
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#059669',
                            backgroundColor: '#ECFDF5',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Clean
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getStatusBadge(check.status)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCheck(check);
                        }}
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#1E40AF',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal for Detailed PR Check Inspection */}
      {selectedCheck && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 100,
          }}
          onClick={() => setSelectedCheck(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              height: '100%',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
              padding: '28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GitPullRequest size={18} color="#2563EB" />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                    PR #{selectedCheck.pr_number}: {selectedCheck.pr_title}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Authored by {selectedCheck.author} · {selectedCheck.repository}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCheck(null)}
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Summary */}
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: selectedCheck.status === 'PASSED' ? '#ECFDF5' : selectedCheck.status === 'BLOCKED' ? '#FEF2F2' : '#FFFBEB',
                border: `1px solid ${selectedCheck.status === 'PASSED' ? '#A7F3D0' : selectedCheck.status === 'BLOCKED' ? '#FECACA' : '#FDE68A'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {selectedCheck.status === 'PASSED' ? <ShieldCheck size={18} color="#059669" /> : <ShieldAlert size={18} color="#DC2626" />}
                <span style={{ fontWeight: 600, fontSize: '13px', color: selectedCheck.status === 'PASSED' ? '#059669' : '#DC2626' }}>
                  {selectedCheck.status === 'PASSED' ? 'Policy Passed: Safe to Merge' : 'Policy Blocked: Vulnerabilities Detected'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>
                {selectedCheck.check_summary}
              </p>
            </div>

            {/* Details Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Check Telemetry
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Branch</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{selectedCheck.branch}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Target</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{selectedCheck.target_branch}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Dependencies Added</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>+{selectedCheck.dependencies_added}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Dependencies Updated</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>~{selectedCheck.dependencies_updated}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setSelectedCheck(null)}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Triggered automated re-scan on PR #${selectedCheck.pr_number}`);
                  setSelectedCheck(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#1E40AF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Re-Run Check
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
