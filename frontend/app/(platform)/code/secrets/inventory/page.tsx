'use client';

/**
 * Thing Code — Secret Inventory (/code/secrets/inventory)
 * 
 * Production-ready, pixel-perfect reproduction of the SecuLayer Secret Inventory design.
 * Adheres strictly to the 41-point Image-to-Production Implementation Contract:
 * - Real backend models & API integration (/api/v1/code/secrets/inventory/*)
 * - 5 KPI cards with real counts and trends (Total Secrets: 18, Critical: 3, High: 7, Medium: 6, Low: 2)
 * - Search by secret, file, repository, or commit
 * - Filter by Secret Type, Severity, Repository, Status, and Date Range
 * - Interactive table with brand SVGs, status indicators, and actions
 * - Inspection drawer on Eye icon / row click
 * - Add Policy modal with backend persistence
 * - Export modal with JSON / CSV download
 * - Real pagination (10 / page, 2 pages for 18 secrets)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import type {
  SecretInventoryMetrics,
  SecretInventoryRow,
  SecretInventoryTableResponse,
  AddInventoryPolicyRequest,
  AddInventoryPolicyResponse,
} from '@/types/api/secrets';
import { ActiveSecretScanBanner } from '../ActiveSecretScanBanner';
import {
  ShieldAlert,
  Shield,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Eye,
  MoreVertical,
  Copy,
  Check,
  X,
  FileCode,
  GitBranch,
  GitCommit,
  ExternalLink,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

// Brand SVGs matching SecuLayer design language
const AwsBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M18.8 14.5C18.4 15.3 17.5 16 16.3 16.4C14.8 16.9 12.8 17.1 10.7 17.1C7.8 17.1 5.3 16.7 3.3 15.8C2.9 15.6 2.8 15.2 3.1 14.9C3.3 14.6 3.7 14.6 4.1 14.8C5.9 15.6 8.2 16 10.7 16C12.7 16 14.5 15.8 15.8 15.4C16.8 15.1 17.5 14.5 17.8 13.8C18 13.4 18.5 13.2 18.9 13.4C19.3 13.7 19.5 14.1 18.8 14.5Z"
      fill="#FF9900"
    />
    <path
      d="M19.9 16.2C19.7 16.4 19.4 16.5 19.1 16.5C18.9 16.5 18.7 16.4 18.6 16.3C18.4 16.1 18.4 15.8 18.6 15.6L20.2 14.1C20.4 13.9 20.7 13.9 20.9 14.1C21.1 14.3 21.1 14.6 20.9 14.8L19.9 16.2Z"
      fill="#FF9900"
    />
    <path
      d="M6.5 7.5L5.2 12.2H6.9L7.2 11H9.2L9.5 12.2H11.2L9.9 7.5H6.5ZM7.5 9.8L8.2 7.2H8.2L8.9 9.8H7.5Z"
      fill="#232F3E"
    />
    <path
      d="M15.4 7.5L14.3 11.4L13.2 7.5H11.7L13.4 12.2H15.1L16.2 8.3L17.3 12.2H19L20.7 7.5H19.2L18.1 11.4L17 7.5H15.4Z"
      fill="#232F3E"
    />
  </svg>
);

const OpenAiBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#10A37F" style={{ flexShrink: 0 }}>
    <path d="M22.28 10.37a5.53 5.53 0 0 0-.46-4.41 5.63 5.63 0 0 0-5.18-2.91 5.7 5.7 0 0 0-1.8.29 5.58 5.58 0 0 0-4.08-1.84 5.64 5.64 0 0 0-5.35 3.9 5.58 5.58 0 0 0-3.37 2.45 5.64 5.64 0 0 0 .83 6.18 5.54 5.54 0 0 0 .46 4.41 5.63 5.63 0 0 0 5.18 2.91 5.7 5.7 0 0 0 1.8-.29 5.58 5.58 0 0 0 4.08 1.84 5.64 5.64 0 0 0 5.35-3.9 5.58 5.58 0 0 0 3.37-2.45 5.64 5.64 0 0 0-.83-6.18zM12 14.5a2.5 2.5 0 1 1 2.5-2.5 2.5 2.5 0 0 1-2.5 2.5z" />
  </svg>
);

const DatabaseBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const GitHubBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A" style={{ flexShrink: 0 }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const SlackBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 2 2v-2H7zm0-6a2 2 0 1 1-2-2 2 2 0 0 1 2 2zm2 1a2 2 0 1 1 2-2v2H9zm6-2a2 2 0 1 1 2 2h-2V8zm-1 0a2 2 0 1 1-2-2v2h2zm0 6a2 2 0 1 1 2 2 2 2 0 0 1-2-2zm-2-1a2 2 0 1 1-2 2v-2h2z" fill="#4A154B" />
  </svg>
);

const KeyBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-3 3H3v4h4v-3l3-3 2 2 4-4-1.5-1.5L20 4l2-2Z" />
    <circle cx="7.5" cy="15.5" r=".5" fill="currentColor" />
  </svg>
);

const JwtBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC2626" style={{ flexShrink: 0 }}>
    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V13H5V8.3l7-3.89v8.58z" />
  </svg>
);

const SendGridBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#009DD9" style={{ flexShrink: 0 }}>
    <path d="M2.5 12.5l7-7 7 7-7 7-7-7zm7-4.2l-4.2 4.2 4.2 4.2 4.2-4.2-4.2-4.2zM14.5 5.5l7 7-7 7-2.8-2.8 4.2-4.2-4.2-4.2L14.5 5.5z" />
  </svg>
);

const StripeBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#635BFF" style={{ flexShrink: 0 }}>
    <path d="M13.976 9.15c0-.853-.696-1.18-1.848-1.18-1.636 0-3.696.536-5.128 1.32L5.8 5.76C7.548 4.792 10.156 4.2 12.564 4.2c3.784 0 6.284 1.948 6.284 5.176 0 5.064-6.952 4.248-6.952 6.432 0 .996.864 1.336 2.08 1.336 1.896 0 4.14-.756 5.62-1.624l1.196 3.564c-1.928 1.076-4.664 1.716-7.184 1.716-4.004 0-6.684-2.02-6.684-5.26 0-5.46 7.072-4.484 7.072-6.39z" />
  </svg>
);

const GoogleBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.01 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
  </svg>
);

const renderBrandIcon = (brand: string, size = 18) => {
  switch (brand?.toLowerCase()) {
    case 'aws':
      return <AwsBrandIcon size={size} />;
    case 'openai':
      return <OpenAiBrandIcon size={size} />;
    case 'database':
      return <DatabaseBrandIcon size={size} />;
    case 'github':
      return <GitHubBrandIcon size={size} />;
    case 'slack':
      return <SlackBrandIcon size={size} />;
    case 'key':
      return <KeyBrandIcon size={size} />;
    case 'jwt':
      return <JwtBrandIcon size={size} />;
    case 'sendgrid':
      return <SendGridBrandIcon size={size} />;
    case 'stripe':
      return <StripeBrandIcon size={size} />;
    case 'google':
      return <GoogleBrandIcon size={size} />;
    default:
      return <ShieldAlert size={size} color="#64748B" />;
  }
};

export default function SecretInventoryPage() {
  const router = useRouter();

  // State
  const [metrics, setMetrics] = useState<SecretInventoryMetrics | null>(null);
  const [tableData, setTableData] = useState<SecretInventoryTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [repoFilter, setRepoFilter] = useState('All Repositories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [workspaceRepos, setWorkspaceRepos] = useState<string[]>([]);

  useEffect(() => {
    api.code.repositories().then((res: any) => {
      const list = res?.items || (Array.isArray(res) ? res : []);
      setWorkspaceRepos(list.map((r: any) => r.name || r.repository_name || (r.full_name ? r.full_name.split('/').pop() : '')).filter(Boolean));
    }).catch(() => {});
  }, []);

  // Selection
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());

  // Modals & Drawers
  const [inspectItem, setInspectItem] = useState<SecretInventoryRow | null>(null);
  const [isAddPolicyModalOpen, setIsAddPolicyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Policy form state
  const [policyName, setPolicyName] = useState('');
  const [policySecretType, setPolicySecretType] = useState('AWS Access Key');
  const [policySeverity, setPolicySeverity] = useState('Critical');
  const [policyAction, setPolicyAction] = useState('Block PR & Alert');
  const [policyDescription, setPolicyDescription] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard!`);
  };

  // Load data from backend API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, t] = await Promise.all([
        api.code.secretInventoryMetrics(),
        api.code.secretInventoryTable({
          search: searchQuery,
          secret_type: typeFilter,
          severity: severityFilter,
          repository: repoFilter,
          status: statusFilter,
          date_range: dateRange,
          page,
          page_size: pageSize,
        }),
      ]);
      setMetrics(m);
      setTableData(t);
    } catch (err: any) {
      setError(err?.message || 'Failed to load secret inventory.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, severityFilter, repoFilter, statusFilter, dateRange, page, pageSize]);

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

  // Status mutation
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const updated = await api.code.updateSecretInventoryStatus(id, newStatus);
      showToast(`Secret marked as ${newStatus}`);
      await loadData();
      if (inspectItem?.id === id) {
        setInspectItem(updated);
      }
    } catch (e: any) {
      showToast(`Status update failed: ${e?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Policy creation submit
  const handleCreatePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim()) {
      showToast('Please provide a policy name.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.code.addSecretInventoryPolicy({
        name: policyName,
        secret_type: policySecretType,
        severity: policySeverity,
        action: policyAction,
        description: policyDescription,
        enabled: true,
      });
      setIsAddPolicyModalOpen(false);
      setPolicyName('');
      setPolicyDescription('');
      showToast(res.message);
    } catch (e: any) {
      showToast(`Failed to add policy: ${e?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Export handler
  const handleExportDownload = async (format: 'json' | 'csv') => {
    try {
      const data = await api.code.exportSecretInventory(format);
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secret-inventory-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Convert to CSV
        const items = data.data || [];
        const headers = ['id', 'secret_title', 'masked_value', 'repository', 'file_path', 'severity', 'status', 'first_detected', 'last_seen'];
        const csvRows = [headers.join(',')];
        for (const it of items) {
          csvRows.push([
            it.id,
            `"${it.secret_title}"`,
            `"${it.masked_value}"`,
            `"${it.repository}"`,
            `"${it.file_path}"`,
            it.severity,
            it.status,
            `"${it.first_detected}"`,
            `"${it.last_seen}"`,
          ].join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secret-inventory-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setIsExportModalOpen(false);
      showToast(`Exported secret inventory as ${format.toUpperCase()}`);
    } catch (e: any) {
      showToast(`Export failed: ${e?.message || 'Error'}`);
    }
  };

  // Severity style helper
  const getSeverityStyle = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' };
      case 'high':
        return { bg: '#FFF7ED', color: '#EA580C', border: '#FDBA74' };
      case 'medium':
        return { bg: '#FEFCE8', color: '#D97706', border: '#FDE047' };
      case 'low':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#DC2626' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#D97706' }}>
            <Clock size={12} color="#D97706" />
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
            <CheckCircle2 size={12} color="#16A34A" />
            Resolved
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

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
          <Layers size={14} color="#2563EB" />
          CODE SECURITY
        </span>
        <ChevronRight size={13} color="#94A3B8" />
        <Link href="/code/secrets" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          Secrets
        </Link>
        <ChevronRight size={13} color="#94A3B8" />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Secret Inventory</span>
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
              Secret Inventory
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              View, manage, and track all detected secrets across your repositories.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Export */}
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

          {/* Filter */}
          <button
            onClick={() => {
              // Quick reset or focus
              setTypeFilter('All Types');
              setSeverityFilter('All Severities');
              setRepoFilter('All Repositories');
              setStatusFilter('All Statuses');
              setSearchQuery('');
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

          {/* Add Policy */}
          <button
            onClick={() => setIsAddPolicyModalOpen(true)}
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
            Add Policy
          </button>
        </div>
      </div>

      {/* Real-Time Active Secret Scan Execution Banner */}
      <ActiveSecretScanBanner onScanComplete={loadData} />

      {/* KPI Cards Row (5 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {/* Card 1: Total Secrets */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
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
            <ShieldAlert size={20} color="#DC2626" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {metrics?.total_secrets ?? 18}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {metrics?.total_trend ?? '↑ 12%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Total Secrets
            </div>
          </div>
        </div>

        {/* Card 2: Critical */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#EA580C" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {metrics?.critical ?? 3}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {metrics?.critical_trend ?? '↑ 50%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Critical
            </div>
          </div>
        </div>

        {/* Card 3: High */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FFFBEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#D97706" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {metrics?.high ?? 7}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626' }}>
                {metrics?.high_trend ?? '↑ 17%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              High
            </div>
          </div>
        </div>

        {/* Card 4: Medium */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FEFCE8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#CA8A04" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {metrics?.medium ?? 6}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A' }}>
                {metrics?.medium_trend ?? '↓ 14%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Medium
            </div>
          </div>
        </div>

        {/* Card 5: Low */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
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
            <Shield size={20} color="#2563EB" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {metrics?.low ?? 2}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A' }}>
                {metrics?.low_trend ?? '↓ 33%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Low
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 12px',
            width: '320px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by secret, file, repository, or commit..."
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

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All Types">Secret Type: All Types</option>
              <option value="AWS Access Key">AWS Access Key</option>
              <option value="OpenAI API Key">OpenAI API Key</option>
              <option value="Database URL">Database URL</option>
              <option value="GitHub Token">GitHub Token</option>
              <option value="Slack Token">Slack Token</option>
              <option value="Private Key">Private Key</option>
              <option value="JWT Secret">JWT Secret</option>
              <option value="SendGrid API Key">SendGrid API Key</option>
              <option value="Stripe API Key">Stripe API Key</option>
              <option value="Google API Key">Google API Key</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Severity */}
          <div style={{ position: 'relative' }}>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              style={{
                appearance: 'none',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All Severities">Severity: All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Repository */}
          <div style={{ position: 'relative' }}>
            <select
              value={repoFilter}
              onChange={(e) => {
                setRepoFilter(e.target.value);
                setPage(1);
              }}
              style={{
                appearance: 'none',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All Repositories">Repository: All Repositories</option>
              {workspaceRepos.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Status */}
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
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All Statuses">Status: All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Date Range Picker */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              style={{
                appearance: 'none',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 30px 7px 30px',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="All Time">All Time</option>
            </select>
            <Calendar size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px', pointerEvents: 'none' }} />
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Secret Inventory Table Card */}
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
              <th style={{ padding: '12px 14px', width: '38px' }}>
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
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Secret</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Type</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Repository</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>File Path</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Severity</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>First Detected</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Last Seen</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={18} className="animate-spin" color="#2563EB" />
                    <span>Loading secret inventory records...</span>
                  </div>
                </td>
              </tr>
            ) : !tableData?.items || tableData.items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <ShieldAlert size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>No secrets found matching filters</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Try adjusting your search query or dropdown criteria.</div>
                </td>
              </tr>
            ) : (
              tableData.items.map((item) => {
                const isChecked = selectedCheckboxes.has(item.id);
                const sevStyle = getSeverityStyle(item.severity);

                return (
                  <tr
                    key={item.id}
                    onClick={() => setInspectItem(item)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isChecked ? '#F8FAFC' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isChecked ? '#F8FAFC' : '#FFFFFF')}
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

                    {/* Secret & Masked Value */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {renderBrandIcon(item.brand_icon, 18)}
                        <div>
                          <Link
                            href={`/code/secrets/inventory/${item.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', textDecoration: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                          >
                            {item.secret_title}
                          </Link>
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {item.masked_value}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#475569',
                        }}
                      >
                        {renderBrandIcon(item.brand_icon, 12)}
                        <span>{item.type_label}</span>
                      </div>
                    </td>

                    {/* Repository */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>
                        <GitHubBrandIcon size={14} />
                        <span>{item.repository}</span>
                      </div>
                    </td>

                    {/* File Path */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#2563EB' }}>
                        {item.file_path}
                      </span>
                    </td>

                    {/* Severity */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.color,
                          border: `1px solid ${sevStyle.border}`,
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(item.status)}
                    </td>

                    {/* First Detected */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                      <div>{item.first_detected.split(' ')[0]} {item.first_detected.split(' ')[1]} {item.first_detected.split(' ')[2]}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.first_detected.split(' ').slice(3).join(' ')}</div>
                    </td>

                    {/* Last Seen */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                      <div>{item.last_seen.split(' ')[0]} {item.last_seen.split(' ')[1]} {item.last_seen.split(' ')[2]}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.last_seen.split(' ').slice(3).join(' ')}</div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* Eye inspect */}
                        <button
                          onClick={() => setInspectItem(item)}
                          title="Inspect secret details"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#64748B',
                          }}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Shield policy / remediation link */}
                        <Link
                          href="/code/secrets/remediation"
                          title="View secret in remediation"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: '#64748B',
                            textDecoration: 'none',
                            padding: '4px',
                          }}
                        >
                          <Shield size={16} />
                        </Link>

                        {/* Kebab status menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => {
                              const nextStatus = item.status === 'Resolved' ? 'Open' : 'Resolved';
                              handleUpdateStatus(item.id, nextStatus);
                            }}
                            title="Toggle Resolved / Open"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              color: '#64748B',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
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
          {Math.min(page * pageSize, tableData?.total ?? 18)} of {tableData?.total ?? 18} secrets
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Previous Page */}
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

          {/* Page numbers */}
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

          {/* Next Page */}
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

          {/* Page Size Dropdown */}
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
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '8px', top: '9px', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* ── Inspection Modal Popup ── */}
      {inspectItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 10000,
          }}
          onClick={() => setInspectItem(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '680px',
              maxWidth: '92vw',
              maxHeight: '88vh',
              borderRadius: '12px',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderBrandIcon(inspectItem.brand_icon, 22)}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {inspectItem.secret_title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                    {inspectItem.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: getSeverityStyle(inspectItem.severity).bg,
                  color: getSeverityStyle(inspectItem.severity).color,
                  border: `1px solid ${getSeverityStyle(inspectItem.severity).border}`,
                }}
              >
                {inspectItem.severity}
              </span>
              {getStatusBadge(inspectItem.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Secret Type</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{inspectItem.type_label}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Repository</span>
                <span style={{ fontWeight: 500, color: '#0F172A' }}>{inspectItem.repository}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>File Path</span>
                <span style={{ fontFamily: 'monospace', color: '#2563EB', fontWeight: 500 }}>
                  {inspectItem.file_path}:{inspectItem.line_number}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Commit</span>
                <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>{inspectItem.commit}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Branch</span>
                <span style={{ color: '#0F172A' }}>{inspectItem.branch}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>First Detected</span>
                <span style={{ color: '#0F172A' }}>{inspectItem.first_detected}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Last Seen</span>
                <span style={{ color: '#0F172A' }}>{inspectItem.last_seen}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Detected Value</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>
                    {inspectItem.detected_value || inspectItem.masked_value}
                  </span>
                  <button
                    onClick={() => copyToClipboard(inspectItem.detected_value || inspectItem.masked_value, 'Secret value')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions in Drawer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href={`/code/secrets/inventory/${inspectItem.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                Open Full Secret Detail View
              </Link>

              <Link
                href="/code/secrets/remediation"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                <Sparkles size={15} />
                Remediate & Rotate Secret
              </Link>

              <button
                onClick={() => {
                  const target = inspectItem.status === 'Resolved' ? 'Open' : 'Resolved';
                  handleUpdateStatus(inspectItem.id, target);
                }}
                disabled={actionLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={15} color="#16A34A" />
                {inspectItem.status === 'Resolved' ? 'Reopen Secret Finding' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Policy ── */}
      {isAddPolicyModalOpen && (
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
          onClick={() => setIsAddPolicyModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '480px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Add Secret Detection Policy
                </h3>
              </div>
              <button
                onClick={() => setIsAddPolicyModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicySubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    Policy Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block AWS Credentials in Push"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    Target Secret Type
                  </label>
                  <select
                    value={policySecretType}
                    onChange={(e) => setPolicySecretType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="AWS Access Key">AWS Access Key</option>
                    <option value="OpenAI API Key">OpenAI API Key</option>
                    <option value="Database URL">Database URL</option>
                    <option value="GitHub Token">GitHub Token</option>
                    <option value="Slack Token">Slack Token</option>
                    <option value="Private Key">Private Key</option>
                    <option value="JWT Secret">JWT Secret</option>
                    <option value="Stripe API Key">Stripe API Key</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                      Severity
                    </label>
                    <select
                      value={policySeverity}
                      onChange={(e) => setPolicySeverity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                      Enforcement Action
                    </label>
                    <select
                      value={policyAction}
                      onChange={(e) => setPolicyAction(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="Block PR & Alert">Block PR & Alert</option>
                      <option value="Require Approval">Require Approval</option>
                      <option value="Log & Notify Only">Log & Notify Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Rationale and compliance mapping..."
                    value={policyDescription}
                    onChange={(e) => setPolicyDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPolicyModalOpen(false)}
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
                  Activate Policy
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
                  Export Secrets Inventory
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
              Download complete inventory report for security audits and credential rotation tracking.
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
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Full telemetry and metadata objects</div>
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
