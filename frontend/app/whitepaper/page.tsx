import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, Download, CheckCircle2, Terminal } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Architectural Security Whitepaper | Kavach Security',
  description:
    'Technical whitepaper on deterministic zero-trust governance, Model Context Protocol security gateways, and runtime evidence verification.',
  alternates: {
    canonical: '/whitepaper',
  },
};

export default function WhitepaperPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <FileText size={13} aria-hidden="true" />
            <span>Kavach Technical Whitepaper • Series 2026</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Deterministic Security Gateways for Autonomous AI Agents
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Authors: Kavach Security Architecture Group &bull; Publication: November 2026 &bull; Classification: Public Engineering Architecture
          </p>
        </div>

        <div style={{ padding: '22px 26px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '10px', marginBottom: '36px', fontSize: '14px', lineHeight: 1.65, color: '#334155' }}>
          <strong>Executive Summary:</strong> As autonomous coding assistants and agent swarms gain tool execution privileges via the Model Context Protocol (MCP), relying on probabilistic language models for security decisions creates severe vulnerability to indirect prompt injection, tool poisoning, and unauthorized blast radii. This whitepaper establishes a deterministic defense paradigm: <em>&quot;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&quot;</em>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              1. The Failure of Probabilistic Self-Governance
            </h2>
            <p>
              When an LLM is asked to both write code and verify whether the code complies with company security policy, the risk of sycophancy and confabulation is high. If an injection attacker embeds deceptive instructions within a repository file or API schema, the agent can be coerced into calling destructive tools. Kavach decouples reasoning from enforcement: the AI suggests patches, while an out-of-band Open Policy Agent (OPA) engine enforces non-negotiable Rego invariants.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              2. The 7-Stage Zero-Trust MCP Gateway Pipeline
            </h2>
            <p>
              Every MCP tool invocation received by Kavach traverses seven isolated security gates before execution:
            </p>
            <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li><strong>Cryptographic Identity Binding:</strong> Verifies the calling agent identity and public key signature.</li>
              <li><strong>RBAC/ABAC Principal Authorization:</strong> Ensures the tool scope matches project boundaries (prevention of Broken Object Level Authorization / BOLA).</li>
              <li><strong>Deterministic OPA Policy Evaluation:</strong> Evaluates Rego guardrails with zero bypass allowed for CRITICAL tiers.</li>
              <li><strong>Dynamic Risk Severity Assessment:</strong> Determines blast radius and assigns container isolation requirements.</li>
              <li><strong>Human-in-the-Loop Approval Check:</strong> Halts destructive actions until a designated security officer confirms.</li>
              <li><strong>Isolated Tool Execution:</strong> Runs scanners (Semgrep, Trivy, Gitleaks) inside ephemeral containers.</li>
              <li><strong>Immutable PostgreSQL Audit Trail:</strong> Records sanitized payloads with cryptographic trace IDs.</li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
              3. Empirical Validation vs. Static Checklists
            </h2>
            <p>
              Traditional compliance relies on self-reported questionnaires. Kavach enforces <em>runtime evidence</em>: an issue is only marked resolved after an automated sandbox rescan proves that the offending AST node or vulnerability signature has ceased to trigger scanner detections.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/blueprints" style={{ color: '#09090B', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Dynamic Security Blueprints &rarr;
          </Link>
          <Link href="/docs" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
            Documentation
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

