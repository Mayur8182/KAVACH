'use client';

/**
 * Thing Code — Upgrade Impact Preview (/code/dependencies/graph/upgrade-impact)
 *
 * Subpage 5 of Dependency Graph:
 * Simulates version upgrades, evaluating breaking change risks, peer dependency conflicts, and downstream ripples.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { UpgradeImpactResponse, UpgradeImpactItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  GitPullRequest,
  AlertTriangle,
  ExternalLink,
  Package,
} from 'lucide-react';

export default function UpgradeImpactPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<UpgradeImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [safetyFilter, setSafetyFilter] = useState('all');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.upgradeImpact({
        projectId: currentProject?.id,
        repositoryId: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch upgrade impact simulations.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rawItems = data?.items || [];
  const items = rawItems.filter((i) => {
    if (safetyFilter === 'safe' && !i.safe_to_upgrade) return false;
    if (safetyFilter === 'breaking' && i.safe_to_upgrade) return false;
    return true;
  });

  const safeCount = data?.safe_count || 0;
  const breakingCount = data?.breaking_count || 0;
  const totalConflicts = items.reduce((s, i) => s + i.conflicts_count, 0);

  const getRiskBadge = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'HIGH':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      case 'MEDIUM':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'LOW':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      default:
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Upgrade Impact Preview"
        subtitle="Simulates version upgrades, evaluating breaking change risks, peer dependency conflicts, and downstream ripples."
        currentSubpage="graph-upgrade-impact"
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
          title="Safe to Upgrade"
          value={safeCount}
          subtext="Zero breaking API changes"
          badge="Ready"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<CheckCircle2 size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Breaking Risk Upgrades"
          value={breakingCount}
          subtext="Requires code migration"
          badge={breakingCount > 0 ? 'Review Needed' : 'None'}
          badgeColor={breakingCount > 0 ? '#DC2626' : '#10B981'}
          badgeBg={breakingCount > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<AlertOctagon size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Peer Conflicts"
          value={totalConflicts}
          subtext="Incompatible semver bounds"
          icon={<AlertTriangle size={22} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Simulated Packages"
          value={data?.total || 0}
          subtext="Ready for upgrade rollouts"
          icon={<TrendingUp size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
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
              aria-label="Filter upgrade safety status"
              value={safetyFilter}
              onChange={(e) => setSafetyFilter(e.target.value)}
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
              <option value="all">All Upgrade Simulations</option>
              <option value="safe">Safe to Upgrade Only</option>
              <option value="breaking">Breaking Changes Only</option>
            </select>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {items.length} upgrade candidates
          </span>
        </div>

        {/* Upgrade Impact Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Package</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Upgrade Path</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>SemVer Type</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Breaking Risk</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Conflicts</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>Compatibility Analysis</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Simulating package upgrade impacts...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    No upgrade impact simulations match criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const badge = getRiskBadge(item.breaking_risk);

                  return (
                    <tr
                      key={item.package_id}
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
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.package_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                          <span style={{ color: '#64748B' }}>v{item.current_version}</span>
                          <ArrowRight size={13} color="#94A3B8" />
                          <span style={{ fontWeight: 700, color: '#059669' }}>v{item.target_version}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor:
                              item.upgrade_type === 'PATCH'
                                ? '#EFF6FF'
                                : item.upgrade_type === 'MINOR'
                                ? '#FFFBEB'
                                : '#FEF2F2',
                            color:
                              item.upgrade_type === 'PATCH'
                                ? '#2563EB'
                                : item.upgrade_type === 'MINOR'
                                ? '#D97706'
                                : '#DC2626',
                          }}
                        >
                          {item.upgrade_type}
                        </span>
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
                          }}
                        >
                          {item.breaking_risk}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: 600, color: item.conflicts_count > 0 ? '#DC2626' : '#059669' }}>
                          {item.conflicts_count} conflicts
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {item.affected_downstream_count} downstream affected
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          {item.safe_to_upgrade ? (
                            <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                          ) : (
                            <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                          )}
                          <span style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                            {item.notes}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            href={`/code/dependencies/graph?search=${encodeURIComponent(item.package_name)}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563EB',
                              textDecoration: 'none',
                            }}
                          >
                            Graph
                          </Link>
                          {item.safe_to_upgrade && (
                            <button
                              onClick={() => alert(`Initiating safe pull request to upgrade ${item.package_name} to v${item.target_version}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#FFFFFF',
                                backgroundColor: '#2563EB',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <GitPullRequest size={12} />
                              <span>Create PR</span>
                            </button>
                          )}
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
