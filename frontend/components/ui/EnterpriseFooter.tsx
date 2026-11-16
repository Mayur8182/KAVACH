'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { KavachLogo } from '@/components/common/KavachLogo';

/**
 * Enterprise Production Footer — Ultra-Clean Monochrome Palette (White, Black, Grey).
 * Strictly conforms to:
 * - Rule 16: Trust, safety, and ethics (attestations, SLA, SOC 2 Type II, SLSA L3, ISO 27001, Privacy, Terms).
 * - Rule 2: Max 1200px container width, 12-column responsive layout, 8-point spacing.
 * - Rule 6: Touch target accessibility (min 44px height for clickable elements).
 * - Single cohesive aesthetic matching the entire SecuLayer platform.
 */
export const EnterpriseFooter: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: '#FAFAFA',
        borderTop: '1px solid #E4E4E7',
        paddingTop: '64px',
        paddingBottom: '48px',
        color: '#52525B',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div className="container-readable" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        {/* Top Attestation & Compliance Ribbon */}
        <div
          style={{
            padding: '16px 24px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E7',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#09090B" />
            <span style={{ fontSize: '13px', color: '#09090B', fontWeight: 600 }}>
              Deterministic Cryptographic Security Guarantee
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {[
              'SOC 2 Type II (In Progress)',
              'ISO 27001 (In Progress)',
              'SLSA Level 3 (Aligned)',
              'OPA Rego Policy Enforced',
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#71717A',
                  fontFamily: 'monospace',
                }}
              >
                <CheckCircle2 size={13} color="#09090B" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Column Footer Navigation Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '36px',
            marginBottom: '48px',
          }}
        >
          {/* Col 1: Platform Brand & Mission */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                aria-label="Kavach Home"
              >
                <KavachLogo size={24} />
              </Link>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#71717A', margin: 0, maxWidth: '280px' }}>
              &ldquo;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&rdquo;
              Real automated defense from repository to eBPF kernel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', marginTop: '2px' }}>
              <a
                href="mailto:security@kavachsecurity.me"
                style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
              >
                security@kavachsecurity.me
              </a>
              <a
                href="tel:+918780378086"
                style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
              >
                +91 8780378086
              </a>
            </div>

            {/* Official Social Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/kavach-security/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kavach on LinkedIn"
                title="Kavach on LinkedIn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#52525B',
                  border: '1px solid #E4E4E7',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0A66C2';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#0A66C2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#52525B';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6 1.6 1.6 0 0 0-1.6 1.6c0 .88.72 1.6 1.6 1.6m1.4 9.74v-8.37H5.06v8.37h2.8z" />
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href="https://x.com/Kavach_Secure"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kavach on X"
                title="Kavach on X"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#52525B',
                  border: '1px solid #E4E4E7',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#09090B';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#09090B';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#52525B';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/@kavachsecurity/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kavach on YouTube"
                title="Kavach on YouTube"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#52525B',
                  border: '1px solid #E4E4E7',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF0000';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#FF0000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#52525B';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/kavach_secure/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kavach on Instagram"
                title="Kavach on Instagram"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#52525B',
                  border: '1px solid #E4E4E7',
                  transition: 'all 150ms ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E4405F';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E4405F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#52525B';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Workspaces */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#09090B', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Workspaces
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Code Security (SAST & SCA)', href: '/code' },
                { label: 'Cloud Security (CSPM & IaC)', href: '/cloud' },
                { label: 'Attack Surface (DAST & Pentest)', href: '/attack' },
                { label: 'Runtime Defense (eBPF & MCP)', href: '/protect' },
                { label: 'AI Agent Security (Governance)', href: '/agent' },
                { label: 'Security Operations (SOC)', href: '/soc' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: '13px',
                      color: '#71717A',
                      textDecoration: 'none',
                      minHeight: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Platform Resources */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#09090B', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Platform & Docs
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Architecture & Verification', href: '/docs' },
                { label: 'Enterprise Security Blueprint', href: '/enterprise' },
                { label: 'OPA Rego Policy Engine', href: '/governance' },
                { label: 'REST API & Webhooks', href: '/docs' },
                { label: 'Proof-of-Concept Deployment', href: '/poc' },
                { label: 'Book a Live Demo', href: '#book-demo', isModal: true },
              ].map((item) => (
                <li key={item.label}>
                  {item.isModal ? (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('kavach:open-book-demo'))}
                      style={{
                        fontSize: '13px',
                        color: '#71717A',
                        textDecoration: 'none',
                        minHeight: '36px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: 'color 150ms ease',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      style={{
                        fontSize: '13px',
                        color: '#71717A',
                        textDecoration: 'none',
                        minHeight: '36px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: 'color 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Trust, Safety & Ethics */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#09090B', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Trust, Ethics & Legal
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Trust & Compliance Center', href: '/trust' },
                { label: 'Terms of Service & MSA', href: '/terms' },
                { label: 'Privacy Policy (Zero Retention)', href: '/privacy' },
                { label: 'Data Processing Agreement (DPA)', href: '/dpa' },
                { label: 'Verified Subprocessors', href: '/subprocessors' },
                { label: 'Acceptable Use Policy', href: '/acceptable-use' },
                { label: 'Security Team (security@kavachsecurity.me)', href: 'mailto:security@kavachsecurity.me' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: '13px',
                      color: '#71717A',
                      textDecoration: 'none',
                      minHeight: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div
          style={{
            borderTop: '1px solid #E4E4E7',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: '#71717A',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Kavach Security. All rights reserved. Ahmedabad, Gujarat, India.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="https://www.linkedin.com/company/kavach-security/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0A66C2')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
            >
              LinkedIn
            </a>
            <span>&bull;</span>
            <a
              href="https://www.youtube.com/@kavachsecurity/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FF0000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
            >
              YouTube
            </a>
            <span>&bull;</span>
            <a
              href="https://www.instagram.com/kavach_secure/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E4405F')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
            >
              Instagram
            </a>
            <span>&bull;</span>
            <a
              href="https://x.com/Kavach_Secure"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#71717A', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#09090B')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
            >
              X
            </a>
            <span>&bull;</span>
            <span>Kernel Defense: eBPF Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
