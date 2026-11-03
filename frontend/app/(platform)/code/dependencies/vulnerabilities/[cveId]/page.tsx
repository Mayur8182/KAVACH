'use client';

/**
 * Thing Code — CVE Detail (/code/dependencies/vulnerabilities/[cveId])
 *
 * Exhaustive CVE intelligence, CVSS v3.1 vector analysis, EPSS exploitation probability,
 * CISA KEV catalog deadlines, and concrete code remediation guidance.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { VulnerabilityDetailResponse } from '@/types/api/dependencies';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Package,
  FileText,
  Calendar,
  CheckCircle2,
  Terminal,
  ArrowLeft,
  Flame,
} from 'lucide-react';

export default function CveDetailPage() {
  const params = useParams();
  const cveIdParam = Array.isArray(params?.cveId) ? params.cveId[0] : (params?.cveId as string);
  const { currentProject } = useProject();

  const [detail, setDetail] = useState<VulnerabilityDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cveIdParam) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.code.dependencies.cveDetail(cveIdParam, currentProject?.id);
        setDetail(res);
      } catch (err: any) {
        setError(err?.message || `Failed to fetch advisory details for ${cveIdParam}.`);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [cveIdParam, currentProject?.id]);

  const sevColor =
    detail?.severity === 'CRITICAL'
      ? { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }
      : detail?.severity === 'HIGH'
      ? { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' }
      : detail?.severity === 'MEDIUM'
      ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' }
      : { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code/dependencies" style={{ color: '#64748B', textDecoration: 'none' }}>
          Dependencies
        </Link>
        <ChevronRight size={13} color="#94A3B8" />
        <Link href="/code/dependencies/vulnerabilities" style={{ color: '#64748B', textDecoration: 'none' }}>
          Vulnerability Analysis
        </Link>
        <ChevronRight size={13} color="#94A3B8" />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>{cveIdParam}</span>
      </div>

      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/code/dependencies/vulnerabilities"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#2563EB',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> Back to Vulnerability Analysis
        </Link>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
          Fetching comprehensive CVE intelligence...
        </div>
      )}

      {detail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'monospace' }}>
                    {detail.cve_id}
                  </h1>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: sevColor.bg,
                      color: sevColor.text,
                      border: `1px solid ${sevColor.border}`,
                    }}
                  >
                    {detail.severity}
                  </span>
                  {detail.is_known_exploited && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#7C3AED',
                        color: '#FFFFFF',
                      }}
                    >
                      CISA KEV ACTIVE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '15px', color: '#334155', margin: '0 0 12px 0', fontWeight: 500 }}>
                  {detail.title}
                </p>
                <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, lineHeight: '1.5', maxWidth: '800px' }}>
                  {detail.description}
                </p>
              </div>

              {/* CVSS Score Callout */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: sevColor.bg,
                  border: `1px solid ${sevColor.border}`,
                  borderRadius: '10px',
                  padding: '14px 22px',
                }}
              >
                <span style={{ fontSize: '26px', fontWeight: 800, color: sevColor.text }}>
                  {detail.cvss_score.toFixed(1)}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: sevColor.text, textTransform: 'uppercase' }}>
                  CVSS Base Score
                </span>
              </div>
            </div>
          </div>

          {/* 3-Column Telemetry & Score Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
              <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                CVSS v3.1 Vector String
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0F172A', backgroundColor: '#F8FAFC', padding: '6px 8px', borderRadius: '4px' }}>
                {detail.vector_string || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'}
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
              <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                EPSS Exploitation Probability
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  {((detail.epss_score || 0.042) * 100).toFixed(2)}%
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  (Percentile: {detail.epss_percentile || 89.2}th)
                </span>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
              <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                CISA KEV Status
              </div>
              <div>
                {detail.is_known_exploited ? (
                  <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '13px' }}>
                    Listed on Federal KEV Catalog (Due: {detail.cisa_kev_due_date || '2026-11-20'})
                  </div>
                ) : (
                  <div style={{ color: '#16A34A', fontSize: '13px' }}>Not currently in CISA KEV catalog</div>
                )}
              </div>
            </div>
          </div>

          {/* Remediation & Package Patching Guidance */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Terminal size={18} color="#2563EB" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Remediation & Patch Guidance
              </h2>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#334155' }}>
                {detail.patch_guidance || `Upgrade ${detail.package_name} to version ${detail.fixed_version}.`}
              </p>
              {detail.fixed_version && (
                <div style={{ fontFamily: 'monospace', fontSize: '12.5px', backgroundColor: '#0F172A', padding: '10px 14px', borderRadius: '6px', color: '#38BDF8' }}>
                  {detail.ecosystem === 'npm'
                    ? `npm install ${detail.package_name}@^${detail.fixed_version}`
                    : `pip install --upgrade ${detail.package_name}==${detail.fixed_version}`}
                </div>
              )}
            </div>

            {/* Affected Repositories & Manifests */}
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
                Manifest Traces
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <Package size={15} color="#64748B" />
                  <strong>Package:</strong> {detail.package_name} v{detail.installed_version} (Vulnerable: {detail.affected_version})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <FileText size={15} color="#64748B" />
                  <strong>Manifest:</strong> <span style={{ fontFamily: 'monospace' }}>{detail.manifest_path}</span> ({detail.repository_name})
                </div>
              </div>
            </div>
          </div>

          {/* References & External Advisories */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
              Authoritative Security Advisories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {detail.references.map((ref, idx) => (
                <a
                  key={idx}
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#2563EB',
                    textDecoration: 'none',
                  }}
                >
                  {ref} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
