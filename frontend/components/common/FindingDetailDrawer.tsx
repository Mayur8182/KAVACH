'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Code2,
  Cloud,
  FileCode,
  Copy,
  Check,
  Play,
  Wrench,
  ExternalLink,
  ChevronRight,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';

export interface FindingDetailData {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Fixed' | 'False Positive' | string;
  tool?: string;
  category?: string;
  repository?: string;
  resource?: string;
  file?: string;
  line?: number;
  detectedAt?: string;
  description?: string;
  codeSnippet?: {
    code: string;
    startLine: number;
    highlightLine: number;
  };
  cloudResource?: {
    arn: string;
    service?: string;
    provider?: string;
    region?: string;
    cisBenchmark?: string;
    policyJson?: string;
  };
  remediation?: {
    summary: string;
    diffSnippet?: string;
    commands?: string[];
  };
}

export interface FindingDetailDrawerProps {
  finding: FindingDetailData | null;
  isOpen?: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: string) => void;
}

export const FindingDetailDrawer: React.FC<FindingDetailDrawerProps> = ({
  finding,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(finding?.status || 'Open');
  const [copied, setCopied] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanDone, setRescanDone] = useState(false);

  React.useEffect(() => {
    if (finding) {
      setCurrentStatus(finding.status);
      setFixApplied(finding.status === 'Resolved' || finding.status === 'Fixed');
      setRescanDone(false);
    }
  }, [finding]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && finding) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finding, onClose]);

  if (isOpen === false || !finding) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(finding.id, newStatus);
    }
  };

  const handleApplyFix = () => {
    setIsApplyingFix(true);
    setTimeout(() => {
      setIsApplyingFix(false);
      setFixApplied(true);
      setCurrentStatus('Resolved');
      if (onUpdateStatus) {
        onUpdateStatus(finding.id, 'Resolved');
      }
    }, 700);
  };

  const handleRunRescan = () => {
    setIsRescanning(true);
    setTimeout(() => {
      setIsRescanning(false);
      setRescanDone(true);
    }, 900);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'high':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' };
      case 'medium':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FEF3C7' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const sevStyle = getSeverityStyle(finding.severity);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finding Details Inspector"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: sevStyle.bg,
                color: sevStyle.text,
                border: `1px solid ${sevStyle.border}`,
              }}
            >
              {finding.severity}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ID: {finding.id}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Status Dropdown */}
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor:
                  currentStatus === 'Resolved' || currentStatus === 'Fixed'
                    ? '#ECFDF5'
                    : currentStatus === 'In Progress'
                    ? '#FFFBEB'
                    : '#FFFFFF',
                color:
                  currentStatus === 'Resolved' || currentStatus === 'Fixed'
                    ? '#059669'
                    : currentStatus === 'In Progress'
                    ? '#B45309'
                    : '#0F172A',
                cursor: 'pointer',
              }}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="False Positive">False Positive</option>
            </select>

            <button
              type="button"
              onClick={onClose}
              style={{
                color: '#64748B',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
              }}
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title & Metadata */}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
              {finding.title}
            </h2>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                marginTop: '12px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              {finding.repository && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Code2 size={14} color="#2563EB" />
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{finding.repository}</span>
                </div>
              )}
              {finding.resource && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cloud size={14} color="#059669" />
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{finding.resource}</span>
                </div>
              )}
              {finding.file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileCode size={14} />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {finding.file}:{finding.line || 1}
                  </span>
                </div>
              )}
              {finding.tool && (
                <span
                  style={{
                    backgroundColor: '#F1F5F9',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  Scanner: {finding.tool}
                </span>
              )}
              {finding.detectedAt && <span>Detected: {finding.detectedAt}</span>}
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '13px',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            {finding.description ||
              'This vulnerability was flagged by deterministic policy evaluation and SAST/Cloud scanner engine. Unsanitized input or permissive configuration exposes application state to unauthorized execution.'}
          </div>

          {/* Code Snippet Box (for SAST / Code findings) */}
          {finding.codeSnippet && (
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                color: '#F8FAFC',
              }}
            >
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #334155',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                  {finding.file || 'source.js'} (line {finding.codeSnippet.highlightLine})
                </span>
                <button
                  onClick={() => handleCopy(finding.codeSnippet!.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#94A3B8',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre
                style={{
                  padding: '14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  overflowX: 'auto',
                  margin: 0,
                }}
              >
                <code>{finding.codeSnippet.code}</code>
              </pre>
            </div>
          )}

          {/* Cloud Resource Details (for Cloud findings) */}
          {finding.cloudResource && (
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                Cloud Resource Inspection
              </div>
              <div style={{ padding: '12px 14px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>ARN: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{finding.cloudResource.arn}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Service / Region: </span>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>
                    {finding.cloudResource.service} ({finding.cloudResource.region})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Remediation & Actionable Solution */}
          <div
            style={{
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#2563EB" />
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>
                Recommended Remediation & Fix Patch
              </h4>
            </div>

            <p style={{ fontSize: '12px', color: '#1E40AF', lineHeight: 1.5 }}>
              {finding.remediation?.summary ||
                'Replace direct string concatenation or wildcard policy with parameterized queries and least-privilege role boundaries.'}
            </p>

            {finding.remediation?.diffSnippet && (
              <pre
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #BFDBFE',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#0F172A',
                  overflowX: 'auto',
                }}
              >
                <code>{finding.remediation.diffSnippet}</code>
              </pre>
            )}

            {finding.remediation?.commands && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E3A8A' }}>CLI Fix Command:</span>
                {finding.remediation.commands.map((cmd, idx) => (
                  <code
                    key={idx}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: '1px solid #BFDBFE',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#0F172A',
                      display: 'block',
                    }}
                  >
                    {cmd}
                  </code>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleRunRescan}
            disabled={isRescanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isRescanning ? 'not-allowed' : 'pointer',
            }}
          >
            <Play size={13} />
            <span>{isRescanning ? 'Running Scanner...' : rescanDone ? 'Rescan Passed' : 'Trigger Rescan'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => handleStatusChange('Resolved')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #A7F3D0',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={14} />
              <span>Mark Resolved</span>
            </button>

            <button
              onClick={handleApplyFix}
              disabled={isApplyingFix || fixApplied}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: fixApplied ? '#10B981' : '#2563EB',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: isApplyingFix || fixApplied ? 'default' : 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <Wrench size={13} />
              <span>{isApplyingFix ? 'Applying Patch...' : fixApplied ? 'Fix Applied' : 'Apply Automated Fix'}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
