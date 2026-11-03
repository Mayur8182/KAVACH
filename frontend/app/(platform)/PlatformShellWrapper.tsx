'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ScopeProvider } from '@/context/ScopeContext';
import { AppShell } from '@/components/layout/AppShell';
import { getAuthToken, clearAuthToken } from '@/lib/auth/token';
import { api } from '@/lib/api/client';
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner';

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
    if (pathname?.startsWith('/invitations') || pathname?.startsWith('/states')) {
      setIsAuthenticated(true);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      clearAuthToken();
      setIsAuthenticated(false);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/code';
      router.replace(`/login?redirect=${encodeURIComponent(currentPath || '/code')}`);
      return;
    }

    let isMounted = true;
    api.auth
      .me()
      .then((user) => {
        if (!isMounted) return;
        if (user && (user.id || user.email)) {
          setIsAuthenticated(true);
        } else {
          clearAuthToken();
          setIsAuthenticated(false);
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/code';
          router.replace(`/login?redirect=${encodeURIComponent(currentPath || '/code')}`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuthToken();
        setIsAuthenticated(false);
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/code';
        router.replace(`/login?redirect=${encodeURIComponent(currentPath || '/code')}`);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0D12',
          fontFamily: 'Inter, -apple-system, sans-serif',
          color: '#94A3B8',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#F8FAFC',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em' }}>
            Verifying security session...
          </span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (pathname?.startsWith('/assistant')) {
    return (
      <ScopeProvider>
        <NetworkStatusBanner className="m-3" />
        {children}
      </ScopeProvider>
    );
  }

  if (pathname?.startsWith('/superadmin') || pathname?.startsWith('/invitations')) {
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
