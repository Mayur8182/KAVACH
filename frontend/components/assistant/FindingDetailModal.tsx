'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  AlertTriangle,
  FileCode,
  GitPullRequest,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Code2,
  FileText,
  Bookmark,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface FindingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingId: string | null;
  initialFinding?: any;
  onCreatePR: (finding: any) => void;
  onExplainFix: (finding: any) => void;
  repository?: string;
  branch?: string;
}

export default function FindingDetailModal({
  isOpen,
  onClose,
  findingId,
  initialFinding,
  onCreatePR,
  onExplainFix,
  repository = 'kavach',
  branch = 'main',
}: FindingDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'fix' | 'references'>('overview');
  const [finding, setFinding] = useState<any>(initialFinding || null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialFinding) {
      setFinding(initialFinding);
    }

    if (findingId) {
      let isMounted = true;
      setLoading(true);
      api.assistant
        .getFindingDetail(findingId)
        .then((data: any) => {
          if (isMounted && data) {
            setFinding(data);
          }
        })
        .catch((err: any) => {
          console.warn('Failed to load finding details from backend:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, findingId, initialFinding]);

  if (!isOpen) return null;

  const severity = (finding?.severity || 'HIGH').toUpperCase();
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#DC2626' };
      case 'HIGH':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', dot: '#EA580C' };
      case 'MEDIUM':
        return { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A', dot: '#CA8A04' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', dot: '#64748B' };
    }
  };
  const sevStyle = getSeverityStyle(severity);

  const title = finding?.title || finding?.rule_id || 'Security Vulnerability';
  const cve = finding?.cve_id || (finding?.cwe_id ? `CWE-${finding.cwe_id}` : finding?.rule_id || 'N/A');
  const filePath = finding?.file_path || finding?.location || 'Unknown file';
  const lineStart = finding?.line_start || 1;

  const vulnerableCode =
    finding?.code_snippet ||
    finding?.snippet ||
    finding?.evidence?.snippet ||
    `// File: ${filePath} (line ${lineStart})\n// Scanner Rule: ${finding?.rule_id || title}\n\n// Source code snippet was not captured in scanner output for this rule.`;

  const fixRecommendation =
    finding?.remediation ||
    finding?.fix_recommendation ||
    finding?.description ||
    'No automated remediation patch synthesized yet for this finding. Trigger the remediation agent to synthesize and verify an AST-safe patch.';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(vulnerableCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header with Breadcrumb and Close */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
              <Link
                href="/findings"
                style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Findings</span>
              </Link>
              <ChevronRight size={14} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{title}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href={`/findings`}
                target="_blank"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#4F46E5',
                  textDecoration: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#EEF2FF',
                }}
              >
                <span>View in Dashboard</span>
                <ExternalLink size={12} />
              </Link>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Finding Title & Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: sevStyle.bg,
                color: sevStyle.text,
                border: `1px solid ${sevStyle.border}`,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sevStyle.dot }} />
              {severity}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {title}
            </h2>
            <span style={{ fontSize: '13px', color: '#64748B', fontFamily: 'monospace' }}>
              {cve}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              borderBottom: '1px solid #E2E8F0',
              marginTop: '12px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {(['overview', 'code', 'fix', 'references'] as const).map((tab) => {
              const label =
                tab === 'overview'
                  ? 'Overview'
                  : tab === 'code'
                  ? 'Code'
                  : tab === 'fix'
                  ? 'Fix recommendation'
                  : 'References';
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0 12px',
                    color: isActive ? '#4F46E5' : '#64748B',
                    fontWeight: isActive ? 600 : 500,
                    borderBottom: isActive ? '2px solid #4F46E5' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '8px', color: '#64748B' }}>
              <Loader2 className="animate-spin" size={20} />
              <span>Loading finding details...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Description */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Description
                    </h4>
                    <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                      {finding?.description ||
                        'Unsanitized user input is being passed to a system command, which can allow an attacker to execute arbitrary commands on the server.'}
                    </p>
                  </div>

                  {/* Affected file & Location */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Affected file
                    </h4>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#0F172A',
                        fontFamily: 'monospace',
                      }}
                    >
                      <FileCode size={16} color="#4F46E5" />
                      <span>{filePath}</span>
                      <span style={{ color: '#64748B' }}>(line {lineStart})</span>
                    </div>
                  </div>

                  {/* Vulnerable code box */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', margin: 0 }}>
                        Vulnerable code
                      </h4>
                      <button
                        onClick={copyToClipboard}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: copiedCode ? '#16A34A' : '#64748B',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        padding: '16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        overflowX: 'auto',
                        lineHeight: 1.6,
                        border: '1px solid #1E293B',
                      }}
                    >
                      <pre style={{ margin: 0 }}>{vulnerableCode}</pre>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>
                      Source view in <strong>{repository}</strong> ({branch})
                    </span>
                    <button
                      onClick={copyToClipboard}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: copiedCode ? '#16A34A' : '#64748B',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      overflowX: 'auto',
                      lineHeight: 1.6,
                    }}
                  >
                    <pre style={{ margin: 0 }}>{vulnerableCode}</pre>
                  </div>
                </div>
              )}

              {activeTab === 'fix' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Remediation Steps
                    </h4>
                    <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                      Replace unsanitized shell interpolation with strict parameterization and schema validation.
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      color: '#0F172A',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {fixRecommendation}
                  </div>
                </div>
              )}

              {activeTab === 'references' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Authoritative References & CWE
                  </h4>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.8 }}>
                    <li>
                      <a href="https://cwe.mitre.org/data/definitions/78.html" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>
                        CWE-78: Improper Neutralization of Special Elements used in an OS Command
                      </a>
                    </li>
                    <li>
                      <a href="https://owasp.org/www-community/attacks/Command_Injection" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>
                        OWASP Command Injection Attack Prevention Guide
                      </a>
                    </li>
                    <li>
                      <a href="https://nvd.nist.gov" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>
                        NIST National Vulnerability Database
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions (Matches Stage 10 buttons exactly) */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={() => {
              onClose();
              onExplainFix(finding);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} color="#6366F1" />
            <span>Explain fix with AI</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onCreatePR(finding);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#0F172A',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <GitPullRequest size={16} />
            <span>Create pull request</span>
          </button>
        </div>
      </div>
    </div>
  );
}
