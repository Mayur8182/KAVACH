'use client';

/**
 * Thing Code — Dependency Detail (/code/dependencies/[dependencyId])
 *
 * In-depth technical analysis for a specific package:
 *  - Full Package Metadata & Manifest Source
 *  - Vulnerability Breakdown & CVE Advisories
 *  - License Compliance & Legal Risk
 *  - Code References & Call-Site Snippets
 *  - Upstream / Transitive Dependency Tree
 */

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { DependencyDetailResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Box,
  ShieldAlert,
  ShieldCheck,
  FileText,
  FileCode2,
  FolderGit2,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  GitFork,
  Code2,
  CheckCircle2,
} from 'lucide-react';

interface DependencyDetailPageProps {
  params: Promise<{ dependencyId: string }>;
}

export default function DependencyDetailPage({ params }: DependencyDetailPageProps) {
  const resolvedParams = use(params);
  const dependencyId = decodeURIComponent(resolvedParams.dependencyId);
  const { currentProject } = useProject();

  const [detail, setDetail] = useState<DependencyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.detail(dependencyId, currentProject?.id);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load package details.');
    } finally {
      setLoading(false);
    }
  }, [dependencyId, currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCritical = detail?.security_status === 'CRITICAL';
  const isVulnerable = detail?.security_status === 'VULNERABLE';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/code/dependencies/inventory"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Dependency Inventory</span>
        </Link>
      </div>

      <DependenciesHeader
        title={detail?.name || dependencyId}
        subtitle={`Package details, vulnerability posture, and usage citations across repositories.`}
        currentSubpage="detail"
        onRefresh={loadData}
        isLoading={loading}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Installed Version"
          value={`v${detail?.version || '1.0.0'}`}
          subtext={`Latest: v${detail?.latest_version || detail?.version || '1.0.0'}`}
          icon={<Box size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Security Posture"
          value={detail?.vulnerability_count || 0}
          subtext="Known CVE advisories"
          badge={detail?.security_status || 'Safe'}
          badgeColor={isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#16A34A'}
          badgeBg={isCritical ? '#FEE2E2' : isVulnerable ? '#FFEDD5' : '#DCFCE7'}
          icon={<ShieldAlert size={24} />}
          iconBg={isCritical ? '#FEF2F2' : isVulnerable ? '#FFF7ED' : '#F0FDF4'}
          iconColor={isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#16A34A'}
          loading={loading}
        />

        <DependenciesMetricCard
          title="License Compliance"
          value={detail?.license || 'MIT'}
          subtext={`${detail?.license_risk || 'Low'} license risk`}
          icon={<FileText size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Code References"
          value={detail?.usage_references?.length || 0}
          subtext="File import locations"
          icon={<Code2 size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />
      </div>

      {/* Two-Column Details Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: '20px',
        }}
      >
        {/* Left Column: Vulnerabilities & Usage Snippets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Vulnerability Findings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
              Security Findings &amp; CVEs
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
              Advisories reported by deterministic SCA scanners (Trivy, OSV)
            </p>

            {!detail?.vulnerabilities || detail.vulnerabilities.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '8px',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                }}
              >
                <CheckCircle2 size={24} color="#16A34A" />
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Zero Known Vulnerabilities</span>
                  <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: '#15803D' }}>
                    No public CVEs or security advisories match package version {detail?.version}.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {detail.vulnerabilities.map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                        {v.title || v.id}
                      </span>
                      <p style={{ fontSize: '11px', color: '#DC2626', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                        {v.id}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        padding: '3px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {v.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Code References & Call Sites */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
              Usage &amp; Call-Site Citations
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
              Files and import statements referencing {detail?.name}
            </p>

            {!detail?.usage_references || detail.usage_references.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                No direct import statements indexed for this package.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {detail.usage_references.map((ref, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCode2 size={14} color="#2563EB" />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                          {ref.file_path}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          (line {ref.line_number})
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ref.reference_type}
                      </span>
                    </div>

                    {ref.code_snippet && (
                      <div
                        style={{
                          backgroundColor: '#0F172A',
                          color: '#E2E8F0',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                        }}
                      >
                        <code>{ref.code_snippet}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
              Package Properties
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Dependency Type</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {detail?.is_direct ? 'Direct Dependency' : 'Transitive Dependency'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Ecosystem</span>
                <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>
                  {detail?.ecosystem}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Primary Manifest</span>
                <span style={{ fontWeight: 500, color: '#2563EB', fontFamily: 'monospace' }}>
                  {detail?.manifest_path || 'package.json'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Introduced By</span>
                <span style={{ fontWeight: 500, color: '#0F172A' }}>
                  {detail?.introduced_by || 'Root Manifest'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Repository</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {detail?.repository_name || 'workspace'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Last Scanned</span>
                <span style={{ color: '#94A3B8' }}>
                  {detail?.last_scanned_at ? new Date(detail.last_scanned_at).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
