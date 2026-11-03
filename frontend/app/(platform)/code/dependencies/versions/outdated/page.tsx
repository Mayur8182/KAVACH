'use client';

/**
 * Thing Code — Outdated Dependencies (/code/dependencies/versions/outdated)
 *
 * Filtered view of dependencies where newer releases are published upstream.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PackageVersionsResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ArrowUp,
  Search,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  GitPullRequest,
} from 'lucide-react';

export default function OutdatedDependenciesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PackageVersionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ecosystem, setEcosystem] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.outdatedVersions({
        projectId: currentProject?.id,
        ecosystem: ecosystem !== 'ALL' ? ecosystem : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load outdated packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, ecosystem, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const metrics = data?.metrics || {
    total_packages: 0,
    outdated_count: items.length,
    vulnerable_packages_count: 0,
    eol_count: 0,
  };

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Outdated Dependencies"
        subtitle="Review packages with available updates, identify SemVer drift, and prioritize version bumps."
        currentSubpage="versions-outdated"
        showVersionTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Outdated Dependencies"
          value={items.length}
          subtext="Packages with newer releases"
          icon={<ArrowUp size={20} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
        />
        <DependenciesMetricCard
          title="Minor Updates"
          value={items.filter((i) => i.version_status === 'MINOR_DRIFT').length}
          subtext="Backward compatible releases"
          icon={<Sparkles size={20} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
        />
        <DependenciesMetricCard
          title="Major Drift Packages"
          value={items.filter((i) => i.version_status === 'MAJOR_DRIFT').length}
          subtext="Potential breaking API changes"
          icon={<AlertTriangle size={20} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
        />
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1 1 240px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 12px',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search outdated packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>

        <select
          value={ecosystem}
          onChange={(e) => setEcosystem(e.target.value)}
          aria-label="Filter by ecosystem"
          style={{
            padding: '7px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#334155',
          }}
        >
          <option value="ALL">Ecosystem: All</option>
          <option value="npm">npm</option>
          <option value="pypi">PyPI</option>
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Package</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Ecosystem</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Current</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Latest</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Drift Type</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Risk</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    Loading outdated packages...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: metrics.total_packages === 0 ? '#EFF6FF' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={24} color={metrics.total_packages === 0 ? '#3B82F6' : '#10B981'} />
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                        {metrics.total_packages === 0 ? 'No Repositories Scanned Yet' : 'All Dependencies Up to Date'}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                        {metrics.total_packages === 0
                          ? 'No dependency manifests have been analyzed. Connect a repository and run a Software Composition Analysis (SCA) scan to detect outdated packages.'
                          : 'Every package in repository manifests matches the latest stable upstream release.'}
                      </p>
                      {metrics.total_packages === 0 && (
                        <Link
                          href="/code/repositories"
                          style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          Go to Repositories
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((pkg) => (
                  <tr key={pkg.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{pkg.name}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{pkg.manifest_path}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', textTransform: 'uppercase' }}>
                        {pkg.ecosystem}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace' }}>v{pkg.current_version}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>v{pkg.latest_version}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', backgroundColor: pkg.version_status === 'MAJOR_DRIFT' ? '#FEF2F2' : '#FFFBEB', color: pkg.version_status === 'MAJOR_DRIFT' ? '#DC2626' : '#D97706', fontWeight: 500 }}>
                        {pkg.version_status === 'MAJOR_DRIFT' ? 'Major Drift' : 'Minor Drift'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: pkg.breaking_changes_risk === 'HIGH' ? '#DC2626' : '#10B981' }}>
                        {pkg.breaking_changes_risk}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/code/dependencies/versions/upgrades?package=${encodeURIComponent(pkg.name)}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Plan Upgrade</span>
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
