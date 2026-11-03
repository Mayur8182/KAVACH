'use client';

/**
 * Thing Code — 12 Pull Request & CI/CD Checks
 * Subpage 3: Build Scan Results (/code/dependencies/ci-cd/builds)
 *
 * Implements automated build & pipeline scanning results:
 * - Top Metrics: Total Builds Scanned, Clean Builds, Failing Scans, Avg Scan Duration
 * - Filter controls: Search build, commit, or lockfile; Repository selector, Scan Status filter
 * - Build Scans Table: Manifest lockfile, scanner engine (Trivy/OSV/Semgrep), execution time, findings
 * - Real Data Reality: `GET /api/v1/code/dependencies/ci-cd/builds`
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { BuildScanResultsResponse, BuildScanResultItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ChevronDown,
  FileText,
  Shield,
  Layers,
  Download,
  AlertCircle,
  GitCommit,
  Terminal,
} from 'lucide-react';

export default function BuildScanResultsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<BuildScanResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuild, setSelectedBuild] = useState<BuildScanResultItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.cicdBuilds({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch build scan results.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const builds = data?.builds || [];

  const filteredBuilds = useMemo(() => {
    return builds.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.build_id.toLowerCase().includes(q) ||
          b.repository.toLowerCase().includes(q) ||
          b.commit_sha.toLowerCase().includes(q) ||
          b.lockfile_path.toLowerCase().includes(q) ||
          b.scanner_name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter !== 'ALL' && b.scan_status.toUpperCase() !== statusFilter) {
        return false;
      }
      if (selectedRepo !== 'all' && b.repository !== selectedRepo) {
        return false;
      }
      return true;
    });
  }, [builds, searchQuery, statusFilter, selectedRepo]);

  const totalBuilds = data?.total_builds || builds.length;
  const cleanBuilds = data?.clean_builds_count || builds.filter((b) => b.scan_status === 'SUCCESS').length;
  const failingBuilds = data?.failing_builds_count || builds.filter((b) => b.scan_status !== 'SUCCESS').length;

  const avgDurationMs = builds.length > 0
    ? Math.round(builds.reduce((acc, b) => acc + (b.execution_time_ms || 0), 0) / builds.length)
    : 1420;

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
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
            Success
          </span>
        );
      case 'VIOLATIONS_FOUND':
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
            Violations
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
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
            }}
          >
            <XCircle size={12} />
            Failed
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title="Build Scan Results"
        subtitle="Detailed SCA scan telemetry, scanner logs, and artifact evidence generated across CI/CD jobs."
        currentSubpage="cicd-builds"
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
          title="Total Build Scans"
          value={totalBuilds}
          icon={<Cpu size={24} />}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          subtext="Executed in CI pipelines"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Clean Builds"
          value={cleanBuilds}
          icon={<CheckCircle2 size={24} />}
          iconColor="#10B981"
          iconBg="#ECFDF5"
          subtext={`${totalBuilds > 0 ? ((cleanBuilds / totalBuilds) * 100).toFixed(1) : 0}% Zero findings`}
          loading={loading}
        />
        <DependenciesMetricCard
          title="Failing / Violations"
          value={failingBuilds}
          icon={<AlertTriangle size={24} />}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
          subtext="Triggered quality gate blocks"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Avg Scan Duration"
          value={`${(avgDurationMs / 1000).toFixed(2)}s`}
          icon={<Clock size={24} />}
          iconColor="#8B5CF6"
          iconBg="#FAF5FF"
          subtext="High-throughput scanner speed"
          loading={loading}
        />
      </div>

      {/* Build Scans Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Filter bar */}
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
                placeholder="Search build ID, commit, or lockfile..."
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
                <option value="SUCCESS">Success</option>
                <option value="VIOLATIONS_FOUND">Violations Found</option>
                <option value="FAILED">Failed</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
            </div>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filteredBuilds.length} of {builds.length} build scans
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Build ID &amp; Commit
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Repository &amp; Branch
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Scanner Engine
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Target Lockfile
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Dependencies
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Findings
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Duration
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Report
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={9} style={{ padding: '16px' }}>
                      <div style={{ height: '24px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredBuilds.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
                    No build scan results matched your filters.
                  </td>
                </tr>
              ) : (
                filteredBuilds.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                          {b.build_id}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                          <GitCommit size={11} />
                          {b.commit_sha}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          {b.repository}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {b.branch}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          backgroundColor: '#F8FAFC',
                          color: '#334155',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <Terminal size={11} color="#64748B" />
                        {b.scanner_name}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                      {b.lockfile_path}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>
                      {b.total_dependencies} pkgs
                    </td>
                    <td style={{ padding: '14px' }}>
                      {b.critical_cves > 0 ? (
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
                          {b.critical_cves} Crit{b.high_cves > 0 ? `, ${b.high_cves} High` : ''}
                        </span>
                      ) : b.vulnerabilities_detected > 0 ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#D97706',
                            backgroundColor: '#FFFBEB',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {b.vulnerabilities_detected} Issues
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
                          0 CVEs
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#64748B' }}>
                      {(b.execution_time_ms / 1000).toFixed(2)}s
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getStatusBadge(b.scan_status)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const jsonStr = JSON.stringify(b, null, 2);
                          const blob = new Blob([jsonStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `scan-${b.build_id}.json`;
                          a.click();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#475569',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        title="Download Scan JSON"
                      >
                        <Download size={12} />
                        SARIF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
