'use client';

import React, { useState } from 'react';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [heroRepoInput, setHeroRepoInput] = useState('');
  const [showFixedCode, setShowFixedCode] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

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

          {/* Bottom Copyright */}
          <div className="footer-bottom-bar">
            <span>© 2026 Kavach Inc. All rights reserved. Deterministic DevSecOps &amp; AI Defense.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
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

      {/* Responsive Breakpoint CSS */}
      <style jsx global>{`
        .kavach-home-hero {
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.95fr);
          align-items: center;
          gap: clamp(36px, 6vw, 84px);
        }
        .kavach-home-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #2563EB;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .kavach-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        .kavach-home-hero h1 {
          margin: 0 0 16px 0;
          color: #0F172A;
          font-size: clamp(36px, 5.2vw, 56px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 800;
        }
        .kavach-home-hero h1 em {
          color: #2563EB;
          font-style: normal;
        }
        .kavach-home-hero p {
          max-width: 560px;
          color: #475569;
          font-size: 16px;
          line-height: 1.65;
          margin: 0 0 24px 0;
        }
        .kavach-hero-form {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 580px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .kavach-hero-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 260px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          padding: 10px 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .kavach-hero-input-wrap:focus-within {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .kavach-hero-input {
          border: none;
          background: transparent;
          font-size: 13.5px;
          color: #0F172A;
          width: 100%;
          outline: none;
          font-family: inherit;
        }
        .kavach-hero-input::placeholder {
          color: #94A3B8;
        }
        .kavach-hero-submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 20px;
          background: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .kavach-hero-submit-btn:hover {
          background: #1E293B;
          transform: translateY(-1px);
        }
        .kavach-hero-guarantee {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #64748B;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .guarantee-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
        }
        .kavach-hero-guarantee .dot {
          color: #CBD5E1;
        }
        .kavach-home-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .kavach-action-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #2563EB;
          color: #FFFFFF;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background-color 0.15s;
        }
        .kavach-action-primary:hover {
          background: #1D4ED8;
        }
        .kavach-action-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #FFFFFF;
          color: #334155;
          border: 1px solid #CBD5E1;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s, border-color 0.15s;
        }
        .kavach-action-secondary:hover {
          background: #F8FAFC;
          border-color: #94A3B8;
        }

        /* Right Terminal Card */
        .kavach-home-preview {
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 0 18px 16px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          background: #FFFFFF;
        }
        .kavach-preview-top {
          height: 46px;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          border-bottom: 1px solid #F1F5F9;
        }
        .kavach-status-chip {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #2563EB;
          background: #EFF6FF;
          padding: 3px 8px;
          border-radius: 99px;
          border: 1px solid #BFDBFE;
        }
        .kavach-preview-file {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 14px 0 10px;
          font-size: 12px;
          color: #334155;
          font-weight: 600;
        }
        .kavach-preview-file small {
          margin-left: auto;
          color: #94A3B8;
          font-weight: 500;
        }
        .kavach-preview-code {
          padding: 8px 12px;
          border-radius: 6px;
          background: #F8FAFC;
          color: #334155;
          font: 11px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow-x: auto;
          white-space: nowrap;
        }
        .kavach-preview-code span {
          color: #94A3B8;
          margin-right: 14px;
        }
        .kavach-preview-code.issue {
          color: #B91C1C;
          background: #FEF2F2;
          margin-top: 4px;
          border-left: 3px solid #EF4444;
        }
        .kavach-preview-code.fixed-line {
          color: #065F46;
          background: #ECFDF5;
          margin-top: 4px;
          border-left: 3px solid #10B981;
        }
        .kavach-preview-evidence {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid #FDE68A;
          background: #FFFBEB;
          color: #92400E;
          padding: 12px;
          border-radius: 8px;
          margin-top: 14px;
        }
        .kavach-preview-evidence.patch {
          border-color: #A7F3D0;
          background: #ECFDF5;
          color: #065F46;
        }
        .kavach-preview-evidence span {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .kavach-preview-evidence b {
          font-size: 11px;
        }
        .kavach-preview-evidence small {
          font-size: 10px;
          color: #78350F;
        }
        .kavach-preview-evidence.patch small {
          color: #047857;
        }
        .kavach-preview-review {
          border-top: 1px solid #F1F5F9;
          margin-top: 14px;
          padding-top: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .kavach-preview-review > div {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #1E293B;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 700;
        }
        .kavach-preview-review > span:nth-child(2) {
          display: grid;
          gap: 2px;
        }
        .kavach-preview-review b {
          font-size: 11px;
          color: #0F172A;
        }
        .kavach-preview-review small {
          font-size: 10px;
          color: #64748B;
        }
        .kavach-preview-status {
          margin-left: auto;
          padding: 4px 8px;
          background: #ECFDF5;
          color: #065F46;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Trust & Metrics Card */
        .kavach-trust-metrics-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 24px 32px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .kavach-stats-row {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .stat-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-val {
          font-size: clamp(26px, 3.2vw, 34px);
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .stat-lbl {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }
        .stat-divider {
          width: 1px;
          height: 36px;
          background: #E2E8F0;
        }
        .kavach-badges-row {
          border-top: 1px solid #F1F5F9;
          padding-top: 16px;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }
        .badges-label {
          font-size: 10.5px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #94A3B8;
        }
        .badges-list {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: #334155;
        }

        /* Section Tags */
        .kavach-section-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #2563EB;
        }

        /* Comparison Grid */
        .kavach-comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .comparison-col {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 28px;
          border: 1px solid #E2E8F0;
        }
        .comparison-col.traditional {
          border-color: #FECACA;
          background: #FFFBFB;
        }
        .comparison-col.kavach {
          border-color: #A7F3D0;
          background: #F8FFF9;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08);
        }
        .col-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #E2E8F0;
        }
        .col-header h3 {
          font-size: 17px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .comparison-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .comparison-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          line-height: 1.5;
          color: #334155;
        }
        .comparison-list .cross {
          color: #EF4444;
          font-weight: 800;
          font-size: 14px;
        }
        .comparison-list .check {
          color: #10B981;
          font-weight: 800;
          font-size: 14px;
        }

        /* High-Converting CTA Banner */
        .kavach-conversion-banner {
          background: #0F172A;
          color: #FFFFFF;
          border-radius: 16px;
          padding: clamp(36px, 5vw, 56px) clamp(24px, 5vw, 56px);
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 32px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
        }
        .banner-tag {
          display: block;
          font-size: 11px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #60A5FA;
          margin-bottom: 12px;
        }
        .banner-title {
          font-size: clamp(26px, 3.8vw, 36px);
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 10px 0;
          letter-spacing: -0.025em;
          line-height: 1.18;
        }
        .banner-subtitle {
          font-size: 14.5px;
          color: #94A3B8;
          margin: 0;
          max-width: 540px;
          line-height: 1.55;
        }
        .banner-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .banner-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          background: #2563EB;
          color: #FFFFFF;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          transition: background-color 0.15s, transform 0.1s;
        }
        .banner-primary-btn:hover {
          background: #1D4ED8;
          transform: translateY(-1px);
        }
        .banner-secondary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 22px;
          background: transparent;
          color: #F8FAFC;
          border: 1px solid #475569;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s, background-color 0.15s;
        }
        .banner-secondary-btn:hover {
          border-color: #94A3B8;
          background: rgba(255, 255, 255, 0.05);
        }

        /* Footer */
        .footer-col-header {
          font-size: 10px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #94A3B8;
          margin-bottom: 4px;
        }
        .footer-link {
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-link:hover {
          color: #0F172A;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }
        .footer-bottom-bar {
          padding-top: 24px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
          color: #94A3B8;
        }
        .footer-sublink {
          color: #94A3B8;
          text-decoration: none;
        }
        .footer-sublink:hover {
          color: #0F172A;
        }

        @media (max-width: 980px) {
          .kavach-home-hero {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .kavach-comparison-grid {
            grid-template-columns: 1fr;
          }
          .stat-divider {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 520px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
