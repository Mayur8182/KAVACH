'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, X } from 'lucide-react';

const STORAGE_KEY = 'seculayer_cookie_consent_v1';

/**
 * SecuLayer Enterprise Cookie & Privacy Preference Banner
 * Styled to match the SecuLayer design tokens:
 * - Crisp white surface, subtle slate border (#E2E8F0), refined elevation shadow
 * - Sleek typography (#0F172A text, #475569 body, #2563EB brand links)
 * - Compact floating card docked bottom-right rather than an invasive full-width banner
 * - Fully accessible, zero keyboard traps, persistent preferences
 */
export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage unavailable in restricted environment
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  const handleDeclineOptional = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie and Privacy Consent"
      aria-live="polite"
      className="seculayer-cookie-banner"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '420px',
        width: 'calc(100% - 40px)',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        border: '1px solid #E2E8F0',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'seculayerSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header with Brand Icon and Dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
            aria-hidden="true"
          >
            <Shield size={15} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Privacy & Workspace Security
          </span>
        </div>

        <button
          type="button"
          onClick={handleDeclineOptional}
          aria-label="Dismiss cookie notice"
          style={{
            color: '#94A3B8',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
          }}
          title="Dismiss notice"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Description text */}
      <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#475569', margin: 0 }}>
        Kavach uses essential session cookies for authentication, CSRF mitigation, and access control. We do not use advertising or tracking cookies.{' '}
        <Link
          href="/privacy"
          style={{
            color: '#2563EB',
            textDecoration: 'underline',
            fontWeight: 500,
          }}
        >
          Privacy Policy
        </Link>
        .
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
        <button
          type="button"
          onClick={handleDeclineOptional}
          style={{
            padding: '7px 12px',
            minHeight: '34px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#475569',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          Essential Only
        </button>

        <button
          type="button"
          onClick={handleAcceptAll}
          style={{
            padding: '7px 14px',
            minHeight: '34px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#0F172A',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0F172A';
          }}
        >
          Accept Cookies
        </button>
      </div>

      <style>{`
        @keyframes seculayerSlideUp {
          from {
            transform: translateY(12px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @media (max-width: 640px) {
          .seculayer-cookie-banner {
            left: 16px !important;
            right: 16px !important;
            bottom: 16px !important;
            max-width: none !important;
            width: auto !important;
          }
        }
      `}</style>
    </aside>
  );
};
