'use client';

/**
 * /session-expired — Session Timeout & Re-authentication Page
 * Informs the user of automatic JWT expiration, preserves redirect destination,
 * and allows secure re-authentication.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { clearAuthToken } from '@/lib/auth/token';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>Kavach</span>
  </div>
);

export default function SessionExpiredPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    clearAuthToken();
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
        </div>

        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Clock size={28} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
          Session Expired
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          Your security credentials have expired due to inactivity. For your organization&apos;s protection, please re-authenticate to continue.
        </p>

        <div style={{ padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '8px', marginBottom: '24px', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Lock size={14} color="#64748B" />
          <span>Auto-redirecting to login in <strong>{countdown}s</strong></span>
        </div>

        <Link
          href="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '11px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <span>Sign In Again</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
