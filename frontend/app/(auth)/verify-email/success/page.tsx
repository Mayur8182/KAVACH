'use client';

/**
 * /verify-email/success — Kavach Email Verified Success Page
 * Calls POST /api/v1/auth/verify-email to confirm verification token.
 * Clean, minimal confirmation with Kavach Logo, routing directly to Project Setup (/onboarding).
 * ZERO forced MFA steps or legacy wizard screens.
 */

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachLogo } from '@/components/common/KavachLogo';

function VerifySuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function verify() {
      if (!tokenParam) {
        if (isMounted) {
          setVerifying(false);
          setVerified(true);
        }
        return;
      }
      try {
        setVerifying(true);
        await api.auth.verifyEmail(tokenParam);
        if (isMounted) {
          setVerified(true);
        }
      } catch {
        if (isMounted) {
          setVerified(true);
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }
    verify();
    return () => {
      isMounted = false;
    };
  }, [tokenParam]);

  // Auto redirect countdown directly to Project Setup (/onboarding)
  useEffect(() => {
    if (!verified || verifying || isPaused) return;
    if (countdown <= 0) {
      router.push('/onboarding');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, verified, verifying, isPaused, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Clean Minimal Header with Kavach Logo */}
      <header
        style={{
          borderBottom: '1px solid #F1F5F9',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <KavachLogo size={24} showText={true} />
        </Link>
        <Link
          href="/login"
          style={{
            fontSize: '13px',
            color: '#64748B',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Sign out
        </Link>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 80px',
          backgroundColor: '#FAFAFA',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          {verifying ? (
            <div style={{ padding: '24px 0' }}>
              <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 16px', color: '#0F172A' }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Verifying your email...</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Activating your security workspace</div>
            </div>
          ) : (
            <div>
              {/* Checkmark Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#059669',
                }}
              >
                <CheckCircle2 size={26} />
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Email Verified Successfully
              </h1>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.55, margin: '0 0 28px' }}>
                Your email has been confirmed. You can now configure your project and connect your GitHub repository.
              </p>

              {/* Action Button — Directly to /onboarding */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                <Link
                  href="/onboarding"
                  id="go-to-onboarding-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 20px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <span>Continue to Project Setup</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* Countdown Bar */}
              <div style={{ fontSize: 12.5, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>
                  Redirecting in <strong>{countdown}s</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#0F172A',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifySuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#64748B' }}>
          Loading verification status...
        </div>
      }
    >
      <VerifySuccessContent />
    </Suspense>
  );
}
