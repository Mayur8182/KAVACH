'use client';

/**
 * Thing Code — 10 SBOM & Component Mapping
 * Subpage 4: Version Comparison (/code/dependencies/sbom/diff)
 *
 * Implements:
 * - Version drift and delta comparison between SBOM releases or branches
 * - Evaluates major, minor, patch version divergence
 * - Security impact classification of dependency drift
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/sbom/diff`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { SBOMVersionComparisonResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  GitCompare,
  ArrowRight,
  ShieldAlert,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function SBOMVersionDiffPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<SBOMVersionComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceRef, setSourceRef] = useState('v1.4.0');
  const [targetRef, setTargetRef] = useState('v1.5.0');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.sbomDiff({
        projectId: currentProject?.id,
        sourceRef,
        targetRef,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to compare SBOM versions.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, sourceRef, targetRef]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const diffItems = data?.diff_items || [];
  const filtered = diffItems.filter(
    (item) =>
      !search ||
      item.component_name.toLowerCase().includes(search.toLowerCase()) ||
      item.ecosystem.toLowerCase().includes(search.toLowerCase())
  );

  const getDriftBadge = (drift: string) => {
    const upper = drift.toUpperCase();
    if (upper === 'MATCH') {
      return (
        <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
          Exact Match
        </span>
      );
    }
    if (upper === 'MAJOR_DRIFT') {
      return (
        <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
          Major Drift
        </span>
      );
    }
    if (upper === 'MINOR_DRIFT') {
      return (
        <span style={{ backgroundColor: '#FFFBEB', color: '#D97706', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
          Minor Drift
        </span>
      );
    }
    if (upper === 'PATCH_UPDATE') {
      return (
        <span style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
          Patch Update
        </span>
      );
    }
    return (
      <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
        {drift}
      </span>
    );
  };

  const getSecurityImpactBadge = (impact: string) => {
    const upper = impact.toUpperCase();
    if (upper === 'HIGH' || upper === 'CRITICAL') {
      return (
        <span style={{ color: '#DC2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={12} /> High Risk
        </span>
      );
    }
    if (upper === 'MEDIUM') {
      return (
        <span style={{ color: '#D97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={12} /> Medium Risk
        </span>
      );
    }
    return (
      <span style={{ color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={12} /> None
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title="Version Comparison"
        subtitle="Compare component versions, dependency drift, and security impact across releases and branches."
        currentSubpage="sbom-diff"
        showSbomTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Version Selector Controls */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Source:</span>
            <input
              type="text"
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="e.g. v1.4.0 or branch"
              style={{
                padding: '6px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>

          <ArrowRight size={16} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Target:</span>
            <input
              type="text"
              value={targetRef}
              onChange={(e) => setTargetRef(e.target.value)}
              placeholder="e.g. v1.5.0 or branch"
              style={{
                padding: '6px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <GitCompare size={14} /> Compare SBOMs
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#64748B' }}>
          Comparing CycloneDX specifications
        </div>
      </div>

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
            gap: '8px',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Components Evaluated"
          value={data?.components_evaluated || 0}
          subtext="Matched across revisions"
          icon={<Layers size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Differences Detected"
          value={data?.differences_count || 0}
          subtext="Version or dependency drifts"
          icon={<GitCompare size={22} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Major Drifts"
          value={diffItems.filter((d) => d.drift_type === 'MAJOR_DRIFT').length}
          subtext="Potential breaking API changes"
          badge={diffItems.filter((d) => d.drift_type === 'MAJOR_DRIFT').length > 0 ? 'Breaking' : 'Stable'}
          badgeBg={diffItems.filter((d) => d.drift_type === 'MAJOR_DRIFT').length > 0 ? '#FEF2F2' : '#ECFDF5'}
          badgeColor={diffItems.filter((d) => d.drift_type === 'MAJOR_DRIFT').length > 0 ? '#DC2626' : '#059669'}
          icon={<AlertTriangle size={22} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Security Drift Impact"
          value={diffItems.filter((d) => d.security_impact === 'HIGH').length}
          subtext="CVE exposure change"
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
      </div>

      {/* Diff Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Version Deltas
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
              Comparison diff between {data?.source_ref || sourceRef} and {data?.target_ref || targetRef}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              width: '240px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Component Name</th>
                <th style={{ padding: '10px 14px' }}>Ecosystem</th>
                <th style={{ padding: '10px 14px' }}>{sourceRef} Version</th>
                <th style={{ padding: '10px 14px' }}>{targetRef} Version</th>
                <th style={{ padding: '10px 14px' }}>Drift Type</th>
                <th style={{ padding: '10px 14px' }}>Security Impact</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={6} style={{ padding: '14px' }}>
                      <div style={{ height: '18px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    Zero drift detected between selected specifications.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.component_name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                      {item.component_name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          backgroundColor: '#EEF2FF',
                          color: '#4338CA',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {item.ecosystem}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569' }}>
                      {item.repo_a_version}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                      {item.repo_b_version}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{getDriftBadge(item.drift_type)}</td>
                    <td style={{ padding: '12px 14px' }}>{getSecurityImpactBadge(item.security_impact)}</td>
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
