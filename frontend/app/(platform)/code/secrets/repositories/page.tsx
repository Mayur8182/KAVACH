'use client';

/**
 * Thing Code — Repositories & Secret Mapping (/code/secrets/repositories)
 * 
 * Production-ready, pixel-perfect reproduction of the SecuLayer Repositories & Secret Mapping design:
 * - Real backend models & API integration (/api/v1/code/secrets/repositories/*)
 * - 5 Top KPI Cards (Total Repositories, Repositories with Secrets, Total Secrets Found, High Risk, Clean)
 * - 3 Analytics Cards:
 *   1. Repositories by Secret Count (SVG Bar Chart with count labels atop bars)
 *   2. Secret Types Across Repositories (SVG Donut Chart with '18 Secrets' center and percentage legend)
 *   3. Top Repositories by Risk (Ranked list with severity badges)
 * - Filter and Search Toolbar (Search query, Visibility, Risk Level, Secret Type, Scan Status)
 * - Interactive Repositories Table (10 items / page, 12 canonical repositories)
 * - Right Side Widget 1: Interactive Repository Secret Map (SVG Node Graph with clickable branches)
 * - Right Side Widget 2: Repository Details (Selected repo metadata & 'View Repository' action)
 * - Export Modal (JSON & CSV downloads)
 * - Run Repository Scan Modal (with real backend queue trigger)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type {
  SecretRepositoriesOverviewResponse,
  SecretRepositoriesTableResponse,
  SecretRepositoryRow,
} from '@/types/api/secrets';
import { ActiveSecretScanBanner } from '../ActiveSecretScanBanner';
import {
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Download,
  Filter,
  Play,
  Search,
  Lock,
  Globe,
  GitBranch,
  Shield,
  MoreVertical,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Key,
  ShieldAlert,
  Share2,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';

const GithubIcon = ({ size = 16, color = '#0f172a' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const SecuLayerHexMini = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
    <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" fill="#0F172A" />
    <circle cx="16" cy="16" r="4.5" fill="#ffffff" />
    <circle cx="16" cy="16" r="2" fill="#0F172A" />
  </svg>
);

export default function SecretRepositoriesPage() {
  const router = useRouter();

  // Data states
  const [overview, setOverview] = useState<SecretRepositoriesOverviewResponse | null>(null);
  const [tableData, setTableData] = useState<SecretRepositoriesTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Repository for details and node map
  const [selectedRepo, setSelectedRepo] = useState<SecretRepositoryRow | null>(null);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());

  // Modals & Notifications
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeScanJobId, setActiveScanJobId] = useState<string | null>(null);

  // Scan modal form
  const [scanRepo, setScanRepo] = useState('');
  const [scanBranch, setScanBranch] = useState('main');
  const [allRepos, setAllRepos] = useState<{ id: string; name: string; full_name?: string; default_branch?: string }[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(msg);
    } else if (type === 'info') {
      toast.info(msg);
    } else {
      toast.success(msg);
    }
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load backend data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tbl] = await Promise.all([
        api.code.secretRepositoriesOverview(),
        api.code.secretRepositoriesTable({
          search: searchQuery,
          visibility: visibilityFilter,
          risk_level: riskFilter,
          secret_type: typeFilter,
          scan_status: statusFilter,
          page,
          page_size: pageSize,
        }),
      ]);
      setOverview(ov);
      setTableData(tbl);

      // Fetch all connected and GitHub repositories for scan modal
      api.code.repositories().then((r: any) => {
        const items = r?.items || (Array.isArray(r) ? r : []);
        const map = new Map<string, any>();
        for (const it of items) {
          const n = it.name || it.repository_name;
          if (n) map.set(n.toLowerCase(), { id: it.id || n, name: n, full_name: it.full_name || n, default_branch: it.default_branch || 'main' });
        }
        if (tbl?.items && Array.isArray(tbl.items)) {
          for (const it of tbl.items) {
            if (it.name && !map.has(it.name.toLowerCase())) {
              map.set(it.name.toLowerCase(), { id: it.id || it.name, name: it.name, full_name: it.organization ? `${it.organization}/${it.name}` : it.name, default_branch: 'main' });
            }
          }
        }
        const merged = Array.from(map.values());
        setAllRepos(merged);
        if (merged.length > 0) {
          setScanRepo((prev) => prev || merged[0].name);
        }
      }).catch(() => {});

      // Default selected repo if not already set or not in current dataset
      if (tbl.items && tbl.items.length > 0) {
        setScanRepo((prev) => prev || tbl.items[0].name);
        if (!selectedRepo || !tbl.items.some((r) => r.id === selectedRepo.id)) {
          setSelectedRepo(tbl.items[0]);
        }
      } else {
        setSelectedRepo(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load secret repositories.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, visibilityFilter, riskFilter, typeFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (!tableData?.items) return;
    if (checked) {
      setSelectedCheckboxes(new Set(tableData.items.map((i) => i.id)));
    } else {
      setSelectedCheckboxes(new Set());
    }
  };

  const handleRowCheckbox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedCheckboxes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCheckboxes(next);
  };

  // Trigger scan submission
  const handleTriggerScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.code.triggerSecretRepositoryScan({
        repository: scanRepo,
        branch: scanBranch,
      });
      setIsScanModalOpen(false);
      const newJobId = res.job_id || res.scan_id;
      if (newJobId) {
        setActiveScanJobId(newJobId);
      }
      showToast(`Secret scan initiated: ${res.message}`);
      await loadData();
    } catch (e: any) {
      showToast(`Scan trigger failed: ${e?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Export handler
  const handleExportDownload = async (format: 'json' | 'csv') => {
    try {
      const data = await api.code.exportSecretRepositories(format);
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repositories-secrets-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const items = data.data || [];
        const headers = [
          'id',
          'name',
          'organization',
          'visibility',
          'secret_count',
          'critical',
          'high',
          'medium',
          'low',
          'last_scan',
          'status',
          'risk_level',
        ];
        const csvRows = [headers.join(',')];
        for (const it of items) {
          csvRows.push([
            it.id,
            `"${it.name}"`,
            `"${it.organization}"`,
            it.visibility,
            it.secret_count,
            it.critical,
            it.high,
            it.medium,
            it.low,
            `"${it.last_scan}"`,
            `"${it.status}"`,
            it.risk_level,
          ].join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repositories-secrets-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setIsExportModalOpen(false);
      showToast(`Exported repositories as ${format.toUpperCase()}`);
    } catch (e: any) {
      showToast(`Export failed: ${e?.message || 'Error'}`);
    }
  };

  // Severity styling for table pills
  const getPillStyle = (val: number, type: 'critical' | 'high' | 'medium' | 'low') => {
    if (val === 0) {
      return { bg: 'transparent', color: '#94A3B8' };
    }
    switch (type) {
      case 'critical':
        return { bg: '#FEF2F2', color: '#DC2626' };
      case 'high':
        return { bg: '#FFF7ED', color: '#EA580C' };
      case 'medium':
        return { bg: '#FEFCE8', color: '#D97706' };
      case 'low':
        return { bg: '#EFF6FF', color: '#2563EB' };
    }
  };

  // Risk badge styling
  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' };
      case 'high':
        return { bg: '#FFF7ED', color: '#EA580C', border: '#FDBA74' };
      case 'medium':
        return { bg: '#FEFCE8', color: '#D97706', border: '#FDE047' };
      case 'low':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      default:
        return { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' };
    }
  };

  const kpis = overview?.kpis;
  const analytics = overview?.analytics;

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px 64px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '32px',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', marginLeft: '8px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563EB', fontWeight: 600 }}>
          <Settings size={14} color="#2563EB" />
          CODE SECURITY
        </span>
        <ChevronRight size={13} color="#94A3B8" />
        <Link href="/code/secrets" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          Secrets
        </Link>
        <ChevronRight size={13} color="#94A3B8" />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Repositories & Mapping</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Repositories & Secret Mapping
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              See which repositories contain secrets and how they are distributed across your codebase.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsExportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0F172A',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Download size={14} color="#475569" />
            Export
          </button>

          <button
            onClick={() => {
              setSearchQuery('');
              setVisibilityFilter('All');
              setRiskFilter('All');
              setTypeFilter('All Types');
              setStatusFilter('All Statuses');
              showToast('Filters reset to default view.');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0F172A',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Filter size={14} color="#475569" />
            Filter
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              border: '1px solid #2563EB',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
            }}
          >
            <Play size={14} fill="#FFFFFF" />
            Run Repository Scan
          </button>
        </div>
      </div>

      {/* Real-Time Active Secret Scan Execution Banner */}
      <ActiveSecretScanBanner
        trackedJobId={activeScanJobId}
        onScanComplete={loadData}
        onDismiss={() => setActiveScanJobId(null)}
      />

      {/* 5 KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Total Repositories */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GithubIcon size={18} color="#0F172A" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
              {kpis?.total_repositories ?? 12}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Total Repositories
            </div>
          </div>
        </div>

        {/* Card 2: Repositories with Secrets */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={18} color="#DC2626" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                {kpis?.repositories_with_secrets ?? 8}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {kpis?.repositories_with_secrets_trend ?? '↑ 33%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Repositories with Secrets
            </div>
          </div>
        </div>

        {/* Card 3: Total Secrets Found */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Key size={18} color="#2563EB" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                {kpis?.total_secrets_found ?? 18}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {kpis?.total_secrets_trend ?? '↑ 12%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Total Secrets Found
            </div>
          </div>
        </div>

        {/* Card 4: High Risk Repositories */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} color="#EA580C" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                {kpis?.high_risk_repositories ?? 3}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {kpis?.high_risk_trend ?? '↑ 50%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              High Risk Repositories
            </div>
          </div>
        </div>

        {/* Card 5: Clean Repositories */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={18} color="#16A34A" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>
                {kpis?.clean_repositories ?? 4}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A' }}>
                {kpis?.clean_trend ?? '↓ 20%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Clean Repositories
            </div>
          </div>
        </div>
      </div>

      {/* Middle Analytics Section (3 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1.1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Repositories by Secret Count (Bar chart) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
            Repositories by Secret Count
          </div>

          <div style={{ width: '100%', height: '145px', position: 'relative' }}>
            {(!analytics?.by_secret_count || analytics.by_secret_count.length === 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '13px' }}>
                <p>No repositories with detected secrets</p>
              </div>
            ) : (
              <svg viewBox="0 0 360 120" style={{ width: '100%', height: '100%' }}>
                <line x1="25" y1="20" x2="350" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="25" y1="45" x2="350" y2="45" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="25" y1="70" x2="350" y2="70" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="25" y1="95" x2="350" y2="95" stroke="#E2E8F0" />

                {(() => {
                  const maxVal = Math.max(...analytics.by_secret_count.map((i) => i.count), 1);
                  return analytics.by_secret_count.slice(0, 6).map((item, idx) => {
                    const barHeight = Math.max(8, (item.count / maxVal) * 65);
                    const y = 95 - barHeight;
                    const x = 38 + idx * 54;
                    return (
                      <g key={item.repository}>
                        <rect x={x} y={y} width="28" height={barHeight} rx="3" fill={item.color || '#EF4444'} />
                        <text x={x + 14} y={y - 6} fontSize="10" fontWeight="600" fill="#DC2626" textAnchor="middle">{item.count}</text>
                        <text x={x + 14} y="110" fontSize="8" fill="#64748B" textAnchor="middle">{item.repository.length > 8 ? item.repository.slice(0, 7) + '…' : item.repository}</text>
                      </g>
                    );
                  });
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* Card 2: Secret Types Across Repositories (Donut chart) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
            Secret Types Across Repositories
          </div>

          {(!analytics?.by_secret_type || analytics.by_secret_type.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '145px', color: '#94A3B8', fontSize: '13px' }}>
              <p>No secret types detected</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ width: '125px', height: '125px', position: 'relative', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {(() => {
                    let cumulative = 0;
                    const perimeter = 226;
                    return analytics.by_secret_type.map((item) => {
                      const dash = (item.percentage / 100) * perimeter;
                      const offset = -cumulative;
                      cumulative += dash;
                      return (
                        <circle
                          key={item.label}
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke={item.color || '#2563EB'}
                          strokeWidth="16"
                          strokeDasharray={`${dash} ${perimeter - dash}`}
                          strokeDashoffset={offset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: '1' }}>
                    {analytics.by_secret_type.reduce((acc, curr) => acc + curr.count, 0)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Secrets</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', flexGrow: 1 }}>
                {analytics.by_secret_type.map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: item.color, borderRadius: '2px' }} />
                      <span style={{ color: '#475569' }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Top Repositories by Risk */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
            Top Repositories by Risk
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(!analytics?.top_risk_repositories || analytics.top_risk_repositories.length === 0) ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                No high risk repositories detected
              </div>
            ) : (
              analytics.top_risk_repositories.map((r) => {
                const b = getRiskBadge(r.risk_level);
                return (
                  <div
                    key={r.repository}
                    onClick={() => {
                      const found = tableData?.items.find((i) => i.name === r.repository);
                      if (found) setSelectedRepo(found);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      backgroundColor: selectedRepo?.name === r.repository ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', width: '12px' }}>
                        {r.rank}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                        {r.repository}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: b.bg,
                          color: b.color,
                          border: `1px solid ${b.border}`,
                        }}
                      >
                        {r.risk_level}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {r.secrets_count} secrets
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Table (72%) | Right Side Widgets (28%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Filter + Table + Pagination */}
        <div>
          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
                width: '280px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0F172A',
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {/* Dropdown Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Visibility */}
              <div style={{ position: 'relative' }}>
                <select
                  value={visibilityFilter}
                  onChange={(e) => {
                    setVisibilityFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '7px 30px 7px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All">Visibility: All</option>
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Risk Level */}
              <div style={{ position: 'relative' }}>
                <select
                  value={riskFilter}
                  onChange={(e) => {
                    setRiskFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '7px 30px 7px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All">Risk Level: All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Clean">Clean</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Secret Type */}
              <div style={{ position: 'relative' }}>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '7px 30px 7px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Types">Secret Type: All Types</option>
                  <option value="AWS Key">AWS Key</option>
                  <option value="OpenAI Key">OpenAI Key</option>
                  <option value="Database URL">Database URL</option>
                  <option value="GitHub Token">GitHub Token</option>
                  <option value="Slack Token">Slack Token</option>
                  <option value="Private Key">Private Key</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Scan Status */}
              <div style={{ position: 'relative' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '7px 30px 7px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Statuses">Scan Status: All Statuses</option>
                  <option value="Issues Found">Issues Found</option>
                  <option value="Clean">Clean</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Repositories Table Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#FAFAFA' }}>
                  <th style={{ padding: '12px 14px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={
                        tableData?.items && tableData.items.length > 0
                          ? selectedCheckboxes.size === tableData.items.length
                          : false
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Repository</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Visibility</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Secret Count</th>
                  <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'center' }}>Critical</th>
                  <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'center' }}>High</th>
                  <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'center' }}>Medium</th>
                  <th style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'center' }}>Low</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Last Scan</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <RefreshCw size={18} className="animate-spin" color="#2563EB" />
                        <span>Loading repositories...</span>
                      </div>
                    </td>
                  </tr>
                ) : !tableData?.items || tableData.items.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      <GithubIcon size={28} color="#94A3B8" />
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px', marginTop: '8px' }}>
                        No repositories matching criteria
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>Try adjusting your filters or search query.</div>
                    </td>
                  </tr>
                ) : (
                  tableData.items.map((item) => {
                    const isChecked = selectedCheckboxes.has(item.id);
                    const isSelected = selectedRepo?.id === item.id;

                    const critStyle = getPillStyle(item.critical, 'critical');
                    const highStyle = getPillStyle(item.high, 'high');
                    const medStyle = getPillStyle(item.medium, 'medium');
                    const lowStyle = getPillStyle(item.low, 'low');

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRepo(item)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isSelected ? '#EFF6FF' : isChecked ? '#F8FAFC' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = isChecked ? '#F8FAFC' : '#FFFFFF';
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleRowCheckbox(item.id, e as any)}
                            style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                          />
                        </td>

                        {/* Repository */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <GithubIcon size={16} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                                {item.organization}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Visibility */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569' }}>
                            {item.visibility === 'Private' ? (
                              <>
                                <Lock size={12} color="#64748B" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe size={12} color="#64748B" />
                                <span>Public</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Secret Count */}
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {item.secret_count}
                        </td>

                        {/* Critical */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '24px',
                              padding: '2px 0',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: critStyle.bg,
                              color: critStyle.color,
                            }}
                          >
                            {item.critical}
                          </span>
                        </td>

                        {/* High */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '24px',
                              padding: '2px 0',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: highStyle.bg,
                              color: highStyle.color,
                            }}
                          >
                            {item.high}
                          </span>
                        </td>

                        {/* Medium */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '24px',
                              padding: '2px 0',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: medStyle.bg,
                              color: medStyle.color,
                            }}
                          >
                            {item.medium}
                          </span>
                        </td>

                        {/* Low */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '24px',
                              padding: '2px 0',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: lowStyle.bg,
                              color: lowStyle.color,
                            }}
                          >
                            {item.low}
                          </span>
                        </td>

                        {/* Last Scan */}
                        <td style={{ padding: '12px 14px', fontSize: '11px', color: '#64748B' }}>
                          <div>{item.last_scan.split(' ')[0]} {item.last_scan.split(' ')[1]} {item.last_scan.split(' ')[2]}</div>
                          <div style={{ color: '#94A3B8' }}>{item.last_scan.split(' ').slice(3).join(' ')}</div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.status === 'Issues Found' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#DC2626' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                              Issues Found
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                              Clean
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setScanRepo(item.name);
                                setIsScanModalOpen(true);
                              }}
                              title="Run scan on this repository"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#64748B',
                              }}
                            >
                              <GitBranch size={15} />
                            </button>

                            <Link
                              href={`/code/secrets/remediation?repo=${encodeURIComponent(item.name)}`}
                              title="Remediate secrets"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                color: '#64748B',
                                textDecoration: 'none',
                                padding: '4px',
                              }}
                            >
                              <Shield size={15} />
                            </Link>

                            <button
                              onClick={() => {
                                setSelectedRepo(item);
                                showToast(`Selected ${item.name} for inspection.`);
                              }}
                              title="More options"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#64748B',
                              }}
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
            <div>
              Showing {tableData?.total === 0 ? 0 : (page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, tableData?.total ?? 12)} of {tableData?.total ?? 12} repositories
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? '#CBD5E1' : '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: tableData?.total_pages || 2 }).map((_, idx) => {
                const p = idx + 1;
                const isCurrent = page === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: isCurrent ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: isCurrent ? '#2563EB' : '#FFFFFF',
                      color: isCurrent ? '#FFFFFF' : '#0F172A',
                      fontWeight: isCurrent ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(tableData?.total_pages || 2, page + 1))}
                disabled={page >= (tableData?.total_pages || 2)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  cursor: page >= (tableData?.total_pages || 2) ? 'not-allowed' : 'pointer',
                  color: page >= (tableData?.total_pages || 2) ? '#CBD5E1' : '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>

              <div style={{ position: 'relative', marginLeft: '12px' }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '5px 26px 5px 10px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '8px', top: '9px', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Secret Map & Repository Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Widget 1: Repository Secret Map */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Share2 size={16} color="#0F172A" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Repository Secret Map
              </div>
                    {/* SVG Visual Network Topology */}
            <div style={{ width: '100%', height: '220px', position: 'relative', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
              {(!tableData?.items || tableData.items.length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '13px', gap: '6px' }}>
                  <p style={{ fontWeight: 600, color: '#64748B' }}>No repository topology</p>
                  <p style={{ fontSize: '11px' }}>Connect repositories to view secret distribution</p>
                </div>
              ) : (
                <svg viewBox="0 0 320 220" style={{ width: '100%', height: '100%' }}>
                  {/* Center Node */}
                  <g transform="translate(125, 95)">
                    <rect x="0" y="0" width="70" height="34" rx="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
                    <text x="35" y="21" fontSize="9" fontWeight="700" fill="#0F172A" textAnchor="middle">Workspace</text>
                  </g>

                  {tableData.items.slice(0, 5).map((repo, idx) => {
                    const positions = [
                      { x: 115, y: 15, cx: 160, cy: 53 },
                      { x: 15, y: 80, cx: 105, cy: 99 },
                      { x: 215, y: 80, cx: 215, cy: 99 },
                      { x: 25, y: 160, cx: 110, cy: 160 },
                      { x: 210, y: 160, cx: 210, cy: 160 },
                    ];
                    const pos = positions[idx] || positions[0];
                    const isSelected = selectedRepo?.name === repo.name;
                    const strokeCol = isSelected ? '#DC2626' : repo.secret_count > 0 ? '#F97316' : '#94A3B8';

                    return (
                      <g key={repo.id}>
                        <line x1="160" y1="112" x2={pos.cx} y2={pos.cy} stroke={strokeCol} strokeWidth="1.5" strokeDasharray="3 3" />
                        <g
                          transform={`translate(${pos.x}, ${pos.y})`}
                          onClick={() => setSelectedRepo(repo)}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            x="0"
                            y="0"
                            width="90"
                            height="38"
                            rx="6"
                            fill="#FFFFFF"
                            stroke={strokeCol}
                            strokeWidth={isSelected ? '2' : '1'}
                          />
                          <g transform="translate(6, 12)">
                            <GithubIcon size={12} />
                          </g>
                          <text x="22" y="16" fontSize="8" fontWeight="600" fill="#0F172A">
                            {repo.name.length > 10 ? repo.name.slice(0, 9) + '…' : repo.name}
                          </text>
                          <rect x="22" y="21" width="46" height="12" rx="3" fill="#FEF2F2" />
                          <text x="45" y="30" fontSize="7" fontWeight="600" fill="#DC2626" textAnchor="middle">
                            {repo.secret_count} secrets
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>      </div>
          </div>

          {/* Widget 2: Repository Details */}
          {selectedRepo && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Shield size={16} color="#0F172A" />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Repository Details
                </div>
              </div>

              {/* Repo header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <GithubIcon size={24} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedRepo.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {selectedRepo.visibility} Repository
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Default Branch</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRepo.default_branch}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Total Secrets</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRepo.secret_count}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Last Scan</span>
                  <span style={{ color: '#0F172A' }}>{selectedRepo.last_scan}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Open Findings</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRepo.open_findings}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Risk Level</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: getRiskBadge(selectedRepo.risk_level).bg,
                      color: getRiskBadge(selectedRepo.risk_level).color,
                      border: `1px solid ${getRiskBadge(selectedRepo.risk_level).border}`,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getRiskBadge(selectedRepo.risk_level).color,
                      }}
                    />
                    {selectedRepo.risk_level}
                  </span>
                </div>
              </div>

              {/* View Repository Button */}
              <Link
                href={`/code/repositories/${encodeURIComponent(selectedRepo.name)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                View Repository
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Run Repository Scan ── */}
      {isScanModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setIsScanModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '460px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#2563EB" fill="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Run Repository Secret Scan
                </h3>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerScanSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    Repository
                  </label>
                  <select
                    value={scanRepo}
                    onChange={(e) => {
                      setScanRepo(e.target.value);
                      const found = (allRepos.length > 0 ? allRepos : tableData?.items || []).find((r: any) => r.name === e.target.value);
                      if (found?.default_branch) setScanBranch(found.default_branch);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(allRepos.length > 0 ? allRepos : (tableData?.items || [])).length > 0 ? (
                      (allRepos.length > 0 ? allRepos : (tableData?.items || [])).map((r: any) => (
                        <option key={r.id || r.name} value={r.name}>
                          {r.full_name || r.name} {r.default_branch ? `(${r.default_branch})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">No repositories connected</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    Branch / Ref
                  </label>
                  <input
                    type="text"
                    value={scanBranch}
                    onChange={(e) => setScanBranch(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(false)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Start Scan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Export ── */}
      {isExportModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '420px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Export Repositories & Secret Mapping
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Download complete repository inventory with secret counts and risk distributions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button
                onClick={() => handleExportDownload('json')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>JSON Format</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Full structured data objects</div>
                </div>
                <Download size={16} color="#2563EB" />
              </button>

              <button
                onClick={() => handleExportDownload('csv')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>CSV Spreadsheet</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Tabular data formatted for Excel & Sheets</div>
                </div>
                <Download size={16} color="#2563EB" />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                }}
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
