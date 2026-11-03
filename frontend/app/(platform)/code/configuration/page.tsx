'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  Shield,
  FileCode,
  Key,
  Package,
  FileText,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  RotateCcw,
  Plus,
  X,
  Loader2,
  Check,
  Server,
  Cloud,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { TechIcon } from '@/components/common/TechIcon';

type ConfigCategory = 'iac' | 'scanners' | 'sast' | 'secrets' | 'sca' | 'sbom' | 'security_gates' | 'general';

export default function CodeConfigurationPage() {
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('iac');
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Form states for active category
  const [provider, setProvider] = useState('AWS');
  const [frameworks, setFrameworks] = useState<string[]>(['terraform', 'kubernetes']);
  const [triggers, setTriggers] = useState<string[]>(['push', 'pull_request']);
  const [severityThreshold, setSeverityThreshold] = useState('CRITICAL');
  const [failCiThreshold, setFailCiThreshold] = useState('CRITICAL_AND_HIGH');
  const [exclusions, setExclusions] = useState<string[]>([".github/**", "tests/**"]);
  const [newExclusion, setNewExclusion] = useState('');

  // Scanner engines live status from backend
  const [enginesHealth, setEnginesHealth] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, healthRes] = await Promise.allSettled([
        api.codeConfig.get(),
        api.request<any[]>('/api/v1/scans/tools/health', { bypassCache: true }),
      ]);

      if (cfgRes.status === 'fulfilled') {
        const val = cfgRes.value;
        setConfigs(val.configurations || {});
        const current = val.configurations?.[activeCategory];
        if (current) {
          setProvider(current.provider || 'AWS');
          setFrameworks(current.frameworks || ['terraform', 'kubernetes']);
          setTriggers(current.triggers || ['push', 'pull_request']);
          setSeverityThreshold(current.severity_threshold || 'CRITICAL');
          setFailCiThreshold(current.fail_ci_threshold || 'CRITICAL_AND_HIGH');
          setExclusions(current.exclusions || [".github/**", "tests/**"]);
        }
      }

      if (healthRes.status === 'fulfilled') {
        const val = healthRes.value;
        setEnginesHealth(Array.isArray((val as any)?.data) ? (val as any).data : Array.isArray(val) ? val : []);
      }
    } catch (err: any) {
      console.error('Failed to load configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // When switching category in vertical menu, update form
  const handleSelectCategory = (cat: ConfigCategory) => {
    setActiveCategory(cat);
    setTestResult(null);
    setTestError(null);
    setSaveSuccess(null);

    const cfg = configs[cat];
    if (cfg) {
      setProvider(cfg.provider || 'AWS');
      setFrameworks(cfg.frameworks || (cat === 'iac' ? ['terraform', 'kubernetes'] : cat === 'sast' ? ['semgrep'] : []));
      setTriggers(cfg.triggers || ['push', 'pull_request']);
      setSeverityThreshold(cfg.severity_threshold || 'CRITICAL');
      setFailCiThreshold(cfg.fail_ci_threshold || 'CRITICAL_AND_HIGH');
      setExclusions(cfg.exclusions || [".github/**", "tests/**"]);
    }
  };

  const toggleFramework = (fw: string) => {
    setFrameworks((prev) =>
      prev.includes(fw) ? prev.filter((item) => item !== fw) : [...prev, fw]
    );
  };

  const toggleTrigger = (trig: string) => {
    setTriggers((prev) =>
      prev.includes(trig) ? prev.filter((item) => item !== trig) : [...prev, trig]
    );
  };

  const addExclusion = () => {
    if (newExclusion.trim() && !exclusions.includes(newExclusion.trim())) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion('');
    }
  };

  const removeExclusion = (ex: string) => {
    setExclusions(exclusions.filter((item) => item !== ex));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const res = await api.codeConfig.save({
        category: activeCategory,
        provider,
        frameworks,
        triggers,
        severity_threshold: severityThreshold,
        fail_ci_threshold: failCiThreshold,
        exclusions,
      });

      setSaveSuccess(res.message || 'Configuration persisted successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
      await loadAll();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await api.codeConfig.test({
        category: activeCategory,
        provider,
        frameworks,
      });
      setTestResult(res);
      await loadAll();
    } catch (err: any) {
      setTestError(err.message || 'Configuration test failed.');
    } finally {
      setTesting(false);
    }
  };

  const currentConfig = configs[activeCategory];
  const isConfigured = currentConfig?.status === 'CONFIGURED';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', background: '#F8FAFC' }}>
      {/* ── Left Vertical Navigation (Configuration Categories) ── */}
      <div
        style={{
          width: '280px',
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
            Code Security Config
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { id: 'iac', label: 'IaC Security (Terraform / K8s)', icon: Layers },
              { id: 'scanners', label: 'Scanner Engines Health', icon: Cpu },
              { id: 'sast', label: 'SAST & Static Analysis', icon: FileCode },
              { id: 'secrets', label: 'Secret Detection & Leaks', icon: Key },
              { id: 'sca', label: 'SCA & Dependencies', icon: Package },
              { id: 'sbom', label: 'SBOM Supply Chain', icon: FileText },
              { id: 'security_gates', label: 'CI/CD & Security Gates', icon: SlidersHorizontal },
              { id: 'general', label: 'General & Exclusions', icon: Shield },
            ].map((nav) => {
              const Icon = nav.icon;
              const isActive = activeCategory === nav.id;
              const cfg = configs[nav.id];
              const isConfig = cfg?.status === 'CONFIGURED';

              return (
                <button
                  key={nav.id}
                  onClick={() => handleSelectCategory(nav.id as ConfigCategory)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1D4ED8' : '#475569',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isActive ? '#2563EB' : '#64748B'} />
                    <span>{nav.label}</span>
                  </div>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: isConfig ? '#16A34A' : '#CBD5E1',
                    }}
                    title={isConfig ? 'Configured' : 'Not Configured'}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
            Workspaces
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link
              href="/code"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#64748B',
                textDecoration: 'none',
              }}
            >
              <ChevronRight size={14} /> Back to Code Hub
            </Link>
            <Link
              href="/code/iac"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#64748B',
                textDecoration: 'none',
              }}
            >
              <ChevronRight size={14} /> Open IaC Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right Content Panel (Configuration Form) ── */}
      <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'capitalize' }}>
                {activeCategory === 'iac'
                  ? 'Infrastructure as Code (IaC) Configuration'
                  : activeCategory === 'scanners'
                  ? 'Security Scanner Engines Health'
                  : `${activeCategory.replace(/_/g, ' ')} Configuration`}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isConfigured ? '#DCFCE7' : '#F1F5F9',
                  color: isConfigured ? '#16A34A' : '#64748B',
                }}
              >
                {isConfigured ? <CheckCircle2 size={12} /> : null}
                {isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Deterministic security policies, frameworks, triggers, and scan execution boundaries.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: testing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{testing ? 'Testing...' : 'Test Configuration'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '6px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#16A34A',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {testResult && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '8px',
              background: testResult.success ? '#F0FDF4' : '#FEF2F2',
              border: testResult.success ? '1px solid #BBF7D0' : '1px solid #FCA5A5',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: testResult.success ? '#16A34A' : '#DC2626' }}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{testResult.message}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Engine Tool: <strong>{testResult.details?.engine_tool?.toUpperCase()}</strong> {testResult.details?.engine_version ? `(v${testResult.details.engine_version})` : ''} • Validated: <strong>{testResult.details?.frameworks_validated?.join(', ') || testResult.details?.provider}</strong> • Status: <strong>{testResult.details?.status}</strong>
            </div>
          </div>
        )}

        {/* ── Content View 1: Scanner Engines View ── */}
        {activeCategory === 'scanners' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
                Operational Scanner CLI Binaries
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
                Real status of security scanner tools installed on the execution backend.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                {[
                  { name: 'Semgrep (SAST)', tool: 'semgrep', desc: 'Static code analysis for OWASP Top 10' },
                  { name: 'Gitleaks (Secrets)', tool: 'gitleaks', desc: 'Secret & credential exposure detection' },
                  { name: 'Trivy (SCA & Container)', tool: 'trivy', desc: 'Vulnerability scanner for OS & dependencies' },
                  { name: 'OSV Scanner (Open Source)', tool: 'osv', desc: 'Google Open Source Vulnerabilities database' },
                  { name: 'Checkov (IaC)', tool: 'checkov', desc: 'Terraform, CloudFormation, and K8s guardrails' },
                  { name: 'SecuLayer Native Engine', tool: 'seculayer', desc: 'Deterministic invariant policy enforcement' },
                ].map((scanner) => {
                  const info = enginesHealth.find(
                    (h) =>
                      h.scanner_name?.toLowerCase().includes(scanner.tool) ||
                      h.tool_name?.toLowerCase().includes(scanner.tool)
                  );
                  const isHealthy = info?.status === 'healthy';
                  const isNotConfigured = info?.status === 'not_configured';

                  return (
                    <div
                      key={scanner.tool}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {scanner.name}
                          </span>
                          {info?.version && (
                            <span style={{ fontSize: '10px', color: '#64748B', background: '#E2E8F0', padding: '1px 5px', borderRadius: '3px' }}>
                              v{info.version}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          {info?.message || scanner.desc}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isHealthy ? '#DCFCE7' : isNotConfigured ? '#FEF3C7' : '#FEE2E2',
                          color: isHealthy ? '#16A34A' : isNotConfigured ? '#B45309' : '#DC2626',
                        }}
                      >
                        {isHealthy ? <CheckCircle2 size={12} /> : null}
                        {isHealthy ? 'READY' : isNotConfigured ? 'NOT CONFIGURED' : 'UNAVAILABLE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Content View 2: Form Configuration (IaC, SAST, Secrets, etc.) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Cloud Provider Section */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                Primary Cloud Provider Target
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { id: 'AWS', label: 'AWS', icon: 'aws' },
                  { id: 'Azure', label: 'Microsoft Azure', icon: 'azure' },
                  { id: 'GCP', label: 'Google Cloud', icon: 'gcp' },
                  { id: 'MULTI_CLOUD', label: 'Multi-Cloud / Hybrid', icon: 'kubernetes' },
                ].map((p) => {
                  const isSelected = provider === p.id;
                  return (
                    <label
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <TechIcon name={p.icon} size={18} />
                      <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#1E40AF' : '#334155' }}>
                        {p.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Frameworks Checkboxes */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                Target Frameworks & Manifests
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { id: 'terraform', label: 'Terraform (.tf, .hcl)', icon: 'terraform' },
                  { id: 'cloudformation', label: 'CloudFormation (JSON/YAML)', icon: 'cloudformation' },
                  { id: 'kubernetes', label: 'Kubernetes (K8s YAML)', icon: 'kubernetes' },
                  { id: 'helm', label: 'Helm Charts', icon: 'helm' },
                ].map((fw) => {
                  const isChecked = frameworks.includes(fw.id);
                  return (
                    <label
                      key={fw.id}
                      onClick={() => toggleFramework(fw.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        background: isChecked ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      <TechIcon name={fw.icon} size={16} />
                      <span style={{ fontSize: '12px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#1E40AF' : '#334155' }}>
                        {fw.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Scan Triggers */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                Scan Execution Triggers
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'push', label: 'Git Push (Main & Protected Branches)' },
                  { id: 'pull_request', label: 'Pull Request Review & Status Check' },
                  { id: 'scheduled', label: 'Scheduled Nightly Pipeline' },
                ].map((trig) => {
                  const isChecked = triggers.includes(trig.id);
                  return (
                    <label
                      key={trig.id}
                      onClick={() => toggleTrigger(trig.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        background: isChecked ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: isChecked ? '#1E40AF' : '#334155',
                        fontWeight: isChecked ? 600 : 400,
                        userSelect: 'none',
                      }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      <span>{trig.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Thresholds & CI Gate */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  Severity Discovery Threshold
                </label>
                <select
                  value={severityThreshold}
                  onChange={(e) => setSeverityThreshold(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="CRITICAL">Critical Only (Highest Priority)</option>
                  <option value="HIGH">High + Critical</option>
                  <option value="MEDIUM">Medium and above (Recommended)</option>
                  <option value="LOW">All severities including Low & Info</option>
                </select>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  Fail CI / Block Pull Request When
                </label>
                <select
                  value={failCiThreshold}
                  onChange={(e) => setFailCiThreshold(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="CRITICAL_AND_HIGH">Critical or High Severity Findings Exist</option>
                  <option value="CRITICAL_ONLY">Critical Findings Only</option>
                  <option value="ANY">Any New Finding Introduced</option>
                  <option value="NEVER">Report Only (Do Not Block)</option>
                </select>
              </div>
            </div>

            {/* 5. Exclusions */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                Path Exclusions
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="e.g. tests/**, fixtures/**, .github/**"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExclusion()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={addExclusion}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Add Exclusion
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {exclusions.map((ex) => (
                  <span
                    key={ex}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#334155',
                    }}
                  >
                    <span>{ex}</span>
                    <button
                      onClick={() => removeExclusion(ex)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
