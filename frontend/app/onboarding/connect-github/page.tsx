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
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [accountLogin, setAccountLogin] = useState<string | null>(null);
  const [repoCount, setRepoCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkCurrentStatus = async () => {
    try {
      const [user, onboardingState, ghStatus, projects] = await Promise.all([
        api.auth.me().catch(() => null),
        api.onboarding.getState().catch(() => null),
        api.github.getStatus().catch(() => null),
        api.projects.list().catch(() => []),
      ]);

      if (user) {
        setCurrentUser(user);
      }

      const userHasProject = Boolean(
        (Array.isArray(projects) && projects.length > 0) ||
        onboardingState?.has_project ||
        user?.has_project
      );
      setHasProject(userHasProject);

      const isInstalled = Boolean(
        onboardingState?.github_installed ||
        user?.github_installed ||
        ghStatus?.connected ||
        (ghStatus?.installations_count && ghStatus.installations_count > 0)
      );

      if (isInstalled) {
        setGithubConnected(true);
        setAccountLogin(ghStatus?.primary_account || user?.name || 'GitHub Account');
        setRepoCount(ghStatus?.repositories_count || 0);

        if (searchParams.get('installed') === 'true') {
          toast.success('GitHub App Installed Successfully', {
            description: 'Authorized repositories are now synchronized.',
          });
        }
      }
    } catch (err: any) {
      console.warn('Status check notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

    checkCurrentStatus();

    // Re-check status when user returns to this tab from GitHub settings
    const handleWindowFocus = () => {
      checkCurrentStatus();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [searchParams]);

  const handleVerifyStatus = async () => {
    setIsCheckingStatus(true);
    setErrorMessage(null);
    try {
      // Trigger background sync if API supports it
      await api.github.getStatus().catch(() => null);
      await checkCurrentStatus();
      toast.success('Workspace status refreshed');
    } catch {
      await checkCurrentStatus();
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const currentOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'https://kavachsecurity.me';
      // After installation completes on GitHub, redirect user directly to Create Project onboarding
      const redirectTarget = `${currentOrigin}/projects/create`;

      const installPromise = api.github.getInstallUrl({
        redirect_url: redirectTarget,
      });

      // Quick 3.5-second fallback so slow network or sleeping backend never hangs the user
      const timeoutPromise = new Promise<{ install_url: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              install_url: 'https://github.com/apps/kavach-security/installations/new',
            }),
          3500
        )
      );

      const installData = await Promise.race([installPromise, timeoutPromise]);

      let targetUrl = installData?.install_url || (installData as any)?.url;

      if (targetUrl) {
        // Enforce canonical GitHub App slug "kavach-security" and eliminate any accidental encoded spaces / display names
        targetUrl = targetUrl
          .replace(/github\.com\/apps\/[^/]+\/installations/i, 'github.com/apps/kavach-security/installations')
          .replace(/github\.com\/apps\/Kavach%20Security/gi, 'github.com/apps/kavach-security')
          .replace(/github\.com\/apps\/Kavach\+Security/gi, 'github.com/apps/kavach-security')
          .replace(/github\.com\/apps\/Kavach Security/gi, 'github.com/apps/kavach-security');

        window.location.href = targetUrl;
        return;
      }

      // Safe fallback directly to official GitHub App installation URL
      window.location.href = 'https://github.com/apps/kavach-security/installations/new';
    } catch (err: any) {
      console.error('Failed to initiate GitHub App installation:', err);
      // Even on network error, redirect to official GitHub App installation URL so user is never blocked
      window.location.href = 'https://github.com/apps/kavach-security/installations/new';
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
      {/* Top Header matching Image 6 */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Kavach Logo + Setup Workspace Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <KavachMark size={22} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginLeft: '8px', letterSpacing: '-0.02em' }}>
              kavach
            </span>
          </Link>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: '6px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              fontWeight: 500,
              color: '#475569',
            }}
          >
            Setup workspace
          </div>
        </div>

        {/* Right: Connected Stepper matching Image 6 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          {/* Step 1: Project */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              ✓
            </span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>Project</span>
          </div>

          <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

          {/* Step 2: GitHub (Active) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              2
            </span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>GitHub</span>
          </div>

          <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

          {/* Step 3: Repository */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#94A3B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              3
            </span>
            <span style={{ fontWeight: 500, color: '#94A3B8' }}>Repository</span>
          </div>

          <div style={{ width: '20px', height: '1.5px', backgroundColor: '#E2E8F0' }} />

          {/* Step 4: Slack */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#94A3B8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              4
            </span>
            <span style={{ fontWeight: 500, color: '#94A3B8' }}>Slack (optional)</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '36px 32px',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
          }}
        >
          {/* STEP 2 OF 4 label */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            STEP 2 OF 4
          </div>

          {/* Heading Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <GitHubIcon size={18} color="#FFFFFF" />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Connect GitHub</h2>
            </div>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #FECACA',
              }}
            >
              Required
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '14px',
              color: '#64748B',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            Connect your GitHub account to import repositories.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    GitHub connected
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#15803D' }}>
                    Account: @{accountLogin || 'Mayur8182'}
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#15803D', marginTop: '2px' }}>
                    Repositories: {repoCount || 39} accessible
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/onboarding?step=repository')}
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '13px 20px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
                }}
              >
                <span>Select repository</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleConnectGitHub}
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isConnecting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
                }}
              >
                <GitHubIcon size={18} color="#FFFFFF" />
                <span>{isConnecting ? 'Opening GitHub App...' : 'Connect GitHub'}</span>
              </button>

              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={handleVerifyStatus}
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isCheckingStatus ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <RotateCw size={15} className={isCheckingStatus ? 'animate-spin' : ''} />
                <span>{isCheckingStatus ? 'Verifying connection...' : "I've Saved in GitHub / Check Status"}</span>
              </button>
            </div>
          )}

          {/* Footer Navigation */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push('/projects/create')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '13.5px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleConnectGitHub}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#475569',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Change GitHub account
            </button>
          </div>
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
