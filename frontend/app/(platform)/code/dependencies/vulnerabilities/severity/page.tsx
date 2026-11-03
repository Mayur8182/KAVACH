'use client';

/**
 * Thing Code — Critical & High CVEs (/code/dependencies/vulnerabilities/severity)
 *
 * Filtered prioritized view of Critical (CVSS 9.0+) and High (CVSS 7.0 - 8.9) vulnerabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { VulnerabilityAnalysisResponse, VulnerabilityItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CriticalHighCVEsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<VulnerabilityAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ecosystem, setEcosystem] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.criticalHigh({
        projectId: currentProject?.id,
        ecosystem: ecosystem !== 'ALL' ? ecosystem : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load critical & high CVEs.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, ecosystem, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = items.filter((i) => i.severity === 'HIGH').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Critical & High CVEs"
        subtitle="Immediate-threat dependency vulnerabilities requiring active triage, patching, or virtual mitigation."
        currentSubpage="vulnerabilities-severity"
        onRefresh={loadData}
        isLoading={loading}
        showVulnerabilityTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Critical CVEs"
          value={criticalCount}
          subtext="CVSS score >= 9.0"
          icon={<Flame size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="High Severity CVEs"
          value={highCount}
          subtext="CVSS score 7.0 - 8.9"
          icon={<ShieldAlert size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Fixes Available"
          value={items.filter((i) => i.has_fix).length}
          subtext="Patches ready to apply"
          icon={<Sparkles size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Active Exploits (KEV)"
          value={items.filter((i) => i.is_known_exploited).length}
          subtext="Known in-the-wild weaponization"
          icon={<AlertTriangle size={24} />}
          iconBg="#FAF5FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Search & Filter Toolbar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px', maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 12px',
                width: '100%',
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search Critical & High CVEs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={ecosystem}
              onChange={(e) => setEcosystem(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Ecosystems</option>
              <option value="npm">npm</option>
              <option value="pypi">PyPI</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 18px' }}>Advisory & CVE</th>
                <th style={{ padding: '12px 18px' }}>Severity</th>
                <th style={{ padding: '12px 18px' }}>CVSS Score</th>
                <th style={{ padding: '12px 18px' }}>Package & Installed Version</th>
                <th style={{ padding: '12px 18px' }}>Target Fixed Version</th>
                <th style={{ padding: '12px 18px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    Filtering critical and high CVEs...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', marginBottom: '12px' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                      No critical or high severity CVEs found
                    </div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      All monitored dependencies are within tolerable risk thresholds.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isCrit = item.severity === 'CRITICAL';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                              {item.cve_id}
                            </span>
                            {item.is_known_exploited && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#7C3AED', color: '#FFFFFF', fontWeight: 600 }}>
                                CISA KEV
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12.5px', color: '#64748B' }}>{item.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: isCrit ? '#FEF2F2' : '#FFF7ED',
                            color: isCrit ? '#DC2626' : '#EA580C',
                            border: `1px solid ${isCrit ? '#FECACA' : '#FFEDD5'}`,
                          }}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {item.cvss_score.toFixed(1)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.package_name}</span>
                          <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>
                            v{item.installed_version} ({item.ecosystem})
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {item.fixed_version ? (
                          <span style={{ color: '#16A34A', fontWeight: 600, fontFamily: 'monospace' }}>
                            v{item.fixed_version}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12.5px' }}>No fix released</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <Link
                          href={`/code/dependencies/vulnerabilities/${encodeURIComponent(item.cve_id)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#2563EB',
                            fontSize: '12.5px',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          Details <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
