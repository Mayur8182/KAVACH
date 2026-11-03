'use client';

/**
 * /verify-email/expired — SecuLayer Verification Link Expired Page
 * Matches screen 25 in the specification exactly.
 * Real resend verification call via POST /api/v1/auth/resend-verification.
 */

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, AlertCircle, Shield, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
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

function VerifyEmailExpiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || 'you@company.com';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    setResending(true);
    setStatusMsg(null);
    try {
      const res = await api.auth.resendVerification({ email: email.trim() });
      setStatusMsg({
        type: 'success',
        text: res?.message || `A fresh verification email has been dispatched to ${email}.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Unable to dispatch verification email. Please try again.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Top Header Navigation */}
      <SecuLayerHeader />

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            padding: '40px 36px',
            textAlign: 'center',
          }}
        >
          {/* Red Exclamation Warning Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ color: '#EF4444', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>!</span>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Verification link expired
          </h1>

          {/* Description */}
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
            The verification link you used has expired for security reasons. This link is valid for a limited time. Please request a new verification link to continue.
          </p>

          {/* Email Address Panel */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <Mail size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Email address</div>
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      fontSize: 13,
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      outline: 'none',
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingEmail(e => !e)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                flexShrink: 0,
              }}
            >
              {isEditingEmail ? 'Done' : 'Change Email'}
            </button>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 16,
                backgroundColor: statusMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${statusMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                color: statusMsg.type === 'success' ? '#15803D' : '#B91C1C',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Primary CTA: Resend */}
          <button
            type="button"
            id="resend-expired-btn"
            onClick={handleResend}
            disabled={resending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '11px 20px',
              backgroundColor: resending ? '#93C5FD' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: resending ? 'not-allowed' : 'pointer',
              marginBottom: 12,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => { if (!resending) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
            onMouseLeave={e => { if (!resending) e.currentTarget.style.backgroundColor = '#2563EB'; }}
          >
            {resending && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
          </button>

          {/* Secondary CTA: Use a Different Email */}
          <Link
            href="/signup"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              textDecoration: 'none',
              boxSizing: 'border-box',
              marginBottom: 24,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            Use a Different Email
          </Link>

          {/* Next Step Shortcut */}
          <Link
            href={`/mfa/setup?email=${encodeURIComponent(email)}`}
            id="proceed-to-mfa-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '11px 20px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxSizing: 'border-box',
              marginBottom: 24,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E293B')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0F172A')}
          >
            <span>Next Step: Set up MFA (Screen 26)</span>
            <ArrowRight size={15} />
          </Link>

          {/* Info Callout */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              textAlign: 'left',
              alignItems: 'flex-start',
            }}
          >
            <Shield size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                Why does this happen?
              </div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                Verification links expire after a certain period to keep your account secure. If you didn&apos;t request this, you can safely ignore it.
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
      `}</style>
    </div>
  );
}

export default function VerifyEmailExpiredPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 14, color: '#64748B' }}>Loading...</p>
        </div>
      }
    >
      <VerifyEmailExpiredContent />
    </Suspense>
  );
}
