'use client';

/**
 * AnimatedWorkflowPipeline — Interactive Animated Architecture & Data Flow Visualization
 *
 * Features:
 * 1. Animated SVG Connector Lines: Smooth cubic Bezier curves with flowing dash offsets.
 * 2. Data Flow Animation: Moving glowing dots/particles traveling along lines representing live data transfer.
 * 3. Node-Based Workflow Animation: Connected stages that sequentially activate with glowing perimeters and status flips.
 * 4. Animated Architecture Visualization: Multi-system relationships between Cloud/Code inputs, 18 Specialist Agents, OPA Gate, and Remediation Vault.
 *
 * Strict Production Design System:
 * Crisp modern enterprise palette (#FFFFFF card background, #0F172A typography, #E2E8F0 borders, emerald/blue/violet accents).
 */

import React, { useState, useEffect, useId } from 'react';
import {
  Cloud,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Server,
  Terminal,
  Activity,
  Play,
  Pause,
  RotateCw,
  Layers,
  Lock,
  Cpu,
  FileCheck2,
  Database,
  GitBranch,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Boxes,
  Workflow,
  Radio,
} from 'lucide-react';

type WorkflowMode = 'cloud' | 'code' | 'runtime';

interface NodeDetail {
  id: string;
  stage: number;
  title: string;
  category: string;
  icon: any;
  status: 'ACTIVE' | 'VERIFIED' | 'STANDBY';
  telemetry: string;
  specs: { label: string; value: string }[];
  description: string;
}

