'use client';

/**
 * Kavach Enterprise — Pricing & Plan Selection (/pricing)
 * 
 * Implements Screen 11:
 * - 4 Plan Tiers: Free, Pro (Featured), Team, Enterprise
 * - Live upgrade buttons routing directly to /checkout
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('Free');

  useEffect(() => {
    api.get('/api/v1/billing/overview')
      .then((res: any) => {
        if (res?.plan_tier) setCurrentPlan(res.plan_tier);
      })
      .catch(() => setCurrentPlan('Free'));
  }, []);

  return (
    <>
    <div style={{ minHeight: '100vh', backgroundColor: '#F6F7FB', padding: '40px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Top brand back link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#4F46E5',
              textDecoration: 'none',
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', margin: 0 }}>
            Choose your plan
          </h1>
          <div style={{ fontSize: '14px', color: '#5B6175', marginTop: '8px' }}>
            Scale your scans. Switch or cancel anytime.
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'stretch' }}>
          {/* Tier 1: Free */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E6E8EF',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                Free
              </h3>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '14px', lineHeight: 1 }}>
              $0
            </div>
            <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '8px' }}>
              For trying Kavach.
            </div>

            <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#2A2F45', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                100 credits one-time
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                1 project
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                1 seat
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Community support
              </li>
            </ul>

            <button
              type="button"
              disabled={currentPlan === 'Free'}
              style={{
                marginTop: '24px',
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                color: '#0F1222',
                border: '1px solid #D9DCE6',
                fontSize: '14px',
                fontWeight: 600,
                cursor: currentPlan === 'Free' ? 'default' : 'pointer',
                opacity: currentPlan === 'Free' ? 0.8 : 1,
              }}
            >
              {currentPlan === 'Free' ? 'Current plan' : 'Downgrade'}
            </button>
          </div>

          {/* Tier 2: Pro (Featured) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #111322',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(17, 19, 34, 0.06)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                Pro
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#111322',
                  color: '#ffffff',
                }}
              >
                Most popular
              </span>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '14px', lineHeight: 1 }}>
              $29
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#5B6175' }}>
                /mo
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '8px' }}>
              For small teams.
            </div>

            <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#2A2F45', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                2,000 credits / month
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Unlimited projects
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                5 seats
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Email support
              </li>
            </ul>

            <Link
              href="/checkout?plan=pro"
              style={{
                marginTop: '24px',
                width: '100%',
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
              {currentPlan === 'Pro' ? 'Current plan' : 'Upgrade to Pro'}
            </Link>
          </div>

          {/* Tier 3: Team */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E6E8EF',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                Team
              </h3>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '14px', lineHeight: 1 }}>
              $99
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#5B6175' }}>
                /mo
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '8px' }}>
              For growing teams.
            </div>

            <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#2A2F45', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                10,000 credits / month
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                10 seats & roles
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Shared dashboards
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Priority support
              </li>
            </ul>

            <Link
              href="/checkout?plan=team"
              style={{
                marginTop: '24px',
                width: '100%',
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
              Upgrade to Team
            </Link>
          </div>

          {/* Tier 4: Enterprise */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E6E8EF',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                Enterprise
              </h3>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '14px', lineHeight: 1 }}>
              Custom
            </div>
            <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '8px' }}>
              For large organisations.
            </div>

            <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#2A2F45', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Custom credits
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                SSO & audit logs
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                Dedicated manager
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1F9D55', fontWeight: 700 }}>✓</span>
                SLA & onboarding
              </li>
            </ul>

            <a
              href="mailto:sales@kavach.io"
              style={{
                marginTop: '24px',
                width: '100%',
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
              Contact sales
            </a>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#5B6175' }}>
          Prices in USD · Unused credits do not roll over
        </div>
      </div>
    </div>
    <EnterpriseFooter />
    </>
  );
}
