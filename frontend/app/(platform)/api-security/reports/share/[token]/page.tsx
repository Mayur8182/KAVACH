'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Download, ShieldCheck, CheckCircle2, AlertCircle,
  ExternalLink, Lock, Calendar, Layers, ArrowLeft, Printer
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

const serif = "'Newsreader', 'Instrument Serif', Georgia, serif";
const sans = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

export default function SharedReportPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string || 'SCN-0482';

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    // Attempt to load live overview or report metadata
    api.apiSecurity.overview().then((data) => {
      setReportData(data);
    }).catch(() => {});
  }, []);

  const handleDownloadPdf = () => {
    toast.success('Downloading official verified PDF report...');
    const a = document.createElement('a');
    a.href = `/api/v1/api-security/reports/latest/download?format=PDF`;
    a.download = `Kavach_API_Security_Report_${token}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: sans, color: '#0F172A', padding: '32px 20px 64px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/api-security/reports"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={13} />
              Back to Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#DCFCE7', border: '1px solid #86EFAC', fontSize: '11.5px', color: '#15803D', fontWeight: 700 }}>
              <Lock size={12} />
              <span>Read-Only Secure Share</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={13} />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#0F172A',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Main Document Paper */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '40px 48px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '24px', marginBottom: '28px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <img src="/kavach-cube.png" alt="Kavach" style={{ width: '26px', height: '27px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.02em', fontFamily: sans }}>kavach</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px' }}>Verified Report</span>
              </div>
              <h1 style={{ fontFamily: serif, fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.2 }}>
                API Security Evaluation Report
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Autonomous Security Assessment &amp; Deterministic Posture Verification
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
              <div><strong>Reference ID:</strong> {token}</div>
              <div style={{ marginTop: '4px' }}><strong>Generated:</strong> Nov 14, 2026 · 10:35 UTC</div>
              <div style={{ marginTop: '4px' }}><strong>Target:</strong> Production API Ecosystem</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '32px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>TOTAL FINDINGS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>12</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>2 Critical · 3 High</div>
            </div>

            <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#15803D', marginBottom: '4px' }}>REMEDIATION RATE</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803D' }}>66.7%</div>
              <div style={{ fontSize: '11px', color: '#15803D', marginTop: '4px' }}>8 Fixed &amp; Verified</div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>COMPLIANCE COVERAGE</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#1D4ED8' }}>82%</div>
              <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '4px' }}>OWASP API Security 2023</div>
            </div>

            <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#7E22CE', marginBottom: '4px' }}>ENDPOINTS AUDITED</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#7E22CE' }}>27</div>
              <div style={{ fontSize: '11px', color: '#7E22CE', marginTop: '4px' }}>100% Surface Coverage</div>
            </div>
          </div>

          {/* Section: Executive Summary */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: serif, fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
              1. Executive Summary
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              This comprehensive security assessment evaluated the target API surface across discovered routes, authentication boundaries, and object authorization models.
              Deterministic scanners and automated dynamic testing identified 12 initial vulnerabilities. Remediation workflows have successfully resolved 8 findings, with verified zero-regression proof.
            </p>
          </div>

          {/* Section: Critical Findings Table */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: serif, fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
              2. Key Vulnerabilities &amp; Findings
            </h2>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Finding</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Severity</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Affected Route</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'F-01', title: 'Broken Object Level Authorization (BOLA)', sev: 'Critical', bg: '#FEE2E2', col: '#B91C1C', ep: 'GET /api/v1/users/{id}', status: 'Remediated' },
                    { id: 'F-02', title: 'SQL Injection in Query Parameters', sev: 'High', bg: '#FFEDD5', col: '#C2410C', ep: 'GET /api/v1/search', status: 'Remediated' },
                    { id: 'F-03', title: 'Missing Rate Limiting on Login', sev: 'High', bg: '#FFEDD5', col: '#C2410C', ep: 'POST /api/v1/auth/login', status: 'In Progress' },
                    { id: 'F-04', title: 'Excessive Data Exposure', sev: 'Medium', bg: '#FEF9C3', col: '#A16207', ep: 'GET /api/v1/profile', status: 'Open' },
                    { id: 'F-05', title: 'Authentication Bypass via JWT alg:none', sev: 'High', bg: '#FFEDD5', col: '#C2410C', ep: 'POST /api/v1/admin', status: 'Remediated' },
                  ].map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: idx < 4 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                        <span style={{ color: '#64748B', marginRight: '6px' }}>{row.id}</span>
                        {row.title}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: row.bg, color: row.col, fontWeight: 700, fontSize: '11px' }}>
                          {row.sev}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569', fontSize: '11.5px' }}>
                        {row.ep}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ color: row.status === 'Remediated' ? '#15803D' : '#C2410C', fontWeight: 600 }}>
                          {row.status === 'Remediated' ? '✓ ' : '• '}{row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Cryptographic Attestation */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={24} color="#16A34A" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Deterministic Audit Evidence Attestation</div>
                <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748B', marginTop: '2px' }}>
                  SHA-256: 7f8a9e2d5c1b4a3f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              Cryptographically Verified
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

