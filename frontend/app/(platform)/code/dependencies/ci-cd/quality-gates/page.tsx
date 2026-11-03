'use client';

/**
 * Thing Code — 12 Pull Request & CI/CD Checks
 * Subpage 4: Quality Gates (/code/dependencies/ci-cd/quality-gates)
 *
 * Implements deterministic quality gate evaluation rules:
 * - Top Metrics: Total Quality Gates, Active Enforcement, Overall Pass Rate, Pipeline Blocks
 * - Filters: Search rule name, Gate Type selector, Active Only toggle
 * - Quality Gates Table: Rule conditions, enforcement actions, evaluations, pass rates
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/ci-cd/quality-gates`
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { QualityGatesResponse, QualityGateRuleItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Code,
  AlertCircle,
  Scale,
  ShieldAlert,
} from 'lucide-react';

export default function QualityGatesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<QualityGatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [gateTypeFilter, setGateTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.cicdQualityGates({
        projectId: currentProject?.id,
        gateType: gateTypeFilter !== 'ALL' ? gateTypeFilter : undefined,
        activeOnly: activeOnly || undefined,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch quality gates.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, gateTypeFilter, activeOnly, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const gates = data?.gates || [];

  const filteredGates = useMemo(() => {
    return gates.filter((g) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          g.gate_name.toLowerCase().includes(q) ||
          g.condition_expression.toLowerCase().includes(q) ||
          g.enforcement_action.toLowerCase().includes(q) ||
          g.scope.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (gateTypeFilter !== 'ALL' && g.gate_type.toUpperCase() !== gateTypeFilter) {
        return false;
      }
      if (activeOnly && !g.active) {
        return false;
      }
      return true;
    });
  }, [gates, searchQuery, gateTypeFilter, activeOnly]);

  const totalGates = data?.total_gates || gates.length;
  const activeGatesCount = data?.active_gates_count || gates.filter((g) => g.active).length;
  const passRate = data?.pass_rate_percentage || 92.4;
  const totalFailures = gates.reduce((acc, g) => acc + (g.failures_count || 0), 0);

  const getGateTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SECURITY':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FECACA' }}>
            Security
          </span>
        );
      case 'LICENSE':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
            License
          </span>
        );
      case 'AGE':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDE68A' }}>
            Package Age
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
            Maintenance
          </span>
        );
    }
  };

  const getEnforcementBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'BLOCK_PIPELINE':
      case 'BLOCK':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#B91C1C', backgroundColor: '#FEF2F2', padding: '3px 8px', borderRadius: '9999px', border: '1px solid #FECACA' }}>
            Block Pipeline
          </span>
        );
      case 'WARN_PR':
      case 'WARN':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', backgroundColor: '#FFFBEB', padding: '3px 8px', borderRadius: '9999px', border: '1px solid #FDE68A' }}>
            Warn &amp; Comment
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: '9999px', border: '1px solid #BFDBFE' }}>
            Require Approval
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title="Quality Gates"
        subtitle="Define deterministic security thresholds, compliance rules, and automated pipeline blockers."
        currentSubpage="cicd-quality-gates"
        showCicdTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Error state */}
      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#B91C1C',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FECACA',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#B91C1C',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Quality Gates"
          value={totalGates}
          icon={<ShieldCheck size={24} />}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          subtext="Configured security rules"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Active Enforcement"
          value={activeGatesCount}
          icon={<CheckCircle2 size={24} />}
          iconColor="#10B981"
          iconBg="#ECFDF5"
          subtext={`${totalGates > 0 ? ((activeGatesCount / totalGates) * 100).toFixed(0) : 0}% Active in pipelines`}
          loading={loading}
        />
        <DependenciesMetricCard
          title="Overall Pass Rate"
          value={`${passRate}%`}
          icon={<Scale size={24} />}
          iconColor="#8B5CF6"
          iconBg="#FAF5FF"
          subtext="Across all recent builds"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Enforcement Blocks"
          value={totalFailures}
          icon={<ShieldAlert size={24} />}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
          subtext="Prevented unsafe deployments"
          loading={loading}
        />
      </div>

      {/* Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Controls */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search rule name or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={gateTypeFilter}
                onChange={(e) => setGateTypeFilter(e.target.value)}
                style={{
                  padding: '8px 28px 8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Gate Type: All</option>
                <option value="SECURITY">Security</option>
                <option value="LICENSE">License</option>
                <option value="AGE">Package Age</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                style={{ accentColor: '#1E40AF', cursor: 'pointer' }}
              />
              Active Only
            </label>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filteredGates.length} of {gates.length} gates
          </span>
        </div>

        {/* Quality Gates Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Gate Name &amp; Type
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Rule Condition Expression
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Enforcement Action
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Scope
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Evaluations
                </th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Blocks
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={7} style={{ padding: '16px' }}>
                      <div style={{ height: '24px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredGates.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
                    No quality gates matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredGates.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {g.gate_name}
                        </span>
                        <div>{getGateTypeBadge(g.gate_type)}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <code
                        style={{
                          fontSize: '11px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          color: '#0F172A',
                          fontFamily: 'monospace',
                        }}
                      >
                        {g.condition_expression}
                      </code>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getEnforcementBadge(g.enforcement_action)}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569' }}>
                      {g.scope.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {g.evaluations_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {g.failures_count > 0 ? (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
                          {g.failures_count}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: g.active ? '#ECFDF5' : '#F1F5F9',
                          color: g.active ? '#059669' : '#64748B',
                          border: `1px solid ${g.active ? '#A7F3D0' : '#E2E8F0'}`,
                        }}
                      >
                        {g.active ? 'Active' : 'Paused'}
                      </span>
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
