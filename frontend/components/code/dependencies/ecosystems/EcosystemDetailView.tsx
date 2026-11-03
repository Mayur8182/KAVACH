'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { EcosystemDetailResponse, DependencyInventoryItem } from '@/types/api/dependencies';
import { DependenciesHeader, DependencySubpageType } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { EcosystemIcon } from './EcosystemIcons';
import {
  Box,
  ShieldAlert,
  Clock,
  ArrowUp,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  MoreHorizontal,
  Package,
} from 'lucide-react';

interface EcosystemDetailViewProps {
  slug: 'npm' | 'python' | 'java' | 'go' | 'other';
  title: string;
  subtitle: string;
  subpageType: DependencySubpageType;
  manifestTypes: string[];
}

export const EcosystemDetailView: React.FC<EcosystemDetailViewProps> = ({
  slug,
  title,
  subtitle,
  subpageType,
  manifestTypes,
}) => {
  const { currentProject } = useProject();
  const [data, setData] = useState<EcosystemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'VULNERABLE' | 'OUTDATED'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.ecosystemDetail(slug, {
        projectId: currentProject?.id,
        search: search || undefined,
        limit: 100,
        offset: 0,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || `Failed to fetch ${title} details.`);
    } finally {
      setLoading(false);
    }
  }, [slug, title, currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const metrics = data?.metrics || {};
  const totalPackages = metrics.total_packages ?? items.length;
  const vulnerablePackages = metrics.vulnerable_packages ?? items.filter((i) => (i.vulnerability_count || 0) > 0).length;
  const outdatedPackages = metrics.outdated_packages ?? items.filter((i) => i.is_outdated).length;
  const healthScore = data?.health_score ?? 100;
  const riskyPackages = data?.risky_packages || [];

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'SAFE' && (item.vulnerability_count || 0) > 0) return false;
      if (statusFilter === 'VULNERABLE' && (item.vulnerability_count || 0) === 0) return false;
      if (statusFilter === 'OUTDATED' && !item.is_outdated) return false;
      return true;
    });
  }, [items, statusFilter]);

  // Paginate items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Header with Subpage Tabs & Breadcrumb */}
      <DependenciesHeader
        title={title}
        subtitle={subtitle}
        currentSubpage={subpageType}
        showEcosystemTabs={true}
        onRefresh={loadData}
        isLoading={loading}
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
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
          <button
            onClick={loadData}
            style={{
              marginLeft: 'auto',
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Packages"
          value={totalPackages}
          subtext={`Supported: ${manifestTypes.join(', ')}`}
          icon={<EcosystemIcon type={slug} size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
        <DependenciesMetricCard
          title="Vulnerable Packages"
          value={vulnerablePackages}
          subtext={vulnerablePackages > 0 ? 'Active vulnerabilities present' : 'All packages clean'}
          icon={<ShieldAlert size={20} />}
          iconBg={vulnerablePackages > 0 ? '#FEF2F2' : '#F0FDF4'}
          iconColor={vulnerablePackages > 0 ? '#EF4444' : '#10B981'}
        />
        <DependenciesMetricCard
          title="Outdated Packages"
          value={outdatedPackages}
          subtext="Newer upstream versions available"
          icon={<ArrowUp size={20} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
        />
        <DependenciesMetricCard
          title="Security Health"
          value={`${healthScore}%`}
          subtext={healthScore >= 80 ? 'Good security posture' : 'Attention recommended'}
          icon={<CheckCircle2 size={20} />}
          iconBg={healthScore >= 80 ? '#F0FDF4' : '#FEF2F2'}
          iconColor={healthScore >= 80 ? '#10B981' : '#EF4444'}
        />
      </div>

      {/* Risky Packages Table for this ecosystem (if any) */}
      {riskyPackages.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#DC2626" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Top Risky Packages in {title}
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {riskyPackages.length} flagged packages
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <th style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Package</th>
                  <th style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>CVE / Advisory</th>
                  <th style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Vulnerability</th>
                  <th style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {riskyPackages.map((pkg) => (
                  <tr key={pkg.id || pkg.name} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{pkg.name}</span>
                      <span style={{ marginLeft: '6px', fontSize: '12px', color: '#64748B' }}>
                        v{pkg.version}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      >
                        {pkg.cve_id || 'GHSA-Advisory'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            pkg.severity === 'CRITICAL'
                              ? '#FEF2F2'
                              : pkg.severity === 'HIGH'
                              ? '#FFF7ED'
                              : '#FEFCE8',
                          color:
                            pkg.severity === 'CRITICAL'
                              ? '#DC2626'
                              : pkg.severity === 'HIGH'
                              ? '#C2410C'
                              : '#854D0E',
                          border: `1px solid ${
                            pkg.severity === 'CRITICAL'
                              ? '#FCA5A5'
                              : pkg.severity === 'HIGH'
                              ? '#FDBA74'
                              : '#FEF08A'
                          }`,
                        }}
                      >
                        {pkg.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569', fontSize: '12px' }}>
                      {pkg.vulnerability_title || `Security flaw identified in ${pkg.name}`}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Link
                        href={`/code/dependencies/vulnerabilities?search=${encodeURIComponent(pkg.name)}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2563EB',
                          fontWeight: 600,
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        Investigate <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Package Inventory Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Controls Bar: Search & Status Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              minWidth: '260px',
            }}
          >
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder={`Search ${title} packages...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(['ALL', 'SAFE', 'VULNERABLE', 'OUTDATED'] as const).map((st) => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    backgroundColor: isActive ? '#0F172A' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {st === 'ALL' ? 'All Packages' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 0' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: '40px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : paginatedItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: '#64748B',
              fontSize: '13px',
              gap: '10px',
            }}
          >
            <Package size={36} color="#CBD5E1" />
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>
              No {title} packages match your query
            </div>
            <div style={{ color: '#94A3B8', fontSize: '12px' }}>
              Try searching with another package name or clear the status filter.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Package</th>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Version</th>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>License</th>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Scope</th>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Security Status</th>
                  <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Update Drift</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => {
                  const isVuln = (item.vulnerability_count || 0) > 0;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #F8FAFC',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#F1F5F9',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#334155',
                          }}
                        >
                          v{item.version}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>
                        {item.license || 'MIT'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            color: item.is_direct ? '#2563EB' : '#64748B',
                            fontWeight: 500,
                          }}
                        >
                          {item.is_direct ? 'Direct' : 'Transitive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isVuln ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: '1px solid #FECACA',
                            }}
                          >
                            <AlertTriangle size={12} />
                            {item.vulnerability_count} {item.vulnerability_count === 1 ? 'Vulnerability' : 'Vulnerabilities'}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: '1px solid #BBF7D0',
                            }}
                          >
                            <ShieldCheck size={12} />
                            Clean
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {item.is_outdated ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#D97706',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            <ArrowUp size={12} />
                            Outdated (v{item.latest_version})
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '11px' }}>Latest</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              marginTop: '16px',
              borderTop: '1px solid #F1F5F9',
              fontSize: '12px',
              color: '#64748B',
            }}
          >
            <span>
              Showing {Math.min(filteredItems.length, (page - 1) * pageSize + 1)} to{' '}
              {Math.min(filteredItems.length, page * pageSize)} of {filteredItems.length} packages
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: page <= 1 ? '#F8FAFC' : '#FFFFFF',
                  color: page <= 1 ? '#CBD5E1' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
                  color: page >= totalPages ? '#CBD5E1' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
