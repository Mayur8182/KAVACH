'use client';

/**
 * /mfa/recovery — SecuLayer MFA Recovery (Step 3 of 4)
 * Matches screen 28 in the specification exactly.
 * Real recovery code redemption via POST /api/v1/auth/mfa/recovery.
 */

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  Lock,
  Mail,
  HelpCircle,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
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

function MfaRecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || 'you@company.com';

  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Email link state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const handleFormatCode = (val: string) => {
    // Auto format XXXX - XXXX
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    if (clean.length > 4) {
      setRecoveryCode(clean.slice(0, 4) + ' - ' + clean.slice(4));
    } else {
      setRecoveryCode(clean);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim() || recoveryCode.replace(/[^a-zA-Z0-9]/g, '').length < 6) {
      setError('Please enter a valid 8-digit recovery code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.mfa.recovery(recoveryCode.trim());
      if (res?.verified) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/onboarding/organization');
        }, 1000);
      } else {
        throw new Error(res?.message || 'Invalid recovery code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid or already used recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecoveryEmail = async () => {
    setSendingEmail(true);
    setEmailNotice(null);
    try {
      const res = await api.auth.mfa.sendRecoveryLink(emailParam);
      setEmailNotice(res?.message || ('A secure recovery link was dispatched to ' + emailParam + '.'));
    } catch (err: any) {
      setEmailNotice(err?.message || 'Failed to dispatch email. Please contact support.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Header Navigation */}
      <SecuLayerHeader />

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 1040, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 36, alignItems: 'start' }} className="mfa-layout">
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

              {/* Step 2 - Completed */}
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Verify Code</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Confirm setup</div>
                </div>
              </div>

              {/* Step 3 - Active (Recovery Codes) */}
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
                  3
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>Recovery Codes</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Account recovery</div>
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

          {/* Right Main Content Area (Two Columns) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              padding: '36px 36px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
              gap: 36,
              alignItems: 'start',
            }}
            className="recovery-split"
          >
            {/* Left Column: Form & Alternative Options */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                RECOVERY
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Use a recovery code
              </h1>

              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
                Enter one of your 8-digit recovery codes to regain access to your account. Each code can only be used once.
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
                  <span>Recovery code accepted. Redirecting to console...</span>
                </div>
              )}

              {emailNotice && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{emailNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="recovery-code-input" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Recovery Code
                  </label>
                  <input
                    id="recovery-code-input"
                    type="text"
                    placeholder="XXXX - XXXX"
                    value={recoveryCode}
                    onChange={e => handleFormatCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 15,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  id="recovery-continue-btn"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '11px 20px',
                    backgroundColor: loading ? '#93C5FD' : '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    marginBottom: 24,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#2563EB'; }}
                >
                  {loading && <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{loading ? 'Validating...' : 'Continue'}</span>
                </button>
              </form>

              {/* Divider: OR */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 20px' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                <span style={{ padding: '0 14px', fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>OR</span>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              </div>

              {/* Other Recovery Options */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                  Other recovery options
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Option 1: Send recovery link */}
                  <button
                    type="button"
                    onClick={handleSendRecoveryEmail}
                    disabled={sendingEmail}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={16} color="#475569" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                        Send recovery link to your email
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        We&apos;ll send a secure link to {emailParam}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </button>

                  {/* Option 2: Contact support */}
                  <Link
                    href="/contact"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      textDecoration: 'none',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <HelpCircle size={16} color="#475569" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                        Contact support
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        Need more help? Contact our support team.
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Help Card */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: 10,
                padding: '24px 22px',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Lock size={18} color="#2563EB" />
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px' }}>
                Can&apos;t access your authenticator app?
              </h3>

              <p style={{ fontSize: 13, color: '#3B82F6', lineHeight: 1.5, margin: '0 0 16px' }}>
                Use a recovery code, or try another recovery method to regain access to your account.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Recovery codes are generated during MFA setup',
                  'Each code can only be used once',
                  'Keep your recovery codes in a safe place',
                  'If you no longer have your codes, contact support',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#1E40AF', lineHeight: 1.4 }}>
                    <Check size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: [
        '@keyframes spin {',
        '  from { transform: rotate(0deg); }',
        '  to { transform: rotate(360deg); }',
        '}',
        '@media (max-width: 860px) {',
        '  .recovery-split {',
        '    grid-template-columns: 1fr !important;',
        '  }',
        '  .mfa-layout {',
        '    grid-template-columns: 1fr !important;',
        '  }',
        '}',
      ].join('\n') }} />
    </div>
  );
}

export default function MfaRecoveryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <MfaRecoveryContent />
    </Suspense>
  );
}
