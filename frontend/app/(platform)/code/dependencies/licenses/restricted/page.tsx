'use client';

/**
 * Thing Code — Restricted Packages (/code/dependencies/licenses/restricted)
 *
 * Subpage 4 of License Compliance:
 * Audits weak copyleft, dual-licensed, and conditional open-source components requiring architectural hygiene.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { RestrictedLicensesResponse, RestrictedLicenseItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ShieldAlert,
  Layers,
  CheckCircle2,
  FileCode,
  Search,
  Filter,
  ExternalLink,
  Package,
  AlertTriangle,
} from 'lucide-react';

export default function RestrictedPackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<RestrictedLicensesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.restrictedLicenses({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch restricted packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.restricted_packages || [];
  const actionCount = data?.requires_action_count || 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Restricted Packages"
        subtitle="Audits weak copyleft, dual-licensed, and conditional open-source components requiring linking hygiene."
        currentSubpage="licenses-restricted"
        showLicenseTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Restricted Packages"
          value={data?.total || 0}
          subtext="Conditional OSS components"
          icon={<Layers size={22} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Action Required"
          value={actionCount}
          subtext="Requires linking verification"
          badge={actionCount > 0 ? 'Review' : 'Verified'}
          badgeColor={actionCount > 0 ? '#DC2626' : '#10B981'}
          badgeBg={actionCount > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<AlertTriangle size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Dynamic Linking Compliant"
          value={Math.max(0, (data?.total || 0) - actionCount)}
          subtext="Verified isolation boundaries"
          badge="Isolated"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<CheckCircle2 size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Weak Copyleft Licenses"
          value={items.filter((i) => i.license_type === 'Weak Copyleft').length}
          subtext="LGPL-2.1, MPL-2.0, CDDL"
          icon={<FileCode size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
      </div>

      {/* Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Filter Toolbar */}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '7px 12px',
              width: '280px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search restricted package or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#1E293B',
                width: '100%',
              }}
            />
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {items.length} restricted packages
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Package</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>License</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>License Type</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Linking Requirement</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Approval Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Architectural Guidance</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Loading restricted components...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    No restricted packages found.
                  </td>
                </tr>
              ) : (
                items.map((pkg) => (
                  <tr
                    key={pkg.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 120ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={16} color="#64748B" />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{pkg.package_name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            v{pkg.package_version}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#FFF7ED',
                          color: '#EA580C',
                          border: '1px solid #FDBA74',
                        }}
                      >
                        {pkg.license_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                        {pkg.license_type}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                        {pkg.linking_requirement}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: pkg.approval_status === 'Requires Approval' ? '#FEF2F2' : '#ECFDF5',
                          color: pkg.approval_status === 'Requires Approval' ? '#DC2626' : '#059669',
                          border: `1px solid ${pkg.approval_status === 'Requires Approval' ? '#FCA5A5' : '#A7F3D0'}`,
                        }}
                      >
                        {pkg.approval_status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', maxWidth: '300px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                        {pkg.guidance}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <Link
                        href={`/code/dependencies/graph?search=${encodeURIComponent(pkg.package_name)}`}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                        }}
                      >
                        Graph
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
