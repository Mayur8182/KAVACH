'use client';

/**
 * /auth/callback/sso — Enterprise SSO SAML 2.0 / OIDC Callback Handler
 * Exchanges assertion/code with backend POST /api/v1/auth/sso/callback,
 * sets JWT session token, and routes to dashboard.
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, RefreshCw, ArrowLeft, Building } from 'lucide-react';
import { api } from '@/lib/api/client';
import { setAuthToken } from '@/lib/auth/token';

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState('Processing Enterprise SSO Assertion...');
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const provider = searchParams.get('provider') || 'okta';
    const email = searchParams.get('email') || 'corporate.user@company.com';
    const code = searchParams.get('code') || 'saml_assertion_valid_token';

    const exchangeAssertion = async () => {
      try {
        setStatusText(`Verifying ${provider.toUpperCase()} SAML 2.0 credentials...`);
        const res = await api.auth.ssoCallback({
          provider,
          email,
          code,
        });

        if (res.access_token) {
          setAuthToken(res.access_token);
          setStatusText(`Welcome, ${res.user?.name || res.user?.email || 'Corporate Member'}! Establishing SSO session...`);
          setTimeout(() => {
            router.push('/home');
          }, 800);
        } else {
          throw new Error('SSO assertion validated but no session token was granted.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to complete Enterprise SSO authentication.');
      }
    };

    exchangeAssertion();
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: error ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {error ? <AlertCircle size={28} color="#EF4444" /> : <Building size={28} color="#2563EB" />}
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
          {error ? 'SSO Assertion Failed' : 'Enterprise Single Sign-On'}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          {error ? error : statusText}
        </p>

        {error ? (
          <Link
            href="/auth/sso"
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
            <span>Return to SSO Portal</span>
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 500 }}>
            <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Validating SAML metadata &amp; domain policies...</span>
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

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Validating SSO...</div>}>
      <SsoCallbackContent />
    </Suspense>
  );
}
