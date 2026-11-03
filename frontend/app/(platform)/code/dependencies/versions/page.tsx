'use client';

/**
 * Thing Code — Package Versions & Upgrades (/code/dependencies/versions)
 *
 * Exact visual match to Screenshot 04:
 * 4 Top Metric Cards (Total Packages, Outdated Dependencies, Vulnerable Packages, End-of-Life Packages),
 * 5 Navigation Tabs (Version Inventory, Outdated Dependencies, Upgrade Recommendations, Breaking Change Analysis, End-of-Life Packages),
 * Search & Multi-facet Filter Bar,
 * Multi-select Package Versions Table with SemVer drift indicators (up/down arrows),
 * 3 Bottom Visual Widgets (Version Status Donut Chart, Upgrade Opportunities Bar Chart, Ecosystem Breakdown Bars),
 * and Right Column Live Package Details Card.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  PackageVersionsResponse,
  PackageVersionItem,
} from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Box,
  ArrowUp,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  ExternalLink,
  Layers,
  FileCode,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export default function PackageVersionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PackageVersionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [ecosystemFilter, setEcosystemFilter] = useState('ALL');
  const [versionStatusFilter, setVersionStatusFilter] = useState('ALL');
  const [upgradeFilter, setUpgradeFilter] = useState('ALL');
  const [repoFilter, setRepoFilter] = useState('ALL');

  // Selected Package for Right Column Details Card
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageVersionItem | null>(null);

  // Multi-select Checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.versions({
        projectId: currentProject?.id,
        ecosystem: ecosystemFilter !== 'ALL' ? ecosystemFilter : undefined,
        versionStatus: versionStatusFilter !== 'ALL' ? versionStatusFilter : undefined,
        upgradeAvailable: upgradeFilter !== 'ALL' ? upgradeFilter : undefined,
        search: search.trim() ? search.trim() : undefined,
        selectedPackageId: selectedPackageId || undefined,
        limit: 100,
      });
      setData(res);
      if (res.selected_package) {
        setSelectedPackage(res.selected_package);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load package versions data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, ecosystemFilter, versionStatusFilter, upgradeFilter, search, selectedPackageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = useMemo(() => data?.items || [], [data?.items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (repoFilter !== 'ALL' && !item.repository_name.toLowerCase().includes(repoFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [items, repoFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const metrics = data?.metrics || {
    total_packages: items.length,
    outdated_count: items.filter((i) => i.version_status !== 'CURRENT').length,
    vulnerable_packages_count: items.filter((i) => i.security_status !== 'SAFE').length,
    eol_count: items.filter((i) => i.version_status === 'EOL').length,
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activePackage = selectedPackage || (filteredItems.length > 0 ? filteredItems[0] : null);

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Top Header matching Screenshot 04 */}
      <DependenciesHeader
        title="Package Versions & Upgrades"
        subtitle="Track package versions, identify outdated dependencies, and plan safe upgrades."
        currentSubpage="versions"
        showVersionTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* 4 Top Metric Cards matching Screenshot 04 */}
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
          value={metrics.total_packages}
          subtext="Monitored across repositories"
          icon={<Box size={20} />}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
        />
        <DependenciesMetricCard
          title="Outdated Dependencies"
          value={metrics.outdated_count}
          subtext="Newer releases available"
          icon={<ArrowUp size={20} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
        />
        <DependenciesMetricCard
          title="Vulnerable Packages"
          value={metrics.vulnerable_packages_count}
          subtext="Packages with known CVEs"
          icon={<ShieldAlert size={20} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
        />
        <DependenciesMetricCard
          title="End-of-Life Packages"
          value={metrics.eol_count}
          subtext="Unsupported by upstream"
          icon={<Clock size={20} />}
          iconBg="#FAF5FF"
          iconColor="#A855F7"
        />
      </div>

      {/* Main Grid: Left Section (Table + 3 Bottom Charts) & Right Section (Live Details Card) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filter Bar matching Screenshot 04 */}
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
              flexWrap: 'wrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: '1 1 220px',
                minWidth: '180px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
              }}
            >
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search packages..."
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

            {/* Filter Dropdowns matching Screenshot 04 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Ecosystem */}
              <select
                value={ecosystemFilter}
                onChange={(e) => setEcosystemFilter(e.target.value)}
                aria-label="Filter by ecosystem"
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">Ecosystem: All</option>
                <option value="npm">npm</option>
                <option value="pypi">PyPI</option>
                <option value="maven">Maven</option>
                <option value="cargo">Cargo</option>
                <option value="go">Go</option>
              </select>

              {/* Version Status */}
              <select
                value={versionStatusFilter}
                onChange={(e) => setVersionStatusFilter(e.target.value)}
                aria-label="Filter by version status"
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">Version Status: All</option>
                <option value="CURRENT">Current</option>
                <option value="MINOR_DRIFT">Minor Update</option>
                <option value="MAJOR_DRIFT">Major Drift</option>
                <option value="EOL">End-of-Life</option>
              </select>

              {/* Upgrade Available */}
              <select
                value={upgradeFilter}
                onChange={(e) => setUpgradeFilter(e.target.value)}
                aria-label="Filter by upgrade available"
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">Upgrade Available: All</option>
                <option value="yes">Yes (Outdated)</option>
                <option value="no">No (Current)</option>
              </select>

              {/* Repository */}
              <select
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
                aria-label="Filter by repository"
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">Repository: All</option>
                <option value="frontend">frontend</option>
                <option value="backend">backend</option>
              </select>

              <button
                title="Advanced Filter Configuration"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <Filter size={14} />
              </button>
            </div>
          </div>

          {/* Package Versions Table matching Screenshot 04 */}
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
                    <th style={{ padding: '12px 16px', width: '40px' }}>
                      <input
                        type="checkbox"
                        aria-label="Select all packages"
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Package
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Ecosystem
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Current Version
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'center' }}>
                      Drift
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Latest / Status
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', border: '2px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '13px' }}>Auditing package versions and SemVer drift...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={24} color="#3B82F6" />
                          </div>
                          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                            {items.length === 0 ? 'No Repositories Scanned Yet' : 'No Packages Match Filter'}
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                            {items.length === 0
                              ? 'No dependency manifests have been analyzed. Connect a repository and run a Software Composition Analysis (SCA) scan to view package versions and SemVer drift.'
                              : search ? `No dependencies found matching "${search}".` : 'All packages match current criteria.'}
                          </p>
                          {items.length === 0 && (
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
                    paginatedItems.map((pkg) => {
                      const isSelected = activePackage?.id === pkg.id;
                      const isChecked = selectedIds.has(pkg.id);
                      const isCurrent = pkg.version_status === 'CURRENT';
                      const isMajor = pkg.version_status === 'MAJOR_DRIFT';

                      return (
                        <tr
                          key={pkg.id}
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setSelectedPackage(pkg);
                          }}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#F0F9FF' : isChecked ? '#F8FAFC' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background 120ms ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${pkg.name}`}
                              checked={isChecked}
                              onChange={() => handleToggleSelect(pkg.id)}
                              style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                            />
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                {pkg.name}
                              </span>
                              {pkg.is_direct && (
                                <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 500 }}>
                                  direct
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                              {pkg.manifest_path}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: pkg.ecosystem === 'npm' ? '#EFF6FF' : '#ECFDF5',
                                color: pkg.ecosystem === 'npm' ? '#2563EB' : '#059669',
                                textTransform: 'uppercase',
                              }}
                            >
                              {pkg.ecosystem}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155', fontFamily: 'monospace' }}>
                            v{pkg.current_version}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {isCurrent ? (
                              <span title="Up to date" style={{ display: 'inline-flex', alignItems: 'center', color: '#10B981' }}>
                                <ArrowUpRight size={16} />
                              </span>
                            ) : isMajor ? (
                              <span title="Major SemVer Drift" style={{ display: 'inline-flex', alignItems: 'center', color: '#EF4444' }}>
                                <ArrowDownRight size={16} />
                              </span>
                            ) : (
                              <span title="Minor Update Available" style={{ display: 'inline-flex', alignItems: 'center', color: '#F59E0B' }}>
                                <ArrowUp size={16} />
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#0F172A', fontFamily: 'monospace' }}>
                                v{pkg.latest_version}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  padding: '2px 7px',
                                  borderRadius: '999px',
                                  backgroundColor: isCurrent ? '#ECFDF5' : isMajor ? '#FEF2F2' : '#FFFBEB',
                                  color: isCurrent ? '#059669' : isMajor ? '#DC2626' : '#D97706',
                                }}
                              >
                                {isCurrent ? 'Current' : isMajor ? 'Major Update' : 'Minor Update'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              title="More options"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#94A3B8',
                                borderRadius: '4px',
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination matching Screenshot 04 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <span>
                  Showing {filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                  {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} packages
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                      color: currentPage === 1 ? '#CBD5E1' : '#334155',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 6px', fontWeight: 600, color: '#0F172A' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: currentPage >= totalPages ? '#F8FAFC' : '#FFFFFF',
                      color: currentPage >= totalPages ? '#CBD5E1' : '#334155',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Package Details Card matching Screenshot 04 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            position: 'sticky',
            top: '20px',
          }}
        >
          {activePackage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Header with icon, package name and actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                      flexShrink: 0,
                    }}
                  >
                    <Box size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {activePackage.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {activePackage.ecosystem} • {activePackage.repository_name}
                    </span>
                  </div>
                </div>
                <button
                  title="More actions"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '4px',
                  }}
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Attributes List matching Screenshot 04 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Current Version</span>
                  <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                    v{activePackage.current_version}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Latest Version</span>
                  <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                    v{activePackage.latest_version}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Version Status</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: activePackage.version_status === 'CURRENT' ? '#ECFDF5' : '#FFFBEB',
                      color: activePackage.version_status === 'CURRENT' ? '#059669' : '#D97706',
                    }}
                  >
                    {activePackage.version_status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Ecosystem</span>
                  <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>
                    {activePackage.ecosystem}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>License</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {activePackage.license}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Security Status</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: activePackage.security_status === 'SAFE' ? '#ECFDF5' : '#FEF2F2',
                      color: activePackage.security_status === 'SAFE' ? '#059669' : '#DC2626',
                    }}
                  >
                    {activePackage.security_status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Repository Count</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {activePackage.repository_count}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Direct / Transitive</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {activePackage.is_direct ? 'Direct' : 'Transitive'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Last Updated</span>
                  <span style={{ color: '#64748B' }}>
                    {activePackage.last_updated_at ? new Date(activePackage.last_updated_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <Link
                  href={`/code/dependencies/versions/upgrades?package=${encodeURIComponent(activePackage.name)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'background 120ms ease',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Plan Safe Upgrade</span>
                </Link>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Link
                    href={`/code/dependencies/versions/breaking-changes?package=${encodeURIComponent(activePackage.name)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '7px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#475569',
                      textDecoration: 'none',
                    }}
                  >
                    <AlertTriangle size={13} color="#D97706" />
                    <span>Breaking Risk</span>
                  </Link>

                  <a
                    href={`https://www.npmjs.com/package/${activePackage.name}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '7px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#475569',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Registry</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94A3B8' }}>
              <Box size={32} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Select a package from the table to view real SemVer intelligence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 3 Visual Widgets matching Screenshot 04 spanning full width */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginTop: '24px',
        }}
      >
        {/* 1. Version Status Distribution (Donut Chart) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Version Status Distribution
            </h4>
            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
              Live
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
            {/* SVG Donut Chart with dynamic arcs */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
                {metrics.total_packages > 0 && (() => {
                  const total = metrics.total_packages;
                  const curPct = Math.round(((data?.status_distribution?.CURRENT || 0) / total) * 100);
                  const minPct = Math.round(((data?.status_distribution?.MINOR_DRIFT || 0) / total) * 100);
                  const majPct = Math.round(((data?.status_distribution?.MAJOR_DRIFT || 0) / total) * 100);
                  const eolPct = Math.round(((data?.status_distribution?.EOL || 0) / total) * 100);
                  
                  return (
                    <>
                      {curPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          stroke="#93C5FD"
                          strokeWidth="5.5"
                          strokeDasharray={`${curPct} ${100 - curPct}`}
                          strokeDashoffset="25"
                        />
                      )}
                      {minPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          stroke="#FDBA74"
                          strokeWidth="5.5"
                          strokeDasharray={`${minPct} ${100 - minPct}`}
                          strokeDashoffset={`${25 - curPct}`}
                        />
                      )}
                      {majPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          stroke="#FCA5A5"
                          strokeWidth="5.5"
                          strokeDasharray={`${majPct} ${100 - majPct}`}
                          strokeDashoffset={`${25 - curPct - minPct}`}
                        />
                      )}
                      {eolPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="none"
                          stroke="#C4B5FD"
                          strokeWidth="5.5"
                          strokeDasharray={`${eolPct} ${100 - eolPct}`}
                          strokeDashoffset={`${25 - curPct - minPct - majPct}`}
                        />
                      )}
                    </>
                  );
                })()}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {metrics.total_packages}
                </span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Total</span>
              </div>
            </div>
            {/* Legend with strictly real data */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FDBA74' }} />
                <span style={{ color: '#475569', flex: 1 }}>Minor Drift</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{data?.status_distribution?.MINOR_DRIFT ?? 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#93C5FD' }} />
                <span style={{ color: '#475569', flex: 1 }}>Current</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{data?.status_distribution?.CURRENT ?? 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#86EFAC' }} />
                <span style={{ color: '#475569', flex: 1 }}>Safe Upgrade</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{items.filter((i) => i.upgrade_path).length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FCA5A5' }} />
                <span style={{ color: '#475569', flex: 1 }}>Major Drift</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{data?.status_distribution?.MAJOR_DRIFT ?? 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C4B5FD' }} />
                <span style={{ color: '#475569', flex: 1 }}>End-of-Life</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{data?.status_distribution?.EOL ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Upgrade Opportunities (Vertical Bar Chart) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Upgrade Opportunities
            </h4>
            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
              SemVer
            </span>
          </div>
          {/* Chart with axes and dynamic bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '130px', padding: '10px 4px 0 4px', position: 'relative' }}>
            {/* Horizontal guide lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', height: '1px', backgroundColor: '#F1F5F9' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: '#F1F5F9' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', height: '1px', backgroundColor: '#F1F5F9' }} />

            {/* Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', zIndex: 1 }}>
              {(() => {
                const patchCount = items.filter((i) => i.upgrade_path && i.upgrade_path.current_version.split('.')[0] === i.upgrade_path.target_version.split('.')[0] && i.upgrade_path.current_version.split('.')[1] === i.upgrade_path.target_version.split('.')[1]).length;
                const minorCount = data?.status_distribution?.MINOR_DRIFT ?? 0;
                const safeCount = items.filter((i) => i.upgrade_path).length;
                const majorCount = data?.status_distribution?.MAJOR_DRIFT ?? 0;
                const total = metrics.total_packages;
                const maxVal = Math.max(total, 1);

                return [
                  { label: 'Patch', count: patchCount, height: total === 0 ? 4 : Math.max(8, Math.round((patchCount / maxVal) * 110)), color: '#CBD5E1' },
                  { label: 'Minor', count: minorCount, height: total === 0 ? 4 : Math.max(8, Math.round((minorCount / maxVal) * 110)), color: '#93C5FD' },
                  { label: 'Safe', count: safeCount, height: total === 0 ? 4 : Math.max(8, Math.round((safeCount / maxVal) * 110)), color: '#60A5FA' },
                  { label: 'Major', count: majorCount, height: total === 0 ? 4 : Math.max(8, Math.round((majorCount / maxVal) * 110)), color: '#FCA5A5' },
                  { label: 'Total', count: total, height: total === 0 ? 4 : 110, color: '#3B82F6' },
                ].map((bar, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B' }}>{bar.count}</span>
                    <div
                      title={`${bar.label}: ${bar.count}`}
                      style={{
                        width: '32px',
                        height: `${bar.height}px`,
                        backgroundColor: bar.color,
                        borderRadius: '5px 5px 0 0',
                        transition: 'height 200ms ease',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {bar.label}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* 3. Ecosystems Breakdown strictly dynamic */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Ecosystems
            </h4>
            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
              Multi-Repo
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {(() => {
              const total = metrics.total_packages;
              const npmCount = items.filter((i) => i.ecosystem?.toLowerCase() === 'npm').length;
              const pypiCount = items.filter((i) => i.ecosystem?.toLowerCase() === 'pypi').length;
              const directCount = items.filter((i) => i.is_direct).length;
              const transitiveCount = items.filter((i) => !i.is_direct).length;
              const semverCount = total;

              const getPct = (c: number) => total === 0 ? 0 : Math.round((c / total) * 100);

              return [
                { label: 'NPM Production', count: npmCount, pct: getPct(npmCount), dot: '#A855F7', barColor: '#C084FC' },
                { label: 'PyPI Backend', count: pypiCount, pct: getPct(pypiCount), dot: '#3B82F6', barColor: '#93C5FD' },
                { label: 'Direct Manifests', count: directCount, pct: getPct(directCount), dot: '#10B981', barColor: '#86EFAC' },
                { label: 'Transitive Tree', count: transitiveCount, pct: getPct(transitiveCount), dot: '#F97316', barColor: '#FDBA74' },
                { label: 'Semantic Versioned', count: semverCount, pct: total === 0 ? 0 : 100, dot: '#EAB308', barColor: '#FDE047' },
              ].map((eco, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: eco.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155', width: '130px', flexShrink: 0 }}>
                    {eco.label}
                  </span>
                  <div style={{ flex: 1, height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${eco.pct}%`,
                        height: '100%',
                        backgroundColor: eco.barColor,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', width: '45px', textAlign: 'right', flexShrink: 0 }}>
                    {eco.count} pkgs
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
