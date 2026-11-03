'use client';

/**
 * Module 14 — Reports & Analytics: Upgrade & Remediation Metrics
 * Route: /code/dependencies/reports/remediation
 * 
 * Strict AGENTS.md compliance: Real data provenance from `/api/v1/dependencies/reports/remediation`.
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FolderGit2,
  Package,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyReportsSubnav } from '@/components/dependencies/DependencyReportsSubnav';

export default function RemediationMetricsReportPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dependencyReports.getRemediation({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        timeframe: selectedTimeframe,
      });
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load remediation metrics report', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRepo, selectedBranch, selectedTimeframe]);

  const summary = data?.summary || {
    open_items: 0,
    in_progress: 0,
    fixed_count: 0,
    automated_prs: 0,
    sla_compliance_pct: 100.0,
  };

  const velocityTrend = data?.velocity_trend || [];
  const upgradeTypes = data?.upgrade_types || { major_breaking: 0, minor: 0, patch: 0 };
  const prTracker = data?.pr_tracker || [];
  const bySeverity = data?.by_severity || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <DependencyReportsSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
      />

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '12px', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" color="#2563EB" />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Aggregating remediation queue &amp; PR metrics...</span>
        </div>
      )}

      {error && !data && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '24px 0' }}>
          <AlertTriangle size={28} color="#EF4444" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Unable to load remediation metrics</h3>
          <p style={{ fontSize: '13px', color: '#B91C1C', margin: '0 0 16px' }}>{error}</p>
          <button
            onClick={fetchData}
            style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── Summary Metric Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Open Remediation Items</span>
                <Wrench size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.open_items.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Pending fix or patch application
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>In-Progress Upgrades</span>
                <Clock size={18} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.in_progress.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Branch patches created
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Verified Fixes</span>
                <CheckCircle2 size={18} color="#16A34A" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.fixed_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 500 }}>
                Clean rescan confirmed
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Automated Fix PRs</span>
                <GitPullRequest size={18} color="#2563EB" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.automated_prs.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Generated by Kavach AI
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Remediation SLA</span>
                <Sparkles size={18} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.sla_compliance_pct}%
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 500 }}>
                On track for 30-day window
              </div>
            </div>
          </div>

          {/* ── Visual Section: Velocity & Upgrade Types ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* Remediation Velocity Chart */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Remediation Velocity (Resolved vs Opened)</h3>
              <div style={{ height: '170px', width: '100%', position: 'relative' }}>
                <svg viewBox="0 0 400 130" width="100%" height="130" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={velocityTrend.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, velocityTrend.length - 1))) * 380 + 10;
                      const y = 90 - Math.min(80, p.resolved * 6);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={velocityTrend.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, velocityTrend.length - 1))) * 380 + 10;
                      const y = 90 - Math.min(80, p.opened * 5);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {velocityTrend.map((p: any) => (
                    <span key={p.date}>{p.date}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} /> Resolved Fixes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Newly Opened
                </span>
              </div>
            </div>

            {/* Upgrade Complexity Breakdown */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Upgrade Complexity &amp; Impact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Major / Breaking Upgrades</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{upgradeTypes.major_breaking} packages</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (upgradeTypes.major_breaking / 5) * 100)}%`, backgroundColor: '#EF4444' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Requires API validation and integration testing</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#D97706', fontWeight: 600 }}>Minor Feature Updates</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{upgradeTypes.minor} packages</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (upgradeTypes.minor / 5) * 100)}%`, backgroundColor: '#F59E0B' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Backwards-compatible API changes</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>Patch Security Fixes</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{upgradeTypes.patch} packages</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (upgradeTypes.patch / 5) * 100)}%`, backgroundColor: '#10B981' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Direct drop-in replacements with low risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Automated PR & Patch Tracker Table ── */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Automated Fix PR Tracker</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>PR #</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Repository</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Package</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Version Upgrade</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>PR Status</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {prTracker.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No remediation pull requests found.
                      </td>
                    </tr>
                  ) : (
                    prTracker.map((pr: any) => (
                      <tr key={pr.pr_number} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                          #{pr.pr_number}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FolderGit2 size={14} color="#64748B" />
                            <span>{pr.repository}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} color="#64748B" />
                            <span>{pr.package}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
                            <span style={{ color: '#EF4444' }}>{pr.from_version}</span>
                            <ArrowRight size={12} color="#94A3B8" />
                            <span style={{ color: '#16A34A', fontWeight: 600 }}>{pr.to_version}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: pr.status === 'FIXED' ? '#F0FDF4' : '#EFF6FF',
                              color: pr.status === 'FIXED' ? '#16A34A' : '#2563EB',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            {pr.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: pr.verification_status === 'PASSED' ? '#F0FDF4' : '#FFFBEB',
                              color: pr.verification_status === 'PASSED' ? '#16A34A' : '#D97706',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            {pr.verification_status}
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
      )}
    </div>
  );
}
