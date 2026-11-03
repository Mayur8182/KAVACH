'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, RefreshCw, ChevronRight, GitBranch, FolderGit2, MoreHorizontal } from 'lucide-react';

export type DependencySubpageType =
  | 'overview'
  | 'trends'
  | 'critical'
  | 'outdated'
  | 'coverage'
  | 'inventory'
  | 'direct'
  | 'transitive'
  | 'usage'
  | 'duplicates'
  | 'detail'
  | 'vulnerabilities'
  | 'vulnerabilities-severity'
  | 'vulnerabilities-affected'
  | 'vulnerabilities-fix'
  | 'vulnerabilities-kev'
  | 'vulnerabilities-detail'
  | 'versions'
  | 'versions-outdated'
  | 'versions-upgrades'
  | 'versions-breaking-changes'
  | 'versions-eol'
  | 'ecosystems'
  | 'ecosystems-npm'
  | 'ecosystems-python'
  | 'ecosystems-java'
  | 'ecosystems-go'
  | 'ecosystems-other'
  | 'graph'
  | 'graph-relationships'
  | 'graph-risk-paths'
  | 'graph-blast-radius'
  | 'graph-upgrade-impact'
  | 'licenses'
  | 'licenses-inventory'
  | 'licenses-violations'
  | 'licenses-restricted'
  | 'licenses-exceptions'
  | 'health'
  | 'health-maintenance'
  | 'health-abandoned'
  | 'health-releases'
  | 'health-detail'
  | 'remediation'
  | 'remediation-upgrades'
  | 'remediation-diff'
  | 'remediation-prs'
  | 'remediation-verification'
  | 'sbom'
  | 'sbom-detail'
  | 'sbom-repositories'
  | 'sbom-diff'
  | 'sbom-exports'
  | 'policies'
  | 'policies-vulnerabilities'
  | 'policies-package-rules'
  | 'policies-versions'
  | 'policies-exceptions'
  | 'cicd'
  | 'cicd-pull-requests'
  | 'cicd-builds'
  | 'cicd-quality-gates'
  | 'cicd-settings';

interface DependenciesHeaderProps {
  title: string;
  subtitle: string;
  currentSubpage: DependencySubpageType;
  onRefresh?: () => void;
  isLoading?: boolean;
  selectedTimeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  selectedRepo?: string;
  onRepoChange?: (repo: string) => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
  extraActions?: React.ReactNode;
  showInventoryTabs?: boolean;
  showVulnerabilityTabs?: boolean;
  showVersionTabs?: boolean;
  showEcosystemTabs?: boolean;
  showGraphTabs?: boolean;
  showLicenseTabs?: boolean;
  showHealthTabs?: boolean;
  showRemediationTabs?: boolean;
  showSbomTabs?: boolean;
  showPoliciesTabs?: boolean;
  showCicdTabs?: boolean;
}

