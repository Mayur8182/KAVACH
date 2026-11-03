'use client';

/**
 * /reset-password — Set New Password Screen
 * Accepts cryptographic reset token via query param, checks password strength,
 * confirms matching password, and invokes POST /api/v1/auth/reset-password.
 */

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthLabels = ['Weak', 'Moderate', 'Strong', 'Very Strong'];
  const strengthColors = ['#EF4444', '#F59E0B', '#10B981', '#059669'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenParam.trim()) {
      setError('Invalid or missing password reset token. Please request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword({
        token: tokenParam.trim(),
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px', color: '#0F172A' }}>
          Create New Password
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', margin: '0 0 24px' }}>
          Your new password must be secure and meet our enterprise credential policy.
        </p>

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <CheckCircle2 size={32} color="#10B981" />
              </div>
              <strong>Password Updated Successfully!</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px' }}>Your credentials have been securely refreshed. You may now log in.</p>
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
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-password-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reset-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>

              {password.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: strength >= step ? strengthColors[strength - 1] : '#E2E8F0',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strengthColors[strength - 1] || '#64748B', fontWeight: 600 }}>
                    Password Strength: {strengthLabels[strength - 1] || 'Too Weak'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reset-confirm-password-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            <button
              id="reset-password-button"
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
                marginTop: '4px',
              }}
            >
              {loading ? 'Updating Credentials…' : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link href="/login" style={{ fontSize: '13px', color: '#64748B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={13} /> Return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Password Reset...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
