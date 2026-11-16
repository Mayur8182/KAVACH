'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Code2,
  Terminal,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';

export default function TeamPage() {
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
        {/* Header Section */}
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
            <Users size={13} aria-hidden="true" />
            <span>Kavach Engineering Organization</span>
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
            Engineering Leadership & Security Researchers
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Built by systems engineers, compiler researchers, and vulnerability specialists obsessed with deterministic proof.
          </p>
        </div>

        {/* Commitment Callout */}
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
          <strong style={{ color: '#09090B' }}>The Engineering Conviction:</strong>{' '}
          We are not building another AI wrapper that bombards developers with hallucinatory alerts. We build low-overhead static analysis engines, deterministic OPA policy gates, and automated sandbox remediation pipelines that developers can trust unconditionally.
        </div>

        {/* Team Members & Research Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          {/* Section 1: Leadership & Core Architecture */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>
              1. Architecture & Systems Leadership
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Mayur Bharvad */}
              <div
                style={{
                  border: '1px solid #E4E4E7',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                      }}
                    >
                      MB
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A' }}>
                        Mayur Bharvad
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        Founder & Principal Systems Architect
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
                    Directs compiler-level reachability analysis, MCP security gateway architecture, and deterministic OPA Rego invariant engines. Focused on eliminating developer fatigue caused by false-positive security findings.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '12px', display: 'flex', gap: '14px', fontSize: '12.5px' }}>
                  <span style={{ color: '#71717A' }}>Focus:</span>
                  <strong style={{ color: '#09090B' }}>AST Analysis, OPA Engines & MCP Gateway</strong>
                </div>
              </div>

              {/* Security Research Lab */}
              <div
                style={{
                  border: '1px solid #E4E4E7',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#F4F4F5',
                        border: '1px solid #E4E4E7',
                        color: '#09090B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                      }}
                    >
                      <Shield size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A' }}>
                        Kavach Security Lab
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        Vulnerability Intelligence & Red Team Group
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
                    Engineers proprietary security invariants, container isolation runtimes, and model deserialization scanners. Actively evaluates attack surfaces in autonomous coding assistants and agent swarm toolchains.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '12px', display: 'flex', gap: '14px', fontSize: '12.5px' }}>
                  <span style={{ color: '#71717A' }}>Focus:</span>
                  <strong style={{ color: '#09090B' }}>Agent Exploitation, eBPF & Kernel Invariants</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Research Groups & Specializations */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>
              2. Core Engineering Disciplines
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Code2 size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>Compiler & AST Reachability Group</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  Constructs semantic inter-procedural call graphs across JavaScript, TypeScript, Python, Go, and Java to determine if tainted inputs can actually reach dangerous sinks. If an unsafe method cannot be called in runtime context, it is pruned from developer merge blockers.
                </span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Cpu size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>Sandbox Execution & Autonomous AutoFix Group</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  Maintains lightweight Linux micro-sandboxes that compile, execute test suites, and re-scan proposed security patches before developer review. Remediations must carry empirical proof of security before a pull request is generated.
                </span>
              </div>

              <div style={{ border: '1px solid #E4E4E7', borderRadius: '8px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Terminal size={16} color="#09090B" />
                  <strong style={{ color: '#09090B', fontSize: '14.5px' }}>Model Context Protocol (MCP) Gateway Team</strong>
                </div>
                <span style={{ color: '#64748B', fontSize: '13px' }}>
                  Implements identity authorization, tool permission enforcement, and cryptographic audit tracing for all LLM client integrations (Claude Desktop, VS Code, ChatGPT, Gemini).
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Culture & Engineering Values */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 14px', color: '#0F172A' }}>
              3. Our Engineering Principles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
              <div style={{ padding: '16px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '8px' }}>
                <strong style={{ color: '#09090B', display: 'block', marginBottom: '4px' }}>Deterministic Authority</strong>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>Security gates are governed by math, ASTs, and Rego code — never LLM confidence scores.</span>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '8px' }}>
                <strong style={{ color: '#09090B', display: 'block', marginBottom: '4px' }}>Zero Fake Success</strong>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>If a scan or sandbox fails, we state the exact failure. We never convert failures into zero findings.</span>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '8px' }}>
                <strong style={{ color: '#09090B', display: 'block', marginBottom: '4px' }}>Immutable Traceability</strong>
                <span style={{ fontSize: '12.5px', color: '#64748B' }}>Every policy check, tool call, and patch modification is recorded with timestamped audit evidence.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Join Us / Navigation */}
          <section style={{ borderTop: '1px solid #E4E4E7', paddingTop: '28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '24px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>
                  Want to build deterministic security with us?
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  We are hiring compiler engineers, Rust/Python kernel hackers, and distributed systems architects.
                </p>
              </div>
              <Link
                href="/careers"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>View Open Positions</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
