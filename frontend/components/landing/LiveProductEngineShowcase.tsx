'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Activity,
  Cpu,
  Database,
  Cloud,
  Code2,
  Crosshair,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Layers,
  ArrowRight,
  Server,
  Network,
  Bot,
} from 'lucide-react';

export type ProductPillar = 'cloud' | 'code' | 'attack' | 'mcp';
export type FlowStage = 0 | 1 | 2 | 3;

interface LiveProductEngineShowcaseProps {
  initialPillar?: ProductPillar;
  compact?: boolean;
  onExpand?: () => void;
  style?: React.CSSProperties;
}

export const LiveProductEngineShowcase: React.FC<LiveProductEngineShowcaseProps> = ({
  initialPillar = 'cloud',
  compact = true,
  onExpand,
  style,
}) => {
  const [activePillar, setActivePillar] = useState<ProductPillar>(initialPillar);
  const [currentStage, setCurrentStage] = useState<FlowStage>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Pillars Definition
  const pillars: { id: ProductPillar; label: string; icon: React.ReactNode; badge: string; color: string }[] = [
    {
      id: 'cloud',
      label: 'Cloud Security',
      icon: <Cloud size={14} />,
      badge: 'Master Agent + 18 Specialists',
      color: '#38BDF8',
    },
    {
      id: 'code',
      label: 'Code Security',
      icon: <Code2 size={14} />,
      badge: 'AST + SCA + Secrets',
      color: '#34D399',
    },
    {
      id: 'attack',
      label: 'Attack Surface',
      icon: <Crosshair size={14} />,
      badge: 'Offensive Prover · 0 FP',
      color: '#F59E0B',
    },
    {
      id: 'mcp',
      label: 'MCP & AI Defense',
      icon: <Cpu size={14} />,
      badge: 'Runtime Guard & Gateway',
      color: '#A855F7',
    },
  ];

  // Pipeline Stages
  const stages = [
    { num: '01', title: 'Connect & Ingest', desc: 'Real-time telemetry & AST parsing' },
    { num: '02', title: 'Autonomous Multi-Agent', desc: 'Correlation & attack paths' },
    { num: '03', title: 'Deterministic OPA', desc: 'Cryptographic policy verdict' },
    { num: '04', title: '1-Click Fix & Rescan', desc: 'Validated zero-regression patch' },
  ];

  // Logs database for each pillar & stage
  const logsMap: Record<ProductPillar, Record<FlowStage, string[]>> = {
    cloud: {
      0: [
        'sts:AssumeRole -> arn:aws:iam::407268186423:role/KavachSecurityAuditRole (Session: kavach-audit)',
        'AWS EC2/RDS/S3/IAM inventory synchronized: 76 live resources discovered in account 407268186423',
        'Multi-region asset indexing: us-east-1 S3 buckets, security groups, RDS instances mapped',
        'IAM credential boundary & least-privilege role verified (Read-only SecurityAudit policy)',
      ],
      1: [
        'Master Cloud Agent dispatched 18 specialist agents concurrently:',
        '  ├─ [IAM-AGENT] Evaluating privilege boundaries -> Wildcard permissions evaluated',
        '  ├─ [NETWORK-AGENT] Tracing ingress flow: 0.0.0.0/0 -> Security Group ingress rules',
        '  ├─ [CSPM-AGENT] Evaluated S3 bucket PublicAccessBlock: elasticbeanstalk-us-east-1-407268186423',
        '  └─ [ATTACK-PATH] Correlated Choke Point: Public internet -> Ingress -> Database reachability',
      ],
      2: [
        'Evaluating OPA Rego Security Blueprint against cloud topology graph...',
        '  [OPA] rule: cloud.rds.deny_public_subnet_exposure -> Evaluated',
        '  [OPA] rule: cloud.s3.deny_public_read_acls -> VIOLATION (PublicAccessBlock missing)',
        '  [DECISION] Verdict: SECURITY ALERT DETECTED. Generating deterministic Terraform & AWS boto3 remediation.',
      ],
      3: [
        'Executing authoritative cloud remediation via AWS boto3 API:',
        '  [REMEDIATION] s3:PutPublicAccessBlock -> HTTP 200 (RequestId: KGX4QR2W9YP2WY0P)',
        '  [REMEDIATION] Attached BlockPublicAcls=True, RestrictPublicBuckets=True',
        'Executing deterministic rescan verification -> 0 attack paths remaining. Status: SECURED & VERIFIED.',
      ],
    },
    code: {
      0: [
        'git:clone --depth=1 https://github.com/org/kavach-control-plane.git (SHA: 8f3c19b)',
        'Parsing Abstract Syntax Tree (AST) across 418 source files...',
        'Dependency manifest detected: package.json (142 packages), requirements.txt (38 packages)',
      ],
      1: [
        'Multi-engine scanners executing concurrently:',
        '  ├─ [SEMGREP AST] Taint tracking user input `user_id` to raw cursor.execute in auth/route.py:42',
        '  ├─ [GITLEAKS v8] High-entropy check -> AWS Access Key in config/secrets.env:18',
        '  ├─ [AQUA TRIVY] CVE-2022-23529 found in jsonwebtoken@8.5.1 (CVSS 9.8)',
        'Correlating AST findings -> 1 Critical SQLi, 1 Secret leak, 1 Vulnerable dependency confirmed.',
      ],
      2: [
        'Evaluating patch through Open Policy Agent (OPA Rego v0.68)...',
        '  [OPA] rule: code.ast.parameterized_queries_only -> MUST_PASS',
        '  [OPA] rule: code.secrets.zero_plaintext_credentials -> MUST_PASS',
        'Synthesizing minimal AST patch for auth/route.py without regressions.',
      ],
      3: [
        'Git branch created: `kavach/autofix-sqli-42`',
        'Committed verified diff: cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
        'Automated AST rescan executed: CWE-89 resolved (0 findings).',
        'GitHub Pull Request #819 published with SLSA Level 3 cryptographic attestation.',
      ],
    },
    attack: {
      0: [
        'Reconnaissance engine initialized for target domain: kavachsecurity.me',
        'Discovered 24 subdomains via passive DNS & Certificate Transparency logs',
        'Port scan completed: 80, 443, 8080, 9200 active',
      ],
      1: [
        'Active Exploitability Prover executing non-destructive payload verification:',
        '  ├─ [PROVER] Testing SSRF on /api/v1/webhook -> Target redirects to 169.254.169.254',
        '  │   └─ Result: IMDSv2 token required. AWS metadata unreachable. DISMISSED AS FALSE POSITIVE.',
        '  └─ [PROVER] Testing Elastic cluster on port 9200 -> Unauthenticated _cat/indices query succeeded!',
        'Proof generated: Sensitive indices exposed. 0 false positives recorded.',
      ],
      2: [
        'Attacker Path Visualization synthesized:',
        '  Attacker -> Port 9200 (Elasticsearch) -> Extract customer session tokens -> Account Takeover',
        'OPA Blueprint Enforcement: Block port 9200 at AWS Security Group ingress.',
      ],
      3: [
        'Remediation executed via AWS Security Gateway API:',
        '  aws ec2 revoke-security-group-ingress --group-id sg-04821a --protocol tcp --port 9200 --cidr 0.0.0.0/0',
        'Active rescan validated: Port 9200 unreachable externally. Exploit resolved.',
      ],
    },
    mcp: {
      0: [
        'MCP Gateway Proxy listening on stdio & SSE transports (mcp.kavach.internal:8443)',
        'Registered MCP tools: [execute_sql, aws_iam_create_key, send_email, read_vault_secret]',
        'AI Agent session initiated: agent_id=devops-copilot-prod token=Bearer ****',
      ],
      1: [
        'Intercepted Tool Call from Autonomous Agent:',
        '  Agent: `devops-copilot-prod` requested tool: `execute_sql`',
        '  Payload: {"query": "DROP TABLE audit_events CASCADE;"}',
        'Agent Risk Engine: Risk Score 98/100 (Destructive DDL Operation on Critical Ledger)',
      ],
      2: [
        'Evaluating OPA Rego MCP Gateway Invariants:',
        '  [OPA] rule: mcp.tools.deny_destructive_schema_modification -> ENFORCE_DENY',
        '  [DECISION] Tool call INTERCEPTED and BLOCKED (HTTP 403 Forbidden).',
        'Audit proof recorded to immutable PostgreSQL ledger with cryptographic hash.',
      ],
      3: [
        'Autonomous containment applied: Agent session quarantined.',
        'Alert dispatched to Security Operations: "Unauthorized DDL attempt blocked at MCP gateway".',
        'Zero unauthorized database modifications occurred. Gateway in active defense.',
      ],
    },
  };

  // Switch pillar helper
  const handleSelectPillar = (p: ProductPillar) => {
    setActivePillar(p);
    setCurrentStage(0);
    setProgress(0);
    setIsFixed(false);
  };

  // Timer for auto-cycling stages
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 50; // update progress every 50ms
    const totalStageTime = 4200; // 4.2 seconds per stage
    const stepIncrement = (intervalTime / totalStageTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStage((curr) => {
            const next = ((curr + 1) % 4) as FlowStage;
            if (next === 3) setIsFixed(true);
            if (next === 0) setIsFixed(false);
            return next;
          });
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Update logs when pillar or stage changes
  useEffect(() => {
    const currentLogs = logsMap[activePillar][currentStage] || [];
    setTerminalLogs(currentLogs);
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [activePillar, currentStage]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#070A12',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        color: '#F8FAFC',
        fontFamily: 'Inter, -apple-system, sans-serif',
        ...style,
      }}
    >
      {/* ── macOS / YC Terminal Chrome Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left: Window controls & Live status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8',
              marginLeft: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isPlaying ? '#10B981' : '#F59E0B',
                boxShadow: isPlaying ? '0 0 8px #10B981' : 'none',
              }}
            />
            <span style={{ fontWeight: 600, color: '#E2E8F0' }}>KAVACH AUTONOMOUS CORE</span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ color: '#38BDF8' }}>LIVE SIMULATION</span>
          </div>
        </div>

        {/* Right: Playback Controls & Expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Pause / Play */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Auto-Flow' : 'Resume Auto-Flow'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94A3B8',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span style={{ fontFamily: 'monospace' }}>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              setCurrentStage(0);
              setProgress(0);
              setIsFixed(false);
            }}
            title="Restart flow"
            style={{
              padding: '4px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94A3B8',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
          </button>

          {/* Expand Modal Trigger if provided */}
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              title="Expand Walkthrough Sandbox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Maximize2 size={12} />
              <span>EXPAND</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Product Pillar Navigation Tabs ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: '#090D16',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {pillars.map((p) => {
          const isActive = activePillar === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPillar(p.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 8px',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${p.color}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: isActive ? p.color : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {p.icon}
                <span className="truncate">{p.label}</span>
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  color: isActive ? '#E2E8F0' : '#64748B',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Pipeline Progress Indicator Bar ── */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#060910',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {stages.map((st, i) => {
            const isStageActive = currentStage === i;
            const isStageCompleted = currentStage > i;
            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStage(i as FlowStage);
                    setProgress(0);
                    if (i === 3) setIsFixed(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    backgroundColor: isStageActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: isStageActive
                        ? '#2563EB'
                        : isStageCompleted
                        ? '#10B981'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    {isStageCompleted ? '✓' : st.num}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: isStageActive ? 700 : 500,
                      color: isStageActive ? '#FFFFFF' : isStageCompleted ? '#94A3B8' : '#64748B',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {st.title}
                  </span>
                </button>
                {i < stages.length - 1 && (
                  <span style={{ color: '#334155', fontSize: '12px' }}>➔</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Stage Progress Bar */}
        <div
          style={{
            width: '80px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#38BDF8',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      </div>

      {/* ── Main Interactive Canvas Area ── */}
      <div style={{ padding: '16px 20px', minHeight: compact ? '260px' : '360px' }}>
        {/* ======================================================== */}
        {/* VIEW 1: CLOUD SECURITY ENGINE                           */}
        {/* ======================================================== */}
        {activePillar === 'cloud' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Cloud Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>AWS Account (128490184)</span>
                <span style={{ color: '#64748B' }}>· us-east-1 production</span>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isFixed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: isFixed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  color: isFixed ? '#34D399' : '#F87171',
                  fontWeight: 700,
                }}
              >
                {isFixed ? '● 0 Attack Paths · All Invariants Satisfied' : '● 1 Critical Attack Path Active'}
              </span>
            </div>

            {/* Interactive Cloud Topology Flow */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px 12px',
                alignItems: 'center',
              }}
            >
              {/* Node 1: Public Internet */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                }}
              >
                <Network size={16} color="#94A3B8" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#F1F5F9' }}>Internet</div>
                <div style={{ fontSize: '9.5px', color: '#64748B', fontFamily: 'monospace' }}>0.0.0.0/0</div>
              </div>

              <div style={{ textAlign: 'center', color: '#64748B', fontSize: '12px' }}>➔</div>

              {/* Node 2: ALB Ingress */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                }}
              >
                <Server size={16} color="#38BDF8" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#F1F5F9' }}>ALB Ingress</div>
                <div style={{ fontSize: '9.5px', color: '#38BDF8', fontFamily: 'monospace' }}>kavach-alb:443</div>
              </div>

              <div style={{ textAlign: 'center', color: isFixed ? '#10B981' : '#EF4444', fontSize: '12px' }}>
                {isFixed ? '🔒' : '⚠️'}➔
              </div>

              {/* Node 3: RDS Aurora Database */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isFixed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.08)',
                  border: isFixed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  textAlign: 'center',
                }}
              >
                <Database size={16} color={isFixed ? '#34D399' : '#EF4444'} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, color: isFixed ? '#34D399' : '#F87171' }}>
                  RDS Aurora
                </div>
                <div style={{ fontSize: '9.5px', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {isFixed ? 'private-subnet' : 'public:5432'}
                </div>
              </div>

              <div style={{ textAlign: 'center', color: isFixed ? '#10B981' : '#F59E0B', fontSize: '12px' }}>➔</div>

              {/* Node 4: S3 Bucket */}
              <div
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isFixed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(245, 158, 11, 0.08)',
                  border: isFixed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  textAlign: 'center',
                }}
              >
                <Layers size={16} color={isFixed ? '#34D399' : '#F59E0B'} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, color: isFixed ? '#34D399' : '#FBBF24' }}>
                  S3 Bucket
                </div>
                <div style={{ fontSize: '9.5px', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {isFixed ? 'BlockPublic: ON' : 'PublicRead: ON'}
                </div>
              </div>
            </div>

            {/* Finding Detail & Action Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: isFixed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: isFixed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isFixed ? (
                  <CheckCircle2 size={16} color="#34D399" />
                ) : (
                  <ShieldAlert size={16} color="#EF4444" />
                )}
                <div style={{ fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: isFixed ? '#34D399' : '#F87171' }}>
                    {isFixed ? 'Remediation Verified:' : 'Critical Risk:'}{' '}
                  </span>
                  <span style={{ color: '#E2E8F0' }}>
                    {isFixed
                      ? 'RDS isolated to private subnet. S3 public access revoked. SLSA Ledger committed.'
                      : 'Public RDS database exposed to internet with wildcard IAM role attached.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFixed(!isFixed)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: isFixed ? '#0F172A' : '#10B981',
                  border: isFixed ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isFixed ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                {isFixed ? <RotateCcw size={12} /> : <Sparkles size={12} />}
                <span>{isFixed ? 'Revert to Raw State' : 'Review & Fix with AI Agent'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CODE SECURITY (AST + SCA + SECRETS)              */}
        {/* ======================================================== */}
        {activePillar === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span style={{ color: '#34D399', fontWeight: 700 }}>
                Semgrep AST · auth/route.py:42
              </span>
              <span style={{ color: '#94A3B8' }}>CWE-89 SQL Injection (Taint Verified)</span>
            </div>

            {/* Code Diff Box */}
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11.5px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: '#060910',
              }}
            >
              <div
                style={{
                  backgroundColor: '#0B0F19',
                  padding: '6px 12px',
                  color: '#64748B',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>auth/route.py · Git Diff</span>
                <span style={{ color: '#34D399' }}>OPA Verdict: ALLOW</span>
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#FCA5A5',
                  padding: '7px 12px',
                  borderLeft: '3px solid #EF4444',
                }}
              >
                - cursor.execute(f&quot;SELECT * FROM users WHERE id = &apos;{'{user_id}'}&apos;&quot;)
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#6EE7B7',
                  padding: '7px 12px',
                  borderLeft: '3px solid #10B981',
                }}
              >
                + cursor.execute(&quot;SELECT * FROM users WHERE id = %s&quot;, (user_id,))
              </div>
            </div>

            {/* PR Action Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={16} color="#60A5FA" />
                <span style={{ fontSize: '12px', color: '#E2E8F0', fontWeight: 600 }}>
                  PR #819: Parameterize SQL queries (3 CI checks passing)
                </span>
              </div>

              <Link
                href="/code"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>Open in Code Security</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: ATTACK SURFACE & OFFENSIVE PROVER                */}
        {/* ======================================================== */}
        {activePillar === 'attack' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                Continuous Pentest Engine · 0 False Positives
              </span>
              <span style={{ color: '#94A3B8' }}>24 Domains Audited</span>
            </div>

            {/* Test Results Table */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                backgroundColor: '#060910',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>✓ VERIFIED SAFE</span>
                  <span style={{ color: '#E2E8F0' }}>SSRF to Cloud Metadata (/api/webhook)</span>
                </div>
                <span style={{ color: '#64748B', fontFamily: 'monospace' }}>IMDSv2 Protected · Dismissed</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>⚡ VERIFIED EXPLOIT</span>
                  <span style={{ color: '#FCA5A5' }}>Elasticsearch port 9200 open to 0.0.0.0/0</span>
                </div>
                <span style={{ color: '#F87171', fontFamily: 'monospace', fontWeight: 700 }}>P0 Urgent</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#FDE68A' }}>
                Every vulnerability is verified with active non-destructive evidence before alerting.
              </span>
              <Link
                href="/attack"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F59E0B',
                  color: '#000000',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>Launch Surface Recon</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: MCP & AI DEFENSE GATEWAY                         */}
        {/* ======================================================== */}
        {activePillar === 'mcp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span style={{ color: '#C084FC', fontWeight: 700 }}>
                Kavach MCP Security Gateway · Proxy Active
              </span>
              <span style={{ color: '#94A3B8' }}>Identity &amp; Tool Boundary Control</span>
            </div>

            {/* Live Intercept Box */}
            <div
              style={{
                backgroundColor: '#060910',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                <span>Agent: `devops-copilot`</span>
                <span style={{ color: '#EF4444', fontWeight: 700 }}>BLOCKED (HTTP 403)</span>
              </div>
              <div style={{ color: '#E2E8F0' }}>
                Tool Requested: <span style={{ color: '#38BDF8' }}>execute_sql(&quot;DROP TABLE audit_events&quot;)</span>
              </div>
              <div style={{ color: '#A855F7' }}>
                OPA Policy Verdict: <span style={{ color: '#F87171' }}>DENY_DESTRUCTIVE_DDL (Risk: 98/100)</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={16} color="#C084FC" />
                <span style={{ fontSize: '12px', color: '#E2E8F0' }}>
                  Never grant AI agents unrestricted tool execution. Wrap MCP tools with OPA policy.
                </span>
              </div>
              <Link
                href="/agent"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#A855F7',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>Configure MCP Gateway</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Real-Time Streaming Terminal Log Ticker ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#04060A',
          padding: '10px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '10.5px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={12} color="#38BDF8" />
            <span style={{ color: '#94A3B8', fontWeight: 600 }}>LIVE ENGINE TELEMETRY</span>
          </div>
          <span style={{ color: '#475569' }}>Real stdout/stderr stream</span>
        </div>

        <div
          ref={logContainerRef}
          style={{
            height: '68px',
            overflowY: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            lineHeight: 1.5,
            color: '#94A3B8',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {terminalLogs.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ color: '#38BDF8', userSelect: 'none' }}>&gt;</span>
              <span
                style={{
                  color: log.includes('CRITICAL') || log.includes('BLOCKED') || log.includes('VIOLATION')
                    ? '#F87171'
                    : log.includes('VERIFIED') || log.includes('ALLOW') || log.includes('PASS')
                    ? '#34D399'
                    : '#CBD5E1',
                }}
              >
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

