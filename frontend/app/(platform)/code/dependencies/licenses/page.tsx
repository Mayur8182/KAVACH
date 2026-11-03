'use client';

/**
 * Thing Code — License Compliance Overview (/code/dependencies/licenses)
 *
 * Implements Screenshot 07:
 *  - Breadcrumbs: Dependencies > License Compliance
 *  - Title: License Compliance
 *  - Subtitle: Monitor and manage open source license usage, compliance risks, and policy violations.
 *  - Controls: Repository (All) and Date Range (Last 30 days) selectors matching Screenshot 07
 *  - Top 4 Summary Metric Cards:
 *      1. Total Licenses (Green document icon)
 *      2. License Violations (Red alert triangle icon)
 *      3. Copyleft & Restricted (Orange shield icon)
 *      4. Compliant Packages (Purple database icon)
 *  - Subpage Navigation Tabs:
 *      1. License Overview (/code/dependencies/licenses)
 *      2. License Inventory (/code/dependencies/licenses/inventory)
 *      3. License Violations (/code/dependencies/licenses/violations)
 *      4. Restricted Packages (/code/dependencies/licenses/restricted)
 *      5. Exceptions & Approvals (/code/dependencies/licenses/exceptions)
 *  - Row 1: 3 Analytical Dashboard Cards:
 *      - License Distribution (Donut Chart & Legend)
 *      - License Risk Overview (Horizontal Risk Tiers Bar Chart)
 *      - Compliance Status (Donut Gauge & Legend)
 *  - Row 2: Main License Inventory Table Card with Search & Filters
 *  - Row 3: 2 Analytical Cards:
 *      - Top Licenses (Horizontal Bar Chart)
 *      - License Trends (Multi-series Area Spline Chart)
 * Data Source: PostgreSQL persistence via `GET /api/v1/code/dependencies/licenses`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  LicenseOverviewResponse,
  LicenseInventoryItem,
} from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import { LicenseDistributionDonut } from '@/components/code/dependencies/licenses/LicenseDistributionDonut';
import { LicenseRiskOverviewChart } from '@/components/code/dependencies/licenses/LicenseRiskOverviewChart';
import { ComplianceStatusGauge } from '@/components/code/dependencies/licenses/ComplianceStatusGauge';
import { LicenseInventoryTable } from '@/components/code/dependencies/licenses/LicenseInventoryTable';
import { TopLicensesChart } from '@/components/code/dependencies/licenses/TopLicensesChart';
import { LicenseTrendsChart } from '@/components/code/dependencies/licenses/LicenseTrendsChart';
import { LicenseExceptionModal } from '@/components/code/dependencies/licenses/LicenseExceptionModal';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Database,
  CheckCircle2,
} from 'lucide-react';

export default function LicenseCompliancePage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<LicenseOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [tableSearch, setTableSearch] = useState('');
  const [tableType, setTableType] = useState('all');
  const [tableStatus, setTableStatus] = useState('all');
  const [tableEcosystem, setTableEcosystem] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageForWaiver, setSelectedPackageForWaiver] = useState<LicenseInventoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.licenses({
        projectId: currentProject?.id,
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        timeRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch license compliance metrics.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepo, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = data?.metrics || {
    total_licenses: 0,
    license_violations: 0,
    copyleft_restricted: 0,
    compliant_packages: 0,
  };

  // Filter inventory items for main table
  const inventoryItems = (data?.recent_inventory || []).filter((item) => {
    if (tableSearch && !item.package_name.toLowerCase().includes(tableSearch.toLowerCase())) {
      return false;
    }
    if (tableType !== 'all' && item.license_type.toLowerCase() !== tableType.toLowerCase()) {
      return false;
    }
    if (tableStatus !== 'all' && item.compliance_status.toLowerCase() !== tableStatus.toLowerCase()) {
      return false;
    }
    if (tableEcosystem !== 'all' && item.ecosystem.toLowerCase() !== tableEcosystem.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleRequestException = (item: LicenseInventoryItem) => {
    setSelectedPackageForWaiver(item);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* Top Header matching Screenshot 07 */}
      <DependenciesHeader
        title="License Compliance"
        subtitle="Monitor and manage open source license usage, compliance risks, and policy violations."
        currentSubpage="licenses"
        showLicenseTabs={true}
        onRefresh={loadData}
        isLoading={loading}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        selectedTimeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Error Banner */}
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

      {/* Top 4 Metric Cards matching Screenshot 07 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Licenses */}
        <DependenciesMetricCard
          title="Total Licenses"
          value={metrics.total_licenses}
          subtext="Distinct SPDX licenses detected"
          icon={<FileText size={24} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          loading={loading}
        />

        {/* Card 2: License Violations */}
        <DependenciesMetricCard
          title="License Violations"
          value={metrics.license_violations}
          subtext="Prohibited license breaches"
          badge={metrics.license_violations > 0 ? 'Action Req' : 'Zero Violations'}
          badgeColor={metrics.license_violations > 0 ? '#DC2626' : '#10B981'}
          badgeBg={metrics.license_violations > 0 ? '#FEF2F2' : '#ECFDF5'}
          icon={<AlertTriangle size={24} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          loading={loading}
        />

        {/* Card 3: Copyleft & Restricted */}
        <DependenciesMetricCard
          title="Copyleft & Restricted"
          value={metrics.copyleft_restricted}
          subtext="Requires dynamic linkage review"
          icon={<ShieldAlert size={24} />}
          iconBg="#FFF7ED"
          iconColor="#F97316"
          loading={loading}
        />

        {/* Card 4: Compliant Packages */}
        <DependenciesMetricCard
          title="Compliant Packages"
          value={metrics.compliant_packages}
          subtext="Approved permissive packages"
          badge="Policy Approved"
          badgeColor="#8B5CF6"
          badgeBg="#F5F3FF"
          icon={<Database size={24} />}
          iconBg="#F5F3FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Row 1: 3 Analytical Dashboard Cards matching Screenshot 07 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <LicenseDistributionDonut
          data={data?.distribution || []}
          loading={loading}
        />

        <LicenseRiskOverviewChart
          data={data?.risk_overview || []}
          loading={loading}
        />

        <ComplianceStatusGauge
          data={data?.compliance_status || []}
          loading={loading}
        />
      </div>

      {/* Row 2: Main License Inventory Table matching Screenshot 07 */}
      <LicenseInventoryTable
        items={inventoryItems}
        total={data?.recent_inventory?.length || 0}
        loading={loading}
        search={tableSearch}
        onSearchChange={setTableSearch}
        selectedType={tableType}
        onTypeChange={setTableType}
        selectedStatus={tableStatus}
        onStatusChange={setTableStatus}
        selectedEcosystem={tableEcosystem}
        onEcosystemChange={setTableEcosystem}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        onRequestException={handleRequestException}
      />

      {/* Row 3: 2 Analytical Cards matching Screenshot 07 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '20px',
        }}
      >
        <TopLicensesChart
          data={data?.top_licenses || []}
          loading={loading}
        />

        <LicenseTrendsChart
          data={data?.trends || []}
          loading={loading}
        />
      </div>

      {/* License Exception / Waiver Modal */}
      <LicenseExceptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetPackage={selectedPackageForWaiver}
        onSuccess={loadData}
      />
    </div>
  );
}
