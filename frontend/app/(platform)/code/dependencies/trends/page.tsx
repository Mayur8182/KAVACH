'use client';

/**
 * Thing Code — Dependency Risk Trends (/code/dependencies/trends)
 *
 * Vulnerability lifecycle trajectories, MTTR metrics, and discovery vs resolution trends.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/trends`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { DependencyTrendsResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { RiskTrendChart } from '@/components/code/dependencies/RiskTrendChart';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Activity,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react';

export default function DependencyTrendsPage() {
  const { currentProject, currentRepository, setCurrentRepository, repositories } = useScope();
  const [data, setData] = useState<DependencyTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.trends({
        projectId: currentProject?.id,
        repositoryId: currentRepository?.name || currentRepository?.id || undefined,
        timeRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch trend records.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, currentRepository?.id, currentRepository?.name, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const trends = data?.trends || [];
  const latestTrend = trends[trends.length - 1];
  const earliestTrend = trends[0];

  const netDiff = latestTrend && earliestTrend
    ? latestTrend.vulnerable - earliestTrend.vulnerable
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Dependency Risk Trends"
        subtitle="Historical vulnerability trajectories, mean time to remediate (MTTR), and scan velocity."
        currentSubpage="trends"
        onRefresh={loadData}
        isLoading={loading}
        selectedTimeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        selectedRepo={currentRepository?.name || 'All Repositories'}
        onRepoChange={(repoName) => {
          if (repoName === 'all' || repoName === 'All Repositories') {
            setCurrentRepository(null);
          } else {
            const found = repositories.find((r) => r.name === repoName || r.id === repoName);
            setCurrentRepository(found || { id: repoName, name: repoName });
          }
        }}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top 4 MTTR & Trajectory Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Mean Time To Remediate (MTTR)"
          value={`${data?.mttr_days || 0}d`}
          subtext="Average days from detection to fix"
          icon={<Clock size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          badge={Number(data?.mttr_days || 0) <= 7 ? 'Optimal' : 'Needs Review'}
          badgeColor={Number(data?.mttr_days || 0) <= 7 ? '#16A34A' : '#D97706'}
          badgeBg={Number(data?.mttr_days || 0) <= 7 ? '#DCFCE7' : '#FEF3C7'}
          loading={loading}
        />

        <DependenciesMetricCard
          title="Net Risk Trend"
          value={netDiff > 0 ? `+${netDiff}` : `${netDiff}`}
          subtext="Net change in active vulnerabilities"
          icon={<TrendingUp size={24} />}
          iconBg={netDiff > 0 ? '#FEF2F2' : '#F0FDF4'}
          iconColor={netDiff > 0 ? '#DC2626' : '#16A34A'}
          badge={netDiff <= 0 ? 'Decreasing' : 'Increasing'}
          badgeColor={netDiff <= 0 ? '#16A34A' : '#DC2626'}
          badgeBg={netDiff <= 0 ? '#DCFCE7' : '#FEE2E2'}
          loading={loading}
        />

        <DependenciesMetricCard
          title="Resolution Velocity"
          value={`${data?.new_vs_resolved?.reduce((acc, c) => acc + (c.resolved_vulns || 0), 0) || 0} Resolved`}
          subtext="Packages patched or upgraded"
          icon={<ShieldCheck size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />

        <DependenciesMetricCard
          title="SCA Scanner Runs"
          value={data?.scan_history?.length || 0}
          subtext="Automated CI & scheduled scans"
          icon={<Activity size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Main Trends Chart Area */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Historical Risk Trajectory ({timeRange.toUpperCase()})
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Interactive timeline comparing total dependency count against discovered vulnerabilities and critical findings.
          </p>
        </div>

        <RiskTrendChart data={trends} height={280} />
      </div>

      {/* Two Column Grid: New vs Resolved & Recent SCA Scans */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}
      >
        {/* New vs Resolved Breakdown */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              New vs Resolved Vulnerabilities
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Inflow from newly discovered CVEs vs outflow from resolved advisories
            </p>
          </div>

          {!data?.new_vs_resolved || data.new_vs_resolved.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No differential vulnerability data logged for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.new_vs_resolved.slice(-7).map((pt, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#475569', fontWeight: 500 }}>{pt.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>
                      +{pt.new_vulns} New
                    </span>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>
                      -{pt.resolved_vulns} Resolved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scan History Audit Log */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Recent SCA Scanner Runs
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Deterministic execution records for Trivy, OSV, and ecosystem scanners
            </p>
          </div>

          {!data?.scan_history || data.scan_history.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No scanner runs recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.scan_history.slice(0, 5).map((scan, i) => (
                <div
                  key={scan.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid #F1F5F9',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <History size={15} color="#64748B" />
                    <div>
                      <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>
                        {scan.scanner}
                      </span>
                      <span style={{ color: '#94A3B8', marginLeft: '8px' }}>
                        {new Date(scan.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11px',
                        backgroundColor: scan.findings_count > 0 ? '#FEF2F2' : '#F0FDF4',
                        color: scan.findings_count > 0 ? '#DC2626' : '#16A34A',
                      }}
                    >
                      {scan.findings_count} findings
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '10px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {scan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
