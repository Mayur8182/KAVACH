'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Lock,
  GitPullRequest,
  Check,
  FileCode,
  Layers,
  Terminal,
  Activity,
  Sparkles,
  ExternalLink,
  Pause,
} from 'lucide-react';

interface WorkflowStepInfo {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  badge: string;
}

const WORKFLOW_STEPS: WorkflowStepInfo[] = [
  {
    id: 'connect',
    number: '01',
    title: 'Connect repository',
    subtitle: 'GitHub repository selected & branch protection audited',
    badge: 'Step 1 of 5',
  },
  {
    id: 'analyze',
    number: '02',
    title: 'Analyze codebase',
    subtitle: 'SAST AST taint flow, Gitleaks secrets & Trivy SCA analysis',
    badge: 'Step 2 of 5',
  },
  {
    id: 'discover',
    number: '03',
    title: 'Prioritize findings',
    subtitle: 'Potential SQL injection detected in auth/route.py',
    badge: 'Step 3 of 5',
  },
  {
    id: 'remediate',
    number: '04',
    title: 'Generate remediation',
    subtitle: 'Deterministic parameterized patch & regression test suite',
    badge: 'Step 4 of 5',
  },
  {
    id: 'secure',
    number: '05',
    title: 'Secure deployment',
    subtitle: 'CI/CD pipeline policy checks & GATED approval verification',
    badge: 'Step 5 of 5',
  },
];

