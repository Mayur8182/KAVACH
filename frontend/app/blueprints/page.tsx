import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers, ShieldCheck, CheckCircle2, GitBranch, Terminal, ArrowRight } from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export const metadata: Metadata = {
  title: 'Dynamic Security Blueprints | Kavach Security',
  description:
    'Dynamic security blueprint synthesis based on application architecture, technology stack, and compliance invariants.',
  alternates: {
    canonical: '/blueprints',
  },
};

export default function BlueprintsPage() {
  const blueprintPillars = [
    {
      title: '1. Architecture & Stack Discovery',
      desc: 'Kavach analyzes AST dependency graphs, Dockerfiles, and Terraform manifests to dynamically determine the exact technology stack (e.g. Next.js, FastAPI, PostgreSQL, Kubernetes).',
    },
    {
      title: '2. Dynamic Requirement Synthesis',
      desc: 'Instead of a static checklist, Kavach derives context-aware security requirements (e.g. JWT rotation, SQL parameterization, CSP headers, eBPF syscall filtering) tailored to the application intent.',
    },
    {
      title: '3. Deterministic Scanner Mapping',
      desc: 'Requirements automatically bind to verified scanners: Semgrep for SAST, Gitleaks for high-entropy tokens, Trivy for CVE container audits, and Checkov for IaC posture.',
    },
    {
      title: '4. Rego Gate Invariants & Enforcement',
      desc: 'Every blueprint compiles into Open Policy Agent (OPA) Rego rules enforced on CI/CD PR gates, MCP agent tool executions, and runtime deployments.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '16px', color: '#09090B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <Layers size={14} color="#09090B" />
            <span>Dynamic Security Specifications</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Enterprise Dynamic Security Blueprints
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748B', maxWidth: '820px', lineHeight: 1.6 }}>
            Rule 17 Directive: Security requirements must never be static checklists. Kavach continuously synthesizes dynamic security blueprints from repository AST, cloud topology, and data sensitivity.
          </p>
        </div>

        {/* Dynamic Blueprint Lifecycle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '44px' }}>
          {blueprintPillars.map((p, idx) => (
            <div key={idx} style={{ padding: '22px', borderRadius: '10px', border: '1px solid #E4E4E7', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#09090B', marginBottom: '8px' }}>
                {p.title}
              </div>
              <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.55, margin: 0 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Blueprint Schema Preview */}
        <section style={{ border: '1px solid #E4E4E7', borderRadius: '10px', padding: '28px', backgroundColor: '#FAFAFA', marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Live Blueprint Specification Schema
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
            Generated deterministically for each project and queryable via the MCP tool <code>get_security_blueprint(project_id)</code>:
          </p>
          <pre style={{ backgroundColor: '#09090B', color: '#F4F4F5', padding: '18px 20px', borderRadius: '8px', fontSize: '12.5px', overflowX: 'auto', margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>
{`{
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "blueprint_version": "2.4.0",
  "architecture_intent": "Enterprise Zero-Trust MCP Security Control Plane",
  "stack_fingerprint": {
    "frontend": "Next.js 16 (App Router, React 19, TypeScript)",
    "backend": "FastAPI (Python 3.13, AsyncSQLAlchemy, Pydantic v2)",
    "database": "PostgreSQL with AES-256 KMS encryption",
    "policy_engine": "Open Policy Agent (OPA Rego)",
    "runtime": "eBPF Linux Kernel Monitor"
  },
  "invariants": [
    "INV-01: No hardcoded secrets (Gitleaks verified)",
    "INV-02: Zero raw SQL concatenation (Semgrep AST verified)",
    "INV-03: CRITICAL MCP actions require human operator sign-off (OPA Rule POL-MCP-09)"
  ]
}`}
          </pre>
        </section>

        <div style={{ paddingTop: '20px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
          <Link href="/docs" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'none' }}>
            Explore Documentation &amp; MCP Tool Reference &rarr;
          </Link>
          <Link href="/governance" style={{ color: '#71717A', textDecoration: 'none' }}>
            View OPA Rego Policy Engine
          </Link>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

