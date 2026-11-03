'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Search,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';

export interface OnboardingLayoutProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const ONBOARDING_STEPS = [
  { step: 1, label: 'Organization', href: '/onboarding/organization' },
  { step: 2, label: 'Workspace', href: '/onboarding/workspace' },
  { step: 3, label: 'Project', href: '/onboarding/project' },
  { step: 4, label: 'Environment', href: '/onboarding/environment' },
  { step: 5, label: 'Select Products', href: '/onboarding/products' },
  { step: 6, label: 'Configuration', href: '/onboarding/configuration' },
];

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  title,
  subtitle,
  children,
}) => {
  const router = useRouter();
  const [userInitials, setUserInitials] = useState('M');
  const [userName, setUserName] = useState('Mayur');

  React.useEffect(() => {
    import('@/lib/api/client').then(({ api }) => {
      api.auth.me().then(u => {
        const userObj = u as any;
        if (userObj?.name || userObj?.full_name) {
          const name = userObj.name || userObj.full_name;
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      {/* Top Header Navigation */}
      <header
        className="onboarding-header-root"
        style={{
          height: '60px',
          padding: '0 28px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link href="/code" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <img
              src="/kavach-logo.png"
              alt="Kavach"
              style={{ height: '28px', width: 'auto', display: 'block', maxWidth: '120px', objectFit: 'contain' }}
              onError={(e) => {
                // If logo fails, fallback to shield mark
                e.currentTarget.style.display = 'none';
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', color: '#0F172A', lineHeight: 1.1 }}>
                KAVACH
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em' }}>
                SECURITY PLATFORM
              </span>
            </div>
          </Link>

          <div className="kavach-hide-small-mobile" style={{ width: '1px', height: '22px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />

          <div className="kavach-hide-small-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
              Workspace Setup
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #DBEAFE',
                whiteSpace: 'nowrap',
              }}
            >
              Step {currentStep} of 6
            </span>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <Link
            href="/code"
            className="kavach-hide-small-mobile"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748B',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Exit to Console →
          </Link>

          {/* User Info & Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="kavach-hide-small-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || 'Mayur'}
              </span>
              <span style={{ fontSize: '10px', color: '#64748B' }}>
                Security Admin
              </span>
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}
              title={userName || 'Current User'}
            >
              {userInitials || 'M'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="onboarding-main-root"
        style={{
          flex: 1,
          maxWidth: '1340px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 32px 64px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px minmax(0, 1fr)',
            gap: '36px',
            alignItems: 'start',
          }}
          className="onboarding-grid"
        >
          {/* LEFT SIDEBAR STEPPER (6 Steps) */}
          <aside className="onboarding-stepper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 16px',
                letterSpacing: '-0.01em',
              }}
            >
              Onboarding
            </h2>

            <div className="onboarding-stepper-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ONBOARDING_STEPS.map((stepItem) => {
                const isCompleted = stepItem.step < currentStep;
                const isCurrent = stepItem.step === currentStep;
                const isClickable = isCompleted || isCurrent;

                return (
                  <div
                    key={stepItem.step}
                    className="onboarding-stepper-item"
                    onClick={() => {
                      if (isClickable) router.push(stepItem.href);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isCurrent ? '#EFF6FF' : 'transparent',
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    {isCompleted ? (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: isCurrent ? '#2563EB' : '#FFFFFF',
                          color: isCurrent ? '#FFFFFF' : '#64748B',
                          border: isCurrent ? 'none' : '1.5px solid #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {stepItem.step}
                      </div>
                    )}

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#2563EB' : isCompleted ? '#334155' : '#64748B',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stepItem.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {/* Header Titles */}
            <div>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.025em',
                  margin: '0 0 6px 0',
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748B',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            </div>

            {/* Page Body Content */}
            <div style={{ width: '100%', marginTop: '6px' }}>
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
