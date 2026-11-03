'use client';

/**
 * Thing Code — Duplicate Packages (/code/dependencies/duplicates)
 *
 * Identifies packages installed with conflicting/multiple versions across repository manifests.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/duplicates`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { DuplicatePackagesResponse, DuplicatePackageItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Copy,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function DuplicatePackagesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DuplicatePackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.duplicates(currentProject?.id);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load duplicate packages.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];

  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchEco = item.ecosystem.toLowerCase().includes(q);
      const matchRepo = item.repositories_affected.some((r) => r.toLowerCase().includes(q));
      if (!matchName && !matchEco && !matchRepo) return false;
    }
    if (riskFilter !== 'ALL' && item.risk_level.toUpperCase() !== riskFilter) {
      return false;
    }
    return true;
  });

  const totalCollisions = items.reduce((acc, curr) => acc + curr.version_count, 0);
  const highRiskCount = items.filter((i) => i.risk_level === 'HIGH').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Duplicate Packages"
        subtitle="Detect and consolidate divergent package versions installed across multiple repository manifests."
        currentSubpage="duplicates"
        onRefresh={loadData}
        isLoading={loading}
        showInventoryTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Duplicate Packages"
          value={data?.total_duplicates ?? items.length}
          subtext="Packages with multiple versions"
          icon={<Copy size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Affected Repositories"
          value={data?.affected_repositories_count ?? 0}
          subtext="Repositories with collisions"
          icon={<GitBranch size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Version Collisions"
          value={totalCollisions}
          subtext="Total conflicting versions"
          icon={<AlertTriangle size={24} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />
        <DependenciesMetricCard
          title="High Risk Collisions"
          value={highRiskCount}
          subtext="Involving vulnerable versions"
          icon={<ShieldAlert size={24} />}
          iconBg="#FAF5FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Potential Risk Summary Callout */}
      {data?.potential_risk_summary && items.length > 0 && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Sparkles size={20} color="#2563EB" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13.5px', color: '#1E40AF', lineHeight: '1.4' }}>
            <strong>Consolidation Impact:</strong> {data.potential_risk_summary} Standardizing these packages to a single version reduces bundle size and eliminates dependency confusion risks.
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Filters and Search Toolbar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', maxWidth: '420px' }}>
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
                placeholder="Search duplicate package or repository..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Risk Level:</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
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
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Table of Duplicates */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 18px', width: '36px' }}></th>
                <th style={{ padding: '12px 18px' }}>Package & Ecosystem</th>
                <th style={{ padding: '12px 18px' }}>Installed Versions</th>
                <th style={{ padding: '12px 18px' }}>Affected Repositories</th>
                <th style={{ padding: '12px 18px' }}>Risk Level</th>
                <th style={{ padding: '12px 18px' }}>Remediation Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    Scanning manifests for duplicate package versions...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', marginBottom: '12px' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                      No duplicate package versions found
                    </div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      {search || riskFilter !== 'ALL'
                        ? 'No packages match your search filters.'
                        : 'All dependencies across monitored repositories are unified to single target versions.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedPackageId === item.id;
                  const isHighRisk = item.risk_level.toUpperCase() === 'HIGH';

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedPackageId(isExpanded ? null : item.id)}
                      >
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          {isExpanded ? <ChevronDown size={16} color="#64748B" /> : <ChevronRight size={16} color="#94A3B8" />}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
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
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {item.installed_versions.map((ver, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                  backgroundColor: idx === 0 ? '#FEF2F2' : '#EFF6FF',
                                  color: idx === 0 ? '#DC2626' : '#2563EB',
                                  border: `1px solid ${idx === 0 ? '#FECACA' : '#BFDBFE'}`,
                                }}
                              >
                                v{ver}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#475569' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.repositories_affected.map((repo, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '12px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  color: '#334155',
                                }}
                              >
                                {repo}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: isHighRisk ? '#FEF2F2' : '#FFFBEB',
                              color: isHighRisk ? '#DC2626' : '#D97706',
                              border: `1px solid ${isHighRisk ? '#FECACA' : '#FDE68A'}`,
                            }}
                          >
                            <AlertTriangle size={12} />
                            {item.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', maxWidth: '340px' }}>
                          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
                            {item.remediation_suggestion}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer / Manifest View */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <td colSpan={6} style={{ padding: '16px 24px 20px 48px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                              <div
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0',
                                  padding: '14px',
                                }}
                              >
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileText size={15} color="#64748B" />
                                  Manifest Files Referencing this Package
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {item.manifest_files.map((file, fIdx) => (
                                    <div
                                      key={fIdx}
                                      style={{
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: '#334155',
                                        backgroundColor: '#F8FAFC',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #F1F5F9',
                                      }}
                                    >
                                      {file}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0',
                                  padding: '14px',
                                }}
                              >
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                                  Quick Navigation
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <Link
                                    href={`/code/dependencies/${encodeURIComponent(item.name)}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '7px 12px',
                                      backgroundColor: '#2563EB',
                                      color: '#FFFFFF',
                                      borderRadius: '6px',
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    Inspect in Dependency Detail
                                    <ExternalLink size={13} />
                                  </Link>
                                  <Link
                                    href={`/code/dependencies/usage?search=${encodeURIComponent(item.name)}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '7px 12px',
                                      backgroundColor: '#FFFFFF',
                                      color: '#334155',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    View Code Call-Sites
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
