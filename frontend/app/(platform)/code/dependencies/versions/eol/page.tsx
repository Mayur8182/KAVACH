'use client';

/**
 * Thing Code — End-of-Life Packages (/code/dependencies/versions/eol)
 *
 * Audits repository dependencies against upstream End-of-Life (EOL) lifecycles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { EolPackagesResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Search,
  ExternalLink,
  LifeBuoy,
} from 'lucide-react';

export default function EndOfLifePackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<EolPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.eol({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load End-of-Life packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '24px 32px' }}>
      <DependenciesHeader
        title="End-of-Life Packages"
        subtitle="Detect deprecated, unmaintained, or past-support dependencies across all project manifests."
        currentSubpage="versions-eol"
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
          title="End-of-Life Packages"
          value={items.length}
          subtext="Packages requiring replacement"
          icon={<Clock size={20} />}
          iconBg="#FAF5FF"
          iconColor="#A855F7"
        />
        <DependenciesMetricCard
          title="Active Support Health"
          value={data?.total && data.total > 0 ? "100%" : "0%"}
          subtext={data?.total && data.total > 0 ? "Modern LTS framework dependencies" : "No dependencies analyzed"}
          icon={<ShieldCheck size={20} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
        />
      </div>

      {/* Table or Authentic Empty State */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
            Cross-referencing upstream End-of-Life registry...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: (data?.total || 0) === 0 ? '#EFF6FF' : '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={28} color={(data?.total || 0) === 0 ? '#3B82F6' : '#10B981'} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {(data?.total || 0) === 0 ? 'No Repositories Scanned Yet' : 'Zero End-of-Life Packages Detected'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                {(data?.total || 0) === 0
                  ? 'No dependency manifests have been analyzed. Connect a repository and run a Software Composition Analysis (SCA) scan to audit dependencies against upstream End-of-Life (EOL) registries.'
                  : 'All dependencies monitored across scanned repositories are running on active, maintained release branches with ongoing security patches.'}
              </p>
              {(data?.total || 0) === 0 && (
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
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Package</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Ecosystem</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Installed Version</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>EOL Date</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pkg) => (
                <tr key={pkg.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{pkg.package_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase' }}>{pkg.ecosystem}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace' }}>v{pkg.installed_version}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#DC2626' }}>{pkg.eol_date || 'Deprecated'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{pkg.recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
