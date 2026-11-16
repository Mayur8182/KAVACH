import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy & Authorized Testing Scope | Kavach Security',
  description:
    'Permitted automated security scanning parameters, target asset ownership verification, and prohibited activities for Kavach Security.',
  alternates: {
    canonical: '/acceptable-use',
  },
};

export default function AcceptableUsePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <ShieldAlert size={13} aria-hidden="true" />
            <span>Defensive Security Policy</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Acceptable Use Policy (AUP)
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Last revised: November 2026 • Policy Version: 2026.5 • Authorized Testing Parameters
          </p>
        </div>

        <div style={{ padding: '20px 24px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '36px', fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
          Kavach Security is a defensive cybersecurity and automated remediation platform. This Acceptable Use Policy defines the parameters under which customers and authorized agents may utilize our scanners, eBPF probes, and MCP gateway tools.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              1. Ownership Verification &amp; Permitted Target Boundaries
            </h2>
            <p>
              Users are strictly permitted to configure automated scans, DAST payloads, container audits, and secret detection <strong>only against digital assets, git repositories, and cloud workloads that they own or hold explicit written authorization to test</strong>.
            </p>
            <p>
              Pointing Kavach scanners or MCP automated agents at third-party domains, cloud tenancies, or git repositories without verifiable administrative ownership is strictly prohibited and results in immediate account suspension.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              2. Prohibited Offensive &amp; Disruptive Activities
            </h2>
            <p>
              The following activities constitute a direct violation of Kavach platform terms:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Denial of Service (DoS):</strong> Conducting high-volume stress testing or volumetric floods intended to degrade infrastructure availability.</li>
              <li><strong>Credential Exfiltration:</strong> Using MCP tools or custom scanner scripts to harvest or exfiltrate private passwords, SSH keys, or cloud access secrets outside authorized audit logging.</li>
              <li><strong>Policy Engine Circumvention:</strong> Attempting to tamper with, forge, or disable OPA Rego deterministic merge gates or approval requirements for CRITICAL actions.</li>
              <li><strong>Malicious Code Injection:</strong> Submitting malicious payloads or deceptive remediation PRs designed to introduce backdoors into repositories.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              3. Coordinated Vulnerability Disclosure (Safe Harbor)
            </h2>
            <p>
              We welcome good-faith security research into the Kavach Control Plane. If you discover a vulnerability in our platform, we commit to safe harbor protections provided you:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>Promptly notify us at <a href="mailto:security@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>security@kavachsecurity.me</a> before public disclosure.</li>
              <li>Do not access or modify customer data without authorization.</li>
              <li>Give our engineering team reasonable time to remediate the vulnerability.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              4. Enforcement &amp; Violation Reporting
            </h2>
            <p>
              If you suspect unauthorized scanning or abuse originating from Kavach IP ranges or agents, please immediately contact <a href="mailto:security@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>security@kavachsecurity.me</a>. We investigate all telemetry and terminate abusive accounts within 24 hours.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/terms" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Terms of Service &rarr;
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

