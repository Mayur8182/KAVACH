'use client';

/**
 * Thing Code — 09 Dependency Remediation
 * Subpage 2: Upgrade Recommendations (/code/dependencies/remediation/upgrades)
 *
 * Prioritizes safe patch/minor upgrades vs major breaking changes,
 * showing confidence scores, resolved vulnerability counts, and 1-click PR creation.
 * Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/remediation/upgrades`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { UpgradeRecommendationsResponse, UpgradeRecommendationItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  GitPullRequest,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileDiff,
} from 'lucide-react';

export default function UpgradeRecommendationsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<UpgradeRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingFilter, setBreakingFilter] = useState('all');
  const [prCreatingId, setPrCreatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.remediationUpgrades({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch upgrade recommendations.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePR = async (item: UpgradeRecommendationItem) => {
    setPrCreatingId(item.id);
    setSuccessMsg(null);
    try {
      const res = await api.code.dependencies.createFixPullRequest(
        {
          remediation_id: item.id,
          target_branch: 'main',
          title: `fix(deps): bump ${item.package_name} to ${item.recommended_version}`,
          body: `Automated upgrade recommended by THING SecuLayer.\nConfidence score: ${item.confidence_score}%\nFixes ${item.vulnerabilities_fixed} vulnerabilities.`,
        },
        currentProject?.id
      );

      setSuccessMsg(`Created PR #${res.pr_number} for ${item.package_name} on branch ${res.pr_branch}`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to create PR for ${item.package_name}`);
    } finally {
      setPrCreatingId(null);
    }
  };

  const filteredItems = (data?.recommendations || []).filter((item) => {
    if (breakingFilter === 'safe') return !item.breaking_change;
    if (breakingFilter === 'breaking') return item.breaking_change;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <DependenciesHeader
        title="Upgrade Recommendations"
        subtitle="Prioritized version upgrades categorized by backward compatibility and security impact."
        currentSubpage="remediation-upgrades"
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRefresh={loadData}
        isLoading={loading}
      />

      {successMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#065F46',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#065F46', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

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
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <div>
              <strong style={{ display: 'block', fontWeight: 600 }}>Error loading recommendations</strong>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '6px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#B91C1C',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 3 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        <DependenciesMetricCard
          title="Total Upgrades"
          value={data?.total ?? 0}
          subtext="Available upstream security releases"
          icon={<Sparkles size={24} />}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Safe Patch & Minor"
          value={data?.safe_patch_count ?? 0}
          subtext="100% backward compatible, zero breaking"
          icon={<ShieldCheck size={24} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          badge="High Confidence"
          badgeBg="#ECFDF5"
          badgeColor="#059669"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Major / Breaking"
          value={data?.breaking_count ?? 0}
          subtext="Requires automated regression tests"
          icon={<AlertTriangle size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          badge="Review API"
          badgeBg="#FFF7ED"
          badgeColor="#C2410C"
          loading={loading}
        />
      </div>

      {/* Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Upgrade Candidate Matrix
            </h3>
            <span style={{ fontSize: '12px', backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
              {filteredItems.length} recommendations
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                width: '240px',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0F172A',
                  width: '100%',
                }}
              />
            </div>

            <select
              value={breakingFilter}
              aria-label="Filter by breaking risk"
              onChange={(e) => setBreakingFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Change Types</option>
              <option value="safe">Safe Patches Only</option>
              <option value="breaking">Breaking Changes Only</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Package</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Upgrade Path</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Confidence</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fixed CVEs</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Age Drift</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Repository</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={8} style={{ padding: '16px' }}>
                      <div style={{ height: '22px', backgroundColor: '#F1F5F9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    No upgrade recommendations match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.package_name}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>
                          {item.ecosystem}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748B' }}>{item.current_version}</span>
                        <ArrowRight size={12} color="#10B981" />
                        <span style={{ color: '#059669', fontWeight: 700 }}>{item.recommended_version}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: item.breaking_change ? '#FFF7ED' : '#ECFDF5',
                          color: item.breaking_change ? '#EA580C' : '#059669',
                          border: `1px solid ${item.breaking_change ? '#FED7AA' : '#A7F3D0'}`,
                        }}
                      >
                        {item.breaking_change ? 'Major / Breaking' : 'Safe Patch'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '48px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${item.confidence_score}%`,
                              height: '100%',
                              backgroundColor: item.confidence_score >= 90 ? '#10B981' : '#F59E0B',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {item.confidence_score}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#059669', fontWeight: 600 }}>
                      {item.vulnerabilities_fixed > 0 ? `${item.vulnerabilities_fixed} CVEs fixed` : '0 CVEs'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {item.days_behind} days behind
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px' }}>
                        {item.repository}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link
                          href="/code/dependencies/remediation/diff"
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#334155',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FileDiff size={13} />
                          <span>Diff</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCreatePR(item)}
                          disabled={prCreatingId === item.id}
                          style={{
                            padding: '5px 12px',
                            backgroundColor: '#2563EB',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#FFFFFF',
                            cursor: prCreatingId === item.id ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <GitPullRequest size={13} />
                          <span>{prCreatingId === item.id ? 'Creating...' : 'Create PR'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
