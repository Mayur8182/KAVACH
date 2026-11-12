'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home, Terminal, Search, Compass } from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

export default function NotFound() {

  return (
    <div
      style={{
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
      {/* Top Brand Navigation Bar */}
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
        <Link
          href="/"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          title="Return to Kavach Home"
        >
          <KavachLogo size={24} textSize={16} />
        </Link>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#64748B',
            padding: '5px 12px',
            backgroundColor: '#F1F5F9',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
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
              backgroundColor: '#94A3B8',
              display: 'inline-block',
            }}
          />
          HTTP STATUS: 404
        </span>
      </header>

      {/* Main 404 Elevated Card */}
      <main
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
          }}
        >
          {/* Avatar + Status */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '104px',
                height: '104px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                border: '1.5px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
                position: 'relative',
              }}
              aria-hidden="true"
            >
              <img
                src="/kavach-cube.png"
                alt="Kavach 3D Isometric Cube"
                width={68}
                height={72}
                style={{
                  width: '68px',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 14px rgba(37, 99, 235, 0.22))',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                }}
                title="Kavach Security Search Active"
              >
                <Search size={11} color="#FFFFFF" strokeWidth={2.5} />
              </span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '999px',
                padding: '3px 10px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
              Searching for this route...
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748B',
              marginBottom: '8px',
            }}
          >
            Route Not Found
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 12px',
              color: '#0F172A',
            }}
          >
            404 — Endpoint Unregistered
          </h1>

          <p
            style={{
              fontSize: '14.5px',
              lineHeight: 1.6,
              color: '#475569',
              margin: '0 0 32px',
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            The requested path does not exist within the Kavach Security Control Plane. The resource may
            have been moved, renamed, or restricted under active enterprise governance policies.
          </p>

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
            <Link
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
                color: '#0F172A',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Return Home</span>
            </Link>

            <Link
              href="/code"
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
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Terminal size={16} aria-hidden="true" />
              <span>Open Security Console</span>
            </Link>

            <Link
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
              }}
            >
              <Home size={16} aria-hidden="true" />
              <span>Kavach Home</span>
            </Link>
          </div>

          {/* Suggested Links */}
          <div
            style={{
              marginTop: '36px',
              paddingTop: '20px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '12.5px',
              color: '#64748B',
              flexWrap: 'wrap',
            }}
          >
            <span>Common destinations:</span>
            <Link href="/products/code" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
              Code Security
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link href="/products/cloud" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
              Cloud Posture
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link href="/docs" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
              Documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

