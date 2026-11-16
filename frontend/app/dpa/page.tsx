import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Shield, CheckCircle2, Lock, Globe2 } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Data Processing Agreement (DPA) | Kavach Security',
  description:
    'Kavach Data Processing Addendum conforming to GDPR Article 28, UK GDPR, and Standard Contractual Clauses (SCCs).',
  alternates: {
    canonical: '/dpa',
  },
};

export default function DPAPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <FileText size={13} aria-hidden="true" />
            <span>GDPR Article 28 &amp; DPDP Regulatory Addendum</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Data Processing Agreement (DPA)
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Last revised: November 2026 • Policy Version: 2026.5 • Standard Processing Clauses
          </p>
        </div>

        <div style={{ padding: '20px 24px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '36px', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
          This Data Processing Addendum (&quot;DPA&quot;) supplements the Kavach Terms of Service and applies where Kavach processes personal data on behalf of Customer as a Data Processor under European Union, United Kingdom, and international data privacy regulations.
          <br /><br />
          <strong>Parties:</strong> <strong>Kavach Security</strong> (Processor, Ahmedabad, Gujarat, India) and Customer (Controller).
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              1. Subject Matter, Duration &amp; Processing Nature
            </h2>
            <p>
              Kavach processes data strictly to provide automated vulnerability scanning, cryptographic audit evidence, OPA policy evaluation, and security remediation assistance. The duration of processing equals the active subscription term plus required post-termination purge timelines.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              2. Ephemeral Processing &amp; Zero Retention of Source Code
            </h2>
            <p>
              In accordance with data minimization obligations (GDPR Article 5(1)(c)), source code analyzed during scanner executions resides exclusively in memory-backed, ephemeral containers. All container file systems are permanently destroyed immediately upon scan termination. Source code is never persisted in permanent databases or training datasets.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              3. Security Measures (Technical &amp; Organizational Controls)
            </h2>
            <p>
              Kavach implements industry-standard technical and organizational security controls (TOMs):
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Encryption:</strong> TLS 1.3 enforced for all network transit; AES-256 with KMS-managed keys for PostgreSQL data at rest.</li>
              <li><strong>Access Control:</strong> Strict Role-Based Access Control (RBAC), multi-factor authentication (MFA), and zero direct developer access to production customer enclaves.</li>
              <li><strong>Audit Logging:</strong> Immutable cryptographic Ed25519 trace IDs for all MCP tool calls and policy decisions.</li>
              <li><strong>Vulnerability Management:</strong> Continuous static code analysis (Semgrep), container CVE auditing (Trivy), and secret scanning (Gitleaks).</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              4. Subprocessor Engagement &amp; Notification
            </h2>
            <p>
              Customer grants general written authorization for Kavach to engage vetted infrastructure subprocessors (such as AWS and cloud database providers). All subprocessors are bound by data protection obligations no less protective than those set forth in this DPA. Our verified subprocessor directory is published at{' '}
              <Link href="/subprocessors" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'underline' }}>
                /subprocessors
              </Link>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              5. International Transfers &amp; Standard Contractual Clauses (SCCs)
            </h2>
            <p>
              For transfers of personal data from the EEA or UK to jurisdictions without an adequacy decision, the European Commission Standard Contractual Clauses (Decision 2021/914/EU) and UK International Data Transfer Addendum are hereby incorporated by reference.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              6. Data Subject Rights &amp; Erasure Assistance
            </h2>
            <p>
              Kavach provides tools enabling Controllers to fulfill Data Subject Access Requests (DSAR), rectifications, and erasure within our customer dashboard. Direct inquiries may be submitted to <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>privacy@kavachsecurity.me</a>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              7. Security Incident &amp; Breach Notification
            </h2>
            <p>
              In the event of a confirmed personal data breach affecting Customer data, Kavach shall notify Customer without undue delay and within 48 hours of becoming aware of the breach, providing comprehensive remediation telemetry.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              8. Executing a Countersigned Enterprise DPA
            </h2>
            <p>
              Enterprise customers requiring an individually countersigned copy of this DPA with custom schedules may email <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>privacy@kavachsecurity.me</a> with subject <code>[DPA COUNTERSIGN REQUEST]</code>.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/subprocessors" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            View Subprocessors &rarr;
          </Link>
          <Link href="/privacy" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <Link href="/trust" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
            Trust Center
          </Link>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

