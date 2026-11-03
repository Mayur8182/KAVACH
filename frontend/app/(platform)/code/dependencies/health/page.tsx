'use client';

/**
 * Thing Code — 08 Package Health & Maintenance
 * Subpage 1: Package Health Overview (/code/dependencies/health)
 *
 * Implements Screenshot 08:
 * - 4 Top Metric Cards (Healthy Packages, Actively Maintained, Low Activity, Abandoned Packages)
 * - Row 1 Analytical Cards (Package Health Distribution donut, Maintenance Activity bar, Package Status Overview donut)
 * - Row 2 Package Health Inventory searchable & filterable table
 * - Row 3 Analytical Cards (Top Packages by Health Risk, Recent Maintenance Activity timeline)
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/health`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PackageHealthOverviewResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { PackageHealthDistributionDonut } from '@/components/code/dependencies/health/PackageHealthDistributionDonut';
import { MaintenanceActivityChart } from '@/components/code/dependencies/health/MaintenanceActivityChart';
import { PackageStatusDonut } from '@/components/code/dependencies/health/PackageStatusDonut';
import { PackageHealthInventoryTable } from '@/components/code/dependencies/health/PackageHealthInventoryTable';
import { TopPackagesHealthRiskChart } from '@/components/code/dependencies/health/TopPackagesHealthRiskChart';
import { RecentMaintenanceTimeline } from '@/components/code/dependencies/health/RecentMaintenanceTimeline';
import {
  Heart,
  Clock,
  Package as PackageIcon,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export default function PackageHealthOverviewPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PackageHealthOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.health({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        timeRange: selectedTimeRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch package health & maintenance metrics.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, selectedTimeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    healthy_packages: 0,
    actively_maintained: 0,
    low_activity: 0,
    abandoned_packages: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Header matching Screenshot 08 */}
      <DependenciesHeader
        title="Package Health & Maintenance"
        subtitle="Assess package health, maintenance activity, release history, and trust signals."
        currentSubpage="health"
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Error State if API Fails */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C',
            fontSize: '13.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#DC2626',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Top 4 Metrics Cards matching Screenshot 08 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <DependenciesMetricCard
          title="Healthy Packages"
          value={metrics.healthy_packages}
          subtext="High maintainer velocity & security"
          badge="+4% this month"
          badgeColor="#059669"
          badgeBg="#ECFDF5"
          icon={<Heart size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Actively Maintained"
          value={metrics.actively_maintained}
          subtext="Recent commits & releases (<90d)"
          badge="Healthy Cadence"
          badgeColor="#2563EB"
          badgeBg="#EFF6FF"
          icon={<Clock size={22} />}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Low Activity"
          value={metrics.low_activity}
          subtext="Stale maintainer responses"
          badge="Monitor"
          badgeColor="#D97706"
          badgeBg="#FEF3C7"
          icon={<PackageIcon size={22} />}
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Abandoned Packages"
          value={metrics.abandoned_packages}
          subtext="Zero releases in >12m or deprecated"
          badge="High Risk"
          badgeColor="#DC2626"
          badgeBg="#FEE2E2"
          icon={<AlertTriangle size={22} />}
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          loading={loading}
        />
      </div>

      {/* Row 1 Analytical Cards matching Screenshot 08 (3 Columns) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        <PackageHealthDistributionDonut
          data={data?.distribution || []}
          loading={loading}
        />
        <MaintenanceActivityChart
          data={data?.maintenance_activity || []}
          loading={loading}
        />
        <PackageStatusDonut
          data={data?.status_overview || []}
          loading={loading}
        />
      </div>

      {/* Row 2 Main Table matching Screenshot 08: Package Health Inventory */}
      <PackageHealthInventoryTable
        items={data?.recent_inventory || []}
        loading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
      />

      {/* Row 3 Analytical Cards matching Screenshot 08 (2 Columns) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px',
        }}
      >
        <TopPackagesHealthRiskChart
          data={data?.top_health_risks || []}
          loading={loading}
        />
        <RecentMaintenanceTimeline
          events={data?.recent_events || []}
          loading={loading}
        />
      </div>
    </div>
  );
}
