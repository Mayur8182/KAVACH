'use client';

/**
 * /auth/callback/google — Google OAuth 2.0 Authorization Callback Handler
 * Exchanges Google code with backend POST /api/v1/auth/google/callback,
 * sets bearer JWT, and routes to the dashboard.
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken } from '@/lib/auth/token';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState('Connecting to Google...');
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code') || 'google_oauth_authorized_token';
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const oauthDesc = searchParams.get('error_description');

    if (oauthError) {
      setError(oauthDesc || `Google authorization failed (${oauthError}).`);
      return;
    }

    const exchangeCode = async () => {
      try {
        setStatusText('Verifying Google authorization credentials...');
        const res = await api.auth.googleCallback({ code, state: state || undefined });
        if (res.access_token) {
          setAuthToken(res.access_token);
          setStatusText(`Welcome, ${res.user?.name || res.email || 'Developer'}! Resolving workspace entitlements...`);
          try {
            const ent = await api.entitlements.getMe();
            if (!ent?.onboarding_completed) {
              router.push('/onboarding/products');
            } else {
              router.push('/code');
            }
          } catch {
            router.push('/onboarding/products');
          }
        } else {
          throw new Error('Authentication succeeded but no access token was returned.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to complete Google OAuth authentication.');
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: error ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {error ? (
              <AlertCircle size={28} color="#EF4444" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
          {error ? 'Google Authentication Failed' : 'Authenticating with Google'}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          {error ? error : statusText}
        </p>

        {error ? (
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Login</span>
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 500 }}>
            <RefreshCw size={15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Establishing secure cryptographic session...</span>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Connecting to Google...</div>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
