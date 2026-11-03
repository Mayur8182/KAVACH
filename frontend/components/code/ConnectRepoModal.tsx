'use client';

/**
 * ConnectRepoModal — In-workspace repository connection & immediate scanner launch.
 * Allows developers to connect a GitHub repository directly from SecuLayer
 * and triggers automated SAST, Secrets, and SCA scans.
 * Styled in clean SecuLayer light theme.
 */

import React, { useState } from 'react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { FolderGit2, X, Loader2, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (connectedRepo?: any) => void;
  projectId?: string;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({ isOpen, onClose, onSuccess, projectId }) => {
  const { currentProject, refreshRepositories, refreshProjects } = useScope();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [triggerScan, setTriggerScan] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [connectingStage, setConnectingStage] = useState<string>('idle');
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions
    const cleanUrl = repoUrl.trim();
    if (!cleanUrl) {
      setError('Please provide a repository URL or owner/repository name.');
      return;
    }

    // Client-side validation: detect user profile URLs vs repository URLs
    const withoutProtocol = cleanUrl
      .replace(/^https?:\/\/(github\.com|gitlab\.com)\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
    const segments = withoutProtocol.split('/').filter(Boolean);

    if ((cleanUrl.includes('github.com') || cleanUrl.includes('gitlab.com')) && segments.length === 1) {
      setError(
        `"${cleanUrl}" is a GitHub profile URL, not a repository. Please enter the repository name in the format: ${segments[0]}/<repo-name> (e.g. ${segments[0]}/my-app or https://github.com/${segments[0]}/my-app).`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setConnectingStage('Connecting to provider');
    setConnectionProgress(25);

    const timer1 = setTimeout(() => {
      setConnectingStage('Fetching repository details');
      setConnectionProgress(50);
    }, 600);

    const timer2 = setTimeout(() => {
      setConnectingStage('Syncing branches and metadata');
      setConnectionProgress(75);
    }, 1300);

    try {
      const targetProjectId = projectId || currentProject?.id || undefined;
      const res = await api.code.connectRepository({
        repo_url: cleanUrl,
        default_branch: branch.trim() || 'main',
        private: isPrivate,
        trigger_scan: triggerScan,
        project_id: targetProjectId,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      // Backend confirmed connection
      setConnectingStage('Connection completed');
      setConnectionProgress(100);

      await new Promise((r) => setTimeout(r, 650));

      setSubmitting(false);
      refreshRepositories?.();
      refreshProjects?.();
      onSuccess(res);
      onClose();
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setError(err?.message || 'Failed to connect repository. Verify the URL and connectivity.');
      setConnectingStage('idle');
      setConnectionProgress(0);
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <FolderGit2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Connect GitHub Repository
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Connect directly in SecuLayer and trigger automated security scan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#DC2626',
              fontSize: '12.5px',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Repository URL or Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Repository URL or owner/name *
            </label>
            <input
              type="text"
              placeholder="e.g. Mayur8182/my-app or https://github.com/Mayur8182/my-app"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
              }}
              required
            />
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              Must include both owner and repository name (e.g. <code>owner/repo</code>).
            </span>
          </div>

          {/* Default Branch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Default Branch
            </label>
            <input
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1E293B' }}>
              <input
                type="checkbox"
                checked={triggerScan}
                onChange={(e) => setTriggerScan(e.target.checked)}
                style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
              />
              <span>Trigger Security Scan immediately upon connection (Semgrep, Gitleaks, Trivy)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#64748B' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
              />
              <span>Private repository (requires GitHub App or SSH authorization token)</span>
            </label>
          </div>

          {/* Real-time Connection Progress Indicator */}
          {submitting && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontWeight: 600,
                    color: connectionProgress === 100 ? '#16A34A' : '#2563EB',
                  }}
                >
                  {connectionProgress === 100 ? (
                    <CheckCircle2 size={14} color="#16A34A" />
                  ) : (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  {connectingStage}...
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B' }}>
                  {connectionProgress}%
                </span>
              </div>

              {/* Thin horizontal progress line */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${connectionProgress}%`,
                    height: '100%',
                    backgroundColor: connectionProgress === 100 ? '#16A34A' : '#2563EB',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#2563EB',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: submitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Connecting &amp; Queuing Scan…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Connect &amp; Scan Repository
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
