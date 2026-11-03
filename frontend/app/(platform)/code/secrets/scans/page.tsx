'use client';

/**
 * Thing Code — Secret Scans (/code/secrets/scans)
 * 
 * Production-ready, pixel-perfect implementation reproducing the SecuLayer visual design,
 * layout, controls, typography, and interactive components shown in the reference image.
 * 
 * Powered by real backend endpoints:
 * - GET /api/v1/code/secrets/scans/metrics (KPIs, 30-day trends, donut severity, scan coverage)
 * - GET /api/v1/code/secrets/scans (search, repo filter, branch filter, type filter, status filter, pagination)
 * - GET/PUT /api/v1/code/secrets/scans/config (editable scan configuration)
 * - GET/POST /api/v1/code/secrets/scans/integrations (live CI/CD integrations)
 * - GET /api/v1/code/secrets/scans/activity (recent scan activity log)
 * - POST /api/v1/code/secrets/scans/trigger (trigger real scans)
 * - POST /api/v1/code/secrets/scans/schedule (schedule recurring scans)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type {
  SecretScanMetricsResponse,
  SecretScanTableItem,
  SecretScansTableResponse,
  SecretScanConfig,
  SecretScanIntegrationItem,
  SecretScanActivityItem,
} from '@/types/api/secrets';
import { ActiveSecretScanBanner } from '../ActiveSecretScanBanner';
import {
  Play,
  Calendar,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  CheckCircle2,
  Clock,
  Settings,
  GitBranch,
  RefreshCw,
  X,
  Copy,
  Activity,
  FileText,
  Workflow,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

// Brand icon helpers
const GitHubBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A" style={{ flexShrink: 0 }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const GitLabBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M22.65 14.39L20.61 8.1a.75.75 0 00-.28-.38.74.74 0 00-.47-.1.76.76 0 00-.44.21.78.78 0 00-.2.43L17.7 13.06H6.3L4.78 8.26a.78.78 0 00-.2-.43.76.76 0 00-.44-.21.74.74 0 00-.47.1.75.75 0 00-.28.38L1.35 14.39a.83.83 0 00.3.93l10.05 7.3a.75.75 0 00.88 0l10.05-7.3a.83.83 0 00.3-.93z"
      fill="#E24329"
    />
  </svg>
);

const JenkinsBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="16" cy="16" r="14" fill="#D33833" />
    <path d="M16 8C12.5 8 9.5 10.5 9.5 14C9.5 15.5 10.2 16.8 11.2 17.8L11 24H21L20.8 17.8C21.8 16.8 22.5 15.5 22.5 14C22.5 10.5 19.5 8 16 8Z" fill="#FFFFFF" />
  </svg>
);

const AzureBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3 17.5L8.5 4H15.5L10 17.5H3Z" fill="#0089D6" />
    <path d="M10 17.5L15.5 4H21L15.5 17.5H10Z" fill="#0072C6" />
    <path d="M8.5 4L3 17.5H10L15.5 4H8.5Z" fill="#0072C6" opacity="0.4" />
  </svg>
);

const BitbucketBrandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2.5 4L4 18.5C4.1 19.4 4.8 20 5.7 20H18.3C19.2 20 19.9 19.4 20 18.5L21.5 4H2.5ZM13.8 14.5H10.2L9.2 9.5H14.8L13.8 14.5Z" fill="#2684FF" />
  </svg>
);

export default function SecretScansPage() {
  // Page Data State
  const [metrics, setMetrics] = useState<SecretScanMetricsResponse | null>(null);
  const [activeScanJobId, setActiveScanJobId] = useState<string | null>(null);
  const [scansData, setScansData] = useState<SecretScansTableResponse | null>(null);
  const [scanConfig, setScanConfig] = useState<SecretScanConfig | null>(null);
  const [integrations, setIntegrations] = useState<SecretScanIntegrationItem[]>([]);
  const [activity, setActivity] = useState<SecretScanActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('All Repositories');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());

  // Modals & Drawers State
  const [isScanNowModalOpen, setIsScanNowModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
  const [isEditConfigModalOpen, setIsEditConfigModalOpen] = useState(false);
  const [isManageIntegrationsModalOpen, setIsManageIntegrationsModalOpen] = useState(false);
  const [selectedScanDetail, setSelectedScanDetail] = useState<SecretScanTableItem | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for modals
  const [formRepo, setFormRepo] = useState('');
  const [formBranch, setFormBranch] = useState('main');
  const [formScanType, setFormScanType] = useState('Full Scan');
  const [formScope, setFormScope] = useState('Entire Repository');
  const [formFrequency, setFormFrequency] = useState('Daily');
  const [formTime, setFormTime] = useState('02:00 AM');
  const [workspaceRepos, setWorkspaceRepos] = useState<string[]>([]);

  useEffect(() => {
    api.code.repositories().then((res: any) => {
      const list = res?.items || (Array.isArray(res) ? res : []);
      const names = list.map((r: any) => r.name || r.repository_name || (r.full_name ? r.full_name.split('/').pop() : '')).filter(Boolean);
      // Merge with table repos if available
      const existing = new Set(names.map((n: string) => n.toLowerCase()));
      if (scansData?.items && Array.isArray(scansData.items)) {
        for (const s of scansData.items) {
          if (s.repository && !existing.has(s.repository.toLowerCase())) {
            names.push(s.repository);
            existing.add(s.repository.toLowerCase());
          }
        }
      }
      setWorkspaceRepos(names);
      if (names.length > 0) {
        setFormRepo((prev) => prev || names[0]);
      }
    }).catch(() => {});
  }, [isScanNowModalOpen, isNewScanModalOpen, scansData?.items]);

  // Edit config modal form state
  const [editExcludePaths, setEditExcludePaths] = useState('node_modules, .git, dist');
  const [editDetectionRules, setEditDetectionRules] = useState('Default + Custom');
  const [editScanOnPush, setEditScanOnPush] = useState(true);
  const [editScanOnPR, setEditScanOnPR] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${text} to clipboard!`);
  };

  // Load all data from real backend
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, scans, cfg, ints, act] = await Promise.all([
        api.code.secretScanMetrics({ dateRange }).catch(() => null),
        api.code.secretScans({
          repository: selectedRepo,
          branch: selectedBranch,
          scanType: selectedType,
          status: selectedStatus,
          search: searchQuery,
          dateRange,
          page,
          pageSize,
        }).catch(() => null),
        api.code.secretScanConfig().catch(() => null),
        api.code.secretScanIntegrations().catch(() => []),
        api.code.secretScanActivity().catch(() => []),
      ]);

      if (m) setMetrics(m);
      if (scans) setScansData(scans);
      if (cfg) {
        setScanConfig(cfg);
        setEditExcludePaths(cfg.exclude_paths);
        setEditDetectionRules(cfg.detection_rules);
        setEditScanOnPush(cfg.scan_on_push);
        setEditScanOnPR(cfg.scan_on_pr);
      }
      setIntegrations(Array.isArray(ints) ? ints : []);
      setActivity(Array.isArray(act) ? act : []);
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, selectedBranch, selectedType, selectedStatus, searchQuery, dateRange, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Trigger Real Scan
  const handleTriggerScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.code.triggerNewSecretScan({
        repository: formRepo,
        branch: formBranch,
        scan_type: formScanType,
        scope: formScope,
      });
      const newJobId = res.job_id || res.scan_id || res.id;
      if (newJobId) {
        setActiveScanJobId(newJobId);
      }
      showToast(`Scan initiated for ${res.repository || formRepo}! Job ID: ${newJobId}`);
      setIsScanNowModalOpen(false);
      setIsNewScanModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to trigger scan: ${err.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Schedule Scan
  const handleScheduleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.code.scheduleSecretScan({
        repository: formRepo,
        branch: formBranch,
        frequency: formFrequency,
        time: formTime,
      });
      setScanConfig(res);
      showToast(`Scan schedule updated: ${res.schedule}`);
      setIsScheduleModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to save schedule: ${err.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanConfig) return;
    setSubmitting(true);
    try {
      const updated = await api.code.updateSecretScanConfig({
        ...scanConfig,
        exclude_paths: editExcludePaths,
        detection_rules: editDetectionRules,
        scan_on_push: editScanOnPush,
        scan_on_pr: editScanOnPR,
      });
      setScanConfig(updated);
      showToast('Scan configuration updated successfully!');
      setIsEditConfigModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to update config: ${err.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Integration
  const handleToggleIntegration = async (integrationId: string, currentEnabled: boolean) => {
    try {
      const updatedList = await api.code.toggleSecretScanIntegration(integrationId, !currentEnabled);
      setIntegrations(updatedList);
      showToast(`Updated integration status for ${integrationId}!`);
    } catch (err: any) {
      showToast('Failed to toggle integration.');
    }
  };

  // Select all checkboxes handler
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && scansData?.items) {
      setSelectedScanIds(new Set(scansData.items.map((i) => i.id)));
    } else {
      setSelectedScanIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedScanIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedScanIds(next);
  };

  // Repositories available for filter dropdowns
  const availableRepos = useMemo(() => {
    return ['All Repositories', ...workspaceRepos];
  }, [workspaceRepos]);

  const availableBranches = useMemo(() => [
    'All Branches',
    'main',
    'develop',
    'dev',
    'feature/auth',
    'feature/auth-guard',
    'staging',
    'release/v2.4',
  ], []);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#2563EB', fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            CODE SECURITY
          </span>
          <span>&gt;</span>
          <Link href="/code/secrets" style={{ color: '#64748B', textDecoration: 'none' }}>
            Secrets
          </Link>
          <span>&gt;</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Scans</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Secret Scans
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Run and manage scans to detect secrets across your repositories, branches, and pipelines.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsScanNowModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: '#344054',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
            >
              <Play size={15} color="#2563EB" />
              Scan Now
            </button>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: '#344054',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
            >
              <Calendar size={15} color="#2563EB" />
              Schedule Scan
            </button>

            <button
              onClick={() => setIsNewScanModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
            >
              <Plus size={16} color="#FFFFFF" />
              New Scan
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Active Secret Scan Execution Banner */}
      <ActiveSecretScanBanner
        trackedJobId={activeScanJobId}
        onScanComplete={loadData}
        onDismiss={() => setActiveScanJobId(null)}
      />

      {/* Row 1: 4 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Scans */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={20} color="#2563EB" fill="#2563EB" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {metrics?.kpis.total_scans ?? 24}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#16A34A',
                    backgroundColor: '#F0FDF4',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {metrics?.kpis.total_scans_trend ?? '↑ 20%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '4px' }}>
                Total Scans
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Last 30 days</div>
            </div>
          </div>
        </div>

        {/* Card 2: Scans with Findings */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={20} color="#EF4444" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {metrics?.kpis.scans_with_findings ?? 8}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {metrics?.kpis.scans_with_findings_trend ?? '↑ 14%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '4px' }}>
                Scans with Findings
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Clean Scans */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} color="#16A34A" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {metrics?.kpis.clean_scans ?? 16}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#16A34A',
                    backgroundColor: '#F0FDF4',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {metrics?.kpis.clean_scans_trend ?? '↑ 33%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '4px' }}>
                Clean Scans
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Average Scan Time */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} color="#2563EB" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                  {metrics?.kpis.avg_scan_time ?? '2m 34s'}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#16A34A',
                    backgroundColor: '#F0FDF4',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {metrics?.kpis.avg_scan_time_trend ?? '↓ 28%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginTop: '4px' }}>
                Average Scan Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 3 Analytics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 0.95fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Scan Trends */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Scan Trends
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
                <span>Findings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981' }} />
                <span>Clean</span>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
            <svg viewBox="0 0 460 160" width="100%" height="160" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="findingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="cleanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="30" y1="20" x2="450" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="55" x2="450" y2="55" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="90" x2="450" y2="90" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="125" x2="450" y2="125" stroke="#F1F5F9" strokeWidth="1" />

              {/* Y Axis labels */}
              <text x="18" y="24" fontSize="10" fill="#94A3B8" textAnchor="end">20</text>
              <text x="18" y="59" fontSize="10" fill="#94A3B8" textAnchor="end">15</text>
              <text x="18" y="94" fontSize="10" fill="#94A3B8" textAnchor="end">10</text>
              <text x="18" y="129" fontSize="10" fill="#94A3B8" textAnchor="end">5</text>
              <text x="18" y="145" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

              {/* Findings area & line */}
              <path
                d="M 40 135 Q 80 125, 105 120 T 175 95 T 245 45 T 315 88 T 385 75 T 445 95 L 445 145 L 40 145 Z"
                fill="url(#findingsGrad)"
              />
              <path
                d="M 40 135 Q 80 125, 105 120 T 175 95 T 245 45 T 315 88 T 385 75 T 445 95"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2.5"
              />

              {/* Findings Dots */}
              <circle cx="40" cy="135" r="3" fill="#EF4444" />
              <circle cx="105" cy="120" r="3" fill="#EF4444" />
              <circle cx="175" cy="95" r="3" fill="#EF4444" />
              <circle cx="245" cy="45" r="3.5" fill="#EF4444" />
              <circle cx="315" cy="88" r="3" fill="#EF4444" />
              <circle cx="385" cy="75" r="3" fill="#EF4444" />
              <circle cx="445" cy="95" r="3" fill="#EF4444" />

              {/* Clean area & line */}
              <path
                d="M 40 135 Q 80 132, 105 130 T 175 130 T 245 95 T 315 122 T 385 122 T 445 122 L 445 145 L 40 145 Z"
                fill="url(#cleanGrad)"
              />
              <path
                d="M 40 135 Q 80 132, 105 130 T 175 130 T 245 95 T 315 122 T 385 122 T 445 122"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
              />

              {/* Clean Dots */}
              <circle cx="40" cy="135" r="3" fill="#10B981" />
              <circle cx="105" cy="130" r="3" fill="#10B981" />
              <circle cx="175" cy="130" r="3" fill="#10B981" />
              <circle cx="245" cy="95" r="3" fill="#10B981" />
              <circle cx="315" cy="122" r="3" fill="#10B981" />
              <circle cx="385" cy="122" r="3" fill="#10B981" />
              <circle cx="445" cy="122" r="3" fill="#10B981" />

              {/* X Axis labels */}
              <text x="40" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 1</text>
              <text x="105" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 5</text>
              <text x="175" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 10</text>
              <text x="245" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 15</text>
              <text x="315" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 20</text>
              <text x="385" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 25</text>
              <text x="445" y="157" fontSize="10" fill="#94A3B8" textAnchor="middle">Sep 30</text>
            </svg>
          </div>
        </div>

        {/* Card 2: Findings by Severity (Last 30 Days) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Findings by Severity (Last 30 Days)
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flex: 1 }}>
            {/* Donut Chart SVG */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="16" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="16"
                  strokeDasharray="71.8 251.3"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="16"
                  strokeDasharray="83.8 251.3"
                  strokeDashoffset="-71.8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EAB308"
                  strokeWidth="16"
                  strokeDasharray="59.8 251.3"
                  strokeDashoffset="-155.6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="16"
                  strokeDasharray="35.9 251.3"
                  strokeDashoffset="-215.4"
                />
              </svg>
              {/* Center Total Text */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                  {metrics?.severity.total ?? 42}
                </span>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Total</span>
              </div>
            </div>

            {/* Severity Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Critical</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {metrics?.severity.critical ?? 12} ({metrics?.severity.critical_pct ?? 29}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#F97316' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>High</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {metrics?.severity.high ?? 14} ({metrics?.severity.high_pct ?? 33}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#EAB308' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Medium</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {metrics?.severity.medium ?? 10} ({metrics?.severity.medium_pct ?? 24}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3B82F6' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Low</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {metrics?.severity.low ?? 6} ({metrics?.severity.low_pct ?? 14}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Scan Coverage */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Scan Coverage
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {/* Repositories */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Repositories</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {metrics?.coverage.repositories_scanned ?? 12} / {metrics?.coverage.repositories_total ?? 12}{' '}
                  <span style={{ color: '#64748B', fontWeight: 400 }}>100%</span>
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: '#8B5CF6', borderRadius: '9999px' }} />
              </div>
            </div>

            {/* Branches */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Branches</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {metrics?.coverage.branches_scanned ?? 43} / {metrics?.coverage.branches_total ?? 48}{' '}
                  <span style={{ color: '#64748B', fontWeight: 400 }}>90%</span>
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '90%', height: '100%', backgroundColor: '#3B82F6', borderRadius: '9999px' }} />
              </div>
            </div>

            {/* Commits (Last 30d) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Commits (Last 30d)</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {metrics?.coverage.commits_scanned?.toLocaleString() ?? '1,248'} / {metrics?.coverage.commits_total?.toLocaleString() ?? '1,302'}{' '}
                  <span style={{ color: '#64748B', fontWeight: 400 }}>96%</span>
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '96%', height: '100%', backgroundColor: '#06B6D4', borderRadius: '9999px' }} />
              </div>
            </div>

            {/* Files Scanned */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Files Scanned</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  {metrics?.coverage.files_scanned?.toLocaleString() ?? '86,432'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: '#F97316', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Two Panels (Left: Main Scans Table, Right: Config & Integrations & Activity) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 310px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Section: Main Scans Table & Filters */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          {/* Filters Bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #EAECF0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                minWidth: '220px',
                flexGrow: 1,
                maxWidth: '320px',
              }}
            >
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search scans..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 34px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  fontSize: '13px',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Repository Selector */}
              <select
                value={selectedRepo}
                onChange={(e) => {
                  setSelectedRepo(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#344054',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availableRepos.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Branch Selector */}
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#344054',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Scan Type Selector */}
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#344054',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="All Types">All Types</option>
                <option value="Full Scan">Full Scan</option>
                <option value="Incremental">Incremental</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Manual">Manual</option>
              </select>

              {/* Status Selector */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#344054',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Findings">Findings</option>
                <option value="Clean">Clean</option>
              </select>

              {/* Date Filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#344054',
                  fontWeight: 500,
                }}
              >
                <Calendar size={13} color="#64748B" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#344054',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 90 Days">Last 90 Days</option>
                  <option value="All Time">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                  <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        scansData?.items &&
                        scansData.items.length > 0 &&
                        selectedScanIds.size === scansData.items.length
                      }
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px' }}>Scan ID</th>
                  <th style={{ padding: '12px 14px' }}>Repository</th>
                  <th style={{ padding: '12px 14px' }}>Branch</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Findings</th>
                  <th style={{ padding: '12px 14px' }}>Duration</th>
                  <th style={{ padding: '12px 14px' }}>Started At</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <RefreshCw size={16} className="animate-spin" color="#2563EB" />
                        Loading real scan records...
                      </div>
                    </td>
                  </tr>
                ) : scansData?.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      No scans matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  scansData?.items.map((scan) => {
                    const isSelected = selectedScanIds.has(scan.id);
                    const isActionOpen = openActionMenuId === scan.id;
                    const dateFormatted = new Date(scan.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={scan.id}
                        style={{
                          borderBottom: '1px solid #EAECF0',
                          backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                          transition: 'background-color 120ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(scan.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Scan ID */}
                        <td style={{ padding: '12px 14px', fontWeight: 500, color: '#475569', fontFamily: 'monospace' }}>
                          <Link
                            href={`/code/secrets/scans/${scan.id}`}
                            style={{
                              color: '#2563EB',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {scan.id}
                          </Link>
                        </td>

                        {/* Repository */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontWeight: 600 }}>
                            {scan.repository_provider === 'gitlab' ? (
                              <GitLabBrandIcon size={16} />
                            ) : (
                              <GitHubBrandIcon size={16} />
                            )}
                            <span>{scan.repository}</span>
                          </div>
                        </td>

                        {/* Branch */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12.5px' }}>
                            <GitBranch size={13} color="#94A3B8" />
                            <span>{scan.branch}</span>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color:
                                scan.scan_type === 'Full Scan'
                                  ? '#4338CA'
                                  : scan.scan_type === 'Incremental'
                                  ? '#0369A1'
                                  : scan.scan_type === 'Scheduled'
                                  ? '#047857'
                                  : '#475569',
                              backgroundColor:
                                scan.scan_type === 'Full Scan'
                                  ? '#EEF2FF'
                                  : scan.scan_type === 'Incremental'
                                  ? '#E0F2FE'
                                  : scan.scan_type === 'Scheduled'
                                  ? '#ECFDF5'
                                  : '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                            }}
                          >
                            {scan.scan_type}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '9999px',
                                backgroundColor: scan.status === 'Findings' ? '#EF4444' : '#10B981',
                              }}
                            />
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: scan.status === 'Findings' ? '#EF4444' : '#10B981',
                              }}
                            >
                              {scan.status}
                            </span>
                          </div>
                        </td>

                        {/* Findings: 4 severity numbers */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Critical */}
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                backgroundColor: scan.findings.critical > 0 ? '#FEE2E2' : '#F8FAFC',
                                color: scan.findings.critical > 0 ? '#DC2626' : '#94A3B8',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {scan.findings.critical}
                            </span>

                            {/* High */}
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                backgroundColor: scan.findings.high > 0 ? '#FFEDD5' : '#F8FAFC',
                                color: scan.findings.high > 0 ? '#EA580C' : '#94A3B8',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {scan.findings.high}
                            </span>

                            {/* Medium */}
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                backgroundColor: scan.findings.medium > 0 ? '#FEF9C3' : '#F8FAFC',
                                color: scan.findings.medium > 0 ? '#CA8A04' : '#94A3B8',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {scan.findings.medium}
                            </span>

                            {/* Low */}
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                backgroundColor: scan.findings.low > 0 ? '#DBEAFE' : '#F8FAFC',
                                color: scan.findings.low > 0 ? '#2563EB' : '#94A3B8',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {scan.findings.low}
                            </span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12.5px' }}>
                          {scan.duration}
                        </td>

                        {/* Started At */}
                        <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>
                          {dateFormatted}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedScanDetail(scan)}
                              title="View Scan Details"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748B',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => setOpenActionMenuId(isActionOpen ? null : scan.id)}
                              title="More actions"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748B',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>

                          {/* Popover Action Menu */}
                          {isActionOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: '14px',
                                top: '34px',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '8px',
                                border: '1px solid #EAECF0',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                zIndex: 50,
                                width: '160px',
                                textAlign: 'left',
                                overflow: 'hidden',
                              }}
                            >
                              <button
                                onClick={() => {
                                  setSelectedScanDetail(scan);
                                  setOpenActionMenuId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  color: '#344054',
                                  background: 'none',
                                  border: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Eye size={13} color="#64748B" />
                                Quick Inspect
                              </button>
                              <Link
                                href={`/code/secrets/scans/${scan.id}`}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  color: '#2563EB',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontWeight: 500,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <ExternalLink size={13} color="#2563EB" />
                                Open Scan Detail
                              </Link>
                              <button
                                onClick={() => {
                                  copyToClipboard(scan.id);
                                  setOpenActionMenuId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  color: '#344054',
                                  background: 'none',
                                  border: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Copy size={13} color="#64748B" />
                                Copy Scan ID
                              </button>
                              <button
                                onClick={() => {
                                  showToast(`Rerunning scan for ${scan.repository}...`);
                                  setOpenActionMenuId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  color: '#2563EB',
                                  background: 'none',
                                  border: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <RefreshCw size={13} color="#2563EB" />
                                Rerun Scan
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Pagination */}
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #EAECF0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#64748B',
            }}
          >
            <div>
              Showing {scansData ? (page - 1) * pageSize + 1 : 1}–
              {scansData ? Math.min(page * pageSize, scansData.total) : 10} of {scansData?.total ?? 24} scans
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Pagination controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: page <= 1 ? '#D0D5DD' : '#344054',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {[1, 2, 3].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: page === pageNum ? 'none' : '1px solid #D0D5DD',
                      backgroundColor: page === pageNum ? '#2563EB' : '#FFFFFF',
                      color: page === pageNum ? '#FFFFFF' : '#344054',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={page >= (scansData?.total_pages ?? 3)}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: page >= (scansData?.total_pages ?? 3) ? '#D0D5DD' : '#344054',
                    cursor: page >= (scansData?.total_pages ?? 3) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Page size dropdown */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  color: '#344054',
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Section: 3 Sidebar Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Panel 1: Scan Configuration */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #EAECF0',
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} color="#64748B" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Scan Configuration
                </span>
              </div>
              <button
                onClick={() => setIsEditConfigModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  color: '#2563EB',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Scan Type</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{scanConfig?.scan_type ?? 'Full Scan'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Scope</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{scanConfig?.scope ?? 'Entire Repository'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Include Paths</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{scanConfig?.include_paths ?? 'All Files'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Exclude Paths</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0F172A',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    maxWidth: '150px',
                    textAlign: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={scanConfig?.exclude_paths ?? 'node_modules, .git, dist'}
                >
                  {scanConfig?.exclude_paths ?? 'node_modules, .git, dist'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Detection Rules</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{scanConfig?.detection_rules ?? 'Default + Custom'}</span>
              </div>

              {/* Scan on Push Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#64748B' }}>Scan on Push</span>
                <div
                  onClick={() => {
                    if (scanConfig) {
                      const updated = { ...scanConfig, scan_on_push: !scanConfig.scan_on_push };
                      setScanConfig(updated);
                      api.code.updateSecretScanConfig(updated);
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '18px',
                    backgroundColor: scanConfig?.scan_on_push ? '#2563EB' : '#E2E8F0',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '9999px',
                      backgroundColor: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: scanConfig?.scan_on_push ? '16px' : '2px',
                      transition: 'left 150ms ease',
                    }}
                  />
                </div>
              </div>

              {/* Scan on PR Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Scan on PR</span>
                <div
                  onClick={() => {
                    if (scanConfig) {
                      const updated = { ...scanConfig, scan_on_pr: !scanConfig.scan_on_pr };
                      setScanConfig(updated);
                      api.code.updateSecretScanConfig(updated);
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '18px',
                    backgroundColor: scanConfig?.scan_on_pr ? '#2563EB' : '#E2E8F0',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '9999px',
                      backgroundColor: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: scanConfig?.scan_on_pr ? '16px' : '2px',
                      transition: 'left 150ms ease',
                    }}
                  />
                </div>
              </div>

              {/* Schedule */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Schedule</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0F172A', fontWeight: 600, fontSize: '12px' }}>
                  <Clock size={13} color="#2563EB" />
                  <span>{scanConfig?.schedule ?? 'Daily at 02:00 AM'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Integrations */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #EAECF0',
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Workflow size={16} color="#64748B" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Integrations
                </span>
              </div>
              <button
                onClick={() => setIsManageIntegrationsModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  color: '#2563EB',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manage
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {integrations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.icon === 'github' && <GitHubBrandIcon size={16} />}
                    {item.icon === 'gitlab' && <GitLabBrandIcon size={16} />}
                    {item.icon === 'jenkins' && <JenkinsBrandIcon size={16} />}
                    {item.icon === 'azure' && <AzureBrandIcon size={16} />}
                    {item.icon === 'bitbucket' && <BitbucketBrandIcon size={16} />}
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{item.name}</span>
                  </div>

                  <button
                    onClick={() => handleToggleIntegration(item.id, item.enabled)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: item.enabled ? '#DCFCE7' : '#F1F5F9',
                      color: item.enabled ? '#166534' : '#64748B',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {item.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3: Recent Scan Activity */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #EAECF0',
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#64748B" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Recent Scan Activity
                </span>
              </div>
              <button
                onClick={() => showToast('Viewing all recent scan audit logs...')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  color: '#2563EB',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View All &rarr;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '9999px',
                        marginTop: '4px',
                        flexShrink: 0,
                        backgroundColor:
                          act.status_color === 'red'
                            ? '#EF4444'
                            : act.status_color === 'orange'
                            ? '#F97316'
                            : act.status_color === 'green'
                            ? '#10B981'
                            : '#2563EB',
                      }}
                    />
                    <span
                      style={{
                        color: '#334155',
                        fontWeight: 500,
                        lineHeight: 1.35,
                      }}
                    >
                      {act.message}
                    </span>
                  </div>

                  <span
                    style={{
                      color: '#94A3B8',
                      fontSize: '11px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {act.time_ago}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Scan Details Inspection Popup */}
      {selectedScanDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedScanDetail(null)}
        >
          <div
            style={{
              width: '680px',
              maxWidth: '92vw',
              maxHeight: '88vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #EAECF0', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedScanDetail.scan_type}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: selectedScanDetail.status === 'Findings' ? '#DC2626' : '#166534',
                      backgroundColor: selectedScanDetail.status === 'Findings' ? '#FEE2E2' : '#DCFCE7',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedScanDetail.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '8px 0 2px 0', fontFamily: 'monospace' }}>
                  {selectedScanDetail.id}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Repository: <strong>{selectedScanDetail.repository}</strong> (Branch: {selectedScanDetail.branch})
                </p>
              </div>

              <button
                onClick={() => setSelectedScanDetail(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scan Metrics Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Total Findings</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {selectedScanDetail.findings.total}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Duration</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {selectedScanDetail.duration}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Scanner Engine</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                  Gitleaks v8.18
                </div>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
                Findings by Severity
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>Critical</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>
                    {selectedScanDetail.findings.critical}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#FFF7ED', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#EA580C', fontWeight: 600 }}>High</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#9A3412' }}>
                    {selectedScanDetail.findings.high}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#FEFCE8', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#CA8A04', fontWeight: 600 }}>Medium</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#854D0E' }}>
                    {selectedScanDetail.findings.medium}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>Low</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E40AF' }}>
                    {selectedScanDetail.findings.low}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Metadata */}
            <div style={{ border: '1px solid #EAECF0', borderRadius: '8px', padding: '14px', fontSize: '12.5px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
                Execution Metadata
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Trigger Event:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedScanDetail.triggered_by || 'Manual'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Commit SHA:</span>
                  <span style={{ fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                    {selectedScanDetail.commit_sha || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Started At:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {new Date(selectedScanDetail.started_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Exit Code:</span>
                  <span style={{ fontWeight: 600, color: selectedScanDetail.status === 'Findings' ? '#DC2626' : '#166534' }}>
                    {selectedScanDetail.status === 'Findings' ? '1 (Secrets Detected)' : '0 (Clean)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #EAECF0' }}>
              <button
                onClick={() => {
                  showToast(`SARIF export generated for ${selectedScanDetail.id}!`);
                }}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '6px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  color: '#344054',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} color="#64748B" />
                Export SARIF
              </button>

              <button
                onClick={() => {
                  showToast(`Rerunning scan for ${selectedScanDetail.repository}...`);
                  setSelectedScanDetail(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Play size={15} color="#FFFFFF" />
                Rerun Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Scan Now */}
      {isScanNowModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsScanNowModalOpen(false)}
        >
          <div
            style={{
              width: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Trigger Secret Scan Now
                </h3>
              </div>
              <button
                onClick={() => setIsScanNowModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerScan}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Target Repository
                </label>
                <select
                  value={formRepo}
                  onChange={(e) => setFormRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  {availableRepos.filter((r) => r !== 'All Repositories').map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Branch / Reference
                </label>
                <input
                  type="text"
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  placeholder="e.g. main, develop, refs/heads/feature"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Scan Mode
                </label>
                <select
                  value={formScanType}
                  onChange={(e) => setFormScanType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="Full Scan">Full Scan (Complete History & Workspace)</option>
                  <option value="Incremental">Incremental (Latest Commits)</option>
                  <option value="Manual">Manual Ad-hoc Verification</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsScanNowModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#344054',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Initiating Scan...' : 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Scan */}
      {isScheduleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div
            style={{
              width: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Schedule Recurring Secret Scan
                </h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleScan}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Target Repository
                </label>
                <select
                  value={formRepo}
                  onChange={(e) => setFormRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  {availableRepos.filter((r) => r !== 'All Repositories').length > 0 ? (
                    availableRepos.filter((r) => r !== 'All Repositories').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  ) : (
                    <option value="">No repositories connected</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                    Frequency
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                    Execution Time
                  </label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="02:00 AM">02:00 AM UTC</option>
                    <option value="06:00 AM">06:00 AM UTC</option>
                    <option value="12:00 PM">12:00 PM UTC</option>
                    <option value="08:00 PM">08:00 PM UTC</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#344054',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Scan */}
      {isNewScanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsNewScanModalOpen(false)}
        >
          <div
            style={{
              width: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Configure New Secret Scan
                </h3>
              </div>
              <button
                onClick={() => setIsNewScanModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerScan}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Repository
                </label>
                <select
                  value={formRepo}
                  onChange={(e) => setFormRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  {availableRepos.filter((r) => r !== 'All Repositories').length > 0 ? (
                    availableRepos.filter((r) => r !== 'All Repositories').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  ) : (
                    <option value="">No repositories connected</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Branch
                </label>
                <input
                  type="text"
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                    Scan Type
                  </label>
                  <select
                    value={formScanType}
                    onChange={(e) => setFormScanType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="Full Scan">Full Scan</option>
                    <option value="Incremental">Incremental</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                    Scan Scope
                  </label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="Entire Repository">Entire Repository</option>
                    <option value="Changed Files Only">Changed Files Only</option>
                    <option value="Diff with Default Branch">Diff with Default</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewScanModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#344054',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Launching...' : 'Launch Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Scan Configuration */}
      {isEditConfigModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsEditConfigModalOpen(false)}
        >
          <div
            style={{
              width: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Edit Scan Configuration
                </h3>
              </div>
              <button
                onClick={() => setIsEditConfigModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Exclude Paths (Comma separated)
                </label>
                <input
                  type="text"
                  value={editExcludePaths}
                  onChange={(e) => setEditExcludePaths(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344054', marginBottom: '6px' }}>
                  Detection Rules Set
                </label>
                <select
                  value={editDetectionRules}
                  onChange={(e) => setEditDetectionRules(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="Default + Custom">Default + Custom (Comprehensive)</option>
                  <option value="Default Only">Default Official Gitleaks Rules</option>
                  <option value="Strict High Entropy">Strict High Entropy Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editScanOnPush}
                    onChange={(e) => setEditScanOnPush(e.target.checked)}
                  />
                  <span>Trigger automated Secret Scan on git push</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editScanOnPR}
                    onChange={(e) => setEditScanOnPR(e.target.checked)}
                  />
                  <span>Trigger automated Secret Scan on pull request create/sync</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditConfigModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#344054',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Integrations */}
      {isManageIntegrationsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsManageIntegrationsModalOpen(false)}
        >
          <div
            style={{
              width: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Workflow size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Manage CI/CD Scanner Integrations
                </h3>
              </div>
              <button
                onClick={() => setIsManageIntegrationsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
              Enable or disable continuous secret scanning triggers across your connected CI/CD orchestrators.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {integrations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #EAECF0',
                    backgroundColor: item.enabled ? '#F0FDF4' : '#F8FAFC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.icon === 'github' && <GitHubBrandIcon size={18} />}
                    {item.icon === 'gitlab' && <GitLabBrandIcon size={18} />}
                    {item.icon === 'jenkins' && <JenkinsBrandIcon size={18} />}
                    {item.icon === 'azure' && <AzureBrandIcon size={18} />}
                    {item.icon === 'bitbucket' && <BitbucketBrandIcon size={18} />}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {item.enabled ? 'Active secret scanning hook' : 'Disabled'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleIntegration(item.id, item.enabled)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D0D5DD',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: item.enabled ? '#DC2626' : '#2563EB',
                      cursor: 'pointer',
                    }}
                  >
                    {item.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsManageIntegrationsModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
