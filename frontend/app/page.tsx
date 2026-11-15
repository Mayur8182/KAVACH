'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Zap,
  Lock,
  GitBranch,
  Terminal,
  Activity,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Server,
  Layers,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { KavachSecurityPipelineFlow } from '@/components/pipeline/KavachSecurityPipelineFlow';
import { KavachHeroSkeleton } from '@/components/landing/KavachHeroSkeleton';
import '@/styles/kavach-home.css';

// Official SVG Icons for Social Profiles
const LinkedinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6 1.6 1.6 0 0 0-1.6 1.6c0 .88.72 1.6 1.6 1.6m1.4 9.74v-8.37H5.06v8.37h2.8z" />
  </svg>
);

const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 13, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Lazy-loaded modals & drawers
const SearchModal = dynamic(
  () => import('@/components/common/SearchModal').then((mod) => mod.SearchModal),
  { ssr: false }
);

const BookDemoModal = dynamic(
  () => import('@/components/common/BookDemoModal').then((mod) => mod.BookDemoModal),
  { ssr: false }
);

// 9 Workspaces
const WORKSPACES = [
  {
    num: '01',
    category: 'CODE & BUILD',
    name: 'Code Security',
    description: 'SAST, SCA, exposed secrets, SBOM and supply chain security.',
    scope: 'GIT REPOSITORIES',
    href: '/code',
  },
  {
    num: '02',
    category: 'CLOUD & INFRASTRUCTURE',
    name: 'Cloud Security',
    description: 'Multi-cloud CSPM across AWS, GCP, Azure and K8s posture.',
    scope: 'CLOUD ACCOUNTS',
    href: '/cloud',
  },
  {
    num: '03',
    category: 'CLOUD & INFRASTRUCTURE',
    name: 'Attack Surface',
    description: 'Attack surface management, DAST and pentest campaigns.',
    scope: 'TARGET DOMAINS',
    href: '/attack',
  },
  {
    num: '04',
    category: 'RUNTIME & AI GOVERNANCE',
    name: 'Runtime Defense',
    description: 'eBPF runtime defense and MCP tool execution gateway.',
    scope: 'CLUSTERS & RUNTIMES',
    href: '/protect',
  },
  {
    num: '05',
    category: 'RUNTIME & AI GOVERNANCE',
    name: 'AI Agent Security',
    description: 'Autonomous AI agent identity and tool policy control.',
    scope: 'AI AGENT FLEETS',
    href: '/agent',
  },
  {
    num: '06',
    category: 'RUNTIME & AI GOVERNANCE',
    name: 'Security Operations',
    description: 'Incident triage queue, alert correlation and playbooks.',
    scope: 'ALERT QUEUES',
    href: '/soc',
  },
  {
    num: '07',
    category: 'KNOWLEDGE & POSTURE',
    name: 'Security Graph',
    description: 'Authority knowledge graph, edges and blast radius.',
    scope: 'GRAPH TOPOLOGY',
    href: '/graph',
  },
  {
    num: '08',
    category: 'KNOWLEDGE & POSTURE',
    name: 'Data Security',
    description: 'DSPM, S3/RDS invariant verification and real-time DLP.',
    scope: 'DATA STORES',
    href: '/data',
  },
  {
    num: '09',
    category: 'KNOWLEDGE & POSTURE',
    name: 'Governance & Compliance',
    description: 'Declarative OPA Rego policies and SOC 2 compliance.',
    scope: 'COMPLIANCE SUITES',
    href: '/governance',
  },
];

