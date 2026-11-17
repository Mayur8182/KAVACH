'use client';

/**
 * /onboarding/connect-github — Dedicated GitHub Connection Screen for Google-Authenticated Users
 *
 * Requirements:
 * - Enterprise cybersecurity aesthetic: minimal black, white, and gray UI
 * - Heading: "Connect your GitHub account"
 * - Description: "Connect your GitHub account to import repositories, analyze vulnerabilities, and secure your software development workflow."
 * - Primary Action: "Connect GitHub"
 * - Redirects to official Kavach GitHub App installation: https://github.com/apps/kavach-security/installations/new?state=...
 * - Correlates installation with authenticated Kavach user via cryptographically signed single-use state
 * - Handles already installed state, cancelled installation retry, and error reporting
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  Shield,
  Lock,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';
import { KavachBrandLoader } from '@/components/feedback/KavachBrandLoader';
import { toast } from '@/lib/toast';

function GitHubIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function ConnectGitHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [accountLogin, setAccountLogin] = useState<string | null>(null);
  const [repoCount, setRepoCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Check for error parameters returned from GitHub
    const urlError = searchParams.get('error');
    const urlErrorDesc = searchParams.get('error_description');
    if (urlError) {
      if (urlError === 'access_denied') {
        setErrorMessage('GitHub installation was cancelled. You can retry whenever you are ready.');
      } else {
        setErrorMessage(urlErrorDesc || `GitHub returned error: ${urlError}`);
      }
    }

    async function checkCurrentStatus() {
      try {
        const [user, onboardingState, ghStatus] = await Promise.all([
          api.auth.me().catch(() => null),
          api.onboarding.getState().catch(() => null),
          api.github.getStatus().catch(() => null),
        ]);

        if (isCancelled) return;

        if (user) {
          setCurrentUser(user);
        }

        const isInstalled = Boolean(
          onboardingState?.github_installed ||
          ghStatus?.connected ||
          (ghStatus?.installations_count && ghStatus.installations_count > 0)
        );

        if (isInstalled) {
          setGithubConnected(true);
          setAccountLogin(ghStatus?.primary_account || 'GitHub Account');
          setRepoCount(ghStatus?.repositories_count || 0);

          // If installation was just completed or user has completed onboarding
          if (searchParams.get('installed') === 'true') {
            toast.success('GitHub App Installed Successfully', {
              description: 'Authorized repositories are now synchronized.',
            });
          }
        }
      } catch (err: any) {
        console.warn('Status check notice:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    checkCurrentStatus();

    return () => {
      isCancelled = true;
    };
  }, [searchParams]);

  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const currentOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'https://kavachsecurity.me';
      // After installation completes on GitHub, redirect user directly to Create Project onboarding
      const redirectTarget = `${currentOrigin}/projects/create`;

      const installData = await api.github.getInstallUrl({
        redirect_url: redirectTarget,
      });

      const targetUrl = installData?.install_url || installData?.url;

      if (targetUrl) {
        window.location.href = targetUrl;
        return;
      }

      throw new Error('Server did not return a valid GitHub App installation URL.');
    } catch (err: any) {
      console.error('Failed to initiate GitHub App installation:', err);
      const msg = err?.message || 'Failed to generate GitHub App installation URL. Please try again.';
      setErrorMessage(msg);
      toast.error('Installation Error', { description: msg });
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <KavachBrandLoader size="lg" message="Verifying security workspace status..." />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #F1F5F9',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KavachMark size={24} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Kavach
          </span>
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              {currentUser.email}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {(currentUser.name || currentUser.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '40px 36px',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
          }}
        >
          {/* GitHub Icon Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              }}
            >
              <GitHubIcon size={32} color="#FFFFFF" />
            </div>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 10px',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            Connect your GitHub account
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '14.5px',
              color: '#475569',
              margin: '0 0 28px',
              textAlign: 'center',
              lineHeight: 1.55,
            }}
          >
            Connect your GitHub account to import repositories, analyze vulnerabilities, and secure your software development workflow.
          </p>

          {/* Error Notice */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13.5px', color: '#991B1B', lineHeight: 1.4 }}>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Connected State vs Connect Action */}
          {githubConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <CheckCircle2 size={24} color="#16A34A" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#166534' }}>
                    Kavach GitHub App Installed
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803D', marginTop: '2px' }}>
                    Connected account: @{accountLogin} ({repoCount} {repoCount === 1 ? 'repository' : 'repositories'} accessible)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/projects/create')}
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>Continue to Create Project</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button
                type="button"
                onClick={handleConnectGitHub}
                disabled={isConnecting}
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '15px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isConnecting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'opacity 0.15s ease',
                  opacity: isConnecting ? 0.75 : 1,
                }}
              >
                {isConnecting ? (
                  <>
                    <RotateCw size={18} className="animate-spin" />
                    <span>Connecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <GitHubIcon size={20} color="#FFFFFF" />
                    <span>Connect GitHub</span>
                  </>
                )}
              </button>

              {/* Information Checklist */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                  <Shield size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                  <span>Choose personal account or organization on GitHub</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                  <GitBranch size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                  <span>Select all repositories or only specific repositories</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                  <Lock size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                  <span>Isolated tenant workspace with cryptographically verified state</span>
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, textAlign: 'center', lineHeight: 1.45 }}>
                Opens GitHub&apos;s official installation interface for <strong>Kavach Security</strong>. You can modify repository access permissions at any time from your GitHub settings.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConnectGitHubPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
          <KavachBrandLoader size="lg" message="Loading setup..." />
        </div>
      }
    >
      <ConnectGitHubContent />
    </Suspense>
  );
}
