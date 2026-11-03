'use client';

/**
 * Thing Code — Package Relationships (/code/dependencies/graph/relationships)
 *
 * Subpage 2 of Dependency Graph:
 * Explores direct, transitive, peer, and dev relationships between packages across the codebase.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PackageRelationshipsResponse, PackageRelationshipItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Package,
  Layers,
  GitBranch,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

export default function PackageRelationshipsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PackageRelationshipsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.relationships({
        projectId: currentProject?.id,
        repositoryId: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        relationshipType: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch package relationships.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.relationships || [];
  const directCount = data?.direct_count || 0;
  const transitiveCount = data?.transitive_count || 0;
  const vulnerableCount = items.filter((r) => r.has_vulnerability).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Package Relationships"
        subtitle="Deep dive into direct, transitive, peer, and development package hierarchy linkages."
        currentSubpage="graph-relationships"
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

      {/* Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Relationships"
          value={data?.total || 0}
          subtext="Mapped dependency connections"
          icon={<GitBranch size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Direct Dependencies"
          value={directCount}
          subtext="Root manifest links"
          icon={<Package size={22} />}
          iconBg="#F0F9FF"
          iconColor="#0284C7"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Transitive Links"
          value={transitiveCount}
          subtext="Indirect sub-trees"
          icon={<Layers size={22} />}
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Risky Connections"
          value={vulnerableCount}
          subtext="Edges terminating at CVEs"
          badge={vulnerableCount > 0 ? 'Review' : 'Secure'}
          badgeColor={vulnerableCount > 0 ? '#DC2626' : '#10B981'}
          badgeBg={vulnerableCount > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
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
                placeholder="Search source or target package..."
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
              aria-label="Filter relationship type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <option value="all">All Relationship Types</option>
              <option value="direct">Direct</option>
              <option value="transitive">Transitive</option>
              <option value="peer">Peer</option>
              <option value="dev">Dev</option>
            </select>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {items.length} of {data?.total || 0} connections
          </span>
        </div>

        {/* Relationships Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Source Package</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Relationship Type</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Target Package</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Graph Depth</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Ecosystem</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Risk Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Loading package relationship graph...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    No package relationships found matching criteria.
                  </td>
                </tr>
              ) : (
                items.map((rel) => {
                  const isDirect = rel.relationship_type === 'direct';
                  return (
                    <tr
                      key={rel.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={15} color="#64748B" />
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{rel.source_package}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            v{rel.source_version}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDirect ? '#EFF6FF' : '#F5F3FF',
                            color: isDirect ? '#1D4ED8' : '#6D28D9',
                            border: `1px solid ${isDirect ? '#BFDBFE' : '#DDD6FE'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {rel.relationship_type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ArrowRight size={14} color="#94A3B8" />
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{rel.target_package}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            v{rel.target_version}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#475569',
                            backgroundColor: '#F1F5F9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Level {rel.depth}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          {rel.ecosystem.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {rel.has_vulnerability ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #FCA5A5',
                            }}
                          >
                            <ShieldAlert size={12} />
                            {rel.severity || 'Vulnerable'}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#059669',
                              backgroundColor: '#ECFDF5',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            <ShieldCheck size={12} />
                            Safe
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          href={`/code/dependencies/graph?search=${encodeURIComponent(rel.target_package)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Focus in Graph</span>
                          <ExternalLink size={12} />
                        </Link>
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
