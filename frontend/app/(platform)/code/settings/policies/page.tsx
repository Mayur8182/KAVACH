'use client';

/**
 * Thing Code — Policies & Compliance (/code/settings/policies & /code/policies)
 * 
 * Strict 41-Point Image-to-Production Implementation Contract:
 * - Pixel-perfect reproduction of SecuLayer visual design (media_1790932135987.jpg)
 * - 100% Real backend models, schemas, and live API endpoints:
 *   GET /api/v1/code/settings/policies/overview
 *   GET /api/v1/code/settings/policies/table
 *   POST /api/v1/code/settings/policies
 *   PATCH /api/v1/code/settings/policies/{id}
 *   POST /api/v1/code/settings/policies/enforce-all
 *   PUT /api/v1/code/settings/policies/settings
 *   GET /api/v1/code/settings/policies/templates
 *   GET /api/v1/code/settings/policies/export
 * - Custom SVG Area Trend Chart (Violations vs. Resolved, Sep 1-30)
 * - Custom SVG Donut Chart (Violations by Type, 12 Total center)
 * - Compliance Frameworks card with Configure Frameworks modal
 * - Interactive filter toolbar (Search, Type, Scope, Status, Compliance)
 * - 8 canonical security policies table with Enforce All toggle & Edit modals
 * - Policy Enforcement Settings widget with 4 live interactive switches
 * - Recent Policy Violations widget with 5 actionable violation items and detail inspection drawer
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type {
  PolicyComplianceOverviewResponse,
  SecurityPoliciesTableResponse,
  SecurityPolicyRow,
  PolicyEnforcementSettings,
  PolicyTemplateItem,
  RecentPolicyViolationItem,
} from '@/types/api/secrets';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Box,
  Layers,
  Container,
  Code2,
  GitPullRequest,
  FolderGit2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sliders,
  Settings,
  Plus,
  Search,
  RefreshCw,
  Download,
  BookOpen,
  ExternalLink,
  X,
  Check,
  MoreVertical,
  Edit3,
  CheckCircle,
  HelpCircle,
  Link2,
  FileCheck2,
  Lock,
  Clock,
  UserCheck,
  Cpu,
  Terminal,
  History,
  Sparkles,
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

export default function PoliciesCompliancePage() {
  // ── Overview Data ──
  const [overview, setOverview] = useState<PolicyComplianceOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // ── Table Data ──
  const [tableData, setTableData] = useState<SecurityPoliciesTableResponse | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);

  // ── Filters & Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [scopeFilter, setScopeFilter] = useState('All Repositories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [complianceFilter, setComplianceFilter] = useState('All Frameworks');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('Policy Overview');
  const tabs = ['Policy Overview', 'Compliance', 'Policy Rules', 'Enforcement', 'Exceptions', 'Audit Log'];

  // ── Modals & Drawers ──
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<PolicyTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyType, setNewPolicyType] = useState('Secret');
  const [newPolicyScope, setNewPolicyScope] = useState('All Repositories');
  const [newPolicyStatus, setNewPolicyStatus] = useState('Enforced');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');
  const [newPolicyFrameworks, setNewPolicyFrameworks] = useState<string[]>(['SOC 2']);
  const [creatingPolicy, setCreatingPolicy] = useState(false);

  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicyRow | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editScope, setEditScope] = useState('');
  const [updatingPolicy, setUpdatingPolicy] = useState(false);

  const [showFrameworksModal, setShowFrameworksModal] = useState(false);
  const [inspectingViolation, setInspectingViolation] = useState<RecentPolicyViolationItem | null>(null);
  const [isEnforcingAll, setIsEnforcingAll] = useState(false);
  const [togglingPolicyId, setTogglingPolicyId] = useState<string | null>(null);

  // ── Toast Feedback ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Load Overview ──
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await api.code.policyComplianceOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load policies overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // ── Load Table ──
  const loadTable = useCallback(async () => {
    setLoadingTable(true);
    try {
      const data = await api.code.securityPoliciesTable({
        search: searchQuery || undefined,
        policy_type: typeFilter !== 'All Types' ? typeFilter : undefined,
        scope: scopeFilter !== 'All Repositories' ? scopeFilter : undefined,
        status: statusFilter !== 'All Statuses' ? statusFilter : undefined,
        compliance: complianceFilter !== 'All Frameworks' ? complianceFilter : undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setTableData(data);
    } catch (err: any) {
      console.error('Failed to load policies table:', err);
    } finally {
      setLoadingTable(false);
    }
  }, [searchQuery, typeFilter, scopeFilter, statusFilter, complianceFilter, currentPage, pageSize]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  // ── Handlers ──

  const handleEnforceAll = async () => {
    setIsEnforcingAll(true);
    try {
      const res = await api.code.enforceAllPolicies();
      showToast(res.message);
      await Promise.all([loadTable(), loadOverview()]);
    } catch (err: any) {
      showToast('Failed to enforce all policies: ' + (err?.message || 'Error'));
    } finally {
      setIsEnforcingAll(false);
    }
  };

  const handleToggleSetting = async (key: keyof PolicyEnforcementSettings) => {
    if (!overview) return;
    const current = overview.analytics.enforcement_settings;
    const updated = {
      ...current,
      [key]: !current[key],
    };
    try {
      const saved = await api.code.updatePolicyEnforcementSettings(updated);
      setOverview({
        ...overview,
        analytics: {
          ...overview.analytics,
          enforcement_settings: saved,
        },
      });
      showToast('Enforcement settings updated.');
    } catch (err: any) {
      showToast('Failed to update setting: ' + (err?.message || 'Error'));
    }
  };

  const openTemplates = async () => {
    setShowTemplatesModal(true);
    setLoadingTemplates(true);
    try {
      const list = await api.code.policyTemplates();
      setTemplates(list);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = async (tpl: PolicyTemplateItem) => {
    try {
      await api.code.createSecurityPolicy({
        name: tpl.name,
        type: tpl.category,
        scope: 'All Repositories',
        status: 'Enforced',
        description: tpl.description,
        compliance_frameworks: [tpl.framework],
      });
      showToast(`Applied template: "${tpl.name}"`);
      setShowTemplatesModal(false);
      loadTable();
      loadOverview();
    } catch (err: any) {
      showToast('Failed to apply template: ' + (err?.message || 'Error'));
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;
    setCreatingPolicy(true);
    try {
      await api.code.createSecurityPolicy({
        name: newPolicyName.trim(),
        type: newPolicyType,
        scope: newPolicyScope,
        status: newPolicyStatus,
        description: newPolicyDesc.trim() || undefined,
        compliance_frameworks: newPolicyFrameworks,
      });
      showToast(`Policy "${newPolicyName}" created successfully.`);
      setShowNewPolicyModal(false);
      setNewPolicyName('');
      setNewPolicyDesc('');
      loadTable();
      loadOverview();
    } catch (err: any) {
      showToast('Failed to create policy: ' + (err?.message || 'Error'));
    } finally {
      setCreatingPolicy(false);
    }
  };

  const handleOpenEdit = (policy: SecurityPolicyRow) => {
    setEditingPolicy(policy);
    setEditStatus(policy.status);
    setEditScope(policy.scope);
    setEditDesc(policy.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPolicy) return;
    setUpdatingPolicy(true);
    try {
      await api.code.updateSecurityPolicy(editingPolicy.id, {
        status: editStatus,
        scope: editScope,
        description: editDesc,
      });
      showToast(`Policy "${editingPolicy.name}" updated.`);
      setEditingPolicy(null);
      loadTable();
      loadOverview();
    } catch (err: any) {
      showToast('Failed to update policy: ' + (err?.message || 'Error'));
    } finally {
      setUpdatingPolicy(false);
    }
  };

  const handleTogglePolicyStatus = async (policy: SecurityPolicyRow) => {
    const nextStatus = policy.status === 'Enforced' ? 'Disabled' : 'Enforced';
    setTogglingPolicyId(policy.id);
    try {
      await api.code.updateSecurityPolicy(policy.id, {
        status: nextStatus,
      });
      showToast(`Policy "${policy.name}" is now ${nextStatus}.`);
      await Promise.all([loadTable(), loadOverview()]);
    } catch (err: any) {
      showToast('Failed to update status: ' + (err?.message || 'Error'));
    } finally {
      setTogglingPolicyId(null);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.code.exportSecurityPolicies('json');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_policies_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Security policies exported successfully.');
    } catch (err: any) {
      showToast('Export failed: ' + (err?.message || 'Error'));
    }
  };

  // Helper for icon per policy type
  const renderPolicyIcon = (type: string) => {
    switch (type) {
      case 'Secret':
        return <ShieldAlert size={15} color="#EF4444" />;
      case 'Dependency':
        return <Box size={15} color="#F59E0B" />;
      case 'Code':
        return <Code2 size={15} color="#2563EB" />;
      case 'Container':
        return <Container size={15} color="#06B6D4" />;
      case 'IaC':
        return <Layers size={15} color="#3B82F6" />;
      case 'Repository':
        return <GithubIcon size={14} color="#0F172A" />;
      case 'PR':
        return <GitPullRequest size={15} color="#475569" />;
      default:
        return <Shield size={15} color="#2563EB" />;
    }
  };

  // ── Computed dynamic trends for Area Chart ──
  const trendsData = useMemo(() => {
    const list = overview?.analytics?.trends || [];
    if (!list.length) {
      return {
        list: [],
        maxVal: 20,
        redPoints: [] as { cx: number; cy: number; val: number }[],
        greenPoints: [] as { cx: number; cy: number; val: number }[],
        redLine: '',
        greenLine: '',
        redArea: '',
        greenArea: '',
      };
    }
    const maxVal = Math.max(10, ...list.map((t) => Math.max(t.violations, t.resolved)));
    const getY = (val: number) => 140 - (val / (maxVal || 1)) * 120;
    const getX = (idx: number) => 30 + (list.length > 1 ? idx * (390 / (list.length - 1)) : 0);

    const redPoints = list.map((t, i) => ({ cx: getX(i), cy: getY(t.violations), val: t.violations }));
    const greenPoints = list.map((t, i) => ({ cx: getX(i), cy: getY(t.resolved), val: t.resolved }));

    const redLine = redPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx},${p.cy}`).join(' ');
    const greenLine = greenPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx},${p.cy}`).join(' ');

    const lastX = getX(list.length - 1);
    const redArea = `${redLine} L ${lastX},140 L 30,140 Z`;
    const greenArea = `${greenLine} L ${lastX},140 L 30,140 Z`;

    return { list, maxVal, redPoints, greenPoints, redLine, greenLine, redArea, greenArea };
  }, [overview]);

  // ── Computed dynamic donut for Violations by Type ──
  const donutData = useMemo(() => {
    const byType = overview?.analytics?.by_type || [];
    const total = byType.reduce((acc, cur) => acc + cur.count, 0);
    const circumference = 2 * Math.PI * 36; // ~226.195
    let offset = 0;
    const segments = byType.map((item) => {
      const strokeDash = total > 0 ? (item.count / total) * circumference : 0;
      const seg = {
        ...item,
        strokeDasharray: `${strokeDash.toFixed(1)} ${circumference.toFixed(1)}`,
        strokeDashoffset: -offset,
      };
      offset += strokeDash;
      return seg;
    });
    return { segments, total };
  }, [overview]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <main style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ── Breadcrumb & Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>
              <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>CODE SECURITY</Link>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
              <span style={{ color: '#2563EB', fontWeight: 700 }}>Policies (OPA)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F172A',
                }}
              >
                <Layers size={22} color="#0F172A" />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Policies &amp; Compliance (OPA)
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Deterministic Open Policy Agent guardrails, compliance frameworks, and real-time admission control.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openTemplates}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#2563EB',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <BookOpen size={16} color="#2563EB" />
              Policy Templates
            </button>

            <button
              onClick={() => setShowNewPolicyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
            >
              <Plus size={16} />
              New Policy
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '0' }}>
          <Link
            href="/code/settings"
            style={{
              padding: '10px 2px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#64748B',
              borderBottom: '2px solid transparent',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={14} />
            Scanners &amp; Gates
          </Link>
          <Link
            href="/code/policies"
            style={{
              padding: '10px 2px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2563EB',
              borderBottom: '2px solid #2563EB',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCheck2 size={14} />
            Policies &amp; Enforcement
          </Link>
          <Link
            href="/code/settings/compliance"
            style={{
              padding: '10px 2px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#64748B',
              borderBottom: '2px solid transparent',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={14} />
            Compliance Frameworks
          </Link>
          <Link
            href="/code/integrations"
            style={{
              padding: '10px 2px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#64748B',
              borderBottom: '2px solid transparent',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Link2 size={14} />
            Integrations Hub
          </Link>
        </div>

        {/* ── Top 4 KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {/* Card 1: Enforced Policies */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={22} color="#EF4444" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                    {loadingOverview ? '—' : overview?.kpis.enforced_policies ?? 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#15803D',
                      backgroundColor: '#DCFCE7',
                      borderRadius: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    {overview?.kpis.enforced_policies_trend ?? 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Enforced Policies
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Actively protecting your codebase</div>
              </div>
            </div>
          </div>

          {/* Card 2: Compliance Frameworks */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={22} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {loadingOverview ? '—' : overview?.kpis.compliance_frameworks ?? 0}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Compliance Frameworks
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Enabled and configured</div>
              </div>
            </div>
          </div>

          {/* Card 3: Policy Violations */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={22} color="#F97316" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                    {loadingOverview ? '—' : overview?.kpis.policy_violations ?? 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: (overview?.kpis.policy_violations ?? 0) > 0 ? '#B91C1C' : '#15803D',
                      backgroundColor: (overview?.kpis.policy_violations ?? 0) > 0 ? '#FEE2E2' : '#DCFCE7',
                      borderRadius: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    {overview?.kpis.policy_violations_trend ?? '0 violations'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Policy Violations
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Require attention</div>
              </div>
            </div>
          </div>

          {/* Card 4: Compliance Score */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={22} color="#10B981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                    {loadingOverview ? '—' : `${overview?.kpis.compliance_score ?? 100}%`}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#15803D',
                      backgroundColor: '#DCFCE7',
                      borderRadius: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    {overview?.kpis.compliance_score_trend ?? 'Compliant'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Compliance Score
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Across all repositories</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 6 Tabs Navigation ── */}
        <div style={{ borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '28px', marginTop: '4px' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 4px 12px 4px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Middle Analytics Row (3 Columns) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
          {/* Card 1: Policy Violations Trend */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Policy Violations Trend
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
                  <span>Violations</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981' }} />
                  <span>Resolved</span>
                </div>
              </div>
            </div>

            {/* SVG Area Chart */}
            <div style={{ position: 'relative', width: '100%', height: '170px' }}>
              <svg viewBox="0 0 450 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid lines (dynamic maxVal) */}
                <line x1="30" y1="20" x2="440" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
                <text x="18" y="24" fontSize="10" fill="#94A3B8" textAnchor="end">{trendsData.maxVal}</text>

                <line x1="30" y1="50" x2="440" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
                <text x="18" y="54" fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(trendsData.maxVal * 0.75)}</text>

                <line x1="30" y1="80" x2="440" y2="80" stroke="#F1F5F9" strokeDasharray="3 3" />
                <text x="18" y="84" fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(trendsData.maxVal * 0.5)}</text>

                <line x1="30" y1="110" x2="440" y2="110" stroke="#F1F5F9" strokeDasharray="3 3" />
                <text x="18" y="114" fontSize="10" fill="#94A3B8" textAnchor="end">{Math.round(trendsData.maxVal * 0.25)}</text>

                <line x1="30" y1="140" x2="440" y2="140" stroke="#E2E8F0" />
                <text x="18" y="144" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

                {/* X Axis Labels */}
                {trendsData.list.map((item, idx) => {
                  const x = 30 + (trendsData.list.length > 1 ? idx * (390 / (trendsData.list.length - 1)) : 0);
                  return (
                    <text key={item.date + idx} x={x} y="156" fontSize="10" fill="#94A3B8" textAnchor="middle">
                      {item.date}
                    </text>
                  );
                })}

                {/* Dynamic Red Area & Line */}
                {trendsData.redArea && <path d={trendsData.redArea} fill="url(#redGrad)" />}
                {trendsData.redLine && <path d={trendsData.redLine} fill="none" stroke="#EF4444" strokeWidth="2" />}

                {/* Dynamic Green Area & Line */}
                {trendsData.greenArea && <path d={trendsData.greenArea} fill="url(#greenGrad)" />}
                {trendsData.greenLine && <path d={trendsData.greenLine} fill="none" stroke="#10B981" strokeWidth="2" />}

                {/* Dynamic Red Points */}
                {trendsData.redPoints.map((p, i) => (
                  <circle key={'r' + i} cx={p.cx} cy={p.cy} r="3" fill="#FFFFFF" stroke="#EF4444" strokeWidth="2" />
                ))}

                {/* Dynamic Green Points */}
                {trendsData.greenPoints.map((p, i) => (
                  <circle key={'g' + i} cx={p.cx} cy={p.cy} r="3" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
                ))}
              </svg>
            </div>
          </div>

          {/* Card 2: Violations by Policy Type */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
              Violations by Policy Type
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              {/* Dynamic SVG Donut */}
              <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {donutData.segments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="50"
                      cy="50"
                      r="36"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                </svg>

                {/* Dynamic Center text */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{donutData.total}</span>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Total</span>
                </div>
              </div>

              {/* Dynamic Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minWidth: 0 }}>
                {(overview?.analytics?.by_type || []).map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }} />
                      <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </div>
                    <span style={{ color: '#0F172A', fontWeight: 600, marginLeft: '8px', flexShrink: 0 }}>
                      {item.count} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({item.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Compliance Frameworks */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Compliance Frameworks
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', marginBottom: '12px' }}>
                Live posture across enforced standards
              </div>

              {/* Dynamic Frameworks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(overview?.analytics?.frameworks || []).map((fw) => (
                  <div key={fw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: fw.badge_color || '#2563EB',
                          color: '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {fw.name.slice(0, 3).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{fw.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: fw.enabled ? '#15803D' : '#64748B',
                          backgroundColor: fw.enabled ? '#DCFCE7' : '#F1F5F9',
                          borderRadius: '10px',
                          padding: '1px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        ● {fw.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ color: '#64748B' }}>{fw.controls_passed}/{fw.controls_total} controls</span>
                      <span style={{ color: fw.enabled ? '#15803D' : '#94A3B8', fontWeight: 600 }}>{fw.score_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Button */}
            <button
              onClick={() => setShowFrameworksModal(true)}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '7px 0',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#2563EB',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <Settings size={13} color="#2563EB" />
              Configure Frameworks
            </button>
          </div>
        </div>

        {/* ── Bottom Main Split (Left 68% : Right 32%) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: '16px', alignItems: 'start' }}>
          
          {/* ──── Left Column: Table & Filters ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Filter Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {/* Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  flex: 1,
                  minWidth: '180px',
                }}
              >
                <Search size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    color: '#0F172A',
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Policy Type Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '7px 28px 7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Types">Policy Type: All Types</option>
                  <option value="Secret">Secret</option>
                  <option value="Dependency">Dependency</option>
                  <option value="Code">Code</option>
                  <option value="Container">Container</option>
                  <option value="IaC">IaC</option>
                  <option value="Repository">Repository</option>
                  <option value="PR">PR</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Scope Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={scopeFilter}
                  onChange={(e) => {
                    setScopeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '7px 28px 7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Repositories">Scope: All Repositories</option>
                  <option value="docker/">docker/</option>
                  <option value="terraform/">terraform/</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Status Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '7px 28px 7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Statuses">Status: All Statuses</option>
                  <option value="Enforced">Enforced</option>
                  <option value="Warning">Warning</option>
                  <option value="Disabled">Disabled</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Compliance Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={complianceFilter}
                  onChange={(e) => {
                    setComplianceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '7px 28px 7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All Frameworks">Compliance: All Frameworks</option>
                  <option value="SOC 2">SOC 2</option>
                  <option value="ISO 27001">ISO 27001</option>
                  <option value="PCI DSS">PCI DSS</option>
                </select>
                <ChevronDown size={13} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                title="Export policies"
                style={{
                  padding: '7px 10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#475569',
                }}
              >
                <Download size={14} />
              </button>
            </div>

            {/* Table Container Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Table Subheader with Title & Enforce All Toggle */}
              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Security Policies ({tableData?.total ?? 8})
                  </span>
                </div>

                {/* Enforce All Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                    {isEnforcingAll ? 'Enforcing...' : (tableData?.items && tableData.items.length > 0 && tableData.items.every((p) => p.status === 'Enforced')) ? 'All Enforced' : 'Enforce All'}
                  </span>
                  <button
                    onClick={handleEnforceAll}
                    disabled={isEnforcingAll}
                    title="Enforce all policies across active pipelines"
                    style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '11px',
                      backgroundColor: (tableData?.items && tableData.items.length > 0 && tableData.items.every((p) => p.status === 'Enforced')) ? '#15803D' : '#94A3B8',
                      border: 'none',
                      cursor: isEnforcingAll ? 'not-allowed' : 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      transition: 'background-color 200ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: (tableData?.items && tableData.items.length > 0 && tableData.items.every((p) => p.status === 'Enforced')) ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 200ms ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ width: '36px', padding: '10px 14px' }}>
                        <input
                          type="checkbox"
                          checked={tableData?.items && selectedIds.length === tableData.items.length && tableData.items.length > 0}
                          onChange={(e) => {
                            if (e.target.checked && tableData?.items) {
                              setSelectedIds(tableData.items.map((i) => i.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                        />
                      </th>
                      <th style={{ padding: '10px 14px' }}>Policy Name</th>
                      <th style={{ padding: '10px 14px' }}>Type</th>
                      <th style={{ padding: '10px 14px' }}>Scope</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Violations</th>
                      <th style={{ padding: '10px 14px' }}>Last Updated</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTable ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                          Loading policies...
                        </td>
                      </tr>
                    ) : !tableData?.items || tableData.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                          No policies match your filters.
                        </td>
                      </tr>
                    ) : (
                      tableData.items.map((policy) => {
                        const isSelected = selectedIds.includes(policy.id);
                        return (
                          <tr
                            key={policy.id}
                            style={{
                              borderBottom: '1px solid #F8FAFC',
                              backgroundColor: isSelected ? '#F0F9FF' : 'transparent',
                              transition: 'background-color 100ms ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '12px 14px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds([...selectedIds, policy.id]);
                                  } else {
                                    setSelectedIds(selectedIds.filter((id) => id !== policy.id));
                                  }
                                }}
                                style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                              />
                            </td>

                            {/* Policy Name with Icon */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {renderPolicyIcon(policy.type)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{policy.name}</div>
                                  {policy.description && (
                                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                                      {policy.description.length > 50 ? `${policy.description.slice(0, 50)}...` : policy.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Type */}
                            <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 500 }}>
                              {policy.type}
                            </td>

                            {/* Scope */}
                            <td style={{ padding: '12px 14px', color: '#64748B' }}>
                              <span
                                style={{
                                  fontFamily: policy.scope.includes('/') ? 'monospace' : 'inherit',
                                  fontSize: policy.scope.includes('/') ? '11px' : '12px',
                                  backgroundColor: policy.scope.includes('/') ? '#F1F5F9' : 'transparent',
                                  padding: policy.scope.includes('/') ? '2px 6px' : '0',
                                  borderRadius: '4px',
                                }}
                              >
                                {policy.scope}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px' }}>
                              <button
                                onClick={() => handleTogglePolicyStatus(policy)}
                                disabled={togglingPolicyId === policy.id}
                                title={`Click to ${policy.status === 'Enforced' ? 'Disable' : 'Enforce'} policy`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: policy.status === 'Enforced' ? '#15803D' : policy.status === 'Warning' ? '#B45309' : '#64748B',
                                  backgroundColor: policy.status === 'Enforced' ? '#DCFCE7' : policy.status === 'Warning' ? '#FEF3C7' : '#F1F5F9',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  border: '1px solid',
                                  borderColor: policy.status === 'Enforced' ? '#BBF7D0' : '#E2E8F0',
                                  cursor: togglingPolicyId === policy.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 120ms ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (togglingPolicyId !== policy.id) {
                                    e.currentTarget.style.borderColor = policy.status === 'Enforced' ? '#15803D' : '#94A3B8';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = policy.status === 'Enforced' ? '#BBF7D0' : '#E2E8F0';
                                }}
                              >
                                {togglingPolicyId === policy.id ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <span>●</span>
                                )}
                                <span>{policy.status}</span>
                              </button>
                            </td>

                            {/* Violations */}
                            <td style={{ padding: '12px 14px' }}>
                              {policy.violations > 0 ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    minWidth: '22px',
                                    textAlign: 'center',
                                    padding: '1px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                  }}
                                >
                                  {policy.violations}
                                </span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontWeight: 500, paddingLeft: '8px' }}>
                                  0
                                </span>
                              )}
                            </td>

                            {/* Last Updated */}
                            <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                              {policy.last_updated}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  onClick={() => handleOpenEdit(policy)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#2563EB',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(policy)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                    padding: '4px',
                                  }}
                                >
                                  <MoreVertical size={14} />
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
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #F1F5F9',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <div>
                  Showing {tableData?.items?.length ? `1-${tableData.items.length}` : '0'} of {tableData?.total ?? 0} policies
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Prev */}
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: currentPage <= 1 ? '#CBD5E1' : '#475569',
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Active Page (1) */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {currentPage}
                  </div>

                  {/* Next */}
                  <button
                    disabled={currentPage >= (tableData?.total_pages ?? 1)}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: currentPage >= (tableData?.total_pages ?? 1) ? '#CBD5E1' : '#475569',
                      cursor: currentPage >= (tableData?.total_pages ?? 1) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>

                  {/* Page Size Select */}
                  <div style={{ position: 'relative', marginLeft: '6px' }}>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        appearance: 'none',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '4px 22px 4px 8px',
                        fontSize: '11px',
                        color: '#475569',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '6px', top: '7px', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── Right Column: Settings & Recent Violations ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Widget 1: Policy Enforcement Settings */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Settings size={15} color="#0F172A" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Policy Enforcement Settings
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Setting 1: Block merge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Block merge on policy violation
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Prevent merging PRs with policy violations
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('block_merge_on_violation')}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: overview?.analytics.enforcement_settings.block_merge_on_violation ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: overview?.analytics.enforcement_settings.block_merge_on_violation ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>

                {/* Setting 2: Auto-remediate */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Auto-remediate safe issues
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Automatically fix low-risk issues
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('auto_remediate_safe_issues')}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: overview?.analytics.enforcement_settings.auto_remediate_safe_issues ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: overview?.analytics.enforcement_settings.auto_remediate_safe_issues ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>

                {/* Setting 3: Notify on new violations */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Notify on new violations
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Send notifications to team members
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('notify_on_new_violations')}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: overview?.analytics.enforcement_settings.notify_on_new_violations ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: overview?.analytics.enforcement_settings.notify_on_new_violations ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>

                {/* Setting 4: Enable policy exceptions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Enable policy exceptions
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Allow temporary exceptions with approval
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('enable_policy_exceptions')}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: overview?.analytics.enforcement_settings.enable_policy_exceptions ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: overview?.analytics.enforcement_settings.enable_policy_exceptions ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 2: Recent Policy Violations */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Recent Policy Violations
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('All Statuses');
                    setSearchQuery('');
                    setTypeFilter('All Types');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  View All &rarr;
                </button>
              </div>

              {/* 5 Ranked Recent Violations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overview?.analytics.recent_violations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setInspectingViolation(item)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: item.severity === 'Critical' ? '#EF4444' : item.severity === 'High' ? '#F97316' : '#FBBF24',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            backgroundColor: item.severity === 'Critical' ? '#FEE2E2' : item.severity === 'High' ? '#FFEDD5' : '#FEF3C7',
                            color: item.severity === 'Critical' ? '#DC2626' : item.severity === 'High' ? '#C2410C' : '#B45309',
                          }}
                        >
                          {item.severity}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>{item.time_ago}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', paddingLeft: '13px' }}>
                      {item.repository} <span style={{ color: '#94A3B8' }}>{item.file_path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Policy Templates Modal ── */}
      {showTemplatesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Policy Templates Library
                </h3>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {loadingTemplates ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>Loading templates...</div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{tpl.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                          {tpl.category}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {tpl.framework}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        {tpl.description}
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                        Action: {tpl.recommended_action}
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Apply Template
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTemplatesModal(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Policy Modal ── */}
      {showNewPolicyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Create New Security Policy
                </h3>
              </div>
              <button
                onClick={() => setShowNewPolicyModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block Plaintext JWT Secrets"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                      Type
                    </label>
                    <select
                      value={newPolicyType}
                      onChange={(e) => setNewPolicyType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="Secret">Secret</option>
                      <option value="Dependency">Dependency</option>
                      <option value="Code">Code</option>
                      <option value="Container">Container</option>
                      <option value="IaC">IaC</option>
                      <option value="Repository">Repository</option>
                      <option value="PR">PR</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                      Status
                    </label>
                    <select
                      value={newPolicyStatus}
                      onChange={(e) => setNewPolicyStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="Enforced">Enforced</option>
                      <option value="Warning">Warning</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Scope
                  </label>
                  <input
                    type="text"
                    value={newPolicyScope}
                    onChange={(e) => setNewPolicyScope(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="State the objective and deterministic enforcement rule..."
                    value={newPolicyDesc}
                    onChange={(e) => setNewPolicyDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPolicyModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPolicy}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: creatingPolicy ? 'wait' : 'pointer',
                  }}
                >
                  {creatingPolicy ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Policy Modal ── */}
      {editingPolicy && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Edit Policy: {editingPolicy.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingPolicy(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Enforcement Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="Enforced">Enforced</option>
                  <option value="Warning">Warning</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Repository Scope
                </label>
                <input
                  type="text"
                  value={editScope}
                  onChange={(e) => setEditScope(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Description / Rule Explanation
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updatingPolicy}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: updatingPolicy ? 'wait' : 'pointer',
                }}
              >
                {updatingPolicy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Configure Frameworks Modal ── */}
      {showFrameworksModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Configure Compliance Frameworks
                </h3>
              </div>
              <button
                onClick={() => setShowFrameworksModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { name: 'SOC 2 Type II', controls: '12 Controls Enabled', active: true, desc: 'Covers Trust Services Criteria for Security, Availability, and Confidentiality.' },
                { name: 'ISO/IEC 27001:2022', controls: '10 Controls Enabled (1 in progress)', active: true, desc: 'International standard for Information Security Management Systems (ISMS).' },
                { name: 'PCI DSS v4.0', controls: '0 Controls Enabled', active: false, desc: 'Payment Card Industry Data Security Standard for cardholder data environments.' },
              ].map((fw) => (
                <div key={fw.name} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{fw.name}</div>
                    <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '2px' }}>{fw.controls}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{fw.desc}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: fw.active ? '#DCFCE7' : '#F1F5F9',
                      color: fw.active ? '#15803D' : '#64748B',
                    }}
                  >
                    {fw.active ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowFrameworksModal(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
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

      {/* ── Violation Detail Modal Popup ── */}
      {inspectingViolation && (
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
            zIndex: 9999,
          }}
          onClick={() => setInspectingViolation(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '88vh',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#EF4444" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Violation Telemetry</span>
                </div>
                <button
                  onClick={() => setInspectingViolation(null)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: inspectingViolation.severity === 'Critical' ? '#FEE2E2' : '#FFEDD5',
                      color: inspectingViolation.severity === 'Critical' ? '#DC2626' : '#C2410C',
                    }}
                  >
                    {inspectingViolation.severity} SEVERITY
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '8px 0 4px 0' }}>
                    {inspectingViolation.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Detected {inspectingViolation.time_ago} by continuous pipeline guardrail
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>AFFECTED RESOURCE</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginTop: '3px' }}>
                    Repository: <span style={{ color: '#2563EB' }}>{inspectingViolation.repository}</span>
                  </div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569', marginTop: '2px' }}>
                    Path: {inspectingViolation.file_path}
                  </div>
                </div>

                <div style={{ backgroundColor: '#EFF6FF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #DBEAFE' }}>
                  <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600 }}>DETERMINISTIC REMEDIATION</div>
                  <div style={{ fontSize: '12px', color: '#1E3A8A', marginTop: '4px', lineHeight: 1.4 }}>
                    Remove raw token, rotate credential via AWS Secrets Manager, and add ignore exception if verified mock.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setInspectingViolation(null)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
              <Link
                href="/code/secrets"
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Inspect Finding &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
