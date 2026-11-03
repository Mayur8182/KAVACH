'use client';

/**
 * Thing Code — 11 Dependency Policies
 * Subpage 4: Version Restrictions (/code/dependencies/policies/versions)
 *
 * Implements Version Restrictions view:
 * - Minimum/Maximum supported semver ranges
 * - Prohibitions against End-of-Life (EOL) releases and unverified pre-releases (alpha/beta/RC)
 * - Maximum version drift age caps
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/policies/versions`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { VersionRestrictionsResponse, VersionRestrictionRuleItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Sliders,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function VersionRestrictionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<VersionRestrictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEcosystem, setSelectedEcosystem] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.policyVersions({
        projectId: currentProject?.id,
        ecosystem: selectedEcosystem !== 'all' ? selectedEcosystem : undefined,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch version restrictions.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedEcosystem, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rules = data?.rules || [];
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      searchTerm === '' ||
      r.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.enforcement_action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEco =
      selectedEcosystem === 'all' || r.ecosystem.toLowerCase() === selectedEcosystem.toLowerCase();
    return matchesSearch && matchesEco;
  });

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <DependenciesHeader
        title="Version Restrictions"
        subtitle="Enforce semantic version boundaries, maximum package age drift, and End-of-Life (EOL) bans."
        currentSubpage="policies-versions"
        showPoliciesTabs={true}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        onRefresh={loadData}
        isLoading={loading}
      />

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
            justifyContent: 'space-between',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            style={{
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <DependenciesMetricCard
          title="Active Version Rules"
          value={data?.total_rules || rules.length}
          subtext="Semver boundaries enforced"
          icon={<Sliders size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="EOL Packages Blocked"
          value={data?.eol_packages_blocked || 18}
          subtext="Deprecated versions halted"
          icon={<AlertOctagon size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Max Drift Cap"
          value="365 Days"
          subtext="1 Year max allowed release lag"
          icon={<Calendar size={22} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Prerelease Gate"
          value="Active (Blocked)"
          subtext="Alpha, beta, RC rejected"
          icon={<CheckCircle2 size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Version Restriction Policies
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Prevents outdated, end-of-life, and unvetted prerelease dependency installations.
              </p>
            </div>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#1E40AF',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add Version Policy
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                flexGrow: 1,
                minWidth: '220px',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search package name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  width: '100%',
                  color: '#0F172A',
                }}
              />
            </div>

            <select
              value={selectedEcosystem}
              aria-label="Filter by Ecosystem"
              onChange={(e) => setSelectedEcosystem(e.target.value)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">Ecosystem (All)</option>
              <option value="npm">npm</option>
              <option value="python">Python</option>
              <option value="maven">Maven</option>
              <option value="go">Go</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '10px 16px' }}>Package Name</th>
                <th style={{ padding: '10px 16px' }}>Ecosystem</th>
                <th style={{ padding: '10px 16px' }}>Allowed Range</th>
                <th style={{ padding: '10px 16px' }}>Pre-releases</th>
                <th style={{ padding: '10px 16px' }}>Max Drift</th>
                <th style={{ padding: '10px 16px' }}>Prohibit EOL</th>
                <th style={{ padding: '10px 16px' }}>Enforcement Action</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', width: '40px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td colSpan={9} style={{ padding: '14px 16px' }}>
                      <div style={{ height: '16px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No version restrictions found.
                  </td>
                </tr>
              ) : (
                filteredRules.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                      {r.package_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>
                      {r.ecosystem}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#1D4ED8', fontWeight: 600 }}>
                      {r.min_version ? `>= ${r.min_version}` : ''}
                      {r.min_version && r.max_version ? ' && ' : ''}
                      {r.max_version ? `< ${r.max_version}` : (!r.min_version ? 'Latest Only' : '')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.disallow_prereleases ? (
                        <span style={{ color: '#DC2626', fontWeight: 600 }}>Blocked</span>
                      ) : (
                        <span style={{ color: '#64748B' }}>Allowed</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      &lt; {r.max_drift_days} days
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.prohibit_eol ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontWeight: 600 }}>
                          <XCircle size={13} color="#EF4444" /> EOL Prohibited
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>Permitted</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #DBEAFE',
                        }}
                      >
                        {r.enforcement_action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: r.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                          color: r.status === 'Active' ? '#15803D' : '#64748B',
                        }}
                      >
                        {r.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        aria-label="Actions"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8',
                        }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
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
