'use client';

/**
 * /sales/guided-demo — Page 26: Guided Product Demo
 * Production implementation:
 * - 8-stage interactive guided walkthrough through the REAL THING platform:
 *   1. Welcome
 *   2. Platform Overview
 *   3. Cloud Security -> links to /cloud
 *   4. Code Security -> links to /code/sast
 *   5. Supply Chain -> links to /code/sbom
 *   6. Runtime Security -> links to /protect
 *   7. Reporting -> links to /cloud/evidence
 *   8. Q&A -> links to /sales/security-expert
 * - Step completion state persisted in database via /api/v1/sales/guided-demo/step-complete
 * - Zero static placeholders; fully interactive step-by-step guidance
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Server,
  Code2,
  Layers,
  Cpu,
  FileText,
  HelpCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function GuidedDemoPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      num: 1,
      id: 'welcome',
      title: 'Welcome',
      tagline: 'Introduction to the Kavach Security Control Plane',
      desc: 'Understand how Kavach provides deterministic security guarantees across code repositories, multi-cloud infrastructure, and autonomous AI agent toolchains.',
      keyTopics: [
        'Unified security platform architecture',
        'Deterministic OPA policy gates vs. LLM-based proposals',
        'Cryptographic audit trails and verifiable runtime evidence',
        'Zero-trust MCP agent gateway model',
      ],
      targetUrl: '/sales/demo-workspace',
      targetLabel: 'Explore Demo Workspace',
    },
    {
      num: 2,
      id: 'platform_overview',
      title: 'Platform Overview',
      tagline: 'Architecture & Real-Time Telemetry Dashboard',
      desc: 'Gain bird-eye visibility into your enterprise security posture with live security scores, active asset inventory, and cross-plane vulnerability correlation.',
      keyTopics: [
        'Global posture metrics and threat scoring',
        'Real-time asset discovery across AWS, GCP, Azure, and Git',
        'Centralized policy enforcement dashboard',
        'Unified findings feed with auto-remediation triggers',
      ],
      targetUrl: '/code',
      targetLabel: 'Open Code Overview',
    },
    {
      num: 3,
      id: 'cloud_security',
      title: 'Cloud Security',
      tagline: 'Multi-Cloud CSPM & Kubernetes Defense',
      desc: 'Continuous posture assessment, attack path mapping, IAM least-privilege analysis, and CIS benchmark compliance for AWS, Azure, and GCP.',
      keyTopics: [
        'Multi-cloud CSPM scanning without agents',
        'Identity & Access Management (IAM) blast radius analysis',
        'Kubernetes pod security standards and admission controls',
        'Storage bucket public exposure and encryption audits',
      ],
      targetUrl: '/cloud',
      targetLabel: 'Launch Cloud Security (CSPM)',
    },
    {
      num: 4,
      id: 'code_security',
      title: 'Code Security',
      tagline: 'High-Precision SAST, Secrets Detection & Quality Gates',
      desc: 'Sub-minute static application security testing integrated into Git pull requests with zero-false-positive quality gates and AI-suggested deterministic patches.',
      keyTopics: [
        'Deterministic AST-based Semgrep rule execution',
        'High-entropy secret detection for 150+ token formats',
        'PR blocking and developer guardrails',
        'Automated fix generation with diff verification',
      ],
      targetUrl: '/code/sast',
      targetLabel: 'Launch Code Security (SAST)',
    },
    {
      num: 5,
      id: 'supply_chain',
      title: 'Supply Chain',
      tagline: 'Software Bill of Materials (SBOM) & Dependency CVEs',
      desc: 'Automated generation of CycloneDX and SPDX SBOMs, monitoring of open-source libraries, and quarantine of poisoned upstream packages.',
      keyTopics: [
        'Automated CycloneDX SBOM export',
        'Transitive dependency vulnerability graph traversal',
        'Malicious package & backdoor detection (e.g. CVE-2024-3094)',
        'License compliance and intellectual property defense',
      ],
      targetUrl: '/code/sbom',
      targetLabel: 'Launch Supply Chain & SBOM',
    },
    {
      num: 6,
      id: 'runtime_security',
      title: 'Runtime Security',
      tagline: 'Autonomous AI Agent Governance & MCP Gateway',
      desc: 'Intercept every tool invocation from autonomous coding agents and LLM agents with strict authorization, risk scoring, and deterministic OPA policy enforcement.',
      keyTopics: [
        'Model Context Protocol (MCP) tool invocation interception',
        'Prompt injection & privilege escalation blocking',
        'Cryptographic tool execution signing with HSM keys',
        'Deterministic ALLOW / BLOCK policy enforcement engine',
      ],
      targetUrl: '/protect',
      targetLabel: 'Launch Runtime Protect Engine',
    },
    {
      num: 7,
      id: 'reporting',
      title: 'Reporting',
      tagline: 'Audit-Ready Compliance Evidence & Reports',
      desc: 'Continuous compliance evidence harvesting mapped to SOC2 Type II, FedRAMP, ISO 27001, and HIPAA with cryptographic tamper-evident proofs.',
      keyTopics: [
        'One-click SOC2 and FedRAMP audit pack generation',
        'Cryptographic hash verification of security logs',
        'Executive scorecards and trend analysis',
        'Exportable PDF & JSON compliance documentation',
      ],
      targetUrl: '/cloud/evidence',
      targetLabel: 'Launch Audit Evidence Vault',
    },
    {
      num: 8,
      id: 'qa',
      title: 'Q&A & Evaluation',
      tagline: 'Next Steps: Request Custom POC or Consult an Architect',
      desc: 'Connect with a senior security architect for architecture reviews or initiate an enterprise POC in your dedicated enclave.',
      keyTopics: [
        '1:1 advisory consultation with Principal Security Architects',
        'Scoping 30-day proof-of-concept environment',
        'Custom OPA policy rule authoring',
        'Commercial proposal and enterprise quote generation',
      ],
      targetUrl: '/sales/poc-request',
      targetLabel: 'Request Dedicated Customer POC',
    },
  ];

  const activeStepData = steps[currentStep - 1];

  const handleNext = async () => {
    // Record step completion in DB
    try {
      await api.sales.completeGuidedStep({ step_id: activeStepData.id });
      setCompletedSteps((prev) => Array.from(new Set([...prev, activeStepData.id])));
    } catch (err) {
      console.error('Failed to record guided step', err);
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Guided Product Demo" activeStepKey="demo" />

      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Top Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Guided Product Demo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <PlayCircle size={15} />
                <span>PAGE 26 &bull; STEP-BY-STEP INTERACTIVE PRODUCT TOUR</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Guided Product Demo
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Explore every layer of the platform with contextual walkthroughs and direct live module access.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Guided Layout (Page 26 Layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '32px' }}>
          
          {/* Left Step List */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', height: 'fit-content' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', padding: '0 8px' }}>
              Tour Steps (8)
            </div>
            {steps.map((st) => {
              const isCurrent = currentStep === st.num;
              const isDone = completedSteps.includes(st.id);
              return (
                <button
                  key={st.num}
                  onClick={() => setCurrentStep(st.num)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isCurrent ? '#EFF6FF' : 'transparent',
                    color: isCurrent ? '#2563EB' : '#334155',
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? '#DCFCE7' : isCurrent ? '#2563EB' : '#F1F5F9',
                      color: isDone ? '#16A34A' : isCurrent ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    {isDone ? <Check size={14} /> : st.num}
                  </div>
                  <span>{st.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right Active Step Presentation Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Interactive Showcase Card */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                <span>STEP {activeStepData.num} OF {steps.length}</span>
                <span>&bull;</span>
                <span>{activeStepData.tagline}</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px', color: '#0F172A' }}>
                {activeStepData.title}
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
                {activeStepData.desc}
              </p>

              {/* Key Topics Checklist */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '28px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>Key Topics Covered</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {activeStepData.keyTopics.map((topic, tIdx) => (
                    <div key={tIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                      <CheckCircle2 size={15} color="#2563EB" />
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button to launch live module */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <Link
                  href={activeStepData.targetUrl}
                  target="_blank"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>{activeStepData.targetLabel}</span>
                  <ExternalLink size={14} />
                </Link>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handlePrev}
                    disabled={currentStep === 1}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: currentStep === 1 ? '#CBD5E1' : '#334155',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{currentStep === steps.length ? 'Finish Tour' : 'Next'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
