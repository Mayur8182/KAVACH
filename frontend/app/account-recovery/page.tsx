'use client';

/**
 * /account-recovery — Self-Service Account Recovery
 * Multi-step identity recovery flow when locked out or authenticators are lost.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/client';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>Kavach</span>
  </div>
);

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [reason, setReason] = useState('Lost Authenticator Device');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your verified email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.auth.requestAccountRecovery({ email: email.trim(), reason });
      setStep('verify');
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch recovery challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      setError('Please enter your emergency recovery code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.auth.verifyAccountRecovery({
        email: email.trim(),
        recovery_code: recoveryCode.trim(),
      });
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Invalid or already used recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            Account Recovery
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            {step === 'request' && 'Identify your account to initiate emergency credential verification.'}
            {step === 'verify' && `Submit the one-time emergency recovery code for ${email}.`}
            {step === 'success' && 'Your account security lock has been cleared and access restored.'}
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Account Email Address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Reason for Recovery Request
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Lost Authenticator Device">Lost Authenticator Device / Phone</option>
                <option value="Brute-force Account Lockout">Account Locked from Repeated Logins</option>
                <option value="Compromised Credentials">Suspicious Activity / Potential Compromise</option>
                <option value="Hardware Security Key Failure">FIDO2 / Hardware Security Key Lost</option>
              </select>
            </div>

            <button
              id="account-recovery-request-button"
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                backgroundColor: loading ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              <span>{loading ? 'Validating Account…' : 'Initiate Recovery Flow'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                One-Time Backup Code
              </label>
              <input
                type="text"
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '15px',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              id="account-recovery-verify-button"
              type="submit"
              disabled={loading}
              style={{
                padding: '11px',
                backgroundColor: loading ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verifying Code…' : 'Verify & Unlock Account'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <CheckCircle2 size={32} color="#10B981" />
              </div>
              <strong>Access Restored Successfully!</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px' }}>Your security lock has been cleared. You can now sign in with your password.</p>
            </div>
            <Link
              href="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '11px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Return to Sign In
            </Link>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/login" style={{ fontSize: '13px', color: '#64748B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={13} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
