'use client';

/**
 * /auth/callback/github — GitHub OAuth 2.0 Authorization Callback Handler
 * Receives authorization code from GitHub, securely exchanges it with backend
 * POST /api/v1/auth/github/callback, persists JWT session token, and routes to workspace.
 *
 * Production Engineering & UI Principles:
 * - 100% real authentication with real error handling
 * - Clean, minimal, modern light-theme design with white card and background
 * - Cohesive typography and smooth animated progress indicator
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken } from '@/lib/auth/token';

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [errorSubtitle, setErrorSubtitle] = useState<string>(
    'The authorization code received from GitHub is invalid or has expired. Please try signing in again.'
  );
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const oauthDesc = searchParams.get('error_description');

    if (oauthError) {
      setError('GitHub authorization declined');
      setErrorSubtitle('The authorization request was declined by GitHub or cancelled.');
      setErrorDetails(oauthDesc || `OAuth error: ${oauthError}`);
      return;
    }

    if (!code) {
      setError('Missing Authorization Code');
      setErrorSubtitle('No authorization code was provided in the GitHub callback redirect.');
      setErrorDetails('No authorization code parameter found in callback URL.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await api.auth.githubCallback({ code, state: state || undefined });
        if (res.access_token) {
          setAuthToken(res.access_token);

          try {
            const ent = await api.entitlements.getMe();
            if (!ent?.onboarding_completed) {
              router.push('/onboarding/products');
            } else {
              router.push('/assistant');
            }
          } catch {
            router.push('/assistant');
          }
        } else {
          throw new Error('Authentication succeeded but no access token was returned.');
        }
      } catch (err: any) {
        console.error('GitHub authentication exchange failed:', err);
        setError('GitHub Authentication Failed');
        let msg = err?.message || 'Authentication exchange failed.';
        if (!msg || msg === 'signal is aborted without reason' || msg.includes('aborted') || msg.includes('timed out') || msg.includes('timeout')) {
          setErrorSubtitle('The connection to GitHub authorization servers timed out. Please click "Retry with GitHub" to reconnect.');
          msg = 'Connection to GitHub authorization servers timed out. Please retry signing in.';
        } else if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('bad_verification_code')) {
          setErrorSubtitle('The authorization code received from GitHub has expired or was already used. Please click "Retry with GitHub" to sign in again.');
        } else {
          setErrorSubtitle('An error occurred while authenticating with GitHub. Please try signing in again.');
        }
        setErrorDetails(msg);
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  const handleRetryGithub = async () => {
    setRetrying(true);
    try {
      const data = await api.auth.getGithubAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fallback
    }
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Ov23likjqoMrdpB35SRt';
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || 'http://localhost:3002/auth/callback/github'
    );
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user,user:email,repo`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8FAFC',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes blueProgressLine {
          0% {
            left: -35%;
            width: 35%;
            opacity: 0.7;
          }
          50% {
            left: 30%;
            width: 50%;
            opacity: 1;
          }
          100% {
            left: 100%;
            width: 35%;
            opacity: 0.7;
          }
        }
      `}</style>

      {/* Main Clean Card (Light / White Theme) */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
          padding: '40px 32px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {!error ? (
          /* Loading State: Clean GitHub icon + Sleek Blue Progress Line */
          <div>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#0F172A',
              }}
            >
              <GithubIcon size={28} />
            </div>

            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: '#0F172A',
                margin: '0 0 8px',
              }}
            >
              Connecting your GitHub account
            </h1>

            <p
              style={{
                fontSize: 13,
                color: '#64748B',
                margin: '0 0 28px',
                lineHeight: 1.5,
              }}
            >
              Verifying credentials and completing authorization...
            </p>

            {/* Blue Progress Line Track */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 280,
                height: 3,
                backgroundColor: '#E2E8F0',
                borderRadius: 9999,
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  borderRadius: 9999,
                  background: 'linear-gradient(90deg, transparent, #2563EB 50%, transparent)',
                  boxShadow: '0 0 8px rgba(37, 99, 235, 0.5)',
                  animation: 'blueProgressLine 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </div>
          </div>
        ) : (
          /* Error State: Clean, Minimal Error Display with Light Alert Box */
          <div>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                color: '#DC2626',
              }}
            >
              <AlertCircle size={26} />
            </div>

            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: '#0F172A',
                margin: '0 0 8px',
              }}
            >
              {error}
            </h1>

            <p
              style={{
                fontSize: 13,
                color: '#64748B',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              {errorSubtitle}
            </p>

            {/* Error Diagnostic Box */}
            {errorDetails && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#991B1B',
                  fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)",
                  marginBottom: 24,
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}
              >
                {errorDetails}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleRetryGithub}
                disabled={retrying}
                style={{
                  width: '100%',
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: retrying ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease',
                  opacity: retrying ? 0.7 : 1,
                }}
                onMouseOver={(e) => {
                  if (!retrying) e.currentTarget.style.backgroundColor = '#1E293B';
                }}
                onMouseOut={(e) => {
                  if (!retrying) e.currentTarget.style.backgroundColor = '#0F172A';
                }}
              >
                <GithubIcon size={16} />
                <span>{retrying ? 'Redirecting to GitHub...' : 'Retry with GitHub'}</span>
              </button>

              <Link
                href="/login"
                style={{
                  width: '100%',
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        )}
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
            width: '100%',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A',
            fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 240,
              height: 3,
              backgroundColor: '#E2E8F0',
              borderRadius: 9999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '40%',
                borderRadius: 9999,
                background: '#2563EB',
                boxShadow: '0 0 8px rgba(37, 99, 235, 0.5)',
              }}
            />
          </div>
        </div>
      }
    >
      <GitHubCallbackContent />
    </Suspense>
  );
}
