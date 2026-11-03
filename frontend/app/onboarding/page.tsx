'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

function OnboardingDispatcher() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkState() {
      try {
        const data = await api.entitlements.getMe();
        if (!isMounted) return;

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isForceNew = urlParams?.get('new') === 'true' || urlParams?.get('force') === 'true' || urlParams?.has('product');

        if (data?.onboarding_completed && !isForceNew) {
          // If already onboarded and not explicitly creating a new org/workspace, send directly to enabled product
          if (data.products?.thing_code?.is_enabled) {
            router.replace('/code');
          } else if (data.products?.thing_cloud?.is_enabled) {
            router.replace('/cloud');
          } else if (data.products?.thing_attack?.is_enabled) {
            router.replace('/attack');
          } else if (data.products?.thing_protect?.is_enabled) {
            router.replace('/protect');
          } else {
            router.replace('/code');
          }
          return;
        }

        if (isForceNew) {
          const target = urlParams?.get('workspace') ? '/onboarding/workspace' : '/onboarding/organization?new=true';
          router.replace(target);
          return;
        }

        // 1. Check server-side onboarding progress
        try {
          const stateRes = await api.onboarding.getState();
          if (stateRes && stateRes.status === 'DEFERRED') {
            router.replace('/code');
            return;
          }
          if (stateRes && !stateRes.started && !stateRes.current_step) {
            router.replace('/onboarding/welcome');
            return;
          }
        } catch (e) {
          // If error fetching onboarding state, continue with resource progression check
        }

        // 2. Intelligently check existing progress to resume at correct step
        try {
          const orgs = await api.organizations.list();
          if (!isMounted) return;
          if (!orgs?.items || orgs.items.length === 0) {
            router.replace('/onboarding/welcome');
            return;
          }

          const ws = await api.workspaces.list();
          if (!isMounted) return;
          if (!Array.isArray(ws) || ws.length === 0) {
            router.replace(`/onboarding/workspace?org_id=${encodeURIComponent(orgs.items[0].id)}`);
            return;
          }

          const prj = await api.onboarding.getProject();
          if (!isMounted) return;
          if (!prj || !prj.name) {
            router.replace('/onboarding/project');
            return;
          }

          const envs = await api.environments.list();
          if (!isMounted) return;
          if (!Array.isArray(envs) || envs.length === 0) {
            router.replace('/onboarding/environment');
            return;
          }

          // Next step: Products
          router.replace('/onboarding/products');
        } catch {
          if (isMounted) router.replace('/onboarding/welcome');
        }
      } catch {
        if (isMounted) {
          router.replace('/onboarding/welcome');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkState();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, -apple-system, sans-serif',
        color: '#64748B',
        fontSize: '14px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '2.5px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span>Checking workspace onboarding state...</span>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function OnboardingRootPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#FFFFFF',
          }}
        />
      }
    >
      <OnboardingDispatcher />
    </Suspense>
  );
}
