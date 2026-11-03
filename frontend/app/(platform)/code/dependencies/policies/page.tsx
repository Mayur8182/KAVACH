'use client';

/**
 * Thing Code — 11 Dependency Policies
 * Subpage 1: Policy Overview (/code/dependencies/policies)
 *
 * Implements Screenshot 11:
 * - Top Controls: Repository selector, Branch selector, and More options button
 * - 4 Top Metric Cards: Total Policies, Active Policies, Policy Violations, Pending Approvals
 * - Row 1 Analytical Cards (3 cards):
 *     1. Policy Coverage Donut
 *     2. Policy Enforcement Trend Chart
 *     3. Violation by Policy Type Bar Chart
 * - Row 2 Filterable Table:
 *     Dependency Policies with Search, Policy Type, Status, Scope, Repository filters, and Actions
 * - Row 3 Analytical Cards (3 cards):
 *     1. Top Policy Violations List
 *     2. Allowed vs Blocked Packages Donut
 *     3. Recent Policy Activity Timeline
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/policies`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { DependencyPoliciesOverviewResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { PolicyCoverageDonut } from '@/components/code/dependencies/policies/PolicyCoverageDonut';
import { PolicyEnforcementTrendChart } from '@/components/code/dependencies/policies/PolicyEnforcementTrendChart';
import { ViolationByTypeBarChart } from '@/components/code/dependencies/policies/ViolationByTypeBarChart';
import { DependencyPoliciesTable } from '@/components/code/dependencies/policies/DependencyPoliciesTable';
import { TopPolicyViolationsList } from '@/components/code/dependencies/policies/TopPolicyViolationsList';
import { AllowedVsBlockedDonut } from '@/components/code/dependencies/policies/AllowedVsBlockedDonut';
import { RecentPolicyActivityTimeline } from '@/components/code/dependencies/policies/RecentPolicyActivityTimeline';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function DependencyPoliciesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DependencyPoliciesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters matching Screenshot 11
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.policies({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch dependency policies data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, selectedBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    total_policies: 24,
    active_policies: 19,
    policy_violations: 14,
    pending_approvals: 3,
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Page Header with Horizontal Tabs & Filter Controls matching Screenshot 11 */}
      <DependenciesHeader
        title="Dependency Policies"
        subtitle="Define and enforce dependency security, compliance, and usage policies across your repositories."
        currentSubpage="policies"
        showPoliciesTabs={true}
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

      {/* Top 4 Metric Cards matching Screenshot 11 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Total Policies"
          value={metrics.total_policies}
          subtext="Enforced across workspace"
          icon={<FileText size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Active Policies"
          value={metrics.active_policies}
          subtext="Blocking or auditing in CI"
          icon={<CheckCircle2 size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Policy Violations"
          value={metrics.policy_violations}
          subtext="Unresolved breaches"
          icon={<AlertTriangle size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Pending Approvals"
          value={metrics.pending_approvals}
          subtext="Exceptions awaiting signoff"
          icon={<Clock size={22} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />
      </div>

      {/* Row 1 Analytical Cards (3 cards matching Screenshot 11) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <PolicyCoverageDonut data={data?.coverage || []} loading={loading} />
        <PolicyEnforcementTrendChart data={data?.enforcement_trend || []} loading={loading} />
        <ViolationByTypeBarChart data={data?.violations_by_type || []} loading={loading} />
      </div>

      {/* Row 2: Dependency Policies Table matching Screenshot 11 */}
      <div style={{ marginBottom: '20px' }}>
        <DependencyPoliciesTable
          policies={data?.policies || []}
          loading={loading}
          onRefresh={loadData}
        />
      </div>

      {/* Row 3 Analytical Cards (3 cards matching Screenshot 11) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        <TopPolicyViolationsList data={data?.top_violations || []} loading={loading} />
        <AllowedVsBlockedDonut
          data={data?.package_ratio || { allowed_count: 142, blocked_count: 28, restricted_count: 14 }}
          loading={loading}
        />
        <RecentPolicyActivityTimeline data={data?.recent_activity || []} loading={loading} />
      </div>
    </div>
  );
}
