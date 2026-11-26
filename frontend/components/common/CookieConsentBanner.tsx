'use client';

/**
 * Kavach Enterprise Cookie & Privacy Consent Banner & Details Modal
 * 100% Pixel-Perfect Implementation matching Reference Design:
 * - Image 2: Bottom-left floating card with Privacy & Workspace Security, green check pills, Essential only & Accept cookies buttons.
 * - Image 3: Cookie details modal with 4 categories (Authentication, CSRF protection, Access control, Advertising & tracking).
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, X, Check } from 'lucide-react';

const STORAGE_KEY = 'kavach_cookie_consent_v1';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ essential: true, analytics: true, timestamp: new Date().toISOString() })
      );
      window.dispatchEvent(new CustomEvent('cookie_consent_changed', { detail: { analytics: true } }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
    setShowDetails(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() })
      );
      window.dispatchEvent(new CustomEvent('cookie_consent_changed', { detail: { analytics: false } }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
    setShowDetails(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowDetails(false);
  };

  if (!isVisible && !showDetails) return null;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* COOKIE DETAILS MODAL (Image 3 in attachments)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cookie details"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '540px',
              maxWidth: '95vw',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
              border: '1px solid #E2E8F0',
              padding: '32px 32px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              animation: 'kavachModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Cookie details
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Everything Kavach stores in your browser, and why.
                </p>
              </div>
            </div>

            {/* 4 Rows Container */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
              }}
            >
              {[
                {
                  title: 'Authentication',
                  desc: 'Keeps you signed in while you work.',
                  badge: 'Always on',
                  badgeColor: '#16A34A',
                  badgeBg: '#DCFCE7',
                },
                {
                  title: 'CSRF protection',
                  desc: 'Blocks forged requests made on your behalf.',
                  badge: 'Always on',
                  badgeColor: '#16A34A',
                  badgeBg: '#DCFCE7',
                },
                {
                  title: 'Access control',
                  desc: 'Makes sure you only see what your role allows.',
                  badge: 'Always on',
                  badgeColor: '#16A34A',
                  badgeBg: '#DCFCE7',
                },
                {
                  title: 'Advertising & tracking',
                  desc: 'Kavach does not use these, so there is nothing to opt out of.',
                  badge: 'Never used',
                  badgeColor: '#64748B',
                  badgeBg: '#F1F5F9',
                },
              ].map((item, idx) => (
                <div
                  key={item.title}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx === 3 ? 'none' : '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: item.badgeColor,
                      backgroundColor: item.badgeBg,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0F172A',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Back
                </button>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <Link
                  href="/privacy"
                  style={{
                    color: '#64748B',
                    textDecoration: 'none',
                  }}
                >
                  Privacy Policy
                </Link>
              </div>

              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  height: '40px',
                  padding: '0 24px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN COOKIE BANNER (Image 2 in attachments)                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isVisible && !showDetails && (
        <aside
          role="region"
          aria-label="Privacy and Workspace Security"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            maxWidth: '460px',
            width: 'calc(100% - 48px)',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            border: '1px solid #E2E8F0',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'kavachSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Privacy & Workspace Security
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Cookies on Kavach
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close cookie banner"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#475569', margin: 0 }}>
            Kavach uses a small set of essential cookies to sign you in and protect your workspace.{' '}
            <strong style={{ color: '#0F172A', fontWeight: 600 }}>No advertising. No tracking.</strong>
          </p>

          {/* 3 Pills matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['Authentication', 'CSRF protection', 'Access control'].map((label) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1F2937',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid transparent',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                <Check size={13} strokeWidth={3} color="#16A34A" />
                <span>{label}</span>
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleEssentialOnly}
              style={{
                height: '40px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Essential only
            </button>

            <button
              type="button"
              onClick={handleAcceptAll}
              style={{
                height: '40px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.12)',
              }}
            >
              Accept cookies
            </button>
          </div>

          {/* Footer Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0F172A',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
              }}
            >
              Manage details
            </button>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <Link
              href="/privacy"
              style={{
                color: '#0F172A',
                textDecoration: 'underline',
                fontWeight: 600,
              }}
            >
              Privacy Policy
            </Link>
          </div>
        </aside>
      )}

      <style>{`
        @keyframes kavachSlideUp {
          from {
            transform: translateY(12px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes kavachModalFadeIn {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};
