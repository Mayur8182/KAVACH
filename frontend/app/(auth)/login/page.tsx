'use client';

/**
 * /login — Kavach Autonomous Security Platform Sign In Page
 * Real authentication via POST /api/v1/auth/token (OAuth2 password flow)
 * Sourced 100% from real backend authentication with deterministic error handling.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  FileCode2,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken } from '@/lib/auth/token';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { toast } from '@/lib/toast';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();

  // P1: Strictly empty fields by default — never prefill personal data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      setRedirectTarget(p.get('redirect'));
      if (p.get('logged_out') === '1') {
        toast.info('You have been signed out safely', {
          description: 'Enter your credentials to access your workspace again.',
        });
      }
    }
  }, []);

  // Validation helpers
  const validateEmail = (val: string): string | null => {
    if (!val.trim()) return 'Email address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return 'Please enter a valid work email address.';
    return null;
  };

  const validatePassword = (val: string): string | null => {
    if (!val) return 'Password is required.';
    if (val.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailTouched) {
      setEmailError(validateEmail(val));
    }
    if (error) setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordTouched) {
      setPasswordError(validatePassword(val));
    }
    if (error) setError(null);
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  // Explicit demo credentials button for developer/evaluator convenience
  const handleUseDemoAccount = () => {
    setEmail('admin@kavachsecurity.me');
    setPassword('KavachSecure2026!');
    setEmailTouched(true);
    setPasswordTouched(true);
    setEmailError(null);
    setPasswordError(null);
    setError(null);
  };

  const handleGithubLogin = async () => {
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
      toast.error('GitHub Sign-in Failed', { description: msg });
      setGithubLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const data = await api.auth.getGoogleAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError('Google OAuth provider is NOT CONFIGURED on this server.');
    } catch (err: any) {
      setError(err?.message || 'Google OAuth authentication failed. Integration is NOT CONFIGURED.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passErr);

    if (emailErr || passErr) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('username', email.trim());
      fd.append('password', password);
      const res = await api.auth.login(fd);
      if (res?.access_token) {
        setAuthToken(res.access_token);
        toast.success('Signed in successfully', {
          description: 'Welcome back to Kavach Control Plane.',
        });
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const redirect = params?.get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
        } else {
          try {
            const ent = await api.entitlements.getMe();
            if (!ent?.onboarding_completed) {
              router.push('/onboarding');
            } else {
              router.push('/assistant');
            }
          } catch {
            router.push('/assistant');
          }
        }
      } else {
        throw new Error('No access token received from authentication server.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('lock') || err?.status === 423) {
        toast.error('Account temporarily locked', {
          description: 'Too many failed login attempts. Redirecting to account security...',
        });
        router.push(`/account-locked?email=${encodeURIComponent(email)}`);
        return;
      }
      const friendlyError = msg || 'Invalid email address or password. Please verify your credentials and try again.';
      setError(friendlyError);
      toast.error('Authentication failed', { description: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)", color: '#0F172A' }}>
      {/* Platform Navigation Header */}
      <KavachHeader variant="minimal" />

      {/* Main Content: Clean Centered Authentication Card */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
            padding: '40px 36px',
            width: '100%',
            maxWidth: '440px',
            margin: '0 auto',
          }}
        >
          {/* Form Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
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
              Sign in to your account
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
              Enter your enterprise credentials or use SSO to continue.
            </p>
          </div>


            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email Input Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="login-email"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}
                >
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: emailError ? '#DC2626' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Mail size={16} />
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? 'email-error-text' : undefined}
                    disabled={loading}
                    className="auth-input-focus"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '8px 12px 8px 38px',
                      border: `1px solid ${emailError ? '#DC2626' : '#CBD5E1'}`,
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
                {emailError && (
                  <span id="email-error-text" role="alert" style={{ fontSize: '12px', color: '#DC2626', fontWeight: 500 }}>
                    {emailError}
                  </span>
                )}
              </div>

              {/* Password Input Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    htmlFor="login-password"
                    style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#2563EB',
                      textDecoration: 'none',
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: passwordError ? '#DC2626' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Lock size={16} />
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={handlePasswordBlur}
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'password-error-text' : undefined}
                    disabled={loading}
                    className="auth-input-focus"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '8px 40px 8px 38px',
                      border: `1px solid ${passwordError ? '#DC2626' : '#CBD5E1'}`,
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
                {passwordError && (
                  <span id="password-error-text" role="alert" style={{ fontSize: '12px', color: '#DC2626', fontWeight: 500 }}>
                    {passwordError}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                aria-busy={loading}
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* SSO / OAuth Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '22px 0',
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

            {/* OAuth Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                id="login-github"
                type="button"
                disabled={githubLoading}
                onClick={handleGithubLogin}
                className="auth-btn-focus"
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
                <span>{githubLoading ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
              </button>

              <button
                id="login-google"
                type="button"
                disabled={googleLoading}
                onClick={handleGoogleLogin}
                className="auth-btn-focus"
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
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Sign Up Redirect Link */}
            <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#64748B', marginTop: '24px', marginBottom: 0 }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
                Sign up
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
