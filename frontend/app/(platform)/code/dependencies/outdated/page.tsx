'use client';

/**
 * Thing Code — Outdated Packages (/code/dependencies/outdated)
 *
 * Dependency drift and technical debt tracking across repositories.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/outdated`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { OutdatedPackagesResponse, OutdatedPackageItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  ArrowRight,
  FolderGit2,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function OutdatedPackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<OutdatedPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [driftType, setDriftType] = useState('all');
  const [ecosystem, setEcosystem] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.outdated({
        projectId: currentProject?.id,
        driftType: driftType !== 'all' ? driftType : undefined,
        ecosystem: ecosystem !== 'all' ? ecosystem : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load outdated packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, driftType, ecosystem, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Outdated Packages"
        subtitle="Track dependency drift, technical debt, and upgrade paths across repositories."
        currentSubpage="outdated"
        onRefresh={loadData}
        isLoading={loading}
      />

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

      {/* Top 4 Drift Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Outdated"
          value={data?.total || 0}
          subtext="Packages behind latest release"
          icon={<Clock size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Major Drift (Breaking)"
          value={data?.major_drift_count || 0}
          subtext="Potential breaking API changes"
          badge={Number(data?.major_drift_count || 0) > 0 ? 'High Risk' : 'Zero'}
          badgeColor="#DC2626"
          badgeBg="#FEE2E2"
          icon={<AlertTriangle size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Minor Drift (Features)"
          value={data?.minor_drift_count || 0}
          subtext="Backwards-compatible features"
          badge="Medium"
          badgeColor="#D97706"
          badgeBg="#FEF3C7"
          icon={<Info size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Patch Drift (Bugfixes)"
          value={data?.patch_drift_count || 0}
          subtext="Drop-in bug & security fixes"
          badge="Safe"
          badgeColor="#16A34A"
          badgeBg="#DCFCE7"
          icon={<CheckCircle2 size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />
      </div>

      {/* Search & Filters */}
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
        {/* Search */}
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
            placeholder="Search package name..."
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

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <Filter size={14} />
            <span>Drift:</span>
            <select
              value={driftType}
              aria-label="Filter by drift type"
              onChange={(e) => setDriftType(e.target.value)}
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
              <option value="all">All Drift Types</option>
              <option value="MAJOR">Major (Breaking)</option>
              <option value="MINOR">Minor (Features)</option>
              <option value="PATCH">Patch (Bugfix)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <span>Ecosystem:</span>
            <select
              value={ecosystem}
              aria-label="Filter by ecosystem"
              onChange={(e) => setEcosystem(e.target.value)}
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
              <option value="all">All Ecosystems</option>
              <option value="npm">npm</option>
              <option value="pypi">PyPI</option>
              <option value="go">Go Modules</option>
              <option value="cargo">Cargo</option>
              <option value="maven">Maven</option>
            </select>
          </div>
        </div>
      </div>

      {/* Outdated Packages Table */}
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
            gridTemplateColumns: '2fr 2fr 110px 110px 1.8fr 1.2fr',
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
          <span>Package</span>
          <span>Version Drift</span>
          <span>Drift Type</span>
          <span>Upgrade Risk</span>
          <span>Repository</span>
          <span style={{ textAlign: 'right' }}>Target Version</span>
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
        ) : items.length === 0 ? (
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
            <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              All Packages Up To Date
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0', maxWidth: '420px' }}>
              No version drift detected against registry latest versions.
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const isMajor = item.drift_type === 'MAJOR';
            const isMinor = item.drift_type === 'MINOR';

            return (
              <div
                key={item.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 110px 110px 1.8fr 1.2fr',
                  gap: '12px',
                  padding: '14px 18px',
                  alignItems: 'center',
                  borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                {/* Package Name & Ecosystem */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.package_name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>
                    {item.ecosystem}
                  </span>
                </div>

                {/* Version Drift: current -> latest */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                  <span style={{ color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                    v{item.current_version}
                  </span>
                  <ArrowRight size={13} color="#94A3B8" />
                  <span style={{ color: '#0F172A', fontWeight: 600, backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                    v{item.latest_version}
                  </span>
                </div>

                {/* Drift Badge */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isMajor ? '#FEE2E2' : isMinor ? '#FEF3C7' : '#DCFCE7',
                      color: isMajor ? '#DC2626' : isMinor ? '#D97706' : '#16A34A',
                    }}
                  >
                    {item.drift_type}
                  </span>
                </div>

                {/* Upgrade Risk */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: item.upgrade_risk === 'HIGH' ? '#DC2626' : item.upgrade_risk === 'MEDIUM' ? '#D97706' : '#16A34A',
                    }}
                  >
                    {item.upgrade_risk} Risk
                  </span>
                </div>

                {/* Repository & Manifest */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FolderGit2 size={13} color="#64748B" />
                    <span style={{ fontSize: '12px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.repository_name || 'workspace'}
                    </span>
                  </div>
                  {item.file_path && (
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file_path}
                    </span>
                  )}
                </div>

                {/* Recommended Target Version */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {item.recommended_version || item.latest_version}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
