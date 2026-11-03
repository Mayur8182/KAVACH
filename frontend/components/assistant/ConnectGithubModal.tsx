'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Lock, ArrowRight, Loader2, Key, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';

const GithubIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

interface ConnectGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized?: () => void;
  onConnected?: () => void;
}

export function ConnectGithubModal({ isOpen, onClose, onAuthorized, onConnected }: ConnectGithubModalProps) {
  const { currentOrg, currentProject } = useScope();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingConnection, setExistingConnection] = useState<{
    connected: boolean;
    login?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    scopes?: string[];
  } | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [connectStepText, setConnectStepText] = useState('Connecting to GitHub...');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const orgName = currentOrg?.name || currentProject?.name || 'Personal Workspace';

  const notifySuccess = () => {
    if (onAuthorized) onAuthorized();
    if (onConnected) onConnected();
  };

  // Check if GitHub is already connected or user logged in with GitHub
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setCheckingStatus(true);
    setAuthError(null);

    api.integrations
      .getGithubStatus()
      .then((res: any) => {
        if (!isMounted) return;
        if (res && res.connected) {
          setExistingConnection(res);
        } else {
          setExistingConnection(null);
        }
      })
      .catch((err) => {
        console.warn('Could not verify existing GitHub status:', err);
      })
      .finally(() => {
        if (isMounted) setCheckingStatus(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // 1-Click Connect Handler: Zero manual PAT required!
  const handleConnect = async () => {
    setConnecting(true);
    setAuthError(null);
    setConnectStepText('Connecting to GitHub account...');

    try {
      // Step 1: Attempt Central Integration Connect
      setConnectStepText('Authorizing repository access permissions...');
      await api.integrations.connectCentral({
        provider: 'github',
        organization_name: orgName,
        account_name: orgName,
        token: tokenInput.trim() || undefined,
        scopes: ['repo', 'read:user', 'user:email', 'read:org'],
      });

      setConnectStepText('Discovering repositories...');
      // Allow brief moment for visual progress
      await new Promise((resolve) => setTimeout(resolve, 400));
      setConnectStepText('Connected successfully!');
      await new Promise((resolve) => setTimeout(resolve, 300));
      notifySuccess();
    } catch (err: any) {
      // Fallback: Assistant integration endpoint
      try {
        setConnectStepText('Verifying workspace security gateway...');
        await api.assistant.connectIntegration('github', {
          token: tokenInput.trim() || undefined,
          workspace_name: orgName,
        });
        setConnectStepText('Connected successfully!');
        await new Promise((resolve) => setTimeout(resolve, 300));
        notifySuccess();
      } catch (innerErr: any) {
        setAuthError(err?.message || innerErr?.message || 'Failed to connect to GitHub. Please check network connection.');
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 22px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KavachMark size={22} />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              kavach
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {authError && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#B91C1C',
              fontSize: 12.5,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        {/* ── STATE 1: CHECKING INITIAL CONNECTION STATUS ─────────────────── */}
        {checkingStatus ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563EB' }} />
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Checking GitHub connection status...</p>
          </div>
        ) : existingConnection && existingConnection.connected ? (
          /* ── STATE 2: ALREADY CONNECTED / LOGGED IN WITH GITHUB ──────────── */
          <div style={{ padding: '24px 26px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                GitHub Account Connected
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Logged in as <strong>@{existingConnection.login || 'GitHub User'}</strong>. All repository permissions are active.
              </p>
            </div>

            {/* Connection Details Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GithubIcon size={18} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {existingConnection.login || 'Connected Account'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                  }}
                >
                  Active & Authorized
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                Your account is linked. You can select which repositories to scan without entering any tokens.
              </p>
            </div>

            {/* Primary Action: Select Repositories */}
            <button
              type="button"
              id="select-repositories-btn"
              onClick={notifySuccess}
              style={{
                width: '100%',
                padding: '11px 16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(15,23,42,0.12)',
              }}
            >
              <span>Select Repositories</span>
              <ArrowRight size={15} />
            </button>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  textDecoration: 'underline',
                }}
              >
                <RefreshCw size={12} className={connecting ? 'animate-spin' : ''} />
                <span>{connecting ? 'Syncing...' : 'Sync repositories or re-verify'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── STATE 3: 1-CLICK CONNECT WITH GITHUB ────────────────────────── */
          <div style={{ padding: '22px 26px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <GithubIcon size={26} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Connect your GitHub account
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                1-click connection for <strong>{orgName}</strong>. Securely access your repositories for real deterministic scanning and automated fixes.
              </p>
            </div>

            {/* Permissions list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '13px 15px',
                marginBottom: 20,
              }}
            >
              {[
                { title: 'Repository access', desc: 'Read repository metadata, commits, and code files for scanning' },
                { title: 'Deterministic scanners', desc: 'Execute Semgrep, Trivy, Gitleaks, and Checkov analysis' },
                { title: 'Automated remediation PRs', desc: 'Open fix pull requests with verified patches upon approval' },
                { title: 'Zero code retention', desc: 'Source code is analyzed in transient secure runner memory only' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: '50%',
                      backgroundColor: '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 1-Click Connect Button */}
            <button
              type="button"
              id="connect-with-github-btn"
              onClick={handleConnect}
              disabled={connecting}
              style={{
                width: '100%',
                padding: '11px 16px',
                backgroundColor: connecting ? '#334155' : '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: connecting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(15,23,42,0.12)',
                transition: 'all 0.15s ease',
              }}
            >
              {connecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{connectStepText}</span>
                </>
              ) : (
                <>
                  <GithubIcon size={18} />
                  <span>Connect with GitHub</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#94A3B8', fontSize: 11 }}>
              <Lock size={12} />
              <span>OAuth 2.0 encrypted at rest. Zero manual tokens required.</span>
            </div>

            {/* Advanced Options Collapsible (For Enterprise Self-Hosted Only) */}
            <details style={{ marginTop: 16, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
              <summary
                style={{
                  fontSize: 11.5,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                Enterprise / Custom Bot Token (Advanced)
              </summary>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Key size={12} color="#64748B" />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>
                    Personal Access Token (Only if using self-hosted GitHub Enterprise)
                  </span>
                </div>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_... (leave empty for standard OAuth)"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
