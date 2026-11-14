'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ScopeProvider } from '@/context/ScopeContext';
import { AppShell } from '@/components/layout/AppShell';
import { getAuthToken, clearAuthToken } from '@/lib/auth/token';
import { api } from '@/lib/api/client';
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner';
import { KavachBrandLoader } from '@/components/feedback/KavachBrandLoader';

export function PlatformShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Authoritative security session verification
  useEffect(() => {
    if (pathname?.startsWith('/invitations') || pathname?.startsWith('/states') || pathname?.startsWith('/api-security/reports/share')) {
      setIsAuthenticated(true);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      clearAuthToken();
      setIsAuthenticated(false);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/home';
      router.replace(`/login?redirect=${encodeURIComponent(currentPath === '/' ? '/home' : (currentPath || '/home'))}`);
      return;
    }

    let isMounted = true;
    api.auth
      .me()
      .then((user) => {
        if (!isMounted) return;
        if (user && (user.id || user.email)) {
          if (user.is_superuser) {
            setIsAuthenticated(true);
            return;
          }
          if (user.is_verified === false) {
            setIsAuthenticated(false);
            router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
            return;
          }
          if (user.onboarding_completed === false) {
            setIsAuthenticated(false);
            router.replace(`/onboarding?email=${encodeURIComponent(user.email)}`);
            return;
          }
          setIsAuthenticated(true);
        } else {
          clearAuthToken();
          setIsAuthenticated(false);
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/home';
          router.replace(`/login?redirect=${encodeURIComponent(currentPath === '/' ? '/home' : (currentPath || '/home'))}`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuthToken();
        setIsAuthenticated(false);
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/home';
        router.replace(`/login?redirect=${encodeURIComponent(currentPath === '/' ? '/home' : (currentPath || '/home'))}`);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <KavachBrandLoader
        fullscreen
        theme="light"
        size="md"
        message="Verifying Security Session"
        submessage="Authorizing cryptographic identity & workspace permissions…"
        badgeText="Zero-Trust Policy Enforced"
      />
    );
  }

  if (pathname?.startsWith('/superadmin') || pathname?.startsWith('/invitations') || pathname?.startsWith('/api-security/reports/share')) {
    return (
      <>
        <NetworkStatusBanner className="m-3" />
        {children}
      </>
    );
  }

  return (
    <ScopeProvider>
      <AppShell>
        <NetworkStatusBanner className="mb-4" />
        {children}
      </AppShell>
    </ScopeProvider>
  );
}
