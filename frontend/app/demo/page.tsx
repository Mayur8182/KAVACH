'use client';

import { useEffect } from 'react';

/**
 * /demo — Direct in-page Cal.com booking redirect
 * Ensures visitors or external links are routed immediately to the official Cal.com scheduler
 * on the home page without exposing any mock/stale evaluation demo pages.
 */
export default function DemoPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/?book-demo=true');
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
          Opening Kavach Security Demo Booking...
        </p>
        <p style={{ fontSize: '13px', color: '#64748B' }}>Connecting directly to personal Cal.com calendar</p>
      </div>
    </div>
  );
}
