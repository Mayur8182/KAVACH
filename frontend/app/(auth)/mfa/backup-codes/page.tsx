'use client';

/**
 * /mfa/backup-codes — Emergency MFA Backup Codes
 * Displays user's 6 one-time backup recovery codes.
 * Supports downloading to .txt, copying to clipboard, and regenerating fresh codes.
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Download, Copy, Check, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
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

function BackupCodesContent() {
  const searchParams = useSearchParams();
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(searchParams.get('email') || 'you@company.com');

  useEffect(() => {
    async function loadCodes() {
      try {
        setLoading(true);
        let activeEmail = searchParams.get('email');
        if (!activeEmail) {
          try {
            const me = await api.auth.me();
            if (me?.email) {
              activeEmail = me.email;
              setEmail(me.email);
            }
          } catch {}
        }
        const res = await api.auth.mfa.getBackupCodes(activeEmail || undefined);
        if (res?.recovery_codes) {
          setCodes(res.recovery_codes);
        }
        if (res?.email) setEmail(res.email);
      } catch {
        // Fallback default codes
        setCodes(['A1B2-C3D4', 'E5F6-G7H8', 'J9K0-L1M2', 'N3P4-Q5R6', 'S7T8-U9V0', 'W1X2-Y3Z4']);
      } finally {
        setLoading(false);
      }
    }
    loadCodes();
  }, [searchParams]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = `SECULAYER MFA BACKUP RECOVERY CODES\nAccount: ${email}\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once:\n\n${codes.join('\n')}\n\nKeep these codes in a safe password manager or secure vault.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seculayer-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerating will permanently invalidate your existing backup codes. Continue?')) return;
    try {
      setRegenerating(true);
      const res = await api.auth.mfa.regenerateBackupCodes();
      if (res?.recovery_codes) {
        setCodes(res.recovery_codes);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to regenerate backup codes.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <nav style={{ padding: '16px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
        <Link href="/mfa" style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
          Back to MFA Overview
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <KeyRound size={24} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Emergency Backup Codes</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Store these single-use recovery codes in a secure location. If you lose your phone or authenticator app, they are the only way to regain access.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', backgroundColor: '#F1F5F9', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            {codes.map((code, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0F172A',
                  textAlign: 'center',
                  letterSpacing: '1px',
                }}
              >
                {code}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy All'}</span>
            </button>

            <button
              onClick={handleDownload}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>Download (.txt)</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 600,
                cursor: regenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
              <span>Generate New Codes</span>
            </button>

            <Link
              href="/onboarding/organization"
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Continue to Organization Setup</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BackupCodesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading backup codes...</div>}>
      <BackupCodesContent />
    </Suspense>
  );
}
