'use client';

/**
 * Thing Code — 08 Package Health & Maintenance
 * Subpage 3: Abandoned Packages (/code/dependencies/health/abandoned)
 *
 * Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/health/abandoned`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { AbandonedPackagesResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  Package as PackageIcon,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function AbandonedPackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<AbandonedPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.abandonedPackages({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch abandoned packages audit.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const packages = data?.abandoned_packages || [];
  const total = data?.total || packages.length;
  const criticalCount = data?.critical_abandoned_count || packages.filter((p) => p.health_status === 'Critical' || p.is_deprecated).length;
  const deprecatedCount = packages.filter((p) => p.is_deprecated).length;
  const replacementsCount = packages.filter((p) => Boolean(p.replacement_package)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <DependenciesHeader
        title="Abandoned Packages"
        subtitle="Identify unmaintained dependencies with no releases in over 12 months, official deprecations, or zero active maintainers."
        currentSubpage="health-abandoned"
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRefresh={loadData}
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
            onClick={loadData}
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

      {/* Advisory Banner */}
      <div
        style={{
          backgroundColor: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <AlertTriangle size={18} color="#EA580C" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#9A3412', lineHeight: '1.5' }}>
          <strong>Supply-Chain Risk Warning:</strong> Abandoned or deprecated dependencies do not receive security patches for new CVEs, increasing susceptibility to zero-day vulnerabilities and account takeovers. Migrate to modern supported packages.
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <DependenciesMetricCard
          title="Total Abandoned"
          value={total}
          subtext="No commits or releases in >1yr"
          badge="High Risk"
          badgeColor="#DC2626"
          badgeBg="#FEE2E2"
          icon={<AlertTriangle size={22} />}
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Critical Health"
          value={criticalCount}
          subtext="Health score under 40/100"
          badge="Action Required"
          badgeColor="#DC2626"
          badgeBg="#FEE2E2"
          icon={<ShieldAlert size={22} />}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Officially Deprecated"
          value={deprecatedCount}
          subtext="Flagged by upstream registry"
          badge="Deprecation Notice"
          badgeColor="#EA580C"
          badgeBg="#FFEDD5"
          icon={<Clock size={22} />}
          iconBg="#FFEDD5"
          iconColor="#EA580C"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Replacements Available"
          value={replacementsCount}
          subtext="Verified alternative packages"
          badge="Ready to Migrate"
          badgeColor="#059669"
          badgeBg="#ECFDF5"
          icon={<ArrowRight size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Table */}
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
            Abandoned & Deprecated Dependencies
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {packages.length} at-risk packages found
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Package</th>
                <th style={{ padding: '12px 16px' }}>Version</th>
                <th style={{ padding: '12px 16px' }}>Ecosystem</th>
                <th style={{ padding: '12px 16px' }}>Last Release</th>
                <th style={{ padding: '12px 16px' }}>Deprecation / Reason</th>
                <th style={{ padding: '12px 16px' }}>Replacement Package</th>
                <th style={{ padding: '12px 16px' }}>Trust Score</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: '8px', fontSize: '13px' }}>Loading abandoned packages...</div>
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    Zero abandoned dependencies identified. All upstream packages are active.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 100ms ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                          <PackageIcon size={14} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Link
                            href={`/code/dependencies/health/${encodeURIComponent(pkg.package_name)}`}
                            style={{ fontWeight: 600, color: '#0F172A', textDecoration: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                          >
                            {pkg.package_name}
                          </Link>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{pkg.repository_name}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                      {pkg.version}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                        {pkg.ecosystem}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#DC2626', fontWeight: 600 }}>
                      {pkg.last_release_relative}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12.5px' }}>
                      {pkg.deprecation_reason || 'Zero commits or activity observed in over 12 months.'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {pkg.replacement_package ? (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {pkg.replacement_package}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>None identified</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                        {pkg.trust_score}/100
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link
                        href={`/code/dependencies/health/${encodeURIComponent(pkg.package_name)}`}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Inspect & Migrate
                        <ExternalLink size={11} />
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
