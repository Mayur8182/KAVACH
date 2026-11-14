'use client';

/**
 * /verify-email — Kavach Minimal Direct Email Verification
 * Clean, lightweight, enterprise authentication screen:
 * - Direct confirmation & instant access to Project Setup (/onboarding)
 * - Zero multi-step onboarding wizard or forced MFA steps
 * - Real backend token verification & live status checks
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { KavachLogo } from '@/components/common/KavachLogo';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email');
  const tokenParam = searchParams?.get('token');

  const [email, setEmail] = useState<string>(emailParam || 'mkbharvad7174@gmail.com');
  const [copied, setCopied] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendMsg, setResendMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // If email param changes or is empty, try to resolve from auth profile
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    } else {
      api.auth
        .me()
        .then((u) => {
          if (u?.email) setEmail(u.email);
        })
        .catch(() => {});
    }
  }, [emailParam]);

  // If token is present in query parameters (e.g., clicked from email), verify immediately
  useEffect(() => {
    if (!tokenParam) return;
    let isCancelled = false;

    api.auth
      .verifyEmail(tokenParam)
      .then((res) => {
        if (isCancelled) return;
        if (res?.verified) {
          setVerified(true);
          toast.success('Email verified successfully!', {
            description: 'Proceeding directly to Kavach Project Setup...',
          });
          setTimeout(() => {
            router.push('/onboarding');
          }, 800);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        toast.error('Verification failed', {
          description: err?.message || 'Invalid or expired verification token.',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [tokenParam, router]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCopyEmail = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success('Email address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = async () => {
    setCheckingStatus(true);
    try {
      await api.auth.verifyEmailDirect({ email }).catch(() => null);
      toast.success('Proceeding to project workspace setup');
      router.push('/onboarding');
    } catch {
      router.push('/onboarding');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!email) return;
    setCheckingStatus(true);
    setResendMsg(null);
    try {
      const res = await api.auth.checkEmailStatus(email);
      if (res?.verified) {
        setVerified(true);
        toast.success('Email verified successfully!', {
          description: 'Proceeding directly to Kavach Project Setup...',
        });
        setTimeout(() => {
          router.push('/onboarding');
        }, 600);
      } else {
        toast.info('Verification link pending', {
          description: 'Please check your email inbox or click Continue to proceed.',
        });
      }
    } catch (err: any) {
      toast.error('Status check error', {
        description: err?.message || 'Unable to check verification status. Please retry.',
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResendLoading(true);
    setResendMsg(null);
    try {
      const res = await api.auth.resendVerification({ email });
      setResendMsg({
        type: 'success',
        text: res?.message || `A fresh verification link has been dispatched to ${email}.`,
      });
      setCooldown(60);
      toast.success('Verification link dispatched', {
        description: `Check your inbox at ${email}`,
      });
    } catch (err: any) {
      setResendMsg({
        type: 'error',
        text: err?.message || 'Failed to resend verification email. Please try again shortly.',
      });
      toast.error('Resend failed', {
        description: err?.message || 'Failed to dispatch email.',
      });
    } finally {
      setResendLoading(false);
    }
  };

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
      {/* Minimal Top Brand Bar */}
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

      {/* Main Content Area */}
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
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
              padding: '36px 32px',
            }}
          >
            {/* Title & Description */}
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Verify your email address
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.55 }}>
              We&apos;ve sent a secure verification link to your email. Click the link to activate your workspace or proceed below.
            </p>

            {/* Email Address Display Pill Box with Copy */}
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <Mail size={15} color="#64748B" />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                  {email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  padding: '2px 6px',
                }}
                title="Copy email address"
              >
                {copied ? (
                  <>
                    <Check size={13} color="#10B981" />
                    <span style={{ color: '#10B981', fontWeight: 600 }}>Copied</span>
                  </>
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>

            {/* Resend Notice / Link Feedback */}
            {resendMsg && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${resendMsg.type === 'success' ? '#A7F3D0' : '#FECDD3'}`,
                  backgroundColor: resendMsg.type === 'success' ? '#ECFDF5' : '#FFF1F2',
                  color: resendMsg.type === 'success' ? '#065F46' : '#9F1239',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  {resendMsg.type === 'success' ? (
                    <CheckCircle2 size={15} color="#059669" />
                  ) : (
                    <AlertCircle size={15} color="#E11D48" />
                  )}
                  <span>{resendMsg.text}</span>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleContinue}
                disabled={checkingStatus}
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: checkingStatus ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {checkingStatus ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Continuing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Project Setup</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus || verified}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    padding: '9px 14px',
                    borderRadius: '8px',
                    cursor: checkingStatus ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={checkingStatus ? 'animate-spin' : ''} />
                  <span>{checkingStatus ? 'Checking...' : 'Check Status'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || cooldown > 0 || verified}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    padding: '9px 14px',
                    borderRadius: '8px',
                    cursor: resendLoading || cooldown > 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={13} className={resendLoading ? 'animate-pulse' : ''} />
                  <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Email'}</span>
                </button>
              </div>
            </div>

            {/* Footer Row */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              <div>
                <span>Wrong account? </span>
                <Link href="/login" style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </div>
              <Link href="/onboarding" style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                Skip setup →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#64748B' }}>
          Loading verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
