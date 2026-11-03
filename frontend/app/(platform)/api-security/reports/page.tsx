'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Download,
  Boxes,
  CheckCircle2,
  GitBranch,
  FolderGit2,
  MessageSquare,
  Ticket,
  Webhook,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  KeyRound,
  Shield,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function ReportsAndIntegrationsPage() {
  const searchParams = useSearchParams();
  const queryScanId = searchParams.get('scanId');

  const { apis, selectedApi } = useApiSecurity();
  const [reportType, setReportType] = useState('Executive Summary');
  const [reportFormat, setReportFormat] = useState('PDF');
  const [sections, setSections] = useState<string[]>([
    'Executive Summary',
    'Findings Details',
    'Remediation Guide',
    'Technical Evidence',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [integrationsList, setIntegrationsList] = useState<any[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);

  // Modal configuration state
  const [configuringTool, setConfiguringTool] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);

  const availableSections = [
    'Executive Summary',
    'Findings Details',
    'Remediation Guide',
    'Technical Evidence',
  ];

  const toggleSection = (sec: string) => {
    if (sections.includes(sec)) {
      setSections(sections.filter((s) => s !== sec));
    } else {
      setSections([...sections, sec]);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.apiSecurity.listReports(selectedApi?.id);
      setReportsList(res.items || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const fetchIntegrations = async () => {
    setIsLoadingIntegrations(true);
    try {
      const res = await api.apiSecurity.listIntegrations();
      setIntegrationsList(res.items || []);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchIntegrations();
  }, [selectedApi?.id]);

  const handleGenerateReport = async () => {
    if (!selectedApi) {
      alert('Please select an API target from the dropdown above');
      return;
    }

    setIsGenerating(true);
    try {
      const rep = await api.apiSecurity.generateReport({
        api_id: selectedApi.id,
        scan_id: queryScanId || undefined,
        format: reportFormat,
        include_sections: sections,
      });

      await fetchReports();

      // Trigger real file download via the generated backend endpoint or full report payload
      if (rep.download_url) {
        window.open(rep.download_url, '_blank');
      } else {
        const fullContent = rep.summary ? JSON.stringify(rep.summary, null, 2) : JSON.stringify(rep, null, 2);
        const blob = new Blob([fullContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kavach_api_security_report_${Date.now()}.${reportFormat.toLowerCase() === 'pdf' ? 'html' : reportFormat.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      console.error('Report generation error:', err);
      alert(err?.message || 'Failed to generate security report');
    } finally {
      setIsGenerating(false);
    }
  };

  const openConfigModal = (tool: any) => {
    setConfiguringTool(tool);
    setIntegrationError(null);
    setFormData({
      token: '',
      account_name: tool.account_name || '',
      instance_url: '',
      webhook_url: '',
      channel: '',
      secret: '',
    });
  };

  const handleSaveIntegration = async () => {
    if (!configuringTool) return;
    setIsSavingIntegration(true);
    setIntegrationError(null);

    try {
      await api.apiSecurity.connectIntegration({
        provider: configuringTool.id,
        token: formData.token || undefined,
        account_name: formData.account_name || undefined,
        instance_url: formData.instance_url || undefined,
        webhook_url: formData.webhook_url || undefined,
        channel: formData.channel || undefined,
        secret: formData.secret || undefined,
      });

      await fetchIntegrations();
      setConfiguringTool(null);
    } catch (err: any) {
      setIntegrationError(err?.message || 'Failed to connect integration. Check credentials and retry.');
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const handleDisconnect = async (toolId: string) => {
    if (!confirm(`Are you sure you want to disconnect ${toolId}?`)) return;
    try {
      await api.apiSecurity.disconnectIntegration({ provider: toolId });
      await fetchIntegrations();
    } catch (err: any) {
      alert(err?.message || 'Failed to disconnect integration');
    }
  };

  const toolIcons: Record<string, any> = {
    github: FolderGit2,
    gitlab: GitBranch,
    jenkins: Boxes,
    slack: MessageSquare,
    jira: Ticket,
    webhook: Webhook,
  };

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Reports & Integrations
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Generate executive compliance and technical vulnerability reports, and connect Kavach into developer workflows with verified credentials.
          </p>
        </div>

        {/* Two Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
          {/* Left Column: Generate Report Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Generate Security Report
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Create a formal report for executive risk review, security audits, or developer remediation.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Report Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Report Scope</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0F172A',
                  }}
                >
                  <option value="Executive Summary">Executive Risk Summary (OWASP API Top 10)</option>
                  <option value="Detailed Technical Report">Technical Developer Report with Unified Diffs</option>
                  <option value="Compliance Audit">Compliance Audit (PCI-DSS & SOC2 API Controls)</option>
                </select>
              </div>

              {/* Format */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Export Format</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['PDF', 'JSON', 'HTML'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setReportFormat(fmt)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '6px',
                        border: reportFormat === fmt ? '2px solid #2563EB' : '1px solid #CBD5E1',
                        backgroundColor: reportFormat === fmt ? '#EFF6FF' : '#FFFFFF',
                        color: reportFormat === fmt ? '#1D4ED8' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections to Include */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Included Report Sections</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {availableSections.map((sec) => {
                    const isChecked = sections.includes(sec);
                    return (
                      <div
                        key={sec}
                        onClick={() => toggleSection(sec)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        {isChecked ? (
                          <CheckSquare size={16} color="#2563EB" />
                        ) : (
                          <Square size={16} color="#94A3B8" />
                        )}
                        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                          {sec}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '10px 16px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                marginTop: 'auto',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Compiling & Exporting Report...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Generate & Download Report</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Real Integrations Grid */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Developer & CI/CD Integrations
                </h2>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  CREDENTIAL-VERIFIED ONLY
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Connect repositories, alert channels, and issue trackers. Credentials are encrypted and persisted.
              </p>
            </div>

            {isLoadingIntegrations ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#64748B' }}>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ marginLeft: '8px', fontSize: '13px' }}>Loading integrations status...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {integrationsList.map((tool) => {
                  const isConnected = tool.status === 'CONNECTED';
                  const Icon = toolIcons[tool.id] || Webhook;

                  return (
                    <div
                      key={tool.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            color: isConnected ? '#059669' : '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={17} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {tool.name}
                            </span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: isConnected ? '#ECFDF5' : '#F1F5F9',
                                color: isConnected ? '#059669' : '#64748B',
                                border: isConnected ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                              }}
                            >
                              {isConnected ? 'CONNECTED' : 'NOT CONFIGURED'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                            {tool.account_name ? `${tool.account_name} • ` : ''}
                            {tool.description}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isConnected ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnect(tool.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfigModal(tool)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#2563EB',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Configure
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Generated Reports & Audit History */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#2563EB" />
                <span>Generated Security Evaluation Reports ({reportsList.length})</span>
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Deterministic, cryptographic security audit records compiled from dynamic fuzzing and static route analysis.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchReports}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh Reports
            </button>
          </div>

          {reportsList.length === 0 ? (
            <div
              style={{
                border: '1px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '36px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <FileText size={32} color="#94A3B8" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                No Security Reports Generated Yet
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '400px', margin: '6px auto 0 auto' }}>
                Select an API target above and click &quot;Generate &amp; Download Report&quot; to compile your first enterprise compliance report.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Report Title</th>
                    <th style={{ padding: '12px 16px' }}>Format</th>
                    <th style={{ padding: '12px 16px' }}>Security Posture</th>
                    <th style={{ padding: '12px 16px' }}>Findings Detected</th>
                    <th style={{ padding: '12px 16px' }}>Generated Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsList.map((rep) => {
                    const sm = rep.summary || {};
                    const stats = sm.statistics || {};
                    const totalFindings = stats.total_findings ?? sm.total_findings ?? '—';
                    const crit = stats.critical ?? 0;
                    const high = stats.high ?? 0;
                    const grade = sm.grade || 'B';
                    const score = sm.risk_score || 70;
                    const dlUrl = rep.download_url || `/api/v1/api-security/reports/${rep.id}/download`;

                    return (
                      <tr key={rep.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={15} color="#2563EB" />
                            <span>{rep.title || 'API Security Report'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: rep.format === 'PDF' ? '#FEF2F2' : rep.format === 'JSON' ? '#ECFDF5' : '#EFF6FF',
                              color: rep.format === 'PDF' ? '#DC2626' : rep.format === 'JSON' ? '#059669' : '#2563EB',
                              border: '1px solid currentColor',
                            }}
                          >
                            {rep.format || 'PDF'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, color: grade === 'A' ? '#059669' : grade === 'B' ? '#2563EB' : '#DC2626' }}>
                              Grade {grade}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>({score}/100)</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: totalFindings > 0 ? '#DC2626' : '#059669' }}>
                              {totalFindings} Findings
                            </span>
                            {totalFindings > 0 && (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                ({crit} crit, {high} high)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                          {rep.created_at ? new Date(rep.created_at).toLocaleString() : 'Just now'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <a
                              href={dlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #2563EB',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Integration Credentials Modal */}
        {configuringTool && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '18px 20px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="#2563EB" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Configure {configuringTool.name} Credentials
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConfiguringTool(null)}
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {integrationError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      color: '#991B1B',
                      fontSize: '12px',
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{integrationError}</span>
                  </div>
                )}

                {/* GitHub Fields */}
                {configuringTool.id === 'github' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Personal Access Token (PAT) *
                      </label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={formData.token}
                        onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Requires `repo` and `security_events` scopes for automated scanning and PR comments.
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Organization or Account Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mayur8182"
                        value={formData.account_name}
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Slack Fields */}
                {configuringTool.id === 'slack' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Incoming Webhook URL *
                      </label>
                      <input
                        type="text"
                        placeholder="https://hooks.slack.com/services/..."
                        value={formData.webhook_url}
                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Notification Channel
                      </label>
                      <input
                        type="text"
                        placeholder="#security-alerts"
                        value={formData.channel}
                        onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Jira Fields */}
                {configuringTool.id === 'jira' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Jira Instance URL *
                      </label>
                      <input
                        type="text"
                        placeholder="https://yourcompany.atlassian.net"
                        value={formData.instance_url}
                        onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        API Token / Personal Token *
                      </label>
                      <input
                        type="password"
                        placeholder="Atlassian API token"
                        value={formData.token}
                        onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* GitLab Fields */}
                {configuringTool.id === 'gitlab' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        GitLab Instance URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://gitlab.com"
                        value={formData.instance_url}
                        onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Personal Access Token *
                      </label>
                      <input
                        type="password"
                        placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                        value={formData.token}
                        onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Jenkins Fields */}
                {configuringTool.id === 'jenkins' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Jenkins Server URL *
                      </label>
                      <input
                        type="text"
                        placeholder="https://jenkins.yourcompany.com"
                        value={formData.instance_url}
                        onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        API Token / Secret *
                      </label>
                      <input
                        type="password"
                        placeholder="Jenkins user API token"
                        value={formData.token}
                        onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Webhook Fields */}
                {configuringTool.id === 'webhook' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Endpoint URL *
                      </label>
                      <input
                        type="text"
                        placeholder="https://siem.corp.internal/webhooks/kavach"
                        value={formData.webhook_url}
                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        HMAC Signature Secret (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Shared secret for X-Kavach-Signature"
                        value={formData.secret}
                        onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <button
                  type="button"
                  onClick={() => setConfiguringTool(null)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveIntegration}
                  disabled={isSavingIntegration}
                  style={{
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: isSavingIntegration ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSavingIntegration ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Verifying & Connecting...</span>
                    </>
                  ) : (
                    <span>Verify & Connect</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </KavachApiLayout>
  );
}
