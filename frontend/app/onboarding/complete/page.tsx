'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';
import { PersonalizingWorkspaceScreen } from '@/components/onboarding/PersonalizingWorkspaceScreen';
import { OnboardingCelebrationScreen } from '@/components/onboarding/OnboardingCelebrationScreen';
import { HorizontalOnboardingStepper } from '@/components/onboarding/HorizontalOnboardingStepper';
import { HelpCircle } from 'lucide-react';

export default function OnboardingCompletePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [userInitials, setUserInitials] = useState<string>('K');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [me, sum] = await Promise.all([
          api.auth.me().catch(() => null),
          api.onboarding.getSummary().catch(() => null),
        ]);
        if (!isMounted) return;
        if (me) {
          setCurrentUser(me);
          if (me.name || me.full_name) {
            const parts = (me.name || me.full_name).trim().split(/\s+/);
            setUserInitials((parts[0][0] + (parts[1]?.[0] || '')).toUpperCase());
          } else if (me.email) {
            setUserInitials(me.email.slice(0, 2).toUpperCase());
          }
        }
        if (sum) setSummary(sum);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const organizationName =
    summary?.organization?.name ||
    summary?.organization_name ||
    (currentUser?.name ? `${currentUser.name}'s Org` : 'Kavach Organization');

  const workspaceName =
    summary?.workspace?.name ||
    summary?.workspace_name ||
    'Production Workspace';

  const region =
    summary?.organization?.region ||
    summary?.workspace?.region ||
    'ap-south-1 (Mumbai)';

  const userName =
    currentUser?.name ||
    currentUser?.full_name ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Security Engineer');

  const selectedProducts = summary?.products || ['thing_code'];

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
      {/* Top Header Navigation matching Kavach Clean White Theme */}
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
          <Link
            href="/overview"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
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
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#0F172A',
                  lineHeight: 1.1,
                }}
              >
                KAVACH
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  color: '#64748B',
                  letterSpacing: '0.03em',
                }}
              >
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
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              WORKSPACE READY
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748B',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
            }}
          >
            <HelpCircle size={14} />
            <span>Support & Docs</span>
          </a>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      {/* Stepper Bar on top */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 24px',
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <HorizontalOnboardingStepper currentStep={4} />
        </div>
      </div>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}
      >
        {isAnalyzing ? (
          <PersonalizingWorkspaceScreen
            workspaceName={workspaceName}
            organizationName={organizationName}
            selectedProducts={selectedProducts}
            onComplete={() => setIsAnalyzing(false)}
          />
        ) : (
          <OnboardingCelebrationScreen
            userName={userName}
            organizationName={organizationName}
            workspaceName={workspaceName}
            region={region}
            selectedProducts={selectedProducts}
            onFinish={() => {
              router.push('/overview');
            }}
          />
        )}
      </main>
    </div>
  );
}
