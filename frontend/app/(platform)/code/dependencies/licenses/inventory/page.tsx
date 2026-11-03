'use client';

/**
 * Thing Code — License Inventory (/code/dependencies/licenses/inventory)
 *
 * Subpage 2 of License Compliance:
 * Comprehensive catalog and audit register of all third-party software licenses across repositories.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { LicenseInventoryResponse, LicenseInventoryItem } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { LicenseInventoryTable } from '@/components/code/dependencies/licenses/LicenseInventoryTable';
import { LicenseExceptionModal } from '@/components/code/dependencies/licenses/LicenseExceptionModal';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';

export default function LicenseInventoryPage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<LicenseInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEcosystem, setSelectedEcosystem] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<LicenseInventoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.licenseInventory({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        search: search || undefined,
        licenseType: selectedType !== 'all' ? selectedType : undefined,
        complianceStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        ecosystem: selectedEcosystem !== 'all' ? selectedEcosystem : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch license inventory.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, search, selectedType, selectedStatus, selectedEcosystem, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items || [];
  const total = data?.total || 0;

  const permissiveCount = items.filter((i) => i.license_type === 'Permissive').length;
  const copyleftCount = items.filter((i) => i.license_type.includes('Copyleft')).length;
  const reviewCount = items.filter((i) => i.compliance_status === 'Review Required' || i.compliance_status === 'Unknown').length;

  const handleRequestException = (item: LicenseInventoryItem) => {
    setSelectedPackage(item);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="License Inventory"
        subtitle="Full audit register and catalog of open source licenses across all project repositories."
        currentSubpage="licenses-inventory"
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
          title="Monitored Packages"
          value={total}
          subtext="Total indexed components"
          icon={<FileText size={22} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Permissive Licenses"
          value={permissiveCount}
          subtext="Approved MIT, Apache, BSD"
          badge="Compliant"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          icon={<ShieldCheck size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Copyleft Components"
          value={copyleftCount}
          subtext="GPL, LGPL & viral licenses"
          icon={<ShieldAlert size={22} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Review Required"
          value={reviewCount}
          subtext="Unidentified or dual-licensed"
          badge={reviewCount > 0 ? 'Triage' : 'Zero'}
          badgeColor={reviewCount > 0 ? '#D97706' : '#10B981'}
          badgeBg={reviewCount > 0 ? '#FFFBEB' : '#ECFDF5'}
          icon={<HelpCircle size={22} />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          loading={loading}
        />
      </div>

      {/* Full-featured License Inventory Table */}
      <LicenseInventoryTable
        items={items}
        total={total}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedEcosystem={selectedEcosystem}
        onEcosystemChange={setSelectedEcosystem}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRequestException={handleRequestException}
      />

      {/* Waiver Modal */}
      <LicenseExceptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetPackage={selectedPackage}
        onSuccess={loadData}
      />
    </div>
  );
}
