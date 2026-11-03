'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ShieldCheck } from 'lucide-react';

interface StepItem {
  number: string;
  label: string;
  path: string;
}

const STEPS: StepItem[] = [
  { number: '25', label: 'Expired Verification', path: '/verify-email/expired' },
  { number: '26', label: 'MFA Setup', path: '/mfa/setup' },
  { number: '27', label: 'MFA Verify', path: '/mfa/verify' },
  { number: '28', label: 'MFA Recovery', path: '/mfa/recovery' },
  { number: '29', label: 'Connect GitHub', path: '/onboarding/connect-github' },
];

export function AuthFlowNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        borderBottom: '1px solid #1E293B',
        padding: '10px 24px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={16} color="#38BDF8" />
        <span style={{ fontWeight: 700, color: '#38BDF8', letterSpacing: '0.02em' }}>
          SecuLayer Auth &amp; Onboarding Pipeline:
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {STEPS.map((step, idx) => {
          const isActive = pathname?.startsWith(step.path);
          return (
            <React.Fragment key={step.path}>
              {idx > 0 && <ChevronRight size={13} color="#475569" />}
              <Link
                href={step.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? '#2563EB' : '#1E293B',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  border: isActive ? '1px solid #3B82F6' : '1px solid transparent',
                }}
              >
                <span
                  style={{
                    backgroundColor: isActive ? '#1D4ED8' : '#334155',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
