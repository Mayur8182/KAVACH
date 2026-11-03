'use client';

/**
 * Thing Code — Package Ecosystems Overview (/code/dependencies/ecosystems)
 *
 * Implements Screenshot 05:
 *  - Breadcrumb: Dependencies > Package Ecosystems
 *  - Title: Package Ecosystems
 *  - Subtitle: Explore package ecosystems, their health, versions, and security posture across your projects.
 *  - Date Range Dropdown: "Last 30 days"
 *  - Top 5 Ecosystem Cards:
 *      1. npm & pnpm (/code/dependencies/ecosystems/npm)
 *      2. Python & pip (/code/dependencies/ecosystems/python)
 *      3. Maven & Gradle (/code/dependencies/ecosystems/java)
 *      4. Go Modules (/code/dependencies/ecosystems/go)
 *      5. Cargo & NuGet (/code/dependencies/ecosystems/other)
 *  - 2x3 Analytical Dashboard Grid:
 *      1. Ecosystem Distribution (Donut Chart & Breakdown)
 *      2. Top Risky Packages (Risk Table with Severity & Ecosystem Badges)
 *      3. Ecosystem Health (Interactive Progress Bars linking to Subpages)
 *      4. Recent Activity (SCA Scan Events & Timestamps)
 *      5. Vulnerability Trends (Multi-series SVG Curves by Ecosystem)
 *      6. Ecosystem Versions (Version Adoption & Drift Bar Chart)
 * Data Source: PostgreSQL persistence via `GET /api/v1/code/dependencies/ecosystems`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { EcosystemsOverviewResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { EcosystemCard } from '@/components/code/dependencies/ecosystems/EcosystemCard';
import { EcosystemDistributionDonut } from '@/components/code/dependencies/ecosystems/EcosystemDistributionDonut';
import { EcosystemRiskyTable } from '@/components/code/dependencies/ecosystems/EcosystemRiskyTable';
import { EcosystemHealthWidget } from '@/components/code/dependencies/ecosystems/EcosystemHealthWidget';
import { EcosystemRecentActivity } from '@/components/code/dependencies/ecosystems/EcosystemRecentActivity';
import { EcosystemVulnerabilityTrendsChart } from '@/components/code/dependencies/ecosystems/EcosystemVulnerabilityTrendsChart';
import { EcosystemVersionsChart } from '@/components/code/dependencies/ecosystems/EcosystemVersionsChart';
import { AlertTriangle } from 'lucide-react';

export default function PackageEcosystemsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<EcosystemsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.ecosystems({
        projectId: currentProject?.id,
        timeRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch package ecosystem metrics.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards = data?.ecosystem_cards || [];
  const distribution = data?.distribution || [];
  const totalPackages = data?.total_packages || 0;
  const topRiskyPackages = data?.top_risky_packages || [];
  const ecosystemHealth = data?.ecosystem_health || [];
  const recentActivity = data?.recent_activity || [];
  const vulnerabilityTrends = data?.vulnerability_trends || [];
  const ecosystemVersions = data?.ecosystem_versions || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Top Header matching Screenshot 05 */}
      <DependenciesHeader
        title="Package Ecosystems"
        subtitle="Explore package ecosystems, their health, versions, and security posture across your projects."
        currentSubpage="ecosystems"
        showEcosystemTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedTimeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Error Banner */}
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

      {/* Top 5 Ecosystem Cards matching Screenshot 05 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {loading && cards.length === 0 ? (
          [1, 2, 3, 4, 5].map((i) => (
            <EcosystemCard
              key={i}
              card={{
                id: `loading-${i}`,
                name: 'Loading...',
                slug: 'npm',
                href: '#',
                total_packages: 0,
                vulnerable_packages: 0,
                outdated_packages: 0,
                health_score: 100,
                primary_language: '',
                icon_type: 'npm',
                package_managers: [],
              }}
              isLoading={true}
            />
          ))
        ) : (
          cards.map((card) => (
            <EcosystemCard key={card.id} card={card} isLoading={loading} />
          ))
        )}
      </div>

      {/* 2x3 Analytical Grid matching Screenshot 05 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Row 1 */}
        {/* Card 1: Ecosystem Distribution (Donut Chart) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemDistributionDonut
            distribution={distribution}
            totalPackages={totalPackages}
            isLoading={loading}
          />
        </div>

        {/* Card 2: Top Risky Packages (Table) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemRiskyTable
            packages={topRiskyPackages}
            isLoading={loading}
          />
        </div>

        {/* Card 3: Ecosystem Health (Progress Bars) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemHealthWidget
            items={ecosystemHealth}
            isLoading={loading}
          />
        </div>

        {/* Row 2 */}
        {/* Card 4: Recent Activity (Event Feed) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemRecentActivity
            activities={recentActivity}
            isLoading={loading}
          />
        </div>

        {/* Card 5: Vulnerability Trends (Multi-series Line Chart) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemVulnerabilityTrendsChart
            trends={vulnerabilityTrends}
            isLoading={loading}
          />
        </div>

        {/* Card 6: Ecosystem Versions (Bar Chart) */}
        <div style={{ minHeight: '300px' }}>
          <EcosystemVersionsChart
            versionBars={ecosystemVersions}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
