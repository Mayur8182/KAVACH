'use client';

/**
 * /mfa/verify — SecuLayer MFA Verify (Step 2 of 4)
 * Matches screen 27 in the specification exactly.
 * Real verification via POST /api/v1/auth/mfa/verify with RFC 6238 TOTP.
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Shield, AlertCircle, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>Kavach Security</span>
  </div>
);

function MfaVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const secretParam = searchParams.get('secret');
  const [email, setEmail] = useState(searchParams.get('email') || '');

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first input on mount & resolve user email if missing
  useEffect(() => {
    inputRefs[0]?.current?.focus();
    if (!email) {
      api.auth.me().then(u => {
        if (u?.email) setEmail(u.email);
      }).catch(() => {});
    }
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric input
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal && val !== '') return;

    const newDigits = [...digits];

    if (cleanVal.length > 1) {
      // Pasted multiple digits
      const chars = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = chars[i] || '';
      }
      setDigits(newDigits);
      const nextIndex = Math.min(chars.length, 5);
      inputRefs[nextIndex]?.current?.focus();
      return;
    }

    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits from your authenticator app.');
      return;
    }

    setVerifying(true);
    setError(null);

    const activeEmail = email || searchParams.get('email') || undefined;
    const activeSecret = secretParam && secretParam !== 'JBSWY3DPEHPK3PXP' ? secretParam : undefined;

    try {
      const res = await api.auth.mfa.verify({
        code,
        secret: activeSecret,
        email: activeEmail,
        trust_device: trustDevice,
      });

      if (res?.verified) {
        setSuccess(true);
        setTimeout(() => {
          const emailQuery = activeEmail ? `?email=${encodeURIComponent(activeEmail)}` : '';
          router.push(`/mfa/backup-codes${emailQuery}`);
        }, 800);
      } else {
        throw new Error(res?.message || 'Verification failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid code. Check your app and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSkipMfa = async () => {
    try {
      await api.onboarding.updateState({
        mfa_skipped: true,
        current_step: 'workspace',
      } as any);
    } catch {
      // Continue anyway
    }
    const finalEmail = email || searchParams.get('email') || '';
    router.push(`/onboarding/organization?email=${encodeURIComponent(finalEmail)}&skipped_mfa=true`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Header Navigation */}
      <SecuLayerHeader />

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 1040, display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 36, alignItems: 'start' }} className="mfa-layout">
          {/* Left Stepper Sidebar */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
              Set up Multi-Factor Authentication
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step 1 - Completed */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Authenticator App</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Scan QR code</div>
                </div>
              </div>

              {/* Step 2 - Active */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>Verify Code</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Confirm setup</div>
                </div>
              </div>

              {/* Step 3 - Inactive */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 0.6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1.5px solid #CBD5E1',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Recovery Codes</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Save for account recovery</div>
                </div>
              </div>

              {/* Step 4 - Inactive */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 0.6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1.5px solid #CBD5E1',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  4
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Complete</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Enable MFA</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              padding: '36px 36px',
            }}
          >
            {/* Step Tag */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              STEP 2 OF 4
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Verify your authenticator app
            </h1>

            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px', lineHeight: 1.5 }}>
              Enter the 6-digit code from your authenticator app to confirm that it is set up correctly.
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Code verified successfully! Advancing...</span>
              </div>
            )}

            <form onSubmit={handleVerify}>
              {/* 6 Digit Input Boxes */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    style={{
                      width: 48,
                      height: 52,
                      textAlign: 'center',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#0F172A',
                      border: digit ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxShadow: digit ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>

              {/* Trust this device checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 28 }}>
                <input
                  type="checkbox"
                  id="trust-device-checkbox"
                  checked={trustDevice}
                  onChange={e => setTrustDevice(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <label htmlFor="trust-device-checkbox" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Trust this device for 30 days</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>You won&apos;t be prompted for a code on this device for 30 days.</div>
                </label>
              </div>

              {/* Primary CTA: Verify and Continue */}
              <button
                type="submit"
                id="verify-mfa-submit-btn"
                disabled={verifying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: verifying ? '#93C5FD' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  marginBottom: 20,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => { if (!verifying) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
                onMouseLeave={e => { if (!verifying) e.currentTarget.style.backgroundColor = '#2563EB'; }}
              >
                {verifying && <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>{verifying ? 'Verifying...' : 'Verify and Continue'}</span>
              </button>

              {/* Divider: OR */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                <span style={{ padding: '0 14px', fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>OR</span>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              </div>

              {/* Secondary CTA: Use Recovery Code */}
              <Link
                href={`/mfa/recovery${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#334155',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 28,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <KeyRound size={15} color="#64748B" />
                <span>Use a recovery code instead</span>
              </Link>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button
                  type="button"
                  id="mfa-verify-skip-btn"
                  onClick={handleSkipMfa}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 13,
                    color: '#64748B',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                >
                  Skip MFA setup for now — Set up later in Settings →
                </button>
              </div>
            </form>

            {/* Security Note Callout */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <Shield size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                  Keep your account secure
                </div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                  Never share your MFA code with anyone. Kavach Security will never ask for your code outside of this login flow.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .mfa-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <MfaVerifyContent />
    </Suspense>
  );
}
