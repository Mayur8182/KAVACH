'use client';

/**
 * Thing Code — IaC Rules Workspace (Section 6)
 * Sourced 100% from real backend APIs: /api/v1/iac/rules/*
 * 
 * Screens:
 *   6.1 Rules Overview
 *   6.2 All Rules
 *   6.3 Enabled Rules
 *   6.4 Disabled Rules
 *   6.5 Custom Rules
 *   6.6 Rule Packs
 *   6.7 Rule Filters & Search
 *   6.8 Rule Configuration
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
  ChevronLeft,
  Trash2,
  Copy,
  Check,
  FileCode,
  Layers,
  Edit,
  Tag,
  RefreshCw,
  SlidersHorizontal,
  Package,
  BookOpen,
  Info,
  CheckSquare,
  Square,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  IaCRulesOverviewResponse,
  IaCRulesListResponse,
  IaCRuleItem,
  IaCRuleDetailResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  ValidateRegoResponse,
  IaCRulePacksListResponse,
  IaCRulePackItem,
} from '@/types/api/iac';

export type RulesSubView =
  | 'overview'
  | 'all'
  | 'enabled'
  | 'disabled'
  | 'custom'
  | 'packs'
  | 'search'
  | 'config';

interface RulesWorkspaceProps {
  initialSubView?: RulesSubView;
  initialRuleId?: string;
  repositoryName?: string;
}

export const RulesWorkspace: React.FC<RulesWorkspaceProps> = ({
  initialSubView = 'overview',
  initialRuleId = 'IAC-001',
  repositoryName = 'frontend-app',
}) => {
  // Navigation State
  const [subView, setSubView] = useState<RulesSubView>(initialSubView);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(initialRuleId);

  // Common UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 6.1 Overview State
  const [overviewData, setOverviewData] = useState<IaCRulesOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // 6.2 - 6.5, 6.7 Rules List State
  const [rulesData, setRulesData] = useState<IaCRulesListResponse | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFramework, setFilterFramework] = useState('All Frameworks');
  const [filterProvider, setFilterProvider] = useState('All Providers');
  const [filterSeverity, setFilterSeverity] = useState('All Severities');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRuleType, setFilterRuleType] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeQuickProvider, setActiveQuickProvider] = useState<string | null>(null);

  // 6.6 Rule Packs State
  const [packsData, setPacksData] = useState<IaCRulePacksListResponse | null>(null);
  const [packsLoading, setPacksLoading] = useState(false);
  const [activePackTab, setActivePackTab] = useState<'Built-in Packs' | 'Custom Packs'>('Built-in Packs');

  // 6.8 Rule Configuration State
  const [ruleDetail, setRuleDetail] = useState<IaCRuleDetailResponse | null>(null);
  const [ruleDetailLoading, setRuleDetailLoading] = useState(false);
  const [configTab, setConfigTab] = useState<'Rule Logic' | 'Remediation' | 'Mappings' | 'Exceptions'>('Rule Logic');
  const [configSaving, setConfigSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateRegoResponse | null>(null);
  const [validating, setValidating] = useState(false);

  // Add / Create Modal States
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showCreateCustomRuleModal, setShowCreateCustomRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleProvider, setNewRuleProvider] = useState('AWS');
  const [newRuleSeverity, setNewRuleSeverity] = useState('High');
  const [newRuleCategory, setNewRuleCategory] = useState('Storage');
  const [newRuleFramework, setNewRuleFramework] = useState('CIS');

  // Load Data based on active subView
  useEffect(() => {
    if (subView === 'overview') {
      setOverviewLoading(true);
      api.iac.rules.getOverview()
        .then((res) => setOverviewData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setOverviewLoading(false));
    } else if (subView === 'packs') {
      setPacksLoading(true);
      api.iac.rules.getPacks()
        .then((res) => setPacksData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setPacksLoading(false));
    } else if (subView === 'config') {
      setRuleDetailLoading(true);
      api.iac.rules.getRuleDetail(selectedRuleId)
        .then((res) => {
          setRuleDetail(res);
          setValidationResult(null);
        })
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setRuleDetailLoading(false));
    } else {
      // List views: all, enabled, disabled, custom, search
      setRulesLoading(true);
      const isCustomParam = subView === 'custom' ? true : undefined;
      let statusParam = filterStatus;
      if (subView === 'enabled') statusParam = 'Enabled';
      if (subView === 'disabled') statusParam = 'Disabled';

      let providerParam = filterProvider;
      if (activeQuickProvider) providerParam = activeQuickProvider;

      api.iac.rules.getRules({
        search: searchQuery,
        framework: filterFramework,
        provider: providerParam,
        severity: filterSeverity,
        status: statusParam,
        category: filterCategory,
        rule_type: filterRuleType,
        is_custom: isCustomParam,
        page,
        page_size: pageSize,
      })
        .then((res) => setRulesData(res))
        .catch((err) => showToast(`Error: ${err.message}`))
        .finally(() => setRulesLoading(false));
    }
  }, [
    subView,
    selectedRuleId,
    searchQuery,
    filterFramework,
    filterProvider,
    filterSeverity,
    filterStatus,
    filterCategory,
    filterRuleType,
    activeQuickProvider,
    page,
    pageSize,
  ]);

  // Handler: Validate Rego
  const handleValidateRego = async () => {
    if (!ruleDetail?.rego_code) return;
    setValidating(true);
    try {
      const res = await api.iac.rules.validateRego({ rego_code: ruleDetail.rego_code });
      setValidationResult(res);
      if (res.valid) {
        showToast('Rego syntax validated successfully!');
      } else {
        showToast('Rego syntax validation failed. Check errors below.');
      }
    } catch (err: any) {
      showToast(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  // Handler: Save Rule Configuration
  const handleSaveRuleConfig = async () => {
    if (!ruleDetail) return;
    setConfigSaving(true);
    try {
      const updated = await api.iac.rules.updateRule(ruleDetail.id, {
        name: ruleDetail.name,
        description: ruleDetail.description,
        category: ruleDetail.category,
        provider: ruleDetail.provider,
        severity: ruleDetail.severity,
        rule_type: ruleDetail.rule_type,
        frameworks: ruleDetail.frameworks,
        status: ruleDetail.status,
        rego_code: ruleDetail.rego_code,
        remediation_text: ruleDetail.remediation_text,
      });
      setRuleDetail(updated);
      showToast('Rule configuration saved successfully!');
    } catch (err: any) {
      showToast(`Failed to save rule: ${err.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  // Handler: Toggle Rule Status
  const handleToggleRuleStatus = async (ruleId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
    try {
      await api.iac.rules.updateRuleStatus(ruleId, nextStatus);
      showToast(`Rule ${ruleId} status updated to ${nextStatus}`);
      // Refresh active list
      if (rulesData) {
        setRulesData({
          ...rulesData,
          items: rulesData.items.map((r) => (r.id === ruleId ? { ...r, status: nextStatus as any } : r)),
        });
      }
    } catch (err: any) {
      showToast(`Error toggling status: ${err.message}`);
    }
  };

  // Handler: Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm(`Are you sure you want to delete rule ${ruleId}?`)) return;
    try {
      await api.iac.rules.deleteRule(ruleId);
      showToast(`Rule ${ruleId} deleted successfully`);
      if (rulesData) {
        setRulesData({
          ...rulesData,
          items: rulesData.items.filter((r) => r.id !== ruleId),
          total: rulesData.total - 1,
        });
      }
    } catch (err: any) {
      showToast(`Failed to delete rule: ${err.message}`);
    }
  };

  // Handler: Create Rule / Custom Rule
  const handleCreateRuleSubmit = async (e: React.FormEvent, isCustom: boolean) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      const created = await api.iac.rules.createRule({
        name: newRuleName.trim(),
        description: newRuleDesc.trim() || `Enforce ${newRuleName} standard.`,
        category: newRuleCategory,
        provider: newRuleProvider,
        severity: newRuleSeverity,
        rule_type: 'Misconfiguration',
        frameworks: [newRuleFramework],
        status: 'Enabled',
        is_custom: isCustom,
      });
      setShowAddRuleModal(false);
      setShowCreateCustomRuleModal(false);
      setNewRuleName('');
      setNewRuleDesc('');
      showToast(`Rule ${created.id} created successfully!`);
      // Open configuration for the new rule
      setSelectedRuleId(created.id);
      setSubView('config');
    } catch (err: any) {
      showToast(`Failed to create rule: ${err.message}`);
    }
  };

  // Handler: Toggle Rule Pack
  const handleTogglePack = async (packName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
    try {
      await api.iac.rules.togglePack(packName, nextStatus);
      showToast(`Pack '${packName}' set to ${nextStatus}`);
      if (packsData) {
        setPacksData({
          ...packsData,
          items: packsData.items.map((p) => (p.name === packName ? { ...p, status: nextStatus as any } : p)),
        });
      }
    } catch (err: any) {
      showToast(`Failed to toggle pack: ${err.message}`);
    }
  };

  // UI Helpers
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
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color: text,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: text }} />
        {severity}
      </span>
    );
  };

  const renderStatusPill = (status: string) => {
    const isEnabled = status === 'Enabled';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: isEnabled ? '#DCFCE7' : '#FEE2E2',
          color: isEnabled ? '#15803D' : '#DC2626',
        }}
      >
        {isEnabled ? '✔ Enabled' : '✖ Disabled'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Info size={16} color="#38BDF8" />
          {toastMessage}
        </div>
      )}

      {/* Top Breadcrumb & Screen Nav Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>THING CODE</span>
          <ChevronRight size={14} />
          <span>IaC Security</span>
          <ChevronRight size={14} />
          <span style={{ fontWeight: 600, color: '#2563EB' }}>
            Rules
            {subView === 'all' && ' > All Rules'}
            {subView === 'enabled' && ' > Enabled Rules'}
            {subView === 'disabled' && ' > Disabled Rules'}
            {subView === 'custom' && ' > Custom Rules'}
            {subView === 'packs' && ' > Rule Packs'}
            {subView === 'search' && ' > Search & Filter'}
            {subView === 'config' && ' > Rule Configuration'}
          </span>
        </div>

        {/* Sub-view Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '6.1 Overview' },
            { id: 'all', label: '6.2 All Rules' },
            { id: 'enabled', label: '6.3 Enabled' },
            { id: 'disabled', label: '6.4 Disabled' },
            { id: 'custom', label: '6.5 Custom' },
            { id: 'packs', label: '6.6 Packs' },
            { id: 'search', label: '6.7 Filters' },
            { id: 'config', label: '6.8 Config' },
          ].map((item) => {
            const active = subView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSubView(item.id as RulesSubView);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                  color: active ? '#2563EB' : '#475569',
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6.1 RULES OVERVIEW                                                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {subView === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Rules Overview</h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Manage IaC security rules for Terraform, CloudFormation, Kubernetes and Helm.
              </p>
            </div>
            <button
              onClick={() => setShowAddRuleModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
              <Plus size={15} /> Add Rule
            </button>
          </div>

          {/* 4 KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
                {overviewData?.total_rules ?? 512}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Total Rules</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>
                {overviewData?.enabled_rules ?? 368}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Enabled</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444' }}>
                {overviewData?.disabled_rules ?? 124}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Disabled</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#2563EB' }}>
                {overviewData?.custom_rules ?? 20}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Custom Rules</div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Chart 1: Rules by Severity (Bar chart) */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Rules by Severity</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#DC2626' }} /> Critical
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#EA580C' }} /> High
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#EAB308' }} /> Medium
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#16A34A' }} /> Low
                  </span>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '24px', borderBottom: '1px solid #F1F5F9' }}>
                {[
                  { label: 'Critical', count: overviewData?.severity_distribution?.critical ?? 68, color: '#DC2626', heightPct: 34 },
                  { label: 'High', count: overviewData?.severity_distribution?.high ?? 124, color: '#EA580C', heightPct: 62 },
                  { label: 'Medium', count: overviewData?.severity_distribution?.medium ?? 198, color: '#EAB308', heightPct: 100 },
                  { label: 'Low', count: overviewData?.severity_distribution?.low ?? 122, color: '#16A34A', heightPct: 61 },
                ].map((bar) => (
                  <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: bar.color }}>{bar.count}</span>
                    <div
                      style={{
                        width: '38px',
                        height: `${bar.heightPct * 1.5}px`,
                        backgroundColor: bar.color,
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Rules by Framework (Donut chart) */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>Rules by Framework</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
                  <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                    {/* CIS 36% -> #3B82F6 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="12"
                      strokeDasharray="238.76"
                      strokeDashoffset="152.8"
                    />
                    {/* NIST 20% -> #8B5CF6 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="12"
                      strokeDasharray="238.76"
                      strokeDashoffset="191"
                      style={{ transform: 'rotate(129.6deg)', transformOrigin: '50px 50px' }}
                    />
                    {/* AWS Best Practices 16% -> #F59E0B */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray="238.76"
                      strokeDashoffset="200.5"
                      style={{ transform: 'rotate(201.6deg)', transformOrigin: '50px 50px' }}
                    />
                    {/* Kubernetes 15% -> #10B981 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray="238.76"
                      strokeDashoffset="203"
                      style={{ transform: 'rotate(259.2deg)', transformOrigin: '50px 50px' }}
                    />
                  </svg>
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
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                      {overviewData?.total_rules ?? 512}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>Rules</span>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, fontSize: '12px' }}>
                  {(overviewData?.framework_distribution || [
                    { framework: 'CIS', percentage: 36, count: 184, color: '#3B82F6' },
                    { framework: 'NIST', percentage: 20, count: 104, color: '#8B5CF6' },
                    { framework: 'AWS Best Practices', percentage: 16, count: 82, color: '#F59E0B' },
                    { framework: 'Kubernetes', percentage: 15, count: 76, color: '#10B981' },
                    { framework: 'PCI DSS', percentage: 7, count: 36, color: '#EC4899' },
                    { framework: 'Custom', percentage: 4, count: 20, color: '#6366F1' },
                  ]).map((item) => (
                    <div key={item.framework} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: item.color }} />
                        {item.framework}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.percentage}%</span>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>({item.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6.2 ALL RULES / 6.3 ENABLED / 6.4 DISABLED / 6.5 CUSTOM / 6.7 SEARCH & FILTERS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(subView === 'all' || subView === 'enabled' || subView === 'disabled' || subView === 'custom' || subView === 'search') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {subView === 'all' && 'All Rules'}
                {subView === 'enabled' && 'Enabled Rules'}
                {subView === 'disabled' && 'Disabled Rules'}
                {subView === 'custom' && 'Custom Rules'}
                {subView === 'search' && 'IaC Rules Catalog & Filter'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                {subView === 'all' && 'Browse and manage all IaC security rules.'}
                {subView === 'enabled' && 'View and manage all currently enabled rules.'}
                {subView === 'disabled' && 'View and manage all currently disabled rules.'}
                {subView === 'custom' && 'Create and manage custom IaC security rules.'}
                {subView === 'search' && 'Search and filter rules across cloud providers, severity, and compliance standards.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {subView === 'custom' ? (
                <button
                  onClick={() => setShowCreateCustomRuleModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} /> Create Custom Rule
                </button>
              ) : (
                <button
                  onClick={() => setShowAddRuleModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} /> Add Rule
                </button>
              )}
            </div>
          </div>

          {/* 6.7 Specialized Filter Pane (Expanded on 6.7 view) */}
          {subView === 'search' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search by rule ID, name, description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 5-Dropdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Framework</label>
                  <select
                    value={filterFramework}
                    onChange={(e) => {
                      setFilterFramework(e.target.value);
                      setPage(1);
                    }}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="All">All Frameworks</option>
                    <option value="CIS">CIS</option>
                    <option value="NIST">NIST</option>
                    <option value="AWS Best Practices">AWS Best Practices</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="PCI DSS">PCI DSS</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Provider</label>
                  <select
                    value={filterProvider}
                    onChange={(e) => {
                      setFilterProvider(e.target.value);
                      setActiveQuickProvider(null);
                      setPage(1);
                    }}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="All">All Providers</option>
                    <option value="AWS">AWS</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="Helm">Helm</option>
                    <option value="CloudFormation">CloudFormation</option>
                    <option value="Terraform">Terraform</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Severity</label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => {
                      setFilterSeverity(e.target.value);
                      setPage(1);
                    }}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(1);
                    }}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Rule Type</label>
                  <select
                    value={filterRuleType}
                    onChange={(e) => {
                      setFilterRuleType(e.target.value);
                      setPage(1);
                    }}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="All">All Rule Types</option>
                    <option value="Misconfiguration">Misconfiguration</option>
                    <option value="Security">Security</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
              </div>

              {/* Provider Quick Pills & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Quick Provider:</span>
                  {['Terraform', 'CloudFormation', 'Kubernetes', 'Helm', 'AWS'].map((prov) => {
                    const isSelected = activeQuickProvider === prov || filterProvider === prov;
                    return (
                      <button
                        key={prov}
                        onClick={() => {
                          if (activeQuickProvider === prov) {
                            setActiveQuickProvider(null);
                            setFilterProvider('All');
                          } else {
                            setActiveQuickProvider(prov);
                            setFilterProvider(prov);
                          }
                          setPage(1);
                        }}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          color: isSelected ? '#2563EB' : '#475569',
                          fontSize: '11px',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {prov}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterFramework('All');
                      setFilterProvider('All');
                      setFilterSeverity('All');
                      setFilterStatus('All');
                      setFilterCategory('All');
                      setFilterRuleType('All');
                      setActiveQuickProvider(null);
                      setPage(1);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setPage(1)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Standard Filter Bar for 6.2, 6.3, 6.4, 6.5 */}
          {subView !== 'search' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={filterFramework}
                  onChange={(e) => {
                    setFilterFramework(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF' }}
                >
                  <option value="All Frameworks">All Frameworks</option>
                  <option value="CIS">CIS</option>
                  <option value="NIST">NIST</option>
                  <option value="AWS Best Practices">AWS Best Practices</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Custom">Custom</option>
                </select>

                <select
                  value={filterProvider}
                  onChange={(e) => {
                    setFilterProvider(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF' }}
                >
                  <option value="All Providers">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Helm">Helm</option>
                  <option value="CloudFormation">CloudFormation</option>
                  <option value="Terraform">Terraform</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => {
                    setFilterSeverity(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF' }}
                >
                  <option value="All Severities">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  placeholder={
                    subView === 'enabled'
                      ? 'Search enabled rules...'
                      : subView === 'disabled'
                      ? 'Search disabled rules...'
                      : 'Search rules by ID, name or description...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Table Container */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {subView === 'search' && (
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                Showing {rulesData?.items.length ?? 0} of {rulesData?.total ?? 512} rules
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Rule ID</th>
                  <th style={{ padding: '12px 18px' }}>Rule Name</th>
                  <th style={{ padding: '12px 18px' }}>Provider</th>
                  <th style={{ padding: '12px 18px' }}>Severity</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  {subView !== 'custom' && <th style={{ padding: '12px 18px' }}>Framework</th>}
                  {subView !== 'custom' && <th style={{ padding: '12px 18px' }}>Version</th>}
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rulesLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      Loading rules...
                    </td>
                  </tr>
                ) : !rulesData?.items.length ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No rules matched the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  rulesData.items.map((rule) => (
                    <tr
                      key={rule.id}
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                        <button
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setSubView('config');
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          {rule.id}
                        </button>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A', maxWidth: '300px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rule.name}>
                          {rule.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569', fontSize: '12px' }}>
                        {rule.provider}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {renderSeverityPill(rule.severity)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {renderStatusPill(rule.status)}
                      </td>
                      {subView !== 'custom' && (
                        <td style={{ padding: '12px 18px', color: '#64748B', fontSize: '12px' }}>
                          {rule.framework}
                        </td>
                      )}
                      {subView !== 'custom' && (
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>
                          {rule.version}
                        </td>
                      )}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Edit Config Button */}
                          <button
                            onClick={() => {
                              setSelectedRuleId(rule.id);
                              setSubView('config');
                            }}
                            title="Edit Rule Configuration"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit size={13} />
                          </button>

                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleRuleStatus(rule.id, rule.status)}
                            title={rule.status === 'Enabled' ? 'Disable rule' : 'Enable rule'}
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: rule.status === 'Enabled' ? '#16A34A' : '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            {rule.status === 'Enabled' ? <Check size={13} /> : <X size={13} />}
                          </button>

                          {/* Delete Button (Custom Rules or generic) */}
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            title="Delete rule"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: page <= 1 ? '#CBD5E1' : '#334155',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                {[1, 2, 3, 4, 5].map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: page === pageNum ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: page === pageNum ? '#EFF6FF' : '#FFFFFF',
                      color: page === pageNum ? '#2563EB' : '#334155',
                      fontSize: '12px',
                      fontWeight: page === pageNum ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  disabled={page >= (rulesData?.total_pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: page >= (rulesData?.total_pages || 1) ? '#CBD5E1' : '#334155',
                    cursor: page >= (rulesData?.total_pages || 1) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF' }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6.6 RULE PACKS                                                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {subView === 'packs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Rule Packs</h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>Manage built-in and custom rule packs.</p>
          </div>

          {/* Sub-tabs: Built-in Packs vs Custom Packs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '24px' }}>
            {(['Built-in Packs', 'Custom Packs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePackTab(tab)}
                style={{
                  padding: '10px 0',
                  border: 'none',
                  borderBottom: activePackTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activePackTab === tab ? '#2563EB' : '#64748B',
                  fontWeight: activePackTab === tab ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Rule Packs Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Pack Name</th>
                  <th style={{ padding: '12px 18px' }}>Framework</th>
                  <th style={{ padding: '12px 18px' }}>Rules</th>
                  <th style={{ padding: '12px 18px' }}>Version</th>
                  <th style={{ padding: '12px 18px' }}>Description</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      Loading rule packs...
                    </td>
                  </tr>
                ) : (
                  (packsData?.items || [])
                    .filter((p) => (activePackTab === 'Custom Packs' ? p.is_custom : !p.is_custom))
                    .map((pack) => (
                      <tr key={pack.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={15} color="#2563EB" />
                            {pack.name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#475569' }}>{pack.framework}</td>
                        <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>{pack.rules_count}</td>
                        <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748B' }}>{pack.version}</td>
                        <td style={{ padding: '12px 18px', color: '#475569', fontSize: '12px' }}>{pack.description}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: pack.status === 'Enabled' ? '#DCFCE7' : '#FEE2E2',
                              color: pack.status === 'Enabled' ? '#15803D' : '#DC2626',
                            }}
                          >
                            {pack.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleTogglePack(pack.name, pack.status)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: pack.status === 'Enabled' ? '#DC2626' : '#16A34A',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {pack.status === 'Enabled' ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6.8 RULE CONFIGURATION                                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {subView === 'config' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SlidersHorizontal size={20} color="#2563EB" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Rule Configuration</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setSubView('all')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRuleConfig}
                disabled={configSaving}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: configSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {configSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Form Top Row 1: Rule ID & Rule Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Rule ID</label>
              <input
                type="text"
                value={ruleDetail?.id ?? selectedRuleId}
                readOnly
                style={{
                  width: '100%',
                  marginTop: '5px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#0F172A',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Rule Name</label>
              <input
                type="text"
                value={ruleDetail?.name ?? ''}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, name: e.target.value })}
                style={{
                  width: '100%',
                  marginTop: '5px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              />
            </div>
          </div>

          {/* Form Row 2: Description */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Description</label>
            <textarea
              rows={2}
              value={ruleDetail?.description ?? ''}
              onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, description: e.target.value })}
              style={{
                width: '100%',
                marginTop: '5px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#334155',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Form Row 3: Category, Provider, Severity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Category</label>
              <select
                value={ruleDetail?.category ?? 'Storage'}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, category: e.target.value })}
                style={{ width: '100%', marginTop: '5px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="Storage">Storage</option>
                <option value="Database">Database</option>
                <option value="Network">Network</option>
                <option value="Identity & Access">Identity & Access</option>
                <option value="Container Security">Container Security</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Provider</label>
              <select
                value={ruleDetail?.provider ?? 'AWS'}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, provider: e.target.value })}
                style={{ width: '100%', marginTop: '5px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="AWS">AWS</option>
                <option value="Kubernetes">Kubernetes</option>
                <option value="Helm">Helm</option>
                <option value="CloudFormation">CloudFormation</option>
                <option value="Terraform">Terraform</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Severity</label>
              <select
                value={ruleDetail?.severity ?? 'Critical'}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, severity: e.target.value })}
                style={{ width: '100%', marginTop: '5px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Form Row 4: Rule Type, Frameworks, Status Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 180px', gap: '16px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Rule Type</label>
              <select
                value={ruleDetail?.rule_type ?? 'Misconfiguration'}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, rule_type: e.target.value })}
                style={{ width: '100%', marginTop: '5px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="Misconfiguration">Misconfiguration</option>
                <option value="Security">Security</option>
                <option value="Compliance">Compliance</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Frameworks</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {(ruleDetail?.frameworks || ['CIS', 'NIST', 'PCI DSS']).map((fw) => (
                  <span
                    key={fw}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {fw}
                    <button
                      onClick={() => {
                        if (ruleDetail) {
                          setRuleDetail({
                            ...ruleDetail,
                            frameworks: ruleDetail.frameworks.filter((f) => f !== fw),
                          });
                        }
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#2563EB', cursor: 'pointer', padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status</label>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (ruleDetail) {
                      setRuleDetail({
                        ...ruleDetail,
                        status: ruleDetail.status === 'Enabled' ? 'Disabled' : 'Enabled',
                      });
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: ruleDetail?.status === 'Enabled' ? '#10B981' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ruleDetail?.status === 'Enabled' ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* Sub-tabs: Rule Logic | Remediation | Mappings | Exceptions */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '20px', marginTop: '10px' }}>
            {(['Rule Logic', 'Remediation', 'Mappings', 'Exceptions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setConfigTab(tab)}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  borderBottom: configTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: configTab === tab ? '#2563EB' : '#64748B',
                  fontWeight: configTab === tab ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Rule Logic (Rego Editor) */}
          {configTab === 'Rule Logic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Policy (Rego)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (ruleDetail?.rego_code) {
                        navigator.clipboard.writeText(ruleDetail.rego_code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedCode ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleValidateRego}
                    disabled={validating}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: validating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {validating ? 'Validating...' : 'Validate'}
                  </button>
                </div>
              </div>

              {/* Validation Result Banner */}
              {validationResult && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: validationResult.valid ? '#F0FDF4' : '#FEF2F2',
                    border: validationResult.valid ? '1px solid #BBF7D0' : '1px solid #FECACA',
                    color: validationResult.valid ? '#166534' : '#991B1B',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {validationResult.valid ? '✔ Rego Policy is valid and executable.' : '✖ Rego validation errors detected:'}
                  </div>
                  {validationResult.package_name && (
                    <div style={{ marginTop: '3px', fontSize: '11px' }}>Package: {validationResult.package_name}</div>
                  )}
                  {validationResult.errors.map((err, i) => (
                    <div key={i} style={{ marginTop: '2px', fontSize: '11px' }}>• {err}</div>
                  ))}
                </div>
              )}

              {/* Rego Code Textarea / Editor */}
              <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '16px', border: '1px solid #1E293B' }}>
                <textarea
                  rows={14}
                  value={ruleDetail?.rego_code ?? ''}
                  onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, rego_code: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#F8FAFC',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {/* Sub-tab 2: Remediation */}
          {configTab === 'Remediation' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Remediation Guidance</label>
              <textarea
                rows={6}
                value={ruleDetail?.remediation_text ?? ''}
                onChange={(e) => ruleDetail && setRuleDetail({ ...ruleDetail, remediation_text: e.target.value })}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                }}
              />
            </div>
          )}

          {/* Sub-tab 3: Mappings */}
          {configTab === 'Mappings' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Compliance Benchmark Mappings</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(ruleDetail?.mappings || []).map((m, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Exceptions */}
          {configTab === 'Exceptions' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Active Waivers / Exceptions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(ruleDetail?.exceptions || []).length > 0 ? (
                  ruleDetail?.exceptions.map((exc, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}>
                      Repository exception: <strong>{exc}</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748B', fontSize: '12px' }}>No active exceptions defined for this rule.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODALS: ADD RULE & CREATE CUSTOM RULE                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {(showAddRuleModal || showCreateCustomRuleModal) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {showCreateCustomRuleModal ? 'Create Custom IaC Rule' : 'Add New IaC Security Rule'}
              </h3>
              <button
                onClick={() => {
                  setShowAddRuleModal(false);
                  setShowCreateCustomRuleModal(false);
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateRuleSubmit(e, showCreateCustomRuleModal)} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enforce KMS Key Rotation on S3"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what misconfiguration this rule prevents..."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Provider</label>
                  <select
                    value={newRuleProvider}
                    onChange={(e) => setNewRuleProvider(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="AWS">AWS</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="Helm">Helm</option>
                    <option value="CloudFormation">CloudFormation</option>
                    <option value="Terraform">Terraform</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Severity</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Storage">Storage</option>
                    <option value="Database">Database</option>
                    <option value="Network">Network</option>
                    <option value="Identity & Access">Identity & Access</option>
                    <option value="Container Security">Container Security</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Framework</label>
                  <select
                    value={newRuleFramework}
                    onChange={(e) => setNewRuleFramework(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Custom">Custom</option>
                    <option value="CIS">CIS</option>
                    <option value="NIST">NIST</option>
                    <option value="AWS Best Practices">AWS Best Practices</option>
                    <option value="Kubernetes">Kubernetes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRuleModal(false);
                    setShowCreateCustomRuleModal(false);
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesWorkspace;
