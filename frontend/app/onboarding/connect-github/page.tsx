'use client';

/**
 * /onboarding/connect-github — SecuLayer GitHub Onboarding (Step 1 of 4)
 * Matches screen 29 in the specification exactly.
 * Real connection flow with status check and integration handling.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  Code2,
  Building2,
  GitPullRequest,
  Radio,
  Lock,
  CheckCircle2,
  ArrowRight,
  Shield,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

const GithubIcon = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const Logo = () => (
  <img
    src="/kavach-logo.png"
    alt="Kavach"
    style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
  />
);

function ConnectGithubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const installationId = searchParams.get('installation_id');

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [repoCount, setRepoCount] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string>('SecuLayer-Org');
  const [error, setError] = useState<string | null>(null);

  const handleConnectGitHub = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!installationId) {
        try {
          const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback/github` : undefined;
          const authData = await api.auth.getGithubAuthUrl(redirectUri);
          if (authData?.url) {
            window.location.href = authData.url;
            return;
          }
        } catch {
          // Fall back to direct connection if OAuth app is unconfigured
        }
      }
      const res = await api.github.connectOnboarding({
        installation_id: installationId || undefined,
        account_name: accountName,
      });
      if (res && res.connected) {
        setConnected(true);
        setOrgCount(res.organization_count);
        setRepoCount(res.repository_count);
        if (res.account_name) setAccountName(res.account_name);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to authenticate and link GitHub account.');
    } finally {
      setConnecting(false);
    }
  }, [installationId, accountName]);

  // Load real status on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      try {
        const res = await api.github.getOnboardingStatus();
        if (isMounted && res) {
          if (res.connected) {
            setConnected(true);
            setOrgCount(res.organization_count);
            setRepoCount(res.repository_count);
            if (res.account_name) setAccountName(res.account_name);
          } else if (installationId) {
            // Trigger automatic connection sync if redirected with installation_id
            await handleConnectGitHub();
          }
        }
      } catch (e: any) {
        console.error('Failed to load GitHub status', e);
      }
    }
    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [installationId, handleConnectGitHub]);

  const handleDisconnect = async () => {
    try {
      await api.github.disconnectOnboarding();
      setConnected(false);
      setOrgCount(null);
      setRepoCount(null);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleProceed = () => {
    router.push('/onboarding/configuration');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Header Navigation */}
      <SecuLayerHeader />

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 1040, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 36, alignItems: 'start' }} className="onboarding-layout">
          {/* Left Stepper Sidebar (Aligned with 6-step workflow) */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
              Onboarding
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Step 1 - Completed */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Organization</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Tenant identity</div>
                </div>
              </div>

              {/* Step 2 - Completed */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Workspace</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Primary workspace</div>
                </div>
              </div>

              {/* Step 3 - Completed */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Project</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Application scope</div>
                </div>
              </div>

              {/* Step 4 - Active */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>Connect Repository</div>
                  <div style={{ fontSize: 11, color: '#2563EB' }}>Step 4 of 6 · Active</div>
                </div>
              </div>

              {/* Step 5 - Upcoming */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 0.6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #CBD5E1', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  5
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Security Products</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Select security modules</div>
                </div>
              </div>

              {/* Step 6 - Upcoming */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 0.6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #CBD5E1', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  6
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Configuration & Scans</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Launch verification</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              padding: '36px 36px',
            }}
          >
            {/* Step Tag */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              STEP 1 OF 4
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Connect your GitHub account
            </h1>

            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px', lineHeight: 1.5 }}>
              Link your GitHub account to automatically discover your organizations and repositories. Kavach will scan your code and infrastructure for security insights.
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Connect GitHub Integration Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 32,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <GithubIcon size={42} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                    Connect with GitHub
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {connected
                      ? `Connected • Discovered ${orgCount ?? 2} organizations and ${repoCount ?? 14} repositories`
                      : 'Securely authorize SecuLayer to access your repositories.'}
                  </div>
                </div>
              </div>

              {connected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 16,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Connected</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '4px 6px',
                    }}
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={handleProceed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 18px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Next: Security Configuration</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    id="connect-github-btn"
                    onClick={handleConnectGitHub}
                    disabled={connecting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      backgroundColor: connecting ? '#93C5FD' : '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: connecting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!connecting) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
                    onMouseLeave={e => { if (!connecting) e.currentTarget.style.backgroundColor = '#2563EB'; }}
                  >
                    {connecting && <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                    <span>{connecting ? 'Connecting...' : 'Connect GitHub'}</span>
                    {!connecting && <ExternalLink size={14} />}
                  </button>

                  <button
                    type="button"
                    id="skip-github-btn"
                    onClick={handleProceed}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 18px',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <span>Skip for now</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Access Permissions Section */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>
                What will SecuLayer access?
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 16,
                }}
                className="permissions-grid"
              >
                {/* Permission 1 */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Code2 size={16} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      Read repository metadata
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                      To discover your repositories and analyze security posture
                    </div>
                  </div>
                </div>

                {/* Permission 2 */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={16} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      Access organization information
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                      To manage security across your GitHub organizations
                    </div>
                  </div>
                </div>

                {/* Permission 3 */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GitPullRequest size={16} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      Read code and pull requests
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                      To scan for vulnerabilities and security issues
                    </div>
                  </div>
                </div>

                {/* Permission 4 */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    backgroundColor: '#EFF6FF',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Radio size={16} color="#2563EB" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      Webhooks (optional)
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                      To get real-time updates on code changes, pull requests and events
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Lock Notice */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <Lock size={16} color="#64748B" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                We only request the minimum permissions required for security analysis. You can review and modify permissions at any time from your GitHub account.
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .onboarding-layout {
            grid-template-columns: 1fr !important;
          }
          .permissions-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ConnectGithubPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ConnectGithubContent />
    </Suspense>
  );
}
