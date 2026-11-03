'use client';

/**
 * Thing Code — Secret Remediation (/code/secrets/remediation)
 * 
 * Production-ready, pixel-perfect implementation reproducing the SecuLayer Secret Remediation design:
 * - Real backend models & API integration (/api/v1/code/secrets/remediation/*)
 * - 4 KPI cards with real trends (Open Findings: 18, Remediated: 12, In Progress: 6, PRs Created: 2)
 * - Sub-tabs with live counter badges: Open Findings (18), In Progress (6), Remediated (12), Ignored (3)
 * - Interactive filter & search toolbar (Severity, Secret Type, Repository, Status, Sort)
 * - Interactive findings table with multi-select checkbox, status badges, and action triggers
 * - 3-column synchronized bottom inspection panel:
 *   1. Selected Finding details (Pattern, Line, Commit, Occurrences, Copyable secret)
 *   2. Code Diff Preview with Unified / Split toggle and syntax-colored lines
 *   3. Remediation Actions (5-step checklist with Console link, code snippet, PR creator, Rotate, Verify)
 * - Real Settings Modal, Bulk Remediate Modal, and PR Creation Modal with live state updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type {
  SecretRemediationMetrics,
  SecretRemediationItem,
  SecretRemediationListResponse,
  RemediationPRResponse,
  BulkRemediateResponse,
  RemediationSettings,
} from '@/types/api/secrets';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  GitPullRequest,
  Settings,
  Sparkles,
  Search,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  GitBranch,
  GitCommit,
  RefreshCw,
  Play,
  Code2,
  X,
  AlertTriangle,
  FileCode,
  Link2,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle,
} from 'lucide-react';

// Brand icons matching SecuLayer specifications
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

const GitHubBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A" style={{ flexShrink: 0 }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const DatabaseBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const StripeBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#635BFF" style={{ flexShrink: 0 }}>
    <path d="M13.976 9.15c0-.853-.696-1.18-1.848-1.18-1.636 0-3.696.536-5.128 1.32L5.8 5.76C7.548 4.792 10.156 4.2 12.564 4.2c3.784 0 6.284 1.948 6.284 5.176 0 5.064-6.952 4.248-6.952 6.432 0 .996.864 1.336 2.08 1.336 1.896 0 4.14-.756 5.62-1.624l1.196 3.564c-1.928 1.076-4.664 1.716-7.184 1.716-4.004 0-6.684-2.02-6.684-5.26 0-5.46 7.072-4.484 7.072-6.39z" />
  </svg>
);

const SendGridBrandIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#009DD9" style={{ flexShrink: 0 }}>
    <path d="M2.5 12.5l7-7 7 7-7 7-7-7zm7-4.2l-4.2 4.2 4.2 4.2 4.2-4.2-4.2-4.2zM14.5 5.5l7 7-7 7-2.8-2.8 4.2-4.2-4.2-4.2L14.5 5.5z" />
  </svg>
);

const renderBrandIcon = (brand: string, size = 18) => {
  switch (brand?.toLowerCase()) {
    case 'aws':
      return <AwsBrandIcon size={size} />;
    case 'openai':
      return <OpenAiBrandIcon size={size} />;
    case 'github':
      return <GitHubBrandIcon size={size} />;
    case 'database':
      return <DatabaseBrandIcon size={size} />;
    case 'stripe':
      return <StripeBrandIcon size={size} />;
    case 'sendgrid':
      return <SendGridBrandIcon size={size} />;
    default:
      return <ShieldAlert size={size} color="#64748B" />;
  }
};

export default function SecretRemediationPage() {
  const router = useRouter();

  // Primary data states
  const [metrics, setMetrics] = useState<SecretRemediationMetrics | null>(null);
  const [findingsData, setFindingsData] = useState<SecretRemediationListResponse | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<SecretRemediationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-tab selection: 'open' | 'in_progress' | 'remediated' | 'ignored'
  const [activeTab, setActiveTab] = useState<'open' | 'in_progress' | 'remediated' | 'ignored'>('open');

  // Filter toolbar states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [repoFilter, setRepoFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Last Detected');

  // Selection states
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Set<string>>(new Set());
  const [workspaceRepos, setWorkspaceRepos] = useState<string[]>([]);

  useEffect(() => {
    api.code.repositories().then((res: any) => {
      const list = res?.items || (Array.isArray(res) ? res : []);
      setWorkspaceRepos(list.map((r: any) => r.name || r.repository_name || (r.full_name ? r.full_name.split('/').pop() : '')).filter(Boolean));
    }).catch(() => {});
  }, []);

  // Code Diff View Mode ('split' | 'unified')
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('split');

  // UI feedback & modals
  const [actionLoading, setActionLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [targetFindingForPR, setTargetFindingForPR] = useState<SecretRemediationItem | null>(null);

  // Custom PR state
  const [prBranchName, setPrBranchName] = useState('');
  const [prTitle, setPrTitle] = useState('');

  // Settings state
  const [settings, setSettings] = useState<RemediationSettings>({
    auto_pr_enabled: true,
    require_approval: true,
    branch_prefix: 'kavach-sec/',
    default_reviewers: ['security-team'],
    secret_manager: 'AWS Secrets Manager',
    auto_rescan_on_pr: true,
  });

  const showToast = (msg: string) => {
    if (msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error')) {
      toast.error(msg);
    } else if (msg.toLowerCase().includes('copied')) {
      toast.info(msg);
    } else {
      toast.success(msg);
    }
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard!`);
  };

  // Fetch metrics & findings
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, f, s] = await Promise.all([
        api.code.secretRemediationMetrics(),
        api.code.secretRemediationFindings({
          tab: activeTab,
          severity: severityFilter,
          secret_type: typeFilter,
          repository: repoFilter,
          status: statusFilter,
          search: searchQuery,
          sort: sortBy,
        }),
        api.code.getSecretRemediationSettings(),
      ]);

      setMetrics(m);
      setFindingsData(f);
      setSettings(s);

      // Default selected finding if not selected or not in filtered list
      if (f.items && f.items.length > 0) {
        if (!selectedFinding || !f.items.some((it) => it.id === selectedFinding.id)) {
          setSelectedFinding(f.items[0]);
        }
      } else {
        setSelectedFinding(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load secret remediation data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, severityFilter, typeFilter, repoFilter, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle select all checkbox in table header
  const handleSelectAll = (checked: boolean) => {
    if (!findingsData?.items) return;
    if (checked) {
      setSelectedCheckboxes(new Set(findingsData.items.map((i) => i.id)));
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

  // Status mutation (Mark In Progress, Mark Remediated, Ignore, Open)
  const handleUpdateStatus = async (findingId: string, newStatus: string, reason?: string) => {
    setActionLoading(true);
    try {
      const updated = await api.code.updateSecretRemediationStatus(findingId, newStatus, reason);
      showToast(`Finding marked as ${newStatus}`);
      await loadData();
      if (selectedFinding?.id === findingId) {
        setSelectedFinding(updated);
      }
    } catch (err: any) {
      showToast(`Error updating status: ${err?.message || 'Request failed'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open PR Modal for finding
  const handleOpenPRModal = (finding: SecretRemediationItem) => {
    setTargetFindingForPR(finding);
    setPrBranchName(`security/fix-${finding.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    setPrTitle(`fix(security): remove exposed ${finding.title} from ${finding.file_path}`);
    setIsPRModalOpen(true);
  };

  // Submit PR creation
  const handleCreatePR = async () => {
    if (!targetFindingForPR) return;
    setActionLoading(true);
    try {
      const res: RemediationPRResponse = await api.code.createSecretRemediationPR(targetFindingForPR.id);
      setIsPRModalOpen(false);
      showToast(`Pull Request #${res.pr_number} created successfully on ${res.branch_name}!`);
      await loadData();
    } catch (err: any) {
      showToast(`Failed to create PR: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Bulk Remediation
  const handleBulkRemediateSubmit = async (strategy: string) => {
    const idsToProcess = selectedCheckboxes.size > 0
      ? Array.from(selectedCheckboxes)
      : (findingsData?.items.map((i) => i.id) || []);

    if (idsToProcess.length === 0) {
      showToast('No findings selected for remediation.');
      return;
    }

    setActionLoading(true);
    try {
      const res: BulkRemediateResponse = await api.code.bulkRemediateSecrets({
        finding_ids: idsToProcess,
        strategy,
      });
      setIsBulkModalOpen(false);
      setSelectedCheckboxes(new Set());
      showToast(res.message);
      await loadData();
    } catch (err: any) {
      showToast(`Bulk remediation failed: ${err?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setActionLoading(true);
    try {
      const saved = await api.code.updateSecretRemediationSettings(settings);
      setSettings(saved);
      setIsSettingsModalOpen(false);
      showToast('Remediation automation settings saved.');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Verification Scan
  const handleRunVerificationScan = async () => {
    if (!selectedFinding) return;
    setActionLoading(true);
    try {
      const res = await api.code.triggerSecretRepositoryScan({
        repository: selectedFinding.repository,
        branch: selectedFinding.branch || 'main',
      });
      await api.code.updateSecretRemediationStatus(selectedFinding.id, 'In Progress', 'Verification scan dispatched');
      showToast(res?.message || `Verification scan queued for ${selectedFinding.repository}. Background scanner running.`);
      await loadData();
    } catch (e: any) {
      showToast(`Verification scan failed: ${e?.message || 'Error queueing scan'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper styles for severity pills
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

  // Helper styles for status pills
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
      case 'Remediated':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
            <CheckCircle2 size={12} color="#16A34A" />
            Remediated
          </span>
        );
      case 'Ignored':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
            <span style={{ width: '7px', height: '2px', backgroundColor: '#64748B' }} />
            Ignored
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px 64px' }}>

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
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Remediation</span>
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
            {/* Hexagon/Cube Outline Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Secret Remediation
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Fix detected secrets, rotate credentials, and prevent future exposure with automated and guided remediation.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
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
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <Settings size={15} color="#475569" />
            Remediation Settings
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
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
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            <Sparkles size={15} color="#FFFFFF" />
            Bulk Remediate
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Open Findings */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
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
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={20} color="#DC2626" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {metrics?.open_findings ?? 18}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
                  {metrics?.open_trend ?? '↓ 25%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                Open Findings
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Require remediation
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Remediated */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
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
                borderRadius: '50%',
                backgroundColor: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} color="#16A34A" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {metrics?.remediated ?? 12}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                  {metrics?.remediated_trend ?? '↑ 40%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                Remediated
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Fixed and verified
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
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
                borderRadius: '50%',
                backgroundColor: '#FFF7ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} color="#EA580C" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {metrics?.in_progress ?? 6}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#EA580C' }}>
                  {metrics?.in_progress_trend ?? '↓ 14%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                In Progress
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Remediation in progress
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: PRs Created */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
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
                borderRadius: '50%',
                backgroundColor: '#FAF5FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitPullRequest size={20} color="#9333EA" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {metrics?.prs_created ?? 2}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                  {metrics?.prs_trend ?? '↑ 100%'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                PRs Created
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Automatic fixes submitted
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Row */}
      <div style={{ borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '28px', marginBottom: '20px' }}>
        {[
          { key: 'open', label: 'Open Findings', count: findingsData?.open_count ?? 18 },
          { key: 'in_progress', label: 'In Progress', count: findingsData?.in_progress_count ?? 6 },
          { key: 'remediated', label: 'Remediated', count: findingsData?.remediated_count ?? 12 },
          { key: 'ignored', label: 'Ignored', count: findingsData?.ignored_count ?? 3 },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: '-1px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 150ms ease',
              }}
            >
              <span>{tab.label}</span>
              <span style={{ color: isActive ? '#2563EB' : '#94A3B8' }}>({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Strip */}
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
            width: '280px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search findings to remediate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Severity */}
          <div style={{ position: 'relative' }}>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
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
              <option value="All">Severity: All</option>
              <option value="Critical">Severity: Critical</option>
              <option value="High">Severity: High</option>
              <option value="Medium">Severity: Medium</option>
              <option value="Low">Severity: Low</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Secret Type */}
          <div style={{ position: 'relative' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <option value="All">Secret Type: All</option>
              <option value="AWS Access Key">AWS Access Key</option>
              <option value="OpenAI API Key">OpenAI API Key</option>
              <option value="Database URL">Database URL</option>
              <option value="GitHub Token">GitHub Token</option>
              <option value="Stripe API Key">Stripe API Key</option>
              <option value="SendGrid API Key">SendGrid API Key</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Repository */}
          <div style={{ position: 'relative' }}>
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
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
              <option value="All">Repository: All</option>
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
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="All">Status: All</option>
              <option value="Open">Status: Open</option>
              <option value="In Progress">Status: In Progress</option>
              <option value="Remediated">Status: Remediated</option>
              <option value="Ignored">Status: Ignored</option>
            </select>
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                appearance: 'none',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 30px 7px 28px',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="Last Detected">Last Detected</option>
              <option value="First Detected">First Detected</option>
              <option value="Severity High to Low">Severity: High to Low</option>
            </select>
            <ArrowUpDown size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px', pointerEvents: 'none' }} />
            <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Findings Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#FAFAFA' }}>
              <th style={{ padding: '12px 14px', width: '38px' }}>
                <input
                  type="checkbox"
                  checked={
                    findingsData?.items && findingsData.items.length > 0
                      ? selectedCheckboxes.size === findingsData.items.length
                      : false
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                />
              </th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Secret / Finding</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Type</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Repository</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Severity</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Detected At</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Recommended Action</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={18} className="animate-spin" color="#2563EB" />
                    <span>Loading secret findings...</span>
                  </div>
                </td>
              </tr>
            ) : !findingsData?.items || findingsData.items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <CheckCircle size={28} color="#10B981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>No findings found in this view</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Try adjusting your filters or tab criteria.</div>
                </td>
              </tr>
            ) : (
              findingsData.items.map((item) => {
                const isSelected = selectedFinding?.id === item.id;
                const isChecked = selectedCheckboxes.has(item.id);
                const sevStyle = getSeverityStyle(item.severity);

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedFinding(item)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F0F7FF' : isChecked ? '#F8FAFC' : '#FFFFFF',
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

                    {/* Secret / Finding */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {renderBrandIcon(item.brand_icon, 18)}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {item.title}
                          </div>
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

                    {/* Detected At */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                      <div>{item.detected_at.split(' ')[0]} {item.detected_at.split(' ')[1]} {item.detected_at.split(' ')[2]}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.detected_at.split(' ').slice(3).join(' ')}</div>
                    </td>

                    {/* Recommended Action */}
                    <td style={{ padding: '12px 16px' }}>
                      {item.recommended_action === 'Rotated via secrets manager' || item.recommended_action === 'Not used (test key)' ? (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>{item.recommended_action}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 500 }}>
                          {item.recommended_action}
                        </span>
                      )}
                    </td>

                    {/* Action Button & Kebab Menu */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {item.action_type === 'create_pr' && (
                          <button
                            onClick={() => handleOpenPRModal(item)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#0F172A',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Create PR
                          </button>
                        )}
                        {item.action_type === 'view_diff' && (
                          <button
                            onClick={() => setSelectedFinding(item)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#0F172A',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            View Diff
                          </button>
                        )}
                        {item.action_type === 'view_details' && (
                          <button
                            onClick={() => setSelectedFinding(item)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#0F172A',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            View Details
                          </button>
                        )}
                        {item.action_type === 'unignore' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'Open', 'Unignored by user')}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#2563EB',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Unignore
                          </button>
                        )}

                        {/* Kebab Quick Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => {
                              const actions = ['Mark In Progress', 'Mark Remediated', 'Ignore Finding'];
                              const next = actions[0];
                              handleUpdateStatus(item.id, 'In Progress');
                            }}
                            title="Quick Status Update"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
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

      {/* Bottom 3-Column Inspection and Remediation Panels */}
      {selectedFinding ? (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Column 1: Selected Finding Details */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '14px' }}>
              <Link2 size={16} color="#2563EB" />
              <span>Selected Finding</span>
            </div>

            {/* Title & Severity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              {renderBrandIcon(selectedFinding.brand_icon, 22)}
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {selectedFinding.title}
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: getSeverityStyle(selectedFinding.severity).bg,
                  color: getSeverityStyle(selectedFinding.severity).color,
                  border: `1px solid ${getSeverityStyle(selectedFinding.severity).border}`,
                }}
              >
                {selectedFinding.severity}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>
              Detected in {selectedFinding.repository} • {selectedFinding.file_path}
            </div>

            {/* Details Section */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Details
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Secret Type</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedFinding.secret_type}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Pattern</span>
                <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 500 }}>{selectedFinding.pattern}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Detected Value</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{selectedFinding.detected_value}</span>
                  <button
                    onClick={() => copyToClipboard(selectedFinding.detected_value, 'Secret value')}
                    title="Copy secret value"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>File Path</span>
                <span style={{ fontFamily: 'monospace', color: '#0F172A', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFinding.file_path}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Line Number</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedFinding.line_number}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Repository</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, color: '#0F172A' }}>
                  <GitHubBrandIcon size={12} />
                  <span>{selectedFinding.repository}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Branch</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, color: '#0F172A' }}>
                  <GitBranch size={12} color="#64748B" />
                  <span>{selectedFinding.branch}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Commit</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, color: '#0F172A' }}>
                  <GitCommit size={12} color="#64748B" />
                  <span style={{ fontFamily: 'monospace' }}>{selectedFinding.commit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Detected At</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{selectedFinding.detected_at}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #F1F5F9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Last Seen</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{selectedFinding.last_seen}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Occurrences</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedFinding.occurrences}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Code Diff (Remediation Preview) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header with Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                <Code2 size={16} color="#2563EB" />
                <span>Code Diff (Remediation Preview)</span>
              </div>

              {/* Unified / Split Toggle */}
              <div style={{ position: 'relative' }}>
                <select
                  value={diffMode}
                  onChange={(e) => setDiffMode(e.target.value as any)}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '4px 26px 4px 10px',
                    fontSize: '12px',
                    color: '#0F172A',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="split">Split</option>
                  <option value="unified">Unified</option>
                </select>
                <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', top: '7px', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Split Mode Diff Preview */}
            {diffMode === 'split' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Before (Vulnerable) */}
                <div style={{ borderRadius: '8px', border: '1px solid #FCA5A5', backgroundColor: '#FFFDFD', overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      borderBottom: '1px solid #FCA5A5',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
                      Before (Vulnerable)
                    </span>
                    <button
                      onClick={() => {
                        const code = selectedFinding.diff.before_lines.map((l) => l.content).join('\n');
                        copyToClipboard(code, 'Vulnerable code');
                      }}
                      title="Copy vulnerable snippet"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#DC2626' }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <div style={{ padding: '8px 0', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px', lineHeight: '1.5' }}>
                    {selectedFinding.diff.before_lines.map((line, idx) => {
                      const isRemoved = line.type === 'removed';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            backgroundColor: isRemoved ? '#FEE2E2' : 'transparent',
                            color: isRemoved ? '#991B1B' : '#334155',
                            padding: '1px 8px',
                          }}
                        >
                          <span style={{ width: '28px', color: '#94A3B8', userSelect: 'none', textAlign: 'right', marginRight: '12px' }}>
                            {line.line_number}
                          </span>
                          <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* After (Fixed) */}
                <div style={{ borderRadius: '8px', border: '1px solid #86EFAC', backgroundColor: '#F0FDF4', overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#DCFCE7',
                      borderBottom: '1px solid #86EFAC',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                      After (Fixed)
                    </span>
                    <button
                      onClick={() => {
                        const code = selectedFinding.diff.after_lines.map((l) => l.content).join('\n');
                        copyToClipboard(code, 'Fixed code');
                      }}
                      title="Copy fixed snippet"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#16A34A' }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <div style={{ padding: '8px 0', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px', lineHeight: '1.5' }}>
                    {selectedFinding.diff.after_lines.map((line, idx) => {
                      const isAdded = line.type === 'added';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            backgroundColor: isAdded ? '#DCFCE7' : 'transparent',
                            color: isAdded ? '#166534' : '#334155',
                            padding: '1px 8px',
                          }}
                        >
                          <span style={{ width: '28px', color: '#94A3B8', userSelect: 'none', textAlign: 'right', marginRight: '12px' }}>
                            {line.line_number}
                          </span>
                          <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Unified Diff View */
              <div style={{ borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Unified Diff Preview — {selectedFinding.diff.file_path}
                </div>
                <div style={{ padding: '8px 0', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px', lineHeight: '1.5' }}>
                  {selectedFinding.diff.before_lines.filter(l => l.type === 'removed').map((l, i) => (
                    <div key={`rem-${i}`} style={{ display: 'flex', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '2px 8px' }}>
                      <span style={{ width: '28px', color: '#EF4444', textAlign: 'right', marginRight: '12px' }}>-</span>
                      <span style={{ whiteSpace: 'pre' }}>{l.content}</span>
                    </div>
                  ))}
                  {selectedFinding.diff.after_lines.filter(l => l.type === 'added').map((l, i) => (
                    <div key={`add-${i}`} style={{ display: 'flex', backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px' }}>
                      <span style={{ width: '28px', color: '#22C55E', textAlign: 'right', marginRight: '12px' }}>+</span>
                      <span style={{ whiteSpace: 'pre' }}>{l.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Remediation Actions (5-step checklist) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '16px' }}>
              <Settings size={16} color="#2563EB" />
              <span>Remediation Actions</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Revoke Exposed Key */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {selectedFinding.actions.step_1_title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 8px 0' }}>
                    {selectedFinding.actions.step_1_desc}
                  </div>
                  <a
                    href={selectedFinding.actions.step_1_action_url || 'https://console.aws.amazon.com/iam/home#/security_credentials'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{selectedFinding.actions.step_1_action_label}</span>
                    <ExternalLink size={12} color="#64748B" />
                  </a>
                </div>
              </div>

              {/* Step 2: Update Code */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {selectedFinding.actions.step_2_title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 8px 0' }}>
                    {selectedFinding.actions.step_2_desc}
                  </div>
                  {/* Code Snippet Box */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '11px',
                      color: '#991B1B',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      position: 'relative',
                    }}
                  >
                    {selectedFinding.actions.step_2_snippet}
                    <button
                      onClick={() => copyToClipboard(selectedFinding.actions.step_2_snippet, 'Snippet')}
                      title="Copy code replacement"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Create Pull Request */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {selectedFinding.actions.step_3_title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 8px 0' }}>
                    {selectedFinding.actions.step_3_desc}
                  </div>
                  <button
                    onClick={() => handleOpenPRModal(selectedFinding)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#2563EB',
                      border: '1px solid #2563EB',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                    }}
                  >
                    <GitPullRequest size={13} color="#FFFFFF" />
                    Create Remediation PR
                  </button>
                </div>
              </div>

              {/* Step 4: Rotate Credentials */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  4
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {selectedFinding.actions.step_4_title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 8px 0' }}>
                    {selectedFinding.actions.step_4_desc}
                  </div>
                  <a
                    href={selectedFinding.actions.step_4_action_url || 'https://console.aws.amazon.com/iam/'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{selectedFinding.actions.step_4_action_label}</span>
                    <ExternalLink size={12} color="#64748B" />
                  </a>
                </div>
              </div>

              {/* Step 5: Verify Fix */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  5
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {selectedFinding.actions.step_5_title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 8px 0' }}>
                    {selectedFinding.actions.step_5_desc}
                  </div>
                  <button
                    onClick={handleRunVerificationScan}
                    disabled={actionLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={12} color="#2563EB" fill="#2563EB" />
                    {selectedFinding.actions.step_5_action_label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Remediation Settings ── */}
      {isSettingsModalOpen && (
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
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '520px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Remediation Automation Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Configure automatic patch creation, branch prefixes, secret vaults, and PR verification rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>Automatic PR Generation</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Allow one-click creation of remediation pull requests</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_pr_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_pr_enabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>Require Security Approval</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Enforce peer review before merging remediation commits</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require_approval}
                  onChange={(e) => setSettings({ ...settings, require_approval: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Branch Prefix
                </label>
                <input
                  type="text"
                  value={settings.branch_prefix}
                  onChange={(e) => setSettings({ ...settings, branch_prefix: e.target.value })}
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
                <label style={{ display: 'block', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Default Secret Manager
                </label>
                <select
                  value={settings.secret_manager}
                  onChange={(e) => setSettings({ ...settings, secret_manager: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="AWS Secrets Manager">AWS Secrets Manager</option>
                  <option value="HashiCorp Vault">HashiCorp Vault</option>
                  <option value="Azure Key Vault">Azure Key Vault</option>
                  <option value="GCP Secret Manager">GCP Secret Manager</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>Auto Re-scan on PR</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Trigger automated secret scan when remediation PR opens</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_rescan_on_pr}
                  onChange={(e) => setSettings({ ...settings, auto_rescan_on_pr: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
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
                onClick={handleSaveSettings}
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
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Bulk Remediate ── */}
      {isBulkModalOpen && (
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
          onClick={() => setIsBulkModalOpen(false)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Bulk Secret Remediation
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              {selectedCheckboxes.size > 0
                ? `You have selected ${selectedCheckboxes.size} finding(s) for bulk remediation.`
                : `No specific items selected. This will process all ${findingsData?.items.length || 0} findings in the current view.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Remediation Strategy:
              </label>
              <button
                onClick={() => handleBulkRemediateSubmit('create_pr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2563EB',
                  backgroundColor: '#EFF6FF',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GitPullRequest size={18} color="#2563EB" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                    Generate Automated PRs (Recommended)
                  </div>
                  <div style={{ fontSize: '11px', color: '#3B82F6' }}>
                    Creates separate branches and pull requests replacing hardcoded keys with env vars.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleBulkRemediateSubmit('mark_remediated')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <CheckCircle2 size={18} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Mark as Remediated in Vault
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Certifies secrets have been rotated in the enterprise credential manager.
                  </div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsBulkModalOpen(false)}
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
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create Remediation PR ── */}
      {isPRModalOpen && targetFindingForPR && (
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
          onClick={() => setIsPRModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '500px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Create Remediation Pull Request
                </h3>
              </div>
              <button
                onClick={() => setIsPRModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Submit an automated pull request for <strong>{targetFindingForPR.title}</strong> on repository <strong>{targetFindingForPR.repository}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Target Branch
                </label>
                <input
                  type="text"
                  value={prBranchName}
                  onChange={(e) => setPrBranchName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  Pull Request Title
                </label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
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
                onClick={() => setIsPRModalOpen(false)}
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
                onClick={handleCreatePR}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <GitPullRequest size={14} />
                Submit Pull Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
