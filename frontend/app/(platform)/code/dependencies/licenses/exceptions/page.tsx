'use client';

/**
 * Thing Code — Exceptions & Approvals (/code/dependencies/licenses/exceptions)
 *
 * Subpage 5 of License Compliance:
 * Manages formal open-source license waivers, governance approval chains, and architectural isolation conditions.
 *
 * Data Source: PostgreSQL persistence via `GET /api/v1/code/dependencies/licenses/exceptions`
 * and `POST /api/v1/code/dependencies/licenses/exceptions`
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { LicenseExceptionsResponse, LicenseExceptionItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { LicenseExceptionModal } from '@/components/code/dependencies/licenses/LicenseExceptionModal';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Package,
  Calendar,
  User,
  ShieldAlert,
  XCircle,
  FileText,
  Info,
  ExternalLink,
} from 'lucide-react';

export default function LicenseExceptionsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<LicenseExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<LicenseExceptionItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.licenseExceptions({
        projectId: currentProject?.id,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch license exceptions.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exceptions = data?.exceptions || [];
  const pendingCount = data?.pending_count || 0;
  const approvedCount = data?.approved_count || 0;
  const rejectedCount = exceptions.filter((e) => e.status === 'REJECTED').length;
  const expiredCount = exceptions.filter((e) => e.status === 'EXPIRED').length;

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
            }}
          >
            <CheckCircle2 size={12} />
            Approved
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              border: '1px solid #FDE68A',
            }}
          >
            <Clock size={12} />
            Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
            }}
          >
            <XCircle size={12} />
            Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              border: '1px solid #E2E8F0',
            }}
          >
            Expired
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#475569',
            }}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Header */}
      <DependenciesHeader
        title="Exceptions & Approvals"
        subtitle="Manage formal license waivers, legal compliance sign-offs, and architectural containment conditions."
        currentSubpage="licenses-exceptions"
        showLicenseTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        extraActions={
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <Plus size={16} />
            Request Waiver
          </button>
        }
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Total Exceptions"
          value={data?.total ?? 0}
          icon={FileCheck}
          iconColor="#6366F1"
          iconBgColor="#EEF2FF"
          description="Registered compliance waivers"
        />
        <DependenciesMetricCard
          title="Approved Waivers"
          value={approvedCount}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBgColor="#ECFDF5"
          description="Active and verified by legal gate"
        />
        <DependenciesMetricCard
          title="Pending Review"
          value={pendingCount}
          icon={Clock}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          description="Awaiting governance sign-off"
        />
        <DependenciesMetricCard
          title="Expired / Rejected"
          value={rejectedCount + expiredCount}
          icon={AlertTriangle}
          iconColor="#EF4444"
          iconBgColor="#FEE2E2"
          description="Waivers requiring re-evaluation"
        />
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Table Toolbar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              License Compliance Waivers & Governance Log
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Deterministic audit register of approved exceptions for copyleft and restricted packages.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#94A3B8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search package or reason..."
                style={{
                  padding: '7px 12px 7px 34px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  color: '#0F172A',
                  outline: 'none',
                  width: '230px',
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#64748B" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 20px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  PACKAGE & VERSION
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  LICENSE
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  STATUS
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B', maxWidth: '340px' }}>
                  JUSTIFICATION & CONDITIONS
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  REQUESTED BY
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  APPROVED BY
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  EXPIRES AT
                </th>
                <th style={{ padding: '12px 20px', fontSize: '11.5px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && exceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Loading license exceptions...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        color: '#64748B',
                      }}
                    >
                      <FileCheck size={24} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                      No License Waivers Found
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                      No active or pending license waivers match the selected filters. Use the button below to submit a formal waiver for restricted or prohibited dependencies.
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Request License Waiver
                    </button>
                  </td>
                </tr>
              ) : (
                exceptions.map((exc) => (
                  <tr
                    key={exc.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Package Name & Version */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            flexShrink: 0,
                          }}
                        >
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {exc.package_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            v{exc.package_version}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* License Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          fontFamily: 'monospace',
                        }}
                      >
                        {exc.license_name}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(exc.status)}
                    </td>

                    {/* Justification & Conditions */}
                    <td style={{ padding: '14px 16px', maxWidth: '340px' }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          color: '#1E293B',
                          marginBottom: exc.conditions ? '4px' : '0',
                          lineHeight: '1.4',
                        }}
                      >
                        {exc.reason}
                      </div>
                      {exc.conditions && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            backgroundColor: '#F8FAFC',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px dashed #CBD5E1',
                            display: 'inline-block',
                          }}
                        >
                          Condition: {exc.conditions}
                        </div>
                      )}
                    </td>

                    {/* Requested By */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="#64748B" />
                        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                          {exc.requested_by}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {new Date(exc.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Approved By */}
                    <td style={{ padding: '14px 16px' }}>
                      {exc.approved_by ? (
                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                          {exc.approved_by}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Awaiting Review
                        </span>
                      )}
                    </td>

                    {/* Expires At */}
                    <td style={{ padding: '14px 16px' }}>
                      {exc.expires_at ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#64748B" />
                          <span style={{ fontSize: '12px', color: '#334155' }}>
                            {new Date(exc.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          Indefinite
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedDetail(exc)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#2563EB',
                          cursor: 'pointer',
                        }}
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Detail Modal / Drawer */}
      {selectedDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck size={20} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Waiver Governance Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  fontSize: '18px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedDetail.package_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                    Version: {selectedDetail.package_version}
                  </div>
                </div>
                {getStatusBadge(selectedDetail.status)}
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  License & Governance Scope
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                  {selectedDetail.license_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Business & Engineering Justification
                </div>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    color: '#1E293B',
                    lineHeight: '1.5',
                  }}
                >
                  {selectedDetail.reason}
                </div>
              </div>

              {selectedDetail.conditions && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Architectural Containment Conditions
                  </div>
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12.5px',
                      color: '#1E40AF',
                      lineHeight: '1.5',
                    }}
                  >
                    {selectedDetail.conditions}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Requested By</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {selectedDetail.requested_by}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {new Date(selectedDetail.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Approved By</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {selectedDetail.approved_by || 'Pending Governance Review'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {selectedDetail.expires_at
                      ? `Expires ${new Date(selectedDetail.expires_at).toLocaleDateString()}`
                      : 'Indefinite approval'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => setSelectedDetail(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Waiver Request Modal */}
      <LicenseExceptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
