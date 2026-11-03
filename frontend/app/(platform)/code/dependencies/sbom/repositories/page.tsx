'use client';

/**
 * Thing Code — 10 SBOM & Component Mapping
 * Subpage 3: Component-to-Repository Mapping (/code/dependencies/sbom/repositories)
 *
 * Implements:
 * - Cross-repository component presence and dependency mapping
 * - Visibility into how components are shared or duplicated across services
 * - Scanned repositories metrics (direct, transitive, vulnerable components)
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/sbom/repositories`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { SBOMRepositoryMappingResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  FolderGit2,
  Box,
  Share2,
  ShieldAlert,
  Search,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function SBOMRepositoryMappingPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<SBOMRepositoryMappingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.sbomRepositories({
        projectId: currentProject?.id,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch component-to-repository mappings.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const repositories = data?.repositories || [];
  const filtered = repositories.filter(
    (r) =>
      !search ||
      r.repository_name.toLowerCase().includes(search.toLowerCase()) ||
      r.unique_ecosystems.some((e) => e.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title="Component-to-Repository Mapping"
        subtitle="Track component distribution, dependency sharing, and SBOM coverage across monitored repositories."
        currentSubpage="sbom-repositories"
        showSbomTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Monitored Repositories"
          value={data?.total_repositories || 0}
          subtext="With active SBOM manifests"
          icon={<FolderGit2 size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Shared Components"
          value={data?.shared_components_count || 0}
          subtext="Used in 2 or more repositories"
          icon={<Share2 size={22} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Vulnerable Components"
          value={repositories.reduce((acc, curr) => acc + curr.vulnerable_count, 0)}
          subtext="Across all monitored repositories"
          badge={repositories.some((r) => r.vulnerable_count > 0) ? 'Needs Action' : 'All Clear'}
          badgeBg={repositories.some((r) => r.vulnerable_count > 0) ? '#FEF2F2' : '#ECFDF5'}
          badgeColor={repositories.some((r) => r.vulnerable_count > 0) ? '#DC2626' : '#059669'}
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
      </div>

      {/* Search and Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Repositories Breakdown
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
              Software composition analysis mapped by code repository
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              width: '240px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search repository..."
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
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Repository</th>
                <th style={{ padding: '10px 14px' }}>Total Components</th>
                <th style={{ padding: '10px 14px' }}>Direct</th>
                <th style={{ padding: '10px 14px' }}>Transitive</th>
                <th style={{ padding: '10px 14px' }}>Vulnerabilities</th>
                <th style={{ padding: '10px 14px' }}>Ecosystems</th>
                <th style={{ padding: '10px 14px' }}>Last Scan Date</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={8} style={{ padding: '14px' }}>
                      <div style={{ height: '18px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    No repositories match the query.
                  </td>
                </tr>
              ) : (
                filtered.map((repo) => (
                  <tr key={repo.repository_name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderGit2 size={16} color="#2563EB" />
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{repo.repository_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                      {repo.total_components}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{repo.direct_count}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{repo.transitive_count}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {repo.vulnerable_count > 0 ? (
                        <span
                          style={{
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FEE2E2',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {repo.vulnerable_count} Vulnerable
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #D1FAE5',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Clean
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {repo.unique_ecosystems.map((eco) => (
                          <span
                            key={eco}
                            style={{
                              backgroundColor: '#EEF2FF',
                              color: '#4338CA',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                            }}
                          >
                            {eco}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>
                      {repo.last_scan_date}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <Link
                        href={`/code/dependencies/sbom?repository=${encodeURIComponent(repo.repository_name)}`}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        View SBOM <ExternalLink size={12} />
                      </Link>
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
