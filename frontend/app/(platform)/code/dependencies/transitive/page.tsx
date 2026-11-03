'use client';

/**
 * Thing Code — Transitive Dependencies (/code/dependencies/transitive)
 *
 * Dedicated view for indirect, secondary dependencies brought in via root packages.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/transitive`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { DependencyInventoryResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Clock,
  ShieldAlert,
  Search,
  Filter,
  ChevronRight,
  GitFork,
  FileCode,
  CheckCircle2,
} from 'lucide-react';

export default function TransitiveDependenciesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DependencyInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ecosystem, setEcosystem] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.transitive({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        ecosystem: ecosystem !== 'all' ? ecosystem : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transitive dependencies.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search, ecosystem]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const metrics = data?.metrics;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Transitive Dependencies"
        subtitle="Indirect dependencies brought in transitively through upstream third-party libraries."
        currentSubpage="transitive"
        onRefresh={loadData}
        isLoading={loading}
        showInventoryTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Transitive Dependencies"
          value={metrics?.transitive_dependencies || items.length}
          subtext="Indirect sub-packages"
          icon={<Clock size={24} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Transitive Vulnerabilities"
          value={items.filter((i) => i.security_status !== 'SAFE').length}
          subtext="Vulnerabilities in deep graph"
          icon={<ShieldAlert size={24} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Dependency Depth"
          value="Sub-tree"
          subtext="Resolved from lockfile graph"
          icon={<GitFork size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', flexGrow: 1, maxWidth: '360px' }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search transitive packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#0F172A', width: '100%' }}
          />
        </div>

        <select
          value={ecosystem}
          aria-label="Filter transitive dependencies by ecosystem"
          onChange={(e) => setEcosystem(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 500, color: '#334155' }}
        >
          <option value="all">All Ecosystems</option>
          <option value="npm">npm</option>
          <option value="pypi">PyPI</option>
          <option value="go">Go</option>
          <option value="cargo">Cargo</option>
          <option value="maven">Maven</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 110px 110px 140px 1.8fr 90px', gap: '12px', padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
          <span>Package</span>
          <span>Ecosystem</span>
          <span>License</span>
          <span>Security</span>
          <span>Introduced By</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '16px' }}>
              <div style={{ height: '16px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
              <div style={{ height: '16px', flexGrow: 1, backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: '8px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>No Transitive Dependencies Found</h3>
          </div>
        ) : (
          items.map((item, idx) => {
            const isCritical = item.security_status === 'CRITICAL';
            const isVulnerable = item.security_status === 'VULNERABLE';

            return (
              <div
                key={item.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 110px 110px 140px 1.8fr 90px',
                  gap: '12px',
                  padding: '12px 16px',
                  alignItems: 'center',
                  borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                    {item.name.replace('@', '').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px', fontFamily: 'monospace' }}>v{item.version}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', textTransform: 'uppercase' }}>
                    {item.ecosystem}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#475569' }}>{item.license || 'MIT'}</span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: isCritical ? '#FEE2E2' : isVulnerable ? '#FFEDD5' : '#DCFCE7', color: isCritical ? '#DC2626' : isVulnerable ? '#EA580C' : '#16A34A' }}>
                    {item.vulnerability_count > 0 ? `${item.vulnerability_count} CVEs` : 'Clean'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{item.introduced_by || 'Transitive Dependency'}</span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Link href={`/code/dependencies/${encodeURIComponent(item.id)}`} style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                    View &gt;
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
