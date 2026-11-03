'use client';

/**
 * Kavach Code Security — Settings Workspace (/code/settings)
 * 
 * Manages configuration for Code Security & Supply Chain:
 * - Scanners configuration & health (Semgrep, Gitleaks, Trivy, OSV, Checkov, SecuLayer)
 * - CI/CD Security Gate thresholds & Merge Blocking
 * - Automated scan triggers (Push, Pull Request)
 * - AutoFix approval requirements (Architectural Golden Rule)
 * - Secret redaction policies & sensitive data masking
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import {
  Settings2,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  KeyRound,
  FileCode2,
  Sliders,
  Bell,
  Lock,
  Layers,
  FileCheck2,
  Link2,
  Loader2,
  RefreshCw,
  Info,
  ExternalLink,
  RotateCcw,
  Check,
  ShieldAlert,
  Terminal,
  FolderGit2,
} from 'lucide-react';

interface ScannerInfo {
  scanner_name?: string;
  tool_name?: string;
  status?: 'healthy' | 'not_configured' | 'unavailable' | string;
  version?: string;
  message?: string;
  last_health_check?: string;
}


export default function CodeSettingsPage() {
  const [scannerHealth, setScannerHealth] = useState<ScannerInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Settings form state
  const [blockOnCritical, setBlockOnCritical] = useState<boolean>(true);
  const [blockOnHigh, setBlockOnHigh] = useState<boolean>(true);
  const [autoScanPush, setAutoScanPush] = useState<boolean>(true);
  const [autoScanPR, setAutoScanPR] = useState<boolean>(true);
  const [requireApprovalAutoFix, setRequireApprovalAutoFix] = useState<boolean>(true);
  const [redactSecrets, setRedactSecrets] = useState<boolean>(true);

  // Initial state tracking for unsaved changes detection (dirty state)
  const [initialSettings, setInitialSettings] = useState({
    blockOnCritical: true,
    blockOnHigh: true,
    autoScanPush: true,
    autoScanPR: true,
    requireApprovalAutoFix: true,
    redactSecrets: true,
  });

  // Calculate unsaved changes (dirty state)
  const isDirty = useMemo(() => {
    return (
      blockOnCritical !== initialSettings.blockOnCritical ||
      blockOnHigh !== initialSettings.blockOnHigh ||
      autoScanPush !== initialSettings.autoScanPush ||
      autoScanPR !== initialSettings.autoScanPR ||
      requireApprovalAutoFix !== initialSettings.requireApprovalAutoFix ||
      redactSecrets !== initialSettings.redactSecrets
    );
  }, [
    blockOnCritical,
    blockOnHigh,
    autoScanPush,
    autoScanPR,
    requireApprovalAutoFix,
    redactSecrets,
    initialSettings,
  ]);

  const refreshScannerHealth = async () => {
    setIsRefreshingHealth(true);
    try {
      const res = await api.request('/api/v1/scans/tools/health', { bypassCache: true } as any);
      const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? res : [];
      setScannerHealth(list);
    } catch (e) {
      console.error('Failed to probe scanner engines health:', e);
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  useEffect(() => {
    async function loadHealthAndSettings() {
      setLoading(true);
      try {
        const [healthRes, settingsRes] = await Promise.allSettled([
          api.request('/api/v1/scans/tools/health', { bypassCache: true } as any),
          api.request('/api/v1/code/settings/general', {}),
        ]);

        if (healthRes.status === 'fulfilled') {
          const res = healthRes.value;
          setScannerHealth(Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? res : []);
        }

        if (settingsRes.status === 'fulfilled') {
          const data = (settingsRes.value as any)?.data || settingsRes.value;
          if (data) {
            const loaded = {
              blockOnCritical: data.block_on_critical !== undefined ? data.block_on_critical : true,
              blockOnHigh: data.block_on_high !== undefined ? data.block_on_high : true,
              autoScanPush: data.auto_scan_push !== undefined ? data.auto_scan_push : true,
              autoScanPR: data.auto_scan_pr !== undefined ? data.auto_scan_pr : true,
              requireApprovalAutoFix: data.require_approval_autofix !== undefined ? data.require_approval_autofix : true,
              redactSecrets: data.redact_secrets !== undefined ? data.redact_secrets : true,
            };
            setInitialSettings(loaded);
            setBlockOnCritical(loaded.blockOnCritical);
            setBlockOnHigh(loaded.blockOnHigh);
            setAutoScanPush(loaded.autoScanPush);
            setAutoScanPR(loaded.autoScanPR);
            setRequireApprovalAutoFix(loaded.requireApprovalAutoFix);
            setRedactSecrets(loaded.redactSecrets);
          }
        }
      } catch {
        setScannerHealth([]);
      } finally {
        setLoading(false);
      }
    }
    loadHealthAndSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.request('/api/v1/code/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_on_critical: blockOnCritical,
          block_on_high: blockOnHigh,
          auto_scan_push: autoScanPush,
          auto_scan_pr: autoScanPR,
          require_approval_autofix: requireApprovalAutoFix,
          redact_secrets: redactSecrets,
        }),
      });
      setSaved(true);
      toast.success('Settings saved successfully', {
        description: 'Code security policies and merge gates updated.',
      });
      setInitialSettings({
        blockOnCritical,
        blockOnHigh,
        autoScanPush,
        autoScanPR,
        requireApprovalAutoFix,
        redactSecrets,
      });
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to persist settings to backend database.';
      setSaveError(errMsg);
      toast.error('Failed to save settings', { description: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = useCallback(() => {
    setBlockOnCritical(initialSettings.blockOnCritical);
    setBlockOnHigh(initialSettings.blockOnHigh);
    setAutoScanPush(initialSettings.autoScanPush);
    setAutoScanPR(initialSettings.autoScanPR);
    setRequireApprovalAutoFix(initialSettings.requireApprovalAutoFix);
    setRedactSecrets(initialSettings.redactSecrets);
    setSaveError(null);
    toast.info('Changes discarded', { description: 'Reverted configuration to last saved values.' });
  }, [initialSettings]);

  const handleResetDefaults = () => {
    setBlockOnCritical(true);
    setBlockOnHigh(true);
    setAutoScanPush(true);
    setAutoScanPR(true);
    setRequireApprovalAutoFix(true);
    setRedactSecrets(true);
    toast.info('Default thresholds restored', { description: 'Click Save Settings to apply changes.' });
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S to save settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blockOnCritical, blockOnHigh, autoScanPush, autoScanPR, requireApprovalAutoFix, redactSecrets]);

  // Engine diagnostic metrics
  const enginesList = [
    { name: 'Semgrep (SAST)', tool: 'semgrep', desc: 'Static code analysis for OWASP Top 10 vulnerabilities' },
    { name: 'Gitleaks (Secrets)', tool: 'gitleaks', desc: 'Secret & credential exposure detection across git history' },
    { name: 'Trivy (SCA & Container)', tool: 'trivy', desc: 'Vulnerability scanner for OS packages & third-party dependencies' },
    { name: 'OSV Scanner (Open Source)', tool: 'osv', desc: 'Google Open Source Vulnerabilities database matcher' },
    { name: 'Checkov (IaC)', tool: 'checkov', desc: 'Terraform, CloudFormation, and Kubernetes policy guardrails' },
    { name: 'SecuLayer Engine', tool: 'seculayer', desc: 'Deterministic invariant policy enforcement runtime' },
  ];

  const engineStats = useMemo(() => {
    let ready = 0;
    let notConfigured = 0;
    let unavailable = 0;

    enginesList.forEach((e) => {
      const info = scannerHealth.find(
        (h) =>
          h.scanner_name?.toLowerCase().includes(e.tool) ||
          h.tool_name?.toLowerCase().includes(e.tool)
      );
      if (info?.status === 'healthy') {
        ready++;
      } else if (info?.status === 'not_configured') {
        notConfigured++;
      } else {
        unavailable++;
      }
    });

    return { total: enginesList.length, ready, notConfigured, unavailable };
  }, [scannerHealth]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Accessible Skip to Main Content Link */}
      <a
        href="#main-settings-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '12px',
          zIndex: 9999,
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          padding: '8px 16px',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '13px',
          textDecoration: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '16px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <header
        className="repository-settings-header"
        style={{
          padding: '16px 32px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
            <Link href="/code" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
              Code Security
            </Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Settings</span>
          </nav>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Scanner Engines &amp; Quality Gates
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '2px 0 0 0' }}>
            Configure real deterministic CLI scanner engines, automated commit triggers, and merge block criteria.
          </p>
        </div>
        {/* Header Actions: Reset and Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
            title="Reset settings to recommended security baseline"
            aria-label="Reset settings to recommended security baseline"
          >
            <RotateCcw size={13} />
            <span>Defaults</span>
          </button>

          <div className="save-settings-action">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: saved ? '#16A34A' : isDirty ? '#2563EB' : '#1E293B',
                border: `1px solid ${saved ? '#15803D' : isDirty ? '#1D4ED8' : '#0F172A'}`,
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: isDirty ? '0 1px 4px rgba(37, 99, 235, 0.35)' : '0 1px 2px rgba(0,0,0,0.05)',
              }}
              aria-label="Save Settings Changes"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>{isSaving ? 'Persisting...' : saved ? 'Settings Saved' : isDirty ? 'Save Changes *' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-navigation Tabs */}
      <nav
        aria-label="Settings Sections"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 24px', display: 'flex', gap: '24px' }}
      >
        <Link
          href="/code/settings"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#2563EB',
            borderBottom: '2px solid #2563EB',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          aria-current="page"
        >
          <Sliders size={14} />
          Scanners &amp; Gates
        </Link>
        <Link
          href="/code/settings/policies"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#475569',
            borderBottom: '2px solid transparent',
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
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#475569',
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
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#475569',
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
        <Link
          href="/code/repositories"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#475569',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Manage connected Git repositories and VCS integrations"
        >
          <FolderGit2 size={14} />
          Repositories & VCS
        </Link>
      </nav>

      {/* Unsaved Changes Floating Bar */}
      {isDirty && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            padding: '10px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1E40AF', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
            <span>Unsaved Changes: You have modified Quality Gate or Scan Trigger settings.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDiscard}
              style={{
                background: 'none',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                backgroundColor: '#FFFFFF',
              }}
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Persisting...' : 'Save Changes (Ctrl+S)'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="main-settings-content"
        role="main"
        style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1080px', margin: '0 auto' }}
      >
        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#475569',
              fontSize: '13px',
            }}
          >
            <Loader2 size={18} className="animate-spin" color="#2563EB" />
            <span>Loading security settings and querying backend CLI scanner health...</span>
          </div>
        )}

        {/* ── 1. Security Scanner Engines Health ── */}
        <section
          className="scanner-engines-section"
          aria-labelledby="section-scanner-engines-title"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu size={16} />
                </div>
                <h2 id="section-scanner-engines-title" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  1. Security Scanner Engines &amp; CLI Diagnostic Health
                </h2>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Real deterministic CLI security tools installed on the execution backend. Scanners execute inside isolated runner containers.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshScannerHealth}
              disabled={isRefreshingHealth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1D4ED8',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                cursor: isRefreshingHealth ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label="Re-check CLI scanner engine health"
            >
              <RefreshCw size={13} className={isRefreshingHealth ? 'animate-spin' : ''} />
              <span>{isRefreshingHealth ? 'Probing CLI Engines...' : 'Re-check Engines'}</span>
            </button>
          </div>

          {/* Engine Health KPI Metric Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Engines
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {engineStats.total}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>
                ● Ready (Healthy)
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '2px' }}>
                {engineStats.ready}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                ▲ Not Configured
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#B45309', marginTop: '2px' }}>
                {engineStats.notConfigured}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Diagnostics Status
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                {isRefreshingHealth ? 'Probing PATH...' : 'Active & Monitored'}
              </div>
            </div>
          </div>

          {/* Scanners Grid */}
          <div className="scanner-engines-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {enginesList.map((scanner) => {
              const info = scannerHealth.find(
                (h) =>
                  h.scanner_name?.toLowerCase().includes(scanner.tool) ||
                  h.tool_name?.toLowerCase().includes(scanner.tool)
              );
              const isReady = info?.status === 'healthy';
              const isNotConfigured = info?.status === 'not_configured';

              const lastCheckTime = info?.last_health_check
                ? new Date(info.last_health_check).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'
                : 'Recent probe';

              return (
                <div
                  key={scanner.tool}
                  className="scanner-engine-card"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {scanner.name}
                      </span>
                      {info?.version ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #DBEAFE' }}>
                          v{info.version}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                          uninstalled
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.45 }}>
                      {info?.message || (isReady ? scanner.desc : `CLI binary '${scanner.tool}' not found in PATH. Install via package manager or container image to enable.`)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                      <span>Last probed: {lastCheckTime}</span>
                    </div>
                  </div>

                  {/* Status Badge with WCAG AA compliant contrast */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      backgroundColor: isReady ? '#DCFCE7' : isNotConfigured ? '#FFEDD5' : '#FEE2E2',
                      color: isReady ? '#15803D' : isNotConfigured ? '#9A3412' : '#991B1B',
                      border: `1px solid ${isReady ? '#BBF7D0' : isNotConfigured ? '#FED7AA' : '#FECACA'}`,
                    }}
                  >
                    {isReady ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>{isReady ? 'READY' : isNotConfigured ? 'NOT CONFIGURED' : 'UNAVAILABLE'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Form Container for Settings */}
        <form
          id="code-settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* ── 2. CI/CD Security Gate Thresholds ── */}
          <section
            className="security-gates-section"
            aria-labelledby="section-security-gates-title"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={16} />
                </div>
                <h2 id="section-security-gates-title" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  2. CI/CD Security Gate Rules &amp; Quality Thresholds
                </h2>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Enforce merge blocking based on deterministic finding severity. Prevents vulnerable code from reaching production.
              </p>
            </div>

            <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <legend className="sr-only">Quality Gate Threshold Toggles</legend>

              {/* Block on Critical Findings */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: blockOnCritical ? '#FFFFFF' : '#FFF7ED',
                  border: `1px solid ${blockOnCritical ? '#E2E8F0' : '#FED7AA'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        htmlFor="toggle-block-critical"
                        style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                      >
                        Block Pull Requests on Critical Findings
                      </label>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                        CRITICAL (CVSS &gt;= 9.0)
                      </span>
                    </div>
                    <p id="desc-block-critical" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                      Prevents pull requests containing CRITICAL vulnerabilities (e.g. Remote Code Execution, SQLi, Hardcoded Root Keys) from passing security check gates.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-block-critical"
                    role="switch"
                    aria-checked={blockOnCritical}
                    aria-describedby="desc-block-critical"
                    onClick={() => setBlockOnCritical(!blockOnCritical)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '9999px',
                      backgroundColor: blockOnCritical ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: blockOnCritical ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>

                {!blockOnCritical && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      fontSize: '11.5px',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>Compliance Risk Warning: Disabling Critical blocking allows exploitable vulnerabilities to merge directly into production branches.</span>
                  </div>
                )}
              </div>

              {/* Block on High Findings */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        htmlFor="toggle-block-high"
                        style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                      >
                        Block Pull Requests on High Findings
                      </label>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FFEDD5', color: '#9A3412' }}>
                        HIGH (CVSS 7.0 - 8.9)
                      </span>
                    </div>
                    <p id="desc-block-high" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                      Strict mode: requires resolution or documented risk acceptance waiver for HIGH severity findings before code merge.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-block-high"
                    role="switch"
                    aria-checked={blockOnHigh}
                    aria-describedby="desc-block-high"
                    onClick={() => setBlockOnHigh(!blockOnHigh)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '9999px',
                      backgroundColor: blockOnHigh ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: blockOnHigh ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Require Human Approval for AutoFix */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: requireApprovalAutoFix ? '#FFFFFF' : '#FEF2F2',
                  border: `1px solid ${requireApprovalAutoFix ? '#E2E8F0' : '#FECACA'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        htmlFor="toggle-require-approval-autofix"
                        style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                      >
                        Require Human Engineer Approval for AutoFix Patches
                      </label>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EEF2FF', color: '#4338CA' }}>
                        AI SAFETY DIRECTIVE
                      </span>
                    </div>
                    <p id="desc-require-approval-autofix" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                      Architectural Golden Rule: AI proposes patches, deterministic scanners verify, and humans approve before applying to protected branches.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-require-approval-autofix"
                    role="switch"
                    aria-checked={requireApprovalAutoFix}
                    aria-describedby="desc-require-approval-autofix"
                    onClick={() => setRequireApprovalAutoFix(!requireApprovalAutoFix)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '9999px',
                      backgroundColor: requireApprovalAutoFix ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: requireApprovalAutoFix ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>

                {!requireApprovalAutoFix && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      fontSize: '11.5px',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>Security Directive Warning: Disabling human review permits AI agents to commit code modifications directly without validation.</span>
                  </div>
                )}
              </div>

              {/* Automatic Secret Redaction */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        htmlFor="toggle-redact-secrets"
                        style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                      >
                        Automatic Secret Redaction in UI &amp; Audit Logs
                      </label>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                        DATA PRIVACY
                      </span>
                    </div>
                    <p id="desc-redact-secrets" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                      Masks tokens, private keys, database connection strings, and passwords detected by Gitleaks so raw credentials are never leaked.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-redact-secrets"
                    role="switch"
                    aria-checked={redactSecrets}
                    aria-describedby="desc-redact-secrets"
                    onClick={() => setRedactSecrets(!redactSecrets)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '9999px',
                      backgroundColor: redactSecrets ? '#2563EB' : '#CBD5E1',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: redactSecrets ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>
              </div>
            </fieldset>
          </section>

          {/* ── 3. Scan Automation Triggers ── */}
          <section
            className="scan-triggers-section"
            aria-labelledby="section-scan-triggers-title"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bell size={16} />
                </div>
                <h2 id="section-scan-triggers-title" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  3. Automated Scan Triggers &amp; Webhook Integration
                </h2>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                Automated continuous scanning executed via GitHub App webhooks, GitLab events, and CI/CD pipelines.
              </p>
            </div>

            <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <legend className="sr-only">Scan Trigger Toggles</legend>

              {/* Scan on Commit Push */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="toggle-scan-push"
                    style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                  >
                    Continuous Scan on Commit Push
                  </label>
                  <p id="desc-scan-push" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                    Automatically triggers incremental SAST and secret scanning when commits are pushed to default branches.
                  </p>
                </div>

                <button
                  type="button"
                  id="toggle-scan-push"
                  role="switch"
                  aria-checked={autoScanPush}
                  aria-describedby="desc-scan-push"
                  onClick={() => setAutoScanPush(!autoScanPush)}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    borderRadius: '9999px',
                    backgroundColor: autoScanPush ? '#2563EB' : '#CBD5E1',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transform: autoScanPush ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
              </div>

              {/* Scan on Pull Request Opened / Synchronized */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="toggle-scan-pr"
                    style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                  >
                    Scan on Pull Request Opened / Synchronized
                  </label>
                  <p id="desc-scan-pr" style={{ fontSize: '12px', color: '#475569', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                    Runs SAST, Secrets, and SCA checks against the PR head branch and publishes security check status runs.
                  </p>
                </div>

                <button
                  type="button"
                  id="toggle-scan-pr"
                  role="switch"
                  aria-checked={autoScanPR}
                  aria-describedby="desc-scan-pr"
                  onClick={() => setAutoScanPR(!autoScanPR)}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    borderRadius: '9999px',
                    backgroundColor: autoScanPR ? '#2563EB' : '#CBD5E1',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transform: autoScanPR ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
              </div>
            </fieldset>
          </section>

          {/* Save feedback notifications */}
          {saved && (
            <div
              role="alert"
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#15803D',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              <span>Settings persisted successfully to database. Policies will govern all upcoming scan workflows.</span>
            </div>
          )}

          {saveError && (
            <div
              role="alert"
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#991B1B',
                fontWeight: 600,
              }}
            >
              <XCircle size={18} />
              <span>{saveError}</span>
            </div>
          )}

          {/* Bottom Save Action Bar */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Press <strong>Ctrl+S</strong> (or <strong>Cmd+S</strong>) anywhere to save changes.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDirty && (
                <button
                  type="button"
                  onClick={handleDiscard}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 22px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? 'Persisting Changes...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Persistent App Footer */}
        <footer
          className="app-footer"
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#64748B',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Kavach Code Security Engine</span>
            <span>•</span>
            <span>Deterministic CLI Quality Gates &amp; CI/CD Enforcement</span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
            Deterministic Policy Engine &amp; Security Boundary Controls
          </div>
        </footer>
      </main>

    </div>
  );
}
