'use client';

/**
 * /logout — Clean Sign Out Handler
 * Invokes POST /api/v1/auth/logout, purges local session tokens,
 * and seamlessly redirects back to /login.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { clearAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing out and revoking session...');

  useEffect(() => {
    async function performLogout() {
      try {
        await api.auth.logout();
      } catch (err) {
        console.warn('Backend logout notification skipped:', err);
      } finally {
        clearAuthToken();
        toast.success('Signed out successfully', {
          description: 'Your Kavach session has been terminated.',
        });
        setStatus('Session terminated. Redirecting to login...');
        setTimeout(() => {
          router.push('/login?logged_out=1');
        }, 500);
      }
    }
    performLogout();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <RefreshCw size={28} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{status}</span>
      </div>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
