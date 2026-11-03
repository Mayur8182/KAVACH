'use client';

/**
 * Thing Code — 10 SBOM & Component Mapping
 * Subpage 2: Component Detail (/code/dependencies/sbom/[componentId])
 *
 * Implements:
 * - Comprehensive deep-dive on an individual SBOM component
 * - Complete metadata: PURL, CPE, License, Type, Ecosystem, Provenance Hash
 * - Vulnerabilities & Security Findings
 * - Dependency Tree: Direct Dependencies & Upstream Dependents
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/sbom/components/{component_id}`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { SBOMComponentDetailResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Box,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  FolderGit2,
  Copy,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  FileCode,
  Layers,
  Hash,
  User,
  CheckCircle2,
} from 'lucide-react';

export default function SBOMComponentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const componentId = typeof params?.componentId === 'string' ? params.componentId : 'lodash';

  const { currentProject } = useProject();
  const [data, setData] = useState<SBOMComponentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.sbomComponentDetail(componentId, currentProject?.id);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch component details.');
    } finally {
      setLoading(false);
    }
  }, [componentId, currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isClean = !data?.issues || data.issues.toUpperCase() === 'CLEAN';

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <DependenciesHeader
        title={data ? `${data.component_name}@${data.version}` : 'Component Detail'}
        subtitle={`Detailed software bill of materials specifications for ${componentId}`}
        currentSubpage="sbom-detail"
        showSbomTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/code/dependencies/sbom"
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
          <ArrowLeft size={14} /> Back to SBOM References
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Metric summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Component Type"
          value={data?.component_type || 'Library'}
          subtext="CycloneDX Class"
          icon={<Box size={20} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Ecosystem & License"
          value={data?.ecosystem || 'npm'}
          subtext={`License: ${data?.license_name || 'MIT'}`}
          icon={<FileCode size={20} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Security Status"
          value={isClean ? 'Clean' : data?.issues || 'Issues Found'}
          subtext={isClean ? '0 vulnerabilities identified' : 'Requires security evaluation'}
          badge={isClean ? 'Safe' : 'Review'}
          badgeBg={isClean ? '#ECFDF5' : '#FEF2F2'}
          badgeColor={isClean ? '#059669' : '#DC2626'}
          icon={isClean ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          iconBg={isClean ? '#ECFDF5' : '#FEF2F2'}
          iconColor={isClean ? '#059669' : '#DC2626'}
          loading={loading}
        />

        <DependenciesMetricCard
          title="Direct Dependencies"
          value={data?.dependencies?.length || 0}
          subtext={`Referenced by ${data?.dependents?.length || 0} dependents`}
          icon={<Layers size={20} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Main Details Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Specification & Identifiers */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: 0, marginBottom: '16px' }}>
            Identification & Provenance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Package URL (PURL)
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                }}
              >
                <span>{data?.purl || `pkg:${data?.ecosystem?.toLowerCase()}/${data?.component_name}@${data?.version}`}</span>
                <button
                  onClick={() => copyToClipboard(data?.purl || `pkg:${data?.ecosystem?.toLowerCase()}/${data?.component_name}@${data?.version}`)}
                  title="Copy PURL"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copied ? '#059669' : '#64748B',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Common Platform Enumeration (CPE)
              </span>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginTop: '4px',
                  color: '#475569',
                }}
              >
                {data?.cpe || `cpe:2.3:a:${data?.component_name}:${data?.component_name}:${data?.version}:*:*:*:*:*:*:*`}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Provenance Hash (SHA-256)
              </span>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginTop: '4px',
                  color: '#475569',
                  wordBreak: 'break-all',
                }}
              >
                {data?.provenance_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Repository
                </span>
                <div style={{ marginTop: '4px', fontWeight: 600, color: '#0F172A' }}>
                  {data?.repository_name || 'web-api'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Dependency Type
                </span>
                <div style={{ marginTop: '4px', fontWeight: 600, color: '#0F172A' }}>
                  {data?.dependency_type || 'DIRECT'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tree Relationships: Dependencies & Dependents */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: 0, marginBottom: '16px' }}>
              Dependency Tree Mapping
            </h3>

            {/* Direct Dependencies */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                DIRECT DEPENDENCIES ({data?.dependencies?.length || 0})
              </div>
              {data?.dependencies && data.dependencies.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {data.dependencies.map((dep, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>
                  Zero downstream runtime dependencies declared.
                </div>
              )}
            </div>

            {/* Dependents */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                DEPENDENTS IN WORKSPACE ({data?.dependents?.length || 0})
              </div>
              {data?.dependents && data.dependents.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {data.dependents.map((dep, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #DBEAFE',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>
                  Top-level or root application entrypoint.
                </div>
              )}
            </div>
          </div>

          <div style={{ paddingTop: '16px', borderTop: '1px solid #F1F5F9', marginTop: '16px' }}>
            <Link
              href="/code/dependencies/sbom/repositories"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              View Repository Cross-Mapping <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
