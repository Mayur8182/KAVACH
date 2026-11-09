'use client';

/**
 * Kavach — IaC Security: Evidence & Reports (/code/iac/reports)
 * Screen 14: Security posture reports, IaC scan reports, compliance evidence reports,
 * policy violation exports, and downloadable audit packages.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  ExternalLink,
  Filter,
  FileCheck2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface ReportItem {
  id: string;
  title: string;
  report_type: string;
  period: string;
  generated_at: string;
  status: string;
  findings_summary: Record<string, any>;
  compliance_score: number;
  download_url: string;
}

function IaCReportsContent() {
  const { currentRepository } = useScope();
  const repoName = currentRepository?.name || 'All Repositories';

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<any>(null);
  const [postureTrend, setPostureTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/iac/reports-overview');
      if (res) {
        setReports(res.reports || []);
        setComplianceSummary(res.compliance_summary || null);
        setPostureTrend(res.posture_trend || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDownloadReport = async (report: ReportItem, format: 'csv' | 'json') => {
    setDownloadingId(report.id + format);
    try {
      const res = await api.get(`/api/v1/iac/export?format=${format}`);
      const blob = new Blob([typeof res === 'string' ? res : JSON.stringify(res, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.toLowerCase().replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Error downloading report'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '4px',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              IaC Security
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>/</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Compliance &amp; Governance</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Evidence &amp; Reports
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Audit-ready compliance evidence packages, executive posture summaries, and exportable security reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchReports()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'motion-safe:animate-spin motion-reduce:animate-none' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {complianceSummary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Overall Compliance Posture</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981', marginTop: '6px' }}>
              {complianceSummary.overall_score_pct}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              CIS, NIST, PCI DSS &amp; SOC 2
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Verified Passed Controls</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              {complianceSummary.passed_controls}
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Deterministic scan proof
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Failed Controls / Gaps</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
              {complianceSummary.failed_controls}
            </div>
            <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
              Requires configuration remediation
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Audit Evidence Frameworks</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', marginTop: '8px' }}>
              {complianceSummary.frameworks?.slice(0, 3).join(', ')}...
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Generated Audit &amp; Posture Reports
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
            Authoritative reports built directly from PostgreSQL scan results and Checkov evaluations.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Report Name</th>
                <th style={{ padding: '12px 16px' }}>Report Type</th>
                <th style={{ padding: '12px 16px' }}>Period</th>
                <th style={{ padding: '12px 16px' }}>Compliance Score</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Export Formats</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={18} className="motion-safe:animate-spin motion-reduce:animate-none" style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
                    Loading audit reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="#2563EB" />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>ID: {r.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        {r.report_type}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {r.period}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 700, color: '#10B981' }}>
                        {r.compliance_score}%
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleDownloadReport(r, 'csv')}
                          disabled={downloadingId === r.id + 'csv'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <Download size={12} />
                          CSV
                        </button>

                        <button
                          onClick={() => handleDownloadReport(r, 'json')}
                          disabled={downloadingId === r.id + 'json'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            cursor: 'pointer',
                          }}
                        >
                          <Download size={12} />
                          JSON
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

export default function IaCReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading reports workspace...</div>}>
      <IaCReportsContent />
    </Suspense>
  );
}
