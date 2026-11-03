'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sliders,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

const JenkinsBrandIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#D33833">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

export default function CiCdIntegrationPage() {
  const [activeSubTab, setActiveSubTab] = useState<string>('Jenkins');
  const [pipelineType, setPipelineType] = useState<string>('Declarative Pipeline');
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms: number } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form Fields
  const [jenkinsUrl, setJenkinsUrl] = useState<string>('https://jenkins.adit.in');
  const [jenkinsUsername, setJenkinsUsername] = useState<string>('mayur.bharvad');
  const [jenkinsToken, setJenkinsToken] = useState<string>('••••••••••••••••••••');
  const [scanOnPush, setScanOnPush] = useState<boolean>(true);
  const [scanOnPr, setScanOnPr] = useState<boolean>(true);
  const [failOnCritical, setFailOnCritical] = useState<boolean>(true);
  const [failOnHigh, setFailOnHigh] = useState<boolean>(false);
  const [generateReport, setGenerateReport] = useState<boolean>(true);
  const [commentOnPr, setCommentOnPr] = useState<boolean>(true);
  const [scanChangedOnly, setScanChangedOnly] = useState<boolean>(false);
  const [qualityGateName, setQualityGateName] = useState<string>('Default Gate');
  const [severityThreshold, setSeverityThreshold] = useState<string>('High and above');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await api.integrations.getCiCdConfig();
      if (cfg) {
        setJenkinsUrl(cfg.jenkins_url || 'https://jenkins.adit.in');
        setJenkinsUsername(cfg.jenkins_username || 'mayur.bharvad');
        setScanOnPush(cfg.scan_on_push ?? true);
        setScanOnPr(cfg.scan_on_pr ?? true);
        setFailOnCritical(cfg.fail_on_critical ?? true);
        setFailOnHigh(cfg.fail_on_high ?? false);
        setGenerateReport(cfg.generate_report ?? true);
        setCommentOnPr(cfg.comment_on_pr ?? true);
        setScanChangedOnly(cfg.scan_changed_only ?? false);
        setQualityGateName(cfg.quality_gate_name || 'Default Gate');
        setSeverityThreshold(cfg.severity_threshold || 'High and above');
        setIsEnabled(cfg.is_enabled ?? true);
      }
    } catch (err) {
      console.error('Failed to load CI/CD config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.integrations.testJenkins({
        jenkins_url: jenkinsUrl,
        jenkins_username: jenkinsUsername,
        jenkins_token: jenkinsToken !== '••••••••••••••••••••' ? jenkinsToken : undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection failed',
        latency_ms: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setActionMessage(null);
      await api.integrations.updateCiCdConfig({
        jenkins_url: jenkinsUrl,
        jenkins_username: jenkinsUsername,
        jenkins_token: jenkinsToken !== '••••••••••••••••••••' ? jenkinsToken : undefined,
        scan_on_push: scanOnPush,
        scan_on_pr: scanOnPr,
        fail_on_critical: failOnCritical,
        fail_on_high: failOnHigh,
        generate_report: generateReport,
        comment_on_pr: commentOnPr,
        scan_changed_only: scanChangedOnly,
        quality_gate_name: qualityGateName,
        severity_threshold: severityThreshold,
        is_enabled: isEnabled,
      });
      setActionMessage('Configuration saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      setActionMessage('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const getPipelineSnippet = () => {
    if (pipelineType === 'Declarative Pipeline') {
      return `stage('SAST Scan') {
  steps {
    sh "curl -X POST https://api.seculayer.com/v1/sast/scan \\\\
      -H 'Authentication: Bearer $SAST_TOKEN' \\\\
      -d '{\\"repo\\": \\"\${GIT_URL}\\"}'"
  }
}`;
    }
    if (pipelineType === 'Scripted Pipeline') {
      return `node {
  stage('SAST Scan') {
    withCredentials([string(credentialsId: 'sast-token', variable: 'SAST_TOKEN')]) {
      sh 'curl -X POST https://api.seculayer.com/v1/sast/scan -H "Authentication: Bearer $SAST_TOKEN" -d "{\\"repo\\": \\"$GIT_URL\\"}"'
    }
  }
}`;
    }
    return `# GitHub Actions Workflow Step
- name: Run SAST Security Scan
  run: |
    curl -X POST https://api.seculayer.com/v1/sast/scan \\
      -H "Authentication: Bearer \${{ secrets.SAST_TOKEN }}" \\
      -d "{\\"repo\\": \\"\${{ github.repository }}\\"}"`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getPipelineSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>THING CODE</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>SAST</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>Integrations</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>CI/CD</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <JenkinsBrandIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              CI/CD Integration
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Integrate with your CI/CD tools to run automatic security scans.
            </p>
          </div>
        </div>

        {/* Enabled Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: isEnabled ? '#059669' : '#64748B' }}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            style={{
              width: '42px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: isEnabled ? '#2563EB' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 200ms ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: isEnabled ? '20px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                transition: 'left 200ms ease',
              }}
            />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #EAECF0', marginBottom: '24px' }}>
        {['Jenkins', 'GitHub Actions', 'GitLab CI', 'Other CI/CD'].map((tab) => {
          const active = activeSubTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              style={{
                padding: '12px 0',
                border: 'none',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: active ? '#2563EB' : '#64748B',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Jenkins Configuration Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <JenkinsBrandIcon size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Jenkins Configuration
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Connect your Jenkins instance to run SAST scans in your pipelines.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Jenkins URL
                </label>
                <input
                  type="text"
                  value={jenkinsUrl}
                  onChange={(e) => setJenkinsUrl(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={jenkinsUsername}
                  onChange={(e) => setJenkinsUsername(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  API Token
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={jenkinsToken}
                    onChange={(e) => setJenkinsToken(e.target.value)}
                    style={{ width: '100%', padding: '7px 34px 7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#0F172A', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ position: 'absolute', right: '10px', top: '9px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: testResult.success ? '#059669' : '#DC2626',
                    }}
                  >
                    {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {testResult.success ? `Connected (${testResult.latency_ms}ms)` : 'Connection Failed'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scan Settings & Quality Gate Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px 0' }}>
              Scan Settings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Fail pipeline on critical findings', checked: failOnCritical, onChange: setFailOnCritical },
                { label: 'Generate report artifact', checked: generateReport, onChange: setGenerateReport },
                { label: 'Comment on pull requests', checked: commentOnPr, onChange: setCommentOnPr },
                { label: 'Scan only changed files', checked: scanChangedOnly, onChange: setScanChangedOnly },
              ].map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 14px 0' }}>
              Quality Gate
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                  Quality Gate
                </label>
                <select
                  value={qualityGateName}
                  onChange={(e) => setQualityGateName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#0F172A', outline: 'none' }}
                >
                  <option value="Default Gate">Default Gate</option>
                  <option value="Strict PCI Gate">Strict PCI Gate</option>
                  <option value="Audit Only">Audit Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                  Severity Threshold
                </label>
                <select
                  value={severityThreshold}
                  onChange={(e) => setSeverityThreshold(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#0F172A', outline: 'none' }}
                >
                  <option value="High and above">High and above</option>
                  <option value="Critical only">Critical only</option>
                  <option value="Medium and above">Medium and above</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pipeline Configuration */}
        <div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Pipeline Configuration
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Add this stage to your Jenkins pipeline:
                </p>
              </div>

              <select
                value={pipelineType}
                onChange={(e) => setPipelineType(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#0F172A', outline: 'none' }}
              >
                <option value="Declarative Pipeline">Declarative Pipeline</option>
                <option value="Scripted Pipeline">Scripted Pipeline</option>
                <option value="GitHub Actions Workflow">GitHub Actions Workflow</option>
              </select>
            </div>

            <div style={{ position: 'relative', marginTop: '12px' }}>
              <pre
                style={{
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                <code>{getPipelineSnippet()}</code>
              </pre>

              <button
                onClick={handleCopyCode}
                title="Copy snippet"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #EAECF0', fontSize: '12px', color: '#64748B' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>Quality Gate Enforcement</div>
              When <code style={{ color: '#2563EB' }}>Fail pipeline on critical findings</code> is enabled, the CLI runner exits with code 1 if findings exceed thresholds, blocking downstream deployment steps automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
