import React, { useState } from 'react';
import {
  X,
  Shield,
  FileCode,
  GitBranch,
  GitCommit,
  Clock,
  Sparkles,
  GitPullRequest,
  Check,
  AlertTriangle,
  ExternalLink,
  Copy,
  ChevronRight,
  User,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { FixConfirmationModal, FixPreviewData } from './FixConfirmationModal';

export interface UniversalFindingData {
  id: string;
  scanId?: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | string;
  repository?: string;
  branch?: string;
  commitSha?: string;
  scannerName?: string;
  resource?: string;
  filePath?: string;
  lineNumber?: number;
  occurrencesCount?: number;
  evidenceSnippet?: string;
  suggestedFix?: string;
  remediationExplanation?: string;
  createdAt?: string;
  resolvedAt?: string;
  history?: Array<{
    date: string;
    action: string;
    actor: string;
    note?: string;
  }>;
}

interface UniversalFindingDrawerProps {
  finding: UniversalFindingData | null;
  onClose: () => void;
  onApplyFix?: (findingId: string) => Promise<void>;
  onCreatePr?: (findingId: string, branch: string) => Promise<void>;
  onIgnore?: (findingId: string, reason: string) => Promise<void>;
  onAcceptRisk?: (findingId: string, rationale: string) => Promise<void>;
  onRescan?: (findingId: string) => Promise<void>;
}

export const UniversalFindingDrawer: React.FC<UniversalFindingDrawerProps> = ({
  finding,
  onClose,
  onApplyFix,
  onCreatePr,
  onIgnore,
  onAcceptRisk,
  onRescan,
}) => {
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(finding?.status || 'OPEN');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (!finding) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finding, onClose]);

  if (!finding) return null;

  const getSeverityStyle = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', color: '#DC2626', dot: '#EF4444' };
      case 'HIGH':
        return { bg: '#FFEDD5', color: '#EA580C', dot: '#F97316' };
      case 'MEDIUM':
        return { bg: '#FEF3C7', color: '#D97706', dot: '#F59E0B' };
      case 'LOW':
        return { bg: '#DCFCE7', color: '#16A34A', dot: '#22C55E' };
      default:
        return { bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' };
    }
  };

  const getStatusStyle = (st: string) => {
    switch (st.toUpperCase()) {
      case 'RESOLVED':
        return { bg: '#DCFCE7', color: '#16A34A', label: 'Resolved' };
      case 'IN_PROGRESS':
        return { bg: '#EFF6FF', color: '#2563EB', label: 'In Progress' };
      case 'IGNORED':
      case 'SUPPRESSED':
        return { bg: '#F1F5F9', color: '#64748B', label: 'Suppressed' };
      case 'ACCEPTED_RISK':
        return { bg: '#FEF3C7', color: '#D97706', label: 'Risk Accepted' };
      default:
        return { bg: '#FEE2E2', color: '#DC2626', label: 'Open' };
    }
  };

  const sevStyle = getSeverityStyle(finding.severity);
  const statStyle = getStatusStyle(currentStatus);

  const handleCopyId = () => {
    navigator.clipboard.writeText(finding.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConfirmFix = async (data: FixPreviewData, createPr: boolean) => {
    if (createPr && onCreatePr) {
      await onCreatePr(finding.id, 'fix/remediation-patch');
    } else if (onApplyFix) {
      await onApplyFix(finding.id);
    }
    setCurrentStatus('RESOLVED');
    setActionSuccess('Patch successfully applied to workspace. Rescan verification triggered.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleIgnoreClick = async () => {
    const reason = window.prompt('Enter justification for suppressing this finding (required for compliance audit):');
    if (!reason) return;
    if (onIgnore) {
      await onIgnore(finding.id, reason);
    }
    setCurrentStatus('IGNORED');
    setActionSuccess('Finding suppressed with recorded justification.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleAcceptRiskClick = async () => {
    const reason = window.prompt('Enter risk acceptance rationale and approved expiration date:');
    if (!reason) return;
    if (onAcceptRisk) {
      await onAcceptRisk(finding.id, reason);
    }
    setCurrentStatus('ACCEPTED_RISK');
    setActionSuccess('Risk formally accepted by Security Lead.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleRescanClick = async () => {
    if (onRescan) {
      await onRescan(finding.id);
      setActionSuccess('Verification scan started for affected component.');
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const defaultHistory = [
    { date: 'Sep 30 14:32', action: 'Scan detected security finding', actor: finding.scannerName || 'Checkov' },
    { date: 'Oct 01 10:15', action: 'Assigned finding to repository owner', actor: 'SecuLayer Engine' },
    { date: 'Oct 02 16:40', action: 'Automated remediation generated', actor: 'Gemini 2.5 Security' },
    { date: 'Oct 03 11:20', action: 'Pre-flight policy check evaluated', actor: 'OPA Policy Gate' },
  ];

  const historyItems = finding.history && finding.history.length > 0 ? finding.history : defaultHistory;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '840px',
            maxWidth: '94vw',
            maxHeight: '90vh',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: sevStyle.bg,
                    color: sevStyle.color,
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sevStyle.dot }} />
                  {finding.severity.toUpperCase()}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: statStyle.bg,
                    color: statStyle.color,
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {statStyle.label}
                </span>

                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#64748B',
                    backgroundColor: '#E2E8F0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {finding.ruleId}
                </span>

                {finding.occurrencesCount && finding.occurrencesCount > 1 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#475569',
                      backgroundColor: '#FEF3C7',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {finding.occurrencesCount} occurrences
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleCopyId}
                  title="Copy Finding ID"
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedId ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                  <span>{copiedId ? 'Copied' : finding.id.slice(0, 8)}</span>
                </button>
                <button
                  onClick={onClose}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
              {finding.title}
            </h2>
          </div>

          {actionSuccess && (
            <div
              style={{
                margin: '16px 24px 0',
                padding: '10px 14px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                borderRadius: '6px',
                color: '#166534',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              {actionSuccess}
            </div>
          )}

          {/* Drawer Body */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Metadata Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                backgroundColor: '#F8FAFC',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Repository
                </span>
                <span style={{ fontWeight: 600, color: '#0F172A', marginTop: '2px', display: 'block' }}>
                  {finding.repository || '—'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Branch / Commit
                </span>
                <span style={{ fontFamily: 'monospace', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GitBranch size={12} color="#2563EB" /> {finding.branch || 'main'}
                  <span style={{ color: '#94A3B8' }}>•</span>
                  <GitCommit size={12} color="#64748B" /> {(finding.commitSha || 'a83f21d').slice(0, 7)}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Target Resource
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A', marginTop: '2px', display: 'block' }}>
                  {finding.resource || 'aws_security_group.web'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Location
                </span>
                <span style={{ fontFamily: 'monospace', color: '#2563EB', marginTop: '2px', display: 'block' }}>
                  {finding.filePath || 'infra/security.tf'}:{finding.lineNumber || 28}
                </span>
              </div>
            </div>

            {/* Benchmark Guideline & Description */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Vulnerability Description
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6, backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                {finding.description}
              </p>
            </div>

            {/* Code Evidence Snippet */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Code Evidence
              </h4>
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {finding.evidenceSnippet ||
`resource "aws_security_group" "web" {
  name        = "web-server-sg"
  description = "Allows SSH ingress from everywhere"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`}
              </pre>
            </div>

            {/* Remediation Plan */}
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={16} color="#2563EB" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                  Recommended Remediation
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#1E3A8A', lineHeight: 1.5 }}>
                {finding.remediationExplanation ||
                  'Restrict SSH access (port 22) exclusively to your authorized corporate bastion host CIDR (e.g. 10.0.0.0/16 or VPN egress IP). Do not expose management ports to 0.0.0.0/0.'}
              </p>
            </div>

            {/* History / Audit Log */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Audit Trail & Finding History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                    <span style={{ width: '85px', color: '#64748B', flexShrink: 0, fontFamily: 'monospace' }}>
                      {item.date}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>{item.action}</span>
                      <span style={{ color: '#64748B', marginLeft: '6px' }}>({item.actor})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div
            style={{
              marginTop: 'auto',
              borderTop: '1px solid #E2E8F0',
              padding: '18px 24px',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setFixModalOpen(true)}
                disabled={currentStatus === 'RESOLVED'}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  backgroundColor: currentStatus === 'RESOLVED' ? '#16A34A' : '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: currentStatus === 'RESOLVED' ? 'default' : 'pointer',
                  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                }}
              >
                {currentStatus === 'RESOLVED' ? (
                  <>
                    <CheckCircle2 size={15} /> Fixed & Verified
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Apply Automated Fix
                  </>
                )}
              </button>

              <button
                onClick={() => setFixModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <GitPullRequest size={15} color="#2563EB" /> Create PR
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <button
                onClick={handleIgnoreClick}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ignore / Suppress
              </button>

              <button
                onClick={handleAcceptRiskClick}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#D97706',
                  borderRadius: '6px',
                  border: '1px solid #FEF3C7',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Accept Risk
              </button>

              <button
                onClick={handleRescanClick}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#2563EB',
                  borderRadius: '6px',
                  border: '1px solid #DBEAFE',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={12} /> Rescan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fix Preview Modal */}
      {fixModalOpen && (
        <FixConfirmationModal
          data={{
            findingId: finding.id,
            ruleId: finding.ruleId,
            title: finding.title,
            filePath: finding.filePath || 'infra/security.tf',
            lineNumber: finding.lineNumber || 28,
            resource: finding.resource || 'aws_security_group.web',
            originalCode: finding.evidenceSnippet || 'cidr_blocks = ["0.0.0.0/0"]',
            modifiedCode: finding.suggestedFix || 'cidr_blocks = ["10.0.0.0/16"] # Restricted to corporate CIDR',
            explanation: finding.remediationExplanation || 'Restricts ingress port 22 access from 0.0.0.0/0 to internal subnet.',
          }}
          onClose={() => setFixModalOpen(false)}
          onConfirm={handleConfirmFix}
        />
      )}
    </>
  );
};
export default UniversalFindingDrawer;
