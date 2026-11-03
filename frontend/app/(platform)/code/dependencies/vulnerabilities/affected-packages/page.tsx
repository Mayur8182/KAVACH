'use client';

/**
 * Thing Code — Affected Packages (/code/dependencies/vulnerabilities/affected-packages)
 *
 * Aggregates vulnerabilities by package, showing which libraries carry the highest security debt.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { AffectedPackagesResponse, AffectedPackageItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Package,
  ShieldAlert,
  AlertTriangle,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  GitBranch,
} from 'lucide-react';

export default function AffectedPackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<AffectedPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.affectedPackages({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load affected packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const totalCVEs = items.reduce((acc, curr) => acc + curr.vulnerability_count, 0);
  const criticalPkgs = items.filter((i) => i.highest_severity === 'CRITICAL').length;
  const multiRepoPkgs = items.filter((i) => i.repositories.length > 1).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Affected Packages"
        subtitle="Catalog of libraries containing active vulnerabilities, prioritized by risk and blast radius."
        currentSubpage="vulnerabilities-affected"
        onRefresh={loadData}
        isLoading={loading}
        showVulnerabilityTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Affected Packages"
          value={data?.total_packages_affected || items.length}
          subtext="Unique vulnerable packages"
          icon={<Package size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Critical Packages"
          value={criticalPkgs}
          subtext="Containing CVSS 9.0+ CVEs"
          icon={<ShieldAlert size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Linked CVEs"
          value={totalCVEs}
          subtext="Total vulnerability references"
          icon={<AlertTriangle size={24} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Multi-Repo Footprint"
          value={multiRepoPkgs}
          subtext="Installed in multiple projects"
          icon={<GitBranch size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px', maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 12px',
                width: '100%',
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search affected package name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 18px' }}>Package & Ecosystem</th>
                <th style={{ padding: '12px 18px' }}>Installed Version</th>
                <th style={{ padding: '12px 18px' }}>Highest Severity</th>
                <th style={{ padding: '12px 18px' }}>Associated CVEs</th>
                <th style={{ padding: '12px 18px' }}>Fixed Version</th>
                <th style={{ padding: '12px 18px' }}>Manifests</th>
                <th style={{ padding: '12px 18px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    Loading affected packages...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', marginBottom: '12px' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                      No affected packages found
                    </div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      {search ? 'No packages match search term.' : 'Zero package vulnerabilities in current project.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((pkg) => {
                  const isCrit = pkg.highest_severity === 'CRITICAL';
                  const isHigh = pkg.highest_severity === 'HIGH';

                  return (
                    <tr key={pkg.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{pkg.package_name}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                            }}
                          >
                            {pkg.ecosystem}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#475569' }}>
                        v{pkg.installed_version}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : '#FFFBEB',
                            color: isCrit ? '#DC2626' : isHigh ? '#EA580C' : '#D97706',
                            border: `1px solid ${isCrit ? '#FECACA' : isHigh ? '#FFEDD5' : '#FDE68A'}`,
                          }}
                        >
                          {pkg.highest_severity} ({pkg.vulnerability_count})
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {pkg.cve_ids.map((cve, cIdx) => (
                            <Link
                              key={cIdx}
                              href={`/code/dependencies/vulnerabilities/${encodeURIComponent(cve)}`}
                              style={{
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                textDecoration: 'none',
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              {cve}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {pkg.fixed_version ? (
                          <span style={{ color: '#16A34A', fontWeight: 600, fontFamily: 'monospace' }}>
                            v{pkg.fixed_version}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12.5px' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#64748B' }}>
                        {pkg.manifest_files.join(', ')}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <Link
                          href={`/code/dependencies/${encodeURIComponent(pkg.package_name)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#2563EB',
                            fontSize: '12.5px',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          Inspect <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
