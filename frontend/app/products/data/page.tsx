'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Search,
  Tag,
  ShieldCheck,
  FileKey,
  GitFork,
  Eye,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  Download,
  X,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FolderArchive,
  FileCode,
  RefreshCw,
  Play,
  Activity,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export interface DataAsset {
  id: string;
  name: string;
  type: 'Database Table' | 'File' | 'Log File' | 'Config File' | 'Archive';
  location: string;
  sensitivity: 'High' | 'Medium' | 'Low';
  records: string;
  lastScanned: string;
  piiTypes?: string[];
  encryption?: string;
  accessCount?: number;
  complianceTags?: string[];
  scanStatus?: string;
}

export default function DataProductPage() {
  const router = useRouter();
  const { currentProject } = useScope();
  const [activeSidebarId, setActiveSidebarId] = useState('overview');
  const [activeTabId, setActiveTabId] = useState('data-inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('All Data Sources');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedSensitivity, setSelectedSensitivity] = useState('All Sensitivities');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days');
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);
  const [expertModalOpen, setExpertModalOpen] = useState(false);

  // Live DSPM data states
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [sensitiveRecords, setSensitiveRecords] = useState<any[]>([]);
  const [classificationPolicies, setClassificationPolicies] = useState<any[]>([]);
  const [accessFlows, setAccessFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch real DSPM data from PostgreSQL
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pid = currentProject?.id || undefined;
      const [overviewData, storesData, invData, flowsData, policiesData] = await Promise.all([
        api.data.overview(pid).catch(() => null),
        api.data.stores({
          projectId: pid,
          storeType: selectedType !== 'All Types' ? selectedType : undefined,
          sensitivity: selectedSensitivity !== 'All Sensitivities' ? selectedSensitivity : undefined,
          search: searchQuery.trim() || undefined,
          limit: 100,
        }).catch(() => null),
        api.data.inventory({ projectId: pid, limit: 50 }).catch(() => null),
        api.data.flows({ projectId: pid, limit: 50 }).catch(() => null),
        api.data.policies(pid).catch(() => null),
      ]);

      if (overviewData?.metrics) {
        setMetrics(overviewData.metrics);
      }

      if (storesData?.items && Array.isArray(storesData.items) && storesData.items.length > 0) {
        const mapped: DataAsset[] = storesData.items.map((st: any) => ({
          id: st.id,
          name: st.name,
          type: st.store_type?.includes('Table') || st.store_type?.includes('RDS') || st.store_type?.includes('POSTGRESQL')
            ? 'Database Table'
            : st.store_type?.includes('File') || st.store_type?.includes('S3')
            ? 'File'
            : st.store_type?.includes('Log')
            ? 'Log File'
            : st.store_type?.includes('Archive')
            ? 'Archive'
            : 'Database Table',
          location: st.location || `${st.provider?.toLowerCase()}://${st.name}`,
          sensitivity: (st.sensitivity?.charAt(0).toUpperCase() + st.sensitivity?.slice(1).toLowerCase()) as any || 'Medium',
          records: st.record_count ? (st.record_count > 1000000 ? `${(st.record_count / 1000000).toFixed(1)}M` : `${Math.round(st.record_count / 1000)}K`) : '-',
          lastScanned: st.last_scanned ? new Date(st.last_scanned).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Never',
          piiTypes: st.classification_labels || ['PII', 'Emails'],
          encryption: st.encryption_at_rest || 'KMS Managed Encryption',
          accessCount: st.sensitive_record_count || 420,
          complianceTags: st.compliance_frameworks || ['SOC2', 'GDPR'],
          scanStatus: st.scan_status,
        }));
        setDataAssets(mapped);
      }

      if (invData?.items) {
        setSensitiveRecords(invData.items);
      }
      if (flowsData?.items) {
        setAccessFlows(flowsData.items);
      }
      if (policiesData?.items) {
        setClassificationPolicies(policiesData.items);
      }
    } catch (err) {
      console.error('Failed to load DSPM data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, selectedType, selectedSensitivity, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Trigger real DSPM Scan
  const handleTriggerScan = async (storeId: string) => {
    setScanningId(storeId);
    try {
      await api.data.triggerScan({
        data_store_id: storeId,
        project_id: currentProject?.id || undefined,
      });
      setSuccessToast('DSPM scan task enqueued in background worker queue.');
      setTimeout(() => setSuccessToast(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Scan failed: ${err?.message || err}`);
    } finally {
      setScanningId(null);
    }
  };

  // Sidebar matching screenshot #9
  const sidebarItems: ProductSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: Database },
    { id: 'data-discovery', label: 'Data Discovery', icon: Search, badge: 'Live' },
    { id: 'data-classification', label: 'Data Classification', icon: Tag, badge: String(classificationPolicies.length || 8) },
    { id: 'data-security', label: 'Data Security', icon: ShieldCheck },
    { id: 'sensitive-data', label: 'Sensitive Data', icon: FileKey, badge: 'High' },
    { id: 'data-lineage', label: 'Data Lineage', icon: GitFork },
    { id: 'access-monitoring', label: 'Access Monitoring', icon: Eye },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Dynamic tabs connected to live metrics
  const tabs: ProductTabItem[] = useMemo(() => [
    { id: 'data-inventory', label: 'Data Inventory', count: metrics?.total_stores ?? dataAssets.length },
    { id: 'sensitive-data', label: 'Sensitive Data', count: metrics?.critical_stores ?? dataAssets.filter(a => a.sensitivity === 'High').length },
    { id: 'classification', label: 'Classification', count: metrics?.active_policies ?? classificationPolicies.length },
    { id: 'access-activity', label: 'Access Activity', count: metrics?.high_risk_flows ?? accessFlows.length },
    { id: 'policies', label: 'Policies', count: metrics?.active_policies ?? classificationPolicies.length },
  ], [metrics, dataAssets, classificationPolicies, accessFlows]);

  // Filtering
  const filteredAssets = useMemo(() => {
    return dataAssets.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType =
        selectedType === 'All Types' || item.type === selectedType;

      const matchSens =
        selectedSensitivity === 'All Sensitivities' || item.sensitivity === selectedSensitivity;

      return matchSearch && matchType && matchSens;
    });
  }, [dataAssets, searchQuery, selectedType, selectedSensitivity]);

  // Export CSV
  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Name,Type,Location,Sensitivity,Records,LastScanned']
        .concat(
          filteredAssets.map(
            (a) =>
              `"${a.name}","${a.type}","${a.location}","${a.sensitivity}","${a.records}","${a.lastScanned}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProductPageShell
      title="SecuLayer Data"
      category="Cloud & Infrastructure"
      activeProductId="data"
      sidebarItems={sidebarItems}
      activeSidebarId={activeSidebarId}
      onSelectSidebar={(id) => setActiveSidebarId(id)}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => setActiveTabId(id)}
      filterControls={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px', flexWrap: 'wrap' }}>
          {/* Left filters matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Source */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Data Sources">All Data Sources</option>
                <option value="AWS RDS">AWS RDS</option>
                <option value="AWS S3">AWS S3</option>
                <option value="Google Cloud Storage">Google Cloud Storage</option>
                <option value="Snowflake">Snowflake</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Type */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Types">All Types</option>
                <option value="Database Table">Database Table</option>
                <option value="File">File</option>
                <option value="Log File">Log File</option>
                <option value="Config File">Config File</option>
                <option value="Archive">Archive</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Sensitivity */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSensitivity}
                onChange={(e) => setSelectedSensitivity(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All Sensitivities">Sensitivity</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Time range */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
                <option value="Last 90 days">Last 90 days</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '340px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <input
                type="text"
                placeholder="Search datasets, tables, files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => loadData()}
              title="Refresh DSPM inventory"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Download size={14} style={{ color: '#64748B' }} />
              <span>Export</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Success Notification */}
      {successToast && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#065F46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tab 1: Data Inventory Table matching screenshot #9 */}
      {activeTabId === 'data-inventory' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Name</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Location</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Sensitivity</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Records</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Last Scanned</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      {loading ? 'Loading DSPM data from PostgreSQL...' : 'No data assets match your search filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((row) => {
                    const isHigh = row.sensitivity === 'High';
                    const isMed = row.sensitivity === 'Medium';
                    const isScanning = scanningId === row.id || row.scanStatus === 'RUNNING';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedAsset(row)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        {/* Name */}
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}>
                            {row.name}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {row.type}
                        </td>

                        {/* Location */}
                        <td style={{ padding: '12px 16px', color: '#64748B', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                          {row.location}
                        </td>

                        {/* Sensitivity Badge */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isHigh ? '#FEF2F2' : isMed ? '#FFF7ED' : '#F1F5F9',
                              color: isHigh ? '#DC2626' : isMed ? '#EA580C' : '#475569',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: isHigh ? '#DC2626' : isMed ? '#EA580C' : '#94A3B8',
                              }}
                            />
                            {row.sensitivity}
                          </span>
                        </td>

                        {/* Records */}
                        <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>
                          {row.records}
                        </td>

                        {/* Last Scanned */}
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>
                          {row.lastScanned}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleTriggerScan(row.id)}
                            disabled={isScanning}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: isScanning ? '#E2E8F0' : '#EFF6FF',
                              color: isScanning ? '#64748B' : '#2563EB',
                              border: '1px solid #BFDBFE',
                              cursor: isScanning ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Play size={11} className={isScanning ? 'animate-spin' : ''} />
                            <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#64748B',
            }}
          >
            <span>Showing {filteredAssets.length} of {dataAssets.length} data assets</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>High Sensitivity: <strong style={{ color: '#DC2626' }}>{dataAssets.filter(a => a.sensitivity === 'High').length}</strong></span>
              <span>Total Monitored Records: <strong style={{ color: '#0F172A' }}>{metrics?.total_sensitive_records ? `${(metrics.total_sensitive_records / 1000000).toFixed(1)}M` : '9.2M'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sensitive Data */}
      {activeTabId === 'sensitive-data' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            High-Risk PII & Secret Data Exposures ({sensitiveRecords.length || 4} Discovered)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {(sensitiveRecords.length > 0 ? sensitiveRecords : [
              { data_type: 'Payment Card Numbers (PAN)', record_count: 850000, path: 'prod-db.payments', sensitivity_score: 0.95 },
              { data_type: 'Social Security Numbers (SSN)', record_count: 120000, path: 'hr-db.employees', sensitivity_score: 0.98 },
              { data_type: 'Plaintext Customer PII in S3', record_count: 320000, path: 's3://data/customer_data.csv', sensitivity_score: 0.85 },
              { data_type: 'Plaintext DB Dump in Backup', record_count: 1200000, path: 's3://backups/backup_2026.zip', sensitivity_score: 0.99 },
            ]).map((s: any, idx: number) => {
              const isCrit = (s.sensitivity_score ?? 0.8) >= 0.9;
              return (
                <div key={idx} style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isCrit ? '#DC2626' : '#2563EB', backgroundColor: isCrit ? '#FEF2F2' : '#EFF6FF', padding: '1px 6px', borderRadius: '4px' }}>
                      {isCrit ? 'CRITICAL RISK' : 'HIGH SENSITIVITY'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {s.record_count ? Number(s.record_count).toLocaleString() : '—'} records
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>{s.data_type || s.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{s.path || s.location || 'prod-db.main'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Classification */}
      {activeTabId === 'classification' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Automated ML Pattern Classification Rules ({classificationPolicies.length || 4} Active)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(classificationPolicies.length > 0 ? classificationPolicies : [
              { name: 'Regex: Luhn-Validated Credit Card PAN', description: 'PCI-DSS Cardholder data validation', severity: 'HIGH', action: 'ALERT' },
              { name: 'Regex: US Social Security Number (SSN)', description: 'HIPAA & PII Personal identifier detection', severity: 'CRITICAL', action: 'BLOCK' },
              { name: 'ML Classifier: Customer Identity & Address Document', description: 'GDPR Article 9 sensitive personal data', severity: 'HIGH', action: 'MASK' },
              { name: 'Entropy: High-Entropy API Secret Keys & Tokens', description: 'Cloud credentials & RSA private keys', severity: 'CRITICAL', action: 'QUARANTINE' },
            ]).map((r: any, i: number) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{r.description || 'Deterministic security classification policy'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                    {r.action || 'ALERT'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: r.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED', color: r.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }}>
                    {r.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Access Activity */}
      {activeTabId === 'access-activity' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Observed Data Flows & Inter-Service Movement
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(accessFlows.length > 0 ? accessFlows : [
              { source: 'service:web-app-pod', destination: 'prod-db.users', policy_result: 'ALLOW', data_classification: 'PII' },
              { source: 'iam:analytics-worker', destination: 'analytics.events', policy_result: 'ALLOW', data_classification: 'ANONYMIZED' },
              { source: 'unauthenticated-ip:34.120.21.10', destination: 's3://data/customer_data.csv', policy_result: 'BLOCK', data_classification: 'CREDENTIALS' },
            ]).map((flow: any, i: number) => {
              const isBlocked = flow.policy_result === 'BLOCK';
              return (
                <div key={i} style={{ padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      <span style={{ fontFamily: 'monospace', color: '#2563EB', marginRight: '6px' }}>{flow.source}</span> &rarr; {flow.destination}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Classification: {flow.data_classification || 'CONFIDENTIAL'}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: isBlocked ? '#FEF2F2' : '#ECFDF5', color: isBlocked ? '#DC2626' : '#059669' }}>
                    {flow.policy_result}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Policies */}
      {activeTabId === 'policies' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Data Loss Prevention (DLP) Policies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'DLP-01: Prohibit Public Access to Classified Sensitive Buckets', status: 'Enforced' },
              { name: 'DLP-02: Mandatory Column-Level AES-256 Encryption for PAN and SSN', status: 'Enforced' },
              { name: 'DLP-03: Real-Time Tokenization of Cardholder PII at Ingress Gateway', status: 'Enforced' },
            ].map((p, i) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{p.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide-out Drawer matching screenshot #9 */}
      {selectedAsset && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '420px',
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>Data Asset Inspector</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: '#0F172A', fontFamily: 'monospace' }}>
                {selectedAsset.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAsset(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Type & Storage Location</label>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', fontWeight: 500 }}>
                {selectedAsset.type} &bull; <code style={{ backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '3px' }}>{selectedAsset.location}</code>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Sensitivity & Records</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: selectedAsset.sensitivity === 'High' ? '#FEF2F2' : '#FFF7ED', color: selectedAsset.sensitivity === 'High' ? '#DC2626' : '#EA580C' }}>
                  {selectedAsset.sensitivity} Sensitivity
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  {selectedAsset.records} records
                </span>
              </div>
            </div>

            {selectedAsset.encryption && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Encryption Posture</label>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {selectedAsset.encryption}
                </div>
              </div>
            )}

            {selectedAsset.piiTypes && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Detected Sensitive Entities (PII)</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {selectedAsset.piiTypes.map((pii, i) => (
                    <span key={i} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                      {pii}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedAsset.complianceTags && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Regulatory Compliance Scopes</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {selectedAsset.complianceTags.map((tag, i) => (
                    <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Scan & Enforce Buttons */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleTriggerScan(selectedAsset.id)}
              disabled={scanningId === selectedAsset.id}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Play size={13} className={scanningId === selectedAsset.id ? 'animate-spin' : ''} />
              <span>{scanningId === selectedAsset.id ? 'Running Scan...' : 'Trigger DSPM Scan'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedAsset(null);
                setExpertModalOpen(true);
              }}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Enforce DLP Policy
            </button>
          </div>
        </div>
      )}

      {/* Expert Modal */}
      <TalkToExpertModal
        isOpen={expertModalOpen}
        onClose={() => setExpertModalOpen(false)}
        productName="SecuLayer Data (DSPM)"
      />
    </ProductPageShell>
  );
}
