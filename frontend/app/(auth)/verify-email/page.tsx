'use client';

/**
 * /verify-email — Email Verification Pending Page
 * Shows after signup. Calls POST /api/v1/auth/resend-verification to resend.
 * Queries GET /api/v1/auth/verification-status to check verification status.
 * Directs forward to /mfa/setup once email is verified.
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || 'you@company.com';

  const [resendLoading, setResendLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; link?: string } | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Automatic periodic check (every 4 seconds) to auto-advance when user clicks email link
  useEffect(() => {
    if (verified) return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await api.auth.checkEmailStatus(emailParam);
        if (cancelled) return;
        if (res?.verified) {
          setVerified(true);
          setResendMsg({
            type: 'success',
            text: 'Email verified successfully in database. Advancing to MFA Setup...',
          });
          setTimeout(() => {
            router.push(`/mfa/setup?email=${encodeURIComponent(emailParam)}`);
          }, 1200);
        }
      } catch {
        // Silent poll
      }
    };

    const interval = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [emailParam, verified, router]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg(null);
    setStatusNote(null);
    try {
      const res = await api.auth.resendVerification({ email: emailParam });
      setResendMsg({
        type: 'success',
        text: res?.message || 'Verification email resent. Please check your inbox or click the link below.',
        link: (res as any)?.verification_url,
      });
      setCooldown(60);
    } catch (err: any) {
      setResendMsg({
        type: 'error',
        text: err?.message || 'Failed to resend verification email. Please try again shortly.',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusNote(null);
    try {
      const res = await api.auth.checkEmailStatus(emailParam);
      if (res?.verified) {
        setVerified(true);
        setResendMsg({
          type: 'success',
          text: 'Email verified successfully! Advancing to MFA Setup...',
        });
        setTimeout(() => {
          router.push(`/mfa/setup?email=${encodeURIComponent(emailParam)}`);
        }, 1000);
      } else {
        setStatusNote('Verification link has not been confirmed yet. Please open the email link and try again.');
      }
    } catch (err: any) {
      setStatusNote('Unable to reach verification service. Please try again in a few moments.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDevInstantVerify = async () => {
    setDevLoading(true);
    setResendMsg(null);
    setStatusNote(null);
    try {
      const res = await api.auth.devInstantVerify(emailParam);
      setVerified(true);
      setResendMsg({
        type: 'success',
        text: 'Development instant verification succeeded. Advancing to MFA Setup...',
      });
      setTimeout(() => {
        router.push(`/mfa/setup?email=${encodeURIComponent(emailParam)}`);
      }, 900);
    } catch (err: any) {
      setResendMsg({ type: 'error', text: err?.message || 'Failed to verify account.' });
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Unified Global Header */}
      <SecuLayerHeader />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 880, display: 'flex', gap: 48, alignItems: 'flex-start' }}>

          {/* Left panel — Active Verification Stage */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '36px 32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Stage Badge & Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mail size={26} color="#2563EB" />
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  backgroundColor: verified ? '#ECFDF5' : '#EFF6FF',
                  color: verified ? '#059669' : '#2563EB',
                  border: `1px solid ${verified ? '#A7F3D0' : '#BFDBFE'}`,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: verified ? '#10B981' : '#3B82F6',
                    animation: verified ? 'none' : 'pulse 1.8s infinite',
                  }}
                />
                {verified ? 'Email Verified' : 'Step 1 of 5: Verification Pending'}
              </span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Verify your email address
            </h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 6px', lineHeight: 1.5 }}>
              We&apos;ve dispatched a secure verification link to:
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                fontSize: 15,
                fontWeight: 700,
                color: '#1E293B',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                marginBottom: 20,
              }}
            >
              {emailParam}
            </div>

            {/* Step-by-Step Instructions */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '16px 18px',
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                Next steps to complete onboarding:
              </h3>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                  <strong>Open your inbox:</strong> Check for the confirmation email from SecuLayer.
                </li>
                <li style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                  <strong>Click the link:</strong> Clicking verifies your address instantly in the backend.
                </li>
                <li style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                  <strong>Automatic advance:</strong> This screen automatically polls the server and will unlock Step 2 (MFA Setup) once confirmed.
                </li>
              </ol>
            </div>

            {/* Notification & Status Feedback */}
            {resendMsg && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '12px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  backgroundColor: resendMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${resendMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                  color: resendMsg.type === 'success' ? '#15803D' : '#B91C1C',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {resendMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span style={{ fontWeight: 600 }}>{resendMsg.text}</span>
                </div>
                {resendMsg.link && (
                  <div style={{ marginTop: 4, paddingLeft: 24 }}>
                    <a
                      href={resendMsg.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#2563EB',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        fontSize: 12,
                      }}
                    >
                      <span>Click to open verification link in new tab</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {statusNote && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: 13,
                }}
              >
                <Clock size={16} color="#D97706" />
                <span>{statusNote}</span>
              </div>
            )}

            {/* Primary & Secondary Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {/* Primary Action: Check Verification Status */}
              <button
                type="button"
                id="check-verification-status-btn"
                onClick={handleCheckStatus}
                disabled={checkingStatus || verified}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 8,
                  backgroundColor: verified ? '#16A34A' : '#2563EB',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: checkingStatus || verified ? 'default' : 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <RefreshCw
                  size={15}
                  style={{ animation: checkingStatus ? 'spin 1s linear infinite' : 'none' }}
                />
                <span>
                  {verified
                    ? 'Verified! Redirecting...'
                    : checkingStatus
                    ? 'Checking Status...'
                    : 'Check Verification Status'}
                </span>
                {!verified && !checkingStatus && <ArrowRight size={15} />}
              </button>

              {/* Secondary Action: Resend Verification with cooldown */}
              <button
                type="button"
                id="resend-verification"
                onClick={handleResend}
                disabled={resendLoading || cooldown > 0 || verified}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: cooldown > 0 || verified ? '#9CA3AF' : '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: resendLoading || cooldown > 0 || verified ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <RefreshCw
                  size={14}
                  style={{ animation: resendLoading ? 'spin 1s linear infinite' : 'none' }}
                />
                <span>
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : resendLoading
                    ? 'Sending email...'
                    : 'Resend Verification'}
                </span>
              </button>
            </div>

            {/* Helper links & Dev fast-track */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Link
                href="/signup"
                style={{
                  fontSize: 13,
                  color: '#2563EB',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                &larr; Wrong email? Change email address
              </Link>

              {/* Developer Bypass Button for Automated Testing */}
              <button
                type="button"
                id="dev-instant-verify-btn"
                onClick={handleDevInstantVerify}
                disabled={devLoading || verified}
                title="Bypass SMTP delivery for rapid local testing"
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  padding: '4px 8px',
                  borderRadius: 6,
                  cursor: devLoading || verified ? 'default' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {devLoading ? 'Testing...' : '⚡ Dev Mode: Quick Verify'}
              </button>
            </div>
          </div>

          {/* Right panel — Security Pipeline Navigator (Clear Locking & Order) */}
          <div style={{ width: 330, flexShrink: 0 }}>
            <div
              style={{
                borderRadius: 16,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                padding: '24px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <ShieldCheck size={20} color="#2563EB" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  SecuLayer Security Pipeline
                </h3>
              </div>

              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
                Enterprise security policy requires step-by-step identity verification before granting organization workspace access.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Step 1: Email Verification (ACTIVE) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #2563EB',
                    backgroundColor: '#EFF6FF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      1
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
                        Email Verification
                      </div>
                      <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 500 }}>
                        {verified ? 'Completed' : 'Current Step (In Progress)'}
                      </div>
                    </div>
                  </div>
                  {verified ? (
                    <CheckCircle size={16} color="#16A34A" />
                  ) : (
                    <Clock size={16} color="#2563EB" />
                  )}
                </div>

                {/* Step 2: MFA Setup (LOCKED) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    opacity: verified ? 1 : 0.7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#94A3B8',
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      2
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        MFA Setup
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        Authenticator App
                      </div>
                    </div>
                  </div>
                  <Lock size={14} color="#94A3B8" />
                </div>

                {/* Step 3: MFA Verify (LOCKED) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    opacity: 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#CBD5E1',
                        color: '#475569',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      3
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                        MFA Verify
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        Confirm TOTP token
                      </div>
                    </div>
                  </div>
                  <Lock size={14} color="#94A3B8" />
                </div>

                {/* Step 4: Backup Codes (LOCKED) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    opacity: 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#CBD5E1',
                        color: '#475569',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      4
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                        Backup Codes
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        Emergency recovery keys
                      </div>
                    </div>
                  </div>
                  <Lock size={14} color="#94A3B8" />
                </div>

                {/* Step 5: Organization Onboarding (LOCKED) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    opacity: 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#CBD5E1',
                        color: '#0F172A',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 6px',
                        borderRadius: 6,
                      }}
                    >
                      Org
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                        Create Organization
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        Workspace setup
                      </div>
                    </div>
                  </div>
                  <Lock size={14} color="#94A3B8" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
