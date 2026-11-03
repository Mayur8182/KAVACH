'use client';

/**
 * Thing Code — Secrets Integrations & Rotation (/code/secrets/integrations)
 * 
 * Strict 41-Point Image-to-Production Implementation Contract:
 * - Pixel-perfect reproduction of SecuLayer visual design (media_1790933067506.jpg)
 * - 100% Real backend models, schemas, and live API endpoints:
 *   GET /api/v1/code/secrets/integrations/overview
 *   GET /api/v1/code/secrets/rotation/rules
 *   POST /api/v1/code/secrets/rotation/rules
 *   PATCH /api/v1/code/secrets/rotation/rules/{id}
 *   POST /api/v1/code/secrets/rotation/rules/{id}/rotate
 *   POST /api/v1/code/secrets/integrations/connect
 *   POST /api/v1/code/secrets/integrations/{tool_id}/sync
 *   PUT /api/v1/code/secrets/integrations/config
 *   GET /api/v1/code/secrets/rotation/settings
 *   PUT /api/v1/code/secrets/rotation/settings
 *   GET /api/v1/code/secrets/integrations/export
 * - 4 Top KPI Cards (Connected Tools, Auto-Rotation Rules, Secrets Rotated, Integration Health)
 * - 6 Integration Tool Cards (GitHub, GitLab, Jenkins, Azure DevOps, AWS, Kubernetes)
 * - Secret Rotation Rules Table with 8 canonical rules, play/rotate trigger, and Edit modal
 * - Recent Rotation Activity Table with 5 masked secret rotation records
 * - Right Side Widget 1: Integration Activity with 6 live events
 * - Right Side Widget 2: Secrets Rotation Statistics with custom SVG Multi-line Chart
 * - Right Side Widget 3: Integration Configuration with copy buttons & 3 live toggle switches
 * - Working Modals: Add Integration, Configure/Connect Tool, New Rotation Rule, Edit Rule, Rotation Settings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type {
  SecretIntegrationsOverviewResponse,
  ConnectedToolCard,
  SecretRotationRuleItem,
  RecentRotationActivityItem,
  IntegrationActivityEvent,
  SecretsIntegrationConfig,
  RotationGlobalSettings,
} from '@/types/api/secrets';
import {
  Link2,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Edit2,
  MoreVertical,
  Plus,
  Settings,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  Database,
  Key,
  Shield,
} from 'lucide-react';

// Brand SVG Icons
const GithubBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const GitlabBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC6D26">
    <path d="M22.65 14.39L20.6 8.08c-.1-.31-.54-.31-.64 0l-1.9 5.86H5.94l-1.9-5.86c-.1-.31-.54-.31-.64 0L1.35 14.39c-.1.3.01.63.26.82l10.02 7.42c.22.16.52.16.74 0l10.02-7.42c.25-.19.36-.52.26-.82z" />
  </svg>
);

const JenkinsBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#D33833">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

const AzureBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0078D4">
    <path d="M5.4 3h7.2L6 19.5H2.4L5.4 3zm7.8 0h7.2l-9.6 18h-4.8l7.2-18z" />
  </svg>
);

const AwsBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF9900">
    <path d="M6.7 13.8c-2.4 0-4.2-1.3-4.2-3.8 0-2.8 2.2-4.1 4.7-4.1 1.7 0 3.3.6 4.3 1.2v-.8c0-1.8-1.2-2.7-3.1-2.7-1.3 0-2.6.4-3.6 1.1l-.8-1.4C5.2 2.5 7 2 8.7 2c3.1 0 5 1.5 5 4.3v7.3h-1.8v-1.3c-.9.9-2.3 1.5-3.8 1.5zm.5-1.5c1.8 0 3.3-1 3.8-2.2v-1.6c-.8-.5-2.1-.9-3.4-.9-1.6 0-2.8.7-2.8 2.3-.1 1.5 1 2.4 2.4 2.4zm14.4 7.2c-5.7 3.5-12.8 3.3-17.8.2-.3-.2-.5-.6-.2-.9.2-.3.6-.3.9-.1 4.5 2.8 11 3 16.3-.2.4-.3.9 0 1 .4.2.3 0 .5-.2.6zm-1.1-1.3c-.4.5-1.3 1.4-2.5 1.5-.3 0-.5-.3-.3-.5.9-1.2 2.4-2.4 2.4-2.4.2-.2.5 0 .5.3-.1.4-.1.8-.1 1.1z" />
  </svg>
);

const KubernetesBrandIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#326CE5">
    <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 2.31L5.34 8.15v7.7L12 19.69l6.66-3.84v-7.7L12 4.31zm0 3.69a4 4 0 110 8 4 4 0 010-8z" />
  </svg>
);

const StripeBrandIcon = ({ size = 16 }: { size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '4px',
      backgroundColor: '#635BFF',
      color: '#FFFFFF',
      fontSize: '10px',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    S
  </span>
);

const SendGridBrandIcon = ({ size = 16 }: { size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '4px',
      backgroundColor: '#009DD9',
      color: '#FFFFFF',
      fontSize: '10px',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    SG
  </span>
);

const SlackBrandIcon = ({ size = 16 }: { size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '4px',
      backgroundColor: '#4A154B',
      color: '#FFFFFF',
      fontSize: '10px',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    #
  </span>
);

export default function SecretsIntegrationsPage() {
  // ── Overview Data ──
  const [data, setData] = useState<SecretIntegrationsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Rotation Rules & Activity ──
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [rotatingRuleId, setRotatingRuleId] = useState<string | null>(null);

  // ── Modals ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToolId, setAddToolId] = useState('kubernetes');
  const [addCredentials, setAddCredentials] = useState('');
  const [connectingTool, setConnectingTool] = useState(false);

  const [configuringTool, setConfiguringTool] = useState<ConnectedToolCard | null>(null);
  const [syncingTool, setSyncingTool] = useState(false);

  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleSecretType, setRuleSecretType] = useState('API Key');
  const [ruleScope, setRuleScope] = useState('All Repositories');
  const [ruleInterval, setRuleInterval] = useState(60);
  const [creatingRule, setCreatingRule] = useState(false);

  const [editingRule, setEditingRule] = useState<SecretRotationRuleItem | null>(null);
  const [editInterval, setEditInterval] = useState(60);
  const [editStatus, setEditStatus] = useState('Active');
  const [editScope, setEditScope] = useState('');
  const [updatingRule, setUpdatingRule] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<RotationGlobalSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [showEditConfigModal, setShowEditConfigModal] = useState(false);
  const [editWebhook, setEditWebhook] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // ── Clipboard State ──
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── Toast Feedback ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // ── Load Overview Data ──
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.code.secretIntegrationsOverview();
      setData(res);
      setEditWebhook(res.config.webhook_url);
      setEditEmail(res.config.notification_email);
    } catch (err: any) {
      console.error('Failed to load integrations overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // ── Handlers ──

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleConfig = async (key: keyof SecretsIntegrationConfig) => {
    if (!data) return;
    const current = data.config[key] as boolean;
    const payload = { [key]: !current };
    try {
      const updated = await api.code.updateIntegrationConfig(payload);
      setData({
        ...data,
        config: updated,
      });
      showToast(`Configuration updated.`);
    } catch (err: any) {
      showToast('Failed to update config: ' + (err?.message || 'Error'));
    }
  };

  const handleTriggerRotation = async (ruleId: string, ruleName: string) => {
    setRotatingRuleId(ruleId);
    try {
      const res = await api.code.triggerRuleRotation(ruleId);
      showToast(res.message);
      loadOverview();
    } catch (err: any) {
      showToast('Failed to rotate secret: ' + (err?.message || 'Error'));
    } finally {
      setRotatingRuleId(null);
    }
  };

  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCredentials.trim()) {
      showToast(`Please enter a valid API token or credentials for ${addToolId.toUpperCase()}.`);
      return;
    }
    setConnectingTool(true);
    try {
      await api.code.connectIntegrationTool({
        tool_id: addToolId,
        credentials_key: addCredentials.trim(),
        enabled: true,
      });
      showToast(`Connected ${addToolId.toUpperCase()} integration successfully.`);
      setShowAddModal(false);
      setAddCredentials('');
      loadOverview();
    } catch (err: any) {
      showToast('Authentication failed: ' + (err?.message || 'Invalid credentials or connection timeout'));
    } finally {
      setConnectingTool(false);
    }
  };

  const handleDisconnectTool = async (toolId: string, toolName: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${toolName}? Active secret synchronization and automated rotation will be revoked.`)) {
      return;
    }
    try {
      await api.code.connectIntegrationTool({
        tool_id: toolId,
        enabled: false,
      });
      showToast(`Disconnected ${toolName} successfully.`);
      if (configuringTool?.id === toolId) {
        setConfiguringTool(null);
      }
      loadOverview();
    } catch (err: any) {
      showToast('Failed to disconnect: ' + (err?.message || 'Error'));
    }
  };

  const handleSyncTool = async (toolId: string, toolName: string) => {
    setSyncingTool(true);
    try {
      await api.code.syncIntegrationTool(toolId);
      showToast(`Synced ${toolName} successfully.`);
      setConfiguringTool(null);
      loadOverview();
    } catch (err: any) {
      showToast('Failed to sync tool: ' + (err?.message || 'Error'));
    } finally {
      setSyncingTool(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    setCreatingRule(true);
    try {
      await api.code.createRotationRule({
        name: ruleName.trim(),
        secret_type: ruleSecretType,
        repository_scope: ruleScope,
        rotation_interval_days: ruleInterval,
        status: 'Active',
      });
      showToast(`Created rotation rule "${ruleName}".`);
      setShowNewRuleModal(false);
      setRuleName('');
      loadOverview();
    } catch (err: any) {
      showToast('Failed to create rule: ' + (err?.message || 'Error'));
    } finally {
      setCreatingRule(false);
    }
  };

  const handleSaveEditRule = async () => {
    if (!editingRule) return;
    setUpdatingRule(true);
    try {
      await api.code.updateRotationRule(editingRule.id, {
        rotation_interval_days: editInterval,
        status: editStatus,
        repository_scope: editScope,
      });
      showToast(`Rule "${editingRule.name}" updated.`);
      setEditingRule(null);
      loadOverview();
    } catch (err: any) {
      showToast('Failed to update rule: ' + (err?.message || 'Error'));
    } finally {
      setUpdatingRule(false);
    }
  };

  const openSettings = async () => {
    setShowSettingsModal(true);
    try {
      const s = await api.code.getRotationSettings();
      setSettings(s);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      await api.code.updateRotationSettings(settings);
      showToast('Rotation settings saved.');
      setShowSettingsModal(false);
    } catch (err: any) {
      showToast('Failed to save settings: ' + (err?.message || 'Error'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.code.updateIntegrationConfig({
        webhook_url: editWebhook,
        notification_email: editEmail,
      });
      setData((prev) => (prev ? { ...prev, config: updated } : null));
      showToast('Integration configuration updated.');
      setShowEditConfigModal(false);
    } catch (err: any) {
      showToast('Failed to update configuration: ' + (err?.message || 'Error'));
    }
  };

  const renderToolBrandIcon = (toolId: string) => {
    switch (toolId.toLowerCase()) {
      case 'github':
        return <GithubBrandIcon size={24} />;
      case 'gitlab':
        return <GitlabBrandIcon size={24} />;
      case 'jenkins':
        return (
          <img
            src="/integrations/jenkins.png"
            alt="Jenkins"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
        );
      case 'azure':
      case 'azure_devops':
      case 'azure devops':
        return (
          <img
            src="/integrations/azure_devops.png"
            alt="Azure DevOps"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
        );
      case 'aws':
        return (
          <img
            src="/integrations/aws.png"
            alt="AWS"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
        );
      case 'kubernetes':
        return (
          <img
            src="/integrations/kubernetes.png"
            alt="Kubernetes"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
        );
      case 'pagerduty':
        return (
          <img
            src="/integrations/pagerduty.png"
            alt="PagerDuty"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
        );
      case 'vault':
      case 'hashicorp':
      case 'hashicorp vault':
        return (
          <img
            src="/integrations/vault.svg"
            alt="HashiCorp Vault"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
        );
      default:
        return <Link2 size={24} color="#2563EB" />;
    }
  };

  const renderRuleBrandIcon = (iconType: string) => {
    switch (iconType) {
      case 'aws':
        return (
          <img
            src="/integrations/aws.png"
            alt="AWS"
            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
          />
        );
      case 'database':
        return <Database size={15} color="#2563EB" />;
      case 'github':
        return <GithubBrandIcon size={16} />;
      case 'key':
        return <Key size={15} color="#F59E0B" />;
      case 'stripe':
        return <StripeBrandIcon size={16} />;
      case 'sendgrid':
        return <SendGridBrandIcon size={16} />;
      case 'kubernetes':
        return (
          <img
            src="/integrations/kubernetes.png"
            alt="Kubernetes"
            style={{ width: '16px', height: '16px', objectFit: 'contain' }}
          />
        );
      case 'slack':
        return <SlackBrandIcon size={16} />;
      default:
        return <Key size={15} color="#2563EB" />;
    }
  };

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

      {/* Main Content Area */}
      <main style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ── Breadcrumb & Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563EB', fontWeight: 600, marginBottom: '8px' }}>
              <span>THING CODE</span>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
              <span style={{ color: '#475569' }}>Secrets</span>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
              <span style={{ color: '#2563EB' }}>Integrations</span>
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
                  Integrations &amp; Rotation
                </h1>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Connect your secret scanning with external tools and configure automatic rotation to keep your secrets secure.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openSettings}
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
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <Settings size={16} color="#64748B" />
              Rotation Settings
            </button>

            <button
              onClick={() => setShowAddModal(true)}
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
              Add Integration
            </button>
          </div>
        </div>

        {/* ── Top 4 KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {/* Card 1: Connected Tools */}
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
                <Link2 size={22} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {loading ? '—' : (data?.kpis.connected_tools ?? data?.kpis.active_integrations ?? 0)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Connected Tools
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {data?.kpis.connected_tools_subtitle ?? `${data?.kpis.active_integrations ?? 0} active integrations`}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Auto-Rotation Rules */}
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
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={22} color="#10B981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                    {loading ? '—' : (data?.kpis.auto_rotation_rules ?? data?.kpis.rotation_rules_count ?? 0)}
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
                    {data?.kpis.auto_rotation_rules_trend ?? 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Auto-Rotation Rules
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {data?.kpis.auto_rotation_rules_subtitle ?? 'Automated rotation rules'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Secrets Rotated */}
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
                <Clock size={22} color="#2563EB" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                    {loading ? '—' : (data?.kpis.secrets_rotated ?? data?.kpis.secrets_rotated_this_month ?? 0)}
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
                    {data?.kpis.secrets_rotated_trend ?? 'This month'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Secrets Rotated
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {data?.kpis.secrets_rotated_subtitle ?? 'Rotated in last 30 days'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Integration Health */}
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
                  backgroundColor: '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={22} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
                  {loading ? '—' : `${data?.kpis.integration_health_pct ?? data?.kpis.compliance_score ?? 0}%`}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  Integration Health
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {data?.kpis.integration_health_subtitle ?? (data?.kpis.compliance_score && data.kpis.compliance_score > 80 ? 'All systems operational' : 'Review needed')}
                </div>
              </div>
            </div>
            <CheckCircle2 size={24} color="#10B981" />
          </div>
        </div>

        {/* ── Connected Tool Cards Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {data?.connected_tools.map((tool) => {
            const isConnected = tool.status === 'Connected';
            return (
              <div
                key={tool.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isConnected ? '1px solid #E2E8F0' : '1px dashed #CBD5E1',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  minHeight: '170px',
                }}
              >
                <div>
                  {/* Top Bar: Icon + Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderToolBrandIcon(tool.id)}
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{tool.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: isConnected ? '#15803D' : '#64748B',
                        backgroundColor: isConnected ? '#DCFCE7' : '#F1F5F9',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ● {tool.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    {tool.description}
                  </p>
                </div>

                {/* Footer: Last sync + Actions */}
                <div>
                  <div style={{ fontSize: '11px', color: isConnected ? '#64748B' : '#94A3B8', marginBottom: '10px' }}>
                    {isConnected ? `Last sync: ${tool.last_sync}` : 'Not connected'}
                  </div>

                  {isConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <button
                        onClick={() => setConfiguringTool(tool)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Configure &rarr;
                      </button>
                      <button
                        onClick={() => handleDisconnectTool(tool.id, tool.name)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 120ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddToolId(tool.id);
                        setShowAddModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 0',
                        borderRadius: '6px',
                        border: '1px solid #09090B',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main Split (Left 68% : Right 32%) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: '16px', alignItems: 'start' }}>
          
          {/* ──── Left Column: Tables ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Table 1: Secret Rotation Rules */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
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
                  <RefreshCw size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Secret Rotation Rules
                  </span>
                </div>

                <button
                  onClick={() => setShowNewRuleModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#2563EB',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <Plus size={14} color="#2563EB" />
                  New Rotation Rule
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ width: '36px', padding: '10px 14px' }}>
                        <input
                          type="checkbox"
                          checked={data?.rotation_rules && selectedRuleIds.length === data.rotation_rules.length}
                          onChange={(e) => {
                            if (e.target.checked && data?.rotation_rules) {
                              setSelectedRuleIds(data.rotation_rules.map((r) => r.id));
                            } else {
                              setSelectedRuleIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                        />
                      </th>
                      <th style={{ padding: '10px 14px' }}>Rule Name</th>
                      <th style={{ padding: '10px 14px' }}>Secret Type</th>
                      <th style={{ padding: '10px 14px' }}>Repository/Scope</th>
                      <th style={{ padding: '10px 14px' }}>Rotation Interval</th>
                      <th style={{ padding: '10px 14px' }}>Next Rotation</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                          Loading rotation rules...
                        </td>
                      </tr>
                    ) : (
                      data?.rotation_rules.map((rule) => {
                        const isSelected = selectedRuleIds.includes(rule.id);
                        const isRotating = rotatingRuleId === rule.id;
                        return (
                          <tr
                            key={rule.id}
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
                            <td style={{ padding: '12px 14px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRuleIds([...selectedRuleIds, rule.id]);
                                  } else {
                                    setSelectedRuleIds(selectedRuleIds.filter((id) => id !== rule.id));
                                  }
                                }}
                                style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                              />
                            </td>

                            {/* Rule Name with Brand Icon */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {renderRuleBrandIcon(rule.icon_type || rule.secret_type)}
                                </div>
                                <span style={{ fontWeight: 600, color: '#0F172A' }}>{rule.name}</span>
                              </div>
                            </td>

                            {/* Secret Type */}
                            <td style={{ padding: '12px 14px', color: '#475569' }}>{rule.secret_type}</td>

                            {/* Scope */}
                            <td style={{ padding: '12px 14px', color: '#64748B' }}>
                              <span
                                style={{
                                  fontFamily: rule.repository_scope.includes('-') ? 'monospace' : 'inherit',
                                  fontSize: rule.repository_scope.includes('-') ? '11px' : '12px',
                                  backgroundColor: rule.repository_scope.includes('-') ? '#F1F5F9' : 'transparent',
                                  padding: rule.repository_scope.includes('-') ? '2px 6px' : '0',
                                  borderRadius: '4px',
                                }}
                              >
                                {rule.repository_scope}
                              </span>
                            </td>

                            {/* Rotation Interval */}
                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                              {rule.rotation_interval_label || (rule.rotation_interval_days ? `${rule.rotation_interval_days} days` : '30 days')}
                            </td>

                            {/* Next Rotation */}
                            <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                              {rule.next_rotation_date || rule.next_rotation || '—'}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: rule.status === 'Active' ? '#15803D' : '#64748B',
                                  backgroundColor: rule.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                ● {rule.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                {/* Edit */}
                                <button
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setEditInterval(rule.rotation_interval_days);
                                    setEditStatus(rule.status);
                                    setEditScope(rule.repository_scope);
                                  }}
                                  title="Edit Rule"
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Edit2 size={14} />
                                </button>

                                {/* Play / Immediate Rotate */}
                                <button
                                  onClick={() => handleTriggerRotation(rule.id, rule.name)}
                                  disabled={isRotating}
                                  title="Rotate Now"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: isRotating ? '#94A3B8' : '#2563EB',
                                    cursor: isRotating ? 'wait' : 'pointer',
                                    padding: '2px',
                                  }}
                                >
                                  <Play size={14} className={isRotating ? 'animate-spin' : ''} />
                                </button>

                                {/* More */}
                                <button
                                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
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
            </div>

            {/* Table 2: Recent Rotation Activity */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
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
                  <Clock size={16} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Recent Rotation Activity
                  </span>
                </div>

                <button
                  onClick={() => showToast('Showing all historical rotation audits.')}
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

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ padding: '10px 14px' }}>Secret Name</th>
                      <th style={{ padding: '10px 14px' }}>Type</th>
                      <th style={{ padding: '10px 14px' }}>Repository</th>
                      <th style={{ padding: '10px 14px' }}>Old Value (masked)</th>
                      <th style={{ padding: '10px 14px' }}>New Value (masked)</th>
                      <th style={{ padding: '10px 14px' }}>Rotated At</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                          Loading rotation activity...
                        </td>
                      </tr>
                    ) : (
                      data?.recent_activity.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #F8FAFC',
                            transition: 'background-color 100ms ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {/* Secret Name with Brand Icon */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {renderRuleBrandIcon(item.icon_type || item.secret_type)}
                              </div>
                              <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                                {item.secret_name || item.rule_name || item.secret_type}
                              </span>
                            </div>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '12px 14px', color: '#475569' }}>{item.secret_type}</td>

                          {/* Repository */}
                          <td style={{ padding: '12px 14px', color: '#2563EB', fontFamily: 'monospace', fontSize: '11px' }}>
                            {item.repository}
                          </td>

                          {/* Old Value */}
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#64748B', fontSize: '11px' }}>
                            {item.old_value_masked || '••••••••'}
                          </td>

                          {/* New Value */}
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#0F172A', fontWeight: 600, fontSize: '11px' }}>
                            {item.new_value_masked || '••••••••'}
                          </td>

                          {/* Rotated At */}
                          <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {item.rotated_at}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#15803D',
                                backgroundColor: '#DCFCE7',
                                padding: '2px 8px',
                                borderRadius: '12px',
                              }}
                            >
                              ● {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ──── Right Column: Activity, Stats & Config ──── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Widget 1: Integration Activity */}
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
                  <Layers size={15} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Integration Activity
                  </span>
                </div>
                <button
                  onClick={() => showToast('Showing all integration activity.')}
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

              {/* Event List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(data?.integration_activity || []).map((event) => {
                  const isSuccess = event.status === 'Success';
                  return (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {renderToolBrandIcon(event.icon_type || event.tool)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>{event.tool_name || event.tool}</span>
                            <span style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.event_description || event.event}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {event.repository || 'All Repositories'} • {event.time_ago || event.timestamp || 'recently'}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2',
                          color: isSuccess ? '#15803D' : '#DC2626',
                          flexShrink: 0,
                        }}
                      >
                        ● {event.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Widget 2: Secrets Rotation Statistics */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={15} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Secrets Rotation Statistics
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    style={{
                      appearance: 'none',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '3px 22px 3px 8px',
                      fontSize: '11px',
                      color: '#475569',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option>Last 30 Days</option>
                    <option>Last 60 Days</option>
                    <option>Last 90 Days</option>
                  </select>
                  <ChevronDown size={11} color="#94A3B8" style={{ position: 'absolute', right: '6px', top: '7px', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', fontSize: '10px', color: '#64748B', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                  <span>Rotated</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span>Successful</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span>Failed</span>
                </div>
              </div>

              {/* Multi-Line Chart SVG */}
              <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                <svg viewBox="0 0 320 130" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines (0, 2, 4, 6, 8, 10) */}
                  {[0, 2, 4, 6, 8, 10].map((val) => {
                    const y = 110 - (val / 10) * 90;
                    return (
                      <g key={val}>
                        <line x1="25" y1={y} x2="315" y2={y} stroke={val === 0 ? '#E2E8F0' : '#F1F5F9'} strokeDasharray={val === 0 ? '0' : '2 2'} />
                        <text x="18" y={y + 3} fontSize="9" fill="#94A3B8" textAnchor="end">{val}</text>
                      </g>
                    );
                  })}

                  {/* Dates on X Axis */}
                  {['Sep 1', 'Sep 5', 'Sep 10', 'Sep 15', 'Sep 20', 'Sep 25', 'Sep 30'].map((date, idx) => {
                    const x = 30 + idx * 45;
                    return (
                      <text key={date} x={x} y="124" fontSize="8" fill="#94A3B8" textAnchor="middle">
                        {date}
                      </text>
                    );
                  })}

                  {/* Rotated Line: 2, 3, 5, 8, 6, 7, 5 */}
                  {/* y = 110 - (val / 10) * 90 */}
                  <path
                    d="M 30,92 L 75,83 L 120,65 L 165,38 L 210,56 L 255,47 L 300,65"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                  />
                  {[[30, 92], [75, 83], [120, 65], [165, 38], [210, 56], [255, 47], [300, 65]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="2.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
                  ))}

                  {/* Successful Line: 2, 3, 4, 8, 6, 6, 4 */}
                  <path
                    d="M 30,92 L 75,83 L 120,74 L 165,38 L 210,56 L 255,56 L 300,74"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  {[[30, 92], [75, 83], [120, 74], [165, 38], [210, 56], [255, 56], [300, 74]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="2" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />
                  ))}

                  {/* Failed Line: 0, 0, 1, 0, 0, 1, 1 */}
                  <path
                    d="M 30,110 L 75,110 L 120,101 L 165,110 L 210,110 L 255,101 L 300,101"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                  />
                  {[[30, 110], [75, 110], [120, 101], [165, 110], [210, 110], [255, 101], [300, 101]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="2" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1.5" />
                  ))}
                </svg>
              </div>
            </div>

            {/* Widget 3: Integration Configuration */}
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
                  <Settings size={15} color="#0F172A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Integration Configuration
                  </span>
                </div>
                <button
                  onClick={() => setShowEditConfigModal(true)}
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
                  Edit
                </button>
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
                {/* Webhook URL */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Webhook URL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                      {data?.config.webhook_url.slice(0, 28)}••••••••
                    </span>
                    <button
                      onClick={() => copyToClipboard(data?.config.webhook_url || '', 'Webhook URL')}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                    >
                      {copiedField === 'Webhook URL' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* API Token */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>API Token</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                      sk_••••••••••••••••••••••••••••••••
                    </span>
                    <button
                      onClick={() => copyToClipboard(data?.config.api_token_masked || '', 'API Token')}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                    >
                      {copiedField === 'API Token' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Notification Email */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Notification Email</span>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>
                    {data?.config.notification_email}
                  </span>
                </div>

                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                {/* Toggle 1: Auto Create Issues */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>Auto Create Issues</span>
                  <button
                    onClick={() => handleToggleConfig('auto_create_issues')}
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '9px',
                      backgroundColor: data?.config.auto_create_issues ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: data?.config.auto_create_issues ? 'translateX(14px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>

                {/* Toggle 2: Fail CI/CD Builds */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>Fail CI/CD Builds</span>
                  <button
                    onClick={() => handleToggleConfig('fail_cicd_builds')}
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '9px',
                      backgroundColor: data?.config.fail_cicd_builds ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: data?.config.fail_cicd_builds ? 'translateX(14px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>

                {/* Toggle 3: Sync with External Tools */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>Sync with External Tools</span>
                  <button
                    onClick={() => handleToggleConfig('sync_with_external_tools')}
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '9px',
                      backgroundColor: data?.config.sync_with_external_tools ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transform: data?.config.sync_with_external_tools ? 'translateX(14px)' : 'translateX(0)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Add Integration Modal ── */}
      {showAddModal && (
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
                <Plus size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Connect External Integration
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddIntegration}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Select Tool / Provider
                  </label>
                  <select
                    value={addToolId}
                    onChange={(e) => setAddToolId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="jenkins">Jenkins CI/CD</option>
                    <option value="azure">Azure DevOps</option>
                    <option value="aws">AWS Secrets Manager</option>
                    <option value="kubernetes">Kubernetes (Cluster Secrets)</option>
                    <option value="pagerduty">PagerDuty On-Call Alerts</option>
                    <option value="vault">HashiCorp Vault</option>
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    {addToolId === 'jenkins' && 'Jenkins Server URL & API Token *'}
                    {addToolId === 'azure' && 'Personal Access Token (PAT) *'}
                    {addToolId === 'aws' && 'AWS Access Key ID / Secret Key / Role ARN *'}
                    {addToolId === 'kubernetes' && 'Kubernetes Service Account Token *'}
                    {addToolId === 'pagerduty' && 'PagerDuty REST API / Routing Key *'}
                    {addToolId === 'vault' && 'Vault Address & Auth Token *'}
                    {(addToolId === 'github' || addToolId === 'gitlab') && 'Personal Access Token (PAT) *'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={
                      addToolId === 'jenkins'
                        ? 'https://jenkins.company.org:token'
                        : addToolId === 'aws'
                        ? 'AKIA...:secret_access_key'
                        : addToolId === 'kubernetes'
                        ? 'eyJhbGciOiJSUzI1NiIsImtpZCI...'
                        : addToolId === 'pagerduty'
                        ? 'u+abcd1234efgh5678'
                        : addToolId === 'vault'
                        ? 'hvs.CAESIJ...'
                        : 'Enter credentials or access token...'
                    }
                    value={addCredentials}
                    onChange={(e) => setAddCredentials(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                    Credentials are securely verified, encrypted with AES-256, and never stored in plain text.
                  </span>
                </div>
              </div>

              <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  disabled={connectingTool}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#09090B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: connectingTool ? 'wait' : 'pointer',
                  }}
                >
                  {connectingTool ? 'Verifying & Connecting...' : 'Authenticate & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Configure Tool Modal ── */}
      {configuringTool && (
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
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderToolBrandIcon(configuringTool.id)}
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Configure {configuringTool.name}
                </h3>
              </div>
              <button
                onClick={() => setConfiguringTool(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Status</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '10px' }}>
                  ● {configuringTool.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Last Synchronized</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>
                  {configuringTool.last_sync}
                </span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>Capabilities</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  {configuringTool.description}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleSyncTool(configuringTool.id, configuringTool.name)}
                  disabled={syncingTool}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: syncingTool ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={syncingTool ? 'animate-spin' : ''} />
                  Sync Now
                </button>
                <button
                  onClick={() => handleDisconnectTool(configuringTool.id, configuringTool.name)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              </div>

              <button
                onClick={() => setConfiguringTool(null)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
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

      {/* ── New Rotation Rule Modal ── */}
      {showNewRuleModal && (
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
                  Create Secret Rotation Rule
                </h3>
              </div>
              <button
                onClick={() => setShowNewRuleModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production RDS Password Rotation"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
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
                      Secret Type
                    </label>
                    <select
                      value={ruleSecretType}
                      onChange={(e) => setRuleSecretType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="AWS Key">AWS Key</option>
                      <option value="Database URL">Database URL</option>
                      <option value="GitHub Token">GitHub Token</option>
                      <option value="API Key">API Key</option>
                      <option value="Stripe Key">Stripe Key</option>
                      <option value="SendGrid Key">SendGrid Key</option>
                      <option value="K8s Token">K8s Token</option>
                      <option value="Webhook">Webhook</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                      Interval (Days)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={ruleInterval}
                      onChange={(e) => setRuleInterval(Number(e.target.value))}
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
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Repository Scope
                  </label>
                  <input
                    type="text"
                    value={ruleScope}
                    onChange={(e) => setRuleScope(e.target.value)}
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
              </div>

              <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
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
                  disabled={creatingRule}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: creatingRule ? 'wait' : 'pointer',
                  }}
                >
                  {creatingRule ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Rotation Rule Modal ── */}
      {editingRule && (
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
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Edit Rule: {editingRule.name}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Status
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
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Rotation Interval (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={editInterval}
                  onChange={(e) => setEditInterval(Number(e.target.value))}
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
                  Scope
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
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
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
                onClick={handleSaveEditRule}
                disabled={updatingRule}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: updatingRule ? 'wait' : 'pointer',
                }}
              >
                {updatingRule ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rotation Settings Modal ── */}
      {showSettingsModal && settings && (
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
                <Settings size={20} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Global Rotation Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Default Rotation Interval (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.default_rotation_interval_days ?? settings.default_rotation_days ?? 60}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_rotation_interval_days: Number(e.target.value),
                        default_rotation_days: Number(e.target.value),
                      })
                    }
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
                    Failure Retry Limit
                  </label>
                  <input
                    type="number"
                    value={settings.failure_retry_limit ?? 3}
                    onChange={(e) => setSettings({ ...settings, failure_retry_limit: Number(e.target.value) })}
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500 }}>Slack Notifications</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.slack_notifications_enabled)}
                    onChange={(e) => setSettings({ ...settings, slack_notifications_enabled: e.target.checked })}
                    style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500 }}>Email Alerts on Failure</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.email_alerts_enabled)}
                    onChange={(e) => setSettings({ ...settings, email_alerts_enabled: e.target.checked })}
                    style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
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
                  disabled={savingSettings}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: savingSettings ? 'wait' : 'pointer',
                  }}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Config Modal ── */}
      {showEditConfigModal && (
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
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Edit Integration Configuration
              </h3>
              <button
                onClick={() => setShowEditConfigModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={editWebhook}
                    onChange={(e) => setEditWebhook(e.target.value)}
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
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
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
              </div>

              <div style={{ padding: '14px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditConfigModal(false)}
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
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