// 4 Deep Capability Sections
const SOLUTIONS = [
  {
    num: '01',
    title: 'Autonomous AI Agent Governance',
    subtitle: 'Safeguard agentic coding assistants without hindering development velocity.',
    description:
      'Autonomous coding agents make multi-file modifications and invoke command-line tools. Kavach wraps every agent with deterministic OPA contracts, sandboxed syscall execution, and human-in-the-loop approvals for privileged operations.',
    linkText: 'Explore Agent Governance',
    linkHref: '/agent',
    capabilities: [
      'MCP tool-level authorization gateway',
      'Immutable cryptographic audit events for every patch',
      'Automated semantic diff inspection before merge',
      'Zero unauthorized cloud infrastructure modifications',
    ],
  },
  {
    num: '02',
    title: 'Software Supply Chain & SLSA Provenance',
    subtitle: 'Cryptographic proof of origin from commit to container registry.',
    description:
      'Verify the integrity of third-party open-source dependencies and internal build artifacts. Automatically generate CycloneDX SBOMs and enforce SLSA Level 3 provenance checks on every container build.',
    linkText: 'View Build Security',
    linkHref: '/code/dependencies',
    capabilities: [
      'Automated SBOM generation (Syft & CycloneDX)',
      'Known CVE discovery via OSV & Trivy',
      'Dependency confusion & typosquatting detection',
      'Cryptographic signature validation on deployment',
    ],
  },
  {
    num: '03',
    title: 'Multi-Cloud Infrastructure & IaC Security',
    subtitle: 'Detect misconfigurations and privilege escalation paths before production deployment.',
    description:
      'Scan Terraform, AWS CloudFormation, Helm charts, and Kubernetes manifests against CIS benchmarks. Reconcile runtime state against declared security blueprints to eliminate configuration drift.',
    linkText: 'Explore Cloud Security',
    linkHref: '/cloud',
    capabilities: [
      'Static IaC policy evaluation via Checkov & OPA',
      'IAM blast radius analysis and excessive permission pruning',
      'Automated S3 bucket and firewall remediations',
      'Unified visibility across AWS, Azure, GCP, and Kubernetes',
    ],
  },
  {
    num: '04',
    title: 'Continuous Compliance & Audit Readiness',
    subtitle: 'Pass SOC2 Type II, ISO 27001, and HIPAA audits without manual screenshot gathering.',
    description:
      'Turn dynamic runtime evidence into audit-ready compliance packages. Every policy decision, vulnerability scan, and deployment gate is immutably persisted with traceable timestamps and actor verification.',
    linkText: 'View Compliance Blueprint',
    linkHref: '/governance',
    capabilities: [
      'Continuous compliance control mapping',
      'Single-click exportable auditor evidence packets',
      'Automated change management audit trails',
      'Separation of duties & least-privilege verification',
    ],
  },
];

