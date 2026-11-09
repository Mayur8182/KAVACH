'use client';

/**
 * /verify-email — Kavach Onboarding Step 1: Email Verification
 * Clean, production-grade enterprise design:
 * - Left column: Onboarding stepper (5 steps, vertical connector, active step card highlight)
 * - Right column: Verification card (Step 1 of 5 pill indicator, email box with copy, 3-card instruction grid, action buttons, authentic token input)
 * - Background: Subtle generative wave lines
 * - Real backend persistence with live polling and authentic cryptographic verification.
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  RefreshCw,
  Send,
  Copy,
  Check,
  Link2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email');
  const tokenParam = searchParams?.get('token');

  const [email, setEmail] = useState<string>(emailParam || 'mayur.bharvad@kavachsecurity.me');
  const [copied, setCopied] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendMsg, setResendMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    link?: string;
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
            description: 'Proceeding to MFA Setup...',
          });
          setTimeout(() => {
            router.push(`/mfa/setup?email=${encodeURIComponent(email)}`);
          }, 1000);
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
  }, [tokenParam, email, router]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Automatic background polling every 4 seconds to advance immediately upon verification
  useEffect(() => {
    if (verified || !email) return;
    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const res = await api.auth.checkEmailStatus(email);
        if (isCancelled) return;
        if (res?.verified) {
          setVerified(true);
          toast.success('Email verified successfully', {
            description: 'Advancing to MFA Setup...',
          });
          setTimeout(() => {
            router.push(`/mfa/setup?email=${encodeURIComponent(email)}`);
          }, 1200);
        }
      } catch {
        // Silent periodic background check
      }
    };

    const interval = setInterval(checkStatus, 4000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [email, verified, router]);

  const handleCopyEmail = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success('Email address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
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
          description: 'Advancing to MFA Setup...',
        });
        setTimeout(() => {
          router.push(`/mfa/setup?email=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        toast.info('Verification link not yet confirmed', {
          description: 'Please check your inbox or enter your verification token below.',
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
      const verificationUrl = (res as any)?.verification_url;
      setResendMsg({
        type: 'success',
        text: res?.message || `A fresh verification link has been dispatched to ${email}.`,
        link: verificationUrl,
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

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setVerifyingToken(true);
    try {
      // If user pasted a full URL, extract token parameter
      let cleanToken = manualToken.trim();
      if (cleanToken.includes('token=')) {
        try {
          const url = new URL(cleanToken);
          cleanToken = url.searchParams.get('token') || cleanToken;
        } catch {
          const match = cleanToken.match(/token=([^&]+)/);
          if (match) cleanToken = match[1];
        }
      }

      const res = await api.auth.verifyEmail(cleanToken);
      if (res?.verified) {
        setVerified(true);
        toast.success('Email verified successfully!', {
          description: 'Proceeding to MFA Setup...',
        });
        setTimeout(() => {
          router.push(`/mfa/setup?email=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        toast.error('Invalid token', {
          description: 'The verification token provided could not be validated.',
        });
      }
    } catch (err: any) {
      toast.error('Verification failed', {
        description: err?.message || 'The token is invalid or has expired.',
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-x-hidden text-zinc-900">
      {/* Global Header */}
      <SecuLayerHeader />

      {/* Decorative Bottom-Left Generative Waves */}
      <div className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 sm:w-96 sm:h-96 opacity-40 z-0">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-zinc-300"
        >
          <path
            d="M-40 370 C 60 310, 140 390, 240 330 C 320 280, 360 340, 420 310"
            stroke="currentColor"
            strokeWidth="0.85"
            fill="none"
          />
          <path
            d="M-40 350 C 70 290, 150 370, 250 310 C 330 260, 370 320, 420 290"
            stroke="currentColor"
            strokeWidth="0.85"
            fill="none"
          />
          <path
            d="M-40 330 C 80 270, 160 350, 260 290 C 340 240, 380 300, 420 270"
            stroke="currentColor"
            strokeWidth="0.85"
            fill="none"
          />
          <path
            d="M-40 310 C 90 250, 170 330, 270 270 C 350 220, 390 280, 420 250"
            stroke="currentColor"
            strokeWidth="0.85"
            fill="none"
          />
          <path
            d="M-40 290 C 100 230, 180 310, 280 250 C 360 200, 400 260, 420 230"
            stroke="currentColor"
            strokeWidth="0.85"
            fill="none"
          />
        </svg>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* ========================================================= */}
            {/* LEFT COLUMN: Onboarding Stepper                           */}
            {/* ========================================================= */}
            <div className="lg:col-span-4 flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Onboarding</h2>
              <p className="text-sm text-zinc-500 mt-1">Set up your Kavach workspace</p>

              <div className="mt-8 relative space-y-4">
                {/* Continuous vertical connecting line */}
                <div className="absolute left-[13px] top-[18px] bottom-[24px] w-[1px] bg-zinc-200 z-0" />

                {/* Step 1: Email Verification (ACTIVE) */}
                <div className="relative z-10 bg-[#F4F4F5] rounded-xl p-3.5 -mx-3 flex items-start gap-3.5 transition-all shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 leading-tight">
                      Email Verification
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Verify your email address</p>
                  </div>
                </div>

                {/* Step 2: MFA Setup */}
                <div className="relative z-10 px-0.5 py-2 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white border border-zinc-300 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 leading-tight">MFA Setup</p>
                    <p className="text-xs text-zinc-400 mt-1">Add an authenticator app (optional)</p>
                  </div>
                </div>

                {/* Step 3: MFA Verify */}
                <div className="relative z-10 px-0.5 py-2 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white border border-zinc-300 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 leading-tight">MFA Verify</p>
                    <p className="text-xs text-zinc-400 mt-1">Confirm your TOTP code</p>
                  </div>
                </div>

                {/* Step 4: Backup Codes */}
                <div className="relative z-10 px-0.5 py-2 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white border border-zinc-300 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 leading-tight">Backup Codes</p>
                    <p className="text-xs text-zinc-400 mt-1">Generate recovery keys</p>
                  </div>
                </div>

                {/* Step 5: Create Organization */}
                <div className="relative z-10 px-0.5 py-2 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-white border border-zinc-300 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    5
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 leading-tight">
                      Create Organization
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Set up your team workspace</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: Main Email Verification Card                */}
            {/* ========================================================= */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 sm:p-10 relative">
                {/* Step Indicator Header with 5 Pills */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-zinc-900 tracking-tight">Step 1 of 5</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-900" />
                    <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                    <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                    <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                    <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                  </div>
                </div>

                {/* Title & Description */}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mt-6 leading-tight">
                  Verify your email address
                </h1>
                <p className="text-sm text-zinc-500 mt-2.5 leading-relaxed max-w-xl">
                  We&apos;ve sent a secure verification link to your email. Click the link to continue your
                  organization setup.
                </p>

                {/* Email Address Display Pill Box with Copy */}
                <div className="mt-6 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Mail size={18} className="text-zinc-700 shrink-0" />
                    <span className="text-sm font-medium text-zinc-900 truncate font-mono sm:font-sans">
                      {email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-zinc-500 hover:text-zinc-900 transition p-1.5 rounded-md hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer"
                    title="Copy email address"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                {/* 3-Card Instruction Grid */}
                <div className="mt-6 rounded-xl border border-zinc-200/80 bg-[#FAFAFA] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-zinc-200/70">
                  {/* Instruction 1 */}
                  <div className="pt-2 md:pt-0 md:pr-4">
                    <Mail size={20} className="text-zinc-900 mb-2.5" strokeWidth={1.8} />
                    <h4 className="text-sm font-semibold text-zinc-900">Open your inbox</h4>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      Check for the verification email from Kavach.
                    </p>
                  </div>

                  {/* Instruction 2 */}
                  <div className="pt-4 md:pt-0 md:px-4">
                    <Link2 size={20} className="text-zinc-900 mb-2.5" strokeWidth={1.8} />
                    <h4 className="text-sm font-semibold text-zinc-900">Click the verification link</h4>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      It confirms your email address securely.
                    </p>
                  </div>

                  {/* Instruction 3 */}
                  <div className="pt-4 md:pt-0 md:pl-4">
                    <CheckCircle2 size={20} className="text-zinc-900 mb-2.5" strokeWidth={1.8} />
                    <h4 className="text-sm font-semibold text-zinc-900">Automatic advance</h4>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                      We&apos;ll verify it and take you to MFA Setup (Step 2).
                    </p>
                  </div>
                </div>

                {/* Resend Notice / Link Feedback */}
                {resendMsg && (
                  <div
                    className={`mt-6 p-4 rounded-xl border flex flex-col gap-1.5 ${
                      resendMsg.type === 'success'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50/70 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {resendMsg.type === 'success' ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      )}
                      <span>{resendMsg.text}</span>
                    </div>
                    {resendMsg.link && (
                      <div className="mt-1 pl-6">
                        <a
                          href={resendMsg.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:text-black underline"
                        >
                          <span>Open verification link directly</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  {/* Primary Button */}
                  <button
                    type="button"
                    id="check-verification-status-btn"
                    onClick={handleCheckStatus}
                    disabled={checkingStatus || verified}
                    className="bg-black hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw size={15} className={checkingStatus ? 'animate-spin' : ''} />
                    <span>
                      {verified
                        ? 'Verified! Redirecting...'
                        : checkingStatus
                        ? 'Checking Status...'
                        : 'Check Verification Status'}
                    </span>
                  </button>

                  {/* Secondary Button */}
                  <button
                    type="button"
                    id="resend-verification-btn"
                    onClick={handleResend}
                    disabled={resendLoading || cooldown > 0 || verified}
                    className="bg-white hover:bg-zinc-50 border border-zinc-200 disabled:opacity-60 text-zinc-900 text-sm font-medium px-6 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Send size={15} className={resendLoading ? 'animate-pulse' : ''} />
                    <span>
                      {cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : resendLoading
                        ? 'Sending...'
                        : 'Resend Verification'}
                    </span>
                  </button>
                </div>

                {/* Manual Token Verification Form */}
                <div className="mt-8 pt-6 border-t border-zinc-100">
                  <div className="flex items-center gap-2 mb-2.5">
                    <KeyRound size={15} className="text-zinc-600" />
                    <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      Or verify using link token
                    </span>
                  </div>
                  <form onSubmit={handleManualTokenSubmit} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste your verification token..."
                      className="flex-1 px-3.5 py-2.5 text-sm border border-zinc-200 rounded-xl bg-white font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition"
                    />
                    <button
                      type="submit"
                      disabled={verifyingToken || !manualToken.trim()}
                      className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition cursor-pointer shrink-0"
                    >
                      {verifyingToken ? 'Validating...' : 'Verify Token'}
                    </button>
                  </form>
                </div>

                {/* Footer Row */}
                <div className="mt-8 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs text-zinc-500 gap-4">
                  <div>
                    <span>← Wrong email?</span>{' '}
                    <Link
                      href="/login"
                      className="text-zinc-900 underline font-medium hover:text-black"
                    >
                      Change email address
                    </Link>
                  </div>
                </div>
              </div>
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
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm text-zinc-500">
          Loading verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
