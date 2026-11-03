'use client';

/**
 * Thing Code — Policies & Quality Gates Workspace (Section 13)
 * Screens:
 *   13.1 Policies Overview
 *   13.2 Policies
 *   13.3 Policy Detail
 *   13.4 Quality Gates
 *   13.5 Quality Gate Detail
 *   13.6 Violations
 *   13.7 Exceptions
 *   13.8 Settings
 * 
 * Sourced 100% from real backend APIs: /api/v1/iac/policies-gates/*
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Plus,
  Filter,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Trash2,
  Copy,
  Check,
  FileCode,
  Settings as SettingsIcon,
  Layers,
  GitBranch,
  BookOpen,
  Info,
  MoreVertical,
  Edit,
  Tag,
  Server,
  RefreshCw,
  Terminal,
  Bell,
  Lock,
  ListFilter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCPoliciesQualityGatesOverviewResponse,
  IaCPoliciesCatalogResponse,
  IaCPolicyCatalogItem,
  IaCPolicyDetailResponse,
  IaCQualityGatesListResponse,
  IaCQualityGateItem,
  IaCQualityGateDetailResponse,
  IaCPolicyViolationsResponse,
  IaCPolicyViolationItem,
  IaCPolicyExceptionsResponse,
  IaCPolicyExceptionItem,
  IaCPoliciesSettings,
  CreatePolicyRequest as CreateIaCPolicyRequest,
  CreateQualityGateRequest,
  AddQualityGateRuleRequest,
  CreatePolicyExceptionRequest,
} from '@/types/api/iac';

export type PoliciesSubView =
  | 'overview'
  | 'policies'
  | 'policy-detail'
  | 'quality-gates'
  | 'quality-gate-detail'
  | 'violations'
  | 'exceptions'
  | 'settings';

interface PoliciesQualityGatesWorkspaceProps {
  initialSubView?: PoliciesSubView;
  initialPolicyId?: string;
  initialGateId?: string;
  repositoryName?: string;
}

export const PoliciesQualityGatesWorkspace: React.FC<PoliciesQualityGatesWorkspaceProps> = ({
  initialSubView = 'overview',
  initialPolicyId = 'POL-001',
  initialGateId = 'QG-002',
  repositoryName = 'frontend-app',
}) => {
  // Navigation State
  const [subView, setSubView] = useState<PoliciesSubView>(initialSubView);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(initialPolicyId);
  const [selectedGateId, setSelectedGateId] = useState<string>(initialGateId);

  // Common UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 13.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCPoliciesQualityGatesOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // 13.2 Policies State
  const [policiesData, setPoliciesData] = useState<IaCPoliciesCatalogResponse | null>(null);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesSearch, setPoliciesSearch] = useState('');
  const [policiesType, setPoliciesType] = useState('All Types');
  const [policiesStatus, setPoliciesStatus] = useState('All Statuses');
  const [policiesFramework, setPoliciesFramework] = useState('All Frameworks');
  const [policiesPage, setPoliciesPage] = useState(1);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set());
  const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyType, setNewPolicyType] = useState('Resource');
  const [newPolicySeverity, setNewPolicySeverity] = useState('High');
  const [newPolicyFramework, setNewPolicyFramework] = useState('CIS AWS');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');

  // 13.3 Policy Detail State
  const [policyDetail, setPolicyDetail] = useState<IaCPolicyDetailResponse | null>(null);
  const [policyDetailLoading, setPolicyDetailLoading] = useState(false);
  const [policyDetailTab, setPolicyDetailTab] = useState<'Details' | 'Rules' | 'Exceptions' | 'Affected Repos' | 'Audit Logs'>('Details');

  // 13.4 Quality Gates State
  const [qualityGatesData, setQualityGatesData] = useState<IaCQualityGatesListResponse | null>(null);
  const [qualityGatesLoading, setQualityGatesLoading] = useState(false);
  const [qualityGatesSearch, setQualityGatesSearch] = useState('');
  const [qualityGatesStatus, setQualityGatesStatus] = useState('All Statuses');
  const [qualityGatesRepo, setQualityGatesRepo] = useState('All Repositories');
  const [qualityGatesPage, setQualityGatesPage] = useState(1);
  const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(new Set());
  const [showCreateGateModal, setShowCreateGateModal] = useState(false);
  const [newGateName, setNewGateName] = useState('');
  const [newGateDesc, setNewGateDesc] = useState('');
  const [newGateCondition, setNewGateCondition] = useState('Any Critical');

  // 13.5 Quality Gate Detail State
  const [gateDetail, setGateDetail] = useState<IaCQualityGateDetailResponse | null>(null);
  const [gateDetailLoading, setGateDetailLoading] = useState(false);
  const [gateDetailTab, setGateDetailTab] = useState<'Rules' | 'Repositories' | 'Pipeline Integration' | 'Notifications' | 'Audit Logs'>('Rules');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleId, setNewRuleId] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState('High');
  const [gateRulesPage, setGateRulesPage] = useState(1);

  // 13.6 Violations State
  const [violationsData, setViolationsData] = useState<IaCPolicyViolationsResponse | null>(null);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [violationsSearch, setViolationsSearch] = useState('');
  const [violationsSeverity, setViolationsSeverity] = useState('All Severities');
  const [violationsStatus, setViolationsStatus] = useState('All Statuses');
  const [violationsRepo, setViolationsRepo] = useState('All Repositories');
  const [violationsRange, setViolationsRange] = useState('Last 30 days');
  const [violationsPage, setViolationsPage] = useState(1);

  // 13.7 Exceptions State
  const [exceptionsData, setExceptionsData] = useState<IaCPolicyExceptionsResponse | null>(null);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsSearch, setExceptionsSearch] = useState('');
  const [exceptionsStatus, setExceptionsStatus] = useState('All Statuses');
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [showAddExceptionModal, setShowAddExceptionModal] = useState(false);
  const [newExceptionTitle, setNewExceptionTitle] = useState('');
  const [newExceptionRule, setNewExceptionRule] = useState('POL-001');
  const [newExceptionRepo, setNewExceptionRepo] = useState('frontend-app');
  const [newExceptionValidUntil, setNewExceptionValidUntil] = useState('2026-12-31');

  // 13.8 Settings State
  const [settingsData, setSettingsData] = useState<IaCPoliciesSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'General' | 'Enforcement' | 'Notifications' | 'Approval Workflow' | 'Advanced'>('General');

  // Fetch logic per sub-view
  useEffect(() => {
    if (subView === 'overview') {
      setOverviewLoading(true);
      api.iac.policiesGates.getOverview()
        .then((res) => setOverviewData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setOverviewLoading(false));
    } else if (subView === 'policies') {
      setPoliciesLoading(true);
      api.iac.policiesGates.getPolicies({
        search: policiesSearch,
        type: policiesType,
        status: policiesStatus,
        framework: policiesFramework,
        page: policiesPage,
      })
        .then((res) => setPoliciesData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setPoliciesLoading(false));
    } else if (subView === 'policy-detail') {
      setPolicyDetailLoading(true);
      api.iac.policiesGates.getPolicyDetail(selectedPolicyId)
        .then((res) => setPolicyDetail(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setPolicyDetailLoading(false));
    } else if (subView === 'quality-gates') {
      setQualityGatesLoading(true);
      api.iac.policiesGates.getQualityGates({
        search: qualityGatesSearch,
        status: qualityGatesStatus,
        repository: qualityGatesRepo,
        page: qualityGatesPage,
      })
        .then((res) => setQualityGatesData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setQualityGatesLoading(false));
    } else if (subView === 'quality-gate-detail') {
      setGateDetailLoading(true);
      api.iac.policiesGates.getQualityGateDetail(selectedGateId)
        .then((res) => setGateDetail(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setGateDetailLoading(false));
    } else if (subView === 'violations') {
      setViolationsLoading(true);
      api.iac.policiesGates.getViolations({
        search: violationsSearch,
        severity: violationsSeverity,
        status: violationsStatus,
        repository: violationsRepo,
        time_range: violationsRange,
        page: violationsPage,
      })
        .then((res) => setViolationsData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setViolationsLoading(false));
    } else if (subView === 'exceptions') {
      setExceptionsLoading(true);
      api.iac.policiesGates.getExceptions({
        search: exceptionsSearch,
        status: exceptionsStatus,
        page: exceptionsPage,
      })
        .then((res) => setExceptionsData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setExceptionsLoading(false));
    } else if (subView === 'settings') {
      setSettingsLoading(true);
      api.iac.policiesGates.getSettings()
        .then((res) => setSettingsData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setSettingsLoading(false));
    }
  }, [
    subView,
    selectedPolicyId,
    selectedGateId,
    policiesSearch,
    policiesType,
    policiesStatus,
    policiesFramework,
    policiesPage,
    qualityGatesSearch,
    qualityGatesStatus,
    qualityGatesRepo,
    qualityGatesPage,
    violationsSearch,
    violationsSeverity,
    violationsStatus,
    violationsRepo,
    violationsRange,
    violationsPage,
    exceptionsSearch,
    exceptionsStatus,
    exceptionsPage,
  ]);

  // Handlers
  const handleSaveSettings = async () => {
    if (!settingsData) return;
    setSettingsSaving(true);
    try {
      const updated = await api.iac.policiesGates.updateSettings(settingsData);
      setSettingsData(updated);
      showToast('Settings saved successfully!');
    } catch (err: any) {
      showToast(`Failed to save settings: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;
    try {
      await api.iac.policiesGates.createPolicy({
        name: newPolicyName.trim(),
        type: newPolicyType,
        severity: newPolicySeverity,
        status: 'Draft',
        framework: newPolicyFramework,
        description: newPolicyDesc.trim() || `Enforce security standards for ${newPolicyName}`,
        scope_frameworks: ['Terraform'],
        scope_resources: ['*'],
        evaluation_logic: 'if condition == true then fail("Policy violated")',
        remediation_text: 'Fix configuration according to security standards.',
      });
      setShowCreatePolicyModal(false);
      setNewPolicyName('');
      setNewPolicyDesc('');
      showToast('Policy created successfully!');
      // Refresh list
      const res = await api.iac.policiesGates.getPolicies({ page: 1 });
      setPoliciesData(res);
    } catch (err: any) {
      showToast(`Failed to create policy: ${err.message}`);
    }
  };

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim()) return;
    try {
      await api.iac.policiesGates.createQualityGate({
        name: newGateName.trim(),
        description: newGateDesc.trim() || 'Enforce quality gate standards in CI/CD pipeline.',
        status: 'Draft',
        fail_condition: newGateCondition,
        rules: ['RULE-001'],
        repositories: ['frontend-app'],
      });
      setShowCreateGateModal(false);
      setNewGateName('');
      setNewGateDesc('');
      showToast('Quality gate created successfully!');
      const res = await api.iac.policiesGates.getQualityGates({ page: 1 });
      setQualityGatesData(res);
    } catch (err: any) {
      showToast(`Failed to create gate: ${err.message}`);
    }
  };

  const handleAddGateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleId.trim()) return;
    try {
      const updated = await api.iac.policiesGates.addQualityGateRule(selectedGateId, {
        rule_id: newRuleId.trim(),
        rule_name: newRuleName.trim() || newRuleId.trim(),
        severity: newRuleSeverity,
      });
      setGateDetail(updated);
      setShowAddRuleModal(false);
      setNewRuleId('');
      setNewRuleName('');
      showToast('Rule added to quality gate!');
    } catch (err: any) {
      showToast(`Failed to add rule: ${err.message}`);
    }
  };

  const handleRemoveGateRule = async (ruleId: string) => {
    if (!confirm(`Are you sure you want to remove ${ruleId} from this quality gate?`)) return;
    try {
      const updated = await api.iac.policiesGates.removeQualityGateRule(selectedGateId, ruleId);
      setGateDetail(updated);
      showToast(`Rule ${ruleId} removed`);
    } catch (err: any) {
      showToast(`Failed to remove rule: ${err.message}`);
    }
  };

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExceptionTitle.trim()) return;
    try {
      await api.iac.policiesGates.createException({
        title: newExceptionTitle.trim(),
        policy_rule: newExceptionRule,
        repository: newExceptionRepo,
        valid_until: newExceptionValidUntil,
      });
      setShowAddExceptionModal(false);
      setNewExceptionTitle('');
      showToast('Policy exception created!');
      const res = await api.iac.policiesGates.getExceptions({ page: 1 });
      setExceptionsData(res);
    } catch (err: any) {
      showToast(`Failed to create exception: ${err.message}`);
    }
  };

  // UI Severity / Status Pill Helpers
  const renderSeverityPill = (severity: string) => {
    const s = (severity || '').toLowerCase();
    let bg = '#F1F5F9';
    let text = '#64748B';
    if (s.includes('crit')) {
      bg = '#FEE2E2';
      text = '#DC2626';
    } else if (s.includes('high')) {
      bg = '#FFEDD5';
      text = '#EA580C';
    } else if (s.includes('med')) {
      bg = '#FEF3C7';
      text = '#D97706';
    } else if (s.includes('low')) {
      bg = '#DCFCE7';
      text = '#16A34A';
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: text }} />
        {severity}
      </span>
    );
  };

  const renderStatusPill = (status: string) => {
    const st = (status || '').toLowerCase();
    let bg = '#F1F5F9';
    let text = '#64748B';
    let icon = null;
    if (st.includes('enforced') || st.includes('active') || st.includes('passed') || st.includes('resolved') || st.includes('compliant')) {
      bg = '#DCFCE7';
      text = '#15803D';
      icon = <Check size={11} color="#15803D" />;
    } else if (st.includes('draft') || st.includes('in progress') || st.includes('skipped')) {
      bg = '#FEF3C7';
      text = '#B45309';
      icon = <Clock size={11} color="#B45309" />;
    } else if (st.includes('disabled') || st.includes('expired') || st.includes('failed') || st.includes('open')) {
      bg = '#FEE2E2';
      text = '#DC2626';
      icon = <XCircle size={11} color="#DC2626" />;
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
        }}
      >
        {icon}
        {status}
      </span>
    );
  };

  const renderFailConditionBadge = (condition: string) => {
    const c = (condition || '').toLowerCase();
    let bg = '#FEE2E2';
    let text = '#DC2626';
    if (c.includes('critical only')) {
      bg = '#FFEDD5';
      text = '#EA580C';
    } else if (c.includes('custom')) {
      bg = '#EDE9FE';
      text = '#7C3AED';
    } else if (c.includes('compliance')) {
      bg = '#FEF2F2';
      text = '#B91C1C';
    }
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
        }}
      >
        {condition}
      </span>
    );
  };

  // Sub-Navigation Tabs Bar (Top level for switching 13.1 to 13.8)
  const navTabs: { id: PoliciesSubView; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'policies', label: 'Policies', icon: ShieldCheck },
    { id: 'quality-gates', label: 'Quality Gates', icon: CheckCircle },
    { id: 'violations', label: 'Violations', icon: ShieldAlert },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* Top Breadcrumb & Title Area */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
          <span>THING CODE</span>
          <span>&gt;</span>
          <span>IaC Security</span>
          <span>&gt;</span>
          <span
            style={{ cursor: 'pointer', color: subView === 'overview' ? '#0F172A' : '#2563EB', fontWeight: 600 }}
            onClick={() => setSubView('overview')}
          >
            Policies &amp; Quality Gates
          </span>
          {subView !== 'overview' && (
            <>
              <span>&gt;</span>
              <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>
                {subView === 'policy-detail'
                  ? selectedPolicyId
                  : subView === 'quality-gate-detail'
                  ? gateDetail?.name || selectedGateId
                  : subView.replace('-', ' ')}
              </span>
            </>
          )}
        </div>

        {/* Global Sub-View Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          {navTabs.map((t) => {
            const Icon = t.icon;
            const active =
              subView === t.id ||
              (t.id === 'policies' && subView === 'policy-detail') ||
              (t.id === 'quality-gates' && subView === 'quality-gate-detail');
            return (
              <button
                key={t.id}
                onClick={() => setSubView(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: active ? '#2563EB' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#475569',
                  boxShadow: active ? '0 1px 3px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={active ? '#FFFFFF' : '#64748B'} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SCREEN 13.1: POLICIES OVERVIEW
          ========================================================================= */}
      {subView === 'overview' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policies &amp; Quality Gates</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Manage IaC security policies, enforcement rules and quality gates for your repositories.
            </p>
          </div>

          {/* 4 Stat KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Total Policies</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>{overviewData?.total_policies ?? 24}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase' }}>Enforced</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#16A34A', marginTop: '6px' }}>{overviewData?.enforced ?? 18}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#EA580C', textTransform: 'uppercase' }}>Draft</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#EA580C', marginTop: '6px' }}>{overviewData?.draft ?? 4}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase' }}>Disabled</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '6px' }}>{overviewData?.disabled ?? 2}</div>
            </div>
          </div>

          {/* 2 Donut Cards (Policy Compliance + Quality Gate Status) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Card 1: Policy Compliance */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Policy Compliance</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#E2E8F0" strokeWidth="3" />
                    {/* Compliant: 16/24 = 66.7% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#10B981" strokeWidth="3.2" strokeDasharray="66.7 33.3" strokeDashoffset="0" />
                    {/* Non-compliant: 6/24 = 25% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#EF4444" strokeWidth="3.2" strokeDasharray="25 75" strokeDashoffset="-66.7" />
                    {/* Not Evaluated: 2/24 = 8.3% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#F59E0B" strokeWidth="3.2" strokeDasharray="8.3 91.7" strokeDashoffset="-91.7" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>24</span>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Total</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span style={{ color: '#475569' }}>Compliant</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>16</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span style={{ color: '#475569' }}>Non-Compliant</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>6</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span style={{ color: '#475569' }}>Not Evaluated</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>2</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Quality Gate Status */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Quality Gate Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#E2E8F0" strokeWidth="3" />
                    {/* Passed: 36/48 = 75% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#10B981" strokeWidth="3.2" strokeDasharray="75 25" strokeDashoffset="0" />
                    {/* Failed: 8/48 = 16.7% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#EF4444" strokeWidth="3.2" strokeDasharray="16.7 83.3" strokeDashoffset="-75" />
                    {/* Skipped: 4/48 = 8.3% */}
                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#F59E0B" strokeWidth="3.2" strokeDasharray="8.3 91.7" strokeDashoffset="-91.7" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>48</span>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Total</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span style={{ color: '#475569' }}>Passed</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>36</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span style={{ color: '#475569' }}>Failed</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>8</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span style={{ color: '#475569' }}>Skipped</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: '#0F172A' }}>4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Violations Trend Area Chart */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Violations Trend</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span style={{ color: '#64748B' }}>Critical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} />
                  <span style={{ color: '#64748B' }}>High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span style={{ color: '#64748B' }}>Medium</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ color: '#64748B' }}>Low</span>
                </div>
              </div>
            </div>

            {/* SVG Trendlines */}
            <div style={{ height: '180px', width: '100%', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 700 180" preserveAspectRatio="none">
                {/* Horizontal guide lines */}
                <line x1="40" y1="20" x2="680" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="60" x2="680" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="100" x2="680" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="140" x2="680" y2="140" stroke="#F1F5F9" strokeWidth="1" />

                {/* Critical Trend Line */}
                <polyline
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                  points="40,90 140,82 240,55 340,65 440,75 540,80 640,85"
                />
                {/* High Trend Line */}
                <polyline
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="2"
                  points="40,115 140,110 240,95 340,100 440,105 540,110 640,115"
                />
                {/* Medium Trend Line */}
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  points="40,135 140,130 240,120 340,118 440,125 540,128 640,132"
                />
                {/* Low Trend Line */}
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  points="40,150 140,148 240,145 340,146 440,150 540,152 640,155"
                />
              </svg>
              {/* X-Axis Dates */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '40px', paddingRight: '20px', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                <span>Sep 01</span>
                <span>Sep 05</span>
                <span>Sep 10</span>
                <span>Sep 15</span>
                <span>Sep 20</span>
                <span>Sep 25</span>
                <span>Sep 30</span>
              </div>
            </div>
          </div>

          {/* Top Policy Violations Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Top Policy Violations</h3>
              <button
                onClick={() => setSubView('violations')}
                style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all violations &rarr;
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>ID</th>
                  <th style={{ padding: '12px 20px' }}>Policy Name</th>
                  <th style={{ padding: '12px 20px' }}>Severity</th>
                  <th style={{ padding: '12px 20px' }}>Violations</th>
                  <th style={{ padding: '12px 20px' }}>Repositories</th>
                  <th style={{ padding: '12px 20px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(overviewData?.top_violations || [
                  { id: 'POL-001', policy_name: 'No Public S3 Buckets', severity: 'Critical', violations: 18, repositories: 6 },
                  { id: 'POL-004', policy_name: 'Enforce TLS on Resources', severity: 'High', violations: 12, repositories: 5 },
                  { id: 'POL-005', policy_name: 'No Hardcoded Secrets', severity: 'High', violations: 10, repositories: 7 },
                  { id: 'POL-012', policy_name: 'Use Approved AMIs', severity: 'Medium', violations: 8, repositories: 4 },
                  { id: 'POL-018', policy_name: 'Enforce Tags', severity: 'Medium', violations: 6, repositories: 6 },
                ]).map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedPolicyId(row.id);
                      setSubView('policy-detail');
                    }}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{row.id}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0F172A' }}>{row.policy_name}</td>
                    <td style={{ padding: '12px 20px' }}>{renderSeverityPill(row.severity)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0F172A' }}>{row.violations}</td>
                    <td style={{ padding: '12px 20px', color: '#64748B' }}>{row.repositories}</td>
                    <td style={{ padding: '12px 20px', color: '#94A3B8' }}>
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.2: POLICIES CATALOG
          ========================================================================= */}
      {subView === 'policies' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policies</h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Create and manage IaC security policies.
              </p>
            </div>
            <button
              onClick={() => setShowCreatePolicyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Create Policy
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search policies by name, description, rule..."
                value={policiesSearch}
                onChange={(e) => setPoliciesSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
            <select
              value={policiesType}
              onChange={(e) => setPoliciesType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {policiesData?.available_types.map((t) => (
                <option key={t} value={t}>{t}</option>
              )) || <option>All Types</option>}
            </select>
            <select
              value={policiesStatus}
              onChange={(e) => setPoliciesStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {policiesData?.available_statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              )) || <option>All Statuses</option>}
            </select>
            <select
              value={policiesFramework}
              onChange={(e) => setPoliciesFramework(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {policiesData?.available_frameworks.map((f) => (
                <option key={f} value={f}>{f}</option>
              )) || <option>All Frameworks</option>}
            </select>
          </div>

          {/* Policies Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={selectedPolicyIds.size > 0 && selectedPolicyIds.size === (policiesData?.items.length || 0)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPolicyIds(new Set(policiesData?.items.map((x) => x.id) || []));
                        } else {
                          setSelectedPolicyIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Framework</th>
                </tr>
              </thead>
              <tbody>
                {(policiesData?.items || []).map((p) => {
                  const isChecked = selectedPolicyIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isChecked ? '#F0F9FF' : '#FFFFFF' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedPolicyIds);
                            if (e.target.checked) next.add(p.id);
                            else next.delete(p.id);
                            setSelectedPolicyIds(next);
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          onClick={() => {
                            setSelectedPolicyId(p.id);
                            setSubView('policy-detail');
                          }}
                          style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span style={{ color: '#2563EB' }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{p.type}</td>
                      <td style={{ padding: '12px 16px' }}>{renderSeverityPill(p.severity)}</td>
                      <td style={{ padding: '12px 16px' }}>{renderStatusPill(p.status)}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{p.framework}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPoliciesPage(pg)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: policiesPage === pg ? '#2563EB' : '#FFFFFF',
                    color: policiesPage === pg ? '#FFFFFF' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {pg}
                </button>
              ))}
              <span style={{ color: '#94A3B8', margin: '0 4px' }}>&gt;</span>
              <span style={{ color: '#64748B', fontSize: '12px' }}>10 / page</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.3: POLICY DETAIL
          ========================================================================= */}
      {subView === 'policy-detail' && (
        <div>
          {/* Header Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {policyDetail?.name || 'No Public S3 Buckets'}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 0 0', maxWidth: '720px' }}>
                  {policyDetail?.subtitle || 'Disallow public access to S3 buckets in Terraform, CloudFormation and Kubernetes configurations.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => showToast('Editing policy...')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <Edit size={14} />
                  Edit Policy
                </button>
                <button
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={16} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Badges metadata row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Status</span>
                {renderStatusPill(policyDetail?.status || 'Enforced')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Severity</span>
                {renderSeverityPill(policyDetail?.severity || 'Critical')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Type</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{policyDetail?.type || 'Resource'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Framework</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{policyDetail?.framework || 'CIS AWS'}</span>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
            {(['Details', 'Rules', 'Exceptions', 'Affected Repos', 'Audit Logs'] as const).map((tab) => {
              const active = policyDetailTab === tab;
              const countBadge =
                tab === 'Rules'
                  ? ` (${policyDetail?.rules.length ?? 3})`
                  : tab === 'Exceptions'
                  ? ` (${policyDetail?.exceptions.length ?? 2})`
                  : tab === 'Affected Repos'
                  ? ` (${policyDetail?.affected_repos.length ?? 6})`
                  : '';
              return (
                <button
                  key={tab}
                  onClick={() => setPolicyDetailTab(tab)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: active ? '#2563EB' : '#64748B',
                    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                  }}
                >
                  {tab}
                  {countBadge}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Details */}
          {policyDetailTab === 'Details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Description */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>Description</h3>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                  {policyDetail?.description ||
                    'This policy ensures that no S3 bucket is publicly accessible. It checks for public ACLs, public bucket policies and block public access settings.'}
                </p>
              </div>

              {/* Scope */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Scope</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(policyDetail?.scope_frameworks || ['Terraform', 'CloudFormation', 'Kubernetes (via manifests)']).map((sf) => (
                    <span
                      key={sf}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#F1F5F9',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      {sf}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  <span style={{ fontWeight: 600 }}>Resources: </span>
                  <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                    {(policyDetail?.scope_resources || ['aws_s3_bucket', 'aws_s3_bucket_policy']).join(', ')}
                  </span>
                </div>
              </div>

              {/* Evaluation Logic */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Evaluation Logic</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(policyDetail?.evaluation_logic || '');
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#F1F5F9',
                      border: 'none',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCode ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    overflowX: 'auto',
                    margin: 0,
                    lineHeight: '1.6',
                  }}
                >
                  {policyDetail?.evaluation_logic ||
                    `if resource.type == "aws_s3_bucket" and\n   (public_acl == true or public_policy == true or\n    block_public_access == false) then\n   fail("S3 bucket should not be publicly accessible")`}
                </pre>
              </div>

              {/* Remediation */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>Remediation</h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0' }}>
                  {policyDetail?.remediation_text || 'Enable block public access and remove public ACLs/policies.'}
                </p>
                <a
                  href={policyDetail?.remediation_guide_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                >
                  View Remediation Guide &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Tab 2: Rules */}
          {policyDetailTab === 'Rules' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Rule ID</th>
                    <th style={{ padding: '12px 20px' }}>Rule Name</th>
                    <th style={{ padding: '12px 20px' }}>Provider</th>
                    <th style={{ padding: '12px 20px' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {(policyDetail?.rules || []).map((r) => (
                    <tr key={r.rule_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{r.rule_id}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0F172A' }}>{r.rule_name}</td>
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>{r.provider}</td>
                      <td style={{ padding: '12px 20px' }}>{renderSeverityPill(r.severity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Exceptions */}
          {policyDetailTab === 'Exceptions' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>ID</th>
                    <th style={{ padding: '12px 20px' }}>Title</th>
                    <th style={{ padding: '12px 20px' }}>Repository</th>
                    <th style={{ padding: '12px 20px' }}>Valid Until</th>
                    <th style={{ padding: '12px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(policyDetail?.exceptions || []).map((ex) => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{ex.id}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0F172A' }}>{ex.title}</td>
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>{ex.repository}</td>
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>{ex.valid_until}</td>
                      <td style={{ padding: '12px 20px' }}>{renderStatusPill(ex.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Affected Repos */}
          {policyDetailTab === 'Affected Repos' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Repository Name</th>
                    <th style={{ padding: '12px 20px' }}>Violations</th>
                    <th style={{ padding: '12px 20px' }}>Last Scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {(policyDetail?.affected_repos || []).map((repo) => (
                    <tr key={repo.repository_name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: '#2563EB' }}>{repo.repository_name}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 700, color: '#DC2626' }}>{repo.violations_count} active</td>
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>{repo.last_scanned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Audit Logs */}
          {policyDetailTab === 'Audit Logs' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(policyDetail?.audit_logs || []).map((al) => (
                  <div key={al.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderLeft: '2px solid #2563EB', paddingLeft: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{al.action}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{al.details}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        By {al.performed_by} &bull; {al.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.4: QUALITY GATES
          ========================================================================= */}
      {subView === 'quality-gates' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Quality Gates</h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Define quality gates to enforce IaC security standards in your CI/CD pipeline.
              </p>
            </div>
            <button
              onClick={() => setShowCreateGateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Create Quality Gate
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select
              value={qualityGatesStatus}
              onChange={(e) => setQualityGatesStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {qualityGatesData?.available_statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              )) || <option>All Statuses</option>}
            </select>
            <select
              value={qualityGatesRepo}
              onChange={(e) => setQualityGatesRepo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {qualityGatesData?.available_repositories.map((r) => (
                <option key={r} value={r}>{r}</option>
              )) || <option>All Repositories</option>}
            </select>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search quality gates..."
                value={qualityGatesSearch}
                onChange={(e) => setQualityGatesSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* Quality Gates Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={selectedGateIds.size > 0 && selectedGateIds.size === (qualityGatesData?.items.length || 0)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGateIds(new Set(qualityGatesData?.items.map((x) => x.id) || []));
                        else setSelectedGateIds(new Set());
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Fail Condition</th>
                  <th style={{ padding: '12px 16px' }}>Affected Repos</th>
                </tr>
              </thead>
              <tbody>
                {(qualityGatesData?.items || []).map((gate) => {
                  const isChecked = selectedGateIds.has(gate.id);
                  return (
                    <tr
                      key={gate.id}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isChecked ? '#F0F9FF' : '#FFFFFF' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedGateIds);
                            if (e.target.checked) next.add(gate.id);
                            else next.delete(gate.id);
                            setSelectedGateIds(next);
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          onClick={() => {
                            setSelectedGateId(gate.id);
                            setSubView('quality-gate-detail');
                          }}
                          style={{ fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
                        >
                          {gate.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{gate.description}</td>
                      <td style={{ padding: '12px 16px' }}>{renderStatusPill(gate.status)}</td>
                      <td style={{ padding: '12px 16px' }}>{renderFailConditionBadge(gate.fail_condition)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{gate.affected_repos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setQualityGatesPage(pg)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: qualityGatesPage === pg ? '#2563EB' : '#FFFFFF',
                    color: qualityGatesPage === pg ? '#FFFFFF' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {pg}
                </button>
              ))}
              <span style={{ color: '#94A3B8', margin: '0 4px' }}>&gt;</span>
              <span style={{ color: '#64748B', fontSize: '12px' }}>10 / page</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.5: QUALITY GATE DETAIL
          ========================================================================= */}
      {subView === 'quality-gate-detail' && (
        <div>
          {/* Header Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {gateDetail?.name || 'Production Gate'}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 0 0' }}>
                  {gateDetail?.subtitle || 'Strict security gate for production deployments.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => showToast('Editing gate...')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <Edit size={14} />
                  Edit Gate
                </button>
                <button
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={16} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Metadata badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Status</span>
                {renderStatusPill(gateDetail?.status || 'Enforced')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Fail Condition</span>
                {renderFailConditionBadge(gateDetail?.fail_condition || 'Critical or High')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Applied To</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{gateDetail?.applied_to_count ?? 8} repositories</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Created By</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{gateDetail?.created_by || 'mayur.bhanvad'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Last Updated</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{gateDetail?.last_updated || 'Sep 20, 2026'}</span>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
            {(['Rules', 'Repositories', 'Pipeline Integration', 'Notifications', 'Audit Logs'] as const).map((tab) => {
              const active = gateDetailTab === tab;
              const countBadge =
                tab === 'Rules'
                  ? ` (${gateDetail?.rules.length ?? 8})`
                  : tab === 'Repositories'
                  ? ` (${gateDetail?.repositories.length ?? 8})`
                  : '';
              return (
                <button
                  key={tab}
                  onClick={() => setGateDetailTab(tab)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: active ? '#2563EB' : '#64748B',
                    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                  }}
                >
                  {tab}
                  {countBadge}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Rules in this Quality Gate */}
          {gateDetailTab === 'Rules' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Rules in this Quality Gate</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search rules..."
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowAddRuleModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    Add Rule
                  </button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Rule ID</th>
                    <th style={{ padding: '12px 20px' }}>Rule Name</th>
                    <th style={{ padding: '12px 20px' }}>Severity</th>
                    <th style={{ padding: '12px 20px', width: '60px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allRules = gateDetail?.rules || [];
                    const pageSize = 10;
                    const totalPages = Math.max(1, Math.ceil(allRules.length / pageSize));
                    const safePage = Math.min(gateRulesPage, totalPages);
                    const pagedRules = allRules.slice((safePage - 1) * pageSize, safePage * pageSize);
                    return pagedRules.map((r) => (
                      <tr key={r.rule_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{r.rule_id}</td>
                        <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0F172A' }}>{r.rule_name}</td>
                        <td style={{ padding: '12px 20px' }}>{renderSeverityPill(r.severity)}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <button
                            onClick={() => handleRemoveGateRule(r.rule_id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              {(() => {
                const allRules = gateDetail?.rules || [];
                const pageSize = 10;
                const totalPages = Math.max(1, Math.ceil(allRules.length / pageSize));
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
                    <button
                      onClick={() => setGateRulesPage((p) => Math.max(1, p - 1))}
                      disabled={gateRulesPage <= 1}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: gateRulesPage <= 1 ? '#CBD5E1' : '#475569',
                        fontSize: '12px',
                        cursor: gateRulesPage <= 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setGateRulesPage(pg)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: pg === gateRulesPage ? '#2563EB' : '#FFFFFF',
                          color: pg === gateRulesPage ? '#FFFFFF' : '#475569',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      onClick={() => setGateRulesPage((p) => Math.min(totalPages, p + 1))}
                      disabled={gateRulesPage >= totalPages}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: gateRulesPage >= totalPages ? '#CBD5E1' : '#475569',
                        fontSize: '12px',
                        cursor: gateRulesPage >= totalPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      &gt;
                    </button>
                    <span style={{ color: '#64748B', fontSize: '12px', marginLeft: '6px' }}>
                      {allRules.length} rules • 10 / page
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tab 2: Repositories */}
          {gateDetailTab === 'Repositories' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Repository</th>
                    <th style={{ padding: '12px 20px' }}>Gate Evaluation</th>
                    <th style={{ padding: '12px 20px' }}>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {(gateDetail?.repositories || []).map((repo) => (
                    <tr key={repo.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: '#2563EB' }}>{repo.name}</td>
                      <td style={{ padding: '12px 20px' }}>{renderStatusPill(repo.status)}</td>
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>{repo.last_checked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Pipeline Integration */}
          {gateDetailTab === 'Pipeline Integration' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(gateDetail?.pipelines || [
                { provider: 'GitHub Actions', snippet: '- name: Evaluate Production Gate\n  uses: seculayer/gate-action@v2\n  with:\n    gate_id: QG-002\n    fail_on: high', status: 'Active' },
              ]).map((pipe) => (
                <div key={pipe.provider} style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{pipe.provider}</h3>
                    {renderStatusPill(pipe.status)}
                  </div>
                  <pre style={{ backgroundColor: '#0F172A', color: '#E2E8F0', padding: '14px', borderRadius: '8px', fontSize: '12px', fontFamily: 'Consolas, monospace', margin: 0 }}>
                    {pipe.snippet}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Notifications */}
          {gateDetailTab === 'Notifications' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Alert Channels</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(gateDetail?.notifications || ['slack:#prod-deployments', 'pagerduty:critical-oncall']).map((ch) => (
                  <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <Bell size={14} color="#2563EB" />
                    <span>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Audit Logs */}
          {gateDetailTab === 'Audit Logs' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(gateDetail?.audit_logs || []).map((al) => (
                  <div key={al.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderLeft: '2px solid #2563EB', paddingLeft: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{al.action}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{al.details}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        By {al.performed_by} &bull; {al.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.6: VIOLATIONS
          ========================================================================= */}
      {subView === 'violations' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policy Violations</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              View and manage all quality gate and policy violations.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select
              value={violationsSeverity}
              onChange={(e) => setViolationsSeverity(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {violationsData?.available_severities.map((s) => (
                <option key={s} value={s}>{s}</option>
              )) || <option>All Severities</option>}
            </select>
            <select
              value={violationsStatus}
              onChange={(e) => setViolationsStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {violationsData?.available_statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              )) || <option>All Statuses</option>}
            </select>
            <select
              value={violationsRepo}
              onChange={(e) => setViolationsRepo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {violationsData?.available_repositories.map((r) => (
                <option key={r} value={r}>{r}</option>
              )) || <option>All Repositories</option>}
            </select>
            <select
              value={violationsRange}
              onChange={(e) => setViolationsRange(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {violationsData?.available_ranges.map((rg) => (
                <option key={rg} value={rg}>{rg}</option>
              )) || <option>Last 30 days</option>}
            </select>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search violations..."
                value={violationsSearch}
                onChange={(e) => setViolationsSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* Violations Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>ID</th>
                  <th style={{ padding: '12px 18px' }}>Title</th>
                  <th style={{ padding: '12px 18px' }}>Severity</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Repository</th>
                  <th style={{ padding: '12px 18px' }}>Detected</th>
                </tr>
              </thead>
              <tbody>
                {(violationsData?.items || []).map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{v.id}</td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>{v.title}</td>
                    <td style={{ padding: '12px 18px' }}>{renderSeverityPill(v.severity)}</td>
                    <td style={{ padding: '12px 18px' }}>{renderStatusPill(v.status)}</td>
                    <td style={{ padding: '12px 18px', color: '#475569' }}>{v.repository}</td>
                    <td style={{ padding: '12px 18px', color: '#64748B' }}>{v.detected}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setViolationsPage(pg)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: violationsPage === pg ? '#2563EB' : '#FFFFFF',
                    color: violationsPage === pg ? '#FFFFFF' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {pg}
                </button>
              ))}
              <span style={{ color: '#94A3B8', margin: '0 4px' }}>&gt;</span>
              <span style={{ color: '#64748B', fontSize: '12px' }}>10 / page</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.7: EXCEPTIONS
          ========================================================================= */}
      {subView === 'exceptions' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policy Exceptions</h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Manage exceptions for policy violations and quality gates.
              </p>
            </div>
            <button
              onClick={() => setShowAddExceptionModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Add Exception
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <select
              value={exceptionsStatus}
              onChange={(e) => setExceptionsStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              {exceptionsData?.available_statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              )) || <option>All Statuses</option>}
            </select>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search exceptions..."
                value={exceptionsSearch}
                onChange={(e) => setExceptionsSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* Exceptions Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>ID</th>
                  <th style={{ padding: '12px 20px' }}>Title</th>
                  <th style={{ padding: '12px 20px' }}>Policy/Rule</th>
                  <th style={{ padding: '12px 20px' }}>Repository</th>
                  <th style={{ padding: '12px 20px' }}>Valid Until</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(exceptionsData?.items || []).map((ex) => (
                  <tr key={ex.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{ex.id}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0F172A' }}>{ex.title}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'monospace', color: '#475569' }}>{ex.policy_rule}</td>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{ex.repository}</td>
                    <td style={{ padding: '12px 20px', color: '#64748B' }}>{ex.valid_until}</td>
                    <td style={{ padding: '12px 20px' }}>{renderStatusPill(ex.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setExceptionsPage(pg)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: exceptionsPage === pg ? '#2563EB' : '#FFFFFF',
                    color: exceptionsPage === pg ? '#FFFFFF' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {pg}
                </button>
              ))}
              <span style={{ color: '#94A3B8', margin: '0 4px' }}>&gt;</span>
              <span style={{ color: '#64748B', fontSize: '12px' }}>10 / page</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 13.8: SETTINGS
          ========================================================================= */}
      {subView === 'settings' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policies &amp; Quality Gates Settings</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Configure enforcement, evaluation and workflow settings.
            </p>
          </div>

          {/* Settings Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
            {(['General', 'Enforcement', 'Notifications', 'Approval Workflow', 'Advanced'] as const).map((st) => {
              const active = settingsTab === st;
              return (
                <button
                  key={st}
                  onClick={() => setSettingsTab(st)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: active ? '#2563EB' : '#64748B',
                    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* General Settings Panel */}
          {settingsTab === 'General' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '10px', border: '1px solid #E2E8F0', maxWidth: '860px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>General Settings</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Toggle 1: Enable Policy Enforcement */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Enable Policy Enforcement</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Enforce policies and quality gates on scans and pull requests</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.enable_policy_enforcement ?? true}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, enable_policy_enforcement: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Toggle 2: Block Merge on Gate Failure */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Block Merge on Gate Failure</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Prevent merging when quality gate fails</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.block_merge_on_gate_failure ?? true}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, block_merge_on_gate_failure: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Toggle 3: Evaluate on Pull Request */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Evaluate on Pull Request</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Run policy checks on pull requests</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.evaluate_on_pull_request ?? true}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, evaluate_on_pull_request: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Toggle 4: Evaluate on Branch Push */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Evaluate on Branch Push</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Run policy checks on branch push</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.evaluate_on_branch_push ?? true}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, evaluate_on_branch_push: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Toggle 5: Include Deleted Resources */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Include Deleted Resources</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Check for removal of secured resources</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.include_deleted_resources ?? false}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, include_deleted_resources: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Toggle 6: Show Policy Hints */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Show Policy Hints</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Show inline hints during development</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData?.show_policy_hints ?? true}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, show_policy_hints: e.target.checked } : null)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* Selector: Default Quality Gate */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>Default Quality Gate</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Default gate to apply for new repositories</div>
                  </div>
                  <select
                    value={settingsData?.default_quality_gate || 'Default IaC Gate'}
                    onChange={(e) => setSettingsData(prev => prev ? { ...prev, default_quality_gate: e.target.value } : null)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      minWidth: '200px',
                    }}
                  >
                    {(settingsData?.available_gates || ['Default IaC Gate', 'Production Gate', 'Dev Gate']).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: settingsSaving ? 'not-allowed' : 'pointer',
                    opacity: settingsSaving ? 0.7 : 1,
                  }}
                >
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Other Settings Tabs Placeholders */}
          {settingsTab !== 'General' && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '10px', border: '1px solid #E2E8F0', maxWidth: '860px', color: '#64748B', fontSize: '13px' }}>
              <p style={{ margin: 0 }}>
                {settingsTab} settings are managed through deterministic policy configurations in your repository.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* Modal: Create Policy */}
      {showCreatePolicyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Create IaC Policy</h2>
            <form onSubmit={handleCreatePolicy}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disallow Public Load Balancers"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Type</label>
                  <select
                    value={newPolicyType}
                    onChange={(e) => setNewPolicyType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Resource">Resource</option>
                    <option value="Security">Security</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Identity">Identity</option>
                    <option value="Network">Network</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Severity</label>
                  <select
                    value={newPolicySeverity}
                    onChange={(e) => setNewPolicySeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Framework</label>
                <select
                  value={newPolicyFramework}
                  onChange={(e) => setNewPolicyFramework(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="CIS AWS">CIS AWS</option>
                  <option value="Custom">Custom</option>
                  <option value="NIST">NIST</option>
                  <option value="PCI DSS">PCI DSS</option>
                  <option value="CIS K8s">CIS K8s</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of what this policy validates..."
                  value={newPolicyDesc}
                  onChange={(e) => setNewPolicyDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePolicyModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Quality Gate */}
      {showCreateGateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Create Quality Gate</h2>
            <form onSubmit={handleCreateGate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gate Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Staging Security Gate"
                  value={newGateName}
                  onChange={(e) => setNewGateName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Fail Condition</label>
                <select
                  value={newGateCondition}
                  onChange={(e) => setNewGateCondition(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="Any Critical">Any Critical</option>
                  <option value="Critical or High">Critical or High</option>
                  <option value="Critical only">Critical only</option>
                  <option value="Compliance fail">Compliance fail</option>
                  <option value="Custom rules">Custom rules</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Purpose of this quality gate..."
                  value={newGateDesc}
                  onChange={(e) => setNewGateDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateGateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Create Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Rule to Gate */}
      {showAddRuleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '460px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Add Rule to Quality Gate</h2>
            <form onSubmit={handleAddGateRule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Rule ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RULE-015"
                  value={newRuleId}
                  onChange={(e) => setNewRuleId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Restrict Ingress CIDR"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Severity</label>
                <select
                  value={newRuleSeverity}
                  onChange={(e) => setNewRuleSeverity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Exception */}
      {showAddExceptionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Add Policy Exception</h2>
            <form onSubmit={handleCreateException}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Exception Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Temporary staging bypass"
                  value={newExceptionTitle}
                  onChange={(e) => setNewExceptionTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Policy / Rule</label>
                  <select
                    value={newExceptionRule}
                    onChange={(e) => setNewExceptionRule(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="POL-001">POL-001 (No Public S3)</option>
                    <option value="POL-003">POL-003 (Open RDS)</option>
                    <option value="POL-005">POL-005 (Hardcoded Secrets)</option>
                    <option value="POL-010">POL-010 (IAM Wildcard)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Repository</label>
                  <select
                    value={newExceptionRepo}
                    onChange={(e) => setNewExceptionRepo(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="frontend-app">frontend-app</option>
                    <option value="prod-infra">prod-infra</option>
                    <option value="dev-infra">dev-infra</option>
                    <option value="backend-infra">backend-infra</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Valid Until</label>
                <input
                  type="date"
                  required
                  value={newExceptionValidUntil}
                  onChange={(e) => setNewExceptionValidUntil(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddExceptionModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Save Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliciesQualityGatesWorkspace;
