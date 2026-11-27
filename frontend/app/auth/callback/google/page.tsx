'use client';

/**
 * /auth/callback/google — Google OAuth 2.0 Authorization Callback Handler
 * Pixel-Perfect Implementation matching:
 * - Image 4: "Signing in with Google" modal with 2 connected icons, STEP 2 OF 3, 3-step timeline, and password security notice.
 * - Image 5: "Verifying security session (motion)" with 3D wireframe cube and rotating green orbital ring.
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Lock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken, resolveSafeRedirectTarget } from '@/lib/auth/token';
import { trackLogin } from '@/lib/analytics/gtag';
import { SecuritySessionVerification } from '@/components/auth/SecuritySessionVerification';

function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.685-5.17 3.685-9.09z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09C3.26 21.3 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.27 6.61l4 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
      />
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

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<'signing_in' | 'verifying' | 'error'>('signing_in');
  const [stepIndex, setStepIndex] = useState<number>(1); // 0 = confirmed, 1 = securing, 2 = opening
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
      setError('Google authorization declined');
      setErrorDetails(oauthDesc || `Google authorization failed: ${oauthError}`);
      return;
    }

    const resolveNextDestination = (rawNext: string | null): string | null => {
      let current = resolveSafeRedirectTarget(rawNext);
      for (let i = 0; i < 3 && current; i++) {
        try {
          const parsed = new URL(current, window.location.origin);
          if (parsed.pathname === '/auth/callback/google' || parsed.pathname === '/auth/callback/github') {
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
      trackLogin({ method: 'google' });

      const safeNext = resolveNextDestination(searchParams.get('next'));
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

        Promise.all([
          api.onboarding.getState().catch(() => null),
          api.projects.list().catch(() => []),
        ]).then(([onboardingState, projs]: [any, any]) => {
          const hasProject = Array.isArray(projs) && projs.length > 0;
          if (hasProject && typeof window !== 'undefined') {
            localStorage.setItem('secu_active_project_id', projs[0].id);
          }

          const isGithubInstalled = Boolean(onboardingState?.github_installed);

          setTimeout(() => {
            if (safeNext) {
              if (safeNext.includes('/oauth') || safeNext.startsWith('http')) {
                window.location.assign(safeNext);
              } else {
                router.push(safeNext);
              }
            } else if (onboardingState?.onboarding_completed && hasProject) {
              router.push('/overview');
            } else if (!isGithubInstalled) {
              router.push('/onboarding/connect-github');
            } else {
              router.push('/onboarding');
            }
          }, 1200);
        }).catch(() => {
          if (safeNext) {
            window.location.assign(safeNext);
          } else {
            router.push('/onboarding/connect-github');
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
      setErrorDetails('No authorization code was returned from Google.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await api.request<any>('/api/v1/auth/google/callback', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });

        const receivedToken = res?.data?.access_token || res?.access_token || res?.token;
        if (receivedToken) {
          proceedWithToken(receivedToken);
        } else {
          setStage('error');
          setError('Authentication Failed');
          setErrorDetails('Could not obtain session token from Google authorization.');
        }
      } catch (err: any) {
        setStage('error');
        setError('Google Authentication Failed');
        setErrorDetails(err?.message || 'Server error exchanging code with Google.');
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
            {error || 'Google Sign-In Failed'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
            {errorDetails || 'An unexpected error occurred while completing Google sign-in.'}
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

  // Stage 1: Signing in with Google - Image 4 in attachments
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

          {/* Google Logo in white rounded square */}
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <GoogleIcon size={22} />
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
          Signing in with Google
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#64748B',
            lineHeight: 1.5,
            margin: '0 0 28px 0',
          }}
        >
          Almost there. We&apos;re securing your connection before you go in.
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
          {/* Step 1: Google account confirmed */}
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
                Google account confirmed
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Your authorization was accepted.
              </div>
            </div>
          </div>

          {/* Step 2: Securing your session */}
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
                Securing your session
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Setting up an encrypted connection.
              </div>
            </div>
          </div>

          {/* Step 3: Opening your workspace */}
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
                Opening your workspace
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                You&apos;ll land right where you left off.
              </div>
            </div>
          </div>
        </div>

        {/* Security Note Card (Cream/Sand color matching Image 4) */}
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
            Your Google password is never shared with us. Google only tells us that it&apos;s really you.
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
          Trouble signing in?
        </a>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
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
          Connecting to Google...
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
