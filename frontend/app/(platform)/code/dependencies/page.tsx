'use client';

/**
 * Thing Code — Dependencies Overview (/code/dependencies)
 *
 * Real-time Software Composition Analysis (SCA) Dashboard:
 *  - 4 Real-time Metric Cards: Total Dependencies, Vulnerable Packages, Outdated Drift, Monitored Repositories
 *  - 2x2 Analytical Grid:
 *      1. Dependency Risk Trends (Dual wave area SVG chart)
 *      2. Top Risky Dependencies (Interactive vulnerability list with severity badges)
 *      3. Dependency Ecosystem Distribution (SVG Donut chart with breakdown)
 *      4. Repository Coverage (Comparative bar chart of scanned repositories)
 * Data Source: Real PostgreSQL persistence via `GET /api/v1/code/dependencies/overview`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { DependenciesOverviewResponse, TopRiskyDependencyItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { RiskTrendChart } from '@/components/code/dependencies/RiskTrendChart';
import { EcosystemDonutChart } from '@/components/code/dependencies/EcosystemDonutChart';
import { RepositoryCoverageBarChart } from '@/components/code/dependencies/RepositoryCoverageBarChart';
import {
  Box,
  ShieldAlert,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Package,
  CheckCircle2,
} from 'lucide-react';

export default function DependenciesOverviewPage() {
  const { currentProject, currentRepository, setCurrentRepository, repositories } = useScope();
  const [data, setData] = useState<DependenciesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetRepo = currentRepository?.name || currentRepository?.id || undefined;
      const res = await api.code.dependencies.overview(currentProject?.id, targetRepo);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch dependency metrics.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, currentRepository?.id, currentRepository?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    total_dependencies: 0,
    vulnerable_dependencies: 0,
    critical_dependencies: 0,
    outdated_packages: 0,
    ecosystems_count: 0,
    repositories_scanned: 0,
    repositories_total: 0,
  };

  const coveragePct = metrics.repositories_total > 0
    ? Math.round((metrics.repositories_scanned / metrics.repositories_total) * 100)
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '16px 24px' }}>
      {/* Header */}
      <DependenciesHeader
        title="Dependencies Overview"
        subtitle="Get a complete view of your project dependencies and their security posture."
        currentSubpage="overview"
        onRefresh={loadData}
        isLoading={loading}
        selectedTimeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        selectedRepo={currentRepository?.name || 'All Repositories'}
        onRepoChange={(repoName) => {
          if (repoName === 'all' || repoName === 'All Repositories') {
            setCurrentRepository(null);
          } else {
            const found = repositories.find((r) => r.name === repoName || r.id === repoName);
            setCurrentRepository(found || { id: repoName, name: repoName });
          }
        }}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={18} color="#DC2626" />
          <div style={{ flexGrow: 1 }}>
            <strong>Unable to load dependency telemetry:</strong> {error}
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#991B1B',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Metric Cards Row matching Screenshot */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Dependencies"
          value={metrics.total_dependencies}
          subtext={`${metrics.ecosystems_count} ecosystems monitored`}
          icon={<Box size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Vulnerable Packages"
          value={metrics.vulnerable_dependencies}
          subtext={`${metrics.critical_dependencies} critical severity`}
          badge={metrics.vulnerable_dependencies > 0 ? 'At Risk' : 'Secure'}
          badgeColor={metrics.vulnerable_dependencies > 0 ? '#DC2626' : '#16A34A'}
          badgeBg={metrics.vulnerable_dependencies > 0 ? '#FEE2E2' : '#DCFCE7'}
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Outdated Packages"
          value={metrics.outdated_packages}
          subtext="Version drift detected"
          badge={metrics.outdated_packages > 0 ? 'Drift' : 'Clean'}
          badgeColor="#D97706"
          badgeBg="#FEF3C7"
          icon={<Clock size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Repository Coverage"
          value={`${metrics.repositories_scanned}/${metrics.repositories_total}`}
          subtext={`${coveragePct}% scanned with SCA`}
          badge={`${coveragePct}%`}
          badgeColor="#7C3AED"
          badgeBg="#F3E8FF"
          icon={<Layers size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* 2x2 Analytical Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Card 1: Dependency Risk Trends */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Dependency Risk Trends
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Trajectory of total vs vulnerable packages
              </p>
            </div>
            <Link
              href="/code/dependencies/trends"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <span>View Trends</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <RiskTrendChart data={data?.risk_trends || []} height={200} />
          </div>
        </div>

        {/* Card 2: Top Risky Dependencies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Top Risky Dependencies
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                High &amp; critical severity packages requiring remediation
              </p>
            </div>
            <Link
              href="/code/dependencies/critical"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <span>View All</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* List of Risky Dependencies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
            {!data?.top_risky_dependencies || data.top_risky_dependencies.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <CheckCircle2 size={32} color="#10B981" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  No Critical Vulnerabilities Found
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  All scanned repositories have healthy dependency bounds.
                </span>
              </div>
            ) : (
              data.top_risky_dependencies.slice(0, 4).map((item: TopRiskyDependencyItem) => {
                const isCritical = item.severity === 'CRITICAL';
                return (
                  <Link
                    key={item.id}
                    href={`/code/dependencies/critical?search=${encodeURIComponent(item.name)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                      backgroundColor: '#FFFFFF',
                      textDecoration: 'none',
                      transition: 'background-color 120ms ease, border-color 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#F1F5F9';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: isCritical ? '#FEF2F2' : '#FFF7ED',
                          color: isCritical ? '#DC2626' : '#EA580C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.name.slice(0, 2)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            v{item.version}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.cve_id || item.vulnerabilities?.[0] || `${item.vulnerability_count} CVE detected`} {item.repository ? `• ${item.repository}` : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: isCritical ? '#FEE2E2' : '#FFEDD5',
                          color: isCritical ? '#DC2626' : '#C2410C',
                        }}
                      >
                        {item.severity}
                      </span>
                      <ChevronRight size={14} color="#94A3B8" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Card 3: Dependency Ecosystem Distribution */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Dependency Ecosystem Distribution
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Package breakdown across language package managers
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#F1F5F9',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {data?.ecosystem_distribution?.length || 0} Ecosystems
            </span>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <EcosystemDonutChart items={data?.ecosystem_distribution || []} size={170} />
          </div>
        </div>

        {/* Card 4: Repository Coverage */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Repository Coverage
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                SCA scan health and package volumes across codebases
              </p>
            </div>
            <Link
              href="/code/dependencies/coverage"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <span>View Coverage</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <RepositoryCoverageBarChart data={data?.repository_coverage || []} height={190} />
          </div>
        </div>
      </div>
    </div>
  );
}
