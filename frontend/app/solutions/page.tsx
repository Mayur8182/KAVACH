'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Bot,
  Boxes,
  Cloud,
  FileCheck,
  Cpu,
  ArrowRight,
  Sparkles,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';

const SOLUTIONS = [
  {
    icon: Bot,
    title: 'Autonomous AI Agent Governance',
    subtitle: 'Safeguard agentic coding assistants without hindering development velocity.',
    desc: 'Autonomous coding agents make multi-file modifications and invoke command-line tools. SecuLayer wraps every agent with deterministic OPA contracts, sandboxed syscall execution, and human-in-the-loop approvals for privileged operations.',
    features: [
      'MCP tool-level authorization gateway',
      'Immutable cryptographic audit events for every patch',
      'Automated semantic diff inspection before merge',
      'Zero unauthorized cloud infrastructure modifications',
    ],
    cta: 'Explore Agent Governance',
    href: '/agent',
  },
  {
    icon: Boxes,
    title: 'Software Supply Chain & SLSA Provenance',
    subtitle: 'Cryptographic proof of origin from commit to container registry.',
    desc: 'Verify the integrity of third-party open-source dependencies and internal build artifacts. Automatically generate CycloneDX SBOMs and enforce SLSA Level 3 provenance checks on every container build.',
    features: [
      'Automated SBOM generation (Syft & CycloneDX)',
      'Known CVE discovery via OSV & Trivy',
      'Dependency confusion & typosquatting detection',
      'Cryptographic signature validation on deployment',
    ],
    cta: 'View Build Security',
    href: '/code/jobs',
  },
  {
    icon: Cloud,
    title: 'Multi-Cloud Infrastructure & IaC Security',
    subtitle: 'Detect misconfigurations and privilege escalation paths before production deployment.',
    desc: 'Scan Terraform, AWS CloudFormation, Helm charts, and Kubernetes manifests against CIS benchmarks. Reconcile runtime state against declared security blueprints to eliminate configuration drift.',
    features: [
      'Static IaC policy evaluation via Checkov & OPA',
      'IAM blast radius analysis and excessive permission pruning',
      'Automated S3 bucket and firewall remediations',
      'Unified visibility across AWS, Azure, GCP, and Kubernetes',
    ],
    cta: 'Explore Cloud Security',
    href: '/cloud',
  },
  {
    icon: FileCheck,
    title: 'Continuous Compliance & Audit Readiness',
    subtitle: 'Pass SOC2 Type II, ISO 27001, and HIPAA audits without manual screenshot gathering.',
    desc: 'Turn dynamic runtime evidence into audit-ready compliance packages. Every policy decision, vulnerability scan, and deployment gate is immutably persisted with traceable timestamps and actor verification.',
    features: [
      'Continuous compliance control mapping',
      'Single-click exportable auditor evidence packets',
      'Automated change management audit trails',
      'Separation of duties & least-privilege verification',
    ],
    cta: 'View Compliance Blueprint',
    href: '/governance',
  },
];

export default function SolutionsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      {/* Hero Header */}
      <section style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: '#EFF6FF', borderRadius: '16px', color: '#2563EB', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
            <Sparkles size={14} />
            <span>Deterministic Security Across the SDLC</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.03em', color: '#0F172A', lineHeight: 1.2 }}>
            Engineered Solutions for Modern Engineering Teams
          </h1>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '680px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            From AI coding agent boundaries to multi-cloud runtime defense, SecuLayer provides verifiable, evidence-backed security controls.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/onboarding"
              style={{
                padding: '11px 24px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
            >
              Start Free Onboarding →
            </Link>
            <Link
              href="/platform"
              style={{
                padding: '11px 22px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#94A3B8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              Explore Live Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Solutions Cards Section */}
      <section style={{ maxWidth: '1060px', margin: '56px auto', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {SOLUTIONS.map((sol, index) => {
            const Icon = sol.icon;

            return (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
                  gap: '32px',
                  alignItems: 'center',
                  padding: '32px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
                className="solution-card-grid"
              >
                <div>
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Icon size={22} />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {sol.title}
                  </h2>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB', margin: '0 0 10px' }}>
                    {sol.subtitle}
                  </p>
                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: '0 0 18px' }}>
                    {sol.desc}
                  </p>
                  <Link
                    href={sol.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#2563EB',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{sol.cta}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: '0 0 14px' }}>
                    Key Platform Capabilities
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sol.features.map((feat, fIdx) => (
                      <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                          ✓
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '56px 24px', textAlign: 'center', marginTop: 'auto' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Ready to secure your engineering workflows?
          </h2>
          <p style={{ fontSize: '15px', color: '#94A3B8', margin: '0 0 28px' }}>
            Complete the 6-step onboarding wizard in less than 2 minutes. Real database persistence, real scans.
          </p>
          <Link
            href="/onboarding"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <span>Launch SecuLayer Onboarding</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
