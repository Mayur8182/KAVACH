'use client';

/**
 * Thing Code — Breaking Change Analysis (/code/dependencies/versions/breaking-changes)
 *
 * Impact analysis of major version bumps with breaking API changes and migration documentation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { BreakingChangesResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  FileCode,
} from 'lucide-react';

export default function BreakingChangesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<BreakingChangesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.breakingChanges({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load breaking change analysis.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];

  return (
    <div style={{ maxWidth: '1680px', margin: '0 auto', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Breaking Change Analysis"
        subtitle="Evaluate breaking API modifications, deprecations, and codemod migrations before major upgrades."
        currentSubpage="versions-breaking-changes"
        showVersionTabs={true}
        onRefresh={loadData}
        isLoading={loading}
      />

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Major Drift Packages"
          value={items.length}
          subtext="Requires architectural review"
          icon={<AlertTriangle size={20} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
        />
        <DependenciesMetricCard
          title="High Risk Upgrades"
          value={data?.high_risk_count || 0}
          subtext="Packages with breaking APIs"
          icon={<AlertTriangle size={20} />}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
      </div>

      {/* List of Breaking Change Packages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B' }}>
            Analyzing breaking changes and migration guides...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} color="#3B82F6" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                No Repositories Scanned Yet
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                No dependency manifests have been analyzed. Connect a repository and run a Software Composition Analysis (SCA) scan to detect breaking API changes and major version bumps.
              </p>
              <Link
                href="/code/repositories"
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Go to Repositories
              </Link>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                    {item.package_name}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', textTransform: 'uppercase' }}>
                    {item.ecosystem}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                    <span style={{ color: '#64748B' }}>v{item.current_version}</span>
                    <ArrowRight size={13} color="#94A3B8" />
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>v{item.target_version}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: item.risk_level === 'HIGH' ? '#FEF2F2' : '#FFFBEB',
                      color: item.risk_level === 'HIGH' ? '#DC2626' : '#D97706',
                    }}
                  >
                    {item.risk_level} RISK
                  </span>
                  {item.migration_guide_url && (
                    <a
                      href={item.migration_guide_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563EB',
                        textDecoration: 'none',
                      }}
                    >
                      <BookOpen size={13} />
                      <span>Migration Guide</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Breaking APIs List */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 16px', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Detected Breaking Changes & Deprecations ({item.breaking_changes_count}):
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {item.breaking_apis.map((apiItem, idx) => (
                    <li key={idx}>{apiItem}</li>
                  ))}
                </ul>
              </div>

              {/* Remediation Notes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                <span><strong>Remediation:</strong> {item.remediation_notes}</span>
                <span>Affected files: {item.affected_files_count}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
