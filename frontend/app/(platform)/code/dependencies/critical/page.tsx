'use client';

/**
 * Thing Code — Critical Dependencies (/code/dependencies/critical)
 *
 * Triage and remediation table for High & Critical severity packages.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/critical`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { CriticalDependenciesResponse, CriticalDependencyItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Wand2,
  ExternalLink,
  ChevronRight,
  FileCode,
  FolderGit2,
  CheckCircle2,
} from 'lucide-react';

export default function CriticalDependenciesPage() {
  const { currentProject, currentRepository, setCurrentRepository, repositories } = useScope();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [data, setData] = useState<CriticalDependenciesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [severity, setSeverity] = useState<string>('all');
  const [ecosystem, setEcosystem] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.critical({
        projectId: currentProject?.id,
        repositoryId: currentRepository?.name || currentRepository?.id || undefined,
        severity: severity !== 'all' ? severity : undefined,
        ecosystem: ecosystem !== 'all' ? ecosystem : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load critical dependencies.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, currentRepository?.id, currentRepository?.name, severity, ecosystem, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const fixableCount = items.filter((i) => Boolean(i.fixed_version)).length;
  const avgCvss = items.length > 0
    ? (items.reduce((sum, i) => sum + (i.cvss_score || 7.5), 0) / items.length).toFixed(1)
    : '0.0';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Critical Dependencies"
        subtitle="High and Critical severity packages posing immediate exploitation risk to production workloads."
        currentSubpage="critical"
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={currentRepository?.name || 'All Repositories'}
        onRepoChange={(repoName) => {
          if (repoName === 'all' || repoName === 'All Repositories') {
            setCurrentRepository(null);
          } else {
            const found = repositories.find((r) => r.name === repoName || r.id === repoName);
            setCurrentRepository(found || { id: repoName, name: repoName });
          }
        }}
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Critical Severity"
          value={data?.critical_count || 0}
          subtext="Immediate exploitation risk"
          badge={Number(data?.critical_count || 0) > 0 ? 'Urgent' : 'Zero'}
          badgeColor={Number(data?.critical_count || 0) > 0 ? '#DC2626' : '#16A34A'}
          badgeBg={Number(data?.critical_count || 0) > 0 ? '#FEE2E2' : '#DCFCE7'}
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />

        <DependenciesMetricCard
          title="High Severity"
          value={data?.high_count || 0}
          subtext="Elevated threat posture"
          icon={<AlertTriangle size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Fixable With Upgrade"
          value={fixableCount}
          subtext="Patch version available"
          badge={`${items.length > 0 ? Math.round((fixableCount / items.length) * 100) : 0}%`}
          badgeColor="#2563EB"
          badgeBg="#EFF6FF"
          icon={<Wand2 size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Average CVSS Score"
          value={avgCvss}
          subtext="Exploitability impact index"
          icon={<ShieldAlert size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Search & Filters Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '6px 12px',
            minWidth: '260px',
            flexGrow: 1,
            maxWidth: '400px',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search package name or CVE ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#0F172A',
              width: '100%',
            }}
          />
        </div>

        {/* Severity & Ecosystem filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <Filter size={14} />
            <span>Severity:</span>
            <select
              value={severity}
              aria-label="Filter by severity"
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <span>Ecosystem:</span>
            <select
              value={ecosystem}
              aria-label="Filter by ecosystem"
              onChange={(e) => setEcosystem(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Ecosystems</option>
              <option value="npm">npm (Node.js)</option>
              <option value="pypi">PyPI (Python)</option>
              <option value="go">Go Modules</option>
              <option value="cargo">Cargo (Rust)</option>
              <option value="maven">Maven (Java)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Critical Dependencies Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 80px 2.5fr 1.5fr 1.5fr 110px',
            gap: '12px',
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span>Package &amp; Version</span>
          <span>Severity</span>
          <span>CVSS</span>
          <span>Vulnerability</span>
          <span>Repository</span>
          <span>Fixed In</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div style={{ height: '20px', width: '120px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
              <div style={{ height: '16px', flexGrow: 1, backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Zero Critical or High Vulnerabilities
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0', maxWidth: '420px' }}>
              No packages matching the selected criteria currently exhibit Critical or High CVE scores.
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const isCritical = item.severity === 'CRITICAL';
            return (
              <div
                key={item.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 100px 80px 2.5fr 1.5fr 1.5fr 110px',
                  gap: '12px',
                  padding: '14px 18px',
                  alignItems: 'center',
                  borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: '13px',
                  transition: 'background-color 100ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                {/* Package name + installed version */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.package_name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '4px',
                        color: '#64748B',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {item.ecosystem}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                    v{item.installed_version}
                  </span>
                </div>

                {/* Severity Badge */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isCritical ? '#FEE2E2' : '#FFEDD5',
                      color: isCritical ? '#DC2626' : '#C2410C',
                    }}
                  >
                    {item.severity}
                  </span>
                </div>

                {/* CVSS Score */}
                <div>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: Number(item.cvss_score || 0) >= 9.0 ? '#DC2626' : '#EA580C',
                    }}
                  >
                    {item.cvss_score ? item.cvss_score.toFixed(1) : '—'}
                  </span>
                </div>

                {/* Vulnerability details */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: '11px', color: '#2563EB', fontFamily: 'monospace' }}>
                    {item.vulnerability_id}
                  </span>
                </div>

                {/* Repository & File */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FolderGit2 size={13} color="#64748B" />
                    <span style={{ fontSize: '12px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.repository || 'workspace'}
                    </span>
                  </div>
                  {item.file_path && (
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file_path}
                    </span>
                  )}
                </div>

                {/* Fixed Version */}
                <div>
                  {item.fixed_version ? (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#16A34A',
                        backgroundColor: '#DCFCE7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                      }}
                    >
                      &gt;= {item.fixed_version}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>No fix yet</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <Link
                    href={`/code/findings/${encodeURIComponent(item.id)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2563EB',
                      textDecoration: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span>Inspect</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
