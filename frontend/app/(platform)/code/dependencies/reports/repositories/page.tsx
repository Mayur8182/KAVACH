'use client';

/**
 * Module 14 — Reports & Analytics: Repository Comparison
 * Route: /code/dependencies/reports/repositories
 * 
 * Strict AGENTS.md compliance: Real data provenance from `/api/v1/dependencies/reports/repositories`.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  ShieldCheck,
  AlertTriangle,
  Award,
  Search,
  RefreshCw,
  GitBranch,
  Play,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyReportsSubnav } from '@/components/dependencies/DependencyReportsSubnav';

export default function RepositoryComparisonPage() {
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dependencyReports.getRepositories({
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load repository comparison', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const summary = data?.summary || {
    total_repositories: 0,
    most_secure_repo: null,
    highest_risk_repo: null,
    fleet_average_score: 100,
  };

  const repos = data?.repositories || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <DependencyReportsSubnav />

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '12px', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" color="#2563EB" />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Computing fleet security scores and comparison matrix...</span>
        </div>
      )}

      {error && !data && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '24px 0' }}>
          <AlertTriangle size={28} color="#EF4444" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Unable to load repository comparison</h3>
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Repositories Monitored</span>
                <FolderGit2 size={18} color="#2563EB" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.total_repositories}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Connected and tracked across fleet
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Fleet Average Score</span>
                <ShieldCheck size={18} color="#10B981" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#10B981' }}>
                {summary.fleet_average_score} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 500 }}>
                Weighted security posture
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Most Secure Repository</span>
                <Award size={18} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary.most_secure_repo || 'None'}>
                {summary.most_secure_repo || 'N/A'}
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 500 }}>
                Zero critical vulnerabilities
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Highest Risk Repository</span>
                <AlertTriangle size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary.highest_risk_repo || 'None'}>
                {summary.highest_risk_repo || 'None'}
              </div>
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px', fontWeight: 500 }}>
                Requires immediate triage
              </div>
            </div>
          </div>

          {/* ── Search Bar & Filter ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, maxWidth: '420px' }}>
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="Filter repositories by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%', color: '#0F172A' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Showing {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
            </span>
          </div>

          {/* ── Repository Comparison Matrix Table ── */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Repository Security &amp; Compliance Matrix</h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Real Database Provenance</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>Repository</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Security Score</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Dependencies</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Vulnerabilities</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Outdated</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>License Violations</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'center' }}>Remediation</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                        No repositories match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    repos.map((r: any) => (
                      <tr key={r.repository} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FolderGit2 size={16} color="#64748B" />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.repository}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <GitBranch size={10} /> {r.default_branch}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Security Score */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '48px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${r.security_score}%`, backgroundColor: r.score_color }} />
                            </div>
                            <span style={{ fontWeight: 700, color: r.score_color, fontSize: '13px' }}>
                              {r.security_score}
                            </span>
                          </div>
                        </td>

                        {/* Total Dependencies */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500, color: '#334155' }}>
                          {r.total_dependencies}
                        </td>

                        {/* Vulnerabilities Breakdown */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {r.critical > 0 && (
                              <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#EF4444', fontWeight: 600, fontSize: '11px' }}>
                                {r.critical}C
                              </span>
                            )}
                            {r.high > 0 && (
                              <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FFF7ED', color: '#EA580C', fontWeight: 600, fontSize: '11px' }}>
                                {r.high}H
                              </span>
                            )}
                            {r.medium > 0 && (
                              <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FFFBEB', color: '#D97706', fontWeight: 600, fontSize: '11px' }}>
                                {r.medium}M
                              </span>
                            )}
                            {r.total_vulnerabilities === 0 && (
                              <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#16A34A', fontWeight: 600, fontSize: '11px' }}>
                                0
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Outdated */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: r.outdated_count > 0 ? '#D97706' : '#64748B', fontWeight: 500 }}>
                          {r.outdated_count}
                        </td>

                        {/* License Violations */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ color: r.license_violations > 0 ? '#EF4444' : '#16A34A', fontWeight: 600 }}>
                            {r.license_violations}
                          </span>
                        </td>

                        {/* Remediation Rate */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#16A34A', fontWeight: 600, fontSize: '11px' }}>
                            {r.remediation_rate}%
                          </span>
                        </td>

                        {/* Quick Action */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Link
                            href={`/code/dependencies/scans/new?repo=${encodeURIComponent(r.repository)}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              textDecoration: 'none',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            <Play size={10} fill="#2563EB" />
                            <span>Scan</span>
                          </Link>
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