export const ScrollProductWorkflow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Continuous Autoplay Workflow Loop (User does not have to click manually)
  useEffect(() => {
    if (!isAutoPlaying) return;

    const intervalMs = 50;
    const stepDurationMs = 4200; // 4.2 seconds per step for optimal comprehension
    const increment = (intervalMs / stepDurationMs) * 100;

    const timer = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((curr) => (curr + 1) % WORKFLOW_STEPS.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Scroll Progress Calculation for Scrollytelling
  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Only calculate progress once section is active in view
      const totalDistance = rect.height - windowHeight;
      if (totalDistance <= 0) return;

      const progress = (-rect.top + 80) / totalDistance;
      if (progress >= 0 && progress <= 1) {
        const clamped = Math.max(0, Math.min(0.999, progress));
        const step = Math.min(4, Math.floor(clamped * 5));
        setActiveStep(step);
        setStepProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setStepProgress(0);
    if (!isMobile && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const totalDistance = rect.height - window.innerHeight;
      const targetY = window.pageYOffset + rect.top - 80 + (index / 5) * totalDistance + 20;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    handleStepClick((activeStep + 1) % WORKFLOW_STEPS.length);
  };

  const handlePrev = () => {
    handleStepClick(activeStep > 0 ? activeStep - 1 : WORKFLOW_STEPS.length - 1);
  };

  const handleReplay = () => {
    handleStepClick(0);
    setIsAutoPlaying(true);
  };

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: '96px 0 0 0',
      }}
    >
      {/* ── Section Header ── */}
      <div
        style={{
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '0 24px 36px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #DBEAFE',
            }}
          >
            SecuLayer Control Plane · Workflow Preview
          </span>
          <span
            style={{
              fontSize: '13px',
              color: '#475569',
            }}
          >
            Illustrative product walkthrough — actual security scan is executed in-app
          </span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 14px 0',
          }}
        >
          From repository connection to verified safe deployment
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#475569',
            lineHeight: 1.6,
            maxWidth: '780px',
            margin: 0,
          }}
        >
          Experience how SecuLayer continuously audits source code, isolates vulnerabilities with
          deterministic AST taint analysis, and validates remediations with verifiable evidence.
        </p>
      </div>

      {/* ── Main Scrollytelling Container (Real in-flow height for sticky scroll) ── */}
      <div
        style={{
          position: 'relative',
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '0 24px',
          minHeight: isMobile ? 'auto' : '260vh',
        }}
      >
        {/* Sticky Product Demo Stage */}
        <div
          style={{
            position: isMobile ? 'relative' : 'sticky',
            top: isMobile ? 'auto' : '100px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
            gap: '32px',
            alignItems: 'start',
            paddingBottom: '80px',
            zIndex: 10,
          }}
        >
          {/* ── LEFT COLUMN: STEPPER CONTROLS ── */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Target Repo Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #F1F5F9',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GitBranch size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    api-service
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    GitHub · main branch
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  title={isAutoPlaying ? "Pause auto-advancing" : "Resume auto-advancing"}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isAutoPlaying ? '#166534' : '#64748B',
                    backgroundColor: isAutoPlaying ? '#DCFCE7' : '#F1F5F9',
                    border: isAutoPlaying ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {isAutoPlaying ? <Pause size={10} /> : <Play size={10} />}
                  <span>{isAutoPlaying ? 'Auto-Running' : 'Paused'}</span>
                </button>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontWeight: 600,
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {activeStep + 1} / 5
                </span>
              </div>
            </div>

            {/* Step List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {WORKFLOW_STEPS.map((step, idx) => {
                const isActive = activeStep === idx;
                const isPassed = activeStep > idx;

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                      backgroundColor: isActive ? '#F8FAFC' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: isActive
                          ? '#0F172A'
                          : isPassed
                          ? '#10B981'
                          : '#F1F5F9',
                        color: isActive || isPassed ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isPassed ? <Check size={12} strokeWidth={3} /> : step.number}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#0F172A' : '#475569',
                          marginBottom: '2px',
                        }}
                      >
                        {step.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: isActive ? '#334155' : '#64748B',
                          lineHeight: 1.4,
                        }}
                      >
                        {step.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step Controls Bar */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                type="button"
                onClick={handleReplay}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: 'none',
                  background: 'none',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
              >
                <RotateCcw size={12} />
                <span>Replay</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeStep === 0}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    color: activeStep === 0 ? '#CBD5E1' : '#0F172A',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ArrowLeft size={12} />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeStep === WORKFLOW_STEPS.length - 1}
                  style={{
                    backgroundColor: activeStep === WORKFLOW_STEPS.length - 1 ? '#94A3B8' : '#0F172A',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: activeStep === WORKFLOW_STEPS.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Next</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: AUTHENTIC SECULAYER DASHBOARD PANEL ── */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '480px',
            }}
          >
            {/* Realistic Window Chrome Titlebar */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    color: '#64748B',
                    marginLeft: '8px',
                    backgroundColor: '#FFFFFF',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  seculayer.control/code/workspaces/api-service
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                  Deterministic Policy Engine Active
                </span>
              </div>
            </div>

            {/* Dashboard Content Container */}
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* ──────────────────────────────────────────────────────────── */}
              {/* STATE 1: CONNECT REPOSITORY                                 */}
              {/* ──────────────────────────────────────────────────────────── */}
              {activeStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Source Control Integration
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        Connected Git Repository
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={13} color="#059669" />
                      <span>Webhook Sync Active</span>
                    </div>
                  </div>

                  {/* Repository Overview Metadata Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>REPOSITORY</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>octocat/api-service</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>GitHub Enterprise</div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>BRANCH MONITORED</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>main</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Commit a7f9c2d</div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>CODEBASE VOLUME</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>142 Files</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>18,420 lines of code</div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>DEPENDENCY STACK</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>FastAPI + Postgres</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>38 third-party packages</div>
                    </div>
                  </div>

                  {/* Branch Protection Checklist */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px 20px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
                      Branch Protection &amp; Guardrails Enforced
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                        <Check size={14} color="#10B981" />
                        <span>Pull Request reviews required before merge (1 approver minimum)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                        <Check size={14} color="#10B981" />
                        <span>Cryptographically signed commits enforced</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                        <Check size={14} color="#10B981" />
                        <span>SecuLayer OPA Gatekeeper enabled for CI/CD checks</span>
                      </div>
                    </div>
                  </div>

                  {/* Call to Next Step */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(1)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Trigger Codebase Scan</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* STATE 2: ANALYZE CODEBASE                                   */}
              {/* ──────────────────────────────────────────────────────────── */}
              {activeStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Multi-Engine Security Analysis
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        Deterministic Scan in Progress
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1D4ED8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Activity size={13} className="animate-spin" />
                      <span>AST Taint Engines Active</span>
                    </div>
                  </div>

                  {/* 4 Engine Cards with Live Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            Semgrep AST Engine (SAST)
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Parsed 142 abstract syntax trees · 1 vulnerability flagged
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10B981', fontWeight: 600 }}>
                        Completed (0.8s)
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            Gitleaks Secret Scanner
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Scanned 24 commit histories for high-entropy tokens
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10B981', fontWeight: 600 }}>
                        0 Leaks (0.3s)
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            Aqua Trivy &amp; OSV (SCA &amp; SBOM)
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Mapped 38 dependencies · Transitive reachability checked
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10B981', fontWeight: 600 }}>
                        0 Reachable (0.5s)
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #BFDBFE',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={16} color="#2563EB" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                            Codebase Knowledge Graph Taint Engine
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#3B82F6' }}>
                            Tracing source (request.query_params) to SQL database sink...
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>
                        Analyzing Path
                      </span>
                    </div>
                  </div>

                  {/* Call to Next Step */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(2)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Inspect Detected Finding</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* STATE 3: DISCOVER RISK & PRIORITIZE FINDINGS                */}
              {/* ──────────────────────────────────────────────────────────── */}
              {activeStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Deterministic Vulnerability Finding
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        SQL Injection via String Concatenation
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#B91C1C',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <ShieldAlert size={14} color="#DC2626" />
                      <span>CRITICAL · CWE-89</span>
                    </div>
                  </div>

                  {/* Vulnerability Location & Taint Flow */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '16px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B' }}>FILE LOCATION: </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                        src/api/auth/route.py:42
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>SCANNER ENGINE: </span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>Semgrep AST Rule SAST-SQLI-01</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>EXPLOITABILITY: </span>
                      <span style={{ fontWeight: 600, color: '#DC2626' }}>CVSS 9.8 (Remote Data Exfiltration)</span>
                    </div>
                  </div>

                  {/* Vulnerable Code Snippet */}
                  <div
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #FECACA',
                      backgroundColor: '#FEF2F2',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        borderBottom: '1px solid #FECACA',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#991B1B',
                        fontWeight: 600,
                        backgroundColor: '#FEE2E2',
                      }}
                    >
                      Vulnerable Source-to-Sink Taint Trace
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '14px',
                        fontSize: '12.5px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        lineHeight: 1.5,
                        color: '#7F1D1D',
                        overflowX: 'auto',
                      }}
                    >
{`# Line 40: User parameter taken from unvalidated HTTP query
user_email = request.query_params.get("email")

# Line 42: Raw SQL formatted string concatenation without parameterization (VULNERABLE)
query = f"SELECT * FROM users WHERE email = '{user_email}' AND tenant_id = '{tenant_id}'"
result = await db.execute(query)`}
                    </pre>
                  </div>

                  {/* Evidence Hash */}
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Lock size={12} color="#64748B" />
                    <span>Cryptographic Evidence Packet:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                      SHA256:7f83b1657ff1709c00e123... (SLSA Provenance Store)
                    </span>
                  </div>

                  {/* Call to Next Step */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(3)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Generate Deterministic Remediation</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* STATE 4: GENERATE REMEDIATION & CODE DIFF                   */}
              {/* ──────────────────────────────────────────────────────────── */}
              {activeStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Automated Remediation &amp; Patch Verification
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        Proposed Parameterized Query Diff
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={13} color="#059669" />
                      <span>Patch Verified · 0 Taint Sinks Reachable</span>
                    </div>
                  </div>

                  {/* Unified Code Diff Viewer */}
                  <div
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#64748B',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>a/src/api/auth/route.py vs b/src/api/auth/route.py</span>
                      <span>@@ -42,2 +42,2 @@</span>
                    </div>

                    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12.5px', lineHeight: 1.6 }}>
                      <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '3px 14px' }}>
                        - query = f"SELECT * FROM users WHERE email = '{'{user_email}'}' AND tenant_id = '{'{tenant_id}'}'"
                      </div>
                      <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '3px 14px' }}>
                        - result = await db.execute(query)
                      </div>
                      <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 14px' }}>
                        + query = "SELECT * FROM users WHERE email = :email AND tenant_id = :tenant_id"
                      </div>
                      <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 14px' }}>
                        + result = await db.execute(query, {`{"email": user_email, "tenant_id": tenant_id}`})
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Re-Test Results */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#10B981' }}>
                        <Check size={14} />
                        <span>AST Re-Scan Passed</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Zero AST taint sinks reachable
                      </div>
                    </div>

                    <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#10B981' }}>
                        <Check size={14} />
                        <span>Unit Tests Passed</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        14 of 14 test cases verified
                      </div>
                    </div>

                    <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                        <Lock size={14} />
                        <span>Approval Gate Enforced</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Never auto-merged without review
                      </div>
                    </div>
                  </div>

                  {/* Call to Next Step */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(4)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Review CI/CD Security Gate</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* STATE 5: SECURE CI/CD & POLICY GATE                         */}
              {/* ──────────────────────────────────────────────────────────── */}
              {activeStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        CI/CD Pipeline Security Evaluation
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        Pull Request Security Gate
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        color: '#92400E',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <Lock size={13} color="#D97706" />
                      <span>GATED · Awaiting Peer Review</span>
                    </div>
                  </div>

                  {/* PR Header Box */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GitPullRequest size={16} color="#2563EB" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                        PR #418: [SecuLayer Autofix] Parameterize raw SQL queries in auth/route.py
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                      Branch: <code style={{ backgroundColor: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>seculayer/autofix-sqli-42</code> into <code style={{ backgroundColor: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>main</code>
                    </div>
                  </div>

                  {/* OPA Policy Rules Evaluation */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      DETERMINISTIC OPA REGO POLICIES EVALUATED
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                          <Check size={14} color="#10B981" />
                          <span>policy/no-unparameterized-raw-sql</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, fontFamily: 'monospace' }}>PASSED</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                          <Check size={14} color="#10B981" />
                          <span>policy/clean-slsa-provenance-attestation</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, fontFamily: 'monospace' }}>PASSED</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                          <Lock size={14} color="#D97706" />
                          <span>governance/peer-review-signature</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, fontFamily: 'monospace' }}>PENDING REVIEW</span>
                      </div>
                    </div>
                  </div>

                  {/* Guaranteed Safety Verdict */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46' }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>
                        <strong>Deterministic Safety Proved:</strong> Vulnerability eliminated without side-effects. Safe to merge upon review.
                      </span>
                    </div>

                    <Link
                      href="/code"
                      style={{
                        color: '#047857',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Explore in Console</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
