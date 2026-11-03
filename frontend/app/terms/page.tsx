import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldAlert, CheckCircle2, DollarSign, Scale, HelpCircle } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Terms of Service & Master Services Agreement | Kavach',
  description:
    'Kavach terms of service, customer source code ownership guarantees, permitted automated security testing, refund policy, and SLA commitments.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | Kavach',
    description:
      'Customer code ownership guarantees, deterministic governance, cancellation terms, and enterprise SLA.',
    url: 'https://kavach.security/terms',
  },
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <FileText size={13} aria-hidden="true" />
            <span>Master Enterprise Services Agreement</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Terms of Service
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Last revised: October 2026 • Policy Version: 2026.4
          </p>
        </div>

        <div style={{ padding: '20px 24px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '40px', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
          These Terms of Service (&quot;Agreement&quot;) govern access to and use of the Kavach platform, API endpoints, Antigravity CLI, and MCP security gateway provided by Kavach Technologies Inc.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          {/* Section 1: IP Ownership */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              1. Platform Services & Customer Intellectual Property Ownership
            </h2>
            <p>
              The Customer retains sole and exclusive ownership of all source code, software repositories, environment configurations, and intellectual property submitted to or processed by Kavach. Kavach claims no ownership rights over patches, auto-remediations, or security blueprints generated during platform execution. All generated code diffs are irrevocably assigned to the Customer under their repository&apos;s existing licensing model.
            </p>
          </section>

          {/* Section 2: Deterministic Governance */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              2. Architectural Golden Rule & Deterministic Governance
            </h2>
            <p>
              Customer acknowledges and agrees with the core architectural principle: <em>&quot;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&quot;</em> Automated deployments and critical policy decisions must be verified through customer-approved deterministic engines (OPA Rego rules, scanner benchmarks, and cryptographic proof). Kavach shall not be liable for unverified manual deployments initiated without policy checks.
            </p>
          </section>

          {/* Section 3: Permitted Security Testing */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              3. Permitted Security Testing & Prohibited Conduct
            </h2>
            <p>
              Customers are authorized to execute automated DAST, SAST, secret detection, and container security scans <strong>strictly against digital assets and repositories they own or hold explicit written permission to test</strong>. Scanning, probing, or stress-testing assets not registered or authorized under customer ownership is strictly prohibited, constitutes a material breach, and will result in immediate account termination.
            </p>
          </section>

          {/* Section 4: Refund & Cancellation Policy */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              4. Subscription, Refund & Cancellation Policy
            </h2>
            <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign size={18} color="#09090B" />
                <span style={{ fontWeight: 700, color: '#09090B' }}>Billing, Cancellation & Refunds</span>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#52525B', fontSize: '13px' }}>
                <li><strong>Self-Serve Subscriptions (Pro / Team):</strong> You may cancel your subscription at any time via Account Settings → Billing. Cancellation takes effect at the conclusion of the current monthly or annual billing cycle, with no subsequent charges.</li>
                <li><strong>14-Day Evaluation Refund Guarantee:</strong> If you are dissatisfied with Kavach within the first 14 calendar days of your initial paid subscription, contact <code>billing@kavach.security</code> for a full, no-questions-asked refund.</li>
                <li><strong>Enterprise Contracts:</strong> Enterprise agreements are governed by the specific terms detailed in the executed Master Services Agreement (MSA) and Statement of Work (SOW).</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Truth-in-Marketing Commitment */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              5. Truth-in-Marketing & Data Authenticity Commitment
            </h2>
            <p>
              In accordance with our core engineering rules:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>All benchmark numbers, scan completion notices, and security coverage metrics shown across Kavach correspond to <strong>actual operational scans</strong> conducted on connected repositories or cloud accounts.</li>
              <li>We never simulate false zero-vulnerability clean bills of health when tools fail. Scanner errors are reported transparently with root causes and remediation guidance.</li>
            </ul>
          </section>

          {/* Section 6: SLAs */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              6. Service Level Agreements (SLA)
            </h2>
            <p>
              Kavach warrants a <strong>99.9% monthly uptime SLA</strong> for Pro subscriptions, and a <strong>99.99% monthly availability SLA</strong> for Enterprise subscriptions with 24/7 dedicated incident support. Maintenance windows are announced with a minimum of 72 hours advance notice via our status page.
            </p>
          </section>

          {/* Section 7: Account Deletion */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              7. Account Termination & Cryptographic Offboarding
            </h2>
            <p>
              Upon termination of your account or subscription, you may request complete cryptographic erasure of all stored access tokens, scan findings, and telemetry. We purge all customer metadata from primary and replica databases within 30 days of termination confirmation.
            </p>
          </section>

          {/* Section 8: Governing Law */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              8. Governing Law & Dispute Resolution
            </h2>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without giving effect to conflicts of law principles. Any dispute arising under or in connection with this Agreement shall be resolved through confidential binding arbitration in San Francisco, CA.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/privacy" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Privacy Policy →
          </Link>
          <Link href="/cookies" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
            Cookie Policy
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
