'use client';

/**
 * Thing Code — 08 Package Health & Maintenance
 * Subpage 4: Release & Version History (/code/dependencies/health/releases)
 *
 * Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/health/releases`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { ReleaseVersionHistoryResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Tag,
  GitCommit,
  ShieldCheck,
  AlertTriangle,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Package as PackageIcon,
} from 'lucide-react';

export default function ReleaseVersionHistoryPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<ReleaseVersionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageName, setPackageName] = useState('express');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (pkg: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.packageReleases({
        packageName: pkg,
        projectId: currentProject?.id,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch package release history.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadData(packageName);
  }, [loadData, packageName]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setPackageName(searchQuery.trim());
    }
  };

  const releases = data?.releases || [];
  const totalReleases = data?.total_releases || releases.length;
  const breakingCount = releases.filter((r) => r.is_breaking).length;
  const cveCount = releases.reduce((acc, r) => acc + (r.vulnerabilities_fixed?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <DependenciesHeader
        title="Release & Version History"
        subtitle="Inspect historical release notes, cadence of releases, breaking versions, and fixed CVEs across packages."
        currentSubpage="health-releases"
        onRefresh={() => loadData(packageName)}
        isLoading={loading}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C',
            fontSize: '13.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData(packageName)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#DC2626',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Package Selector & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
            <PackageIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Package: <span style={{ color: '#2563EB' }}>{data?.package_name || packageName}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Ecosystem: {data?.ecosystem || 'npm'} · Current: {data?.current_version || '4.19.2'}
            </div>
          </div>
        </div>

        {/* Form to query another package */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              width: '240px',
            }}
          >
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Inspect package release..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '7px 14px',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Inspect
          </button>
        </form>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <DependenciesMetricCard
          title="Current Version"
          value={data?.current_version || '4.19.2'}
          subtext="Deployed in production"
          badge="In Use"
          badgeColor="#2563EB"
          badgeBg="#EFF6FF"
          icon={<Tag size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Latest Version"
          value={data?.latest_version || '4.19.2'}
          subtext="Upstream registry latest"
          badge="Up to Date"
          badgeColor="#059669"
          badgeBg="#ECFDF5"
          icon={<ShieldCheck size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Total Releases"
          value={totalReleases}
          subtext="Historical releases cataloged"
          badge="Tracked"
          badgeColor="#2563EB"
          badgeBg="#EFF6FF"
          icon={<GitCommit size={22} />}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
          loading={loading}
        />
        <DependenciesMetricCard
          title="CVEs Patched"
          value={cveCount}
          subtext="Security advisories addressed"
          badge="Remediated"
          badgeColor="#059669"
          badgeBg="#ECFDF5"
          icon={<ShieldCheck size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Release Timeline List */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Historical Releases & Changelog
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {releases.length} releases shown
          </span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
              <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: '8px', fontSize: '13px' }}>Loading release history...</div>
            </div>
          ) : releases.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
              No release history found for this package.
            </div>
          ) : (
            releases.map((rel) => (
              <div
                key={rel.version}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                  backgroundColor: rel.is_latest ? '#F8FAFC' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                      v{rel.version}
                    </span>
                    {rel.is_latest && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                        Latest Deployed
                      </span>
                    )}
                    {rel.is_breaking && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={11} /> Breaking Changes
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                    {rel.release_date} ({rel.relative_date})
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  {rel.changelog_summary}
                </div>

                {rel.vulnerabilities_fixed && rel.vulnerabilities_fixed.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>Security Patches:</span>
                    {rel.vulnerabilities_fixed.map((cve) => (
                      <span
                        key={cve}
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#059669',
                          backgroundColor: '#ECFDF5',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {cve}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
