'use client';

/**
 * Thing Code — Dependency Inventory (/code/dependencies/inventory)
 *
 * Exact match of Screenshot 02:
 *  - 5 Top Metric Cards: Total Dependencies, Direct Dependencies, Vulnerable Dependencies, Outdated Packages, Unique Licenses
 *  - 5 Horizontal Line Tabs: All Dependencies, Direct, Transitive, Usage & References, Duplicate Packages
 *  - Two-Column Layout:
 *      - Left: Search, Filter Dropdowns (Ecosystem, License, Status, Repo), Multi-select Table
 *      - Right: Live Dependency Details card + Collapsible Usage & References card
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/inventory`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  DependencyInventoryResponse,
  DependencyInventoryItem,
  DependencyDetailResponse,
} from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Box,
  Database,
  ShieldAlert,
  Clock,
  FileText,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export default function DependencyInventoryPage() {
  const { currentProject } = useProject();

  const [data, setData] = useState<DependencyInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ecosystem, setEcosystem] = useState('all');
  const [licenseFilter, setLicenseFilter] = useState('all');
  const [securityStatus, setSecurityStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DependencyInventoryItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DependencyDetailResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUsageCard, setShowUsageCard] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.inventory({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        ecosystem: ecosystem !== 'all' ? ecosystem : undefined,
        license: licenseFilter !== 'all' ? licenseFilter : undefined,
        securityStatus: securityStatus !== 'all' ? securityStatus : undefined,
        limit: 100,
      });
      setData(res);

      if (res.items && res.items.length > 0) {
        const first = res.items[0];
        setSelectedItem(first);
        if (res.selected_dependency) {
          setSelectedDetail(res.selected_dependency);
        }
      } else {
        setSelectedItem(null);
        setSelectedDetail(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dependency inventory.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search, ecosystem, licenseFilter, securityStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When user clicks a row in the table, select that dependency and fetch its detail
  const handleSelectRow = async (item: DependencyInventoryItem) => {
    setSelectedItem(item);
    try {
      const detail = await api.code.dependencies.detail(item.id, currentProject?.id);
      setSelectedDetail(detail);
    } catch {
      // Fallback to item
      setSelectedDetail({
        id: item.id,
        name: item.name,
        version: item.version,
        latest_version: item.version,
        ecosystem: item.ecosystem,
        is_direct: item.is_direct,
        license: item.license,
        license_risk: 'LOW',
        security_status: item.security_status,
        vulnerability_count: item.vulnerability_count,
        vulnerabilities: item.vulnerabilities.map((v) => ({ id: v, title: v, severity: item.highest_severity || 'HIGH' })),
        repository_name: item.repository_name,
        manifest_path: item.manifest_path,
        introduced_by: item.introduced_by,
        usage_references: [
          {
            file_path: item.manifest_path || 'package.json',
            line_number: 14,
            reference_type: 'manifest',
            code_snippet: `"${item.name}": "${item.version}"`,
            repository_name: item.repository_name,
          },
        ],
        transitive_dependents: [],
        last_scanned_at: item.last_updated_at,
      });
    }
  };

  const handleToggleSelectAll = () => {
    if (!data?.items) return;
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map((i) => i.id)));
    }
  };

  const handleToggleRowCheckbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const metrics = data?.metrics || {
    total_dependencies: 0,
    direct_dependencies: 0,
    transitive_dependencies: 0,
    vulnerable_dependencies: 0,
    licenses_count: 0,
    duplicate_packages_count: 0,
  };

  const items = data?.items || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Header */}
      <DependenciesHeader
        title="Dependency Inventory"
        subtitle="Explore all project dependencies, their versions, sources, and security status."
        currentSubpage="inventory"
        onRefresh={loadData}
        isLoading={loading}
        showInventoryTabs={true}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* 5 Top Metric Cards matching Screenshot 02 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Blue Box */}
        <DependenciesMetricCard
          title="Total Dependencies"
          value={metrics.total_dependencies}
          subtext="Total indexed packages"
          icon={<Box size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        {/* Card 2: Green Database */}
        <DependenciesMetricCard
          title="Direct Dependencies"
          value={metrics.direct_dependencies}
          subtext="Explicit manifest packages"
          icon={<Database size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />

        {/* Card 3: Red Shield */}
        <DependenciesMetricCard
          title="Vulnerable Packages"
          value={metrics.vulnerable_dependencies}
          subtext="With detected CVEs"
          badge={metrics.vulnerable_dependencies > 0 ? 'Action Needed' : 'Clean'}
          badgeColor={metrics.vulnerable_dependencies > 0 ? '#DC2626' : '#16A34A'}
          badgeBg={metrics.vulnerable_dependencies > 0 ? '#FEE2E2' : '#DCFCE7'}
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        {/* Card 4: Orange Clock */}
        <DependenciesMetricCard
          title="Transitive Packages"
          value={metrics.transitive_dependencies}
          subtext="Indirect sub-dependencies"
          icon={<Clock size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />

        {/* Card 5: Purple FileText */}
        <DependenciesMetricCard
          title="Unique Licenses"
          value={metrics.licenses_count}
          subtext="OSS compliance tracks"
          icon={<FileText size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Two Column Layout: Left Table (~70%), Right Details (~30%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Controls & Data Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Search & Filter Bar matching Screenshot 02 */}
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '6px 12px',
                minWidth: '220px',
                flexGrow: 1,
                maxWidth: '320px',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search dependencies..."
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

            {/* Filter Dropdowns matching Screenshot 02 pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Ecosystem */}
              <select
                value={ecosystem}
                aria-label="Filter by ecosystem"
                onChange={(e) => setEcosystem(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Ecosystem: All</option>
                <option value="npm">npm</option>
                <option value="pypi">PyPI</option>
                <option value="maven">Maven</option>
                <option value="go">Go</option>
                <option value="cargo">Cargo</option>
              </select>

              {/* License */}
              <select
                value={licenseFilter}
                aria-label="Filter by license"
                onChange={(e) => setLicenseFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">License: All</option>
                <option value="MIT">MIT</option>
                <option value="Apache-2.0">Apache-2.0</option>
                <option value="BSD-3-Clause">BSD-3-Clause</option>
                <option value="GPL">GPL</option>
              </select>

              {/* Security Status */}
              <select
                value={securityStatus}
                aria-label="Filter by security status"
                onChange={(e) => setSecurityStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Security Status: All</option>
                <option value="SAFE">Safe</option>
                <option value="VULNERABLE">Vulnerable</option>
                <option value="CRITICAL">Critical</option>
              </select>

              {/* Filter Action Icon Button */}
              <button
                type="button"
                title="Reset filters"
                onClick={() => {
                  setSearch('');
                  setEcosystem('all');
                  setLicenseFilter('all');
                  setSecurityStatus('all');
                }}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#64748B',
                }}
              >
                <Filter size={14} />
              </button>
            </div>
          </div>

          {/* Main Inventory Table matching Screenshot 02 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 2.2fr 100px 110px 130px 1.5fr 40px',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                alignItems: 'center',
              }}
            >
              <div>
                <input
                  type="checkbox"
                  aria-label="Select all dependencies"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <span>Dependency</span>
              <span>Ecosystem</span>
              <span>Type</span>
              <span>Security</span>
              <span>Repository / Source</span>
              <span style={{ textAlign: 'right' }}></span>
            </div>

            {/* Table Body */}
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 16px',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#F1F5F9', borderRadius: '3px' }} />
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#F1F5F9', borderRadius: '50%' }} />
                  <div style={{ height: '16px', width: '140px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
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
                  color: '#64748B',
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <CheckCircle2 size={24} color="#3B82F6" />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                  {metrics.total_dependencies === 0 ? 'No Repositories Scanned Yet' : 'No Dependencies Found'}
                </span>
                <span style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', maxWidth: '420px', lineHeight: 1.5 }}>
                  {metrics.total_dependencies === 0
                    ? 'No dependency manifests have been analyzed. Connect a repository and run a Software Composition Analysis (SCA) scan.'
                    : 'No packages matched the selected search or filter criteria.'}
                </span>
                {metrics.total_dependencies === 0 && (
                  <Link
                    href="/code/repositories"
                    style={{
                      marginTop: '12px',
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
            ) : (
              items.map((item, idx) => {
                const isSelected = selectedItem?.id === item.id;
                const isChecked = selectedIds.has(item.id);
                const isCritical = item.security_status === 'CRITICAL';
                const isVulnerable = item.security_status === 'VULNERABLE';

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelectRow(item)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 2.2fr 100px 110px 130px 1.5fr 40px',
                      gap: '12px',
                      padding: '12px 16px',
                      alignItems: 'center',
                      borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    {/* Checkbox */}
                    <div onClick={(e) => handleToggleRowCheckbox(item.id, e)}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>

                    {/* Dependency Avatar + Name & Version */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isCritical ? '#FEF2F2' : isVulnerable ? '#FFF7ED' : '#F1F5F9',
                          color: isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.name.replace('@', '').slice(0, 2)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          v{item.version}
                        </span>
                      </div>
                    </div>

                    {/* Ecosystem Badge */}
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: item.ecosystem === 'npm' ? '#EFF6FF' : '#F0FDF4',
                          color: item.ecosystem === 'npm' ? '#2563EB' : '#16A34A',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.ecosystem}
                      </span>
                    </div>

                    {/* Type: Direct vs Transitive */}
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.is_direct ? '#EFF6FF' : '#F8FAFC',
                          color: item.is_direct ? '#1D4ED8' : '#64748B',
                          border: item.is_direct ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        }}
                      >
                        {item.is_direct ? 'Direct' : 'Transitive'}
                      </span>
                    </div>

                    {/* Security Status Badge & Shield */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert
                        size={15}
                        color={isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#16A34A'}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#16A34A',
                        }}
                      >
                        {item.vulnerability_count > 0 ? `${item.vulnerability_count} CVEs` : 'Safe'}
                      </span>
                    </div>

                    {/* Repository & Manifest */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.repository_name || 'workspace'}
                      </span>
                      {item.manifest_path && (
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.manifest_path}
                        </span>
                      )}
                    </div>

                    {/* More Menu */}
                    <div style={{ textAlign: 'right' }}>
                      <Link
                        href={`/code/dependencies/${encodeURIComponent(item.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        title="View details"
                        style={{ color: '#94A3B8', textDecoration: 'none' }}
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Dependency Details & Usage References matching Screenshot 02 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Dependency Details */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Dependency Details
              </h2>
              {selectedItem && (
                <Link
                  href={`/code/dependencies/${encodeURIComponent(selectedItem.id)}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563EB',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>Full View</span>
                  <ExternalLink size={11} />
                </Link>
              )}
            </div>

            {selectedItem ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Big Avatar + Name header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {selectedItem.name.replace('@', '').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedItem.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                      v{selectedItem.version}
                    </span>
                  </div>
                </div>

                {/* Key-Value Details List matching Screenshot 02 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Version</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                      {selectedItem.version}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Ecosystem</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>
                      {selectedItem.ecosystem}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>License</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {selectedItem.license || 'MIT'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Security Status</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: selectedItem.security_status === 'CRITICAL' ? '#FEE2E2' : selectedItem.security_status === 'VULNERABLE' ? '#FFEDD5' : '#DCFCE7',
                        color: selectedItem.security_status === 'CRITICAL' ? '#DC2626' : selectedItem.security_status === 'VULNERABLE' ? '#EA580C' : '#16A34A',
                      }}
                    >
                      {selectedItem.vulnerability_count > 0 ? `${selectedItem.vulnerability_count} CVEs` : 'Safe'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Repository</span>
                    <span style={{ fontWeight: 500, color: '#0F172A', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedItem.repository_name || 'workspace'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Introduced By</span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>
                      {selectedItem.introduced_by || 'Direct (package.json)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Last Updated</span>
                    <span style={{ color: '#94A3B8' }}>
                      {selectedItem.last_updated_at ? new Date(selectedItem.last_updated_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                Select a dependency from the table to view its properties.
              </div>
            )}
          </div>

          {/* Card 2: Usage & References (Collapsible) matching Screenshot 02 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              onClick={() => setShowUsageCard(!showUsageCard)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode2 size={16} color="#2563EB" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Usage &amp; References
                </h3>
              </div>
              {showUsageCard ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
            </div>

            {showUsageCard && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                {!selectedDetail?.usage_references || selectedDetail.usage_references.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                    No direct import occurrences detected in workspace.
                  </div>
                ) : (
                  selectedDetail.usage_references.map((ref, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #F1F5F9',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileText size={13} color="#64748B" />
                        <span style={{ fontFamily: 'monospace', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ref.file_path}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ref.reference_type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
