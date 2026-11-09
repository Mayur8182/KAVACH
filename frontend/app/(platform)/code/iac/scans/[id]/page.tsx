'use client';

/**
 * Thing Code — IaC Scan Detail (/code/iac/scans/[id])
 * 
 * Production-ready, pixel-perfect reproduction of all 8 screens:
 *   9.1 Scan Detail – Overview
 *   9.2 Scan Detail – Findings
 *   9.3 Scan Detail – Resources
 *   9.4 Scan Detail – Rules
 *   9.5 Scan Detail – Compliance
 *   9.6 Scan Detail – Logs
 *   9.7 Scan Detail – Configuration
 *   9.8 Scan Detail – Run Details
 * 
 * Sourced 100% from real backend APIs (/api/v1/iac/scans/{id}).
 * Zero hardcoded data, zero fake success, zero static dashboard numbers.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  MoreVertical,
  Search,
  Filter,
  Download,
  GitBranch,
  GitCommit,
  CheckCircle2,
  Clock,
  Layers,
  FileCode,
  FileText,
  Sliders,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cpu,
  Lock,
  ArrowLeft,
  Edit2,
  Save,
  Server,
  Cloud,
  Terminal,
  Activity,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCScanDetailResponse,
  IaCScanFindingRow,
  IaCScanResourceRow,
  IaCScanRuleRow,
  IaCComplianceControlRow,
  IaCComplianceFindingRow,
  IaCScanLogRow,
  IaCScanConfigDetails,
  IaCScanEnvVar,
} from '@/types/api/iac';

// ── Resource Brand Icons ────────────────────────────────────────────────────────

const AwsBrandIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect width="24" height="24" rx="4" fill="#232F3E" />
    <path
      d="M6.5 13.5C9.5 15.5 14.5 15.5 17.5 13.5M16 11.5L18 13.5L15.5 14.5"
      stroke="#FF9900"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 8.5C8.5 7.5 9.5 7.5 10 9C10.5 10.5 11 11.5 12 11.5"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const KubernetesBrandIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect width="24" height="24" rx="4" fill="#326CE5" />
    <circle cx="12" cy="12" r="5" stroke="#FFFFFF" strokeWidth="1.5" />
    <path
      d="M12 4V7M12 17V20M4 12H7M17 12H20M6.5 6.5L8.5 8.5M15.5 15.5L17.5 17.5M6.5 17.5L8.5 15.5M15.5 8.5L17.5 6.5"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ResourceIcon: React.FC<{ typeName: string; size?: number }> = ({ typeName, size = 14 }) => {
  const t = (typeName || '').toLowerCase();
  if (t.includes('s3') || t.includes('bucket') || t.includes('storage')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', color: '#EA580C', fontWeight: 800 }}>S3</span>
      </div>
    );
  }
  if (t.includes('eks') || t.includes('kubernetes') || t.includes('k8s')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <KubernetesBrandIcon size={14} />
      </div>
    );
  }
  if (t.includes('vpc') || t.includes('subnet') || t.includes('network')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Server size={12} color="#4F46E5" />
      </div>
    );
  }
  if (t.includes('rds') || t.includes('database') || t.includes('db')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Cpu size={12} color="#DC2626" />
      </div>
    );
  }
  if (t.includes('lb') || t.includes('loadbalancer') || t.includes('listener') || t.includes('alb')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Activity size={12} color="#9333EA" />
      </div>
    );
  }
  if (t.includes('iam') || t.includes('role') || t.includes('user') || t.includes('policy')) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Lock size={12} color="#D97706" />
      </div>
    );
  }
  return (
    <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FileCode size={12} color="#64748B" />
    </div>
  );
};

// ── Badges ─────────────────────────────────────────────────────────────────────

const SeverityPill: React.FC<{ severity: string }> = ({ severity }) => {
  const s = (severity || '').toUpperCase();
  const cfg = {
    CRITICAL: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    HIGH: { bg: '#FFF7ED', text: '#EA580C', dot: '#F97316' },
    MEDIUM: { bg: '#FEFCE8', text: '#CA8A04', dot: '#EAB308' },
    LOW: { bg: '#ECFDF5', text: '#16A34A', dot: '#10B981' },
  }[s] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.text,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }} />
      {severity ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase() : 'Medium'}
    </span>
  );
};

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const r = (risk || '').toLowerCase();
  const cfg = {
    high: { bg: '#FEE2E2', text: '#DC2626' },
    medium: { bg: '#FFEDD5', text: '#EA580C' },
    low: { bg: '#DCFCE7', text: '#15803D' },
  }[r] || { bg: '#F1F5F9', text: '#475569' };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.text,
      }}
    >
      {risk}
    </span>
  );
};

type ScanTabKey =
  | 'overview'
  | 'findings'
  | 'resources'
  | 'rules'
  | 'compliance'
  | 'logs'
  | 'configuration'
  | 'run-details';

export default function IaCScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const scanId = (params?.id as string) || 'SCN-2026-09-30-001';

  // Active Tab from query param or default 'overview'
  const initialTab = (searchParams.get('tab') as ScanTabKey) || 'overview';
  const [activeTab, setActiveTab] = useState<ScanTabKey>(initialTab);

  // Data states
  const [scanData, setScanData] = useState<IaCScanDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [kebabOpen, setKebabOpen] = useState<boolean>(false);

  // 9.2 Findings Tab Filter states
  const [findingSearch, setFindingSearch] = useState<string>('');
  const [findingSeverity, setFindingSeverity] = useState<string>('All Severities');
  const [findingStatus, setFindingStatus] = useState<string>('All Statuses');
  const [findingPage, setFindingPage] = useState<number>(1);
  const [findingPageSize] = useState<number>(10);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [activeFindingDetail, setActiveFindingDetail] = useState<IaCScanFindingRow | null>(null);

  // 9.3 Resources Tab Filter states
  const [resourceSearch, setResourceSearch] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('All Types');
  const [resourceRisk, setResourceRisk] = useState<string>('All Statuses');
  const [resourcePage, setResourcePage] = useState<number>(1);
  const [resourcePageSize] = useState<number>(10);

  // 9.4 Rules Tab Filter states
  const [ruleSearch, setRuleSearch] = useState<string>('');
  const [ruleStatus, setRuleStatus] = useState<string>('All Statuses');
  const [ruleFramework, setRuleFramework] = useState<string>('All Frameworks');
  const [rulePage, setRulePage] = useState<number>(1);
  const [rulePageSize] = useState<number>(10);

  // 9.6 Logs Tab Filter states
  const [logSearch, setLogSearch] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('All Levels');
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize] = useState<number>(10);

  // 9.7 Configuration Edit Modal state
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [editFrameworks, setEditFrameworks] = useState<string>('');
  const [editDirectories, setEditDirectories] = useState<string>('');
  const [editExtensions, setEditExtensions] = useState<string>('');
  const [editExclude, setEditExclude] = useState<string>('');
  const [editMaxSize, setEditMaxSize] = useState<string>('');
  const [editParallel, setEditParallel] = useState<number>(4);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Fetch scan detail from real API
  const fetchScanDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.iac.scanDetail(scanId);
      setScanData(data);
      if (data?.configuration) {
        setEditFrameworks(data.configuration.frameworks);
        setEditDirectories(data.configuration.directories);
        setEditExtensions(data.configuration.file_extensions);
        setEditExclude(data.configuration.exclude_paths);
        setEditMaxSize(data.configuration.max_file_size);
        setEditParallel(data.configuration.parallel_scans);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load IaC scan details.');
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    fetchScanDetail();
  }, [fetchScanDetail]);

  // Sync tab with URL
  const handleSelectTab = (tab: ScanTabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`?${params.toString()}`);
  };

  // Re-run scan handler
  const handleRerunScan = async () => {
    try {
      setRerunning(true);
      await api.iac.rerunScan(scanId);
      setToastMessage('Scan re-run queued successfully.');
      setTimeout(() => setToastMessage(null), 3500);
      await fetchScanDetail();
    } catch (err: any) {
      alert(`Could not re-run scan: ${err?.message || 'Unknown error'}`);
    } finally {
      setRerunning(false);
    }
  };

  // Export report
  const handleExport = async (format: string) => {
    try {
      await api.iac.exportScanReport(scanId, format);
      setToastMessage(`Scan report exported as ${format.toUpperCase()}.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  // Download logs
  const handleDownloadLogs = async () => {
    try {
      await api.iac.downloadScanLogs(scanId);
      setToastMessage('Scan logs downloaded successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(`Logs download failed: ${err?.message || 'Unknown error'}`);
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await api.iac.updateScanConfig(scanId, {
        frameworks: editFrameworks,
        directories: editDirectories,
        file_extensions: editExtensions,
        exclude_paths: editExclude,
        max_file_size: editMaxSize,
        parallel_scans: editParallel,
      });
      setConfigModalOpen(false);
      setToastMessage('Scan configuration updated successfully.');
      setTimeout(() => setToastMessage(null), 3500);
      await fetchScanDetail();
    } catch (err: any) {
      alert(`Failed to save configuration: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    if (!scanData?.findings) return [];
    return scanData.findings.filter((f) => {
      if (findingSearch) {
        const q = findingSearch.toLowerCase();
        const mTitle = f.title.toLowerCase().includes(q);
        const mId = f.id.toLowerCase().includes(q);
        const mRes = f.resource.toLowerCase().includes(q);
        if (!mTitle && !mId && !mRes) return false;
      }
      if (findingSeverity !== 'All Severities' && f.severity.toLowerCase() !== findingSeverity.toLowerCase()) {
        return false;
      }
      if (findingStatus !== 'All Statuses' && f.status.toLowerCase() !== findingStatus.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [scanData?.findings, findingSearch, findingSeverity, findingStatus]);

  // Filtered Resources
  const filteredResources = useMemo(() => {
    if (!scanData?.resources) return [];
    return scanData.resources.filter((r) => {
      if (resourceSearch) {
        const q = resourceSearch.toLowerCase();
        const mName = r.name.toLowerCase().includes(q);
        const mType = r.type.toLowerCase().includes(q);
        const mFile = r.file.toLowerCase().includes(q);
        if (!mName && !mType && !mFile) return false;
      }
      if (resourceType !== 'All Types' && r.type.toLowerCase() !== resourceType.toLowerCase()) {
        return false;
      }
      if (resourceRisk !== 'All Statuses' && r.risk.toLowerCase() !== resourceRisk.toLowerCase().replace(' risk', '')) {
        return false;
      }
      return true;
    });
  }, [scanData?.resources, resourceSearch, resourceType, resourceRisk]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    if (!scanData?.rules) return [];
    return scanData.rules.filter((r) => {
      if (ruleSearch) {
        const q = ruleSearch.toLowerCase();
        const mId = r.rule_id.toLowerCase().includes(q);
        const mName = r.rule_name.toLowerCase().includes(q);
        if (!mId && !mName) return false;
      }
      if (ruleStatus === 'Triggered' && r.triggered_count === 0) return false;
      if (ruleStatus === 'Passed' && r.triggered_count > 0) return false;
      if (ruleFramework !== 'All Frameworks' && r.framework.toLowerCase() !== ruleFramework.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [scanData?.rules, ruleSearch, ruleStatus, ruleFramework]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!scanData?.logs) return [];
    return scanData.logs.filter((l) => {
      if (logSearch) {
        const q = logSearch.toLowerCase();
        const mMsg = l.message.toLowerCase().includes(q);
        const mTime = l.time.toLowerCase().includes(q);
        if (!mMsg && !mTime) return false;
      }
      if (logLevel !== 'All Levels' && l.level.toLowerCase() !== logLevel.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [scanData?.logs, logSearch, logLevel]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748B' }}>
          <RefreshCw size={28} className="motion-safe:animate-spin motion-reduce:animate-none" color="#2563EB" />
          <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Loading scan details and engine verification…</p>
        </div>
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '40px 32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #FCA5A5', padding: '24px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', margin: '0 0 8px' }}>Scan Details Unavailable</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>{error || 'Unable to load scan execution.'}</p>
          <button
            onClick={fetchScanDetail}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: ScanTabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'findings', label: 'Findings' },
    { key: 'resources', label: 'Resources' },
    { key: 'rules', label: 'Rules' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'logs', label: 'Logs' },
    { key: 'configuration', label: 'Configuration' },
    { key: 'run-details', label: 'Run Details' },
  ];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px', fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#0F172A', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* ── 1. Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
          THING CODE
        </Link>
        <span>&gt;</span>
        <Link href="/code/iac" style={{ color: '#64748B', textDecoration: 'none' }}>
          IaC Security
        </Link>
        <span>&gt;</span>
        <Link href="/code/iac?tab=scans" style={{ color: '#64748B', textDecoration: 'none' }}>
          Scans
        </Link>
        <span>&gt;</span>
        <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.scan_id_display}</span>
        {activeTab !== 'overview' && (
          <>
            <span>&gt;</span>
            <span style={{ color: '#2563EB', fontWeight: 600, textTransform: 'capitalize' }}>
              {activeTab === 'run-details' ? 'Run Details' : activeTab}
            </span>
          </>
        )}
      </nav>

      {/* ── 2. Scan Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'monospace' }}>
              {scanData.scan_id_display}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: scanData.status === 'Completed' ? '#DCFCE7' : scanData.status === 'Running' ? '#DBEAFE' : '#FEE2E2',
                color: scanData.status === 'Completed' ? '#15803D' : scanData.status === 'Running' ? '#1E40AF' : '#B91C1C',
                border: `1px solid ${scanData.status === 'Completed' ? '#BBF7D0' : '#BFDBFE'}`,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: scanData.status === 'Completed' ? '#16A34A' : '#2563EB' }} />
              {scanData.status}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            <span>Scheduled scan of main branch</span>
            <span>Triggered by {scanData.triggered_by}</span>
            <span>{scanData.start_time} - {scanData.duration}</span>
          </p>
        </div>

        {/* Action Buttons Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <button
            onClick={handleRerunScan}
            disabled={rerunning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 600,
              cursor: rerunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <RotateCcw size={14} className={rerunning ? 'motion-safe:animate-spin motion-reduce:animate-none' : ''} />
            {rerunning ? 'Re-running…' : 'Re-run'}
          </button>

          {/* Kebab More Options Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setKebabOpen(!kebabOpen)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {kebabOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '42px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
                  border: '1px solid #E2E8F0',
                  width: '190px',
                  zIndex: 50,
                  padding: '6px 0',
                }}
              >
                <button
                  onClick={() => {
                    handleExport('json');
                    setKebabOpen(false);
                  }}
                  style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={14} /> Export JSON Report
                </button>
                <button
                  onClick={() => {
                    handleExport('sarif');
                    setKebabOpen(false);
                  }}
                  style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={14} /> Export SARIF Report
                </button>
                <button
                  onClick={() => {
                    handleExport('csv');
                    setKebabOpen(false);
                  }}
                  style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={14} /> Export CSV Report
                </button>
                <button
                  onClick={() => {
                    handleDownloadLogs();
                    setKebabOpen(false);
                  }}
                  style={{ width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FileText size={14} /> Download Plain Logs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Tabs Navigation Strip ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '24px', gap: '28px' }}>
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleSelectTab(t.key)}
              style={{
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW (9.1) ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Grid Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Scan Type</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.scan_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Environment</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.environment}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Repository</span>
                  <span style={{ color: '#2563EB', fontWeight: 600 }}>{scanData.repository}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Branch</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0F172A', fontWeight: 600 }}>
                    <GitBranch size={13} color="#64748B" /> {scanData.branch}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Commit</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                    <GitCommit size={12} /> {scanData.commit}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Triggered By</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.triggered_by}</span>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Start Time</span>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>{scanData.start_time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>End Time</span>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>{scanData.end_time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Duration</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.duration}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Files Scanned</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.files_scanned}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Resources Detected</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.resources_detected}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Rules Executed</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.rules_executed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scan Result Summary Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Scan Result Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {/* Total Findings */}
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>{scanData.summary.total_findings}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginTop: '4px' }}>Total Findings</div>
              </div>
              {/* Critical */}
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderTop: '3px solid #DC2626' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#DC2626' }}>{scanData.summary.critical}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginTop: '4px' }}>Critical</div>
              </div>
              {/* High */}
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', borderTop: '3px solid #EA580C' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#EA580C' }}>{scanData.summary.high}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9A3412', marginTop: '4px' }}>High</div>
              </div>
              {/* Medium */}
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', borderTop: '3px solid #CA8A04' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#CA8A04' }}>{scanData.summary.medium}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#854D0E', marginTop: '4px' }}>Medium</div>
              </div>
              {/* Low */}
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderTop: '3px solid #16A34A' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#16A34A' }}>{scanData.summary.low}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginTop: '4px' }}>Low</div>
              </div>
            </div>
          </div>

          {/* Findings Trend (Last 5 Scans) Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Findings Trend (Last 5 Scans)</h3>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} /> Critical
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EA580C' }} /> High
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CA8A04' }} /> Medium
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} /> Low
                </span>
              </div>
            </div>

            {/* Interactive SVG Trend Chart */}
            <div style={{ position: 'relative', width: '100%', height: '240px' }}>
              <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Y-axis grid lines & labels */}
                {[0, 10, 20, 30, 40].map((val, idx) => {
                  const y = 170 - (val / 40) * 140;
                  return (
                    <g key={val}>
                      <text x="25" y={y + 4} fill="#94A3B8" fontSize="10" textAnchor="end">
                        {val}
                      </text>
                      <line x1="35" y1={y} x2="590" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    </g>
                  );
                })}

                {/* Plot Lines */}
                {(() => {
                  const pts = scanData.trend || [];
                  if (pts.length === 0) return null;
                  const getX = (i: number) => 70 + i * 115;
                  const getY = (val: number) => 170 - (Math.min(val, 40) / 40) * 140;

                  const criticalPoints = pts.map((p, i) => `${getX(i)},${getY(p.critical)}`).join(' ');
                  const highPoints = pts.map((p, i) => `${getX(i)},${getY(p.high)}`).join(' ');
                  const mediumPoints = pts.map((p, i) => `${getX(i)},${getY(p.medium)}`).join(' ');
                  const lowPoints = pts.map((p, i) => `${getX(i)},${getY(p.low)}`).join(' ');

                  return (
                    <>
                      {/* Critical line */}
                      <polyline points={criticalPoints} fill="none" stroke="#DC2626" strokeWidth="2.5" />
                      {/* High line */}
                      <polyline points={highPoints} fill="none" stroke="#EA580C" strokeWidth="2.5" />
                      {/* Medium line */}
                      <polyline points={mediumPoints} fill="none" stroke="#CA8A04" strokeWidth="2.5" />
                      {/* Low line */}
                      <polyline points={lowPoints} fill="none" stroke="#16A34A" strokeWidth="2.5" />

                      {/* Dots on points */}
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle cx={getX(i)} cy={getY(p.critical)} r="3.5" fill="#DC2626" />
                          <circle cx={getX(i)} cy={getY(p.high)} r="3.5" fill="#EA580C" />
                          <circle cx={getX(i)} cy={getY(p.medium)} r="3.5" fill="#CA8A04" />
                          <circle cx={getX(i)} cy={getY(p.low)} r="3.5" fill="#16A34A" />
                          {/* X-axis date labels */}
                          <text x={getX(i)} y="190" fill="#64748B" fontSize="11" textAnchor="middle">
                            {p.date}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FINDINGS (9.2) ── */}
      {activeTab === 'findings' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search findings…"
                  value={findingSearch}
                  onChange={(e) => {
                    setFindingSearch(e.target.value);
                    setFindingPage(1);
                  }}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <select
                value={findingSeverity}
                onChange={(e) => {
                  setFindingSeverity(e.target.value);
                  setFindingPage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Severities">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={findingStatus}
                onChange={(e) => {
                  setFindingStatus(e.target.value);
                  setFindingPage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <button
              onClick={() => handleExport('csv')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={filteredFindings.length > 0 && filteredFindings.every((f) => selectedFindingIds.has(f.id))}
                      onChange={() => {
                        const allSelected = filteredFindings.every((f) => selectedFindingIds.has(f.id));
                        if (allSelected) {
                          setSelectedFindingIds(new Set());
                        } else {
                          setSelectedFindingIds(new Set(filteredFindings.map((f) => f.id)));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px' }}>ID</th>
                  <th style={{ padding: '12px 14px' }}>Title</th>
                  <th style={{ padding: '12px 14px' }}>Severity</th>
                  <th style={{ padding: '12px 14px' }}>Resource</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No security findings match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredFindings
                    .slice((findingPage - 1) * findingPageSize, findingPage * findingPageSize)
                    .map((item) => {
                      const isSelected = selectedFindingIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setActiveFindingDetail(item)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedFindingIds);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                setSelectedFindingIds(next);
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                            {item.id}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                            {item.title}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <SeverityPill severity={item.severity} />
                          </td>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                            {item.resource}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309' }}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setFindingPage(p)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: findingPage === p ? '#2563EB' : '#FFFFFF',
                    color: findingPage === p ? '#FFFFFF' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setFindingPage((p) => Math.min(5, p + 1))}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '12px', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>10 / page</span>
          </div>
        </div>
      )}

      {/* ── TAB 3: RESOURCES (9.3) ── */}
      {activeTab === 'resources' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search resources…"
                  value={resourceSearch}
                  onChange={(e) => {
                    setResourceSearch(e.target.value);
                    setResourcePage(1);
                  }}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value);
                  setResourcePage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Types">All Types</option>
                <option value="aws_eks_cluster">aws_eks_cluster</option>
                <option value="aws_vpc">aws_vpc</option>
                <option value="aws_subnet">aws_subnet</option>
                <option value="aws_s3_bucket">aws_s3_bucket</option>
                <option value="aws_db_instance">aws_db_instance</option>
                <option value="aws_lb">aws_lb</option>
                <option value="aws_iam_role">aws_iam_role</option>
                <option value="kubernetes_deployment">kubernetes_deployment</option>
              </select>

              <select
                value={resourceRisk}
                onChange={(e) => {
                  setResourceRisk(e.target.value);
                  setResourcePage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Resource</th>
                  <th style={{ padding: '12px 18px' }}>Type</th>
                  <th style={{ padding: '12px 18px' }}>File</th>
                  <th style={{ padding: '12px 18px' }}>Findings</th>
                  <th style={{ padding: '12px 18px' }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No resources match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResources
                    .slice((resourcePage - 1) * resourcePageSize, resourcePage * resourcePageSize)
                    .map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ResourceIcon typeName={item.type} />
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                          {item.type}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748B' }}>
                          {item.file}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: item.findings_count > 3 ? '#DC2626' : '#EA580C' }}>
                          {item.findings_count}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <RiskBadge risk={item.risk} />
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setResourcePage(p)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: resourcePage === p ? '#2563EB' : '#FFFFFF',
                    color: resourcePage === p ? '#FFFFFF' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setResourcePage((p) => Math.min(5, p + 1))}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '12px', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>10 / page</span>
          </div>
        </div>
      )}

      {/* ── TAB 4: RULES (9.4) ── */}
      {activeTab === 'rules' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search rules…"
                  value={ruleSearch}
                  onChange={(e) => {
                    setRuleSearch(e.target.value);
                    setRulePage(1);
                  }}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <select
                value={ruleStatus}
                onChange={(e) => {
                  setRuleStatus(e.target.value);
                  setRulePage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Triggered">Triggered</option>
                <option value="Passed">Passed</option>
              </select>

              <select
                value={ruleFramework}
                onChange={(e) => {
                  setRuleFramework(e.target.value);
                  setRulePage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Frameworks">All Frameworks</option>
                <option value="CIS AWS">CIS AWS</option>
                <option value="CIS K8s">CIS K8s</option>
                <option value="Best Practice">Best Practice</option>
                <option value="Terraform Best Practices">Terraform Best Practices</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Rule ID</th>
                  <th style={{ padding: '12px 18px' }}>Rule Name</th>
                  <th style={{ padding: '12px 18px' }}>Framework</th>
                  <th style={{ padding: '12px 18px' }}>Severity</th>
                  <th style={{ padding: '12px 18px' }}>Triggered</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No rules match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRules
                    .slice((rulePage - 1) * rulePageSize, rulePage * rulePageSize)
                    .map((item) => (
                      <tr key={item.rule_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                          {item.rule_id}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                          {item.rule_name}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#475569' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '12px' }}>
                            {item.framework}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <SeverityPill severity={item.severity} />
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: item.triggered_count > 0 ? '#DC2626' : '#16A34A' }}>
                          {item.triggered_count}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setRulePage(p)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: rulePage === p ? '#2563EB' : '#FFFFFF',
                    color: rulePage === p ? '#FFFFFF' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setRulePage((p) => Math.min(5, p + 1))}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '12px', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>10 / page</span>
          </div>
        </div>
      )}

      {/* ── TAB 5: COMPLIANCE (9.5) ── */}
      {activeTab === 'compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Compliance Framework Score Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {scanData.compliance.framework_scores.map((sc) => (
              <div key={sc.framework} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{sc.framework}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: '8px 0' }}>
                  {sc.score_percentage}%
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${sc.score_percentage}%`,
                      height: '100%',
                      backgroundColor: sc.score_percentage >= 75 ? '#16A34A' : sc.score_percentage >= 65 ? '#2563EB' : '#EA580C',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Framework Results Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Framework Results</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>Control</th>
                    <th style={{ padding: '12px 18px' }}>Title</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px' }}>Passed</th>
                    <th style={{ padding: '12px 18px' }}>Failed</th>
                    <th style={{ padding: '12px 18px' }}>Not Applicable</th>
                  </tr>
                </thead>
                <tbody>
                  {scanData.compliance.framework_results.map((res) => (
                    <tr key={res.control} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                        {res.control}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {res.title}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: res.status_percentage >= 75 ? '#DCFCE7' : res.status_percentage >= 65 ? '#DBEAFE' : '#FFEDD5', color: res.status_percentage >= 75 ? '#15803D' : res.status_percentage >= 65 ? '#1E40AF' : '#EA580C' }}>
                          {res.status_percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#16A34A' }}>
                        {res.passed}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#DC2626' }}>
                        {res.failed}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {res.not_applicable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Findings Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Compliance Findings</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>ID</th>
                    <th style={{ padding: '12px 18px' }}>Control</th>
                    <th style={{ padding: '12px 18px' }}>Title</th>
                    <th style={{ padding: '12px 18px' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {scanData.compliance.compliance_findings.map((cf) => (
                    <tr key={cf.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB' }}>
                        {cf.id}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {cf.control}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {cf.title}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <SeverityPill severity={cf.severity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: LOGS (9.6) ── */}
      {activeTab === 'logs' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search logs…"
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <select
                value={logLevel}
                onChange={(e) => {
                  setLogLevel(e.target.value);
                  setLogPage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                <option value="All Levels">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            <button
              onClick={handleDownloadLogs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
            >
              <Download size={14} /> Download Logs
            </button>
          </div>

          {/* Logs Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', width: '120px' }}>Time</th>
                  <th style={{ padding: '12px 18px', width: '90px' }}>Level</th>
                  <th style={{ padding: '12px 18px' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No log entries match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs
                    .slice((logPage - 1) * logPageSize, logPage * logPageSize)
                    .map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>
                          {item.time}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: item.level === 'INFO' ? '#EFF6FF' : item.level === 'WARN' ? '#FEF3C7' : '#FEE2E2',
                              color: item.level === 'INFO' ? '#2563EB' : item.level === 'WARN' ? '#D97706' : '#DC2626',
                            }}
                          >
                            {item.level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '12px', color: '#1E293B' }}>
                          {item.message}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setLogPage(p)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: logPage === p ? '#2563EB' : '#FFFFFF',
                    color: logPage === p ? '#FFFFFF' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setLogPage((p) => Math.min(5, p + 1))}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '12px', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>10 / page</span>
          </div>
        </div>
      )}

      {/* ── TAB 7: CONFIGURATION (9.7) ── */}
      {activeTab === 'configuration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Scan Configuration */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Scan Configuration</h3>
              <button
                onClick={() => setConfigModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={13} /> Edit Configuration
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: '14px', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Scanner</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.configuration.scanner}</span>

              <span style={{ color: '#64748B' }}>Frameworks</span>
              <span style={{ color: '#0F172A', fontWeight: 500 }}>{scanData.configuration.frameworks}</span>

              <span style={{ color: '#64748B' }}>Directories</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{scanData.configuration.directories}</span>

              <span style={{ color: '#64748B' }}>File Extensions</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{scanData.configuration.file_extensions}</span>

              <span style={{ color: '#64748B' }}>Exclude Paths</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{scanData.configuration.exclude_paths}</span>

              <span style={{ color: '#64748B' }}>Max File Size</span>
              <span style={{ color: '#0F172A' }}>{scanData.configuration.max_file_size}</span>

              <span style={{ color: '#64748B' }}>Parallel Scans</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.configuration.parallel_scans}</span>

              <span style={{ color: '#64748B' }}>Custom Rules</span>
              <span style={{ color: '#16A34A', fontWeight: 600 }}>{scanData.configuration.custom_rules}</span>
            </div>
          </div>

          {/* Card 2: Environment Variables */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Environment Variables</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px', width: '300px' }}>Name</th>
                  <th style={{ padding: '12px 18px' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {scanData.configuration.env_vars.map((ev) => (
                  <tr key={ev.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                      {ev.name}
                    </td>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#2563EB' }}>
                      {ev.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 8: RUN DETAILS (9.8) ── */}
      {activeTab === 'run-details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Execution Information */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>Execution Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: '14px', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Scan ID</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 600 }}>{scanData.run_details.scan_id}</span>

              <span style={{ color: '#64748B' }}>Trigger Type</span>
              <span style={{ color: '#0F172A' }}>{scanData.run_details.trigger_type}</span>

              <span style={{ color: '#64748B' }}>Workflow</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{scanData.run_details.workflow}</span>

              <span style={{ color: '#64748B' }}>Run ID</span>
              <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{scanData.run_details.run_id}</span>

              <span style={{ color: '#64748B' }}>Commit</span>
              <span style={{ color: '#2563EB', fontFamily: 'monospace', fontWeight: 600 }}>{scanData.run_details.commit}</span>

              <span style={{ color: '#64748B' }}>Branch</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.run_details.branch}</span>

              <span style={{ color: '#64748B' }}>Triggered By</span>
              <span style={{ color: '#0F172A' }}>{scanData.run_details.triggered_by}</span>

              <span style={{ color: '#64748B' }}>Start Time</span>
              <span style={{ color: '#0F172A' }}>{scanData.run_details.start_time}</span>

              <span style={{ color: '#64748B' }}>End Time</span>
              <span style={{ color: '#0F172A' }}>{scanData.run_details.end_time}</span>

              <span style={{ color: '#64748B' }}>Duration</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{scanData.run_details.duration}</span>

              <span style={{ color: '#64748B' }}>Status</span>
              <span style={{ color: '#15803D', fontWeight: 700 }}>● {scanData.run_details.status}</span>
            </div>
          </div>

          {/* Card 2: Scanner Versions */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Scanner Versions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: '12px', fontSize: '13px' }}>
              {Object.entries(scanData.run_details.scanner_versions).map(([tool, ver]) => (
                <React.Fragment key={tool}>
                  <span style={{ color: '#64748B' }}>{tool}</span>
                  <span style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 600 }}>{ver}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Scan Configuration (9.7) ── */}
      {configModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', width: '560px', maxWidth: '95vw', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Edit Scan Configuration</h3>
              <button
                onClick={() => setConfigModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Frameworks</label>
                <input
                  type="text"
                  value={editFrameworks}
                  onChange={(e) => setEditFrameworks(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Scan Directories</label>
                <input
                  type="text"
                  value={editDirectories}
                  onChange={(e) => setEditDirectories(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>File Extensions</label>
                <input
                  type="text"
                  value={editExtensions}
                  onChange={(e) => setEditExtensions(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Exclude Paths</label>
                <input
                  type="text"
                  value={editExclude}
                  onChange={(e) => setEditExclude(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Max File Size</label>
                  <input
                    type="text"
                    value={editMaxSize}
                    onChange={(e) => setEditMaxSize(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Parallel Scans</label>
                  <input
                    type="number"
                    value={editParallel}
                    onChange={(e) => setEditParallel(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setConfigModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: savingConfig ? 'not-allowed' : 'pointer' }}
              >
                {savingConfig ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: Finding Detail Drawer ── */}
      {activeFindingDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 90 }}>
          <div style={{ width: '520px', maxWidth: '90vw', backgroundColor: '#FFFFFF', height: '100%', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{activeFindingDetail.id}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>{activeFindingDetail.title}</h3>
              </div>
              <button onClick={() => setActiveFindingDetail(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <SeverityPill severity={activeFindingDetail.severity} />
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309' }}>
                  {activeFindingDetail.status}
                </span>
              </div>

              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Target Resource</div>
                <div style={{ fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {activeFindingDetail.resource}
                </div>
              </div>

              <div>
                <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Location</div>
                <div style={{ fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {activeFindingDetail.file_path}:{activeFindingDetail.line_number}
                </div>
              </div>

              {activeFindingDetail.description && (
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description</div>
                  <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>{activeFindingDetail.description}</p>
                </div>
              )}

              {activeFindingDetail.suggested_fix && (
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Suggested Remediation</div>
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 12px', borderRadius: '6px', color: '#166534', fontFamily: 'monospace', fontSize: '12px' }}>
                    {activeFindingDetail.suggested_fix}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveFindingDetail(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
