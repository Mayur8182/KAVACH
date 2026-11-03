'use client';

/**
 * Thing Code — Blast Radius Analysis (/code/dependencies/graph/blast-radius)
 *
 * Subpage 4 of Dependency Graph:
 * Quantifies the organizational impact and ripple effects of package vulnerabilities or breaking updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { BlastRadiusResponse, BlastRadiusReport } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  ShieldAlert,
  Flame,
  Radio,
  Server,
  Layers,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Package,
} from 'lucide-react';

export default function BlastRadiusPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<BlastRadiusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.blastRadius({
        projectId: currentProject?.id,
        repositoryId: selectedRepo !== 'all' ? selectedRepo : undefined,
        packageName: search || undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch blast radius analysis.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rawReports = data?.reports || [];
  const reports = rawReports.filter((r) => {
    if (tierFilter !== 'all' && r.blast_radius_tier.toLowerCase() !== tierFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  const highBlastCount = data?.high_blast_count || 0;
  const totalReports = data?.total || 0;
  const totalDownstream = reports.reduce((sum, r) => sum + r.downstream_packages_count, 0);

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'severe':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'high':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      case 'moderate':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default:
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Blast Radius"
        subtitle="Quantifies the organizational impact and ripple effects of package vulnerabilities or breaking changes."
        currentSubpage="graph-blast-radius"
        showGraphTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
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
          title="Severe / High Blast"
          value={highBlastCount}
          subtext="Crucial shared dependencies"
          badge={highBlastCount > 0 ? 'High Impact' : 'Low Impact'}
          badgeColor={highBlastCount > 0 ? '#DC2626' : '#10B981'}
          badgeBg={highBlastCount > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<Flame size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Analyzed Packages"
          value={totalReports}
          subtext="Dependency nodes assessed"
          icon={<Package size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Downstream Ripple"
          value={totalDownstream}
          subtext="Packages indirectly affected"
          icon={<Radio size={22} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Microservices Reached"
          value={reports.reduce((s, r) => s + r.affected_services_count, 0)}
          subtext="Runtime service footprint"
          icon={<Server size={22} />}
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Filter Toolbar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                placeholder="Search package name..."
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

            <select
              aria-label="Filter blast radius tier"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Blast Tiers</option>
              <option value="severe">Severe</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="isolated">Isolated</option>
            </select>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {reports.length} package blast assessments
          </span>
        </div>

        {/* Blast Radius Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Package</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Blast Tier</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Risk Score</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Affected Repos</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Downstream Deps</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Containment & Remediation</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Computing organizational blast radius...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    No package blast assessments match criteria.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const badge = getTierBadge(report.blast_radius_tier);

                  return (
                    <tr
                      key={report.package_id}
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
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{report.package_name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              v{report.version} &bull; {report.ecosystem.toUpperCase()}
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
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {report.blast_radius_tier}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '6px',
                              borderRadius: '3px',
                              backgroundColor: '#E2E8F0',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, report.risk_score)}%`,
                                height: '100%',
                                backgroundColor:
                                  report.risk_score > 75
                                    ? '#EF4444'
                                    : report.risk_score > 50
                                    ? '#F97316'
                                    : '#10B981',
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '12px' }}>
                            {report.risk_score}/100
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>
                          {report.affected_repos_count} repos
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {report.affected_services_count} services
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>
                            {report.downstream_packages_count} packages
                          </span>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {report.downstream_packages.slice(0, 3).map((pkg, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#475569',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {pkg}
                              </span>
                            ))}
                            {report.downstream_packages.length > 3 && (
                              <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                +{report.downstream_packages.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', maxWidth: '300px' }}>
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          {report.containment_advice}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            href={`/code/dependencies/graph?search=${encodeURIComponent(report.package_name)}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563EB',
                              textDecoration: 'none',
                            }}
                          >
                            Graph
                          </Link>
                          <Link
                            href={`/code/dependencies/graph/upgrade-impact?search=${encodeURIComponent(report.package_name)}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                            }}
                          >
                            Impact
                          </Link>
                        </div>
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
