'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Home,
  Terminal,
  Copy,
  Check,
  LifeBuoy,
  FileCode2,
} from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error('Unhandled Root Global Exception:', error);
  }, [error]);

  const handleCopyDiagnostics = () => {
    const diagnosticText = [
      `Error: ${error?.message || 'Unknown root runtime exception'}`,
      error?.digest ? `Digest ID: ${error.digest}` : '',
      `Timestamp: ${new Date().toISOString()}`,
      `Platform: Kavach Control Plane (Root Boundary)`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnosticText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleReset = () => {
    setIsRetrying(true);
    try {
      reset();
    } finally {
      setTimeout(() => setIsRetrying(false), 1200);
    }
  };

  return (
    <html lang="en" data-theme="light">
      <head>
        <title>500 — Application Runtime Error | Kavach</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F8FAFC',
          color: '#0F172A',
          fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(219, 234, 254, 0.45), transparent 70%)',
        }}
      >
        {/* Top Brand Navigation Header */}
        <header
          style={{
            padding: '16px 32px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <a
            href="/"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            title="Return to Kavach Home"
          >
            <KavachLogo size={24} textSize={16} />
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#DC2626',
                padding: '5px 12px',
                backgroundColor: '#FEF2F2',
                borderRadius: '9999px',
                border: '1px solid #FECACA',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                  display: 'inline-block',
                }}
              />
              HTTP 500 — ROOT BOUNDARY EXCEPTION
            </span>
          </div>
        </header>

        {/* Main Error Presentation Card */}
        <main
          role="alert"
          aria-live="assertive"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            maxWidth: '680px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '40px 36px',
              boxShadow:
                '0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Status Icon */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.12)',
              }}
              aria-hidden="true"
            >
              <AlertTriangle size={30} strokeWidth={2.2} />
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#DC2626',
                marginBottom: '8px',
              }}
            >
              Root Resilience Boundary
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                margin: '0 0 12px',
                color: '#0F172A',
                lineHeight: 1.25,
              }}
            >
              500 — Application Runtime Error
            </h1>

            <p
              style={{
                fontSize: '14.5px',
                lineHeight: 1.6,
                color: '#475569',
                margin: '0 0 28px',
                maxWidth: '520px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              An unexpected error was intercepted at the root boundary. The runtime state was safely
              isolated and logged to deterministic audit telemetry.
            </p>

            {/* Diagnostic Details Box */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '28px',
                textAlign: 'left',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  <FileCode2 size={13} />
                  <span>Root Incident Diagnostics</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyDiagnostics}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: copied ? '#16A34A' : '#475569',
                    backgroundColor: '#FFFFFF',
                    border: copied ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Copy error details to clipboard"
                >
                  {copied ? (
                    <>
                      <Check size={12} strokeWidth={2.5} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>
              </div>

              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12.5px',
                  color: '#991B1B',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 700, color: '#DC2626' }}>Exception: </span>
                {error?.message || 'An unexpected runtime error occurred at root boundary.'}
              </div>

              {error?.digest && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '11.5px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#475569' }}>Digest ID:</span>
                  <code
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      color: '#0F172A',
                    }}
                  >
                    {error.digest}
                  </code>
                </div>
              )}
            </div>

            {/* Action Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                disabled={isRetrying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 22px',
                  minHeight: '44px',
                  backgroundColor: '#2563EB',
                  border: '1px solid #1D4ED8',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  opacity: isRetrying ? 0.75 : 1,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCcw
                  size={16}
                  aria-hidden="true"
                  style={{
                    animation: isRetrying ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span>{isRetrying ? 'Retrying...' : 'Retry Operation'}</span>
              </button>

              <a
                href="/code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  minHeight: '44px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#0F172A',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <Terminal size={16} color="#475569" aria-hidden="true" />
                <span>Security Console</span>
              </a>

              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  minHeight: '44px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <Home size={16} color="#64748B" aria-hidden="true" />
                <span>Kavach Home</span>
              </a>
            </div>

            {/* Assistance Footer */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '18px',
                fontSize: '12.5px',
                color: '#64748B',
                flexWrap: 'wrap',
              }}
            >
              <span>Need assistance?</span>
              <a
                href="/contact"
                style={{
                  color: '#2563EB',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <LifeBuoy size={13} />
                <span>Contact Security Desk</span>
              </a>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <a
                href="/docs"
                style={{
                  color: '#475569',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Documentation
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
