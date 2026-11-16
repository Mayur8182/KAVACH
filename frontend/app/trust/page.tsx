import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, CheckCircle2, Server, Globe2, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Trust & Security Center | Kavach Security',
  description:
    'Security controls, deterministic governance, compliance roadmap, and encryption standards for Kavach Security.',
  alternates: {
    canonical: '/trust',
  },
};

export default function TrustCenterPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <ShieldCheck size={14} color="#09090B" />
            <span>Kavach Trust &amp; Governance Center</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Trust, Security &amp; Compliance Center
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748B', maxWidth: '820px', lineHeight: 1.6 }}>
            Our deterministic security platform is built with rigorous operational controls, transparent data processing, and independent verification. Explore our security posture, compliance roadmap, and customer data protections.
          </p>
        </div>

        {/* Operating Entity & Location Banner */}
        <div style={{ padding: '18px 22px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '36px', fontSize: '13.5px', lineHeight: 1.6, color: '#334155' }}>
          <div style={{ fontWeight: 700, color: '#09090B', marginBottom: '4px' }}>Operating Legal Entity &amp; Jurisdiction:</div>
          <div><strong>Kavach Security</strong> &bull; Principal Center: Ahmedabad, Gujarat, India &bull; Governing Law: Laws of the Republic of India</div>
          <div style={{ color: '#71717A', fontSize: '12.5px', marginTop: '4px' }}>Privacy &amp; Data Inquiries: <code>privacy@kavachsecurity.me</code> &bull; Security Reports: <code>security@kavachsecurity.me</code></div>
        </div>

        {/* 4 Pillars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          <div style={{ padding: '22px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Lock size={18} color="#09090B" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#09090B' }}>Zero AI Training</span>
            </div>
            <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.55, margin: 0 }}>
              Customer source code, pull request diffs, and security findings are NEVER used to train foundation models or pooled into shared buffers.
            </p>
          </div>

          <div style={{ padding: '22px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Server size={18} color="#09090B" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#09090B' }}>Ephemeral Containers</span>
            </div>
            <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.55, margin: 0 }}>
              Scans run in isolated worker micro-sandboxes. Workspaces and repository trees are unlinked and wiped immediately upon scan completion.
            </p>
          </div>

          <div style={{ padding: '22px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={18} color="#09090B" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#09090B' }}>Deterministic Engine</span>
            </div>
            <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.55, margin: 0 }}>
              Authorization, merge gates, and policy rules evaluate via Open Policy Agent (OPA) Rego rules. No probabilistic hallucinated pass rates.
            </p>
          </div>

          <div style={{ padding: '22px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Globe2 size={18} color="#09090B" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#09090B' }}>Cryptographic Proof</span>
            </div>
            <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.55, margin: 0 }}>
              All MCP tool executions and policy evaluations generate immutable Ed25519/SHA-256 audit trace events persisted directly in PostgreSQL.
            </p>
          </div>
        </div>

        {/* Compliance Roadmap & Status */}
        <section style={{ marginBottom: '44px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 16px', color: '#0F172A' }}>
            Compliance Standards &amp; Audit Roadmap
          </h2>
          <div style={{ border: '1px solid #E4E4E7', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F4F5', textAlign: 'left', color: '#09090B' }}>
                  <th style={{ padding: '12px 18px', borderBottom: '1px solid #E4E4E7' }}>Standard / Framework</th>
                  <th style={{ padding: '12px 18px', borderBottom: '1px solid #E4E4E7' }}>Status</th>
                  <th style={{ padding: '12px 18px', borderBottom: '1px solid #E4E4E7' }}>Implementation Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#09090B' }}>SOC 2 Type II</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      Audit in Progress
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#52525B' }}>Controls architected against Trust Services Criteria (Security, Availability, Confidentiality). Formal CPA audit engagement underway.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#09090B' }}>ISO/IEC 27001:2022</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      Audit in Progress
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#52525B' }}>Information Security Management System (ISMS) policies, risk assessment register, and Annex A controls implemented.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#09090B' }}>SLSA Level 3 Build Provenance</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857' }}>
                      Architecture Aligned
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#52525B' }}>Cryptographic build provenance, immutable container signatures, and isolated execution pipelines.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#09090B' }}>EU GDPR &amp; UK GDPR</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857' }}>
                      Compliant Readiness
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#52525B' }}>Article 28 Data Processing Addendum (DPA) available, Standard Contractual Clauses (SCCs), and full Data Subject Access Rights (DSAR).</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 18px', fontWeight: 600, color: '#09090B' }}>India DPDP Act 2023</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857' }}>
                      Compliant Readiness
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: '#52525B' }}>Designated Privacy Grievance Officer, strict purpose limitation, consent records, and data erasure fulfillment.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Legal & Trust Quicklinks */}
        <section style={{ borderTop: '1px solid #E4E4E7', paddingTop: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>
            Legal Agreements &amp; Security Documents
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Data Processing Agreement (DPA)', href: '/dpa' },
              { label: 'Verified Subprocessors List', href: '/subprocessors' },
              { label: 'Security Architecture Overview', href: '/security' },
              { label: 'Terms of Service & MSA', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Acceptable Use Policy', href: '/acceptable-use' },
              { label: 'Operational System Status', href: '/status' },
              { label: 'Security Whitepaper', href: '/whitepaper' },
            ].map((doc) => (
              <Link
                key={doc.label}
                href={doc.href}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E4E4E7',
                  backgroundColor: '#FAFAFA',
                  color: '#09090B',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 150ms',
                }}
              >
                <span>{doc.label}</span>
                <span style={{ color: '#71717A' }}>&rarr;</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

