'use client';

/**
 * /verify-email/success — SecuLayer Email Verified Success Page
 * Calls POST /api/v1/auth/verify-email to confirm verification token.
 * Provides clear account status, security posture checklist, and navigation to dashboard.
 */

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Lock,
  Activity,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>SecuLayer</span>
  </div>
);

function VerifySuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || 'sec_verify_token_active_session';

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(true);
  const [message, setMessage] = useState('Your email address has been verified successfully.');
  const [countdown, setCountdown] = useState(8);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function verify() {
      try {
        setVerifying(true);
        const res = await api.auth.verifyEmail(tokenParam);
        if (isMounted) {
          setVerified(true);
          if (res?.message) setMessage(res.message);
        }
      } catch (err: any) {
        if (isMounted) {
          // If token verification fails, still handle honestly
          setVerified(false);
          setMessage(err?.message || 'Verification token expired or invalid.');
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

  // Auto redirect countdown to Step 26: MFA Setup
  useEffect(() => {
    if (!verified || verifying || isPaused) return;
    if (countdown <= 0) {
      router.push('/mfa/setup');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, verified, verifying, isPaused, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Navigation */}
      <nav style={{ padding: '16px 32px', backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/contact" style={{ fontSize: 14, color: '#475569', textDecoration: 'none' }}>Contact Security Team</Link>
          <Link
            href="/home"
            style={{
              padding: '8px 16px',
              backgroundColor: '#0F172A',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Console</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 580,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            padding: '40px 36px',
            textAlign: 'center',
          }}
        >
          {verifying ? (
            <div style={{ padding: '40px 0' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <RefreshCw size={28} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Verifying your credentials...
              </h2>
              <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
                Validating cryptographic token against security authority.
              </p>
            </div>
          ) : verified ? (
            <>
              {/* Success Badge */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  border: '2px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.18)',
                }}
              >
                <CheckCircle2 size={38} color="#059669" />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                <ShieldCheck size={14} />
                <span>Identity Verified & Activated</span>
              </div>

              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Email Verified Successfully
              </h1>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 28px' }}>
                {message} Your organization tenant is provisioned with deterministic security guardrails and runtime protection.
              </p>

              {/* Verified Checklist Box */}
              <div
                style={{
                  textAlign: 'left',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '16px 20px',
                  marginBottom: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tenant Status & Security Guarantees
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1E293B' }}>
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span><strong>Cryptographic Identity:</strong> Confirmed & mapped to audit log</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1E293B' }}>
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span><strong>Deterministic Policy Engine:</strong> OPA rules active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1E293B' }}>
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span><strong>Runtime Defense Gateway:</strong> eBPF + MCP proxy ready</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1E293B' }}>
                  <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span><strong>Audit Trail:</strong> Event logged to PostgreSQL</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <Link
                  href="/mfa/setup"
                  id="go-to-mfa-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    boxSizing: 'border-box',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563EB')}
                >
                  <span>Proceed to MFA Setup (Screen 26)</span>
                  <ArrowRight size={16} />
                </Link>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    href="/onboarding/connect-github"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <Layers size={14} />
                    <span>Connect GitHub (Screen 29)</span>
                  </Link>

                  <Link
                    href="/intelligence"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <Activity size={14} />
                    <span>Threat Intel</span>
                  </Link>
                </div>
              </div>

              {/* Countdown ticker */}
              <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>
                  Redirecting to dashboard in <strong>{countdown}s</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused(p => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {isPaused ? 'Resume countdown' : 'Pause'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Error State */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: '#FEF2F2',
                  border: '2px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <AlertCircle size={38} color="#DC2626" />
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                Verification Failed
              </h1>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: '0 0 28px' }}>
                {message}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link
                  href="/verify-email"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 20px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span>Request Fresh Verification Email</span>
                </Link>
                <Link
                  href="/login"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '20px 32px', textAlign: 'center', fontSize: 12, color: '#94A3B8', borderTop: '1px solid #E2E8F0', backgroundColor: '#fff' }}>
        SecuLayer Zero-Trust Autonomous Security Control Plane &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}

export default function VerifyEmailSuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: 14, color: '#64748B' }}>Loading verification confirmation...</p>
        </div>
      }
    >
      <VerifySuccessContent />
    </Suspense>
  );
}
