'use client';

/**
 * Thing Code — 11 Dependency Policies
 * Subpage 2: Vulnerability Thresholds (/code/dependencies/policies/vulnerabilities)
 *
 * Implements Vulnerability Thresholds view:
 * - Deterministic CVE tolerance rules by severity (CRITICAL, HIGH, MEDIUM, LOW)
 * - EPSS exploitability caps and CISA KEV (Known Exploited Vulnerabilities) zero-tolerance enforcement
 * - Merge blocking actions & CI/CD gate status
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/policies/vulnerabilities`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { VulnerabilityThresholdsResponse, VulnerabilityThresholdItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function VulnerabilityThresholdsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<VulnerabilityThresholdsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.policyVulnerabilities({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch vulnerability thresholds.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, selectedSeverity, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const thresholds = data?.thresholds || [];
  const filteredThresholds = thresholds.filter((t) => {
    const matchesSearch =
      searchTerm === '' ||
      t.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.enforcement_action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.scope.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity =
      selectedSeverity === 'all' || t.severity.toLowerCase() === selectedSeverity.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const getSeverityBadge = (severity: string) => {
    const s = severity.toUpperCase();
    let bg = '#FEE2E2';
    let text = '#B91C1C';
    let border = '#FECACA';

    if (s === 'HIGH') {
      bg = '#FFEDD5';
      text = '#C2410C';
      border = '#FED7AA';
    } else if (s === 'MEDIUM') {
      bg = '#FEF3C7';
      text = '#B45309';
      border = '#FDE68A';
    } else if (s === 'LOW') {
      bg = '#F1F5F9';
      text = '#475569';
      border = '#E2E8F0';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <ShieldAlert size={12} />
        {s}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <DependenciesHeader
        title="Vulnerability Thresholds"
        subtitle="Configure deterministic CVE tolerance limits, CVSS score caps, and exploitability gates for merges."
        currentSubpage="policies-vulnerabilities"
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
          title="Active Threshold Rules"
          value={data?.active_enforcements_count || thresholds.filter((t) => t.active).length}
          subtext="Blocking merges on violation"
          icon={<ShieldCheck size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Critical CVE Threshold"
          value="0 Allowed"
          subtext="Zero-tolerance for production"
          icon={<ShieldAlert size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        <DependenciesMetricCard
          title="High CVE Tolerance"
          value="Max 2 Allowed"
          subtext="CVSS < 8.5 required"
          icon={<AlertTriangle size={22} />}
          iconBg="#FFEDD5"
          iconColor="#C2410C"
          loading={loading}
        />

        <DependenciesMetricCard
          title="CISA KEV Gate"
          value={data?.kev_zero_tolerance ? 'Active (0-Day)' : 'Disabled'}
          subtext="Strict block on exploited CVEs"
          icon={<Flame size={22} />}
          iconBg="#FAF5FF"
          iconColor="#A855F7"
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
          marginBottom: '20px',
        }}
      >
        {/* Table Controls */}
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
                Vulnerability Gate Thresholds
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Rules evaluated automatically during pull request checks and artifact builds.
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
              <Plus size={14} /> Add Threshold
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
                placeholder="Search thresholds by severity or scope..."
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
              value={selectedSeverity}
              aria-label="Filter by Severity"
              onChange={(e) => setSelectedSeverity(e.target.value)}
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
              <option value="all">Severity (All)</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '10px 16px' }}>Severity Level</th>
                <th style={{ padding: '10px 16px' }}>Max Allowed</th>
                <th style={{ padding: '10px 16px' }}>CVSS Score Cap</th>
                <th style={{ padding: '10px 16px' }}>EPSS Exploit Cap</th>
                <th style={{ padding: '10px 16px' }}>Block CISA KEV</th>
                <th style={{ padding: '10px 16px' }}>Enforcement Action</th>
                <th style={{ padding: '10px 16px' }}>Scope</th>
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
              ) : filteredThresholds.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No vulnerability thresholds found.
                  </td>
                </tr>
              ) : (
                filteredThresholds.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      {getSeverityBadge(t.severity)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: t.max_allowed === 0 ? '#DC2626' : '#334155' }}>
                      {t.max_allowed === 0 ? '0 (Zero Tolerance)' : `${t.max_allowed} issues`}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>
                      &lt; {t.cvss_score_cap.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>
                      &lt; {(t.epss_threshold * 100).toFixed(0)}% probability
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {t.block_known_exploited ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#B91C1C', fontWeight: 600 }}>
                          <Flame size={13} color="#EF4444" /> Always Block
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>Allowed</span>
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
                          backgroundColor: '#FEE2E2',
                          color: '#B91C1C',
                          border: '1px solid #FECACA',
                        }}
                      >
                        {t.enforcement_action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                      {t.scope}
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
                          backgroundColor: t.active ? '#DCFCE7' : '#F1F5F9',
                          color: t.active ? '#15803D' : '#64748B',
                        }}
                      >
                        {t.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {t.active ? 'Enforcing' : 'Disabled'}
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
