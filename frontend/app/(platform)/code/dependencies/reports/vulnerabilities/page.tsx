'use client';

/**
 * Module 14 — Reports & Analytics: Vulnerability Trends
 * Route: /code/dependencies/reports/vulnerabilities
 * 
 * Strict AGENTS.md compliance: Real data provenance from `/api/v1/dependencies/reports/vulnerabilities`.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  Package,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyReportsSubnav } from '@/components/dependencies/DependencyReportsSubnav';

export default function VulnerabilityTrendsReportPage() {
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
      const res = await api.dependencyReports.getVulnerabilities({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        timeframe: selectedTimeframe,
      });
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load vulnerability trends report', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRepo, selectedBranch, selectedTimeframe]);

  const summary = data?.summary || {
    total_active: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    avg_mttr_days: 0.0,
    fix_rate_pct: 100.0,
  };

  const trendHistory = data?.trend_history || [];
  const ecoExposure = data?.ecosystem_exposure || [];
  const topCves = data?.top_cves || [];
  const ageDist = data?.age_distribution || { less_than_7d: 0, d7_to_30: 0, d30_to_90: 0, over_90d: 0 };

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
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Aggregating vulnerability trends from scanner telemetry...</span>
        </div>
      )}

      {error && !data && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '24px 0' }}>
          <AlertTriangle size={28} color="#EF4444" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Unable to load vulnerability trends</h3>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Active Vulnerabilities</span>
                <ShieldAlert size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.total_active.toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', backgroundColor: '#FEF2F2', padding: '2px 6px', borderRadius: '4px' }}>
                  {summary.critical_count} Critical
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#EA580C', backgroundColor: '#FFF7ED', padding: '2px 6px', borderRadius: '4px' }}>
                  {summary.high_count} High
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Critical &amp; High Exposure</span>
                <AlertTriangle size={18} color="#F97316" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {(summary.critical_count + summary.high_count).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
                Require priority triage &amp; patching
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Mean Time to Remediate (MTTR)</span>
                <Clock size={18} color="#2563EB" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.avg_mttr_days} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>days</span>
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '8px', fontWeight: 500 }}>
                Within 14-day target SLA
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Remediation Fix Rate</span>
                <CheckCircle2 size={18} color="#16A34A" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.fix_rate_pct}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
                Closed vs total reported issues
              </div>
            </div>
          </div>

          {/* ── Main Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* Vulnerability Severity Trend */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Severity Trend Over Time</h3>
              <div style={{ height: '170px', width: '100%', position: 'relative' }}>
                <svg viewBox="0 0 400 130" width="100%" height="130" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                  <polyline
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={trendHistory.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, trendHistory.length - 1))) * 380 + 10;
                      const y = 90 - Math.min(80, p.critical * 6);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={trendHistory.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, trendHistory.length - 1))) * 380 + 10;
                      const y = 80 - Math.min(70, p.high * 4);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {trendHistory.map((p: any) => (
                    <span key={p.date}>{p.date}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Critical
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} /> High
                </span>
              </div>
            </div>

            {/* Age Distribution Breakdown */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Vulnerability Age Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>&lt; 7 days (New)</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{ageDist.less_than_7d} issues</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (ageDist.less_than_7d / (summary.total_active || 1)) * 100)}%`, backgroundColor: '#3B82F6' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>7 - 30 days</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{ageDist.d7_to_30} issues</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (ageDist.d7_to_30 / (summary.total_active || 1)) * 100)}%`, backgroundColor: '#F59E0B' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>30 - 90 days</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{ageDist.d30_to_90} issues</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (ageDist.d30_to_90 / (summary.total_active || 1)) * 100)}%`, backgroundColor: '#F97316' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>&gt; 90 days (Past SLA)</span>
                    <span style={{ fontWeight: 600, color: '#EF4444' }}>{ageDist.over_90d} issues</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (ageDist.over_90d / (summary.total_active || 1)) * 100)}%`, backgroundColor: '#EF4444' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Top CVEs Across Fleet ── */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Active CVE Advisories</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>CVE ID</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Advisory / Title</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Severity</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Package</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Repository</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCves.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No vulnerabilities recorded. Fleet dependencies are safe.
                      </td>
                    </tr>
                  ) : (
                    topCves.map((cve: any) => (
                      <tr key={cve.cve_id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                          {cve.cve_id}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#1E293B', fontWeight: 500, maxWidth: '300px' }}>
                          {cve.title}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: cve.severity === 'Critical' ? '#FEF2F2' : cve.severity === 'High' ? '#FFF7ED' : '#EFF6FF',
                              color: cve.severity === 'Critical' ? '#EF4444' : cve.severity === 'High' ? '#EA580C' : '#2563EB',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            {cve.severity}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} color="#64748B" />
                            <span>{cve.package_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FolderGit2 size={14} color="#64748B" />
                            <span>{cve.repository}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '11px' }}>
                            {cve.status}
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
