import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ShieldAlert, CheckCircle2, Lock, FileText, Database, UserCheck, AlertTriangle } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy & Data Protection Commitment | Kavach',
  description:
    'Kavach zero-trust privacy commitment. Customer source code, secrets, and telemetry are never used to train foundation models. GDPR, CCPA, and SOC 2 Type II compliant with data deletion rights.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Kavach',
    description:
      'Zero model training on customer code, TLS 1.3 encryption, GDPR/CCPA data deletion rights, and deterministic governance.',
    url: 'https://kavachsecurity.me/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1120px', width: '100%', margin: '0 auto', padding: 'clamp(28px, 5vw, 56px) clamp(16px, 4vw, 40px) 80px', boxSizing: 'border-box', overflowWrap: 'anywhere' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <Shield size={13} aria-hidden="true" />
            <span>Kavach Trust, Privacy & Ethics Center</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Privacy Policy & Data Protection
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Last revised: November 2026 • Policy Version: 2026.5 • Statutory Framework: GDPR, UK GDPR, CCPA/CPRA, India DPDP Act 2023 • Architecture Aligned with SOC 2 &amp; ISO 27001 Readiness
          </p>
        </div>

        <div style={{ padding: '20px 24px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '40px', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
          <strong>Core Trust Commitment:</strong> Kavach is architected on the immutable principle: <em>&quot;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&quot;</em> We do <strong>not</strong> train proprietary or public foundation models on your source code, infrastructure declarations, secrets, or security telemetry.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          {/* Section 1: Data We Collect & Why */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              1. Information We Collect & Exact Purpose of Collection
            </h2>
            <p>
              We adhere strictly to data minimization (GDPR Article 5(1)(c)). We only collect data necessary to provide automated vulnerability detection, cryptographic verification, and compliance evidence:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '14px 18px', backgroundColor: '#FFFFFF' }}>
                <strong style={{ color: '#09090B' }}>• Account & Identity Data:</strong> Name, work email address, GitHub/GitLab user identifier, and role-based permissions.
                <br />
                <span style={{ color: '#71717A', fontSize: '13px' }}><strong>Why we collect it:</strong> To authenticate team members, enforce least-privilege role boundaries (RBAC), and maintain cryptographic audit logs of security actions.</span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '14px 18px', backgroundColor: '#FFFFFF' }}>
                <strong style={{ color: '#09090B' }}>• Repository & Abstract Syntax Trees (AST):</strong> File paths, dependency lockfiles (package.json, go.sum), IaC templates (Terraform, K8s), and code snippets containing detected vulnerabilities.
                <br />
                <span style={{ color: '#71717A', fontSize: '13px' }}><strong>Why we collect it:</strong> To run local deterministic scanners (Semgrep, Trivy, Gitleaks, Checkov) and calculate vulnerability severity and remediation diffs.</span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '14px 18px', backgroundColor: '#FFFFFF' }}>
                <strong style={{ color: '#09090B' }}>• Cloud & Infrastructure Telemetry:</strong> Cloud resource identifiers, IAM role structures, S3 bucket encryption configurations, and security group rules via read-only cloud APIs.
                <br />
                <span style={{ color: '#71717A', fontSize: '13px' }}><strong>Why we collect it:</strong> To identify cloud misconfigurations (CSPM), verify encryption-at-rest policies, and detect drift from security blueprints.</span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '14px 18px', backgroundColor: '#FFFFFF' }}>
                <strong style={{ color: '#09090B' }}>• AI Agent & MCP Audit Trail:</strong> Tool invocation arguments, policy evaluation results (OPA Rego), approving user IDs, and verification execution logs.
                <br />
                <span style={{ color: '#71717A', fontSize: '13px' }}><strong>Why we collect it:</strong> To provide immutable, tamper-evident SLSA Level 3 audit records required for SOC 2 Type II and ISO 27001 certifications.</span>
              </div>
            </div>
          </section>

          {/* Section 2: Strict Zero AI Retention & IP Ownership */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              2. Zero AI Training & Customer Intellectual Property Ownership
            </h2>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Zero Foundation Model Training:</strong> Your source code, diffs, scan findings, and prompts are NEVER transmitted to third-party public AI training pools.</li>
              <li><strong>Customer Retains 100% IP:</strong> You own all proprietary source code, software repositories, remediation patches, pull requests, and security blueprints generated on Kavach. Kavach claims zero copyright or IP rights over patches generated for your codebase.</li>
              <li><strong>Isolated Ephemeral Processing:</strong> Static code analysis runs inside isolated worker containers that are immediately wiped following scan completion.</li>
            </ul>
          </section>

          {/* Section 3: Data Retention Schedule & Erasure Rights */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              3. Data Retention Schedule &amp; Erasure Rights (GDPR / CCPA / DPDP)
            </h2>
            <p>
              To eliminate ambiguity, Kavach publishes a strict category-by-category data retention schedule:
            </p>
            <div style={{ overflowX: 'auto', margin: '14px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #E4E4E7' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F4F4F5', textAlign: 'left', color: '#09090B' }}>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E7' }}>Data Category</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E7' }}>Storage Medium</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E7' }}>Retention Duration</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E7' }}>Purge Mechanism</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#09090B' }}>Source Code Repositories</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Isolated Ephemeral Container / tmpfs</td>
                    <td style={{ padding: '10px 14px', color: '#047857', fontWeight: 600 }}>0 Days (Immediate)</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Container destroyed immediately on scan completion</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#09090B' }}>Vulnerability Findings &amp; AST Snippets</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>PostgreSQL (AES-256 encrypted)</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Active subscription life or custom team policy</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Purgeable on-demand or upon project deletion</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#09090B' }}>LLM Inference Payloads</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>In-flight TLS 1.3 memory buffers</td>
                    <td style={{ padding: '10px 14px', color: '#047857', fontWeight: 600 }}>0 Days (Zero-Data-Retention)</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Enterprise API zero-retention contract; never stored</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#09090B' }}>Account Deletion / DSAR Purge</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Primary database &amp; encrypted backups</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Max 30 calendar days</td>
                    <td style={{ padding: '10px 14px', color: '#52525B' }}>Cryptographic key rotation and table row deletion</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Under GDPR Articles 16 &amp; 17, California Consumer Privacy Act (CCPA/CPRA), and DPDP Act 2023, you have the right to inspect, correct, export, or permanently delete your personal information and organization data:
            </p>
            <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FAFAFA', marginTop: '10px' }}>
              <div style={{ fontWeight: 700, color: '#09090B', marginBottom: '6px' }}>How to Request Data Deletion or Account Erasure:</div>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#52525B' }}>
                1. Submit a formal request via email to{' '}
                <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'underline' }}>
                  privacy@kavachsecurity.me
                </a>{' '}
                with the subject line <code>[DATA ERASURE REQUEST] - Organization Name</code>.
                <br />
                2. Alternatively, organization owners can initiate immediate project decommission in <strong>Settings → Danger Zone → Delete Project &amp; Purge Scans</strong>.
                <br />
                3. <strong>SLA Commitment:</strong> We acknowledge erasure requests within 48 business hours and complete full cryptographic purging across all production replicas and cold backups within 30 days.
              </p>
              <div style={{ fontWeight: 700, color: '#09090B', marginBottom: '6px' }}>How to Correct Inaccurate Data:</div>
              <p style={{ margin: 0, fontSize: '13px', color: '#52525B' }}>
                Email{' '}
                <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'underline' }}>
                  privacy@kavachsecurity.me
                </a>{' '}
                with <code>[DATA RECTIFICATION REQUEST]</code> and details of the erroneous information.
              </p>
            </div>
          </section>

          {/* Section 4: Cookie Policy & Consent */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              4. Cookie Policy & Consent Requirements
            </h2>
            <p>
              Kavach deploys strictly essential authentication and security tokens (e.g., JWT session tokens and CSRF guards). We do <strong>not</strong> operate advertising or marketing tracking cookies. Detailed descriptions of all tokens are available on our dedicated{' '}
              <Link href="/cookies" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'underline' }}>
                Cookie Policy Page
              </Link>.
            </p>
          </section>

          {/* Section 5: Third-Party APIs & Service Providers */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              5. Third-Party Integrations & Terms of Use Compliance
            </h2>
            <p>
              Kavach interacts strictly with third-party providers in compliance with their respective API Developer Terms and Acceptable Use Policies:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>GitHub & GitLab:</strong> Read-only repository access via OAuth GitHub Apps strictly within user-granted scope boundaries.</li>
              <li><strong>Cloud Providers (AWS, Azure, GCP):</strong> Read-only SecurityAudit and CSPM IAM roles with least-privilege configurations.</li>
              <li><strong>LLM Inference Enclaves:</strong> Zero-data-retention enterprise API endpoints with cryptographically enforced confidentiality agreements.</li>
            </ul>
          </section>

          {/* Section 6: Open Source Dependencies & Asset Licensing */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              6. Open Source Dependencies, Attribution & UI Asset Licensing
            </h2>
            <p>
              Kavach incorporates and respects open-source security tools and libraries in full compliance with their respective open source licenses:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Static Analysis Tools:</strong> Semgrep (LGPL 2.1), Trivy (Apache 2.0), Checkov (Apache 2.0), Open Policy Agent (Apache 2.0), and OSV (CC-BY 4.0).</li>
              <li><strong>Interface Assets:</strong> Lucide Icons (ISC License), Inter Font Family (SIL Open Font License 1.1). No proprietary copyrighted logos or uncredited third-party graphics are used without explicit authorization.</li>
            </ul>
          </section>

          {/* Section 7: Age Restrictions */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              7. Age Restrictions (18+ Enterprise Service)
            </h2>
            <p>
              Kavach is an enterprise B2B developer security platform. It is not intended for use by individuals under 18 years of age (or under 16 years where statutory provisions allow). We do not knowingly solicit or collect personal information from minors.
            </p>
          </section>

          {/* Section 8: Disclaimer for High-Risk Advice */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              8. Disclaimers for High-Risk Security Advice & Automated Remediations
            </h2>
            <div style={{ border: '1px solid #F59E0B', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFBEB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#D97706" />
                <span style={{ fontWeight: 700, color: '#92400E' }}>Important Engineering Notice</span>
              </div>
              <p style={{ margin: 0, color: '#B45309', fontSize: '13px', lineHeight: 1.6 }}>
                Security findings, risk scores, auto-fix proposals, and architectural recommendations provided by Kavach are advisory engineering analyses. In accordance with our Golden Rule, deterministic security engines (OPA, build test suites, compiler checks) and human engineer reviews must validate all proposed changes prior to production deployment. Kavach is not a substitute for formal professional legal or regulatory counsel.
              </p>
            </div>
          </section>

          {/* Section 9: Data Protection Officer Contact */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
              9. Data Protection Officer &amp; Privacy Grievance Redressal
            </h2>
            <p>
              In accordance with GDPR Article 37 and India&apos;s Digital Personal Data Protection (DPDP) Act 2023, you may contact our designated Data Protection &amp; Grievance Officer for privacy audits, Data Processing Agreements (DPA), Standard Contractual Clauses (SCC), or data rights fulfillment:
              <br /><br />
              <strong>Kavach Security Privacy &amp; Data Protection Office</strong><br />
              Attn: Data Protection &amp; Grievance Officer<br />
              Email: <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>privacy@kavachsecurity.me</a><br />
              Location &amp; Jurisdiction: Ahmedabad, Gujarat, India<br />
              Response SLA: Formal acknowledgment within 48 business hours; full request completion within 30 calendar days.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/terms" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Terms of Service →
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
