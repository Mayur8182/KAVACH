'use client';

/**
 * /forgot-password — Kavach Password Recovery Page
 * Sourced directly from real authentication endpoints.
 * Matches the minimalist, clean aesthetic and typography of the login page.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { KavachMark } from '@/components/common/KavachLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your work email address.');
      toast.error('Email address is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.auth.forgotPassword({ email: email.trim() });
      if (res?.reset_token) {
        setResetToken(res.reset_token);
      }
      const msg = `A secure password reset link has been dispatched to ${email.trim()}.`;
      setSuccess(`${msg} Link is valid for 30 minutes.`);
      toast.success('Password reset link sent', {
        description: `Check ${email.trim()} for your secure verification link.`,
      });
    } catch {
      const fallback = `If an account exists for ${email.trim()}, a secure password reset link has been dispatched.`;
      setSuccess(fallback);
      toast.info('Recovery request processed', {
        description: fallback,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8FAFC',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        color: '#0F172A',
      }}
    >
      <KavachHeader variant="minimal" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
            padding: '36px 32px',
            width: '100%',
            maxWidth: '440px',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '14px',
              }}
            >
              <KavachMark size={26} />
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Account Recovery
            </div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
              }}
            >
              Reset your password
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Enter the email associated with your Kavach account, and we will dispatch a secure reset link.
            </p>
          </div>

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{success}</span>
              </div>

              {resetToken && (
                <Link
                  href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Proceed to Set New Password
                </Link>
              )}

              <Link
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '42px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={15} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '12.5px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label htmlFor="forgot-password-email" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Work Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Mail size={16} />
                  </span>
                  <input
                    id="forgot-password-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="auth-input-focus"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '8px 12px 8px 38px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-btn-focus"
                style={{
                  height: '42px',
                  backgroundColor: loading ? '#93C5FD' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                    color: '#64748B',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <style jsx global>{`
        .auth-input-focus:focus-visible {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }
        .auth-btn-focus:focus-visible {
          outline: 2px solid #2563EB !important;
          outline-offset: 2px !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
