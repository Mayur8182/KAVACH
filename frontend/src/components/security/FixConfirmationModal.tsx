import React, { useState } from 'react';
import { X, Check, GitPullRequest, AlertCircle, FileCode, CheckCircle2 } from 'lucide-react';

export interface FixPreviewData {
  findingId: string;
  ruleId: string;
  title: string;
  filePath: string;
  lineNumber?: number;
  resource?: string;
  originalCode: string;
  modifiedCode: string;
  explanation: string;
}

interface FixConfirmationModalProps {
  data: FixPreviewData | null;
  onClose: () => void;
  onConfirm: (data: FixPreviewData, createPr: boolean) => Promise<void>;
}

export const FixConfirmationModal: React.FC<FixConfirmationModalProps> = ({
  data,
  onClose,
  onConfirm,
}) => {
  const [createPr, setCreatePr] = useState(false);
  const [prBranch, setPrBranch] = useState('fix/remediation-patch');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, submitting, onClose]);

  if (!data) return null;

  const handleExecute = async () => {
    if (submitting) return; // Prevent duplicate submissions (Mistake #54)
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(data, createPr);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[FixConfirmationModal] Patch application failed:', err);
      setError(err?.message || String(err) || 'Failed to apply remediation patch.');
    } finally {
      setSubmitting(false);
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
          width: '720px',
          maxWidth: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Review & Apply Security Patch
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Target File Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Target File:</span>
            <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>
              {data.filePath}:{data.lineNumber || 1}
            </span>
          </div>

          {/* Remediation Rationale */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Remediation Explanation
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              {data.explanation}
            </p>
          </div>

          {/* Unified Diff Box */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Proposed Code Changes (Diff)
            </div>
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                overflow: 'hidden',
                fontSize: '12px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
              }}
            >
              {/* Deleted original code */}
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '12px 14px', borderBottom: '1px solid #FECACA' }}>
                <div style={{ fontWeight: 700, fontSize: '11px', color: '#DC2626', marginBottom: '4px' }}>
                  - CURRENT VULNERABLE CODE
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {data.originalCode}
                </pre>
              </div>

              {/* Added safe code */}
              <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: '11px', color: '#16A34A', marginBottom: '4px' }}>
                  + REMEDIATED SECURE CODE
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {data.modifiedCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Option: Create Pull Request */}
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createPr}
                onChange={(e) => setCreatePr(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Create pull request on branch instead of applying directly
            </label>

            {createPr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
                <GitPullRequest size={14} color="#64748B" />
                <span style={{ fontSize: '12px', color: '#64748B' }}>Branch:</span>
                <input
                  type="text"
                  value={prBranch}
                  onChange={(e) => setPrBranch(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    width: '260px',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
          <button
            onClick={onClose}
            disabled={submitting}
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
            Cancel
          </button>

          <button
            onClick={handleExecute}
            disabled={submitting || success}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: success ? '#16A34A' : '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: submitting || success ? 'default' : 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            {success ? (
              <>
                <CheckCircle2 size={16} /> Patch Applied & Rescanned!
              </>
            ) : submitting ? (
              'Modifying code & rescanning...'
            ) : (
              <>
                <Check size={16} /> {createPr ? 'Create PR & Trigger CI' : 'Confirm & Apply Patch'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default FixConfirmationModal;
