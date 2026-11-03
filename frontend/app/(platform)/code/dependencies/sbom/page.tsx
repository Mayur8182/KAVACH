'use client';

/**
 * Thing Code — 10 SBOM & Component Mapping
 * Subpage 1: SBOM References (/code/dependencies/sbom)
 *
 * Implements Screenshot 10:
 * - Top Controls: Repository selector, Branch selector, and More options button
 * - 4 Top Metric Cards: Total Components, Direct Dependencies, Transitive Dependencies, Components with Issues
 * - Row 1 Analytical Cards (3 cards):
 *     1. Component Type Distribution (Library, Framework, Application, Container, OS)
 *     2. Components by Ecosystem (npm, Python, Java, Go, Rust, .NET)
 *     3. Component Relationship Map (Interactive radial SVG network with expand control)
 * - Row 2 Filterable Table:
 *     SBOM Components with Search, Ecosystem, Component Type, Repository filters, and action drawer
 * - Row 3 Analytical Cards (2 cards):
 *     1. Recent SBOM Scans (CycloneDX 1.5, SPDX 2.3 status)
 *     2. Top Components by Usage (Central shared dependencies across repos)
 * - Data Reality: Real PostgreSQL persistence via `GET /api/v1/code/dependencies/sbom`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { SBOMOverviewResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { ComponentTypeDonut } from '@/components/code/dependencies/sbom/ComponentTypeDonut';
import { ComponentsByEcosystemBarChart } from '@/components/code/dependencies/sbom/ComponentsByEcosystemBarChart';
import { ComponentRelationshipMap } from '@/components/code/dependencies/sbom/ComponentRelationshipMap';
import { SBOMComponentsTable } from '@/components/code/dependencies/sbom/SBOMComponentsTable';
import { RecentSBOMScansTable } from '@/components/code/dependencies/sbom/RecentSBOMScansTable';
import { TopComponentsUsageList } from '@/components/code/dependencies/sbom/TopComponentsUsageList';
import {
  FileText,
  Box,
  Network,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function SBOMReferencesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<SBOMOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.sbom({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch SBOM overview data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, selectedBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    total_components: 0,
    direct_dependencies: 0,
    transitive_dependencies: 0,
    components_with_issues: 0,
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Page Header with Horizontal Tabs & Filter Controls */}
      <DependenciesHeader
        title="SBOM & Component Mapping"
        subtitle="View and manage your Software Bill of Materials, component relationships, and repository mapping."
        currentSubpage="sbom"
        showSbomTabs={true}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            style={{
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Top 4 Metric Cards matching Screenshot 10 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Total Components"
          value={metrics.total_components}
          subtext="In active SBOM documents"
          icon={<FileText size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Direct Dependencies"
          value={metrics.direct_dependencies}
          subtext="Declared in manifest"
          icon={<Box size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Transitive Dependencies"
          value={metrics.transitive_dependencies}
          subtext="Resolved via lockfile tree"
          icon={<Network size={22} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Components with Issues"
          value={metrics.components_with_issues}
          subtext="Requiring investigation"
          badge={metrics.components_with_issues > 0 ? 'Action Needed' : 'Clean'}
          badgeBg={metrics.components_with_issues > 0 ? '#FEF2F2' : '#ECFDF5'}
          badgeColor={metrics.components_with_issues > 0 ? '#DC2626' : '#10B981'}
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
      </div>

      {/* Row 1: 3 Analytical Cards matching Screenshot 10 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <ComponentTypeDonut
          data={data?.type_distribution || []}
          loading={loading}
        />

        <ComponentsByEcosystemBarChart
          data={data?.ecosystem_distribution || []}
          loading={loading}
        />

        <ComponentRelationshipMap
          data={data?.relationship_map || { nodes: [], edges: [] }}
          loading={loading}
        />
      </div>

      {/* Row 2: SBOM Components Table matching Screenshot 10 */}
      <div style={{ marginBottom: '20px' }}>
        <SBOMComponentsTable
          components={data?.components || []}
          loading={loading}
          onRefresh={loadData}
        />
      </div>

      {/* Row 3: 2 Analytical Cards matching Screenshot 10 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '16px',
        }}
      >
        <RecentSBOMScansTable
          scans={data?.recent_scans || []}
          loading={loading}
        />

        <TopComponentsUsageList
          items={data?.top_usage || []}
          loading={loading}
        />
      </div>
    </div>
  );
}
