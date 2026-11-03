'use client';

/**
 * Thing Code — License Violations (/code/dependencies/licenses/violations)
 *
 * Subpage 3 of License Compliance:
 * Audits non-compliant packages that breach legal or corporate open source license policies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { LicenseViolationsResponse, LicenseViolationItem, LicenseInventoryItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { LicenseExceptionModal } from '@/components/code/dependencies/licenses/LicenseExceptionModal';
import {
  ShieldAlert,
  AlertOctagon,
  FileWarning,
  Wrench,
  Search,
  Filter,
  ExternalLink,
  Package,
  AlertTriangle,
} from 'lucide-react';

export default function LicenseViolationsPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<LicenseViolationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState('all');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageForWaiver, setSelectedPackageForWaiver] = useState<LicenseInventoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.licenseViolations({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch license violations.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const violations = data?.violations || [];
  const highCount = data?.high_severity_count || 0;
  const directCount = violations.filter((v) => v.is_direct).length;

  const handleOpenWaiver = (v: LicenseViolationItem) => {
    setSelectedPackageForWaiver({
      id: v.id,
      package_name: v.package_name,
      package_version: v.package_version,
      license_name: v.license_name,
      license_type: v.license_type,
      compliance_status: 'Prohibited',
      risk_level: v.severity,
      usage_type: v.is_direct ? 'Direct' : 'Transitive',
      used_in_files_count: 1,
      used_in_paths: [v.usage_path],
      repository_name: selectedRepo !== 'all' ? selectedRepo : 'frontend-app',
      ecosystem: 'npm',
    });
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="License Violations"
        subtitle="Audits non-compliant packages that breach legal or corporate open source license policies."
        currentSubpage="licenses-violations"
        showLicenseTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
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

      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <DependenciesMetricCard
          title="Active Violations"
          value={data?.total || 0}
          subtext="Breaches requiring triage"
          badge={data?.total ? 'Policy Breach' : 'Clean'}
          badgeColor={data?.total ? '#DC2626' : '#10B981'}
          badgeBg={data?.total ? '#FEF2F2' : '#ECFDF5'}
          icon={<AlertOctagon size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />
        <DependenciesMetricCard
          title="High Severity Violations"
          value={highCount}
          subtext="Viral copyleft in client distribution"
          icon={<ShieldAlert size={22} />}
          iconBg="#FFF1F2"
          iconColor="#E11D48"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Direct Manifest Violations"
          value={directCount}
          subtext="Declared in top-level package.json"
          icon={<FileWarning size={22} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Actionable Remediations"
          value={violations.length}
          subtext="Substitution or waiver strategies"
          badge="Remediation Ready"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<Wrench size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '7px 12px',
              width: '280px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search violating package or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#1E293B',
                width: '100%',
              }}
            />
          </div>

          <select
            aria-label="Filter severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Severities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Showing {violations.length} policy violations
        </span>
      </div>

      {/* Violations List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: '#94A3B8',
            }}
          >
            Scanning repositories for license policy breaches...
          </div>
        ) : violations.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <ShieldAlert size={36} color="#CBD5E1" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              Zero License Policy Violations
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
              All dependencies adhere to corporate open-source licensing rules and distribution guidelines.
            </div>
          </div>
        ) : (
          violations.map((v) => (
            <div
              key={v.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                    }}
                  >
                    {v.severity} SEVERITY
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#64748B" />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                      {v.package_name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                      v{v.package_version}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#FEE2E2',
                      color: '#991B1B',
                    }}
                  >
                    {v.license_name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => handleOpenWaiver(v)}
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Request Waiver
                  </button>
                  <Link
                    href={`/code/dependencies/graph?search=${encodeURIComponent(v.package_name)}`}
                    style={{
                      backgroundColor: '#F8FAFC',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>View in Graph</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                <strong>Policy Violation:</strong> {v.violation_reason}
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={14} color="#059669" />
                  <span>Recommended Remediation Actions:</span>
                </div>
                {v.remediation_options.map((opt, i) => (
                  <div key={i} style={{ color: '#475569', paddingLeft: '20px' }}>
                    &bull; {opt}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <LicenseExceptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetPackage={selectedPackageForWaiver}
        onSuccess={loadData}
      />
    </div>
  );
}
