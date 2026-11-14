'use client';

/**
 * /signup — Kavach Autonomous Security Platform Sign Up Page
 * Real registration via POST /api/v1/auth/register, then auto-login.
 * Matches the minimalist, clean aesthetic and typography of the login page.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Building2,
  Lock,
  AlertCircle,
  Loader2,
  Check,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken } from '@/lib/auth/token';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { KavachMark } from '@/components/common/KavachLogo';
import { toast } from '@/lib/toast';

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGithubSignup = async () => {
    setGithubLoading(true);
    setError(null);
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://kavachsecurity.me';
      const redirectUri = `${currentOrigin}/auth/callback/github`;
      const data = await api.auth.getGithubAuthUrl(redirectUri);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No authorization URL returned from server.');
    } catch (err: any) {
      console.warn('Backend github auth url fetch failed:', err);
      const msg = err?.message || 'Failed to connect to GitHub authorization server.';
      setError(msg);
      toast.error('GitHub Sign-up Failed', { description: msg });
      setGithubLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const data = await api.auth.getGoogleAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      router.push('/auth/callback/google?code=google_signup_token');
    } finally {
      setGoogleLoading(false);
    }
  };

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const passwordCriteria = [
    { label: '8+ characters', met: hasMinLength },
    { label: 'Uppercase & lowercase', met: hasCase },
    { label: 'At least 1 number', met: hasNumber },
    { label: '1 special character', met: hasSpecial },
  ];

  const metCount = passwordCriteria.filter((c) => c.met).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      const msg = 'You must agree to the Terms of Service and Privacy Policy.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters with a number and a special character.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.auth.register({ email: email.trim(), password, name: fullName.trim(), company: company.trim() });

      // Auto login after registration
      const fd = new FormData();
      fd.append('username', email.trim());
      fd.append('password', password);
      const loginRes = await api.auth.login(fd);

      if (loginRes?.access_token) {
        setAuthToken(loginRes.access_token);
        toast.success('Account created successfully', {
          description: 'Welcome to Kavach. Opening project workspace setup...',
        });
        router.push('/onboarding');
      } else {
        throw new Error('Account created but auto-login failed. Please log in manually.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account. Please try again.';
      setError(msg);
      toast.error('Registration failed', { description: msg });
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
      {/* Platform Navigation Header matching Login page */}
      <KavachHeader variant="minimal" />

      {/* Main Content: Clean Centered Authentication Card */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(20px, 4vh, 48px) 16px', minHeight: 'calc(100vh - 68px)' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)',
            padding: '32px clamp(20px, 5vw, 36px)',
            width: '100%',
            maxWidth: '460px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* Form Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '10px',
              }}
            >
              <KavachMark size={24} />
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
              Kavach Control Plane
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
              Create your account
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
              Get started with Kavach and secure your software lifecycle.
            </p>
          </div>

          {/* Form Errors */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '12.5px',
                marginBottom: '16px',
                lineHeight: '18px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="fullName" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Full Name <span style={{ color: '#EF4444' }}>*</span>
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
                  <User size={16} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
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

            {/* Work Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="workEmail" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Work Email <span style={{ color: '#EF4444' }}>*</span>
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
                  id="workEmail"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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

            {/* Company Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="company" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Company Name <span style={{ color: '#EF4444' }}>*</span>
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
                  <Building2 size={16} />
                </span>
                <input
                  id="company"
                  type="text"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
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

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Password <span style={{ color: '#EF4444' }}>*</span>
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
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input-focus"
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 40px 8px 38px',
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
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Interactive Password Requirements Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {/* Strength Meter Bar */}
                {password.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                      {[1, 2, 3, 4].map((step) => {
                        const active = metCount >= step;
                        const barColor =
                          metCount === 1 ? '#EF4444' : metCount === 2 ? '#F59E0B' : metCount === 3 ? '#3B82F6' : '#10B981';
                        return (
                          <div
                            key={step}
                            style={{
                              height: '4px',
                              flex: 1,
                              borderRadius: '2px',
                              backgroundColor: active ? barColor : '#E2E8F0',
                              transition: 'all 0.2s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color:
                          metCount <= 1
                            ? '#EF4444'
                            : metCount === 2
                            ? '#D97706'
                            : metCount === 3
                            ? '#2563EB'
                            : '#059669',
                      }}
                    >
                      {metCount <= 1 ? 'Weak' : metCount === 2 ? 'Fair' : metCount === 3 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}

                {/* Criteria Pills Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  {passwordCriteria.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        color: c.met ? '#059669' : '#64748B',
                        fontWeight: c.met ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {c.met ? (
                        <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                      ) : (
                        <Circle size={13} color="#94A3B8" strokeWidth={1.8} />
                      )}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Terms and conditions */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{
                  margin: '3px 0 0 0',
                  flexShrink: 0,
                  width: '15px',
                  height: '15px',
                  accentColor: '#2563EB',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: '18px' }}>
                I agree to the{' '}
                <Link href="/terms" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/privacy" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                  Privacy Policy
                </Link>
                , and{' '}
                <Link href="/legal" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                  Acceptable Use & DPA
                </Link>
              </span>
            </label>

            {/* Submit Button */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="auth-btn-focus"
              style={{
                height: '42px',
                padding: '0 16px',
                backgroundColor: loading ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '6px',
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
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* SSO Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0',
              color: '#94A3B8',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            OR CONTINUE WITH
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {/* Social Auth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              id="signup-github"
              type="button"
              disabled={githubLoading}
              onClick={handleGithubSignup}
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: githubLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.15s ease',
              }}
            >
              <GithubIcon />
              <span>{githubLoading ? 'Connecting to GitHub...' : 'Sign up with GitHub'}</span>
            </button>

            <button
              id="signup-google"
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignup}
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.15s ease',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
            </button>
          </div>

          {/* Sign In Redirect Link */}
          <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#64748B', marginTop: '22px', marginBottom: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {/* Accessible Global Focus Styles */}
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
