'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Tag,
  Users,
  GitBranch,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface CreatePRModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: any;
  defaultRepository?: string;
  defaultBranch?: string;
  onPRCreated?: (prData: any) => void;
}

export default function CreatePRModal({
  isOpen,
  onClose,
  finding,
  defaultRepository = '',
  defaultBranch = 'main',
  onPRCreated,
}: CreatePRModalProps) {
  const [repository, setRepository] = useState(defaultRepository);

  React.useEffect(() => {
    if (defaultRepository) {
      setRepository(defaultRepository);
    }
  }, [defaultRepository]);

  const titleDefault = finding?.title
    ? `Fix ${finding.title.toLowerCase().replace(/vulnerability$/, '')} vulnerability`
    : 'Fix security vulnerability';
  const branchDefault = finding?.title
    ? `fix/${finding.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
    : 'fix/security-patch';

  const [branch, setBranch] = useState(branchDefault);
  const [title, setTitle] = useState(titleDefault);
  const [reviewers, setReviewers] = useState('security-team');
  const [labels, setLabels] = useState('security, automated-fix');
  const [changes, setChanges] = useState<string[]>([
    'Sanitize user input',
    'Use validation library',
    'Replace vulnerable call with safe implementation',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPR, setCreatedPR] = useState<any>(null);

  React.useEffect(() => {
    if (finding?.title) {
      setTitle(`Fix ${finding.title.toLowerCase().replace(/vulnerability$/, '')} vulnerability`);
      setBranch(`fix/${finding.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`);
    }
  }, [finding]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const findingId = finding?.id;
      if (!findingId) {
        setError('Cannot create pull request: No valid vulnerability finding selected.');
        setLoading(false);
        return;
      }

      const targetRepo = repository || defaultRepository || 'repository';
      const payload = {
        finding_id: String(findingId),
        repository: targetRepo,
        branch,
        title,
        reviewers: reviewers.split(',').map((r) => r.trim()).filter(Boolean),
        labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
      };

      const result = await api.assistant.createPR(findingId, payload);
      if (result && result.success !== false && (result.pr_number > 0 || result.html_url)) {
        setCreatedPR(result);
        if (onPRCreated) {
          onPRCreated(result);
        }
      } else {
        setError(
          result?.message ||
          result?.error ||
          'GitHub rejected the pull request request. Ensure your GitHub account is connected and has write access to this repository.'
        );
      }
    } catch (err: any) {
      console.error('Backend PR creation error:', err);
      setError(
        err?.message ||
        'Failed to create pull request. Ensure your GitHub integration has write access to this repository and branch.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedPR(null);
    setError(null);
    onClose();
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
          maxWidth: '560px',
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
        {/* ─────────────────────────────────────────────────────────────────
            STAGE 12: SUCCESS STATE (Pull Request Created)
           ───────────────────────────────────────────────────────────────── */}
        {createdPR ? (
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16A34A',
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Pull request created successfully!
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
                    A pull request has been created to fix the vulnerability.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* PR Details Card (Matches Stage 12 Card) */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GitPullRequest size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                    {createdPR.title || title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                    {repository}#{createdPR.pr_number} · {createdPR.branch || branch}
                  </div>
                </div>
              </div>

              {createdPR.html_url && (
                <a
                  href={createdPR.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    textDecoration: 'none',
                  }}
                >
                  <span>View on GitHub</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Next Steps Checklist */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
                Next steps
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Review and merge the pull request',
                  'The pipeline will run security checks',
                  "I'll notify you when it's merged",
                ].map((step, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} />
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#0F172A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
              STAGE 11: FORM STATE (Create Pull Request)
             ───────────────────────────────────────────────────────────────── */
          <>
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0F172A">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                  Pull request details
                </span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Instruction description */}
            <div style={{ padding: '16px 24px 0', fontSize: '13px', color: '#64748B' }}>
              I'll create a pull request to fix this issue with a secure implementation.
            </div>

            {/* Form Fields */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Repository */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Repository
                </label>
                <input
                  type="text"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Branch */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Changes List */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Changes
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {changes.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                      <span style={{ color: '#4F46E5', fontWeight: 700 }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewers */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Reviewers
                </label>
                <input
                  type="text"
                  value={reviewers}
                  onChange={(e) => setReviewers(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Labels */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Labels
                </label>
                <input
                  type="text"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
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
                onClick={handleClose}
                disabled={loading}
                style={{
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#0F172A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && <Loader2 className="animate-spin" size={14} />}
                <span>{loading ? 'Creating PR...' : 'Create pull request'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
