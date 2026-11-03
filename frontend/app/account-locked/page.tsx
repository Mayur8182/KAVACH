'use client';

/**
 * /account-locked — Kavach Security Lockout & Verification Center
 * Triggered after 5 consecutive failed login attempts.
 * Enforces cryptographic 6-digit OTP verification via email before account unlock.
 */

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachLogo } from '@/components/common/KavachLogo';

function AccountLockedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || 'you@company.com';

  const [remainingMinutes, setRemainingMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // OTP State Machine: 'INIT' -> 'OTP_SENT' -> 'UNLOCKED'
  const [otpStep, setOtpStep] = useState<'INIT' | 'OTP_SENT' | 'UNLOCKED'>('INIT');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Check initial lockout state & run countdown
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.auth.getAccountStatus(emailParam);
        if (res && !res.is_locked) {
          setOtpStep('UNLOCKED');
        }
      } catch {
        // preserve active timer
      }
    }
    checkStatus();

    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s > 0) return s - 1;
        setRemainingMinutes((m) => {
          if (m <= 0) {
            clearInterval(interval);
            setOtpStep('UNLOCKED');
            return 0;
          }
          return m - 1;
        });
        return 59;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [emailParam]);

  // Focus OTP input when step changes to OTP_SENT
  useEffect(() => {
    if (otpStep === 'OTP_SENT' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

  // 1. Request 6-digit Unlock OTP
  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    setStatusMsg(null);
    try {
      await api.auth.requestUnlockOtp({ email: emailParam });
      setOtpStep('OTP_SENT');
      setStatusMsg({
        type: 'success',
        text: `A 6-digit verification code has been dispatched to ${emailParam}. Please check your inbox.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to dispatch verification code. Please check server connectivity.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Verify OTP & Unlock Account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length < 6) {
      setStatusMsg({
        type: 'error',
        text: 'Please enter the complete 6-digit verification code.',
      });
      return;
    }

    setIsVerifyingOtp(true);
    setStatusMsg(null);
    try {
      const res = await api.auth.unlockAccount({
        email: emailParam,
        otp: cleanOtp,
      });
      if (res?.status === 'success' || res?.verified) {
        setOtpStep('UNLOCKED');
        setStatusMsg({
          type: 'success',
          text: 'Security verification successful! Account lockout has been lifted.',
        });
      } else {
        throw new Error(res?.message || 'Verification failed. Please retry.');
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Invalid or expired verification code. Please request a new code.',
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        padding: '32px 20px',
        fontFamily: 'Inter, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '16px',
          padding: '40px 36px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Kavach Brand Logo with 3D Isometric Cube */}
        <div style={{ marginBottom: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <KavachLogo size={32} textSize={21} color="#09090B" />
          </Link>
        </div>

        {/* Status Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: otpStep === 'UNLOCKED' ? '#F0FDF4' : '#FEF2F2',
            color: otpStep === 'UNLOCKED' ? '#16A34A' : '#DC2626',
            border: otpStep === 'UNLOCKED' ? '1px solid #BBF7D0' : '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          {otpStep === 'UNLOCKED' ? (
            <ShieldCheck size={30} />
          ) : (
            <Lock size={28} />
          )}
        </div>

        {/* Heading & Subtitle */}
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#09090B',
            margin: '0 0 8px 0',
            letterSpacing: '-0.025em',
          }}
        >
          {otpStep === 'UNLOCKED'
            ? 'Account Security Restored'
            : otpStep === 'OTP_SENT'
            ? 'Enter Security Unlock Code'
            : 'Account Temporarily Locked'}
        </h1>

        <p
          style={{
            fontSize: '13.5px',
            color: '#71717A',
            margin: '0 0 24px 0',
            lineHeight: 1.55,
            maxWidth: '380px',
          }}
        >
          {otpStep === 'UNLOCKED'
            ? 'Your account has been cleared for access. You may now proceed to sign in with your verified credentials.'
            : otpStep === 'OTP_SENT'
            ? `We dispatched a 6-digit one-time code to ${emailParam}. Please enter it below to verify your identity.`
            : `Access to ${emailParam} was paused following multiple consecutive unsuccessful authentication attempts.`}
        </p>

        {/* Feedback / Status Alert Box */}
        {statusMsg && (
          <div
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: statusMsg.type === 'success' ? '#F0FDF4' : statusMsg.type === 'info' ? '#F4F4F5' : '#FEF2F2',
              border: statusMsg.type === 'success' ? '1px solid #BBF7D0' : statusMsg.type === 'info' ? '1px solid #E4E4E7' : '1px solid #FECACA',
              color: statusMsg.type === 'success' ? '#15803D' : statusMsg.type === 'info' ? '#18181B' : '#B91C1C',
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1, lineHeight: 1.45 }}>{statusMsg.text}</div>
          </div>
        )}

        {/* Lockout Countdown Timer (When locked and not verified) */}
        {otpStep !== 'UNLOCKED' && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#71717A', letterSpacing: '0.04em' }}>
                Lockout Cooldown Timer
              </div>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>
                Auto-resets after expiry
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '22px',
                fontWeight: 800,
                color: '#DC2626',
                fontFamily: 'Consolas, "Roboto Mono", monospace',
              }}
            >
              <Clock size={16} color="#DC2626" />
              <span>
                {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: INITIAL STATE — Request Unlock OTP */}
        {otpStep === 'INIT' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={isSendingOtp}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#09090B',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSendingOtp ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSendingOtp) e.currentTarget.style.backgroundColor = '#27272A';
              }}
              onMouseLeave={(e) => {
                if (!isSendingOtp) e.currentTarget.style.backgroundColor = '#09090B';
              }}
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sending Unlock Code...</span>
                </>
              ) : (
                <>
                  <Mail size={16} />
                  <span>Send Security Unlock Code (OTP)</span>
                </>
              )}
            </button>

            <Link
              href={`/login?email=${encodeURIComponent(emailParam)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '11px',
                backgroundColor: '#FFFFFF',
                color: '#3F3F46',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <span>Back to Login</span>
            </Link>
          </div>
        )}

        {/* STEP 2: OTP SENT — Enter 6-Digit Code & Verify */}
        {otpStep === 'OTP_SENT' && (
          <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label
                htmlFor="otp-input"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#3F3F46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                }}
              >
                6-Digit Security Code
              </label>
              <input
                ref={otpInputRef}
                id="otp-input"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FAFAFA',
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  fontFamily: 'Consolas, monospace',
                  color: '#09090B',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || otpCode.length < 6}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: otpCode.length < 6 ? '#71717A' : '#09090B',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isVerifyingOtp || otpCode.length < 6 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (otpCode.length === 6 && !isVerifyingOtp) e.currentTarget.style.backgroundColor = '#27272A';
              }}
              onMouseLeave={(e) => {
                if (otpCode.length === 6 && !isVerifyingOtp) e.currentTarget.style.backgroundColor = '#09090B';
              }}
            >
              {isVerifyingOtp ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Verify Code &amp; Unlock Account</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isSendingOtp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717A',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => setOtpStep('INIT')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717A',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: UNLOCKED STATE */}
        {otpStep === 'UNLOCKED' && (
          <div style={{ width: '100%' }}>
            <Link
              href={`/login?email=${encodeURIComponent(emailParam)}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#09090B',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                boxSizing: 'border-box',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
            >
              <span>Proceed to Sign In</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Footer Support */}
        <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #F4F4F5', fontSize: '12px', color: '#71717A' }}>
          Need administrator assistance?{' '}
          <Link href="/contact" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'none' }}>
            Contact Security Team
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AccountLockedPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>
          Loading Security Lock Status...
        </div>
      }
    >
      <AccountLockedContent />
    </Suspense>
  );
}
