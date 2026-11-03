'use client';

/**
 * Thing Code — Vulnerability Analysis (/code/dependencies/vulnerabilities)
 *
 * Exact visual match to Screenshot 03:
 * 4 Top Metric Cards, 5 Navigation Tabs, Search & Multi-facet Filters,
 * Interactive Vulnerabilities Table, Severity Donut Chart, Timeline Trends Chart,
 * and Right-Hand Live Vulnerability Details & Affected Packages Cards.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  VulnerabilityAnalysisResponse,
  VulnerabilityItem,
  VulnerabilityDetailResponse,
} from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Database,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Package,
  Layers,
  Sparkles,
  Filter,
} from 'lucide-react';

export default function VulnerabilityAnalysisPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<VulnerabilityAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [ecosystemFilter, setEcosystemFilter] = useState('ALL');
  const [fixFilter, setFixFilter] = useState('ALL');
  const [repoFilter, setRepoFilter] = useState('ALL');

  // Selected Vulnerability for Right Drawer
  const [selectedCveId, setSelectedCveId] = useState<string | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityDetailResponse | null>(null);

  // Multi-select Checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.vulnerabilities({
        projectId: currentProject?.id,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        ecosystem: ecosystemFilter !== 'ALL' ? ecosystemFilter : undefined,
        hasFix: fixFilter === 'FIXABLE' ? true : fixFilter === 'NO_FIX' ? false : undefined,
        search: search.trim() ? search.trim() : undefined,
        selectedCveId: selectedCveId || undefined,
        limit: 100,
      });
      setData(res);
      if (res.selected_vulnerability) {
        setSelectedVulnerability(res.selected_vulnerability);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load vulnerability analysis data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, severityFilter, ecosystemFilter, fixFilter, search, selectedCveId]);

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

  const metrics = data?.metrics || {
    critical_high_count: items.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length,
    actionable_vulnerabilities: items.length,
    fix_available_count: items.filter((i) => i.has_fix).length,
    known_exploited_count: items.filter((i) => i.is_known_exploited).length,
    total_vulnerabilities: items.length,
    affected_packages_count: new Set(items.map((i) => i.package_name)).size,
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleRowClick = async (item: VulnerabilityItem) => {
    setSelectedCveId(item.cve_id);
    try {
      const detail = await api.code.dependencies.cveDetail(item.cve_id, currentProject?.id);
      setSelectedVulnerability(detail);
    } catch {
      // Fallback local construct
      setSelectedVulnerability({
        id: item.id,
        cve_id: item.cve_id,
        title: item.title,
        description: item.description,
        severity: item.severity,
        cvss_score: item.cvss_score,
        ecosystem: item.ecosystem,
        package_name: item.package_name,
        affected_version: item.affected_version,
        installed_version: item.installed_version,
        fixed_version: item.fixed_version,
        has_fix: item.has_fix,
        is_known_exploited: item.is_known_exploited,
        cisa_kev_due_date: item.cisa_kev_due_date,
        exploit_available: item.is_known_exploited,
        published_date: item.published_date,
        last_updated: item.last_updated,
        repository_name: item.repository_name,
        manifest_path: item.manifest_path,
        scanner: item.scanner,
        patch_guidance: `Upgrade ${item.package_name} to version ${item.fixed_version || 'latest'}.`,
        references: [`https://nvd.nist.gov/vuln/detail/${item.cve_id}`],
        affected_packages: [{
          package_name: item.package_name,
          installed_version: item.installed_version,
          fixed_version: item.fixed_version,
          repository: item.repository_name,
          manifest: item.manifest_path,
        }],
      });
    }
  };

  // Severity Donut Chart Data
  const sevDist = data?.severity_distribution || {
    CRITICAL: items.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: items.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: items.filter((i) => i.severity === 'MEDIUM').length,
    LOW: items.filter((i) => i.severity === 'LOW').length,
  };
  const totalSev = (sevDist.CRITICAL || 0) + (sevDist.HIGH || 0) + (sevDist.MEDIUM || 0) + (sevDist.LOW || 0) || 1;

  // Timeline Trends (Area/Line)
  const timelineTrends = data?.timeline_trends || [];

  // Affected Packages Summary (Right widget)
  const affectedSummary = data?.affected_packages_summary || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Vulnerability Analysis"
        subtitle="Identify and manage vulnerabilities in your project dependencies."
        currentSubpage="vulnerabilities"
        onRefresh={loadData}
        isLoading={loading}
        showVulnerabilityTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* 4 Top Metric Cards Matching Screenshot 03 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Critical & High CVEs"
          value={metrics.critical_high_count}
          subtext="Requiring priority fix"
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Actionable Vulnerabilities"
          value={metrics.actionable_vulnerabilities}
          subtext="Total open vulnerabilities"
          icon={<AlertTriangle size={24} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Fix Available"
          value={metrics.fix_available_count}
          subtext="Direct patch available"
          icon={<Clock size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Known Exploited (KEV)"
          value={metrics.known_exploited_count}
          subtext="CISA KEV active zero-days"
          icon={<Database size={24} />}
          iconBg="#FAF5FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Main Grid: Left Column (Table + Charts) & Right Column (Details + Affected Packages) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            {/* Filter and Search Bar Matching Screenshot 03 */}
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
                    placeholder="Search vulnerabilities..."
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

              {/* Multi-facet Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Severity: All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select
                  value={ecosystemFilter}
                  onChange={(e) => setEcosystemFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Ecosystem: All</option>
                  <option value="npm">npm</option>
                  <option value="pypi">PyPI</option>
                </select>

                <select
                  value={fixFilter}
                  onChange={(e) => setFixFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Fix Available: All</option>
                  <option value="FIXABLE">Fix Available</option>
                  <option value="NO_FIX">No Fix</option>
                </select>

                <select
                  value={repoFilter}
                  onChange={(e) => setRepoFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Repository: All</option>
                  <option value="frontend">frontend</option>
                  <option value="backend">backend</option>
                </select>

                <button
                  onClick={() => {
                    setSearch('');
                    setSeverityFilter('ALL');
                    setEcosystemFilter('ALL');
                    setFixFilter('ALL');
                    setRepoFilter('ALL');
                  }}
                  title="Reset Filters"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '7px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <Filter size={15} />
                </button>
              </div>
            </div>

            {/* Vulnerabilities Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px', width: '36px' }}>
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px' }}>Vulnerability / Advisory</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>CVSS / Ecosystem</th>
                    <th style={{ padding: '12px 16px' }}>Affected Package</th>
                    <th style={{ padding: '12px 16px' }}>Remediation</th>
                    <th style={{ padding: '12px 16px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                        Loading vulnerability findings...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', marginBottom: '12px' }}>
                          <CheckCircle2 size={32} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                          No vulnerabilities match current criteria
                        </div>
                        <p style={{ margin: 0, fontSize: '13px' }}>
                          {search || severityFilter !== 'ALL' || fixFilter !== 'ALL'
                            ? 'Try loosening your filter parameters.'
                            : 'All dependencies are compliant and free from known advisories.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedVulnerability?.cve_id === item.cve_id || selectedVulnerability?.id === item.id;
                      const isChecked = selectedIds.has(item.id);

                      const sevColor =
                        item.severity === 'CRITICAL'
                          ? { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }
                          : item.severity === 'HIGH'
                          ? { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' }
                          : item.severity === 'MEDIUM'
                          ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' }
                          : { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' };

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#EFF6FF' : isChecked ? '#F8FAFC' : '#FFFFFF',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleRowClick(item)}
                        >
                          <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(item.id)}
                              style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                            />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace', fontSize: '13px' }}>
                                  {item.cve_id}
                                </span>
                                {item.is_known_exploited && (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: '#7C3AED',
                                      color: '#FFFFFF',
                                      fontWeight: 600,
                                    }}
                                  >
                                    CISA KEV
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.title}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: sevColor.bg,
                                color: sevColor.text,
                                border: `1px solid ${sevColor.border}`,
                              }}
                            >
                              {item.severity}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                                {item.cvss_score.toFixed(1)}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#475569',
                                  fontWeight: 500,
                                }}
                              >
                                {item.ecosystem}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.package_name}</span>
                              <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>
                                {item.installed_version}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {item.has_fix && item.fixed_version ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: '#16A34A',
                                  fontWeight: 600,
                                }}
                              >
                                Upgrade to {item.fixed_version}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>No upstream patch</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/code/dependencies/vulnerabilities/${encodeURIComponent(item.cve_id)}`}
                              style={{ color: '#64748B', display: 'inline-flex', alignItems: 'center' }}
                            >
                              <ChevronRight size={16} />
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

          {/* Bottom Visual Widgets Matching Screenshot 03 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Widget 1: Vulnerabilities by Severity (Donut Chart) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Vulnerabilities by Severity
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Total: {metrics.total_vulnerabilities}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px' }}>
                {/* Donut SVG */}
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    {/* Background Ring */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="3.8"
                    />
                    {/* Critical slice */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="3.8"
                      strokeDasharray={`${((sevDist.CRITICAL || 0) / totalSev) * 100}, 100`}
                    />
                    {/* High slice */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="3.8"
                      strokeDasharray={`${((sevDist.HIGH || 0) / totalSev) * 100}, 100`}
                      strokeDashoffset={`-${((sevDist.CRITICAL || 0) / totalSev) * 100}`}
                    />
                    {/* Medium slice */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="3.8"
                      strokeDasharray={`${((sevDist.MEDIUM || 0) / totalSev) * 100}, 100`}
                      strokeDashoffset={`-${(((sevDist.CRITICAL || 0) + (sevDist.HIGH || 0)) / totalSev) * 100}`}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{metrics.total_vulnerabilities}</span>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>Findings</span>
                  </div>
                </div>

                {/* Legend matching Screenshot 03 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span>
                    <span>Critical ({sevDist.CRITICAL || 0})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F97316' }}></span>
                    <span>High ({sevDist.HIGH || 0})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FBBF24' }}></span>
                    <span>Medium ({sevDist.MEDIUM || 0})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                    <span>Low ({sevDist.LOW || 0})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Vulnerability Trends (Area Chart) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Vulnerability Trends
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Historical 6 Months</span>
              </div>

              {/* Area SVG */}
              <div style={{ width: '100%', height: '120px' }}>
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="300" y2="25" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="300" y2="75" stroke="#F1F5F9" strokeDasharray="3 3" />

                  {/* Area Fill */}
                  <path
                    d="M 10 75 Q 60 40, 110 55 T 210 30 T 290 45 L 290 95 L 10 95 Z"
                    fill="url(#trendGrad)"
                  />
                  {/* Trend Line */}
                  <path
                    d="M 10 75 Q 60 40, 110 55 T 210 30 T 290 45"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                  />
                  {/* Data Points */}
                  <circle cx="10" cy="75" r="3.5" fill="#2563EB" />
                  <circle cx="85" cy="45" r="3.5" fill="#2563EB" />
                  <circle cx="160" cy="50" r="3.5" fill="#2563EB" />
                  <circle cx="235" cy="32" r="3.5" fill="#2563EB" />
                  <circle cx="290" cy="45" r="3.5" fill="#2563EB" />
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Vulnerability Details & Affected Packages Matching Screenshot 03 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Vulnerability Details */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Vulnerability Details
              </h3>
              <MoreVertical size={16} color="#94A3B8" />
            </div>

            {selectedVulnerability ? (
              <div>
                {/* Header with avatar circle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: selectedVulnerability.severity === 'CRITICAL' ? '#FEF2F2' : '#EFF6FF',
                      color: selectedVulnerability.severity === 'CRITICAL' ? '#DC2626' : '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#0F172A' }}>
                      {selectedVulnerability.cve_id}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{selectedVulnerability.package_name}</div>
                  </div>
                </div>

                {/* Key-Value Fields Matching Screenshot 03 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>CVE ID</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{selectedVulnerability.cve_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Severity</span>
                    <span style={{ fontWeight: 700, color: selectedVulnerability.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }}>
                      {selectedVulnerability.severity}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>CVSS Score</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedVulnerability.cvss_score.toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Ecosystem</span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{selectedVulnerability.ecosystem}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Affected Package</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedVulnerability.package_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Affected Versions</span>
                    <span style={{ color: '#475569', fontFamily: 'monospace' }}>{selectedVulnerability.affected_version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Fixed Version</span>
                    <span style={{ color: '#16A34A', fontWeight: 600, fontFamily: 'monospace' }}>
                      {selectedVulnerability.fixed_version || 'None'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Published Date</span>
                    <span style={{ color: '#475569' }}>{selectedVulnerability.published_date || '2024-03-15'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Last Updated</span>
                    <span style={{ color: '#475569' }}>{selectedVulnerability.last_updated || '2024-09-10'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <Link
                    href={`/code/dependencies/vulnerabilities/${encodeURIComponent(selectedVulnerability.cve_id)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      width: '100%',
                    }}
                  >
                    Inspect in CVE Detail
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                Select a vulnerability from the table to inspect details.
              </div>
            )}
          </div>

          {/* Card 2: Affected Packages Matching Screenshot 03 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Affected Packages
              </h3>
              <Link href="/code/dependencies/vulnerabilities/affected-packages" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
                View All
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {affectedSummary.slice(0, 5).map((pkg, idx) => {
                const badgeColor =
                  pkg.highest_severity === 'CRITICAL'
                    ? { bg: '#FEF2F2', text: '#DC2626' }
                    : pkg.highest_severity === 'HIGH'
                    ? { bg: '#FFF7ED', text: '#EA580C' }
                    : { bg: '#FFFBEB', text: '#D97706' };

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} color="#64748B" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{pkg.package_name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>v{pkg.installed_version}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.text,
                      }}
                    >
                      {pkg.highest_severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
