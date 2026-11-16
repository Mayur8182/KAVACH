import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Server, ShieldCheck, Globe2, CheckCircle2, Lock } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Subprocessors & Infrastructure Partners | Kavach Security',
  description:
    'List of third-party subprocessors and infrastructure partners authorized to process customer data for Kavach Security.',
  alternates: {
    canonical: '/subprocessors',
  },
};

export default function SubprocessorsPage() {
  const subprocessors = [
    {
      name: 'Amazon Web Services (AWS)',
      entity: 'Amazon Web Services, Inc.',
      purpose: 'Core cloud infrastructure, isolated micro-containers, and encrypted storage',
      location: 'US-East (N. Virginia), EU (Frankfurt), Asia-Pacific (Mumbai)',
      safeguard: 'EU Standard Contractual Clauses (SCCs), AWS DPA',
      nature: 'Infrastructure & Compute',
    },
    {
      name: 'Google Cloud Platform (GCP)',
      entity: 'Google LLC',
      purpose: 'Authentication services (Google One Tap/OAuth), developer compute clusters',
      location: 'United States, European Union, India',
      safeguard: 'Google Cloud DPA, EU SCCs, ISO 27001 certified',
      nature: 'Identity & Hosting',
    },
    {
      name: 'Google Gemini API (Enterprise)',
      entity: 'Google LLC',
      purpose: 'Remediation diff synthesis with cryptographically enforced zero data retention',
      location: 'United States, European Union',
      safeguard: 'Enterprise Zero-Data-Retention Agreement (No training on customer code)',
      nature: 'AI Security Remediation',
    },
    {
      name: 'GitHub / GitLab APIs',
      entity: 'GitHub, Inc. / GitLab, Inc.',
      purpose: 'Repository synchronization, webhook events, and automated Pull Request creation',
      location: 'Global (Customer Selected Git Host)',
      safeguard: 'OAuth 2.0 / App token permissions strictly within granted scopes',
      nature: 'SCM Integration',
    },
    {
      name: 'Supabase / Neon PostgreSQL',
      entity: 'Supabase Inc. / Neon Inc.',
      purpose: 'Relational database persistence for security findings, policies, and audit logs',
      location: 'United States, European Union',
      safeguard: 'SOC 2 Type II, ISO 27001, AES-256 encryption at rest, SCCs',
      nature: 'Database & Telemetry',
    },
    {
      name: 'Resend Technologies',
      entity: 'Resend Inc.',
      purpose: 'Transactional security notifications, password resets, and critical alerts',
      location: 'United States',
      safeguard: 'Data Privacy Framework (DPF), EU SCCs',
      nature: 'Email Dispatch',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <Server size={13} aria-hidden="true" />
            <span>GDPR Article 28 Transparency</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Verified Subprocessors Directory
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', maxWidth: '780px', lineHeight: 1.6 }}>
            Kavach Security maintains a public register of third-party subprocessors authorized to process customer data on behalf of our control plane. All partners are bound by rigorous data protection addenda and security assessments.
          </p>
        </div>

        <div style={{ padding: '18px 22px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '36px', fontSize: '13.5px', lineHeight: 1.6, color: '#334155' }}>
          <strong>Subprocessor Notification Policy:</strong> Customers are notified at least 30 calendar days in advance of any addition or replacement of an infrastructure subprocessor. Notices are published to this register and communicated to organization administrative emails.
        </div>

        <div style={{ border: '1px solid #E4E4E7', borderRadius: '10px', overflow: 'hidden', marginBottom: '40px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F4F5', color: '#09090B', fontWeight: 700, borderBottom: '1px solid #E4E4E7' }}>
                  <th style={{ padding: '12px 16px' }}>Subprocessor</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Processing Purpose</th>
                  <th style={{ padding: '12px 16px' }}>Hosting Location</th>
                  <th style={{ padding: '12px 16px' }}>Transfer Safeguard</th>
                </tr>
              </thead>
              <tbody>
                {subprocessors.map((sub, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#09090B' }}>{sub.name}</div>
                      <div style={{ fontSize: '11px', color: '#71717A' }}>{sub.entity}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#52525B', fontWeight: 500 }}>
                      {sub.nature}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', maxWidth: '280px', lineHeight: 1.5 }}>
                      {sub.purpose}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#52525B' }}>
                      {sub.location}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#047857', fontWeight: 500, fontSize: '12px' }}>
                      {sub.safeguard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/dpa" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Data Processing Agreement (DPA) &rarr;
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