export function AnimatedWorkflowPipeline() {
  const [activeMode, setActiveMode] = useState<WorkflowMode>('cloud');
  const [activeStage, setActiveStage] = useState<number>(0); // 0 to 3 sequential cycle
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<string>('node-aws');
  const [pulseCount, setPulseCount] = useState<number>(842);
  const svgId = useId().replace(/:/g, '');

  // Sequential activation loop (Step 1 -> Step 2 -> Step 3 -> Step 4)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 4);
      setPulseCount((prev) => prev + Math.floor(Math.random() * 12) + 3);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Stage titles and descriptors
  const STAGES = [
    {
      idx: 0,
      number: 'STAGE 01',
      title: 'Infrastructure & Code Ingestion',
      subtitle: 'Real-time telemetry, AST extraction & AWS STS AssumeRole',
      accent: '#2563EB', // Blue
      bg: '#EFF6FF',
    },
    {
      idx: 1,
      number: 'STAGE 02',
      title: 'Specialist Autonomous Agents',
      subtitle: '18 concurrent security engines tracing graph choke points',
      accent: '#7C3AED', // Violet
      bg: '#F5F3FF',
    },
    {
      idx: 2,
      number: 'STAGE 03',
      title: 'Deterministic OPA Rego Gate',
      subtitle: 'Cryptographic policy enforcement · Zero probabilistic hallucination',
      accent: '#059669', // Emerald
      bg: '#ECFDF5',
    },
    {
      idx: 3,
      number: 'STAGE 04',
      title: 'Autonomous Remediation & Evidence',
      subtitle: 'Authoritative cloud API fixes & immutable PostgreSQL audit ledger',
      accent: '#0284C7', // Sky
      bg: '#F0F9FF',
    },
  ];

  // Pipeline nodes definitions based on activeMode
  const NODES: NodeDetail[] =
    activeMode === 'cloud'
      ? [
          // Stage 0: Cloud Inputs
          {
            id: 'node-aws',
            stage: 0,
            title: 'AWS Multi-Account (407268186423)',
            category: 'CLOUD INGESTION',
            icon: Cloud,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: '76 live resources · STS AssumeRole',
            description: 'Discovers S3 buckets, RDS instances, security groups, and IAM roles concurrently via AWS STS.',
            specs: [
              { label: 'Auth Method', value: 'AWS STS AssumeRole' },
              { label: 'Discovery Latency', value: '3.8s parallel gather' },
              { label: 'Role Scope', value: 'SecurityAudit (Read-only)' },
            ],
          },
          {
            id: 'node-k8s',
            stage: 0,
            title: 'Kubernetes & Docker Runtime',
            category: 'CONTAINER INGESTION',
            icon: Boxes,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'EKS Pods & RBAC Bindings',
            description: 'Streams cluster runtime manifests, root privilege escalation flags, and container images.',
            specs: [
              { label: 'Protocol', value: 'Kube-apiserver read-only' },
              { label: 'Container Scan', value: 'Trivy SBOM & CVE DB' },
              { label: 'Ingress Mapping', value: 'ALB / NodePort tracer' },
            ],
          },
          // Stage 1: Autonomous Specialist Agents
          {
            id: 'node-cspm',
            stage: 1,
            title: 'Asset Discovery & CSPM Scanner',
            category: 'SPECIALIST AGENT 01 & 02',
            icon: ShieldAlert,
            status: activeStage === 1 ? 'ACTIVE' : activeStage > 1 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'CIS AWS Benchmark v3.0 evaluated',
            description: 'Audits S3 PublicAccessBlock, RDS public subnet reachability, and default VPC security groups.',
            specs: [
              { label: 'Engine', value: 'CIS Benchmark v3.0 Rego' },
              { label: 'Execution', value: 'Concurrent async gather' },
              { label: 'Asset Provenance', value: 'PostgreSQL CloudResource' },
            ],
          },
          {
            id: 'node-attackpath',
            stage: 1,
            title: 'Attack Path & Choke Point Engine',
            category: 'SPECIALIST AGENT 09',
            icon: Radio,
            status: activeStage === 1 ? 'ACTIVE' : activeStage > 1 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'Internet -> Ingress -> DB Graph',
            description: 'Synthesizes reachability topology from 0.0.0.0/0 ingress to sensitive database workloads.',
            specs: [
              { label: 'Reachability Algorithm', value: 'BFS Path Traversal' },
              { label: 'Choke Point Isolation', value: '1-Hop Security Group Cut' },
              { label: 'Blast Radius', value: 'Evaluated across 4 tiers' },
            ],
          },
          // Stage 2: Deterministic Decision
          {
            id: 'node-opa',
            stage: 2,
            title: 'Deterministic OPA Rego Engine',
            category: 'DECISION AUTHORITY',
            icon: Lock,
            status: activeStage === 2 ? 'ACTIVE' : activeStage > 2 ? 'VERIFIED' : 'STANDBY',
            telemetry: '100% Rules Evaluated · Signed Verdict',
            description: 'Rule-based Open Policy Agent enforces CIS compliance. LLM proposes; deterministic OPA decides.',
            specs: [
              { label: 'Engine Version', value: 'Open Policy Agent v0.68' },
              { label: 'Rule Authority', value: 'Deterministic (Non-probabilistic)' },
              { label: 'Policy Packages', value: 'kavach.cloud.cis, kavach.s3' },
            ],
          },
          // Stage 3: Autonomous Remediation & Evidence
          {
            id: 'node-remediation',
            stage: 3,
            title: 'Authoritative AWS Remediation',
            category: 'EXECUTION & AUDIT',
            icon: CheckCircle2,
            status: activeStage === 3 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 's3:PutPublicAccessBlock -> HTTP 200',
            description: 'Executes least-privilege remediation directly via AWS SDK with cryptographic audit proof.',
            specs: [
              { label: 'Action Taken', value: 's3:PutPublicAccessBlock' },
              { label: 'AWS RequestId', value: 'KGX4QR2W9YP2WY0P' },
              { label: 'Evidence Hash', value: 'SHA256:7a4f9e12... (RMD-46A17C)' },
            ],
          },
        ]
      : activeMode === 'code'
      ? [
          {
            id: 'node-git',
            stage: 0,
            title: 'GitHub Pull Request #819',
            category: 'CODE INGESTION',
            icon: GitBranch,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: '418 files parsed · 142 AST nodes',
            description: 'Webhooks trigger real-time AST extraction and dependency manifest parsing on every commit.',
            specs: [
              { label: 'Branch', value: 'feat/orders-api -> main' },
              { label: 'AST Engine', value: 'tree-sitter & pyast' },
              { label: 'Manifests', value: 'package.json, requirements.txt' },
            ],
          },
          {
            id: 'node-secrets',
            stage: 0,
            title: 'Gitleaks High-Entropy Detector',
            category: 'SECRETS SCANNER',
            icon: Lock,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'Regex & Shannon Entropy Scan',
            description: 'Scans commit diffs for leaked AWS keys, Stripe tokens, and private SSH certificates.',
            specs: [
              { label: 'Scanner', value: 'Gitleaks v8.18' },
              { label: 'Rule Set', value: '160 high-entropy signatures' },
              { label: 'Zero-False-Positive', value: 'Entropy validation check' },
            ],
          },
          {
            id: 'node-sast',
            stage: 1,
            title: 'Semgrep Semantic Taint Tracer',
            category: 'SPECIALIST SAST AGENT',
            icon: Code2,
            status: activeStage === 1 ? 'ACTIVE' : activeStage > 1 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'Untrusted req.query -> raw SQL tainted',
            description: 'Traces untrusted user inputs flowing from HTTP entrypoints to raw database execution.',
            specs: [
              { label: 'Finding', value: 'CWE-89: SQL Injection' },
              { label: 'Taint Path', value: 'req.query.id -> db.query()' },
              { label: 'File', value: 'src/routes/users.ts:42' },
            ],
          },
          {
            id: 'node-sbom',
            stage: 1,
            title: 'Syft SBOM & Trivy CVE Matcher',
            category: 'SUPPLY CHAIN AGENT',
            icon: Layers,
            status: activeStage === 1 ? 'ACTIVE' : activeStage > 1 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'CycloneDX SBOM · 0 Critical CVEs',
            description: 'Generates standard CycloneDX SBOMs and correlates dependencies against OSV and NVD feeds.',
            specs: [
              { label: 'SBOM Format', value: 'CycloneDX v1.5 JSON' },
              { label: 'Vulnerability Feed', value: 'OSV + GitHub Advisory DB' },
              { label: 'SLSA Level', value: 'SLSA Level 3 verified' },
            ],
          },
          {
            id: 'node-policy',
            stage: 2,
            title: 'Pre-Merge Rego Policy Gate',
            category: 'CI/CD DECISION GATE',
            icon: ShieldCheck,
            status: activeStage === 2 ? 'ACTIVE' : activeStage > 2 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'Blocking Critical CWE-89 Vulnerability',
            description: 'Deterministic security gate rejects merge until an automated parameterized fix is applied.',
            specs: [
              { label: 'Gate Status', value: 'MERGE BLOCKED (1 High issue)' },
              { label: 'Policy Rule', value: 'app.code.deny_raw_sql' },
              { label: 'Bypass Allowed', value: 'False (Cryptographically signed)' },
            ],
          },
          {
            id: 'node-patch',
            stage: 3,
            title: 'Verified Automated Patch & PR',
            category: 'AUTONOMOUS REMEDIATION',
            icon: CheckCircle2,
            status: activeStage === 3 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'Branch kavach/autofix-sqli created',
            description: 'Applies parameterized SQL patch, verifies rescan with Semgrep, and publishes GitHub PR.',
            specs: [
              { label: 'Patch Diff', value: 'Parameterized query replacement' },
              { label: 'Rescan Result', value: '0 CWE findings detected' },
              { label: 'Pull Request', value: 'PR #820 created and signed' },
            ],
          },
        ]
      : [
          // Runtime & MCP Mode
          {
            id: 'node-mcp-client',
            stage: 0,
            title: 'AI Coding Agent (Claude / Cursor)',
            category: 'AGENT FLEET',
            icon: Cpu,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'MCP JSON-RPC Client Session',
            description: 'Autonomous agents attempt to invoke system tools, read secrets, or edit configuration files.',
            specs: [
              { label: 'Protocol', value: 'Model Context Protocol (MCP)' },
              { label: 'Agent Identity', value: 'cursor-agent-worker-04' },
              { label: 'Requested Tool', value: 'bash.execute("rm -rf ...")' },
            ],
          },
          {
            id: 'node-ebpf',
            stage: 0,
            title: 'eBPF Kernel Probe Monitor',
            category: 'KERNEL RUNTIME',
            icon: Terminal,
            status: activeStage === 0 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'Syscall intercept (sys_enter_execve)',
            description: 'Inspects every process execution, network connect socket, and file write at ring 0.',
            specs: [
              { label: 'Kernel Hook', value: 'tracepoint/syscalls/sys_enter_execve' },
              { label: 'Overhead', value: '< 1.2% CPU in production' },
              { label: 'Ring Buffer', value: 'Zero-drop async ring buffer' },
            ],
          },
          {
            id: 'node-gateway',
            stage: 1,
            title: 'Kavach MCP Security Gateway',
            category: 'AUTHORIZATION GATEWAY',
            icon: ShieldAlert,
            status: activeStage === 1 ? 'ACTIVE' : activeStage > 1 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'Token Authorization & Risk Scorer',
            description: 'Wraps MCP tools with identity authentication, input schema validation, and risk tiering.',
            specs: [
              { label: 'Auth Token', value: 'HMAC-SHA256 Signed Scope' },
              { label: 'Tool Risk Tier', value: 'HIGH_RISK (Filesystem Write)' },
              { label: 'Sandboxing', value: 'gVisor user-space isolation' },
            ],
          },
          {
            id: 'node-decision',
            stage: 2,
            title: 'Deterministic Tool Policy Engine',
            category: 'POLICY ENFORCEMENT',
            icon: Lock,
            status: activeStage === 2 ? 'ACTIVE' : activeStage > 2 ? 'VERIFIED' : 'STANDBY',
            telemetry: 'OPA Rule: deny_unauthorized_destructive_call',
            description: 'Blocks destructive commands and enforces human-in-the-loop approval before disk writes.',
            specs: [
              { label: 'Verdict', value: 'BLOCKED_PENDING_APPROVAL' },
              { label: 'Policy File', value: 'policies/mcp_tool_guard.rego' },
              { label: 'Escalation', value: 'Slack webhook approval sent' },
            ],
          },
          {
            id: 'node-vault',
            stage: 3,
            title: 'Cryptographic Audit & Evidence Vault',
            category: 'IMMUTABLE AUDIT',
            icon: CheckCircle2,
            status: activeStage === 3 ? 'ACTIVE' : 'VERIFIED',
            telemetry: 'Ledger Block #194,821 Sealed',
            description: 'Records who, what, when, prompt hash, and policy decision in PostgreSQL audit trail.',
            specs: [
              { label: 'Audit Record', value: 'KAVACH_AGENT_MCP_INVOCATION' },
              { label: 'Timestamp', value: new Date().toISOString() },
              { label: 'Compliance Proof', value: 'SOC2 CC6.8 verified' },
            ],
          },
        ];

  const currentNode = NODES.find((n) => n.id === selectedNode) || NODES[0];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        padding: 'clamp(24px, 4vw, 36px)',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header Controls & Mode Switcher ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              padding: '3px 10px',
              borderRadius: '6px',
              marginBottom: '6px',
            }}
          >
            <Workflow size={13} />
            Interactive Architecture &amp; Data Flow Engine
          </div>
          <h3
            style={{
              fontSize: 'clamp(20px, 2.5vw, 26px)',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Live Multi-Stage Security Pipeline
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
            Watch real-time data packets travel across SVG connector paths through autonomous agents and deterministic OPA gates.
          </p>
        </div>

        {/* Workflow Mode Tabs & Play/Pause */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              padding: '3px',
              borderRadius: '10px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => {
                setActiveMode('cloud');
                setSelectedNode('node-aws');
              }}
              style={{
                border: 'none',
                backgroundColor: activeMode === 'cloud' ? '#FFFFFF' : 'transparent',
                color: activeMode === 'cloud' ? '#0F172A' : '#64748B',
                boxShadow: activeMode === 'cloud' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cloud Posture (AWS)
            </button>
            <button
              onClick={() => {
                setActiveMode('code');
                setSelectedNode('node-git');
              }}
              style={{
                border: 'none',
                backgroundColor: activeMode === 'code' ? '#FFFFFF' : 'transparent',
                color: activeMode === 'code' ? '#0F172A' : '#64748B',
                boxShadow: activeMode === 'code' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Code &amp; CI/CD Gate
            </button>
            <button
              onClick={() => {
                setActiveMode('runtime');
                setSelectedNode('node-mcp-client');
              }}
              style={{
                border: 'none',
                backgroundColor: activeMode === 'runtime' ? '#FFFFFF' : 'transparent',
                color: activeMode === 'runtime' ? '#0F172A' : '#64748B',
                boxShadow: activeMode === 'runtime' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              AI Agent &amp; MCP Runtime
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume animation cycle' : 'Pause animation cycle'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
            }}
          >
            {isPaused ? <Play size={13} color="#059669" /> : <Pause size={13} color="#2563EB" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* ── 4 Pipeline Stage Steppers ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {STAGES.map((stg) => {
          const isCurrent = activeStage === stg.idx;
          const isPassed = activeStage > stg.idx;
          return (
            <div
              key={stg.idx}
              onClick={() => setActiveStage(stg.idx)}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                border: `1.5px solid ${isCurrent ? stg.accent : isPassed ? '#A7F3D0' : '#E2E8F0'}`,
                backgroundColor: isCurrent ? stg.bg : isPassed ? '#F0FDF4' : '#F8FAFC',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: isCurrent ? stg.accent : isPassed ? '#059669' : '#64748B',
                  }}
                >
                  {stg.number}
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: isCurrent ? stg.accent : isPassed ? '#059669' : '#CBD5E1',
                    color: '#FFFFFF',
                  }}
                >
                  {isCurrent ? 'ACTIVE' : isPassed ? 'VERIFIED' : 'QUEUED'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: isCurrent ? '#0F172A' : '#334155',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {stg.title}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  color: '#64748B',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {stg.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Interactive Architecture Graph with Animated SVG Lines & Flowing Particles ── */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#0F172A', // Dark canvas to make glowing SVG connector lines & traveling particles pop
          borderRadius: '16px',
          padding: '28px 24px',
          border: '1px solid #1E293B',
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        {/* Animated Background Subtle Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* ── SVG LAYER: Connector Lines with Animated Moving Particles ── */}
        <svg
          viewBox="0 0 1000 340"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            {/* Glowing filter for traveling particles */}
            <filter id={`${svgId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient definition for paths */}
            <linearGradient id={`${svgId}-blue-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id={`${svgId}-emerald-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#34D399" stopOpacity="1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id={`${svgId}-sky-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* ── PATH 1: Top Input (x: 220, y: 85) -> Specialist Top (x: 480, y: 85) ── */}
          <path
            id={`${svgId}-p1`}
            d="M 235 85 C 330 85, 360 85, 465 85"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <path
            d="M 235 85 C 330 85, 360 85, 465 85"
            fill="none"
            stroke="url(#blue-gradient)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="kavach-flow-stroke"
          />
          {/* Moving particles along Path 1 */}
          <circle r="4.5" fill="#60A5FA" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M 235 85 C 330 85, 360 85, 465 85" />
          </circle>
          <circle r="3" fill="#FFFFFF" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M 235 85 C 330 85, 360 85, 465 85" />
          </circle>

          {/* ── PATH 2: Bottom Input (x: 235, y: 245) -> Specialist Top (x: 465, y: 85) [Crossing Branch] ── */}
          <path
            id={`${svgId}-p2`}
            d="M 235 245 C 340 245, 370 120, 465 95"
            fill="none"
            stroke="#1E293B"
            strokeWidth="2.5"
          />
          <path
            d="M 235 245 C 340 245, 370 120, 465 95"
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
            strokeDasharray="5 7"
            strokeOpacity="0.7"
            className="kavach-flow-stroke"
          />
          <circle r="4" fill="#818CF8" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.8s" begin="0.4s" repeatCount="indefinite" path="M 235 245 C 340 245, 370 120, 465 95" />
          </circle>

          {/* ── PATH 3: Bottom Input (x: 235, y: 245) -> Specialist Bottom (x: 465, y: 245) ── */}
          <path
            id={`${svgId}-p3`}
            d="M 235 245 C 330 245, 360 245, 465 245"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <path
            d="M 235 245 C 330 245, 360 245, 465 245"
            fill="none"
            stroke="#818CF8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="kavach-flow-stroke"
          />
          <circle r="4.5" fill="#A78BFA" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.6s" begin="0.7s" repeatCount="indefinite" path="M 235 245 C 330 245, 360 245, 465 245" />
          </circle>

          {/* ── PATH 4: Specialist Top (x: 715, y: 85) -> OPA Engine (x: 790, y: 165) ── */}
          <path
            id={`${svgId}-p4`}
            d="M 700 85 C 740 85, 750 150, 785 165"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <path
            d="M 700 85 C 740 85, 750 150, 785 165"
            fill="none"
            stroke="#34D399"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="kavach-flow-stroke"
          />
          <circle r="4.5" fill="#34D399" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.1s" repeatCount="indefinite" path="M 700 85 C 740 85, 750 150, 785 165" />
          </circle>

          {/* ── PATH 5: Specialist Bottom (x: 700, y: 245) -> OPA Engine (x: 785, y: 175) ── */}
          <path
            id={`${svgId}-p5`}
            d="M 700 245 C 740 245, 750 185, 785 175"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <path
            d="M 700 245 C 740 245, 750 185, 785 175"
            fill="none"
            stroke="#34D399"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="kavach-flow-stroke"
          />
          <circle r="4.5" fill="#34D399" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="2.1s" begin="1.0s" repeatCount="indefinite" path="M 700 245 C 740 245, 750 185, 785 175" />
          </circle>

          {/* ── PATH 6: OPA Engine (x: 800, y: 200) -> Remediation Vault (Exit) ── */}
          <path
            id={`${svgId}-p6`}
            d="M 800 200 C 850 200, 920 200, 970 200"
            fill="none"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <path
            d="M 800 200 C 850 200, 920 200, 970 200"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="kavach-flow-stroke"
          />
          <circle r="5" fill="#38BDF8" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="1.8s" repeatCount="indefinite" path="M 800 200 C 850 200, 920 200, 970 200" />
          </circle>
          <circle r="3.5" fill="#FFFFFF" filter={`url(#${svgId}-glow)`}>
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path="M 800 200 C 850 200, 920 200, 970 200" />
          </circle>
        </svg>

        {/* ── HTML NODE CARDS (Positioned in 4-column visual flow) ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.3fr 1.1fr 1.2fr',
            gap: '24px',
            minHeight: '280px',
            alignItems: 'center',
          }}
        >
          {/* COLUMN 1: Ingestion Nodes (Stage 0) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {NODES.filter((n) => n.stage === 0).map((node) => {
              const isSelected = selectedNode === node.id;
              const isStageActive = activeStage === 0;
              const IconComp = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    border: `1.5px solid ${isSelected ? '#38BDF8' : isStageActive ? '#60A5FA' : '#334155'}`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(56, 189, 248, 0.25)'
                      : isStageActive
                      ? '0 0 14px rgba(96, 165, 250, 0.15)'
                      : 'none',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8' }}>
                      {node.category}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isStageActive ? '#38BDF8' : '#34D399',
                        boxShadow: isStageActive ? '0 0 8px #38BDF8' : 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60A5FA',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={15} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                      {node.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                    {node.telemetry}
                  </div>
                </div>
              );
            })}
          </div>

          {/* COLUMN 2: Autonomous Specialist Agents (Stage 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {NODES.filter((n) => n.stage === 1).map((node) => {
              const isSelected = selectedNode === node.id;
              const isStageActive = activeStage === 1;
              const IconComp = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    border: `1.5px solid ${isSelected ? '#A78BFA' : isStageActive ? '#C084FC' : '#334155'}`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(167, 139, 250, 0.25)'
                      : isStageActive
                      ? '0 0 14px rgba(192, 132, 252, 0.15)'
                      : 'none',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#C084FC' }}>
                      {node.category}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isStageActive ? '#7C3AED' : '#1E293B',
                        color: '#F8FAFC',
                      }}
                    >
                      {isStageActive ? 'ANALYZING' : 'IDLE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C084FC',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={15} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                      {node.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {node.telemetry}
                  </div>
                </div>
              );
            })}
          </div>

          {/* COLUMN 3: Deterministic OPA Rego Decision Gate (Stage 2) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {NODES.filter((n) => n.stage === 2).map((node) => {
              const isSelected = selectedNode === node.id;
              const isStageActive = activeStage === 2;
              const IconComp = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    border: `1.5px solid ${isSelected ? '#34D399' : isStageActive ? '#10B981' : '#334155'}`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(52, 211, 153, 0.25)'
                      : isStageActive
                      ? '0 0 16px rgba(16, 185, 129, 0.2)'
                      : 'none',
                    borderRadius: '12px',
                    padding: '18px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      color: '#34D399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px',
                    }}
                  >
                    <IconComp size={22} />
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#34D399', marginBottom: '4px' }}>
                    {node.category}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
                    {node.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {node.telemetry}
                  </div>
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: isStageActive ? '#059669' : '#1E293B',
                      color: '#FFFFFF',
                      display: 'inline-block',
                    }}
                  >
                    {isStageActive ? 'POLICY VERDICT SIGNED' : 'DETERMINISTIC GATE'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* COLUMN 4: Autonomous Remediation & Audit Vault (Stage 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {NODES.filter((n) => n.stage === 3).map((node) => {
              const isSelected = selectedNode === node.id;
              const isStageActive = activeStage === 3;
              const IconComp = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    border: `1.5px solid ${isSelected ? '#38BDF8' : isStageActive ? '#0EA5E9' : '#334155'}`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(56, 189, 248, 0.25)'
                      : isStageActive
                      ? '0 0 16px rgba(14, 165, 233, 0.2)'
                      : 'none',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#38BDF8' }}>
                      {node.category}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#0284C7',
                        color: '#FFFFFF',
                      }}
                    >
                      {isStageActive ? 'EXECUTING FIX' : 'VERIFIED PROOF'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38BDF8',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                      {node.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {node.telemetry}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Bottom Telemetry Ticker */}
        <div
          style={{
            marginTop: '20px',
            borderTop: '1px solid #1E293B',
            paddingTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11.5px',
            color: '#64748B',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8' }}>
              <Activity size={13} className="animate-pulse" />
              Real-time Ingress: {pulseCount.toLocaleString()} events/sec
            </span>
            <span style={{ color: '#475569' }}>·</span>
            <span>Deterministic Policy Latency: 12.4ms</span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ color: '#34D399' }}>Choke Points Isolated: 0 Unresolved</span>
          </div>
          <div style={{ color: '#94A3B8' }}>
            Click any node card to inspect specifications
          </div>
        </div>
      </div>

      {/* ── Selected Node Technical Specifications Drawer ── */}
      {currentNode && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 2fr',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: '4px' }}>
              Inspected Node · {currentNode.category}
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
              {currentNode.title}
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              {currentNode.description}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            {currentNode.specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  {spec.label}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#0F172A',
                    marginTop: '3px',
                    fontFamily: 'JetBrains Mono, monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Keyframes for SVG stroke animation */}
      <style>{`
        @keyframes dashFlow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .kavach-flow-stroke {
          animation: dashFlow 1.4s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default AnimatedWorkflowPipeline;

