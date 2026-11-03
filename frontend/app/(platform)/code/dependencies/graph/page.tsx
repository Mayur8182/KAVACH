'use client';

/**
 * Thing Code — Dependency Graph Overview (/code/dependencies/graph)
 *
 * Implements Screenshot 06:
 *  - Breadcrumbs: Dependencies > Dependency Graph
 *  - Title: Dependency Graph
 *  - Subtitle: Visualize package relationships, transitive dependencies and risk paths.
 *  - Repository & Branch dropdown selectors matching screenshot top right
 *  - Top 5 Summary Metric Cards:
 *      1. Direct Dependencies (Blue box icon)
 *      2. Vulnerable Packages (Red shield icon)
 *      3. Max Depth (Orange database/depth icon)
 *      4. Transitive Dependencies (Purple branching icon)
 *      5. Clean Packages (Green layers icon)
 *  - Main Canvas & Details Split View:
 *      - Left: Interactive SVG Dependency Graph with zoom/pan, bezier links, glowing risk paths, filters
 *      - Right: Package Details inspector with deep link actions
 *  - Bottom 3 Analytical Charts:
 *      - Dependency Types (Donut Chart & Legend)
 *      - Risk Distribution (Stacked Bar Chart by Graph Depth)
 *      - Top Dependencies (Ranked list with package icons & risk pills)
 * Data Source: PostgreSQL persistence via `GET /api/v1/code/dependencies/graph`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  DependencyGraphResponse,
  DependencyGraphNode,
} from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { DependencyGraphCanvas } from '@/components/code/dependencies/graph/DependencyGraphCanvas';
import { PackageDetailsPanel } from '@/components/code/dependencies/graph/PackageDetailsPanel';
import { DependencyTypesChart } from '@/components/code/dependencies/graph/DependencyTypesChart';
import { RiskDistributionChart } from '@/components/code/dependencies/graph/RiskDistributionChart';
import { TopDependenciesList } from '@/components/code/dependencies/graph/TopDependenciesList';
import {
  Package,
  ShieldAlert,
  Database,
  GitBranch,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export default function DependencyGraphPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DependencyGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and selection states
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [ecosystemFilter, setEcosystemFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedNode, setSelectedNode] = useState<DependencyGraphNode | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.graph({
        projectId: currentProject?.id,
        repositoryId: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch,
        ecosystem: ecosystemFilter !== 'all' ? ecosystemFilter : undefined,
        viewType: viewFilter !== 'all' ? viewFilter : undefined,
        riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
        search: searchQuery || undefined,
      });
      setData(res);
      if (res.selected_package) {
        setSelectedNode(res.selected_package);
      } else if (res.nodes && res.nodes.length > 0 && !selectedNode) {
        setSelectedNode(res.nodes[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dependency graph data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, selectedBranch, ecosystemFilter, viewFilter, riskFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    total_packages: 0,
    direct_dependencies: 0,
    transitive_dependencies: 0,
    vulnerable_packages: 0,
    max_depth: 0,
    total_edges: 0,
    clean_packages: 0,
  };

  const handleNodeSelect = (node: DependencyGraphNode) => {
    setSelectedNode(node);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Top Header matching Screenshot 06 */}
      <DependenciesHeader
        title="Dependency Graph"
        subtitle="Visualize package relationships, transitive dependencies and risk paths."
        currentSubpage="graph"
        showGraphTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
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
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 5 Metric Cards matching Screenshot 06 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Direct Dependencies */}
        <DependenciesMetricCard
          title="Direct Dependencies"
          value={metrics.direct_dependencies}
          subtext="First-order project imports"
          icon={<Package size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        {/* Card 2: Vulnerable Packages */}
        <DependenciesMetricCard
          title="Vulnerable Packages"
          value={metrics.vulnerable_packages}
          subtext="CVEs in dependency tree"
          badge={metrics.vulnerable_packages > 0 ? 'Action Req' : 'Secure'}
          badgeColor={metrics.vulnerable_packages > 0 ? '#DC2626' : '#10B981'}
          badgeBg={metrics.vulnerable_packages > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        {/* Card 3: Max Depth */}
        <DependenciesMetricCard
          title="Max Graph Depth"
          value={`L${metrics.max_depth}`}
          subtext="Transitive nesting level"
          icon={<Database size={24} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />

        {/* Card 4: Transitive Dependencies */}
        <DependenciesMetricCard
          title="Transitive Dependencies"
          value={metrics.transitive_dependencies}
          subtext="Indirect sub-dependencies"
          icon={<GitBranch size={24} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        {/* Card 5: Clean Packages */}
        <DependenciesMetricCard
          title="Clean Packages"
          value={metrics.clean_packages}
          subtext="Zero active vulnerabilities"
          badge="Verified"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<Layers size={24} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Main Graph & Package Details Split matching Screenshot 06 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <DependencyGraphCanvas
          nodes={data?.nodes || []}
          edges={data?.edges || []}
          selectedNodeId={selectedNode?.id}
          onSelectNode={handleNodeSelect}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          ecosystemFilter={ecosystemFilter}
          onEcosystemChange={setEcosystemFilter}
          viewFilter={viewFilter}
          onViewChange={setViewFilter}
          riskFilter={riskFilter}
          onRiskChange={setRiskFilter}
          loading={loading}
        />

        <PackageDetailsPanel
          packageData={selectedNode}
        />
      </div>

      {/* Bottom 3 Analytical Charts matching Screenshot 06 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
        }}
      >
        {/* 1. Dependency Types (Donut Chart) */}
        <DependencyTypesChart
          data={data?.dependency_types || []}
          loading={loading}
        />

        {/* 2. Risk Distribution (Stacked Bar Chart by Depth) */}
        <RiskDistributionChart
          data={data?.risk_distribution || []}
          loading={loading}
        />

        {/* 3. Top Dependencies (Ranked List) */}
        <TopDependenciesList
          items={data?.top_dependencies || []}
          loading={loading}
          onSelect={(top) => {
            const match = data?.nodes.find((n) => n.name === top.name);
            if (match) setSelectedNode(match);
          }}
        />
      </div>
    </div>
  );
}
