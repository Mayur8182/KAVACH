'use client';

/**
 * Thing Code — Fix Available (/code/dependencies/vulnerabilities/fix-available)
 *
 * Vulnerabilities with verified upstream fixed versions ready to patch and deploy.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { VulnerabilityAnalysisResponse } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronRight,
  GitPullRequest,
} from 'lucide-react';

export default function FixAvailablePage() {
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
      const res = await api.code.dependencies.fixAvailable({
        projectId: currentProject?.id,
        ecosystem: ecosystem !== 'ALL' ? ecosystem : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fixable vulnerabilities.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, ecosystem, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Fix Available"
        subtitle="Prioritized vulnerabilities with verified upstream patch releases ready for immediate automated upgrade."
        currentSubpage="vulnerabilities-fix"
        onRefresh={loadData}
        isLoading={loading}
        showVulnerabilityTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Direct Patches Available"
          value={items.length}
          subtext="Ready to upgrade"
          icon={<Sparkles size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Critical Fixes"
          value={items.filter((i) => i.severity === 'CRITICAL').length}
          subtext="Urgent upstream versions"
          icon={<ShieldCheck size={24} />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          loading={loading}
        />
        <DependenciesMetricCard
          title="High Severity Fixes"
          value={items.filter((i) => i.severity === 'HIGH').length}
          subtext="High severity patches"
          icon={<ShieldCheck size={24} />}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Automation Readiness"
          value="100%"
          subtext="Package manifests identified"
          icon={<GitPullRequest size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
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
                placeholder="Search fixable vulnerabilities..."
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
                <th style={{ padding: '12px 18px' }}>Vulnerability</th>
                <th style={{ padding: '12px 18px' }}>Severity</th>
                <th style={{ padding: '12px 18px' }}>Package</th>
                <th style={{ padding: '12px 18px' }}>Current Version</th>
                <th style={{ padding: '12px 18px' }}>Recommended Upgrade</th>
                <th style={{ padding: '12px 18px' }}>Manifest</th>
                <th style={{ padding: '12px 18px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    Loading fixable vulnerabilities...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', marginBottom: '12px' }}>
                      <CheckCircle2 size={32} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#0F172A', marginBottom: '4px' }}>
                      No unpatched vulnerabilities with available fixes
                    </div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      All fixable vulnerabilities have been remediated.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isCrit = item.severity === 'CRITICAL';
                  const isHigh = item.severity === 'HIGH';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                            {item.cve_id}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{item.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : '#FFFBEB',
                            color: isCrit ? '#DC2626' : isHigh ? '#EA580C' : '#D97706',
                          }}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {item.package_name}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#64748B' }}>
                        v{item.installed_version}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#F0FDF4',
                            color: '#16A34A',
                            border: '1px solid #BBF7D0',
                            fontFamily: 'monospace',
                          }}
                        >
                          v{item.fixed_version}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12px', color: '#64748B' }}>
                        {item.manifest_path}
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
                          Remediate <ChevronRight size={14} />
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
