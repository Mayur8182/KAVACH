'use client';

/**
 * Module 14 — Reports & Analytics: License Reports
 * Route: /code/dependencies/reports/licenses
 * 
 * Strict AGENTS.md compliance: Real data provenance from `/api/v1/dependencies/reports/licenses`.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Scale,
  AlertOctagon,
  Clock,
  RefreshCw,
  FolderGit2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyReportsSubnav } from '@/components/dependencies/DependencyReportsSubnav';

export default function LicenseReportsPage() {
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
      const res = await api.dependencyReports.getLicenses({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        timeframe: selectedTimeframe,
      });
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load license reports', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRepo, selectedBranch, selectedTimeframe]);

  const summary = data?.summary || {
    total_licenses: 0,
    permissive_count: 0,
    copyleft_count: 0,
    violations_count: 0,
    pending_exceptions: 0,
  };

  const licDist = data?.licenses_distribution || [];
  const riskBreakdown = data?.risk_breakdown || [];
  const restrictedPkgs = data?.restricted_packages || [];

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
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Scanning license compliance records...</span>
        </div>
      )}

      {error && !data && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '24px 0' }}>
          <AlertTriangle size={28} color="#EF4444" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Unable to load license reports</h3>
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
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Tracked Licenses</span>
                <FileText size={18} color="#9333EA" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.total_licenses.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Extracted from manifests &amp; lockfiles
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Permissive (Safe)</span>
                <CheckCircle2 size={18} color="#16A34A" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.permissive_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 500 }}>
                MIT, Apache 2.0, BSD compliant
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Copyleft / Conditional</span>
                <Scale size={18} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.copyleft_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#D97706', marginTop: '6px' }}>
                Requires legal / IP review
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Policy Violations</span>
                <AlertOctagon size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.violations_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px', fontWeight: 500 }}>
                Prohibited licenses detected
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Pending Exceptions</span>
                <Clock size={18} color="#2563EB" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>
                {summary.pending_exceptions.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Awaiting governance review
              </div>
            </div>
          </div>

          {/* ── Visual Section: Distribution & Risk Breakdown ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* License Distribution Table/Bars */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Detected License Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {licDist.map((item: any) => (
                  <div key={item.license_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{item.license_name}</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>
                        {item.count} <span style={{ color: '#94A3B8', fontSize: '11px' }}>({item.percentage}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          backgroundColor: item.risk_level === 'High' ? '#EF4444' : item.risk_level === 'Medium' ? '#F59E0B' : '#10B981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* License Risk Breakdown */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>License Risk Classification</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {riskBreakdown.map((r: any) => (
                  <div key={r.risk_level} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{r.risk_level}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: r.color }}>{r.count} packages</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.percentage}%`, backgroundColor: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Restricted / Prohibited Packages Table ── */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>Restricted &amp; Prohibited Packages</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Package</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Version</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>License Detected</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>Repository</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Compliance</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {restrictedPkgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No restricted or prohibited licenses detected across repositories.
                      </td>
                    </tr>
                  ) : (
                    restrictedPkgs.map((pkg: any) => (
                      <tr key={`${pkg.package}-${pkg.version}`} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} color="#64748B" />
                            <span>{pkg.package}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748B' }}>
                          {pkg.version}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#DC2626' }}>
                          {pkg.license_name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FolderGit2 size={14} color="#64748B" />
                            <span>{pkg.repository}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: pkg.risk_level === 'High' ? '#FEF2F2' : '#FFFBEB',
                              color: pkg.risk_level === 'High' ? '#EF4444' : '#D97706',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            {pkg.compliance_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '6px', backgroundColor: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '11px' }}>
                            {pkg.action_recommended}
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
