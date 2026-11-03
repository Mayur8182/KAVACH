'use client';

/**
 * Module 14 — Reports & Analytics: Analytics Overview
 * Route: /code/dependencies/reports
 * 
 * Strict AGENTS.md compliance:
 * Real data provenance loaded from `/api/v1/dependencies/reports/overview`.
 * Zero fake numbers, zero hardcoded records.
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  Package,
  FileText,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FolderGit2,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyReportsSubnav } from '@/components/dependencies/DependencyReportsSubnav';

export default function AnalyticsOverviewPage() {
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
      const res = await api.dependencyReports.getOverview({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        timeframe: selectedTimeframe,
      });
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load dependency analytics overview', err);
      setError(err?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRepo, selectedBranch, selectedTimeframe]);

  const metrics = data?.metrics || {
    total_dependencies: 0,
    total_dependencies_change: '+0%',
    vulnerable_dependencies: 0,
    vulnerable_dependencies_change: '+0%',
    outdated_dependencies: 0,
    outdated_dependencies_change: '+0%',
    license_violations: 0,
    license_violations_change: '+0%',
    remediated_issues: 0,
    remediated_issues_change: '+0%',
  };

  const riskDist = data?.dependency_risk_distribution || [];
  const vulnTren = data?.vulnerability_trend || [];
  const licTren = data?.license_compliance_trend || [];
  const topRepos = data?.top_vulnerable_repositories || [];
  const topOutdated = data?.top_outdated_packages || [];
  const remMetrics = data?.remediation_metrics || [];
  const ecoDist = data?.ecosystem_distribution || [];
  const repoScores = data?.repository_security_scores || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* ── Subnav Component ── */}
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
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Aggregating real reports &amp; analytics across fleet...</span>
        </div>
      )}

      {error && !data && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '24px 0' }}>
          <AlertTriangle size={28} color="#EF4444" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Unable to load analytics</h3>
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
          {/* ══════════════════════════════════════════════════════════════════════
              ROW 1: 5 Top Metric Cards matching Screenshot
          ══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* 1. Total Dependencies */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'none', marginBottom: '2px' }}>Total Dependencies</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {metrics.total_dependencies.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 8px', borderRadius: '6px' }}>
                <TrendingUp size={12} />
                <span>{metrics.total_dependencies_change}</span>
              </div>
            </div>

            {/* 2. Vulnerable Dependencies */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} color="#EF4444" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Vulnerable Dependencies</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {metrics.vulnerable_dependencies.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '3px 8px', borderRadius: '6px' }}>
                <TrendingUp size={12} />
                <span>{metrics.vulnerable_dependencies_change}</span>
              </div>
            </div>

            {/* 3. Outdated Dependencies */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} color="#D97706" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Outdated Dependencies</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {metrics.outdated_dependencies.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 8px', borderRadius: '6px' }}>
                <TrendingDown size={12} />
                <span>{metrics.outdated_dependencies_change}</span>
              </div>
            </div>

            {/* 4. License Violations */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FAF5FF', border: '1px solid #F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#9333EA" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>License Violations</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {metrics.license_violations.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '3px 8px', borderRadius: '6px' }}>
                <TrendingUp size={12} />
                <span>{metrics.license_violations_change}</span>
              </div>
            </div>

            {/* 5. Remediated Issues */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color="#16A34A" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>Remediated Issues</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {metrics.remediated_issues.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 8px', borderRadius: '6px' }}>
                <TrendingUp size={12} />
                <span>{metrics.remediated_issues_change}</span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              ROW 2: 3 Cards (Risk Distribution, Vulnerability Trend, License Trend)
          ══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Card 1: Dependency Risk Distribution */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Dependency Risk Distribution</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '190px' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
                  <svg viewBox="0 0 100 100" width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                    {riskDist.reduce((acc: any, item: any, idx: number) => {
                      const prevPerc = acc.currentOffset;
                      const strokeDash = `${item.percentage} ${100 - item.percentage}`;
                      acc.elements.push(
                        <circle
                          key={item.name}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="14"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={-prevPerc}
                          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                        />
                      );
                      acc.currentOffset += item.percentage;
                      return acc;
                    }, { elements: [], currentOffset: 0 }).elements}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{metrics.total_dependencies}</span>
                    <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Packages</span>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, paddingLeft: '24px' }}>
                  {riskDist.map((item: any) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                        <span style={{ color: '#475569', fontWeight: 500 }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.count}</span>
                        <span style={{ color: '#94A3B8', fontSize: '11px', width: '36px', textAlign: 'right' }}>{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Vulnerability Trend */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Vulnerability Trend</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ position: 'relative', height: '160px', width: '100%' }}>
                <svg viewBox="0 0 400 130" width="100%" height="130" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#F1F5F9" strokeWidth="1" />

                  {/* Multi-line plots */}
                  {/* Critical (Red) */}
                  <polyline
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={vulnTren.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, vulnTren.length - 1))) * 380 + 10;
                      const y = 90 - Math.min(80, p.critical * 6);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* High (Orange) */}
                  <polyline
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={vulnTren.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, vulnTren.length - 1))) * 380 + 10;
                      const y = 80 - Math.min(70, p.high * 4);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* Medium (Blue) */}
                  <polyline
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={vulnTren.map((p: any, idx: number) => {
                      const x = (idx / (Math.max(1, vulnTren.length - 1))) * 380 + 10;
                      const y = 100 - Math.min(80, p.medium * 3);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </svg>

                {/* X-axis labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {vulnTren.map((p: any) => (
                    <span key={p.date}>{p.date}</span>
                  ))}
                </div>
              </div>

              {/* Legend dots */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Critical
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} /> High
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} /> Medium
                </span>
              </div>
            </div>

            {/* Card 3: License Compliance Trend */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>License Compliance Trend</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ position: 'relative', height: '160px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '130px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  {licTren.map((item: any, idx: number) => {
                    const total = (item.compliant || 1) + (item.warning || 0) + (item.violations || 0);
                    const cHeight = Math.min(90, Math.max(20, (item.compliant / total) * 90));
                    const wHeight = Math.min(25, (item.warning / total) * 90);
                    const vHeight = Math.min(20, (item.violations / total) * 90);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', width: '18px', height: '100%', justifyContent: 'flex-start', gap: '2px' }}>
                        <div style={{ width: '14px', height: `${cHeight}px`, backgroundColor: '#6EE7B7', borderRadius: '3px' }} title={`Compliant: ${item.compliant}`} />
                        <div style={{ width: '14px', height: `${wHeight}px`, backgroundColor: '#FDE68A', borderRadius: '3px' }} title={`Warning: ${item.warning}`} />
                        <div style={{ width: '14px', height: `${vHeight}px`, backgroundColor: '#FCA5A5', borderRadius: '3px' }} title={`Violations: ${item.violations}`} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {licTren.map((p: any) => (
                    <span key={p.date}>{p.date}</span>
                  ))}
                </div>
              </div>

              {/* Legend dots */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6EE7B7' }} /> Compliant
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FDE68A' }} /> Warning
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FCA5A5' }} /> Violation
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              ROW 3: 2 Tables (Top Vulnerable Repositories, Top Outdated Packages)
          ══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '16px' }}>
            {/* Table 1: Top Vulnerable Repositories */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Top Vulnerable Repositories</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Repository</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Vulnerabilities</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>High</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Medium</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRepos.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                          No vulnerable repositories detected.
                        </td>
                      </tr>
                    ) : (
                      topRepos.map((r: any) => {
                        const tot = r.vulnerabilities || 0;
                        const maxW = Math.min(100, Math.max(15, tot * 8));
                        return (
                          <tr key={r.repository} style={{ borderBottom: '1px solid #F8FAFC' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderGit2 size={15} color="#64748B" />
                                <span>{r.repository}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ height: '7px', width: `${maxW}px`, backgroundColor: '#FCA5A5', borderRadius: '4px' }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{tot}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#EF4444', fontWeight: 600, fontSize: '11px' }}>
                                {r.high}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#D97706', fontWeight: 600, fontSize: '11px' }}>
                                {r.medium}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: '11px' }}>
                                {r.low}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Top Outdated Packages */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Top Outdated Packages</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Package</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Current Version</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Latest Version</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Repositories</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOutdated.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                          No outdated dependencies detected. All packages are current.
                        </td>
                      </tr>
                    ) : (
                      topOutdated.map((p: any) => {
                        const riskBadge =
                          p.risk === 'Critical'
                            ? { bg: '#FEF2F2', text: '#DC2626' }
                            : p.risk === 'High'
                            ? { bg: '#FFF7ED', text: '#EA580C' }
                            : p.risk === 'Medium'
                            ? { bg: '#FFFBEB', text: '#D97706' }
                            : { bg: '#F0FDF4', text: '#16A34A' };

                        return (
                          <tr key={p.package} style={{ borderBottom: '1px solid #F8FAFC' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={15} color="#64748B" />
                                <span>{p.package}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                              {p.current_version}
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#16A34A', fontSize: '12px', fontWeight: 500 }}>
                              {p.latest_version}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>
                              {p.repositories}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: riskBadge.bg, color: riskBadge.text, fontWeight: 600, fontSize: '11px' }}>
                                {p.risk}
                              </span>
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

          {/* ══════════════════════════════════════════════════════════════════════
              ROW 4: 3 Bottom Widgets (Remediation Metrics, Ecosystem Dist, Repo Security Score)
          ══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Widget 1: Remediation Metrics (Fixed vs Remaining) */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Remediation Metrics</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ height: '160px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '130px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  {remMetrics.map((item: any, idx: number) => {
                    const total = (item.fixed || 0) + (item.remaining || 1);
                    const fHeight = Math.min(60, Math.max(10, (item.fixed / total) * 90));
                    const rHeight = Math.min(70, Math.max(15, (item.remaining / total) * 90));
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', width: '20px', height: '100%', justifyContent: 'flex-start', gap: '2px' }}>
                        <div style={{ width: '14px', height: `${fHeight}px`, backgroundColor: '#34D399', borderRadius: '3px' }} title={`Fixed: ${item.fixed}`} />
                        <div style={{ width: '14px', height: `${rHeight}px`, backgroundColor: '#60A5FA', borderRadius: '3px' }} title={`Remaining: ${item.remaining}`} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {remMetrics.map((p: any) => (
                    <span key={p.date}>{p.date}</span>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#34D399' }} /> Fixed
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#60A5FA' }} /> Remaining
                </span>
              </div>
            </div>

            {/* Widget 2: Dependency Ecosystem Distribution */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Dependency Ecosystem Distribution</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '180px' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                  <svg viewBox="0 0 100 100" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                    {ecoDist.reduce((acc: any, item: any) => {
                      const prevPerc = acc.currentOffset;
                      const strokeDash = `${item.percentage} ${100 - item.percentage}`;
                      acc.elements.push(
                        <circle
                          key={item.name}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="14"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={-prevPerc}
                          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                        />
                      );
                      acc.currentOffset += item.percentage;
                      return acc;
                    }, { elements: [], currentOffset: 0 }).elements}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Boxes size={22} color="#64748B" />
                  </div>
                </div>

                {/* Legend list with tech badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, paddingLeft: '20px' }}>
                  {ecoDist.map((item: any) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#0F172A', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Widget 3: Repository Security Score */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Repository Security Score</h3>
                <span style={{ width: '32px', height: '14px', backgroundColor: '#E2E8F0', borderRadius: '10px', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {repoScores.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                    No connected repositories found.
                  </div>
                ) : (
                  repoScores.slice(0, 5).map((r: any) => (
                    <div key={r.repository} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FolderGit2 size={15} color="#64748B" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', width: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.repository}>
                        {r.repository}
                      </span>
                      <div style={{ flexGrow: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${r.score}%`,
                            backgroundColor: r.color,
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', width: '28px', textAlign: 'right' }}>
                        {r.score}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
