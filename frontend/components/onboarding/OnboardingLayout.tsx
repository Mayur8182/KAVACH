'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';
import { HorizontalOnboardingStepper } from '@/components/onboarding/HorizontalOnboardingStepper';

export interface OnboardingLayoutProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  title,
  subtitle,
  children,
}) => {
  const router = useRouter();
  const [userInitials, setUserInitials] = useState('K');
  const [userName, setUserName] = useState('Engineer');

  useEffect(() => {
    import('@/lib/api/client').then(({ api }) => {
      api.auth.me().then((u: any) => {
        if (u?.name || u?.full_name) {
          const name = u.name || u.full_name;
          setUserName(name);
          const parts = name.trim().split(/\s+/);
          setUserInitials((parts[0][0] + (parts[1]?.[0] || '')).toUpperCase());
        } else if (u?.email) {
          const namePart = u.email.split('@')[0];
          setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
          setUserInitials(u.email.slice(0, 2).toUpperCase());
        }
      }).catch(() => {});
    });
  }, []);

  // Map steps to the 4 horizontal stages:
  // 1: Org / Workspace
  // 2: Project / Environment
  // 3: Security Products (currentStep 5)
  // 4: Configuration / Complete (currentStep 6)
  const mappedHorizontalStep =
    currentStep <= 2 ? 1 : currentStep <= 4 ? 2 : currentStep === 5 ? 3 : 4;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8FAFC',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#0F172A',
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          height: '64px',
          padding: '0 32px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/overview" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <KavachMark size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em', color: '#0F172A', lineHeight: 1.1 }}>
                KAVACH
              </span>
              <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#64748B', letterSpacing: '0.03em' }}>
                SECURITY CONTROL PLANE
              </span>
            </div>
          </Link>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
              }}
            >
              ONBOARDING
            </span>
          </div>
        </div>

        {/* Right Nav Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
              {userName}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #334155',
              }}
            >
              {userInitials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: '920px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px 64px',
          boxSizing: 'border-box',
        }}
      >
        {/* Horizontal Stepper */}
        <HorizontalOnboardingStepper currentStep={mappedHorizontalStep} totalSteps={4} />

        {/* Focused Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* Header Titles */}
          <div style={{ marginBottom: '28px', borderBottom: '1px solid #F1F5F9', paddingBottom: '20px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: '#64748B',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Page Body Content */}
          <div style={{ width: '100%' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