export const DependenciesHeader: React.FC<DependenciesHeaderProps> = ({
  title,
  subtitle,
  currentSubpage,
  onRefresh,
  isLoading = false,
  selectedTimeRange = '30d',
  onTimeRangeChange,
  selectedRepo = 'all',
  onRepoChange,
  selectedBranch = 'main',
  onBranchChange,
  extraActions,
  showInventoryTabs = false,
  showVulnerabilityTabs = false,
  showVersionTabs = false,
  showEcosystemTabs = false,
  showGraphTabs = false,
  showLicenseTabs = false,
  showHealthTabs = false,
  showRemediationTabs = false,
  showSbomTabs = false,
  showPoliciesTabs = false,
  showCicdTabs = false,
}) => {
  const pathname = usePathname();

  const labelsMap: Record<DependencySubpageType, string> = {
    overview: 'Overview',
    trends: 'Risk Trends',
    critical: 'Critical Dependencies',
    outdated: 'Outdated Packages',
    coverage: 'Repository Coverage',
    inventory: 'Inventory',
    direct: 'Direct Dependencies',
    transitive: 'Transitive Dependencies',
    usage: 'Usage & References',
    duplicates: 'Duplicate Packages',
    detail: 'Dependency Details',
    vulnerabilities: 'Vulnerability Analysis',
    'vulnerabilities-severity': 'Critical & High CVEs',
    'vulnerabilities-affected': 'Affected Packages',
    'vulnerabilities-fix': 'Fix Available',
    'vulnerabilities-kev': 'Known Exploited Vulnerabilities',
    'vulnerabilities-detail': 'CVE Detail',
    versions: 'Package Versions & Upgrades',
    'versions-outdated': 'Outdated Dependencies',
    'versions-upgrades': 'Upgrade Recommendations',
    'versions-breaking-changes': 'Breaking Change Analysis',
    'versions-eol': 'End-of-Life Packages',
    ecosystems: 'Package Ecosystems',
    'ecosystems-npm': 'npm & pnpm',
    'ecosystems-python': 'Python & pip',
    'ecosystems-java': 'Maven & Gradle',
    'ecosystems-go': 'Go Modules',
    'ecosystems-other': 'Cargo & NuGet',
    graph: 'Dependency Graph',
    'graph-relationships': 'Package Relationships',
    'graph-risk-paths': 'Transitive Risk Paths',
    'graph-blast-radius': 'Blast Radius',
    'graph-upgrade-impact': 'Upgrade Impact Preview',
    licenses: 'License Overview',
    'licenses-inventory': 'License Inventory',
    'licenses-violations': 'License Violations',
    'licenses-restricted': 'Restricted Packages',
    'licenses-exceptions': 'Exceptions & Approvals',
    health: 'Package Health & Maintenance',
    'health-maintenance': 'Maintenance & Release Activity',
    'health-abandoned': 'Abandoned Packages',
    'health-releases': 'Release & Version History',
    'health-detail': 'Package Trust Detail',
    remediation: 'Remediation Queue',
    'remediation-upgrades': 'Upgrade Recommendations',
    'remediation-diff': 'Manifest & Lockfile Diff',
    'remediation-prs': 'Create Fix Pull Request',
    'remediation-verification': 'Rescan & Verification',
    sbom: 'SBOM References',
    'sbom-detail': 'Component Detail',
    'sbom-repositories': 'Component-to-Repository Mapping',
    'sbom-diff': 'Version Comparison',
    'sbom-exports': 'Export & Provenance Links',
    policies: 'Policy Overview',
    'policies-vulnerabilities': 'Vulnerability Thresholds',
    'policies-package-rules': 'Allowed & Blocked Packages',
    'policies-versions': 'Version Restrictions',
    'policies-exceptions': 'Exceptions & Waivers',
    cicd: 'CI/CD Overview',
    'cicd-pull-requests': 'Pull Request Dependency Checks',
    'cicd-builds': 'Build Scan Results',
    'cicd-quality-gates': 'Quality Gates',
    'cicd-settings': 'Pipeline Configuration',
  };

  const currentLabel = labelsMap[currentSubpage] || 'Pull Request & CI/CD Checks';

  const cicdTabs = [
    { id: 'cicd', label: 'CI/CD Overview', href: '/code/dependencies/ci-cd' },
    { id: 'cicd-pull-requests', label: 'Pull Request Dependency Checks', href: '/code/dependencies/ci-cd/pull-requests' },
    { id: 'cicd-builds', label: 'Build Scan Results', href: '/code/dependencies/ci-cd/builds' },
    { id: 'cicd-quality-gates', label: 'Quality Gates', href: '/code/dependencies/ci-cd/quality-gates' },
    { id: 'cicd-settings', label: 'Pipeline Configuration', href: '/code/dependencies/ci-cd/settings' },
  ];

  const policiesTabs = [
    { id: 'policies', label: 'Policy Overview', href: '/code/dependencies/policies' },
    { id: 'policies-vulnerabilities', label: 'Vulnerability Thresholds', href: '/code/dependencies/policies/vulnerabilities' },
    { id: 'policies-package-rules', label: 'Allowed & Blocked Packages', href: '/code/dependencies/policies/package-rules' },
    { id: 'policies-versions', label: 'Version Restrictions', href: '/code/dependencies/policies/versions' },
    { id: 'policies-exceptions', label: 'Exceptions & Waivers', href: '/code/dependencies/policies/exceptions' },
  ];

  const sbomTabs = [
    { id: 'sbom', label: 'SBOM References', href: '/code/dependencies/sbom' },
    { id: 'sbom-detail', label: 'Component Detail', href: '/code/dependencies/sbom/lodash' },
    { id: 'sbom-repositories', label: 'Component-to-Repository Mapping', href: '/code/dependencies/sbom/repositories' },
    { id: 'sbom-diff', label: 'Version Comparison', href: '/code/dependencies/sbom/diff' },
    { id: 'sbom-exports', label: 'Export & Provenance Links', href: '/code/dependencies/sbom/exports' },
  ];

  const remediationTabs = [
    { id: 'remediation', label: 'Remediation Queue', href: '/code/dependencies/remediation' },
    { id: 'remediation-upgrades', label: 'Upgrade Recommendations', href: '/code/dependencies/remediation/upgrades' },
    { id: 'remediation-diff', label: 'Manifest & Lockfile Diff', href: '/code/dependencies/remediation/diff' },
    { id: 'remediation-prs', label: 'Create Fix Pull Request', href: '/code/dependencies/remediation/pull-requests' },
    { id: 'remediation-verification', label: 'Rescan & Verification', href: '/code/dependencies/remediation/verification' },
  ];

  const healthTabs = [
    { id: 'health', label: 'Package Health Overview', href: '/code/dependencies/health' },
    { id: 'health-maintenance', label: 'Maintenance & Release Activity', href: '/code/dependencies/health/maintenance' },
    { id: 'health-abandoned', label: 'Abandoned Packages', href: '/code/dependencies/health/abandoned' },
    { id: 'health-releases', label: 'Release & Version History', href: '/code/dependencies/health/releases' },
    { id: 'health-detail', label: 'Package Trust Detail', href: '/code/dependencies/health/express' },
  ];

  const graphTabs = [
    { id: 'graph', label: 'Dependency Graph', href: '/code/dependencies/graph' },
    { id: 'graph-relationships', label: 'Package Relationships', href: '/code/dependencies/graph/relationships' },
    { id: 'graph-risk-paths', label: 'Transitive Risk Paths', href: '/code/dependencies/graph/risk-paths' },
    { id: 'graph-blast-radius', label: 'Blast Radius', href: '/code/dependencies/graph/blast-radius' },
    { id: 'graph-upgrade-impact', label: 'Upgrade Impact Preview', href: '/code/dependencies/graph/upgrade-impact' },
  ];

  const licenseTabs = [
    { id: 'licenses', label: 'License Overview', href: '/code/dependencies/licenses' },
    { id: 'licenses-inventory', label: 'License Inventory', href: '/code/dependencies/licenses/inventory' },
    { id: 'licenses-violations', label: 'License Violations', href: '/code/dependencies/licenses/violations' },
    { id: 'licenses-restricted', label: 'Restricted Packages', href: '/code/dependencies/licenses/restricted' },
    { id: 'licenses-exceptions', label: 'Exceptions & Approvals', href: '/code/dependencies/licenses/exceptions' },
  ];

  const ecosystemTabs = [
    { id: 'ecosystems', label: 'Ecosystems Overview', href: '/code/dependencies/ecosystems' },
    { id: 'ecosystems-npm', label: 'npm & pnpm', href: '/code/dependencies/ecosystems/npm' },
    { id: 'ecosystems-python', label: 'Python & pip', href: '/code/dependencies/ecosystems/python' },
    { id: 'ecosystems-java', label: 'Maven & Gradle', href: '/code/dependencies/ecosystems/java' },
    { id: 'ecosystems-go', label: 'Go Modules', href: '/code/dependencies/ecosystems/go' },
    { id: 'ecosystems-other', label: 'Cargo & NuGet', href: '/code/dependencies/ecosystems/other' },
  ];

  const versionTabs = [
    { id: 'versions', label: 'Version Inventory', href: '/code/dependencies/versions' },
    { id: 'versions-outdated', label: 'Outdated Dependencies', href: '/code/dependencies/versions/outdated' },
    { id: 'versions-upgrades', label: 'Upgrade Recommendations', href: '/code/dependencies/versions/upgrades' },
    { id: 'versions-breaking-changes', label: 'Breaking Change Analysis', href: '/code/dependencies/versions/breaking-changes' },
    { id: 'versions-eol', label: 'End-of-Life Packages', href: '/code/dependencies/versions/eol' },
  ];

  const vulnerabilityTabs = [
    { id: 'vulnerabilities', label: 'All Vulnerabilities', href: '/code/dependencies/vulnerabilities' },
    { id: 'vulnerabilities-severity', label: 'Critical & High CVEs', href: '/code/dependencies/vulnerabilities/severity' },
    { id: 'vulnerabilities-affected', label: 'Affected Packages', href: '/code/dependencies/vulnerabilities/affected-packages' },
    { id: 'vulnerabilities-fix', label: 'Fix Available', href: '/code/dependencies/vulnerabilities/fix-available' },
    { id: 'vulnerabilities-kev', label: 'Known Exploited Vulnerabilities', href: '/code/dependencies/vulnerabilities/known-exploited' },
  ];

  const inventoryTabs = [
    { id: 'inventory', label: 'All Dependencies', href: '/code/dependencies/inventory' },
    { id: 'direct', label: 'Direct Dependencies', href: '/code/dependencies/direct' },
    { id: 'transitive', label: 'Transitive Dependencies', href: '/code/dependencies/transitive' },
    { id: 'usage', label: 'Usage & References', href: '/code/dependencies/usage' },
    { id: 'duplicates', label: 'Duplicate Packages', href: '/code/dependencies/duplicates' },
  ];

  const overviewTabs = [
    { id: 'overview', label: 'Overview', href: '/code/dependencies' },
    { id: 'trends', label: 'Risk Trends', href: '/code/dependencies/trends' },
    { id: 'critical', label: 'Critical Dependencies', href: '/code/dependencies/critical' },
    { id: 'outdated', label: 'Outdated Packages', href: '/code/dependencies/outdated' },
    { id: 'coverage', label: 'Repository Coverage', href: '/code/dependencies/coverage' },
  ];

  const isCicdView = showCicdTabs || currentSubpage.startsWith('cicd');
  const isPoliciesView = showPoliciesTabs || currentSubpage.startsWith('policies');
  const isSbomView = showSbomTabs || currentSubpage.startsWith('sbom');
  const isRemediationView = showRemediationTabs || currentSubpage.startsWith('remediation');
  const isGraphView = showGraphTabs || currentSubpage.startsWith('graph');
  const isLicenseView = showLicenseTabs || currentSubpage.startsWith('licenses');
  const isHealthView = showHealthTabs || currentSubpage.startsWith('health');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
      {/* Top row: Breadcrumb, Title & Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {/* Breadcrumbs matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '3px' }}>
            <Link href="/code/dependencies" style={{ color: '#64748B', textDecoration: 'none' }}>
              Dependencies
            </Link>
            <ChevronRight size={13} color="#94A3B8" />
            {currentSubpage.startsWith('cicd-') ? (
              <>
                <Link href="/code/dependencies/ci-cd" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Pull Request & CI/CD Checks
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'cicd' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Pull Request & CI/CD Checks</span>
            ) : currentSubpage.startsWith('policies-') ? (
              <>
                <Link href="/code/dependencies/policies" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Dependency Policies
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'policies' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Dependency Policies</span>
            ) : currentSubpage.startsWith('sbom-') ? (
              <>
                <Link href="/code/dependencies/sbom" style={{ color: '#64748B', textDecoration: 'none' }}>
                  SBOM & Component Mapping
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'sbom' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>SBOM & Component Mapping</span>
            ) : currentSubpage.startsWith('remediation-') ? (
              <>
                <Link href="/code/dependencies/remediation" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Dependency Remediation
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'remediation' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Dependency Remediation</span>
            ) : currentSubpage.startsWith('health-') ? (
              <>
                <Link href="/code/dependencies/health" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Package Health & Maintenance
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'health' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Package Health &amp; Maintenance</span>
            ) : currentSubpage.startsWith('ecosystems-') ? (
              <>
                <Link href="/code/dependencies/ecosystems" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Package Ecosystems
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'ecosystems' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Package Ecosystems</span>
            ) : currentSubpage.startsWith('graph-') ? (
              <>
                <Link href="/code/dependencies/graph" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Dependency Graph
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'graph' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Dependency Graph</span>
            ) : currentSubpage.startsWith('licenses-') ? (
              <>
                <Link href="/code/dependencies/licenses" style={{ color: '#64748B', textDecoration: 'none' }}>
                  License Compliance
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'licenses' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>License Compliance</span>
            ) : currentSubpage === 'overview' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Overview</span>
            ) : currentSubpage === 'trends' || currentSubpage === 'critical' || currentSubpage === 'outdated' || currentSubpage === 'coverage' ? (
              <>
                <Link href="/code/dependencies" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Overview
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'inventory' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Inventory</span>
            ) : currentSubpage === 'direct' || currentSubpage === 'transitive' || currentSubpage === 'usage' || currentSubpage === 'duplicates' ? (
              <>
                <Link href="/code/dependencies/inventory" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Inventory
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'vulnerabilities' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Vulnerability Analysis</span>
            ) : currentSubpage.startsWith('vulnerabilities-') ? (
              <>
                <Link href="/code/dependencies/vulnerabilities" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Vulnerability Analysis
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : currentSubpage === 'versions' ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Package Versions &amp; Upgrades</span>
            ) : currentSubpage.startsWith('versions-') ? (
              <>
                <Link href="/code/dependencies/versions" style={{ color: '#64748B', textDecoration: 'none' }}>
                  Package Versions &amp; Upgrades
                </Link>
                <ChevronRight size={13} color="#94A3B8" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
              </>
            ) : (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{currentLabel}</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
            {title}
          </h1>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
            {subtitle}
          </p>
        </div>

        {/* Right Controls: Repository / Branch / Date Range Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isCicdView ? (
            <>
              {/* Repository Dropdown matching Screenshot 12 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedRepo}
                  aria-label="Filter by repository"
                  onChange={(e) => onRepoChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Repository (All)</option>
                  <option value="web-api">web-api</option>
                  <option value="frontend-app">frontend-app</option>
                  <option value="auth-service">auth-service</option>
                </select>
              </div>

              {/* Branch Dropdown matching Screenshot 12 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <GitBranch size={15} color="#64748B" />
                <select
                  value={selectedBranch}
                  aria-label="Filter by branch"
                  onChange={(e) => onBranchChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="main">Branch (main)</option>
                  <option value="develop">develop</option>
                  <option value="staging">staging</option>
                </select>
              </div>

              {/* Date Range Picker matching Screenshot 12 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedTimeRange}
                  aria-label="Filter by time range"
                  onChange={(e) => onTimeRangeChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last 1 Year</option>
                </select>
              </div>
            </>
          ) : isPoliciesView || isSbomView || isRemediationView ? (
            <>
              {/* Repository Dropdown matching Screenshot 09 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedRepo}
                  aria-label="Filter by repository"
                  onChange={(e) => onRepoChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Repository (All)</option>
                  <option value="web-api">web-api</option>
                  <option value="frontend-app">frontend-app</option>
                  <option value="auth-service">auth-service</option>
                </select>
              </div>

              {/* Branch Dropdown matching Screenshot 09 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <GitBranch size={15} color="#64748B" />
                <select
                  value={selectedBranch}
                  aria-label="Filter by branch"
                  onChange={(e) => onBranchChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="main">Branch (main)</option>
                  <option value="develop">develop</option>
                  <option value="staging">staging</option>
                </select>
              </div>

              {/* More options button (...) matching Screenshot 09 */}
              <button
                type="button"
                aria-label="More options"
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
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <MoreHorizontal size={16} />
              </button>
            </>
          ) : isHealthView ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <Calendar size={15} color="#64748B" />
              <select
                value={selectedTimeRange}
                aria-label="Filter by time range"
                onChange={(e) => onTimeRangeChange?.(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last 1 Year</option>
              </select>
            </div>
          ) : isLicenseView ? (
            <>
              {/* Repository Dropdown matching Screenshot 07 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedRepo}
                  aria-label="Filter by repository"
                  onChange={(e) => onRepoChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Repository (All)</option>
                  <option value="web-api">web-api</option>
                  <option value="frontend-app">frontend-app</option>
                  <option value="auth-service">auth-service</option>
                </select>
              </div>

              {/* Date range picker pill matching Screenshot 07 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedTimeRange}
                  aria-label="Filter by time range"
                  onChange={(e) => onTimeRangeChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last 1 Year</option>
                </select>
              </div>
            </>
          ) : isGraphView ? (
            <>
              {/* Repository Dropdown matching Screenshot 06 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Calendar size={15} color="#64748B" />
                <select
                  value={selectedRepo}
                  aria-label="Filter by repository"
                  onChange={(e) => onRepoChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Repository (All)</option>
                  <option value="web-api">web-api</option>
                  <option value="frontend-app">frontend-app</option>
                  <option value="auth-service">auth-service</option>
                </select>
              </div>

              {/* Branch Dropdown matching Screenshot 06 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#334155',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <span style={{ fontSize: '14px', color: '#64748B' }}>⌥</span>
                <select
                  value={selectedBranch}
                  aria-label="Filter by branch"
                  onChange={(e) => onBranchChange?.(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="main">Branch (main)</option>
                  <option value="develop">develop</option>
                  <option value="staging">staging</option>
                </select>
              </div>
            </>
          ) : (
            /* Date range picker pill matching screenshot */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <Calendar size={15} color="#64748B" />
              <select
                value={selectedTimeRange}
                aria-label="Filter by time range"
                onChange={(e) => onTimeRangeChange?.(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last 1 Year</option>
              </select>
            </div>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh dependency analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} color="#64748B" />
              <span>Refresh</span>
            </button>
          )}

          {extraActions}
        </div>
      </div>

      {/* Horizontal Tabs — strictly scoped to active module's subpages */}
      {isCicdView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {cicdTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isPoliciesView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {policiesTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isSbomView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {sbomTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isRemediationView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {remediationTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isHealthView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {healthTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isLicenseView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {licenseTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : isGraphView ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {graphTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : showVersionTabs || currentSubpage.startsWith('versions') ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {versionTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : showVulnerabilityTabs || currentSubpage.startsWith('vulnerabilities') ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {vulnerabilityTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : showEcosystemTabs || currentSubpage.startsWith('ecosystems') ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {ecosystemTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : showInventoryTabs || currentSubpage === 'inventory' || currentSubpage === 'direct' || currentSubpage === 'transitive' || currentSubpage === 'usage' || currentSubpage === 'duplicates' ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {inventoryTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : currentSubpage === 'overview' || currentSubpage === 'trends' || currentSubpage === 'critical' || currentSubpage === 'outdated' || currentSubpage === 'coverage' ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
          }}
        >
          {overviewTabs.map((tab) => {
            const isActive = currentSubpage === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
