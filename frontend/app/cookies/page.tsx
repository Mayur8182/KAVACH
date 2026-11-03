import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Cookie Policy & Cryptographic Session Security | Kavach',
  description:
    'Kavach cookie and local storage disclosure. Strictly essential authentication and security tokens only. Zero advertising trackers, zero third-party marketing cookies.',
  alternates: {
    canonical: '/cookies',
  },
  openGraph: {
    title: 'Cookie Policy | Kavach',
    description:
      'Zero advertising trackers. Strictly essential tokens for cryptographic session integrity.',
    url: 'https://kavachsecurity.me/cookies',
  },
};

export default function CookiePolicyPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '920px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <Cookie size={13} aria-hidden="true" />
            <span>Kavach Trust & Transparency</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Cookie & Session Policy
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Last revised: October 2026 • Policy Version: 2026.3
          </p>
        </div>

        <div style={{ padding: '20px 24px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '40px', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
          <strong>Transparency Principle:</strong> Kavach is an autonomous security control plane built on deterministic verification. We treat browser cookies as cryptographic session instruments, not marketing trackers. We do <strong>not</strong> use advertising cookies, cross-domain behavioral trackers, or saleable telemetry cookies.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              1. What Are Cookies and How Kavach Uses Them
            </h2>
            <p>
              Cookies are small text files placed on your device to maintain authenticated session integrity, protect against cross-site request forgery (CSRF), and preserve workspace scope preferences across navigations.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              2. Categories of Cookies We Deploy
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={18} color="#09090B" />
                  <span style={{ fontWeight: 700, color: '#09090B' }}>Strictly Essential Cookies (Required)</span>
                </div>
                <p style={{ margin: 0, color: '#52525B', fontSize: '13px' }}>
                  These tokens are technically required for the platform to function securely. They authenticate API requests, store JWT session identifiers with HTTPOnly and SameSite=Strict flags, and verify CSRF tokens. They cannot be disabled without breaking authentication.
                </p>
                <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#71717A' }}>
                  Names: <code>kavach_token</code>, <code>kavach_session</code>, <code>__Host-csrf_token</code>
                </div>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Lock size={18} color="#09090B" />
                  <span style={{ fontWeight: 700, color: '#09090B' }}>Preference & Scope State (Functional)</span>
                </div>
                <p style={{ margin: 0, color: '#52525B', fontSize: '13px' }}>
                  Stores your active workspace project ID, repository scope selector, and cookie consent preferences so your security views remain consistent across page reloads.
                </p>
                <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#71717A' }}>
                  Names: <code>kavach_active_scope</code>, <code>kavach_cookie_consent_v1</code>
                </div>
              </div>

              <div style={{ border: '1px dashed #D4D4D8', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ fontWeight: 700, color: '#09090B' }}>Zero Advertising or Third-Party Tracking Cookies</span>
                </div>
                <p style={{ margin: 0, color: '#71717A', fontSize: '13px' }}>
                  Kavach does <strong>NOT</strong> embed Meta Pixels, Google Ads conversion tags, LinkedIn Insight tags, or any third-party behavioral profiling scripts. Your security investigations and code queries remain 100% confidential.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              3. Is Cookie Consent Legally Required?
            </h2>
            <p>
              Under the EU ePrivacy Directive (Directive 2002/58/EC) and GDPR Article 6, cookies that are <strong>strictly necessary</strong> for providing a service explicitly requested by the user (such as authentication session cookies and security tokens) are exempt from requiring affirmative prior opt-in consent. However, in accordance with global transparency best practices, Kavach displays an informative cookie notice allowing users to review our privacy terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              4. Managing & Clearing Cookies
            </h2>
            <p>
              You can control or clear cookies at any time via your browser settings. Note that disabling essential cookies will prevent you from signing in to the Kavach Control Plane.
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Chrome / Chromium:</strong> Settings → Privacy and Security → Third-party cookies.</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection.</li>
              <li><strong>Safari:</strong> Settings → Privacy → Manage Website Data.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              5. Questions Regarding Cookies
            </h2>
            <p>
              For privacy and cookie inquiries, reach our Security & Privacy Operations team at{' '}
              <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'underline' }}>
                privacy@kavachsecurity.me
              </a>.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/privacy" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Complete Privacy Policy →
          </Link>
          <Link href="/" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
            Return to Kavach Home
          </Link>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
