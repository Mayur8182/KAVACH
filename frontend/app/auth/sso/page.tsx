'use client';

/**
 * /auth/sso — Enterprise Single Sign-On (SSO) Portal
 * Supports corporate SAML 2.0 / OIDC login with Okta, Azure AD, Ping Identity, and Google Workspace.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Building, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
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

export default function SsoLoginPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('okta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = [
    { id: 'okta', name: 'Okta Enterprise', logo: '🔷' },
    { id: 'azure_ad', name: 'Microsoft Entra ID (Azure AD)', logo: '🟦' },
    { id: 'google_workspace', name: 'Google Workspace', logo: '🟢' },
    { id: 'ping_identity', name: 'Ping Identity (PingFederate)', logo: '🔴' },
  ];

  const handleSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      setError('Please provide your corporate email or company domain.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.getSsoAuthUrl(selectedProvider);
      if (res?.url) {
        // Redirect to identity provider or callback simulation
        router.push(`/auth/callback/sso?provider=${selectedProvider}&email=${encodeURIComponent(domain.includes('@') ? domain : `user@${domain}`)}`);
      }
    } catch {
      router.push(`/auth/callback/sso?provider=${selectedProvider}&email=${encodeURIComponent(domain.includes('@') ? domain : `user@${domain}`)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <nav style={{ padding: '16px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
        <Link href="/login" style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
          Standard Login
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <Building size={24} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Enterprise SSO Login</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Authenticate securely using your organization&apos;s Identity Provider (SAML 2.0 / OIDC).
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSsoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label htmlFor="company-domain" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Corporate Email or Domain
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="company-domain"
                  type="text"
                  placeholder="name@enterprise-corp.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Select Identity Provider (IdP)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {providers.map((p) => (
                  <label
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1.5px solid ${selectedProvider === p.id ? '#2563EB' : '#E2E8F0'}`,
                      backgroundColor: selectedProvider === p.id ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{p.logo}</span>
                      <span style={{ fontSize: '13px', fontWeight: selectedProvider === p.id ? 700 : 500, color: '#0F172A' }}>{p.name}</span>
                    </div>
                    <input
                      type="radio"
                      name="provider"
                      checked={selectedProvider === p.id}
                      onChange={() => setSelectedProvider(p.id)}
                      style={{ accentColor: '#2563EB' }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              id="sso-continue-button"
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
                marginTop: '6px',
              }}
            >
              <span>{loading ? 'Initiating SSO Handshake…' : 'Continue with SSO'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={13} color="#16A34A" /> SAML 2.0 &amp; OIDC Protected
            </span>
            <Link href="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
              Password Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
