'use client';

/**
 * Kavach Enterprise — Home Dashboard (/home)
 * 
 * Implements Screens 5 & 6:
 * - Credits summary cards (Remaining, Consumed, Open findings, Current plan)
 * - Credit usage pace card + Upgrade promo
 * - Recent scans ledger table with credit deductions
 * - Free Credits Welcome Modal (Screen 5) with toggle/close
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface BillingOverview {
  account_id: string;
  plan_tier: string;
  status: string;
  total_credits: number;
  consumed_credits: number;
  remaining_credits: number;
  usage_percent: number;
  total_scans_count: number;
  open_findings_count: number;
  critical_findings_count: number;
  days_until_reset: number;
  days_remaining_pace: number;
}

interface ScanTransaction {
  id: string;
  repo: string;
  product: string;
  status: string;
  credits: string;
}

export default function HomePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    // Check if welcome was already dismissed this session
    const dismissed = sessionStorage.getItem('kavach_welcome_dismissed');
    if (!dismissed) {
      setShowWelcome(true);
    }

    api.get('/api/v1/billing/overview')
      .then((res: any) => {
        if (res) setOverview(res);
      })
      .catch((err) => {
        console.error('Failed to fetch home billing overview', err);
        setOverview({
          account_id: 'default',
          plan_tier: 'Free',
          status: 'Trial',
          total_credits: 100,
          consumed_credits: 28,
          remaining_credits: 72,
          usage_percent: 28,
          total_scans_count: 4,
          open_findings_count: 142,
          critical_findings_count: 2,
          days_until_reset: 9,
          days_remaining_pace: 9,
        });
      });
  }, []);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    sessionStorage.setItem('kavach_welcome_dismissed', 'true');
  };

  const remainingCredits = overview?.remaining_credits ?? 72;
  const totalCredits = overview?.total_credits ?? 100;
  const consumedCredits = overview?.consumed_credits ?? 28;
  const usagePercent = overview?.usage_percent ?? 28;
  const totalScans = overview?.total_scans_count ?? 4;
  const openFindings = overview?.open_findings_count ?? 142;
  const critFindings = overview?.critical_findings_count ?? 2;
  const planTier = overview?.plan_tier ?? 'Free';
  const planStatus = overview?.status ?? 'Trial';
  const daysPace = overview?.days_remaining_pace ?? 9;

  const recentScans: ScanTransaction[] = [
    { id: '1', repo: 'api-server', product: 'Code Security', status: 'Completed', credits: '−10' },
    { id: '2', repo: 'web-app', product: 'Secrets', status: 'Completed', credits: '−5' },
    { id: '3', repo: 'billing-service', product: 'Dependencies', status: 'Completed', credits: '−3' },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', margin: 0 }}>
            Home
          </h1>
          <div style={{ fontSize: '13px', color: '#5B6175', marginTop: '6px' }}>
            Credits and recent security activity.
          </div>
        </div>
        <Link
          href="/code"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '44px',
            padding: '0 18px',
            borderRadius: '10px',
            backgroundColor: '#4F46E5',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4.5v15l13-7.5z" />
          </svg>
          Run Scan
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Remaining credits */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#5B6175' }}>Remaining credits</div>
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
            {remainingCredits}
          </div>
          <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
            of {totalCredits} free credits
          </div>
        </div>

        {/* Consumed */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#5B6175' }}>Consumed</div>
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
            {consumedCredits}
          </div>
          <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
            across {totalScans} scans
          </div>
        </div>

        {/* Open findings */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#5B6175' }}>Open findings</div>
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
            {openFindings}
          </div>
          <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
            {critFindings} critical
          </div>
        </div>

        {/* Current plan */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#5B6175' }}>Current plan</div>
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
            {planTier}
          </div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#EEF0F5',
                color: '#5B6175',
              }}
            >
              {planStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Credit Usage Pace & Upgrade Promo Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #E6E8EF',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          gap: '28px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <b style={{ color: '#0F1222' }}>Credit usage</b>
            <span style={{ color: '#5B6175' }}>{usagePercent}% used</span>
          </div>
          <div style={{ height: '10px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', margin: '12px 0 8px' }}>
            <div style={{ height: '100%', borderRadius: '99px', backgroundColor: '#4F46E5', width: `${usagePercent}%` }} />
          </div>
          <div style={{ fontSize: '12px', color: '#5B6175' }}>
            At this pace credits last about {daysPace} more days.
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#F6F7FB',
            border: '1px solid #E6E8EF',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F1222', margin: '0 0 2px 0' }}>
              Need more scans?
            </h3>
            <div style={{ fontSize: '12px', color: '#5B6175' }}>
              Pro gives 2,000 credits every month.
            </div>
          </div>
          <Link
            href="/pricing"
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              backgroundColor: '#4F46E5',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Upgrade
          </Link>
        </div>
      </div>

      {/* Recent Scans Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '22px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 12px 0' }}>
          Recent scans
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                Repository
              </th>
              <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                Product
              </th>
              <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                Status
              </th>
              <th style={{ textAlign: 'right', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                Credits
              </th>
            </tr>
          </thead>
          <tbody>
            {recentScans.map((scan) => (
              <tr key={scan.id}>
                <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222', fontWeight: 500 }}>
                  {scan.repo}
                </td>
                <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>
                  {scan.product}
                </td>
                <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: '#E3F6EA',
                      color: '#146C3A',
                    }}
                  >
                    {scan.status}
                  </span>
                </td>
                <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0F1222' }}>
                  {scan.credits}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===================== WELCOME MODAL (Screen 5) ===================== */}
      {showWelcome && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 19, 34, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '36px 32px 30px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleDismissWelcome}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#5B6175',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Gift Box Icon */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                backgroundColor: '#ECEBFD',
                color: '#4F46E5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-.5-4-2s2-2 4 1c2-3 4-3 4-1s-2 2-4 2" />
              </svg>
            </div>

            {/* Pill */}
            <div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#E3F6EA',
                  color: '#146C3A',
                }}
              >
                Free credits activated
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', margin: '14px 0 6px' }}>
              Welcome to Kavach, Mayur
            </h1>
            <div style={{ fontSize: '13px', color: '#5B6175' }}>
              Your account is ready. Start scanning now — no card required.
            </div>

            {/* Big 100 Credits */}
            <div style={{ fontSize: '64px', fontWeight: 700, letterSpacing: '-0.03em', color: '#0F1222', margin: '22px 0 2px', lineHeight: 1 }}>
              100
            </div>
            <div style={{ fontSize: '13px', color: '#5B6175' }}>
              free scan credits
            </div>

            {/* Bar */}
            <div style={{ height: '8px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', margin: '20px 0' }}>
              <div style={{ height: '100%', borderRadius: '99px', backgroundColor: '#4F46E5', width: '100%' }} />
            </div>

            {/* Scan credit breakdown box */}
            <div
              style={{
                backgroundColor: '#F6F7FB',
                border: '1px solid #E6E8EF',
                borderRadius: '12px',
                padding: '8px 16px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E6E8EF', fontSize: '13px' }}>
                <span style={{ color: '#0F1222' }}>Code Security scan</span>
                <b style={{ fontFamily: 'monospace', color: '#0F1222' }}>≈ 10 credits</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E6E8EF', fontSize: '13px' }}>
                <span style={{ color: '#0F1222' }}>Secrets scan</span>
                <b style={{ fontFamily: 'monospace', color: '#0F1222' }}>≈ 5 credits</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                <span style={{ color: '#0F1222' }}>Dependencies scan</span>
                <b style={{ fontFamily: 'monospace', color: '#0F1222' }}>≈ 3 credits</b>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <Link
                href="/code"
                onClick={handleDismissWelcome}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#4F46E5',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                Start first scan
              </Link>
              <Link
                href="/pricing"
                onClick={handleDismissWelcome}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  border: '1px solid #D9DCE6',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                Explore plans
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
