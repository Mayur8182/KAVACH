'use client';

/**
 * /unauthorized — 403 Forbidden / Access Denied Page
 * Displays deterministic policy access restriction, audit evidence reference,
 * and request privilege elevation options.
 */

import React from 'react';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Send, Lock } from 'lucide-react';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L25 8.2V20L14 26L3 20V8.2L14 2Z" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V14M14 14L25 8.2M14 14L3 8.2M14 14V26" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#0F172A' }}>SecuLayer</span>
  </div>
);

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
        </div>

        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <ShieldX size={28} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
          403 — Access Denied
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
          Your current enterprise role does not have authorization to view this resource. This enforcement is strictly governed by deterministic OPA policies.
        </p>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '24px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Policy Engine:</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>Open Policy Agent (OPA)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Decision:</span>
            <span style={{ fontWeight: 700, color: '#DC2626' }}>DENY (rbac.enforce)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Audit Event:</span>
            <span style={{ fontFamily: 'monospace', color: '#2563EB' }}>POL_ACCESS_DENIED</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/home"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/contact"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Send size={14} />
            <span>Request Elevation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