export default function KavachHomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [heroRepoInput, setHeroRepoInput] = useState('');
  const [showFixedCode, setShowFixedCode] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form UX: Handle frictionless single-input repository scan submit
  const handleHeroScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroRepoInput.trim();
    if (trimmed) {
      router.push(`/onboarding?repo=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/onboarding');
    }
  };

  const copyPatch = () => {
    const patch = `// Enforce parameterized query to prevent SQL Injection
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);`;
    navigator.clipboard.writeText(patch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ── Official Navigation Header with Kavach Logo ── */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main id="main-content" style={{ flex: 1, width: '100%', overflowX: 'hidden' }}>

        {/* ========================================================= */}
        {/* SECTION 1: ABOVE THE FOLD HERO & LEAD CAPTURE             */}
        {/* ========================================================= */}
        {!mounted ? (
          <KavachHeroSkeleton />
        ) : (
          <section
            className="kavach-home-hero"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: 'clamp(36px, 5vw, 64px) clamp(20px, 4vw, 48px) 36px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Left Column: Eyebrow, Headline, Subtitle, Instant Form, Actions */}
          <div>
            {/* Eyebrow Pill */}
            <div className="kavach-home-eyebrow">
              <span className="kavach-pulse-dot" />
              <span>AUTONOMOUS SECURITY &amp; CLOUD DEFENSE · KAVACH</span>
            </div>

            {/* Concise, High-Converting Headline (Rule #3) */}
            <h1>
              Autonomous Security for<br />
              <em>Code, Cloud &amp; AI Agents.</em>
            </h1>

            {/* Value Proposition Subtitle (Rule #1, #3) */}
            <p>
              Kavach continuously inspects AST code trees, verifies eBPF runtime events, evaluates Open Policy Agent (OPA) guardrails, and commits verified pull requests before vulnerabilities reach production.
            </p>

            {/* Frictionless Instant Scan Form (Rule #6 Form UX) */}
            <form onSubmit={handleHeroScanSubmit} className="kavach-hero-form">
              <div className="kavach-hero-input-wrap">
                <Terminal size={16} color="#64748B" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Enter GitHub repository URL (e.g. org/repo)"
                  value={heroRepoInput}
                  onChange={(e) => setHeroRepoInput(e.target.value)}
                  className="kavach-hero-input"
                  aria-label="GitHub Repository URL"
                />
              </div>
              <button type="submit" className="kavach-hero-submit-btn">
                <span>Start Free Security Audit</span>
                <ArrowRight size={14} />
              </button>
            </form>

            {/* Micro-Trust Note Under Form */}
            <div className="kavach-hero-guarantee">
              <div className="guarantee-item">
                <CheckCircle2 size={13} color="#10B981" />
                <span>100% Free Forever Tier</span>
              </div>
              <span className="dot">•</span>
              <div className="guarantee-item">
                <ShieldCheck size={13} color="#10B981" />
                <span>Zero Credit Card Required</span>
              </div>
              <span className="dot">•</span>
              <div className="guarantee-item">
                <Zap size={13} color="#10B981" />
                <span>Ready in &lt; 60 Seconds</span>
              </div>
            </div>

            {/* Secondary Action Link Options (Rule #4 Optimize CTAs) */}
            <div className="kavach-home-actions">
              <a href="#security-pipeline" className="kavach-action-primary">
                <span>Explore Interactive Pipeline</span>
                <ArrowRight size={14} />
              </a>
              <button
                type="button"
                onClick={() => setExpertOpen(true)}
                className="kavach-action-secondary"
              >
                <span>Talk to Security Engineer</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Code Review Preview Card (Rule #5 Engagement) */}
          <div className="kavach-home-preview" aria-label="Interactive Security Review Terminal">
            <div className="kavach-preview-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="kavach-status-chip">AST DETERMINISTIC RUN</span>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>rentalhub-api</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFixedCode(!showFixedCode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: showFixedCode ? '#ECFDF5' : '#F1F5F9',
                  color: showFixedCode ? '#065F46' : '#334155',
                  border: `1px solid ${showFixedCode ? '#A7F3D0' : '#E2E8F0'}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={12} color={showFixedCode ? '#059669' : '#64748B'} />
                <span>{showFixedCode ? 'View Original Finding' : 'Preview OPA Verified Patch'}</span>
              </button>
            </div>

            <div className="kavach-preview-file">
              <Code2 size={14} color="#64748B" />
              <span>src/routes/users.ts</span>
              <small>Line 42 · CWE-89</small>
            </div>

            {!showFixedCode ? (
              <>
                <div className="kavach-preview-code">
                  <span>40</span> router.get('/users', async (req, res) =&gt; &#123;
                </div>
                <div className="kavach-preview-code">
                  <span>41</span> &nbsp; const userId = req.query.id;
                </div>
                <div className="kavach-preview-code issue">
                  <span>42</span> &nbsp; db.query(`SELECT * FROM users WHERE id = '$&#123;userId&#125;'`);
                </div>
                <div className="kavach-preview-code">
                  <span>43</span> &#125;);
                </div>

                <div className="kavach-preview-evidence">
                  <ShieldAlert size={16} color="#B45309" style={{ flexShrink: 0 }} />
                  <span>
                    <b>SQL Injection Detected · High Severity</b>
                    <small>Untrusted query parameter reaching database statement without parameterization.</small>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="kavach-preview-code">
                  <span>40</span> router.get('/users', async (req, res) =&gt; &#123;
                </div>
                <div className="kavach-preview-code">
                  <span>41</span> &nbsp; const userId = req.query.id;
                </div>
                <div className="kavach-preview-code fixed-line">
                  <span>42</span> &nbsp; const query = 'SELECT * FROM users WHERE id = $1';
                </div>
                <div className="kavach-preview-code fixed-line">
                  <span>43</span> &nbsp; const result = await db.query(query, [userId]);
                </div>

                <div className="kavach-preview-evidence patch">
                  <ShieldCheck size={16} color="#065F46" style={{ flexShrink: 0 }} />
                  <span>
                    <b>OPA Deterministic Gate Passed · Rescan Verified</b>
                    <small>Parameterized SQL query verified. 0 vulnerabilities remaining.</small>
                  </span>
                  <button
                    type="button"
                    onClick={copyPatch}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedPatch ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedPatch ? 'Copied' : 'Copy Diff'}</span>
                  </button>
                </div>
              </>
            )}

            <div className="kavach-preview-review">
              <div>MB</div>
              <span>
                <b>Mayur Bharvad</b>
                <small>Lead Security Architect</small>
              </span>
              <span className="kavach-preview-status">
                <ShieldCheck size={12} />
                <span>Deterministic Verification Active</span>
              </span>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================= */}
        {/* TRUST BADGES & METRICS BAR (Rule #2 Trust Signals)        */}
        {/* ========================================================= */}
        <section
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '0 clamp(20px, 4vw, 48px) 44px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="kavach-trust-metrics-card">
            {/* 4 Quantitative Proof Stats */}
            <div className="kavach-stats-row">
              <div className="stat-box">
                <span className="stat-val">140+</span>
                <span className="stat-lbl">Automated Security Checks</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <span className="stat-val">100%</span>
                <span className="stat-lbl">Deterministic Evidence</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <span className="stat-val">0</span>
                <span className="stat-lbl">Hallucinated Patches</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <span className="stat-val">&lt; 60s</span>
                <span className="stat-lbl">Mean Time to First Finding</span>
              </div>
            </div>

            {/* Enterprise Compliance Standards */}
            <div className="kavach-badges-row">
              <span className="badges-label">ENTERPRISE COMPLIANCE &amp; STANDARDS:</span>
              <div className="badges-list">
                <div className="badge-pill">
                  <ShieldCheck size={13} color="#2563EB" />
                  <span>SOC 2 Type II Aligned</span>
                </div>
                <div className="badge-pill">
                  <CheckCircle2 size={13} color="#2563EB" />
                  <span>ISO 27001 Controls</span>
                </div>
                <div className="badge-pill">
                  <Lock size={13} color="#2563EB" />
                  <span>Open Policy Agent (OPA)</span>
                </div>
                <div className="badge-pill">
                  <Activity size={13} color="#2563EB" />
                  <span>SLSA Level 3 Provenance</span>
                </div>
                <div className="badge-pill">
                  <Cpu size={13} color="#2563EB" />
                  <span>Zero LLM Authority</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: ANIMATED SECURITY PIPELINE DAG FLOW            */}
        {/* ========================================================= */}
        <section
          id="security-pipeline"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: '0 clamp(20px, 4vw, 48px) 48px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <KavachSecurityPipelineFlow theme="light" />
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: INTERACTIVE HANDS-ON PRODUCT SHOWCASE          */}
        {/* ========================================================= */}
        <section id="product-demo">
          <ProductShowcase />
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: NINE WORKSPACES GRID                           */}
        {/* ========================================================= */}
        <section
          id="workspaces"
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: 'clamp(24px, 4vw, 32px) clamp(16px, 3vw, 24px) clamp(40px, 6vw, 80px)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '36px',
            }}
          >
            <div className="kavach-section-tag">ISOLATED SECURITY DOMAINS</div>
            <h2
              style={{
                fontSize: 'clamp(30px, 4vw, 42px)',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
                maxWidth: '680px',
              }}
            >
              Nine workspaces, each an<br />isolated security perimeter.
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', margin: 0, maxWidth: '600px' }}>
              Every domain is strictly isolated with its own policies, scanners, authorization boundaries, and audit logging.
            </p>
          </div>

          {/* 3x3 Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '16px',
            }}
          >
            {WORKSPACES.map((ws) => (
              <Link
                key={ws.num}
                href={ws.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '26px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  minHeight: '210px',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0F172A';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#64748B',
                      marginBottom: '10px',
                    }}
                  >
                    {ws.num} · {ws.category}
                  </span>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0F172A',
                      margin: '0 0 8px 0',
                    }}
                  >
                    {ws.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748B',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {ws.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '20px',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: '#475569',
                    }}
                  >
                    SCOPE · {ws.scope}
                  </span>
                  <ArrowRight size={13} color="#94A3B8" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: WHY TEAMS CHOOSE KAVACH (Comparison Proof)     */}
        {/* ========================================================= */}
        <section
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 24px)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: 'clamp(32px, 5vw, 56px) clamp(20px, 4vw, 48px)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px' }}>
              <div className="kavach-section-tag" style={{ justifyContent: 'center' }}>
                DETERMINISTIC DIFFERENCE
              </div>
              <h2
                style={{
                  fontSize: 'clamp(28px, 4vw, 38px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.025em',
                  margin: '12px 0 10px',
                }}
              >
                Why Leading Engineering Teams Choose Kavach
              </h2>
              <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                Traditional scanners dump thousands of unprioritized alerts and hallucinate risky code fixes. Kavach enforces deterministic proofs and commits verified patches.
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="kavach-comparison-grid">
              {/* Traditional Tools Column */}
              <div className="comparison-col traditional">
                <div className="col-header">
                  <AlertTriangle size={18} color="#EF4444" />
                  <h3>Traditional Legacy Scanners</h3>
                </div>
                <ul className="comparison-list">
                  <li>
                    <span className="cross">✕</span>
                    <span>Noisy alert fatigue: thousands of unprioritized false positives.</span>
                  </li>
                  <li>
                    <span className="cross">✕</span>
                    <span>Hallucinated AI fixes without compiler validation or rescan proof.</span>
                  </li>
                  <li>
                    <span className="cross">✕</span>
                    <span>Fragmented tools: separate SAST, DAST, SCA, CSPM silos.</span>
                  </li>
                  <li>
                    <span className="cross">✕</span>
                    <span>LLM decides policy with no deterministic verification.</span>
                  </li>
                </ul>
              </div>

              {/* Kavach Column */}
              <div className="comparison-col kavach">
                <div className="col-header">
                  <ShieldCheck size={18} color="#10B981" />
                  <h3>Kavach Autonomous Defense</h3>
                </div>
                <ul className="comparison-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Source-to-sink AST data flow proofs with root-cause clustering.</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Verified unified diff patches tested against deterministic scanners.</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Unified SDLC coverage: Code, Cloud, Attack Surface &amp; AI Agents.</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>OPA Rego deterministic engine is the sole authoritative decision maker.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6: HIGH-CONVERTING CONVERSION CTA BANNER           */}
        {/* ========================================================= */}
        <section
          style={{
            maxWidth: '1380px',
            margin: '0 auto 64px',
            padding: '0 clamp(16px, 3vw, 24px)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="kavach-conversion-banner">
            <div>
              <span className="banner-tag">INSTANT DEPLOYMENT · ZERO FRICTION</span>
              <h2 className="banner-title">
                Ready to secure your entire SDLC<br />in under 60 seconds?
              </h2>
              <p className="banner-subtitle">
                Connect your GitHub repository free. Get verifiable vulnerability proof and automated pull request fixes today.
              </p>
            </div>

            <div className="banner-actions">
              <Link href="/onboarding" className="banner-primary-btn">
                <span>Start Free Repository Scan</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setExpertOpen(true)}
                className="banner-secondary-btn"
              >
                <span>Schedule Enterprise Briefing</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* SECTION 7: FULL KAVACH FOOTER (Anatomy of a Landing Page) */}
      {/* ========================================================= */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: 'clamp(40px, 6vw, 64px) clamp(16px, 3vw, 24px) 32px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1380px', margin: '0 auto' }}>
          {/* 4-Column Footer Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))',
              gap: '48px',
              marginBottom: '56px',
            }}
            className="footer-grid"
          >
            {/* Col 1: Brand & Thesis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <KavachLogo size={26} />
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: '280px',
                }}
              >
                LLM proposes. Deterministic security systems decide. Runtime evidence proves.
              </p>
              <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <a href="mailto:security@kavachsecurity.me" style={{ color: '#64748B', textDecoration: 'none' }}>
                  security@kavachsecurity.me
                </a>
                <a href="tel:+918780378086" style={{ color: '#64748B', textDecoration: 'none' }}>
                  +91 8780378086
                </a>
              </div>
              {/* Official Social Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <a
                  href="https://www.linkedin.com/company/kavach-security/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn"
                  title="Kavach on LinkedIn"
                  aria-label="Kavach on LinkedIn"
                >
                  <LinkedinIcon size={15} />
                </a>
                <a
                  href="https://x.com/Kavach_Secure"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-btn"
                  title="Kavach on X"
                  aria-label="Kavach on X"
                >
                  <XIcon size={13} />
                </a>
              </div>
            </div>

            {/* Col 2: Workspaces */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="footer-col-header">WORKSPACES</span>
              <Link href="/code" className="footer-link">Code Security</Link>
              <Link href="/cloud" className="footer-link">Cloud Security</Link>
              <Link href="/attack" className="footer-link">Attack Surface</Link>
              <Link href="/protect" className="footer-link">Runtime Defense</Link>
              <Link href="/agent" className="footer-link">AI Agent Security</Link>
              <Link href="/soc" className="footer-link">Security Operations</Link>
            </div>

            {/* Col 3: Platform & Docs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="footer-col-header">PLATFORM &amp; DOCS</span>
              <Link href="/api-security" className="footer-link">API Security</Link>
              <Link href="/blueprints" className="footer-link">Dynamic Blueprints</Link>
              <Link href="/policies" className="footer-link">OPA Policy Engine</Link>
              <Link href="/docs" className="footer-link">Documentation &amp; API</Link>
              <Link href="/demo" className="footer-link">Interactive Showcase</Link>
            </div>

            {/* Col 4: Trust & Legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="footer-col-header">TRUST &amp; COMPLIANCE</span>
              <Link href="/privacy" className="footer-link">Privacy Policy</Link>
              <Link href="/terms" className="footer-link">Terms of Service</Link>
              <Link href="/contact" className="footer-link">Contact Support</Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span className="live-dot" />
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Social Sublinks */}
          <div className="footer-bottom-bar">
            <span>© 2026 Kavach Inc. All rights reserved. Deterministic DevSecOps &amp; AI Defense.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <a
                href="https://www.linkedin.com/company/kavach-security/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-sublink"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <LinkedinIcon size={13} />
                <span>LinkedIn</span>
              </a>
              <a
                href="https://x.com/Kavach_Secure"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-sublink"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <XIcon size={12} />
                <span>X (Twitter)</span>
              </a>
              <Link href="/privacy" className="footer-sublink">Privacy</Link>
              <Link href="/terms" className="footer-sublink">Terms</Link>
              <Link href="/contact" className="footer-sublink">Support</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Interactive Modals & Drawers */}
      {searchOpen && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
      {expertOpen && (
        <BookDemoModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      )}
    </div>
  );
}
