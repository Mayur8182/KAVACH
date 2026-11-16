'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Terminal,
  Cpu,
  ArrowRight,
  FileCheck2,
  Users,
  Briefcase,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export default function AboutPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#team') {
        window.location.href = '/team';
      } else if (window.location.hash === '#careers') {
        window.location.href = '/careers';
      }
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: 'var(--font-sans, -apple-system, sans-serif)',
      }}
    >
      <SecuLayerHeader />

      <main
        style={{
          flex: 1,
          maxWidth: '1120px',
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(28px, 5vw, 56px) clamp(16px, 4vw, 40px) 80px',
          boxSizing: 'border-box',
          overflowWrap: 'anywhere',
        }}
      >
        {/* Header Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: '#F4F4F5',
              borderRadius: '16px',
              color: '#09090B',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            <Shield size={13} aria-hidden="true" />
            <span>Company Architecture & Mission</span>
          </div>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 800,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
              color: '#0F172A',
            }}
          >
            About Kavach Security
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Deterministic security and autonomous defense for codebases, cloud infrastructure, and AI agent swarms.
          </p>
        </div>

        {/* Core Architectural Statement */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E4E4E7',
            borderRadius: '10px',
            marginBottom: '40px',
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          <strong style={{ color: '#09090B' }}>The Architectural Golden Rule:</strong>{' '}
          <em>&quot;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&quot;</em>
          <div style={{ marginTop: '8px', color: '#64748B', fontSize: '13px' }}>
            We founded Kavach to eliminate the dangerous trend of AI wrappers pretending to be security authorities. Generative AI is probabilistic; security decisions must remain deterministic, verifiable, and backed by cryptographic proof.
          </div>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          {/* Section 1: The Problem with Probabilistic Security */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              1. Why Probabilistic AI Wrappers Fail at Security
            </h2>
            <p>
              Modern engineering organizations are deploying autonomous AI coding agents at record speed. However, most contemporary security solutions make the mistake of trusting language models as security arbiters. An LLM cannot deterministically guarantee whether a pull request introduces an SQL injection, whether an S3 bucket configuration leaks sensitive credentials, or whether an arbitrary tool invocation breaches least privilege.
            </p>
            <p style={{ marginTop: '10px' }}>
              When security decisions depend on probabilistic inference, organizations suffer from hallucinations, ignored merge gates, and unverified patch proposals. Kavach solves this fundamentally by decoupling proposal generation from authoritative security decision-making.
            </p>
          </section>

          {/* Section 2: The Deterministic Triad */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              2. The Kavach Deterministic Triad
            </h2>
            <p>
              Every security evaluation within Kavach is governed by three non-negotiable operational layers:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Terminal size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>1. Real Static & Runtime Scanners (Zero Fabricated Metrics)</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  We execute real industry-standard scanners against Abstract Syntax Trees (ASTs) — including Semgrep AST parsing, Gitleaks Shannon-entropy secret detectors, Trivy CVE vulnerability databases, and Checkov IaC validators. If 0 vulnerabilities exist, we report 0. If a scan fails, we surface the exact runtime failure reason.
                </span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>2. Deterministic OPA Policy Invariants</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  Security rules are written as declarative Open Policy Agent (OPA) Rego invariants. Policy decisions (ALLOW, BLOCK, REQUIRE_APPROVAL) are mathematically deterministic. An AI agent is never permitted to self-approve permissions, bypass merge blocking, or override defined compliance guardrails.
                </span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Cpu size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>3. Ephemeral Sandbox Verification (Autonomous AutoFix)</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  Remediations are never blind string replacements. Before an automated pull request is opened, proposed patches are compiled, tested, and re-scanned in an isolated ephemeral micro-sandbox. Only patches that measurably eliminate the vulnerability without breaking unit tests are presented for human sign-off.
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Model Context Protocol (MCP) Governance */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              3. The Model Context Protocol (MCP) Security Standard
            </h2>
            <p>
              As developer assistants like Claude, ChatGPT, Gemini, and VS Code integrate directly into corporate repositories via the Model Context Protocol, the attack surface expands into prompt injections, unauthenticated tool invocations, and unauthorized cloud mutations.
            </p>
            <p style={{ marginTop: '10px' }}>
              The Kavach MCP Gateway sits in front of all tool invocations:
            </p>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 18px',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                color: '#09090B',
                margin: '12px 0',
              }}
            >
              Agent → Tool Request → Cryptographic Identity → Authorization → OPA Rego Policy → Risk Evaluation → Human Approval Gate → Execution → Immutable Audit Ledger
            </div>
            <p>
              Every tool execution creates a verifiable record in our PostgreSQL ledger, giving security operations complete visibility into agent activities.
            </p>
          </section>

          {/* Section 4: Open Supply Chain Standards & SLSA L3 */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              4. Cryptographic Provenance & SLSA Level 3
            </h2>
            <p>
              Software supply chains demand tamper-evident provenance. Kavach automatically generates comprehensive CycloneDX Software Bills of Materials (SBOMs), checks transitive dependencies against upstream vulnerability databases (OSV, NVD), and cryptographically validates container digests prior to deployment.
            </p>
          </section>

          {/* Section 5: Company & Team Quick Navigation */}
          <section style={{ borderTop: '1px solid #E4E4E7', paddingTop: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              Explore Kavach Organization
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <Link
                href="/team"
                style={{
                  display: 'block',
                  padding: '18px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#0F172A',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#09090B')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E4E4E7')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Users size={16} color="#09090B" />
                  <strong style={{ fontSize: '14.5px' }}>Meet the Team &rarr;</strong>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Learn about our leadership, security researchers, and systems architects.
                </span>
              </Link>

              <Link
                href="/careers"
                style={{
                  display: 'block',
                  padding: '18px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#0F172A',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#09090B')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E4E4E7')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Briefcase size={16} color="#09090B" />
                  <strong style={{ fontSize: '14.5px' }}>Careers at Kavach &rarr;</strong>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                  We are hiring compiler engineers, Rust/Python kernel hackers, and security researchers.
                </span>
              </Link>

              <Link
                href="/contact"
                style={{
                  display: 'block',
                  padding: '18px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#0F172A',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#09090B')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E4E4E7')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileCheck2 size={16} color="#09090B" />
                  <strong style={{ fontSize: '14.5px' }}>Contact & Enterprise Sales &rarr;</strong>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Schedule a technical architecture walkthrough with our security team.
                </span>
              </Link>
            </div>
          </section>
        </div>

        {/* Bottom CTA Banner */}
        <div
          style={{
            marginTop: '56px',
            padding: '36px 32px',
            backgroundColor: '#09090B',
            borderRadius: '14px',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Ready to deploy deterministic security in your engineering pipeline?
          </h2>
          <p style={{ fontSize: '14px', color: '#A1A1AA', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Start free with your GitHub repositories or speak directly with our core engineering team.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                color: '#09090B',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                border: '1px solid #3F3F46',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Book an Architecture Walkthrough
            </Link>
          </div>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
