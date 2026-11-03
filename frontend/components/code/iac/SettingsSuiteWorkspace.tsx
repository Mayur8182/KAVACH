'use client';

/**
 * THING Code — Infrastructure as Code (IaC) Settings Suite
 * Section 15: Screens 15.1 through 15.7
 * 
 * 100% Sourced from Real Backend APIs: /api/v1/iac/settings-suite/*
 * 
 * Screens:
 *   15.1 General Settings (Repository, branch, working directory, IaC types, scan behavior)
 *   15.2 Scan Settings (Scanner, version, check updates, additional tools, file extensions, max file size, parallel scans)
 *   15.3 Rules & Policies (Policy packs catalog, toggle pack status, tool severity mappings)
 *   15.4 Exclusions (File/path exclusion patterns, + Add Exclusion modal, live Preview path matcher)
 *   15.5 Notifications (Master toggles, notification channels, + Add Channel modal, notification event triggers)
 *   15.6 Access & Permissions (Users with access, avatar pills, role assignment, role definitions)
 *   15.7 Advanced Settings (Performance limits, CLI arguments for Checkov/tfsec, Environment Variables table)
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Settings,
  Sliders,
  Shield,
  FileCode,
  FolderMinus,
  Bell,
  Users,
  Cpu,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  RefreshCw,
  Terminal,
  Layers,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import type {
  GeneralSettingsDTO,
  ScanSettingsDTO,
  RulesPoliciesSettingsDTO,
  ExclusionsSettingsDTO,
  NotificationsSettingsDTO,
  AccessSettingsDTO,
  AdvancedSettingsDTO,
  ExclusionItem,
  NotificationChannelItem,
  UserAccessItem,
  EnvVariableItem,
  PreviewExclusionResponse,
} from '@/types/api/iac';

export type SettingsSection =
  | 'general'
  | 'scan'
  | 'rules'
  | 'exclusions'
  | 'notifications'
  | 'access'
  | 'advanced';

interface SettingsSuiteWorkspaceProps {
  initialSection?: SettingsSection;
  repositoryName?: string;
}

export const SettingsSuiteWorkspace: React.FC<SettingsSuiteWorkspaceProps> = ({
  initialSection = 'general',
  repositoryName,
}) => {
  const { currentRepository, repositories } = useScope();
  const effectiveRepoName = currentRepository?.name || repositoryName || 'All Repositories';

  // Navigation State
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  // Global loading and toast feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── 15.1 General State ──
  const [general, setGeneral] = useState<GeneralSettingsDTO>({
    repository: effectiveRepoName,
    default_branch: 'main',
    iac_working_directory: '/',
    supported_iac_types: ['Terraform', 'CloudFormation', 'Kubernetes Manifests', 'Helm Charts'],
    auto_scan_on_push: true,
    scan_on_pr: true,
    scan_on_schedule: false,
  });

  // Keep repository synchronized with current scope if user hasn't explicitly changed it
  useEffect(() => {
    if (currentRepository?.name) {
      setGeneral((prev) => ({
        ...prev,
        repository: currentRepository.name,
      }));
    }
  }, [currentRepository?.name]);

  // ── 15.2 Scan State ──
  const [scan, setScan] = useState<ScanSettingsDTO>({
    iac_scanner: 'Checkov (Default)',
    scanner_version: '2.4.1',
    scanner_version_latest: true,
    additional_tools: {
      tfsec: false,
      kube_score: false,
      kube_linter: false,
      custom_scanner: false,
      custom_scanner_command: '',
    },
    file_extensions: '.tf, .tfvars, .yaml, .yml, .json',
    max_file_size_mb: 5,
    parallel_scans: 4,
  });
  const [checkingUpdates, setCheckingUpdates] = useState<boolean>(false);

  // ── 15.3 Rules & Policies State ──
  const [rulesPolicies, setRulesPolicies] = useState<RulesPoliciesSettingsDTO>({
    policy_packs: [],
    severity_mappings: {},
  });
  const [rulesSubTab, setRulesSubTab] = useState<'packs' | 'custom' | 'thresholds'>('packs');

  // ── 15.4 Exclusions State ──
  const [exclusions, setExclusions] = useState<ExclusionsSettingsDTO>({
    active_tab: 'File / Path Exclusions',
    exclusions: [],
  });
  const [exclusionsSubTab, setExclusionsSubTab] = useState<'files' | 'resources' | 'rules'>('files');
  const [previewPath, setPreviewPath] = useState<string>('infra/terraform/main.tf');
  const [previewResult, setPreviewResult] = useState<PreviewExclusionResponse | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [isAddExclusionOpen, setIsAddExclusionOpen] = useState<boolean>(false);
  const [newExclPattern, setNewExclPattern] = useState<string>('');
  const [newExclType, setNewExclType] = useState<string>('Directory');
  const [newExclDesc, setNewExclDesc] = useState<string>('');

  // ── 15.5 Notifications State ──
  const [notifications, setNotifications] = useState<NotificationsSettingsDTO>({
    enable_notifications: true,
    notify_on_scan_completion: true,
    notify_on_critical_findings: true,
    notify_on_policy_violations: true,
    channels: [],
    events: {
      scan_completed: true,
      critical_findings_detected: true,
      policy_violations: true,
      new_rules_available: false,
      scan_failed: true,
      high_severity_findings: true,
      drift_detected: false,
      compliance_status_changed: false,
    },
  });
  const [isAddChannelOpen, setIsAddChannelOpen] = useState<boolean>(false);
  const [newChanName, setNewChanName] = useState<string>('');
  const [newChanType, setNewChanType] = useState<string>('Slack');
  const [newChanConfig, setNewChanConfig] = useState<string>('');

  // ── 15.6 Access & Permissions State ──
  const [access, setAccess] = useState<AccessSettingsDTO>({
    active_tab: 'User Access',
    users: [],
    roles: [],
  });
  const [accessSubTab, setAccessSubTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('Viewer');

  // ── 15.7 Advanced State ──
  const [advanced, setAdvanced] = useState<AdvancedSettingsDTO>({
    scan_timeout_minutes: 10,
    max_memory_usage_gb: 2,
    cache_results: true,
    cache_ttl_days: 7,
    checkov_arguments: '--framework terraform,kubernetes,cloudformation --quiet',
    tfsec_arguments: '--format json --soft-fail',
    environment_variables: [],
  });
  const [isAddEnvVarOpen, setIsAddEnvVarOpen] = useState<boolean>(false);
  const [newVarName, setNewVarName] = useState<string>('');
  const [newVarValue, setNewVarValue] = useState<string>('');

  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // ── Fetch Section Data ──
  const loadSectionData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeSection === 'general') {
        const res = await api.iac.settingsSuite.getGeneral();
        setGeneral(res);
      } else if (activeSection === 'scan') {
        const res = await api.iac.settingsSuite.getScan();
        setScan(res);
      } else if (activeSection === 'rules') {
        const res = await api.iac.settingsSuite.getRulesPolicies();
        setRulesPolicies(res);
      } else if (activeSection === 'exclusions') {
        const res = await api.iac.settingsSuite.getExclusions();
        setExclusions(res);
      } else if (activeSection === 'notifications') {
        const res = await api.iac.settingsSuite.getNotifications();
        setNotifications(res);
      } else if (activeSection === 'access') {
        const res = await api.iac.settingsSuite.getAccess();
        setAccess(res);
      } else if (activeSection === 'advanced') {
        const res = await api.iac.settingsSuite.getAdvanced();
        setAdvanced(res);
      }
    } catch (err: any) {
      showToast(`Error loading ${activeSection} settings: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }, [activeSection, showToast]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  // ── 15.1 General Save & Reset ──
  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      const res = await api.iac.settingsSuite.updateGeneral(general);
      setGeneral(res);
      showToast('General settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save general settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetGeneral = async () => {
    try {
      const res = await api.iac.settingsSuite.resetGeneral();
      setGeneral(res);
      showToast('General settings restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // ── 15.2 Scan Save, Reset, & Check Updates ──
  const handleSaveScan = async () => {
    try {
      setSaving(true);
      const res = await api.iac.settingsSuite.updateScan(scan);
      setScan(res);
      showToast('Scan settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save scan settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetScan = async () => {
    try {
      const res = await api.iac.settingsSuite.resetScan();
      setScan(res);
      showToast('Scan settings restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setCheckingUpdates(true);
      const res = await api.iac.settingsSuite.checkScannerUpdates();
      showToast(res.message || 'Scanner version is up to date.');
    } catch (err: any) {
      showToast(`Update check failed: ${err.message}`);
    } finally {
      setCheckingUpdates(false);
    }
  };

  // ── 15.3 Rules & Policies Save & Toggle ──
  const handleTogglePolicyPack = async (packName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Enabled' ? 'Disabled' : 'Enabled';
    try {
      await api.iac.settingsSuite.togglePolicyPack(packName, nextStatus);
      setRulesPolicies((prev) => ({
        ...prev,
        policy_packs: prev.policy_packs.map((p) =>
          p.name === packName ? { ...p, status: nextStatus } : p
        ),
      }));
      showToast(`Policy pack ${packName} marked as ${nextStatus}.`);
    } catch (err: any) {
      showToast(`Failed to toggle pack: ${err.message}`);
    }
  };

  const handleSaveRulesPolicies = async () => {
    try {
      setSaving(true);
      const res = await api.iac.settingsSuite.updateRulesPolicies(rulesPolicies);
      setRulesPolicies(res);
      showToast('Rules & Policies settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save rules & policies: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetRulesPolicies = async () => {
    try {
      const res = await api.iac.settingsSuite.resetRulesPolicies();
      setRulesPolicies(res);
      showToast('Rules & Policies restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // ── 15.4 Exclusions Add, Delete, Preview ──
  const handleAddExclusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExclPattern) return;
    try {
      const res = await api.iac.settingsSuite.addExclusion({
        pattern: newExclPattern,
        type: newExclType,
        description: newExclDesc || 'Custom exclusion pattern',
      });
      setExclusions((prev) => ({
        ...prev,
        exclusions: [res, ...prev.exclusions],
      }));
      setIsAddExclusionOpen(false);
      setNewExclPattern('');
      setNewExclDesc('');
      showToast(`Exclusion ${res.pattern} added.`);
    } catch (err: any) {
      showToast(`Failed to add exclusion: ${err.message}`);
    }
  };

  const handleDeleteExclusion = async (id: string, pattern: string) => {
    try {
      await api.iac.settingsSuite.deleteExclusion(id);
      setExclusions((prev) => ({
        ...prev,
        exclusions: prev.exclusions.filter((e) => e.id !== id),
      }));
      showToast(`Exclusion ${pattern} removed.`);
    } catch (err: any) {
      showToast(`Failed to delete exclusion: ${err.message}`);
    }
  };

  const handlePreviewExclusion = async () => {
    if (!previewPath) return;
    try {
      setPreviewing(true);
      const res = await api.iac.settingsSuite.previewExclusion({ file_path: previewPath });
      setPreviewResult(res);
    } catch (err: any) {
      showToast(`Preview check failed: ${err.message}`);
    } finally {
      setPreviewing(false);
    }
  };

  const handleResetExclusions = async () => {
    try {
      const res = await api.iac.settingsSuite.resetExclusions();
      setExclusions(res);
      showToast('Exclusions restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // ── 15.5 Notifications Save, Add & Delete Channel ──
  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      const res = await api.iac.settingsSuite.updateNotifications(notifications);
      setNotifications(res);
      showToast('Notification settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save notifications: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName || !newChanConfig) return;
    try {
      const res = await api.iac.settingsSuite.addNotificationChannel({
        channel: newChanName,
        type: newChanType,
        configuration: newChanConfig,
        status: 'Active',
      });
      setNotifications((prev) => ({
        ...prev,
        channels: [res, ...prev.channels],
      }));
      setIsAddChannelOpen(false);
      setNewChanName('');
      setNewChanConfig('');
      showToast(`Channel ${res.channel} added.`);
    } catch (err: any) {
      showToast(`Failed to add channel: ${err.message}`);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    try {
      await api.iac.settingsSuite.deleteNotificationChannel(id);
      setNotifications((prev) => ({
        ...prev,
        channels: prev.channels.filter((c) => c.id !== id),
      }));
      showToast(`Channel ${name} removed.`);
    } catch (err: any) {
      showToast(`Failed to delete channel: ${err.message}`);
    }
  };

  const handleResetNotifications = async () => {
    try {
      const res = await api.iac.settingsSuite.resetNotifications();
      setNotifications(res);
      showToast('Notifications restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // ── 15.6 Access & Permissions Add, Delete, Role Change ──
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    try {
      const res = await api.iac.settingsSuite.addUserAccess({
        user: newUserName,
        role: newUserRole,
        status: 'Active',
      });
      setAccess((prev) => ({
        ...prev,
        users: [res, ...prev.users],
      }));
      setIsAddUserOpen(false);
      setNewUserName('');
      showToast(`User ${res.user} granted access as ${res.role}.`);
    } catch (err: any) {
      showToast(`Failed to add user: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      await api.iac.settingsSuite.deleteUserAccess(id);
      setAccess((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
      }));
      showToast(`User access for ${name} revoked.`);
    } catch (err: any) {
      showToast(`Failed to revoke user: ${err.message}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const updated = await api.iac.settingsSuite.updateUserRole(userId, newRole);
      setAccess((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? updated : u)),
      }));
      showToast(`Role updated to ${newRole}.`);
    } catch (err: any) {
      showToast(`Failed to update role: ${err.message}`);
    }
  };

  const handleResetAccess = async () => {
    try {
      const res = await api.iac.settingsSuite.resetAccess();
      setAccess(res);
      showToast('Access & permissions restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // ── 15.7 Advanced Save, Add Env Var, Delete Env Var ──
  const handleSaveAdvanced = async () => {
    try {
      setSaving(true);
      const res = await api.iac.settingsSuite.updateAdvanced(advanced);
      setAdvanced(res);
      showToast('Advanced settings saved successfully.');
    } catch (err: any) {
      showToast(`Failed to save advanced settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEnvVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName || !newVarValue) return;
    try {
      const res = await api.iac.settingsSuite.addEnvVar({
        name: newVarName,
        value: newVarValue,
      });
      setAdvanced((prev) => ({
        ...prev,
        environment_variables: [
          ...prev.environment_variables.filter((v) => v.name !== res.name),
          res,
        ],
      }));
      setIsAddEnvVarOpen(false);
      setNewVarName('');
      setNewVarValue('');
      showToast(`Variable ${res.name} saved.`);
    } catch (err: any) {
      showToast(`Failed to add variable: ${err.message}`);
    }
  };

  const handleDeleteEnvVar = async (name: string) => {
    try {
      await api.iac.settingsSuite.deleteEnvVar(name);
      setAdvanced((prev) => ({
        ...prev,
        environment_variables: prev.environment_variables.filter((v) => v.name !== name),
      }));
      showToast(`Variable ${name} removed.`);
    } catch (err: any) {
      showToast(`Failed to delete variable: ${err.message}`);
    }
  };

  const handleResetAdvanced = async () => {
    try {
      const res = await api.iac.settingsSuite.resetAdvanced();
      setAdvanced(res);
      showToast('Advanced settings restored to defaults.');
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  // Section titles and subtitles
  const sectionMeta: Record<SettingsSection, { title: string; subtitle: string }> = {
    general: {
      title: 'General Settings',
      subtitle: 'Configure basic IaC security settings for this repository.',
    },
    scan: {
      title: 'Scan Settings',
      subtitle: 'Configure IaC scanner, scan behavior and detection options.',
    },
    rules: {
      title: 'Rules & Policies',
      subtitle: 'Configure IaC security rules, policy packs and severity thresholds.',
    },
    exclusions: {
      title: 'Exclusions',
      subtitle: 'Exclude specific files, paths, resources or rules from scanning.',
    },
    notifications: {
      title: 'Notifications',
      subtitle: 'Configure notifications for IaC security events and scan results.',
    },
    access: {
      title: 'Access & Permissions',
      subtitle: 'Manage who can access and configure IaC security settings.',
    },
    advanced: {
      title: 'Advanced Settings',
      subtitle: 'Configure advanced scanner options and performance settings.',
    },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-blue-600/20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white border border-blue-200 text-slate-800 px-4 py-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Code</span>
          <span>&gt;</span>
          <Link href="/code/iac" className="hover:text-blue-600 transition-colors">
            IaC Security
          </Link>
          <span>&gt;</span>
          <span className="text-slate-700 font-medium">Settings</span>
          <span>&gt;</span>
          <span className="text-slate-900 capitalize font-semibold">
            {activeSection === 'scan'
              ? 'Scan Settings'
              : activeSection === 'rules'
              ? 'Rules & Policies'
              : activeSection === 'access'
              ? 'Access & Permissions'
              : activeSection === 'advanced'
              ? 'Advanced'
              : activeSection}
          </span>
        </div>

        {/* Master Settings Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Settings Navigation Sub-menu (Screens 15.1 - 15.7) */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-1 shadow-sm">
              <span className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Settings
              </span>
              {[
                { id: 'general', label: 'General', icon: Sliders },
                { id: 'scan', label: 'Scan Settings', icon: FileCode },
                { id: 'rules', label: 'Rules & Policies', icon: Shield },
                { id: 'exclusions', label: 'Exclusions', icon: FolderMinus },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'access', label: 'Access & Permissions', icon: Users },
                { id: 'advanced', label: 'Advanced', icon: Cpu },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as SettingsSection)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="md:col-span-9 flex flex-col gap-6">
            
            {/* Header Title & Subtitle */}
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {sectionMeta[activeSection].title}
              </h1>
              <p className="text-xs text-slate-500">
                {sectionMeta[activeSection].subtitle}
              </p>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                15.1 GENERAL SETTINGS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'general' && (
              <div className="flex flex-col gap-6">
                {/* Repository Configuration Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Repository Configuration</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
                    <label className="text-slate-700 font-medium">Repository</label>
                    <div className="md:col-span-2">
                      <select
                        value={general.repository}
                        onChange={(e) => setGeneral({ ...general, repository: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {repositories && repositories.length > 0 ? (
                          repositories.map((repo) => (
                            <option key={repo.id} value={repo.name}>
                              {repo.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value={effectiveRepoName}>{effectiveRepoName}</option>
                            <option value="frontend-app">frontend-app</option>
                            <option value="backend-api">backend-api</option>
                            <option value="infra-terraform">infra-terraform</option>
                          </>
                        )}
                      </select>
                    </div>

                    <label className="text-slate-700 font-medium">Default Branch</label>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={general.default_branch}
                        onChange={(e) => setGeneral({ ...general, default_branch: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <label className="text-slate-700 font-medium">IaC Working Directory</label>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <input
                        type="text"
                        value={general.iac_working_directory}
                        onChange={(e) => setGeneral({ ...general, iac_working_directory: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-500">
                        Path to scan for IaC files (e.g., ./, /infra, terraform/)
                      </span>
                    </div>

                    <label className="text-slate-700 font-medium self-start mt-2">Supported IaC Types</label>
                    <div className="md:col-span-2 flex flex-col gap-2.5">
                      {['Terraform', 'CloudFormation', 'Kubernetes Manifests', 'Helm Charts'].map((type) => {
                        const checked = general.supported_iac_types.includes(type);
                        return (
                          <label key={type} className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...general.supported_iac_types, type]
                                  : general.supported_iac_types.filter((t) => t !== type);
                                setGeneral({ ...general, supported_iac_types: next });
                              }}
                              className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <span>{type}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetGeneral}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveGeneral}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Scan Behavior Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Scan Behavior</h3>

                  <div className="flex flex-col gap-4 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <span className="font-medium text-slate-900 block">Automatic Scan on Push</span>
                        <span className="text-[11px] text-slate-500">Trigger IaC scan on code push events</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={general.auto_scan_on_push}
                        onChange={(e) => setGeneral({ ...general, auto_scan_on_push: e.target.checked })}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <span className="font-medium text-slate-900 block">Scan on Pull Request</span>
                        <span className="text-[11px] text-slate-500">Scan IaC changes in pull requests</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={general.scan_on_pr}
                        onChange={(e) => setGeneral({ ...general, scan_on_pr: e.target.checked })}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium text-slate-900 block">Scan on Schedule</span>
                        <span className="text-[11px] text-slate-500">Run scheduled scans (configure in Scan Settings)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={general.scan_on_schedule}
                        onChange={(e) => setGeneral({ ...general, scan_on_schedule: e.target.checked })}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetGeneral}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveGeneral}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.2 SCAN SETTINGS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'scan' && (
              <div className="flex flex-col gap-6">
                {/* Scanner Configuration Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Scanner Configuration</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
                    <label className="text-slate-700 font-medium">IaC Scanner</label>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <select
                        value={scan.iac_scanner}
                        onChange={(e) => setScan({ ...scan, iac_scanner: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Checkov (Default)">Checkov (Default)</option>
                        <option value="tfsec">tfsec</option>
                        <option value="Trivy">Trivy</option>
                      </select>
                      <span className="text-[11px] text-slate-500">
                        Open source IaC security scanner with broad rule coverage
                      </span>
                    </div>

                    <label className="text-slate-700 font-medium">Scanner Version</label>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <span className="font-mono text-slate-900">{scan.scanner_version}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Latest
                      </span>
                      <button
                        onClick={handleCheckUpdates}
                        disabled={checkingUpdates}
                        className="text-blue-600 hover:text-blue-700 text-xs hover:underline transition-colors ml-2"
                      >
                        {checkingUpdates ? 'Checking...' : 'Check for updates'}
                      </button>
                    </div>

                    <label className="text-slate-700 font-medium self-start mt-2">Additional Tools</label>
                    <div className="md:col-span-2 flex flex-col gap-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scan.additional_tools.tfsec}
                          onChange={(e) =>
                            setScan({
                              ...scan,
                              additional_tools: { ...scan.additional_tools, tfsec: e.target.checked },
                            })
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="font-medium text-slate-900 block">tfsec (Terraform)</span>
                          <span className="text-[11px] text-slate-500">Lightweight Terraform security scanner</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scan.additional_tools.kube_score}
                          onChange={(e) =>
                            setScan({
                              ...scan,
                              additional_tools: { ...scan.additional_tools, kube_score: e.target.checked },
                            })
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="font-medium text-slate-900 block">kube-score (Kubernetes)</span>
                          <span className="text-[11px] text-slate-500">Kubernetes object analysis</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scan.additional_tools.kube_linter}
                          onChange={(e) =>
                            setScan({
                              ...scan,
                              additional_tools: { ...scan.additional_tools, kube_linter: e.target.checked },
                            })
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="font-medium text-slate-900 block">kube-linter (Kubernetes)</span>
                          <span className="text-[11px] text-slate-500">Kubernetes manifest linter</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scan.additional_tools.custom_scanner}
                          onChange={(e) =>
                            setScan({
                              ...scan,
                              additional_tools: { ...scan.additional_tools, custom_scanner: e.target.checked },
                            })
                          }
                          className="w-4 h-4 mt-0.5 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="w-full">
                          <span className="font-medium text-slate-900 block">Custom Scanner</span>
                          <input
                            type="text"
                            placeholder="Enter custom scanner command"
                            value={scan.additional_tools.custom_scanner_command}
                            onChange={(e) =>
                              setScan({
                                ...scan,
                                additional_tools: {
                                  ...scan.additional_tools,
                                  custom_scanner_command: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1.5 bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Scan Scope Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Scan Scope</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
                    <label className="text-slate-700 font-medium">File Extensions</label>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <input
                        type="text"
                        value={scan.file_extensions}
                        onChange={(e) => setScan({ ...scan, file_extensions: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-500">Comma separated file extensions</span>
                    </div>

                    <label className="text-slate-700 font-medium">Max File Size</label>
                    <div className="md:col-span-2">
                      <select
                        value={scan.max_file_size_mb}
                        onChange={(e) => setScan({ ...scan, max_file_size_mb: parseInt(e.target.value, 10) })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={2}>2 MB</option>
                        <option value={5}>5 MB</option>
                        <option value={10}>10 MB</option>
                        <option value={20}>20 MB</option>
                      </select>
                    </div>

                    <label className="text-slate-700 font-medium">Parallel Scans</label>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <select
                        value={scan.parallel_scans}
                        onChange={(e) => setScan({ ...scan, parallel_scans: parseInt(e.target.value, 10) })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={2}>2</option>
                        <option value={4}>4</option>
                        <option value={8}>8</option>
                      </select>
                      <span className="text-[11px] text-slate-500">Number of parallel scan jobs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetScan}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveScan}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.3 RULES & POLICIES
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'rules' && (
              <div className="flex flex-col gap-6">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
                  {[
                    { id: 'packs', label: 'Policy Packs' },
                    { id: 'custom', label: 'Custom Rules' },
                    { id: 'thresholds', label: 'Severity Thresholds' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setRulesSubTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        rulesSubTab === t.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Enabled Policy Packs Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Enabled Policy Packs</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 w-8"></th>
                          <th className="py-2.5 px-3 font-medium">Name</th>
                          <th className="py-2.5 px-3 font-medium">Type</th>
                          <th className="py-2.5 px-3 font-medium">Version</th>
                          <th className="py-2.5 px-3 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(rulesPolicies.policy_packs || []).map((pack) => {
                          const isEnabled = pack.status === 'Enabled';
                          return (
                            <tr key={pack.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleTogglePolicyPack(pack.name, pack.status)}
                                  className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-900 font-sans">
                                {pack.name}
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-sans">
                                {pack.type}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                {pack.version}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleTogglePolicyPack(pack.name, pack.status)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium font-sans cursor-pointer transition-colors ${
                                    isEnabled
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {pack.status}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Severity Mapping Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Severity Mapping</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Map tool-specific severities to standard severity levels.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium">Tool Severity</th>
                          <th className="py-2.5 px-3 font-medium">Critical</th>
                          <th className="py-2.5 px-3 font-medium">High</th>
                          <th className="py-2.5 px-3 font-medium">Medium</th>
                          <th className="py-2.5 px-3 font-medium">Low</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {['Checkov', 'tfsec', 'kube-score'].map((tool) => {
                          const mapping = rulesPolicies.severity_mappings[tool] || {
                            critical: 'High',
                            high: 'High',
                            medium: 'Medium',
                            low: 'Low',
                          };
                          return (
                            <tr key={tool} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 font-medium text-slate-900 font-sans">
                                {tool}
                              </td>
                              {['critical', 'high', 'medium', 'low'].map((sevKey) => (
                                <td key={sevKey} className="py-2 px-3">
                                  <select
                                    value={(mapping as any)[sevKey]}
                                    onChange={(e) => {
                                      const updated = {
                                        ...rulesPolicies.severity_mappings,
                                        [tool]: {
                                          ...mapping,
                                          [sevKey]: e.target.value,
                                        },
                                      };
                                      setRulesPolicies({ ...rulesPolicies, severity_mappings: updated });
                                    }}
                                    className="bg-white border border-[#CBD5E1] rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 font-sans text-xs"
                                  >
                                    <option value="Critical">Critical</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                  </select>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetRulesPolicies}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveRulesPolicies}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.4 EXCLUSIONS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'exclusions' && (
              <div className="flex flex-col gap-6">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
                  {[
                    { id: 'files', label: 'File / Path Exclusions' },
                    { id: 'resources', label: 'Resource Exclusions' },
                    { id: 'rules', label: 'Rule Exclusions' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setExclusionsSubTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        exclusionsSubTab === t.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* File / Path Exclusions Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">File / Path Exclusions</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Exclude specific files or directories from IaC scanning.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddExclusionOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Exclusion
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium">Pattern</th>
                          <th className="py-2.5 px-3 font-medium">Type</th>
                          <th className="py-2.5 px-3 font-medium">Description</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(exclusions.exclusions || []).map((exc) => (
                          <tr key={exc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-medium text-blue-600">
                              {exc.pattern}
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-sans">
                              {exc.type}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-sans">
                              {exc.description}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteExclusion(exc.id, exc.pattern)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete exclusion"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview / Path Test Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Test a file path to see if it will be excluded.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={previewPath}
                      onChange={(e) => setPreviewPath(e.target.value)}
                      placeholder="e.g. infra/terraform/main.tf"
                      className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handlePreviewExclusion}
                      disabled={previewing}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {previewing ? 'Checking...' : 'Check'}
                    </button>
                  </div>

                  {previewResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        previewResult.is_excluded
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {previewResult.is_excluded ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>{previewResult.message}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetExclusions}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => showToast('Exclusions state is up to date.')}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Modal: Add Exclusion */}
                {isAddExclusionOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-2xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">Add Exclusion Pattern</h3>
                        <button onClick={() => setIsAddExclusionOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleAddExclusion} className="flex flex-col gap-4 mt-4 text-xs">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Glob Pattern</label>
                          <input
                            type="text"
                            placeholder="e.g. **/tests/**, *.tfvars"
                            value={newExclPattern}
                            onChange={(e) => setNewExclPattern(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Target Type</label>
                          <select
                            value={newExclType}
                            onChange={(e) => setNewExclType(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Directory">Directory</option>
                            <option value="File">File</option>
                            <option value="Resource">Resource</option>
                            <option value="Rule">Rule</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="Reason or purpose for exclusion"
                            value={newExclDesc}
                            onChange={(e) => setNewExclDesc(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setIsAddExclusionOpen(false)}
                            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                          >
                            Add Pattern
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.5 NOTIFICATIONS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'notifications' && (
              <div className="flex flex-col gap-6">
                {/* Master Toggles Grid */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors">
                      <div>
                        <span className="font-semibold text-slate-900 block">Enable Notifications</span>
                        <span className="text-[11px] text-slate-500">Send notifications for scan results and security events</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.enable_notifications}
                        onChange={(e) => setNotifications({ ...notifications, enable_notifications: e.target.checked })}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors">
                      <div>
                        <span className="font-semibold text-slate-900 block">Notify on Critical Findings</span>
                        <span className="text-[11px] text-slate-500">Get notified immediately for critical severity findings</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.notify_on_critical_findings}
                        onChange={(e) =>
                          setNotifications({ ...notifications, notify_on_critical_findings: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors">
                      <div>
                        <span className="font-semibold text-slate-900 block">Notify on Scan Completion</span>
                        <span className="text-[11px] text-slate-500">Get notified when a scan is completed</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.notify_on_scan_completion}
                        onChange={(e) =>
                          setNotifications({ ...notifications, notify_on_scan_completion: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors">
                      <div>
                        <span className="font-semibold text-slate-900 block">Notify on Policy Violations</span>
                        <span className="text-[11px] text-slate-500">Get notified when quality gates fail</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.notify_on_policy_violations}
                        onChange={(e) =>
                          setNotifications({ ...notifications, notify_on_policy_violations: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Notification Channels Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Notification Channels</h3>
                    <button
                      onClick={() => setIsAddChannelOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Channel
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium">Channel</th>
                          <th className="py-2.5 px-3 font-medium">Type</th>
                          <th className="py-2.5 px-3 font-medium">Configuration</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(notifications.channels || []).map((ch) => (
                          <tr key={ch.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-medium text-slate-900 font-mono">
                              {ch.channel}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {ch.type}
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                              {ch.configuration}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  ch.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {ch.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteChannel(ch.id, ch.channel)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notification Events Checklist Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Notification Events</h3>
                  <p className="text-xs text-slate-500 -mt-2">
                    Select events to receive notifications for:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {[
                      { key: 'scan_completed', label: 'Scan completed' },
                      { key: 'critical_findings_detected', label: 'Critical findings detected' },
                      { key: 'policy_violations', label: 'Policy violations' },
                      { key: 'new_rules_available', label: 'New rules available' },
                      { key: 'scan_failed', label: 'Scan failed' },
                      { key: 'high_severity_findings', label: 'High severity findings' },
                      { key: 'drift_detected', label: 'Drift detected' },
                      { key: 'compliance_status_changed', label: 'Compliance status changed' },
                    ].map((item) => {
                      const checked = (notifications.events as any)[item.key];
                      return (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setNotifications({
                                ...notifications,
                                events: {
                                  ...notifications.events,
                                  [item.key]: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetNotifications}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Modal: Add Channel */}
                {isAddChannelOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-2xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">Add Notification Channel</h3>
                        <button onClick={() => setIsAddChannelOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleAddChannel} className="flex flex-col gap-4 mt-4 text-xs">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Channel Name</label>
                          <input
                            type="text"
                            placeholder="e.g. dev-sec-team, security-alerts"
                            value={newChanName}
                            onChange={(e) => setNewChanName(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Channel Type</label>
                          <select
                            value={newChanType}
                            onChange={(e) => setNewChanType(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Slack">Slack</option>
                            <option value="Email">Email</option>
                            <option value="Webhook">Webhook</option>
                            <option value="Jira">Jira</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Configuration</label>
                          <input
                            type="text"
                            placeholder="#channel-name, email, or webhook URL"
                            value={newChanConfig}
                            onChange={(e) => setNewChanConfig(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setIsAddChannelOpen(false)}
                            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                          >
                            Save Channel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.6 ACCESS & PERMISSIONS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'access' && (
              <div className="flex flex-col gap-6">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
                  {[
                    { id: 'users', label: 'User Access' },
                    { id: 'roles', label: 'Roles' },
                    { id: 'matrix', label: 'Permission Matrix' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAccessSubTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        accessSubTab === t.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Users with Access Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Users with Access</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage users and their roles for IaC security.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddUserOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add User
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium">User</th>
                          <th className="py-2.5 px-3 font-medium">Role</th>
                          <th className="py-2.5 px-3 font-medium">Permissions</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(access.users || []).map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-bold">
                                  {usr.avatar_initials}
                                </span>
                                <span className="font-medium text-slate-900 font-mono text-xs">
                                  {usr.user}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={usr.role}
                                onChange={(e) => handleUpdateRole(usr.id, e.target.value)}
                                className="bg-white border border-[#CBD5E1] rounded px-2 py-1 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                              >
                                <option value="Admin">Admin</option>
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                                <option value="Custom">Custom</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {usr.permissions}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  usr.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {usr.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(usr.id, usr.user)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Role Definitions Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Role Definitions</h3>
                  <p className="text-xs text-slate-500 -mt-2">
                    Predefined roles for IaC security
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium w-40">Role</th>
                          <th className="py-2.5 px-3 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(access.roles || []).map((r) => (
                          <tr key={r.role} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-semibold text-blue-600">
                              {r.role}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {r.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetAccess}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => showToast('Access settings are up to date.')}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Modal: Add User */}
                {isAddUserOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-2xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">Add User Access</h3>
                        <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleAddUser} className="flex flex-col gap-4 mt-4 text-xs">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">User Identifier</label>
                          <input
                            type="text"
                            placeholder="e.g. alex.dev, security.lead"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Role</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                            <option value="Custom">Custom</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 font-sans">
                          <button
                            type="button"
                            onClick={() => setIsAddUserOpen(false)}
                            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                          >
                            Grant Access
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                15.7 ADVANCED SETTINGS
            ───────────────────────────────────────────────────────────── */}
            {activeSection === 'advanced' && (
              <div className="flex flex-col gap-6">
                {/* Performance Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Performance</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-700 font-medium">Scan Timeout</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={advanced.scan_timeout_minutes}
                            onChange={(e) =>
                              setAdvanced({ ...advanced, scan_timeout_minutes: parseInt(e.target.value, 10) || 10 })
                            }
                            className="w-16 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-slate-500">minutes</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">Maximum time allowed for a single scan</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-700 font-medium">Max Memory Usage</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={advanced.max_memory_usage_gb}
                            onChange={(e) =>
                              setAdvanced({ ...advanced, max_memory_usage_gb: parseInt(e.target.value, 10) || 2 })
                            }
                            className="w-16 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-slate-500">GB</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">Memory limit for scanner execution</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-medium text-slate-900 block">Cache Results</span>
                      <span className="text-[11px] text-slate-500">Use cache to speed up subsequent scans</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={advanced.cache_results}
                        onChange={(e) => setAdvanced({ ...advanced, cache_results: e.target.checked })}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={advanced.cache_ttl_days}
                          onChange={(e) =>
                            setAdvanced({ ...advanced, cache_ttl_days: parseInt(e.target.value, 10) || 7 })
                          }
                          className="w-12 bg-white border border-[#CBD5E1] rounded px-1.5 py-0.5 text-slate-900 font-mono text-center text-xs"
                        />
                        <span className="text-slate-500 text-[11px]">days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Scanner Options Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Advanced Scanner Options</h3>

                  <div className="flex flex-col gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Checkov Arguments</label>
                      <input
                        type="text"
                        value={advanced.checkov_arguments}
                        onChange={(e) => setAdvanced({ ...advanced, checkov_arguments: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Additional arguments for Checkov scanner
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">tfsec Arguments</label>
                      <input
                        type="text"
                        value={advanced.tfsec_arguments}
                        onChange={(e) => setAdvanced({ ...advanced, tfsec_arguments: e.target.value })}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Additional arguments for tfsec scanner
                      </span>
                    </div>
                  </div>
                </div>

                {/* Environment Variables Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Environment Variables</h3>
                    <button
                      onClick={() => setIsAddEnvVarOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Variable
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-medium">Name</th>
                          <th className="py-2.5 px-3 font-medium">Value</th>
                          <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(advanced.environment_variables || []).map((v) => (
                          <tr key={v.name} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-medium text-blue-600">
                              {v.name}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {v.value}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteEnvVar(v.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleResetAdvanced}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveAdvanced}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Modal: Add Env Var */}
                {isAddEnvVarOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-2xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">Add Environment Variable</h3>
                        <button onClick={() => setIsAddEnvVarOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleAddEnvVar} className="flex flex-col gap-4 mt-4 text-xs font-mono">
                        <div>
                          <label className="block text-slate-700 font-sans font-medium mb-1">Variable Name</label>
                          <input
                            type="text"
                            placeholder="e.g. AWS_REGION, SCAN_DEBUG"
                            value={newVarName}
                            onChange={(e) => setNewVarName(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-sans font-medium mb-1">Variable Value</label>
                          <input
                            type="text"
                            placeholder="e.g. us-east-1, true"
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 font-sans">
                          <button
                            type="button"
                            onClick={() => setIsAddEnvVarOpen(false)}
                            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                          >
                            Add Variable
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsSuiteWorkspace;
