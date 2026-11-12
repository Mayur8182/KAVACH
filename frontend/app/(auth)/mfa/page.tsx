'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Key, Smartphone, ArrowRight, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>Kavach Security</span>
  </div>
);

export default function MfaHubPage() {
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await api.auth.me();
        if (user?.email) setUserEmail(user.email);
      } catch {
        // use default
      }
    }
    loadUser();
  }, []);

  const emailParam = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <ShieldCheck size={26} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: '#0F172A' }}>
            Multi-Factor Authentication
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            Manage hardware keys, TOTP authenticator tokens, and emergency backup codes {userEmail ? <>for <strong style={{ color: '#0F172A' }}>{userEmail}</strong></> : null}.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <Link
            href={`/mfa/setup${emailParam}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.15s ease',
            }}
            className="hover:border-blue-400 hover:bg-slate-50"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Setup Authenticator App</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Configure Google Authenticator, 1Password, or Authy</div>
              </div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />
          </Link>

          <Link
            href={`/mfa/verify${emailParam}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.15s ease',
            }}
            className="hover:border-blue-400 hover:bg-slate-50"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#ECFDF5', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Verify 6-Digit Code</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Test your security token or complete active login session</div>
              </div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />
          </Link>

          <Link
            href={`/mfa/recovery${emailParam}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.15s ease',
            }}
            className="hover:border-blue-400 hover:bg-slate-50"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Use Emergency Recovery Code</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Recover access if you lost your authenticator device</div>
              </div>
            </div>
            <ArrowRight size={16} color="#94A3B8" />
          </Link>
        </div>

        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
          <Link
            href="/code"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#64748B',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Security Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
