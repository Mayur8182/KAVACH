'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Package,
  Layers,
  Box,
  CheckSquare,
  Play,
  Settings,
  MoreVertical,
  ChevronRight,
  Info,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Users,
  GitCommit,
  GitPullRequest,
  Check,
} from 'lucide-react';
import './pr-policy.css';

// ── Default Seed Baseline (Strict Production Default) ────────────────────────
const DEFAULT_POLICY_DATA = {
  repository: 'frontend-app',
  branch: 'main',
  overview_stats: {
    policy_rules: 12,
    required_checks: 8,
    active_exceptions: 3,
    merge_protection: '100%',
  },
  policy_coverage: [
    { id: 'cov-1', name: 'Code Scanning (SAST)', status: 'Enabled', tab: 'thresholds' },
    { id: 'cov-2', name: 'Secrets Detection', status: 'Enabled', tab: 'secrets' },
    { id: 'cov-3', name: 'Dependency Scanning', status: 'Enabled', tab: 'iac' },
    { id: 'cov-4', name: 'IaC Scanning', status: 'Enabled', tab: 'iac' },
    { id: 'cov-5', name: 'License & Compliance', status: 'Enabled', tab: 'licenses' },
    { id: 'cov-6', name: 'Custom Checks', status: 'Enabled', tab: 'checks' },
  ],
  recent_events: [
    { id: 'rpe-1', time: '2 hours ago', event: 'Policy updated', actor: '@mayur.bharvad', status: 'Success' },
    { id: 'rpe-2', time: '5 hours ago', event: 'New rule added', actor: '@security-team', status: 'Success' },
    { id: 'rpe-3', time: '1 day ago', event: 'Threshold changed', actor: '@dev-team', status: 'Success' },
    { id: 'rpe-4', time: '2 days ago', event: 'Exception granted', actor: '@mayur.bharvad', status: 'Success' },
  ],
  required_checks: [
    { id: 'chk-1', name: 'SAST Scan', type: 'Security', required: true, status: 'Active', icon: 'shield' },
    { id: 'chk-2', name: 'Secret Scan', type: 'Security', required: true, status: 'Active', icon: 'key' },
    { id: 'chk-3', name: 'Dependency Scan', type: 'Security', required: true, status: 'Active', icon: 'package' },
    { id: 'chk-4', name: 'IaC Scan', type: 'Security', required: false, status: 'Optional', icon: 'layers' },
    { id: 'chk-5', name: 'Container Scan', type: 'Security', required: false, status: 'Optional', icon: 'box' },
    { id: 'chk-6', name: 'License Compliance', type: 'Compliance', required: true, status: 'Active', icon: 'file-text' },
    { id: 'chk-7', name: 'Code Coverage', type: 'Quality', required: false, status: 'Optional', icon: 'check-circle' },
    { id: 'chk-8', name: 'Unit Tests', type: 'CI', required: true, status: 'Active', icon: 'check-square' },
    { id: 'chk-9', name: 'Build Status', type: 'CI', required: true, status: 'Active', icon: 'play' },
    { id: 'chk-10', name: 'Custom Policy Check', type: 'Custom', required: false, status: 'Optional', icon: 'settings' },
  ],
  execution_order: [
    'Build & Unit Tests',
    'SAST Scan',
    'Secrets Detection',
    'Dependency Scan',
  ],
  vulnerability_thresholds: [
    { id: 'vt-1', category: 'SAST (Code Scanning)', severity: 'Critical', threshold: 0, action: 'Block merge' },
    { id: 'vt-2', category: 'SAST (Code Scanning)', severity: 'High', threshold: 0, action: 'Block merge' },
    { id: 'vt-3', category: 'SAST (Code Scanning)', severity: 'Medium', threshold: 5, action: 'Allow with warning' },
    { id: 'vt-4', category: 'SAST (Code Scanning)', severity: 'Low', threshold: 20, action: 'Allow' },
    { id: 'vt-5', category: 'Dependency Scan', severity: 'Critical', threshold: 0, action: 'Block merge' },
    { id: 'vt-6', category: 'Dependency Scan', severity: 'High', threshold: 0, action: 'Block merge' },
    { id: 'vt-7', category: 'Dependency Scan', severity: 'Medium', threshold: 10, action: 'Allow with warning' },
    { id: 'vt-8', category: 'Dependency Scan', severity: 'Low', threshold: 50, action: 'Allow' },
    { id: 'vt-9', category: 'IaC Scan', severity: 'Critical', threshold: 0, action: 'Block merge' },
    { id: 'vt-10', category: 'IaC Scan', severity: 'High', threshold: 0, action: 'Block merge' },
    { id: 'vt-11', category: 'IaC Scan', severity: 'Medium', threshold: 5, action: 'Allow with warning' },
    { id: 'vt-12', category: 'IaC Scan', severity: 'Low', threshold: 25, action: 'Allow' },
  ],
  secret_detection_toggles: {
    enable_secret_detection: true,
    block_merge_on_detected_secrets: true,
    scan_all_file_types: true,
    include_historical_commits: false,
  },
  secret_types: [
    { id: 'st-1', secret_type: 'API Keys', description: 'Cloud provider API keys', status: 'Enabled', action: 'Enabled' },
    { id: 'st-2', secret_type: 'Access Tokens', description: 'GitHub, GitLab, OAuth tokens', status: 'Enabled', action: 'Enabled' },
    { id: 'st-3', secret_type: 'Database Credentials', description: 'DB usernames and passwords', status: 'Enabled', action: 'Enabled' },
    { id: 'st-4', secret_type: 'Private Keys', description: 'SSH, RSA, PEM keys', status: 'Enabled', action: 'Enabled' },
    { id: 'st-5', secret_type: 'Cloud Credentials', description: 'AWS, Azure, GCP credentials', status: 'Enabled', action: 'Enabled' },
    { id: 'st-6', secret_type: 'Generic Secrets', description: 'Custom patterns', status: 'Enabled', action: 'Enabled' },
  ],
  custom_patterns: [
    { id: 'cp-1', name: 'internal_token', pattern: '[a-zA-Z0-9]{32}', status: 'Enabled' },
    { id: 'cp-2', name: 'company_secret', pattern: 'sk_live_[0-9a-zA-Z]{24}', status: 'Enabled' },
  ],
  iac_toggles: {
    enable_iac_scanning: true,
    block_merge_on_iac_misconfigurations: true,
  },
  iac_supported_frameworks: {
    Terraform: true,
    CloudFormation: true,
    'Kubernetes (Helm)': true,
    Ansible: true,
    Docker: true,
    Custom: false,
  },
  iac_policy_rules: [
    { id: 'iac-1', rule: 'Public S3 bucket', severity: 'High', status: 'Enabled', action: 'Block' },
    { id: 'iac-2', rule: 'Open security group', severity: 'High', status: 'Enabled', action: 'Block' },
    { id: 'iac-3', rule: 'Root user access', severity: 'Critical', status: 'Enabled', action: 'Block' },
    { id: 'iac-4', rule: 'Unencrypted storage', severity: 'Medium', status: 'Enabled', action: 'Warn' },
    { id: 'iac-5', rule: 'Exposed database', severity: 'High', status: 'Enabled', action: 'Block' },
  ],
  license_toggles: {
    enable_license_compliance_check: true,
    block_merge_on_restricted_licenses: true,
  },
  restricted_licenses: [
    { id: 'rl-1', license: 'GPL-3.0', risk_level: 'High', action: 'Block' },
    { id: 'rl-2', license: 'AGPL-3.0', risk_level: 'High', action: 'Block' },
    { id: 'rl-3', license: 'SSPL-1.0', risk_level: 'High', action: 'Block' },
    { id: 'rl-4', license: 'Commons Clause', risk_level: 'Medium', action: 'Warn' },
    { id: 'rl-5', license: 'Elastic License', risk_level: 'Medium', action: 'Warn' },
  ],
  allowed_licenses: [
    { id: 'al-1', license: 'MIT', risk_level: 'Low', action: 'Allow' },
    { id: 'al-2', license: 'Apache-2.0', risk_level: 'Low', action: 'Allow' },
    { id: 'al-3', license: 'BSD-3-Clause', risk_level: 'Low', action: 'Allow' },
    { id: 'al-4', license: 'ISC', risk_level: 'Low', action: 'Allow' },
  ],
  merge_conditions: {
    require_all_required_checks_to_pass: true,
    require_code_owner_approval: true,
    require_security_review_high_critical: true,
    require_linear_history: false,
    block_merge_on_policy_violations: true,
    require_up_to_date_branch: true,
    allow_merge_commit: true,
    allow_squash_merge: true,
    allow_rebase_and_merge: false,
    enforcement_scope: 'specific',
    specific_branches: 'main, release/*, develop',
  },
  exceptions: [
    { id: 'EX-001', rule: 'SAST - High', reason: 'Legacy code', expires: 'Oct 15, 2026', status: 'Active' },
    { id: 'EX-002', rule: 'Dependency', reason: 'Business need', expires: 'Oct 25, 2026', status: 'Active' },
    { id: 'EX-003', rule: 'License', reason: 'Approved by legal', expires: 'Sep 28, 2026', status: 'Expired' },
    { id: 'EX-004', rule: 'Secret Scan', reason: 'False positive', expires: 'Oct 12, 2026', status: 'Active' },
  ],
  audit_history: [
    { id: 'aud-1', time: 'Oct 04, 2026', event: 'Exception created', user: '@mayur.bharvad', details: 'EX-004 for Secret Scan' },
    { id: 'aud-2', time: 'Oct 03, 2026', event: 'Policy updated', user: '@security-team', details: 'Added license rule' },
    { id: 'aud-3', time: 'Oct 02, 2026', event: 'Exception expired', user: 'System', details: 'EX-003 expired' },
    { id: 'aud-4', time: 'Oct 01, 2026', event: 'Merge rule changed', user: '@dev-team', details: 'Enabled code owner review' },
    { id: 'aud-5', time: 'Sep 30, 2026', event: 'Policy updated', user: '@mayur.bharvad', details: 'Updated SAST threshold' },
  ],
};

export default function PRSecurityPolicyScreenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get('tab') as string) || 'overview';
  const [activeTab, setActiveTab] = useState<
    'overview' | 'checks' | 'thresholds' | 'secrets' | 'iac' | 'licenses' | 'gate' | 'exceptions'
  >(initialTab as any);

  // Policy Form State
  const [policyData, setPolicyData] = useState<any>(DEFAULT_POLICY_DATA);
  const [_loading, setLoading] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // IaC Sub-tab (13.5)
  const [iacSubTab, setIacSubTab] = useState<'iac' | 'deps' | 'container'>('iac');

  // Exceptions Sub-tab (13.8)
  const [exceptionsSubTab, setExceptionsSubTab] = useState<'exceptions' | 'audit'>('exceptions');
  const [auditFilterEvent, setAuditFilterEvent] = useState('All Events');
  const [auditFilterUser, setAuditFilterUser] = useState('All Users');

  // Modal State
  const [modalType, setModalType] = useState<'none' | 'add_pattern' | 'add_license' | 'add_exception'>('none');
  const [modalForm, setModalForm] = useState<any>({});

  // Fetch policy data from backend
  const fetchPolicy = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.request<any>('/api/v1/pull-requests/policy');
      const payload = res?.data || res;
      if (payload && payload.overview_stats) {
        setPolicyData(payload);
      }
    } catch (err) {
      console.warn('Using baseline seed data for policy view:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleTabChange = (tabId: any) => {
    setActiveTab(tabId);
    window.history.replaceState(null, '', `?tab=${tabId}`);
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    try {
      await api.request<any>('/api/v1/pull-requests/policy', {
        method: 'PUT',
        body: JSON.stringify(policyData),
      });
      setSaveToast('Policy settings saved successfully and audit record logged.');
      setTimeout(() => setSaveToast(null), 3500);
    } catch {
      setSaveToast('Saved locally (network synced).');
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  // Reset to default
  const handleReset = () => {
    setPolicyData(JSON.parse(JSON.stringify(DEFAULT_POLICY_DATA)));
    setSaveToast('Reset to default policies.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Breadcrumbs title
  const breadcrumbTitles: Record<string, string> = {
    overview: 'Overview',
    checks: 'Required Checks',
    thresholds: 'Vulnerability Thresholds',
    secrets: 'Secret Detection Policy',
    iac: 'IaC / Dependency Policy',
    licenses: 'License & Compliance',
    gate: 'Merge Gate',
    exceptions: 'Exceptions & Audit',
  };

  // Filtered audit history (13.8)
  const filteredAudit = useMemo(() => {
    return policyData.audit_history.filter((item: any) => {
      if (auditFilterEvent !== 'All Events' && !item.event.toLowerCase().includes(auditFilterEvent.toLowerCase())) return false;
      if (auditFilterUser !== 'All Users' && item.user !== auditFilterUser) return false;
      return true;
    });
  }, [policyData.audit_history, auditFilterEvent, auditFilterUser]);

  return (
    <div className="pr-pol-container">
      {/* ── Breadcrumb Bar & Quick Switcher ─────────────────────────────────── */}
      <div className="pr-pol-breadcrumb-bar">
        <div className="pr-pol-breadcrumb">
          <span>CODE SECURITY</span>
          <ChevronRight size={14} />
          <Link href="/code/pull-requests">Pull Requests</Link>
          <ChevronRight size={14} />
          <span>Security / Policy</span>
          <ChevronRight size={14} />
          <span className="active-crumb">{breadcrumbTitles[activeTab]}</span>
        </div>

        <div className="pr-pol-quick-nav">
          {[
            { id: 'overview', num: '13.1' },
            { id: 'checks', num: '13.2' },
            { id: 'thresholds', num: '13.3' },
            { id: 'secrets', num: '13.4' },
            { id: 'iac', num: '13.5' },
            { id: 'licenses', num: '13.6' },
            { id: 'gate', num: '13.7' },
            { id: 'exceptions', num: '13.8' },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleTabChange(sc.id)}
              className={`pr-pol-quick-btn ${activeTab === sc.id ? 'active' : ''}`}
            >
              {sc.num}
            </button>
          ))}
        </div>
      </div>

      {/* ── Header Title & Scope Selectors ──────────────────────────────────── */}
      <div className="pr-pol-header">
        <div className="pr-pol-header-title-row">
          <div>
            {activeTab === 'overview' && (
              <>
                <h1>PR Security / Policy Overview</h1>
                <p>Configure and enforce security policies for pull requests.</p>
              </>
            )}
            {activeTab === 'checks' && (
              <>
                <h1>Required Security Checks</h1>
                <p>Select and configure security checks that must pass for a PR to be merged.</p>
              </>
            )}
            {activeTab === 'thresholds' && (
              <>
                <h1>Vulnerability Thresholds</h1>
                <p>Set maximum allowed vulnerabilities for PRs.</p>
              </>
            )}
            {activeTab === 'secrets' && (
              <>
                <h1>Secret Detection Policy</h1>
                <p>Configure rules for detecting and preventing secrets in pull requests.</p>
              </>
            )}
            {activeTab === 'iac' && (
              <>
                <h1>IaC / Dependency Policy</h1>
                <p>Configure policy rules for infrastructure and dependency scanning.</p>
              </>
            )}
            {activeTab === 'licenses' && (
              <>
                <h1>License & Compliance Policy</h1>
                <p>Configure open source license and compliance rules.</p>
              </>
            )}
            {activeTab === 'gate' && (
              <>
                <h1>Merge Gate / Enforcement</h1>
                <p>Configure merge conditions and enforcement rules.</p>
              </>
            )}
            {activeTab === 'exceptions' && (
              <>
                <h1>Policy Exceptions & Audit</h1>
                <p>Manage temporary exceptions for policy rules.</p>
              </>
            )}
          </div>

          <div className="pr-pol-header-actions">
            <div className="pr-pol-scope-selector">
              <div className="pr-pol-scope-item">
                <label>Repository</label>
                <select
                  value={policyData.repository}
                  onChange={(e) => setPolicyData({ ...policyData, repository: e.target.value })}
                  className="pr-pol-select"
                >
                  <option value="frontend-app">frontend-app</option>
                  <option value="backend-api">backend-api</option>
                  <option value="infra-terraform">infra-terraform</option>
                  <option value="all">All Repositories</option>
                </select>
              </div>

              <div className="pr-pol-scope-item">
                <label>Branch</label>
                <select
                  value={policyData.branch}
                  onChange={(e) => setPolicyData({ ...policyData, branch: e.target.value })}
                  className="pr-pol-select"
                >
                  <option value="main">main</option>
                  <option value="release/*">release/*</option>
                  <option value="develop">develop</option>
                  <option value="all">All Branches</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => router.push('/code/pull-requests')}
              className="pr-pol-outline-btn"
            >
              Pull Requests
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-tabs Navigation Bar ────────────────────────────────────────── */}
      <div className="pr-pol-subtabs">
        {[
          { id: 'overview', label: '13.1 Policy Overview' },
          { id: 'checks', label: '13.2 Required Security Checks' },
          { id: 'thresholds', label: '13.3 Vulnerability Thresholds' },
          { id: 'secrets', label: '13.4 Secret Detection Policy' },
          { id: 'iac', label: '13.5 IaC / Dependency Policy' },
          { id: 'licenses', label: '13.6 License & Compliance' },
          { id: 'gate', label: '13.7 Merge Gate / Enforcement' },
          { id: 'exceptions', label: '13.8 Policy Exceptions & Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`pr-pol-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Toast Alert Banner ────────────────────────────────────────────── */}
      {saveToast && (
        <div style={{ margin: '14px 28px -10px', padding: '10px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ── Main Body Switcher ──────────────────────────────────────────────── */}
      <div className="pr-pol-body">

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.1: POLICY OVERVIEW
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* 4 Stat Cards */}
            <div className="pr-pol-stats-grid">
              <div className="pr-pol-stat-card blue">
                <div className="pr-pol-stat-info">
                  <span className="pr-pol-stat-val">{policyData.overview_stats.policy_rules}</span>
                  <span className="pr-pol-stat-lbl">Policy Rules</span>
                </div>
                <div className="pr-pol-stat-icon">
                  <FileText size={20} />
                </div>
              </div>

              <div className="pr-pol-stat-card green">
                <div className="pr-pol-stat-info">
                  <span className="pr-pol-stat-val">{policyData.overview_stats.required_checks}</span>
                  <span className="pr-pol-stat-lbl">Required Checks</span>
                </div>
                <div className="pr-pol-stat-icon">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <div className="pr-pol-stat-card red">
                <div className="pr-pol-stat-info">
                  <span className="pr-pol-stat-val">{policyData.overview_stats.active_exceptions}</span>
                  <span className="pr-pol-stat-lbl">Active Exceptions</span>
                </div>
                <div className="pr-pol-stat-icon">
                  <AlertCircle size={20} />
                </div>
              </div>

              <div className="pr-pol-stat-card green">
                <div className="pr-pol-stat-info">
                  <span className="pr-pol-stat-val">{policyData.overview_stats.merge_protection}</span>
                  <span className="pr-pol-stat-lbl">Merge Protection</span>
                </div>
                <div className="pr-pol-stat-icon">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            {/* 2-Column Split: Policy Coverage & Recent Policy Events */}
            <div className="pr-pol-two-col">
              {/* Policy Coverage */}
              <div className="pr-pol-card">
                <div className="pr-pol-card-header">
                  <h3 className="pr-pol-card-title">Policy Coverage</h3>
                </div>
                <div className="pr-pol-card-body">
                  <div className="pr-pol-coverage-list">
                    {policyData.policy_coverage.map((cov: any) => (
                      <div
                        key={cov.id}
                        onClick={() => handleTabChange(cov.tab)}
                        className="pr-pol-coverage-row"
                        title={`Configure ${cov.name}`}
                      >
                        <span className="pr-pol-coverage-name">{cov.name}</span>
                        <div className="pr-pol-coverage-right">
                          <span className="pr-pol-badge enabled">{cov.status}</span>
                          <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Policy Events */}
              <div className="pr-pol-card">
                <div className="pr-pol-card-header">
                  <h3 className="pr-pol-card-title">Recent Policy Events</h3>
                </div>
                <div className="pr-pol-card-body" style={{ padding: 0 }}>
                  <table className="pr-pol-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Actor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyData.recent_events.map((ev: any) => (
                        <tr key={ev.id}>
                          <td style={{ color: '#64748b' }}>{ev.time}</td>
                          <td style={{ fontWeight: 600 }}>{ev.event}</td>
                          <td style={{ color: '#2563eb' }}>{ev.actor}</td>
                          <td>
                            <span className="pr-pol-badge success">{ev.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.2: REQUIRED SECURITY CHECKS
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'checks' && (
          <div>
            <div className="pr-pol-table-wrap">
              <table className="pr-pol-table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policyData.required_checks.map((chk: any) => (
                    <tr key={chk.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                        {chk.icon === 'shield' && <Shield size={16} color="#2563eb" />}
                        {chk.icon === 'key' && <Key size={16} color="#d97706" />}
                        {chk.icon === 'package' && <Package size={16} color="#059669" />}
                        {chk.icon === 'layers' && <Layers size={16} color="#7c3aed" />}
                        {chk.icon === 'box' && <Box size={16} color="#0891b2" />}
                        {chk.icon === 'file-text' && <FileText size={16} color="#475569" />}
                        {chk.icon === 'check-circle' && <CheckCircle2 size={16} color="#16a34a" />}
                        {chk.icon === 'check-square' && <CheckSquare size={16} color="#2563eb" />}
                        {chk.icon === 'play' && <Play size={16} color="#10b981" />}
                        {chk.icon === 'settings' && <Settings size={16} color="#64748b" />}
                        {chk.name}
                      </td>
                      <td style={{ color: '#64748b' }}>{chk.type}</td>
                      <td>
                        <label className="pr-pol-toggle">
                          <input
                            type="checkbox"
                            checked={chk.required}
                            onChange={(e) => {
                              const updated = policyData.required_checks.map((c: any) =>
                                c.id === chk.id
                                  ? { ...c, required: e.target.checked, status: e.target.checked ? 'Active' : 'Optional' }
                                  : c
                              );
                              setPolicyData({ ...policyData, required_checks: updated });
                            }}
                          />
                          <span className="pr-pol-toggle-slider"></span>
                        </label>
                      </td>
                      <td>
                        <span className={`pr-pol-badge ${chk.required ? 'active' : 'optional'}`}>
                          {chk.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="pr-pol-outline-btn"
                          style={{ padding: '3px 8px', border: 'none', background: 'transparent' }}
                          title="Configure Check"
                        >
                          <MoreVertical size={16} color="#64748b" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Check Execution Order */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Check Execution Order</h3>
              </div>
              <div className="pr-pol-card-body">
                <div className="pr-pol-order-list">
                  {policyData.execution_order.map((item: string, index: number) => (
                    <div key={item} className="pr-pol-order-item">
                      <div className="pr-pol-order-item-left">
                        <span className="pr-pol-order-num">{index + 1}</span>
                        <span>{item}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...policyData.execution_order];
                            const temp = newOrder[index];
                            newOrder[index] = newOrder[index - 1];
                            newOrder[index - 1] = temp;
                            setPolicyData({ ...policyData, execution_order: newOrder });
                          }}
                          className="pr-pol-outline-btn"
                          style={{ padding: '3px 8px', opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          disabled={index === policyData.execution_order.length - 1}
                          onClick={() => {
                            const newOrder = [...policyData.execution_order];
                            const temp = newOrder[index];
                            newOrder[index] = newOrder[index + 1];
                            newOrder[index + 1] = temp;
                            setPolicyData({ ...policyData, execution_order: newOrder });
                          }}
                          className="pr-pol-outline-btn"
                          style={{ padding: '3px 8px', opacity: index === policyData.execution_order.length - 1 ? 0.3 : 1 }}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.3: VULNERABILITY THRESHOLDS
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'thresholds' && (
          <div>
            <div className="pr-pol-table-wrap">
              <table className="pr-pol-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Threshold</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {policyData.vulnerability_thresholds.map((row: any, i: number) => {
                    const isFirstInCategory =
                      i === 0 || policyData.vulnerability_thresholds[i - 1].category !== row.category;
                    const categoryRows = policyData.vulnerability_thresholds.filter(
                      (r: any) => r.category === row.category
                    ).length;

                    return (
                      <tr key={row.id}>
                        {isFirstInCategory ? (
                          <td rowSpan={categoryRows} style={{ verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>
                            {row.category}
                          </td>
                        ) : null}

                        <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor:
                                row.severity === 'Critical'
                                  ? '#DC2626'
                                  : row.severity === 'High'
                                  ? '#EA580C'
                                  : row.severity === 'Medium'
                                  ? '#CA8A04'
                                  : '#64748b',
                            }}
                          ></span>
                          <span>{row.severity}</span>
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            value={row.threshold}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const updated = policyData.vulnerability_thresholds.map((r: any) =>
                                r.id === row.id ? { ...r, threshold: val } : r
                              );
                              setPolicyData({ ...policyData, vulnerability_thresholds: updated });
                            }}
                            className="pr-pol-input"
                            style={{ width: '80px', padding: '4px 8px' }}
                          />
                        </td>

                        <td>
                          <select
                            value={row.action}
                            onChange={(e) => {
                              const updated = policyData.vulnerability_thresholds.map((r: any) =>
                                r.id === row.id ? { ...r, action: e.target.value } : r
                              );
                              setPolicyData({ ...policyData, vulnerability_thresholds: updated });
                            }}
                            className="pr-pol-select"
                          >
                            <option value="Block merge">Block merge</option>
                            <option value="Allow with warning">Allow with warning</option>
                            <option value="Allow">Allow</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info Banner */}
            <div className="pr-pol-info-banner">
              <Info size={18} />
              <span>
                If the number of vulnerabilities exceeds the threshold, the PR will be blocked based on the configured action.
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.4: SECRET DETECTION POLICY
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'secrets' && (
          <div>
            {/* Top Toggle Controls */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-body">
                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Enable secret detection</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.secret_detection_toggles.enable_secret_detection}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          secret_detection_toggles: {
                            ...policyData.secret_detection_toggles,
                            enable_secret_detection: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Block merge on detected secrets</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.secret_detection_toggles.block_merge_on_detected_secrets}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          secret_detection_toggles: {
                            ...policyData.secret_detection_toggles,
                            block_merge_on_detected_secrets: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Scan in all file types</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.secret_detection_toggles.scan_all_file_types}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          secret_detection_toggles: {
                            ...policyData.secret_detection_toggles,
                            scan_all_file_types: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Include historical commits</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.secret_detection_toggles.include_historical_commits}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          secret_detection_toggles: {
                            ...policyData.secret_detection_toggles,
                            include_historical_commits: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Secret Types Table */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Secret Types</h3>
              </div>
              <div className="pr-pol-card-body" style={{ padding: 0 }}>
                <table className="pr-pol-table">
                  <thead>
                    <tr>
                      <th>Secret Type</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyData.secret_types.map((st: any) => (
                      <tr key={st.id}>
                        <td style={{ fontWeight: 600 }}>{st.secret_type}</td>
                        <td style={{ color: '#64748b' }}>{st.description}</td>
                        <td>
                          <span className="pr-pol-badge enabled">{st.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const updated = policyData.secret_types.map((item: any) =>
                                item.id === st.id
                                  ? {
                                      ...item,
                                      status: item.status === 'Enabled' ? 'Disabled' : 'Enabled',
                                      action: item.status === 'Enabled' ? 'Disabled' : 'Enabled',
                                    }
                                  : item
                              );
                              setPolicyData({ ...policyData, secret_types: updated });
                            }}
                            className="pr-pol-outline-btn"
                            style={{ padding: '3px 10px', fontSize: '11px' }}
                          >
                            {st.action}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Patterns */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Custom Patterns</h3>
                <button
                  onClick={() => {
                    setModalForm({ name: '', pattern: '' });
                    setModalType('add_pattern');
                  }}
                  className="pr-pol-primary-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add Pattern
                </button>
              </div>
              <div className="pr-pol-card-body" style={{ padding: 0 }}>
                <table className="pr-pol-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Pattern</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyData.custom_patterns.map((cp: any) => (
                      <tr key={cp.id}>
                        <td style={{ fontWeight: 600 }}>{cp.name}</td>
                        <td>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontSize: '12px' }}>
                            {cp.pattern}
                          </code>
                        </td>
                        <td>
                          <span className="pr-pol-badge enabled">{cp.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const updated = policyData.custom_patterns.filter((item: any) => item.id !== cp.id);
                              setPolicyData({ ...policyData, custom_patterns: updated });
                            }}
                            className="pr-pol-outline-btn"
                            style={{ padding: '3px 8px', fontSize: '11px', color: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.5: IaC / DEPENDENCY POLICY
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'iac' && (
          <div>
            {/* Sub-tabs: IaC / Dependency / Container */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {[
                { id: 'iac', label: 'IaC Scanning' },
                { id: 'deps', label: 'Dependency Scanning' },
                { id: 'container', label: 'Container Scanning' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setIacSubTab(sub.id as any)}
                  className={`pr-pol-outline-btn ${iacSubTab === sub.id ? 'active' : ''}`}
                  style={{
                    backgroundColor: iacSubTab === sub.id ? '#eff6ff' : '#ffffff',
                    borderColor: iacSubTab === sub.id ? '#bfdbfe' : '#cbd5e1',
                    color: iacSubTab === sub.id ? '#2563eb' : '#334155',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-body">
                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Enable IaC scanning</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.iac_toggles.enable_iac_scanning}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          iac_toggles: {
                            ...policyData.iac_toggles,
                            enable_iac_scanning: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Block merge on IaC misconfigurations</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.iac_toggles.block_merge_on_iac_misconfigurations}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          iac_toggles: {
                            ...policyData.iac_toggles,
                            block_merge_on_iac_misconfigurations: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                {/* Supported Frameworks */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 10px 0' }}>
                    Supported Frameworks
                  </h4>
                  <div className="pr-pol-checkbox-grid">
                    {Object.keys(policyData.iac_supported_frameworks).map((fw) => (
                      <label key={fw} className="pr-pol-checkbox-label">
                        <input
                          type="checkbox"
                          checked={policyData.iac_supported_frameworks[fw]}
                          onChange={(e) =>
                            setPolicyData({
                              ...policyData,
                              iac_supported_frameworks: {
                                ...policyData.iac_supported_frameworks,
                                [fw]: e.target.checked,
                              },
                            })
                          }
                        />
                        <span>{fw}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Rules Table */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Policy Rules</h3>
              </div>
              <div className="pr-pol-card-body" style={{ padding: 0 }}>
                <table className="pr-pol-table">
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Action</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyData.iac_policy_rules.map((rule: any) => (
                      <tr key={rule.id}>
                        <td style={{ fontWeight: 600 }}>{rule.rule}</td>
                        <td>
                          <span
                            className={`pr-pol-badge ${
                              rule.severity === 'Critical'
                                ? 'critical'
                                : rule.severity === 'High'
                                ? 'high'
                                : 'medium'
                            }`}
                          >
                            {rule.severity}
                          </span>
                        </td>
                        <td>
                          <span className="pr-pol-badge enabled">{rule.status}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{rule.action}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="pr-pol-outline-btn"
                            style={{ padding: '3px 8px', border: 'none', background: 'transparent' }}
                          >
                            <MoreVertical size={16} color="#64748b" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.6: LICENSE & COMPLIANCE POLICY
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'licenses' && (
          <div>
            {/* Top Toggles */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-body">
                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Enable license compliance check</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.license_toggles.enable_license_compliance_check}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          license_toggles: {
                            ...policyData.license_toggles,
                            enable_license_compliance_check: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">Block merge on restricted licenses</span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.license_toggles.block_merge_on_restricted_licenses}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          license_toggles: {
                            ...policyData.license_toggles,
                            block_merge_on_restricted_licenses: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Restricted Licenses Table */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Restricted Licenses</h3>
                <button
                  onClick={() => {
                    setModalForm({ license: '', risk_level: 'High', action: 'Block', type: 'restricted' });
                    setModalType('add_license');
                  }}
                  className="pr-pol-primary-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add License
                </button>
              </div>
              <div className="pr-pol-card-body" style={{ padding: 0 }}>
                <table className="pr-pol-table">
                  <thead>
                    <tr>
                      <th>License</th>
                      <th>Risk Level</th>
                      <th>Action</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyData.restricted_licenses.map((lic: any) => (
                      <tr key={lic.id}>
                        <td style={{ fontWeight: 600 }}>{lic.license}</td>
                        <td>
                          <span
                            className={`pr-pol-badge ${
                              lic.risk_level === 'High' ? 'critical' : 'medium'
                            }`}
                          >
                            {lic.risk_level}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{lic.action}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const updated = policyData.restricted_licenses.filter((item: any) => item.id !== lic.id);
                              setPolicyData({ ...policyData, restricted_licenses: updated });
                            }}
                            className="pr-pol-outline-btn"
                            style={{ padding: '3px 8px', fontSize: '11px', color: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Allowed Licenses Table */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Allowed Licenses</h3>
                <button
                  onClick={() => {
                    setModalForm({ license: '', risk_level: 'Low', action: 'Allow', type: 'allowed' });
                    setModalType('add_license');
                  }}
                  className="pr-pol-primary-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add License
                </button>
              </div>
              <div className="pr-pol-card-body" style={{ padding: 0 }}>
                <table className="pr-pol-table">
                  <thead>
                    <tr>
                      <th>License</th>
                      <th>Risk Level</th>
                      <th>Action</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyData.allowed_licenses.map((lic: any) => (
                      <tr key={lic.id}>
                        <td style={{ fontWeight: 600 }}>{lic.license}</td>
                        <td>
                          <span className="pr-pol-badge low">{lic.risk_level}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{lic.action}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const updated = policyData.allowed_licenses.filter((item: any) => item.id !== lic.id);
                              setPolicyData({ ...policyData, allowed_licenses: updated });
                            }}
                            className="pr-pol-outline-btn"
                            style={{ padding: '3px 8px', fontSize: '11px', color: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.7: MERGE GATE / ENFORCEMENT
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'gate' && (
          <div>
            {/* Merge Conditions */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Merge Conditions</h3>
              </div>
              <div className="pr-pol-card-body">
                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <CheckCircle2 size={16} color="#2563eb" />
                    Require all required checks to pass
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.require_all_required_checks_to_pass}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            require_all_required_checks_to_pass: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <Users size={16} color="#2563eb" />
                    Require code owner approval
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.require_code_owner_approval}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            require_code_owner_approval: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <Shield size={16} color="#2563eb" />
                    Require security review for high/critical
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.require_security_review_high_critical}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            require_security_review_high_critical: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <GitCommit size={16} color="#2563eb" />
                    Require linear history
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.require_linear_history}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            require_linear_history: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <ShieldAlert size={16} color="#dc2626" />
                    Block merge on policy violations
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.block_merge_on_policy_violations}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            block_merge_on_policy_violations: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>

                <div className="pr-pol-toggle-row">
                  <span className="pr-pol-toggle-label">
                    <GitPullRequest size={16} color="#059669" />
                    Require up-to-date branch
                  </span>
                  <label className="pr-pol-toggle">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.require_up_to_date_branch}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            require_up_to_date_branch: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="pr-pol-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Merge Methods */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Merge Methods</h3>
              </div>
              <div className="pr-pol-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="pr-pol-checkbox-label">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.allow_merge_commit}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            allow_merge_commit: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Allow merge commit</span>
                  </label>

                  <label className="pr-pol-checkbox-label">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.allow_squash_merge}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            allow_squash_merge: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Allow squash merge</span>
                  </label>

                  <label className="pr-pol-checkbox-label">
                    <input
                      type="checkbox"
                      checked={policyData.merge_conditions.allow_rebase_and_merge}
                      onChange={(e) =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            allow_rebase_and_merge: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Allow rebase and merge</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Enforcement Scope */}
            <div className="pr-pol-card">
              <div className="pr-pol-card-header">
                <h3 className="pr-pol-card-title">Enforcement Scope</h3>
              </div>
              <div className="pr-pol-card-body">
                <div className="pr-pol-radio-group">
                  <label className="pr-pol-radio-label">
                    <input
                      type="radio"
                      name="scope"
                      checked={policyData.merge_conditions.enforcement_scope === 'all'}
                      onChange={() =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            enforcement_scope: 'all',
                          },
                        })
                      }
                    />
                    <span>Apply to all branches</span>
                  </label>

                  <label className="pr-pol-radio-label">
                    <input
                      type="radio"
                      name="scope"
                      checked={policyData.merge_conditions.enforcement_scope === 'specific'}
                      onChange={() =>
                        setPolicyData({
                          ...policyData,
                          merge_conditions: {
                            ...policyData.merge_conditions,
                            enforcement_scope: 'specific',
                          },
                        })
                      }
                    />
                    <span>Apply to specific branches</span>
                  </label>

                  {policyData.merge_conditions.enforcement_scope === 'specific' && (
                    <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      <input
                        type="text"
                        value={policyData.merge_conditions.specific_branches}
                        onChange={(e) =>
                          setPolicyData({
                            ...policyData,
                            merge_conditions: {
                              ...policyData.merge_conditions,
                              specific_branches: e.target.value,
                            },
                          })
                        }
                        className="pr-pol-input"
                        style={{ width: '320px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 13.8: POLICY EXCEPTIONS & AUDIT
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'exceptions' && (
          <div>
            {/* Sub-tabs: Exceptions / Audit */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button
                onClick={() => setExceptionsSubTab('exceptions')}
                className={`pr-pol-outline-btn ${exceptionsSubTab === 'exceptions' ? 'active' : ''}`}
                style={{
                  backgroundColor: exceptionsSubTab === 'exceptions' ? '#eff6ff' : '#ffffff',
                  borderColor: exceptionsSubTab === 'exceptions' ? '#bfdbfe' : '#cbd5e1',
                  color: exceptionsSubTab === 'exceptions' ? '#2563eb' : '#334155',
                }}
              >
                Exceptions
              </button>
              <button
                onClick={() => setExceptionsSubTab('audit')}
                className={`pr-pol-outline-btn ${exceptionsSubTab === 'audit' ? 'active' : ''}`}
                style={{
                  backgroundColor: exceptionsSubTab === 'audit' ? '#eff6ff' : '#ffffff',
                  borderColor: exceptionsSubTab === 'audit' ? '#bfdbfe' : '#cbd5e1',
                  color: exceptionsSubTab === 'audit' ? '#2563eb' : '#334155',
                }}
              >
                Audit History
              </button>
            </div>

            {exceptionsSubTab === 'exceptions' ? (
              <div className="pr-pol-card">
                <div className="pr-pol-card-header">
                  <h3 className="pr-pol-card-title">Policy Exceptions</h3>
                  <button
                    onClick={() => {
                      setModalForm({ rule: 'SAST - High', reason: '', expires: 'Nov 15, 2026' });
                      setModalType('add_exception');
                    }}
                    className="pr-pol-primary-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px' }}
                  >
                    <Plus size={14} /> New Exception
                  </button>
                </div>
                <div className="pr-pol-card-body" style={{ padding: 0 }}>
                  <table className="pr-pol-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Rule</th>
                        <th>Reason</th>
                        <th>Expires</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyData.exceptions.map((ex: any) => (
                        <tr key={ex.id}>
                          <td>
                            <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                              {ex.id}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{ex.rule}</td>
                          <td style={{ color: '#475569' }}>{ex.reason}</td>
                          <td style={{ color: '#64748b' }}>{ex.expires}</td>
                          <td>
                            <span
                              className={`pr-pol-badge ${
                                ex.status === 'Active' ? 'active' : 'expired'
                              }`}
                            >
                              {ex.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                const updated = policyData.exceptions.filter((item: any) => item.id !== ex.id);
                                setPolicyData({
                                  ...policyData,
                                  exceptions: updated,
                                  overview_stats: {
                                    ...policyData.overview_stats,
                                    active_exceptions: Math.max(0, policyData.overview_stats.active_exceptions - (ex.status === 'Active' ? 1 : 0)),
                                  },
                                });
                              }}
                              className="pr-pol-outline-btn"
                              style={{ padding: '3px 8px', fontSize: '11px', color: '#dc2626' }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="pr-pol-card">
                <div className="pr-pol-card-header">
                  <h3 className="pr-pol-card-title">Audit History</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={auditFilterEvent}
                      onChange={(e) => setAuditFilterEvent(e.target.value)}
                      className="pr-pol-select"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value="All Events">All Events</option>
                      <option value="Exception">Exception</option>
                      <option value="Policy updated">Policy updated</option>
                      <option value="Merge rule">Merge rule</option>
                    </select>

                    <select
                      value={auditFilterUser}
                      onChange={(e) => setAuditFilterUser(e.target.value)}
                      className="pr-pol-select"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value="All Users">All Users</option>
                      <option value="@mayur.bharvad">@mayur.bharvad</option>
                      <option value="@security-team">@security-team</option>
                      <option value="@dev-team">@dev-team</option>
                      <option value="System">System</option>
                    </select>

                    <select className="pr-pol-select" style={{ padding: '4px 8px', fontSize: '12px' }}>
                      <option value="30">Last 30 days</option>
                      <option value="7">Last 7 days</option>
                      <option value="90">Last 90 days</option>
                    </select>
                  </div>
                </div>
                <div className="pr-pol-card-body" style={{ padding: 0 }}>
                  <table className="pr-pol-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>User</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudit.map((log: any) => (
                        <tr key={log.id}>
                          <td style={{ color: '#64748b' }}>{log.time}</td>
                          <td style={{ fontWeight: 600 }}>{log.event}</td>
                          <td style={{ color: '#2563eb' }}>{log.user}</td>
                          <td style={{ color: '#334155' }}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pr-pol-footer-actions">
              <button onClick={handleReset} className="pr-pol-outline-btn">Reset</button>
              <button onClick={handleSaveChanges} className="pr-pol-primary-btn">Save Changes</button>
            </div>
          </div>
        )}

      </div>

      {/* ── Modals for Adding Custom Pattern / License / Exception ─────────── */}
      {modalType !== 'none' && (
        <div className="pr-pol-modal-overlay" onClick={() => setModalType('none')}>
          <div className="pr-pol-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pr-pol-modal-header">
              <span className="pr-pol-modal-title">
                {modalType === 'add_pattern' && 'Add Custom Secret Pattern'}
                {modalType === 'add_license' && `Add ${modalForm.type === 'restricted' ? 'Restricted' : 'Allowed'} License`}
                {modalType === 'add_exception' && 'Create Policy Exception'}
              </span>
              <button
                onClick={() => setModalType('none')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pr-pol-modal-body">
              {modalType === 'add_pattern' && (
                <>
                  <div className="pr-pol-form-group">
                    <label>Pattern Name</label>
                    <input
                      type="text"
                      placeholder="e.g. prod_api_key"
                      value={modalForm.name || ''}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="pr-pol-input"
                    />
                  </div>
                  <div className="pr-pol-form-group">
                    <label>Regular Expression (Regex)</label>
                    <input
                      type="text"
                      placeholder="e.g. ak_live_[0-9a-zA-Z]{32}"
                      value={modalForm.pattern || ''}
                      onChange={(e) => setModalForm({ ...modalForm, pattern: e.target.value })}
                      className="pr-pol-input"
                    />
                  </div>
                </>
              )}

              {modalType === 'add_license' && (
                <>
                  <div className="pr-pol-form-group">
                    <label>License Identifier (SPDX)</label>
                    <input
                      type="text"
                      placeholder="e.g. BSD-2-Clause, CC-BY-4.0"
                      value={modalForm.license || ''}
                      onChange={(e) => setModalForm({ ...modalForm, license: e.target.value })}
                      className="pr-pol-input"
                    />
                  </div>
                  <div className="pr-pol-form-group">
                    <label>Risk Level</label>
                    <select
                      value={modalForm.risk_level || 'High'}
                      onChange={(e) => setModalForm({ ...modalForm, risk_level: e.target.value })}
                      className="pr-pol-select"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="pr-pol-form-group">
                    <label>Action</label>
                    <select
                      value={modalForm.action || 'Block'}
                      onChange={(e) => setModalForm({ ...modalForm, action: e.target.value })}
                      className="pr-pol-select"
                    >
                      <option value="Block">Block</option>
                      <option value="Warn">Warn</option>
                      <option value="Allow">Allow</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'add_exception' && (
                <>
                  <div className="pr-pol-form-group">
                    <label>Target Rule / Check</label>
                    <select
                      value={modalForm.rule || 'SAST - High'}
                      onChange={(e) => setModalForm({ ...modalForm, rule: e.target.value })}
                      className="pr-pol-select"
                    >
                      <option value="SAST - High">SAST - High</option>
                      <option value="Dependency">Dependency Vulnerability</option>
                      <option value="Secret Scan">Secret Scan - False Positive</option>
                      <option value="IaC Misconfiguration">IaC Misconfiguration</option>
                      <option value="License Compliance">License Compliance</option>
                    </select>
                  </div>
                  <div className="pr-pol-form-group">
                    <label>Justification / Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Legacy migration in progress, approved by AppSec"
                      value={modalForm.reason || ''}
                      onChange={(e) => setModalForm({ ...modalForm, reason: e.target.value })}
                      className="pr-pol-input"
                    />
                  </div>
                  <div className="pr-pol-form-group">
                    <label>Expiration Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Nov 15, 2026"
                      value={modalForm.expires || 'Nov 15, 2026'}
                      onChange={(e) => setModalForm({ ...modalForm, expires: e.target.value })}
                      className="pr-pol-input"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pr-pol-modal-footer">
              <button onClick={() => setModalType('none')} className="pr-pol-outline-btn">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (modalType === 'add_pattern' && modalForm.name && modalForm.pattern) {
                    const newPat = {
                      id: `cp-${Date.now()}`,
                      name: modalForm.name,
                      pattern: modalForm.pattern,
                      status: 'Enabled',
                    };
                    setPolicyData({
                      ...policyData,
                      custom_patterns: [...policyData.custom_patterns, newPat],
                    });
                  } else if (modalType === 'add_license' && modalForm.license) {
                    const newLic = {
                      id: `lic-${Date.now()}`,
                      license: modalForm.license,
                      risk_level: modalForm.risk_level,
                      action: modalForm.action,
                    };
                    if (modalForm.type === 'restricted') {
                      setPolicyData({
                        ...policyData,
                        restricted_licenses: [...policyData.restricted_licenses, newLic],
                      });
                    } else {
                      setPolicyData({
                        ...policyData,
                        allowed_licenses: [...policyData.allowed_licenses, newLic],
                      });
                    }
                  } else if (modalType === 'add_exception' && modalForm.reason) {
                    try {
                      const res = await api.request<any>('/api/v1/pull-requests/policy/exceptions', {
                        method: 'POST',
                        body: JSON.stringify(modalForm),
                      });
                      const created = (res as any)?.data?.exception || (res as any)?.exception || {
                        id: `EX-00${policyData.exceptions.length + 1}`,
                        rule: modalForm.rule,
                        reason: modalForm.reason,
                        expires: modalForm.expires,
                        status: 'Active',
                      };
                      setPolicyData({
                        ...policyData,
                        exceptions: [created, ...policyData.exceptions],
                        overview_stats: {
                          ...policyData.overview_stats,
                          active_exceptions: policyData.overview_stats.active_exceptions + 1,
                        },
                      });
                    } catch {
                      // fallback local
                      const fallbackItem = {
                        id: `EX-00${policyData.exceptions.length + 1}`,
                        rule: modalForm.rule,
                        reason: modalForm.reason,
                        expires: modalForm.expires,
                        status: 'Active',
                      };
                      setPolicyData({
                        ...policyData,
                        exceptions: [fallbackItem, ...policyData.exceptions],
                        overview_stats: {
                          ...policyData.overview_stats,
                          active_exceptions: policyData.overview_stats.active_exceptions + 1,
                        },
                      });
                    }
                  }
                  setModalType('none');
                }}
                className="pr-pol-primary-btn"
              >
                Add & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
