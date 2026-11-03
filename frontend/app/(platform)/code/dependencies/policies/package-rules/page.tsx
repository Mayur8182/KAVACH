'use client';

/**
 * Thing Code — 11 Dependency Policies
 * Subpage 3: Allowed & Blocked Packages (/code/dependencies/policies/package-rules)
 *
 * Implements Allowed & Blocked Packages view:
 * - Package-level whitelisting, blacklisting, and restricted usage rules
 * - Explicit enforcement against typosquatting, malicious packages, and unapproved libraries
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/policies/package-rules`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PackageRulesResponse, PackageRuleItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  Ban,
  CheckCircle,
  AlertTriangle,
  Package,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function PackageRulesPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PackageRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedEcosystem, setSelectedEcosystem] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.policyPackageRules({
        projectId: currentProject?.id,
        ruleType: selectedType !== 'all' ? selectedType : undefined,
        ecosystem: selectedEcosystem !== 'all' ? selectedEcosystem : undefined,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch package rules.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedType, selectedEcosystem, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rules = data?.rules || [];
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      searchTerm === '' ||
      r.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.added_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === 'all' || r.rule_type.toLowerCase() === selectedType.toLowerCase();
    const matchesEco =
      selectedEcosystem === 'all' || r.ecosystem.toLowerCase() === selectedEcosystem.toLowerCase();
    return matchesSearch && matchesType && matchesEco;
  });

  const getRuleTypeBadge = (ruleType: string) => {
    const t = ruleType.toUpperCase();
    if (t === 'BLOCKED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          }}
        >
          <Ban size={11} /> Blocked
        </span>
      );
    }
    if (t === 'ALLOWED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #BBF7D0',
          }}
        >
          <CheckCircle size={11} /> Allowed
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
        }}
      >
        <AlertTriangle size={11} /> Restricted
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <DependenciesHeader
        title="Allowed & Blocked Packages"
        subtitle="Manage repository-wide blacklists, pre-approved software libraries, and security restrictions."
        currentSubpage="policies-package-rules"
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
          title="Total Package Rules"
          value={data?.total_rules || rules.length}
          subtext="Catalog rules active"
          icon={<Package size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Blocked Packages"
          value={data?.blocked_count || rules.filter((r) => r.rule_type === 'BLOCKED').length}
          subtext="Strictly banned from builds"
          icon={<Ban size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Allowed Whitelist"
          value={data?.allowed_count || rules.filter((r) => r.rule_type === 'ALLOWED').length}
          subtext="Verified internal & OSS"
          icon={<CheckCircle size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Restricted Packages"
          value={data?.restricted_count || rules.filter((r) => r.rule_type === 'RESTRICTED').length}
          subtext="Require security waiver"
          icon={<AlertTriangle size={22} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
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
                Package Rules Directory
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Enforced in real-time during manifest lockfile parsing and dependency installs.
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
              <Plus size={14} /> Add Package Rule
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
                placeholder="Search package name, reason, or author..."
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
              value={selectedType}
              aria-label="Filter by Rule Type"
              onChange={(e) => setSelectedType(e.target.value)}
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
              <option value="all">Rule Type (All)</option>
              <option value="BLOCKED">Blocked</option>
              <option value="ALLOWED">Allowed</option>
              <option value="RESTRICTED">Restricted</option>
            </select>

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
                <th style={{ padding: '10px 16px' }}>Rule Type</th>
                <th style={{ padding: '10px 16px' }}>Reason & Justification</th>
                <th style={{ padding: '10px 16px' }}>Scope</th>
                <th style={{ padding: '10px 16px' }}>Enforcement Action</th>
                <th style={{ padding: '10px 16px' }}>Added By</th>
                <th style={{ padding: '10px 16px' }}>Date Added</th>
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
                    No package rules found.
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
                    <td style={{ padding: '12px 16px' }}>
                      {getRuleTypeBadge(r.rule_type)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px' }}>
                      {r.reason}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                      {r.scope}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: r.rule_type === 'BLOCKED' ? '#FEE2E2' : '#EFF6FF',
                          color: r.rule_type === 'BLOCKED' ? '#B91C1C' : '#1D4ED8',
                        }}
                      >
                        {r.enforcement_action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {r.added_by}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                      {r.created_at}
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
