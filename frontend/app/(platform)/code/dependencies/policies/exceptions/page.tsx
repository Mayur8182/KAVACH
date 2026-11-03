'use client';

/**
 * Thing Code — 11 Dependency Policies
 * Subpage 5: Exceptions & Waivers (/code/dependencies/policies/exceptions)
 *
 * Implements Exceptions & Waivers view:
 * - Time-bounded policy exemptions with cryptographic evidence trail
 * - Approval workflow for business justifications and risk acceptance
 * - Automatic expiration monitoring to prevent persistent technical debt
 * - Data Reality: Real PostgreSQL state via `GET /api/v1/code/dependencies/policies/exceptions`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { PolicyExceptionsResponse, PolicyExceptionItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  FileCheck2,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export default function ExceptionsWaiversPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<PolicyExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.policyExceptions({
        projectId: currentProject?.id,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch policy exceptions.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedStatus, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exceptions = data?.exceptions || [];
  const filteredExceptions = exceptions.filter((e) => {
    const matchesSearch =
      searchTerm === '' ||
      e.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.policy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.requested_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.cve_id && e.cve_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      selectedStatus === 'all' || e.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
            }}
          >
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
            }}
          >
            <Clock size={12} /> Pending Review
          </span>
        );
      case 'expired':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
            }}
          >
            <AlertCircle size={12} /> Expired
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#64748B',
            }}
          >
            <XCircle size={12} /> Revoked
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      <DependenciesHeader
        title="Exceptions & Waivers"
        subtitle="Manage time-bounded security exceptions, risk acceptances, and policy waiver signoffs."
        currentSubpage="policies-exceptions"
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
          title="Total Exceptions"
          value={data?.total_exceptions || exceptions.length}
          subtext="Waiver requests logged"
          icon={<FileCheck2 size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Active Waivers"
          value={data?.active_count || exceptions.filter((e) => e.status === 'Active').length}
          subtext="Permitted by Security"
          icon={<CheckCircle2 size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Pending Approvals"
          value={data?.pending_count || exceptions.filter((e) => e.status === 'Pending').length}
          subtext="Awaiting review & signoff"
          icon={<Clock size={22} />}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          loading={loading}
        />

        <DependenciesMetricCard
          title="Expired / Revoked"
          value={exceptions.filter((e) => ['Expired', 'Revoked'].includes(e.status)).length}
          subtext="No longer exempted"
          icon={<AlertCircle size={22} />}
          iconBg="#F1F5F9"
          iconColor="#64748B"
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
                Policy Exceptions & Waivers Registry
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                All exceptions require dual-authorization and auto-expire within a maximum of 90 days.
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
              <Plus size={14} /> Request Waiver
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
                placeholder="Search package, breached policy, CVE, or author..."
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
              value={selectedStatus}
              aria-label="Filter by Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
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
              <option value="all">Status (All)</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending Review</option>
              <option value="Expired">Expired</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '10px 16px' }}>Package & Version</th>
                <th style={{ padding: '10px 16px' }}>Breached Policy / CVE</th>
                <th style={{ padding: '10px 16px' }}>Business Justification</th>
                <th style={{ padding: '10px 16px' }}>Requested By</th>
                <th style={{ padding: '10px 16px' }}>Approved By</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
                <th style={{ padding: '10px 16px' }}>Created</th>
                <th style={{ padding: '10px 16px' }}>Expires</th>
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
              ) : filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No policy exceptions or waivers found.
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((e) => (
                  <tr
                    key={e.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{e.package_name}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          v{e.target_version}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 500, color: '#1E40AF' }}>{e.policy_name}</span>
                        {e.cve_id && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#DC2626',
                              fontFamily: 'monospace',
                            }}
                          >
                            <ShieldAlert size={11} /> {e.cve_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '280px' }}>
                      {e.reason}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {e.requested_by}
                    </td>
                    <td style={{ padding: '12px 16px', color: e.approved_by ? '#15803D' : '#94A3B8' }}>
                      {e.approved_by || 'Pending Approval'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(e.status)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                      {e.created_at}
                    </td>
                    <td style={{ padding: '12px 16px', color: e.expires_at ? '#B45309' : '#64748B', fontSize: '12px' }}>
                      {e.expires_at || 'Permanent'}
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
