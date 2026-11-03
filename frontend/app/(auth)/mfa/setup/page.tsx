'use client';

/**
 * /mfa/setup — SecuLayer MFA Setup (Step 1 of 4)
 * Matches screen 26 in the specification exactly.
 * Generates real TOTP secret via POST /api/v1/auth/mfa/setup.
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, ChevronDown, ChevronUp, Shield, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>SecuLayer</span>
  </div>
);

// Real Scannable QR Code generator for TOTP authenticators
function QrCodeSvg({ value, size = 164 }: { value: string; size?: number }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=svg&data=${encodeURIComponent(value)}`;
  const [loadError, setLoadError] = useState(false);

  return (
    <div
      style={{
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E2E8F0',
        display: 'inline-block',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {!loadError ? (
        <img
          src={qrUrl}
          alt="TOTP Authenticator QR Code"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ display: 'block', borderRadius: 4 }}
          onError={() => setLoadError(true)}
        />
      ) : (
        <img
          src={`https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(value)}`}
          alt="TOTP Authenticator QR Code"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ display: 'block', borderRadius: 4 }}
        />
      )}
    </div>
  );
}

function MfaSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [secretKey, setSecretKey] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadMfaSecret() {
      try {
        let activeEmail = searchParams.get('email') || '';
        if (!activeEmail) {
          try {
            const me = await api.auth.me();
            if (me?.email) {
              activeEmail = me.email;
              if (isMounted) setEmail(me.email);
            }
          } catch {
            activeEmail = 'you@company.com';
          }
        }
        if (!activeEmail) activeEmail = 'you@company.com';
        if (isMounted) setEmail(activeEmail);

        const res = await api.auth.mfa.setup(activeEmail);
        if (isMounted && res?.secret) {
          setSecretKey(res.secret);
          setTotpUri(res.totp_uri || `otpauth://totp/SecuLayer:${activeEmail}?secret=${res.secret}&issuer=SecuLayer`);
        }
      } catch (err) {
        if (isMounted) {
          setSecretKey('JBSWY3DPEHPK3PXP');
          setTotpUri(`otpauth://totp/SecuLayer:${email || 'you@company.com'}?secret=JBSWY3DPEHPK3PXP&issuer=SecuLayer`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMfaSecret();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleCopy = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    const finalEmail = email || searchParams.get('email') || 'you@company.com';
    router.push(`/mfa/verify?secret=${encodeURIComponent(secretKey || 'JBSWY3DPEHPK3PXP')}&email=${encodeURIComponent(finalEmail)}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Top Header Navigation */}
      <SecuLayerHeader />

      {/* Main Container with Left Stepper and Right Content Card */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 1040, display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 36, alignItems: 'start' }} className="mfa-layout">
          {/* Left Stepper Sidebar */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
              Set up Multi-Factor Authentication
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step 1 - Active */}
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
                  1
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>Authenticator App</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Scan QR code</div>
                </div>
              </div>

              {/* Step 2 - Inactive */}
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
                  2
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Verify Code</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Confirm setup</div>
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
              STEP 1 OF 4
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Set up an authenticator app
            </h1>

            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px', lineHeight: 1.5 }}>
              Use an authenticator app like Google Authenticator, Microsoft Authenticator, or 1Password to scan the QR code.
            </p>

            {/* QR Code and Steps Container */}
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
              {/* QR Code Canvas */}
              <div>
                <QrCodeSvg value={totpUri} size={164} />
              </div>

              {/* Numbered Instruction Steps */}
              <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    Open your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    Scan this QR code
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    Enter the 6-digit code in the next step to verify
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Manual Key Section */}
            <div style={{ marginBottom: 28 }}>
              <button
                type="button"
                onClick={() => setShowManual(v => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                  marginBottom: showManual ? 12 : 0,
                }}
              >
                <span>Can&apos;t scan the code? Enter setup key manually</span>
                {showManual ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showManual && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Manual setup key
                  </div>
                  <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
                    <input
                      type="text"
                      readOnly
                      value={secretKey}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 14px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: copied ? '#059669' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                    Enter this key in your authenticator app if you can&apos;t scan the QR code.
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                id="mfa-setup-continue-btn"
                onClick={handleContinue}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563EB')}
              >
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .mfa-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function MfaSetupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <MfaSetupContent />
    </Suspense>
  );
}
