'use client';

/**
 * /login — Kavach Unified One-Step Authentication
 *
 * Enterprise split-screen layout:
 * - Left Side: Streamlined OAuth Login Card (Continue to Kavach with GitHub & Google)
 * - Right Side: Matching Light Enterprise Security Showcase Panel
 * - Right-to-Left slide entrance motion on page mount
 * - Automatic user auto-provisioning & workspace routing
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Lock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { getAuthToken, isTokenExpired } from '@/lib/auth/token';
import { toast } from '@/lib/toast';

const GithubIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriggerRef = React.useRef(false);

  const handleGithubAuth = async () => {
    setGithubLoading(true);
    setError(null);
    try {
      const currentOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';
      const redirectParam = searchParams.get('redirect');
      let returnUrl = `${currentOrigin}/auth/callback/github`;
      if (redirectParam) {
        returnUrl += `?next=${encodeURIComponent(redirectParam)}`;
      }
      const data = await api.auth.getGithubAuthUrl({
        return_url: returnUrl,
      });
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No authorization URL returned from server.');
    } catch (err: any) {
      console.warn('Backend GitHub authorization notice:', err);
      const msg =
        err?.message ||
        'Failed to initiate GitHub authorization. Please ensure backend services are running.';
      setError(msg);
      toast.error('GitHub Sign-in Failed', { description: msg });
      setGithubLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const currentOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';
      const redirectParam = searchParams.get('redirect');
      let returnUrl = `${currentOrigin}/auth/callback/google`;
      if (redirectParam) {
        returnUrl += `?next=${encodeURIComponent(redirectParam)}`;
      }
      const data = await api.auth.getGoogleAuthUrl({
        return_url: returnUrl,
      });
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No Google authorization URL returned from server.');
    } catch (err: any) {
      console.warn('Backend Google authorization notice:', err);
      const msg =
        err?.message ||
        'Failed to initiate Google authorization. Please check configuration.';
      setError(msg);
      toast.error('Google Sign-in Failed', { description: msg });
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = getAuthToken();
      const redirectParam = searchParams.get('redirect');
      if (token && !isTokenExpired(token)) {
        if (redirectParam && redirectParam.includes('/oauth')) {
          const sep = redirectParam.includes('?') ? '&' : '?';
          window.location.href = `${redirectParam}${sep}token=${encodeURIComponent(token)}&auto_approve=1`;
          return;
        }
        router.replace(redirectParam || '/overview');
        return;
      }

      const p = new URLSearchParams(window.location.search);
      if (p.get('logged_out') === '1') {
        toast.info('You have been signed out safely', {
          description: 'Authenticate with your provider to access your workspace again.',
        });
      }
      const urlError = p.get('error') || p.get('error_description') || p.get('message');
      if (urlError) {
        const decoded = decodeURIComponent(urlError);
        setError(decoded);
        toast.error('Authentication Notice', { description: decoded });
      }

      const providerParam = searchParams.get('provider');
      if (!autoTriggerRef.current && providerParam) {
        autoTriggerRef.current = true;
        if (providerParam === 'github') {
          handleGithubAuth();
        } else if (providerParam === 'google') {
          handleGoogleAuth();
        }
      }
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* =====================================================================
          LEFT COLUMN: The Authentication Card (Positioned on the LEFT as requested)
          "ae page khole trah ae right se left me jaye" -> Right to Left slide entrance!
          ===================================================================== */}
      <div className="w-full lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 lg:p-12 relative bg-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] flex flex-col items-center"
        >
          {/* Main Clean Authentication Card */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-8 py-10 sm:px-9 text-center transition-all">
            {/* Kavach Brand Wordmark Logo */}
            <div className="flex justify-center mb-6">
              <Link href="/" tabIndex={-1}>
                <img
                  src="/kavach-logo.png"
                  alt="Kavach"
                  className="h-10 w-auto max-w-[170px] object-contain select-none"
                  loading="eager"
                  decoding="async"
                />
              </Link>
            </div>

            {/* Headline */}
            <h1 className="text-[25px] sm:text-[27px] font-bold text-[#0F172A] tracking-tight mb-2">
              Continue to Kavach
            </h1>

            {/* Subtitle */}
            <p className="text-[14px] text-gray-500 font-normal mb-8">
              Securely access your workspace
            </p>

            {/* Error Notification if any OAuth error returned */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200/90 text-left flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 break-words">
                  <span className="font-semibold block mb-0.5">Authentication error</span>
                  {error}
                </div>
              </div>
            )}

            {/* Action Buttons: GitHub & Google Only */}
            <div className="space-y-3.5">
              {/* Primary: Continue with GitHub */}
              <button
                type="button"
                onClick={handleGithubAuth}
                disabled={githubLoading || googleLoading}
                className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-black text-white font-medium text-[14.5px] flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                {githubLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <GithubIcon size={19} />
                    <span>Continue with GitHub</span>
                  </>
                )}
              </button>

              {/* Secondary: Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={githubLoading || googleLoading}
                className="w-full h-12 rounded-xl bg-white hover:bg-gray-50/90 text-[#1E293B] border border-gray-200 font-medium text-[14.5px] flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon size={19} />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Card Footer: Security Assurance & Policies */}
          <div className="mt-8 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-[13px] text-gray-500 font-normal">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Your account is protected with secure authentication</span>
            </div>

            <div className="flex items-center justify-center gap-2.5 text-[13px] text-gray-500 font-normal">
              <Link
                href="/privacy"
                className="hover:text-gray-900 transition-colors underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300 select-none">•</span>
              <Link
                href="/terms"
                className="hover:text-gray-900 transition-colors underline-offset-4 hover:underline"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* =====================================================================
          RIGHT COLUMN: Clean Warm Beige Minimalist Panel
          "ae lgoin ke saide me hai na khul raha hai na usme bedge colour rakho
           or kutch na rakho to bhi chalega kutch rakho hi mat bas bedge colour ka rakho
           ae sab likha hai hatavo usko kutch likho hi mat or likho to sirf one stence me kutch likho"
          ===================================================================== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:col-span-7 xl:col-span-7 bg-[#F7F5F0] p-12 xl:p-20 flex-col justify-center items-center relative border-l border-[#EBE7DF] overflow-hidden"
      >
        <div className="max-w-[460px] text-center">
          <p className="text-2xl xl:text-3xl font-medium tracking-tight text-[#292524] leading-relaxed">
            Autonomous AI defense and deterministic security with runtime proof.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#FAFAFA] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
