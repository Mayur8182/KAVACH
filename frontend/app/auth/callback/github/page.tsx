'use client';

/**
 * /auth/callback/github — GitHub OAuth 2.0 Authorization Callback Handler
 * Pixel-Perfect Implementation matching:
 * - Image 1: "Connecting to GitHub" modal with 2 connected icons, STEP 2 OF 3, 3-step timeline, and read-only notice.
 * - Image 5: "Verifying security session (motion)" with 3D wireframe cube and rotating green orbital ring.
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Lock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken, resolveSafeRedirectTarget } from '@/lib/auth/token';
import { trackGitHubConnect, trackLogin } from '@/lib/analytics/gtag';
import { SecuritySessionVerification } from '@/components/auth/SecuritySessionVerification';

function GitHubIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function KavachIconMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 7L12 12L21 7L12 2Z"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 7V17L12 22V12L3 7Z"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7V17L12 22V12L21 7Z"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<'connecting' | 'verifying' | 'error'>('connecting');
  const [stepIndex, setStepIndex] = useState<number>(1); // 0 = account verified, 1 = authorizing, 2 = syncing
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const token = searchParams.get('token');
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    const oauthDesc = searchParams.get('error_description');

    if (oauthError) {
      setStage('error');
      setError('GitHub authorization declined');
      setErrorDetails(oauthDesc || `OAuth error: ${oauthError}`);
      return;
    }

    const resolveNextDestination = (rawNext: string | null): string | null => {
      let current = resolveSafeRedirectTarget(rawNext);
      for (let i = 0; i < 3 && current; i++) {
        try {
          const parsed = new URL(current, window.location.origin);
          if (parsed.pathname === '/auth/callback/github' || parsed.pathname === '/auth/callback/google') {
            const inner = resolveSafeRedirectTarget(parsed.searchParams.get('next'));
            if (inner) {
              current = inner;
              continue;
            }
          }
        } catch {
          // keep current
        }
        break;
      }
      return current;
    };

    const proceedWithToken = (jwtToken: string) => {
      setAuthToken(jwtToken);
      trackGitHubConnect({ context: 'oauth_callback' });
      trackLogin({ method: 'github' });

      const safeNext = resolveNextDestination(searchParams.get('next'));

      // Move step to Authorizing -> Syncing
      setStepIndex(2);

      // Transition to Image 5: Verifying Security Session
      setTimeout(() => {
        setStage('verifying');

        if (safeNext && safeNext.includes('/oauth/consent')) {
          setTimeout(() => {
            window.location.assign(safeNext);
          }, 600);
          return;
        }

        // Resolve onboarding & project state
        Promise.all([
          api.onboarding.getState().catch(() => null),
          api.projects.list().catch(() => []),
        ]).then(([onboardingState, projs]: [any, any]) => {
          const hasProject = Array.isArray(projs) && projs.length > 0;
          if (hasProject && typeof window !== 'undefined') {
            localStorage.setItem('secu_active_project_id', projs[0].id);
          }

          setTimeout(() => {
            if (safeNext) {
              if (safeNext.includes('/oauth') || safeNext.startsWith('http')) {
                window.location.assign(safeNext);
              } else {
                router.push(safeNext);
              }
            } else if (onboardingState?.onboarding_completed && hasProject) {
              router.push('/overview');
            } else {
              router.push('/onboarding');
            }
          }, 1200);
        }).catch(() => {
          if (safeNext) {
            window.location.assign(safeNext);
          } else {
            router.push('/onboarding');
          }
        });
      }, 900);
    };

    if (token) {
      proceedWithToken(token);
      return;
    }

    if (!code) {
      setStage('error');
      setError('Missing Authorization Code');
      setErrorDetails('No authorization code was returned from GitHub. Please try signing in again.');
      return;
    }

    // Exchange code with backend API
    const exchangeCode = async () => {
      try {
        const res = await api.request<any>('/api/v1/auth/github/callback', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });

        const receivedToken = res?.data?.access_token || res?.access_token || res?.token;
        if (receivedToken) {
          proceedWithToken(receivedToken);
        } else {
          setStage('error');
          setError('Authentication Failed');
          setErrorDetails('Could not obtain session token from GitHub exchange.');
        }
      } catch (err: any) {
        setStage('error');
        setError('GitHub Authentication Failed');
        setErrorDetails(err?.message || 'Server error exchanging code with GitHub.');
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  // Stage 2: Verifying security session (motion) - Image 5
  if (stage === 'verifying') {
    return (
      <SecuritySessionVerification
        statusMessage="Verifying security session"
        subMessage="Checking workspace permissions"
      />
    );
  }

  // Stage 3: Error State
  if (stage === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={24} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
            {error || 'Connection Failed'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
            {errorDetails || 'An unexpected error occurred while connecting your GitHub account.'}
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  // Stage 1: Connecting to GitHub - Image 1 in attachments
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F5F5F3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '460px',
          maxWidth: '95vw',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '36px 36px 32px',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Top Connected Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          {/* Kavach Logo in black rounded square */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            <KavachIconMark size={22} />
          </div>

          {/* Dotted connecting line with green central dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '100%',
                borderBottom: '2px dotted #CBD5E1',
                position: 'absolute',
              }}
            />
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                position: 'relative',
                zIndex: 1,
              }}
            />
          </div>

          {/* GitHub Logo in white rounded square */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <GitHubIcon size={24} />
          </div>
        </div>

        {/* STEP 2 OF 3 tag */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#16A34A',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          STEP 2 OF 3
        </div>

        {/* Heading & Subtitle */}
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#0F172A',
            margin: '0 0 8px 0',
          }}
        >
          Connecting to GitHub
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#64748B',
            lineHeight: 1.5,
            margin: '0 0 28px 0',
          }}
        >
          Hang tight. This usually takes a few seconds, and you can leave this tab open.
        </p>

        {/* Vertical 3-step checklist */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            textAlign: 'left',
            marginBottom: '24px',
          }}
        >
          {/* Step 1: Account verified */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '1px',
                flexShrink: 0,
              }}
            >
              <Check size={13} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                Account verified
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Your GitHub sign-in checked out.
              </div>
            </div>
          </div>

          {/* Step 2: Authorizing access */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: stepIndex >= 1 ? '#DCFCE7' : '#FFFFFF',
                border: stepIndex >= 1 ? '2px solid #16A34A' : '1.5px solid #CBD5E1',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '1px',
                flexShrink: 0,
              }}
            >
              {stepIndex >= 2 ? (
                <Check size={13} strokeWidth={3} />
              ) : (
                <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                Authorizing access
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Completing the handshake with GitHub.
              </div>
            </div>
          </div>

          {/* Step 3: Syncing your repositories */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: stepIndex >= 2 ? '#DCFCE7' : '#FFFFFF',
                border: stepIndex >= 2 ? '2px solid #16A34A' : '1.5px solid #CBD5E1',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '1px',
                flexShrink: 0,
              }}
            >
              {stepIndex >= 2 && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: stepIndex >= 2 ? '#0F172A' : '#94A3B8' }}>
                Syncing your repositories
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Only the ones you choose to share.
              </div>
            </div>
          </div>
        </div>

        {/* Security Note Card (Cream/Sand color matching Image 1) */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#F7F5F0',
            border: '1px solid #ECE7DD',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
        >
          <Lock size={16} color="#78716C" style={{ marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#57534E', margin: 0 }}>
            Read-only access. We never change your code, and you can revoke access any time from your GitHub settings.
          </p>
        </div>
      </div>

      {/* Bottom Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px', fontSize: '13px' }}>
        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#64748B',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
            fontSize: '13px',
          }}
        >
          Cancel
        </button>
        <span style={{ color: '#CBD5E1' }}>·</span>
        <a
          href="mailto:support@kavachsecurity.me"
          style={{
            color: '#64748B',
            textDecoration: 'underline',
          }}
        >
          Trouble connecting?
        </a>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F5F5F3',
            color: '#64748B',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Loading GitHub session...
        </div>
      }
    >
      <GitHubCallbackContent />
    </Suspense>
  );
}
