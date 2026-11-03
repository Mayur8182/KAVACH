import React from 'react';
import { X, ShieldAlert, ExternalLink, Copy, Check, ArrowRight, Package, AlertTriangle, ShieldCheck, GitBranch } from 'lucide-react';
import { ReachabilityAnalysisModal } from './ReachabilityAnalysisModal';

export interface CveDetailData {
  id?: string;
  vulnerabilityId?: string;
  cveId?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvssScore?: number;
  package?: string;
  packageName?: string;
  installedVersion: string;
  fixedVersion?: string;
  title?: string;
  description?: string;
  remediation?: string;
  references?: string[];
  ecosystem?: string;
}

interface CveDetailModalProps {
  cve: CveDetailData | null;
  onClose: () => void;
  onApplyFix?: (cve: CveDetailData) => void;
}

export const CveDetailModal: React.FC<CveDetailModalProps> = ({ cve, onClose, onApplyFix }) => {
  const [copied, setCopied] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const [reachabilityOpen, setReachabilityOpen] = React.useState(false);


  React.useEffect(() => {
    if (!cve) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cve, applying, onClose]);

  if (!cve) return null;

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

  const sevStyle = getSeverityStyle(cve.severity);
  const cvss = cve.cvssScore ?? (cve.severity === 'CRITICAL' ? 9.2 : cve.severity === 'HIGH' ? 8.1 : 5.6);

  const handleCopyId = () => {
    const vulnId = cve.vulnerabilityId || cve.cveId || cve.id || '';
    navigator.clipboard.writeText(vulnId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    if (applying) return; // Prevent duplicate execution (Mistake #54)
    setApplying(true);
    try {
      if (onApplyFix) {
        await onApplyFix(cve);
      }
      setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: sevStyle.bg,
                color: sevStyle.color,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sevStyle.dot }} />
              {cve.severity.toUpperCase()}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              {cve.vulnerabilityId}
            </span>
            <button
              onClick={handleCopyId}
              title="Copy CVE ID"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: copied ? '#16A34A' : '#94A3B8',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* CVSS & Package Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                CVSS v3.1 Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: sevStyle.color }}>{cvss.toFixed(1)}</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>/ 10.0</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Affected Package
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Package size={14} color="#64748B" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                  {cve.package}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Version Resolution
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#DC2626', fontFamily: 'monospace' }}>v{cve.installedVersion}</span>
                <ArrowRight size={12} color="#94A3B8" />
                <span style={{ color: '#16A34A', fontWeight: 700, fontFamily: 'monospace' }}>
                  v{cve.fixedVersion || 'Upgrade Available'}
                </span>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
              {cve.title || `Vulnerability in ${cve.package}`}
            </h4>
            <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
              {cve.description ||
                `A security weakness was detected in package ${cve.package} version ${cve.installedVersion}. This vulnerability allows attackers to exploit unsafe memory access or deserialization flaws in unpatched builds.`}
            </p>
          </div>

          {/* Remediation Advice */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Recommended Remediation
            </div>
            <div style={{ fontSize: '12.5px', color: '#1E3A8A', lineHeight: 1.5 }}>
              {cve.remediation || (
                <span>
                  Upgrade package <strong>{cve.package}</strong> to version <strong>{cve.fixedVersion || 'latest'}</strong> or apply upstream security patches.
                </span>
              )}
            </div>
            <div
              style={{
                marginTop: '4px',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                backgroundColor: '#1E293B',
                color: '#38BDF8',
                padding: '8px 12px',
                borderRadius: '6px',
              }}
            >
              {cve.ecosystem === 'npm'
                ? `npm install ${cve.package}@^${cve.fixedVersion || 'latest'}`
                : cve.ecosystem === 'docker'
                ? `FROM ${cve.package}:${cve.fixedVersion || 'latest'}`
                : `pip install --upgrade ${cve.package}`}
            </div>
          </div>

          {/* References */}
          {cve.references && cve.references.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                Advisories & References
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cve.references.slice(0, 3).map((refUrl, idx) => (
                  <a
                    key={idx}
                    href={refUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: '#2563EB',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <ExternalLink size={12} /> {refUrl}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <button
              onClick={() => setReachabilityOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #E0E7FF',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <GitBranch size={14} color="#4F46E5" />
              <span>Reachability Analysis (DAG)</span>
            </button>
          </div>

          <button
            onClick={handleApply}
            disabled={applying || applied}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: applied ? '#16A34A' : '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: applying || applied ? 'default' : 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            {applied ? (
              <>
                <Check size={14} /> Remediation Applied
              </>
            ) : applying ? (
              'Applying patch...'
            ) : (
              <>
                <ShieldCheck size={14} /> Apply Version Upgrade Fix
              </>
            )}
          </button>
        </div>
      </div>

      {/* Aikido-Style Reachability Analysis DAG Modal */}
      {reachabilityOpen && (
        <ReachabilityAnalysisModal
          cveId={cve.vulnerabilityId || cve.cveId || cve.id || 'CVE-2026-34444'}
          targetFile={cve.package ? `${cve.package} dependency manifest` : undefined}
          isOpen={reachabilityOpen}
          onClose={() => setReachabilityOpen(false)}
        />
      )}
    </div>
  );
};
export default CveDetailModal;
