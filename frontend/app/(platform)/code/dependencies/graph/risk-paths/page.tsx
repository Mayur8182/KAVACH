'use client';

/**
 * Thing Code — Transitive Risk Paths (/code/dependencies/graph/risk-paths)
 *
 * Subpage 3 of Dependency Graph:
 * Trace deep multi-step attack vectors from root manifest to deeply nested vulnerable dependencies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { TransitiveRiskPathsResponse, TransitiveRiskPath } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  Layers,
  Wrench,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  Package,
} from 'lucide-react';

export default function TransitiveRiskPathsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<TransitiveRiskPathsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.riskPaths({
        projectId: currentProject?.id,
        repositoryId: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transitive risk paths.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paths = data?.risk_paths || [];
  const criticalCount = data?.critical_paths_count || 0;
  const maxDepth = paths.length > 0 ? Math.max(...paths.map((p) => p.depth)) : 0;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'HIGH':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      case 'MEDIUM':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default:
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Transitive Risk Paths"
        subtitle="Trace deep multi-step attack vectors from root manifest to deeply nested vulnerable dependencies."
        currentSubpage="graph-risk-paths"
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

      {/* Top Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Active Risk Paths"
          value={data?.total || 0}
          subtext="Vulnerable traversal chains"
          badge={data?.total ? 'Active Threat' : 'Clear'}
          badgeColor={data?.total ? '#DC2626' : '#10B981'}
          badgeBg={data?.total ? '#FEF2F2' : '#ECFDF5'}
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Critical Severities"
          value={criticalCount}
          subtext="CVSS >= 9.0 in chain"
          icon={<AlertTriangle size={22} />}
          iconBg="#FFF1F2"
          iconColor="#E11D48"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Deepest Risk Depth"
          value={`Level ${maxDepth}`}
          subtext="Maximum transitive hop"
          icon={<Layers size={22} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Actionable Fixes"
          value={paths.length}
          subtext="Patch suggestions ready"
          badge="100% Patchable"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<Wrench size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
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
              placeholder="Search CVE, package, or parent..."
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
            aria-label="Filter severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
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
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Showing {paths.length} risk paths
        </span>
      </div>

      {/* List of Interactive Risk Path Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: '#94A3B8',
            }}
          >
            Analyzing transitive dependency chains...
          </div>
        ) : paths.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              color: '#64748B',
            }}
          >
            <ShieldAlert size={36} color="#CBD5E1" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              No Transitive Risk Paths Found
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
              All transitive sub-dependencies are currently clean and free of known vulnerabilities.
            </div>
          </div>
        ) : (
          paths.map((path) => {
            const badge = getSeverityBadge(path.severity);

            return (
              <div
                key={path.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'border-color 150ms ease',
                }}
              >
                {/* Header Row: CVE + Severity + Title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {path.severity}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                      {path.cve_id}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                      &mdash; {path.title}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      backgroundColor: '#F1F5F9',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    Depth: Level {path.depth}
                  </span>
                </div>

                {/* Visual Traversal Chain */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginRight: '6px' }}>
                    Attack Chain:
                  </span>

                  {path.path_nodes.map((node, index) => {
                    const isLast = index === path.path_nodes.length - 1;
                    const isRoot = index === 0;

                    return (
                      <React.Fragment key={index}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: isLast
                              ? '#FEF2F2'
                              : isRoot
                              ? '#EFF6FF'
                              : '#FFFFFF',
                            border: `1px solid ${
                              isLast ? '#FCA5A5' : isRoot ? '#BFDBFE' : '#E2E8F0'
                            }`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: isLast ? '#DC2626' : isRoot ? '#1D4ED8' : '#334155',
                          }}
                        >
                          <Package size={13} />
                          <span>{node}</span>
                          {isLast && (
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              Vulnerable
                            </span>
                          )}
                        </div>

                        {!isLast && <ChevronRight size={14} color="#94A3B8" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Remediation & Action Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={15} color="#059669" />
                    <span style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 500 }}>
                      <strong style={{ color: '#059669' }}>Fix Strategy:</strong> {path.fix_suggestion}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link
                      href={`/code/dependencies/graph?search=${encodeURIComponent(path.vulnerable_package)}`}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563EB',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Highlight in Graph</span>
                      <ExternalLink size={12} />
                    </Link>

                    <Link
                      href={`/code/dependencies/graph/upgrade-impact?search=${encodeURIComponent(path.direct_parent)}`}
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Simulate Parent Upgrade
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
