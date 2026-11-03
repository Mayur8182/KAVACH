'use client';

/**
 * Thing Code — Repository Coverage (/code/dependencies/coverage)
 *
 * Repository-level SCA scanning coverage, manifest detection, and scanner invocation.
 * Data Source: Real PostgreSQL records via `GET /api/v1/code/dependencies/coverage`
 * Execution: Real deterministic scan trigger via `POST /api/v1/code/dependencies/scan`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useProject } from '@/contexts/ProjectContext';
import { DependencyCoveragePageResponse, RepositoryCoverageItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  Layers,
  FolderGit2,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function RepositoryCoveragePage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DependencyCoveragePageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.coverage({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load repository coverage.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerScan = async (repoId: string) => {
    setScanningRepoId(repoId);
    setScanMessage(null);
    try {
      const res = await api.code.dependencies.triggerScan({
        repository_id: repoId,
        branch: 'main',
      });
      const msg = res.message || 'SCA dependency scan queued successfully.';
      setScanMessage(msg);
      toast.info('Security scan queued', { description: msg });
      setTimeout(() => {
        loadData();
        setScanMessage(null);
      }, 2500);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to trigger scan.';
      setError(errMsg);
      toast.error('Scan trigger failed', { description: errMsg });
    } finally {
      setScanningRepoId(null);
    }
  };

  const repos = data?.repositories || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Repository Coverage"
        subtitle="Software Composition Analysis (SCA) scanner coverage, manifest file detection, and monitoring health."
        currentSubpage="coverage"
        onRefresh={loadData}
        isLoading={loading}
      />

      {scanMessage && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#166534',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={16} color="#16A34A" />
          <span>{scanMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Scanned Repositories"
          value={`${data?.covered_repositories || 0}/${data?.total_repositories || 0}`}
          subtext="Repositories with SCA manifests"
          badge={`${data?.coverage_percentage || 0}%`}
          badgeColor="#2563EB"
          badgeBg="#EFF6FF"
          icon={<FolderGit2 size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Overall Coverage"
          value={`${data?.coverage_percentage || 0}%`}
          subtext="Coverage across active projects"
          badge={Number(data?.coverage_percentage || 0) >= 80 ? 'Healthy' : 'Needs Scans'}
          badgeColor={Number(data?.coverage_percentage || 0) >= 80 ? '#16A34A' : '#D97706'}
          badgeBg={Number(data?.coverage_percentage || 0) >= 80 ? '#DCFCE7' : '#FEF3C7'}
          icon={<ShieldCheck size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Total Monitored Packages"
          value={data?.total_dependencies_monitored || 0}
          subtext="Packages indexed across manifests"
          icon={<Layers size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Average Density"
          value={`${Math.round(data?.average_dependencies_per_repo || 0)}`}
          subtext="Dependencies per repository"
          icon={<FileCode2 size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />
      </div>

      {/* Search & Status Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '6px 12px',
            minWidth: '260px',
            flexGrow: 1,
            maxWidth: '400px',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search repository name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#0F172A',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
          <Filter size={14} />
          <span>Status:</span>
          <select
            value={statusFilter}
            aria-label="Filter by scan status"
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="HEALTHY">Healthy (Zero CVEs)</option>
            <option value="VULNERABLE">Vulnerable</option>
            <option value="NOT_SCANNED">Not Scanned</option>
          </select>
        </div>
      </div>

      {/* Coverage Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 110px 110px 120px 120px 110px',
            gap: '12px',
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span>Repository</span>
          <span>Manifest Files</span>
          <span>Packages</span>
          <span>Vulnerable</span>
          <span>SCA Coverage</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div style={{ height: '20px', width: '120px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
              <div style={{ height: '16px', flexGrow: 1, backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
            </div>
          ))
        ) : repos.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            <FolderGit2 size={40} color="#94A3B8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              No Repositories Found
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0', maxWidth: '420px' }}>
              Connect repositories through Onboarding or GitHub integration to monitor software composition.
            </p>
          </div>
        ) : (
          repos.map((repo, idx) => {
            const isVulnerable = repo.status === 'VULNERABLE';
            const isHealthy = repo.status === 'HEALTHY';
            const isScanning = scanningRepoId === repo.repository_id;

            return (
              <div
                key={repo.repository_id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 110px 110px 120px 120px 110px',
                  gap: '12px',
                  padding: '14px 18px',
                  alignItems: 'center',
                  borderBottom: idx < repos.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                {/* Repository Name & Language */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FolderGit2 size={14} color="#64748B" />
                    <span style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {repo.repository_name}
                    </span>
                  </div>
                  {repo.primary_language && (
                    <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '20px' }}>
                      {repo.primary_language}
                    </span>
                  )}
                </div>

                {/* Manifests Detected */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {repo.manifest_files && repo.manifest_files.length > 0 ? (
                    repo.manifest_files.slice(0, 2).map((m, mi) => (
                      <span
                        key={mi}
                        style={{
                          fontSize: '10px',
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {m}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>None detected</span>
                  )}
                </div>

                {/* Packages Count */}
                <div>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {repo.dependencies_count.toLocaleString()}
                  </span>
                </div>

                {/* Vulnerabilities Count */}
                <div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: repo.vulnerable_count > 0 ? '#DC2626' : '#16A34A',
                    }}
                  >
                    {repo.vulnerable_count > 0 ? `${repo.vulnerable_count} (${repo.critical_count} crit)` : '0 clean'}
                  </span>
                </div>

                {/* Coverage % and Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '80px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                    {repo.coverage_pct}%
                  </span>
                  <div style={{ height: '6px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${repo.coverage_pct}%`,
                        backgroundColor: repo.coverage_pct >= 80 ? '#10B981' : repo.coverage_pct > 0 ? '#3B82F6' : '#E2E8F0',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isHealthy ? '#DCFCE7' : isVulnerable ? '#FEE2E2' : '#F1F5F9',
                      color: isHealthy ? '#16A34A' : isVulnerable ? '#DC2626' : '#64748B',
                    }}
                  >
                    {repo.status}
                  </span>
                </div>

                {/* Scan Trigger Action */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleTriggerScan(repo.repository_id)}
                    disabled={isScanning}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2563EB',
                      cursor: isScanning ? 'wait' : 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {isScanning ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={11} color="#2563EB" />
                    )}
                    <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
