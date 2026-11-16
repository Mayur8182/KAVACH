import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Server, Terminal, CheckCircle2, Key } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Security Architecture & Practices | Kavach Security',
  description:
    'In-depth overview of Kavach platform security architecture, encryption, access controls, and zero-trust engineering.',
  alternates: {
    canonical: '/security',
  },
};

export default function SecurityOverviewPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <ShieldCheck size={14} color="#09090B" />
            <span>Platform Defense Architecture</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Kavach Security Architecture Overview
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748B', maxWidth: '820px', lineHeight: 1.6 }}>
            Kavach defends modern software organizations by combining deterministic policy guardrails, isolated scanner workers, and runtime eBPF telemetry. Here is how our architecture protects customer assets and data.
          </p>
        </div>

        {/* Golden Rule Callout */}
        <div style={{ padding: '22px 26px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '12px', marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#71717A', marginBottom: '6px' }}>
            Architectural Golden Rule
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#09090B', lineHeight: 1.5 }}>
            &ldquo;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&rdquo;
          </div>
          <p style={{ fontSize: '13.5px', color: '#52525B', margin: '8px 0 0', lineHeight: 1.6 }}>
            In our model, artificial intelligence cannot make unilateral security decisions. Critical merge gates, cloud configuration changes, and secret revocations are enforced through Open Policy Agent (OPA) Rego rules, scanner outputs, and human verification.
          </p>
        </div>

        {/* Security Architecture Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '44px' }}>
          <div style={{ padding: '24px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Lock size={20} color="#09090B" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#09090B', margin: 0 }}>Cryptographic Data Isolation</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#52525B', lineHeight: 1.6, margin: 0 }}>
              All network data in transit is encrypted using modern TLS 1.3 with forward secrecy. PostgreSQL customer telemetry and policy versions are encrypted at rest using AES-256 with KMS keys.
            </p>
          </div>

          <div style={{ padding: '24px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Server size={20} color="#09090B" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#09090B', margin: 0 }}>Worker Micro-Sandboxes</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#52525B', lineHeight: 1.6, margin: 0 }}>
              Repositories cloned for static analysis (Semgrep, Gitleaks, Trivy) run inside memory-isolated worker sandboxes with restricted network egress. All source files are wiped immediately upon scan termination.
            </p>
          </div>

          <div style={{ padding: '24px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Key size={20} color="#09090B" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#09090B', margin: 0 }}>Secret Redaction in Audit</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#52525B', lineHeight: 1.6, margin: 0 }}>
              Kavach&apos;s MCPAuditor intercepts every tool input and output payload, automatically redacting API keys, bearer tokens, and private credentials to <code>****</code> before persisting audit logs.
            </p>
          </div>

          <div style={{ padding: '24px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Terminal size={20} color="#09090B" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#09090B', margin: 0 }}>Prohibited Dangerous Permissions</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#52525B', lineHeight: 1.6, margin: 0 }}>
              Autonomous AI agents connected via MCP are strictly prohibited from receiving destructive system rights like <code>EXECUTE_SHELL</code>, <code>SECRET_READ</code>, or <code>DATABASE_DELETE</code>.
            </p>
          </div>
        </div>

        {/* Vulnerability Reporting Section */}
        <section style={{ border: '1px solid #E4E4E7', borderRadius: '10px', padding: '28px', backgroundColor: '#FAFAFA' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
            Vulnerability Reporting &amp; Security Contact
          </h2>
          <p style={{ fontSize: '13.5px', color: '#52525B', lineHeight: 1.6, margin: '0 0 16px' }}>
            To report suspected security incidents or vulnerabilities in our infrastructure, please contact our Security Engineering Response Team:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13.5px' }}>
            <div>Email: <a href="mailto:security@kavachsecurity.me" style={{ color: '#09090B', fontWeight: 600 }}>security@kavachsecurity.me</a></div>
            <div>Phone: <span style={{ color: '#09090B', fontWeight: 600 }}>+91 8780378086</span></div>
            <div>Location: <span style={{ color: '#09090B', fontWeight: 600 }}>Ahmedabad, Gujarat, India</span></div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '12.5px', color: '#71717A' }}>
            Canonical security contact details published at <code>/.well-known/security.txt</code>.
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

